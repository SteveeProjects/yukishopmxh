// ==============================================================================
// YUKISHOPMXH — LOSS-PROOF 2% CASHBACK & CTV PARTNER COMMISSION SERVICE
// ==============================================================================

import { serverStore } from '@/lib/server-store';

export interface CashbackAwardResult {
  awardedPoints: number;
  partnerCommission: number;
  partnerOwnerId?: string;
  skippedReason?: string;
}

/**
 * Awards 2% (configurable) cashback points when a purchase order reaches 'completed'
 * AND awards Partner CTV commission if a valid partner_code was used.
 * Idempotent: refuses to run twice on the same order.
 */
export function awardOrderCashback(orderCode: string): CashbackAwardResult {
  if (!orderCode) {
    return { awardedPoints: 0, partnerCommission: 0, skippedReason: 'Missing orderCode' };
  }

  const order = serverStore.findOrderByCode(orderCode);
  if (!order) {
    return { awardedPoints: 0, partnerCommission: 0, skippedReason: 'Order not found' };
  }

  // Idempotency guard
  if (typeof order.cashback_awarded === 'number' && order.cashback_awarded >= 0) {
    // Already finalized (note: skip only if already processed, i.e., cashback_awarded is defined)
    return {
      awardedPoints: 0,
      partnerCommission: 0,
      skippedReason: 'Cashback/commission already processed for this order',
    };
  }

  // Never award cashback on deposit top-up records or unpaid orders
  const isDeposit =
    order.service_type === 'DEPOSIT' ||
    String(order.order_code || '').startsWith('DEP-') ||
    String(order.order_code || '').startsWith('YukiSp_');

  if (isDeposit || !order.paid || order.refunded) {
    return { awardedPoints: 0, partnerCommission: 0, skippedReason: 'Not an eligible paid purchase order' };
  }

  const cfg = serverStore.getSystemConfig();
  const minOrder = Number(cfg.cashback_min_order ?? 20000);
  const rate = Math.max(0, Math.min(0.2, Number(cfg.cashback_rate ?? 0.02)));
  const paidAmount = Math.max(0, Number(order.total_amount || 0));

  let awardedPoints = 0;
  let skippedReason: string | undefined;

  const hasPromoOrCoupon =
    Boolean(order.coupon_code) ||
    Boolean(order.partner_code) ||
    Number(order.discount_amount || 0) > 0;

  if (hasPromoOrCoupon) {
    skippedReason = 'Không hoàn điểm cho đơn đã áp dụng mã giảm giá / mã CTV';
  } else if (paidAmount < minOrder) {
    skippedReason = `Đơn nhỏ hơn ${new Intl.NumberFormat('vi-VN').format(minOrder)}đ`;
  } else if (!order.user_id || order.user_id === 'anonymous') {
    skippedReason = 'Đơn khách vãng lai không có tài khoản';
  } else {
    awardedPoints = Math.floor(paidAmount * rate);
    if (awardedPoints > 0) {
      serverStore.adjustCashbackPoints(order.user_id, awardedPoints, awardedPoints);
    }
  }

  // Partner CTV Code commission (credited to CTV owner's affiliateBalance)
  let partnerCommission = 0;
  let partnerOwnerId: string | undefined;
  if (order.partner_code) {
    const partnerCode = serverStore.findPartnerCode(order.partner_code);
    if (
      partnerCode &&
      partnerCode.ownerUserId &&
      partnerCode.ownerUserId !== order.user_id
    ) {
      const pct = Math.max(0, Math.min(30, Number(partnerCode.commissionPercent ?? 5))) / 100;
      partnerCommission = Math.floor(paidAmount * pct);
      if (partnerCommission > 0) {
        partnerOwnerId = partnerCode.ownerUserId;
        serverStore.adjustAffiliateBalance(partnerCode.ownerUserId, partnerCommission, 0);
        serverStore.addReferralLog({
          referrer_id: partnerCode.ownerUserId,
          referred_user_id: order.user_id || 'guest',
          deposit_order_id: `CTV_${order.order_code}`,
          deposit_amount: paidAmount,
          commission_rate: pct,
          commission_amount: partnerCommission,
          status: 'DISTRIBUTED',
          referee_email: order.user_name || order.delivery_contact || 'Khách mã CTV',
        });
      }
    }
  }

  // Record 0 or positive points so future calls are idempotent
  serverStore.markOrderCashbackAwarded(order.order_code, awardedPoints, partnerCommission);

  return {
    awardedPoints,
    partnerCommission,
    partnerOwnerId,
    skippedReason,
  };
}

/**
 * Async wrapper that also syncs awarded cashback & partner commission to Postgres/Supabase.
 */
export async function awardOrderCashbackPersistent(orderCode: string): Promise<CashbackAwardResult> {
  const res = awardOrderCashback(orderCode);
  try {
    const order = serverStore.findOrderByCode(orderCode);
    if (order) {
      const { updateDbOrderFields, updateDbUserFields } = await import('@/lib/db-persistence');
      await updateDbOrderFields(orderCode, {
        cashback_awarded: Number(order.cashback_awarded || 0),
        partner_commission_awarded: Number(order.partner_commission_awarded || 0),
      });
      if (res.awardedPoints > 0 && order.user_id) {
        const u = serverStore.findUserById(order.user_id);
        if (u) {
          await updateDbUserFields(order.user_id, {
            cashback_points: u.cashbackPoints,
            total_cashback_earned: u.totalCashbackEarned,
          });
        }
      }
      if (res.partnerCommission > 0 && res.partnerOwnerId) {
        const owner = serverStore.findUserById(res.partnerOwnerId);
        if (owner) {
          await updateDbUserFields(res.partnerOwnerId, {
            affiliate_balance: owner.affiliateBalance,
          });
        }
      }
    }
  } catch {}
  return res;
}
