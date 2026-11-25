import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { adjustUserBalance } from '@/lib/wallet-service';
import { distributeAffiliateCommission } from '@/lib/affiliate-service';
import { awardOrderCashback } from '@/lib/cashback-service';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import { getTelegramBotConfig } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.orderId || body.code || body.id || body.orderCode || '').trim();
    const action = String(body.action || '').toLowerCase(); // 'approve' | 'reject'
    const type = String(body.type || '').toLowerCase();
    const deliveryInfo = String(body.deliveryInfo || body.delivery_info || '').trim();

    if (!code || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Thiếu mã đơn hoặc hành động xử lý.' }, { status: 400 });
    }

    await ensureDatabaseReady().catch(() => {});

    const isTopupCode =
      /^YUKISP_/i.test(code) || code.startsWith('tp_') || code.startsWith('DEP-');

    // 1. Check in serverStore.orders & topups
    const orders = serverStore.loadOrders();
    const localOrder = orders.find((o) => o.order_code === code || o.id === code);

    const topups = serverStore.loadTopups();
    const localTopup = topups.find((t) => t.code === code || t.id === code);

    // 2. Check in PostgreSQL
    let pgOrder: any = null;
    let pgDeposit: any = null;
    try {
      const resO = await queryPostgres(
        `SELECT * FROM public.orders WHERE order_code = $1 OR id = $1 LIMIT 1`,
        [code]
      );
      if (resO?.rows?.length > 0) pgOrder = resO.rows[0];

      const resD = await queryPostgres(
        `SELECT * FROM public.deposit_requests WHERE request_code = $1 OR transfer_code = $1 OR id = $1 LIMIT 1`,
        [code]
      );
      if (resD?.rows?.length > 0) pgDeposit = resD.rows[0];
    } catch {}

    // 3. Check in Supabase via SERVICE ROLE KEY
    let dbOrder: any = null;
    let dbTopup: any = null;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        if (!localOrder && !pgOrder) {
          const { data } = await supabaseAdmin
            .from('orders')
            .select('*')
            .or(`order_code.eq.${code},id.eq.${code}`)
            .maybeSingle();
          dbOrder = data;
        }
        if (!localTopup && !pgDeposit && (isTopupCode || type === 'topup')) {
          const { data: depData } = await (supabaseAdmin as any)
            .from('deposit_requests')
            .select('*')
            .or(`request_code.eq.${code},transfer_code.eq.${code},id.eq.${code}`)
            .maybeSingle();
          if (depData) {
            dbTopup = depData;
          } else {
            const { data } = await (supabaseAdmin as any)
              .from('topup_requests')
              .select('*')
              .or(`reference_code.eq.${code},id.eq.${code}`)
              .maybeSingle();
            dbTopup = data;
          }
        }
      }
    } catch (e) {
      console.warn('[orders/action] Supabase query notice:', e);
    }

    const effectiveItem = localOrder || localTopup || pgOrder || pgDeposit || dbOrder || dbTopup;
    if (!effectiveItem) {
      return NextResponse.json({ error: `Không tìm thấy đơn hàng hoặc đơn nạp #${code}` }, { status: 404 });
    }

    const currentStatus = String(
      effectiveItem.status || (effectiveItem as any).state || 'pending'
    ).toLowerCase();

    // Anti-duplicate approval guard
    if (['approved', 'completed', 'cancelled', 'rejected'].includes(currentStatus)) {
      return NextResponse.json({ error: 'Đơn này đã được xử lý rồi!' }, { status: 409 });
    }

    const isDeposit =
      isTopupCode ||
      type === 'topup' ||
      effectiveItem.order_type === 'DEPOSIT' ||
      effectiveItem.order_type === 'NAP_VI' ||
      effectiveItem.service_type === 'DEPOSIT' ||
      effectiveItem.service_type === 'NAP_VI' ||
      effectiveItem.product_sku === 'TOPUP-VIETQR' ||
      (effectiveItem.item_name && /nạp\s*(tiền\s*)?ví/i.test(effectiveItem.item_name));

    if (action === 'approve') {
      if (isDeposit) {
        // Read EXACT deposit amount with zero hardcoded fallback
        const depositAmount = Number(
          effectiveItem.total_amount ??
          effectiveItem.amount ??
          (effectiveItem as any).topup_amount ??
          0
        );

        if (depositAmount <= 0) {
          return NextResponse.json(
            { error: 'Số tiền nạp không hợp lệ (nhỏ hơn hoặc bằng 0).' },
            { status: 400 }
          );
        }

        // 1. Atomically transition PostgreSQL status FIRST to prevent race condition
        let isTransitioned = false;
        try {
          const pgRes = await queryPostgres(
            `UPDATE public.deposit_requests
             SET status = 'approved', updated_at = NOW()
             WHERE (request_code = $1 OR transfer_code = $1 OR id = $1)
               AND status IN ('pending', 'waiting_confirm')
             RETURNING amount, user_id`,
            [code]
          );
          if (pgRes?.rows && pgRes.rows.length > 0) {
            isTransitioned = true;
          }

          const pgOrderRes = await queryPostgres(
            `UPDATE public.orders
             SET status = 'completed', updated_at = NOW()
             WHERE (order_code = $1 OR id = $1)
               AND status IN ('pending', 'waiting_confirm')
             RETURNING amount, user_id`,
            [code]
          );
          if (pgOrderRes?.rows && pgOrderRes.rows.length > 0) {
            isTransitioned = true;
          }
        } catch (pgErr) {
          console.warn('[orders/action] Postgres transition notice:', pgErr);
        }

        // If PostgreSQL had pending items but 0 rows transitioned, it was already processed concurrently
        if (!isTransitioned && (pgDeposit || pgOrder)) {
          return NextResponse.json({ error: 'Đơn này đã được xử lý rồi!' }, { status: 409 });
        }

        const targetUserId = effectiveItem.user_id;
        let newBal = 0;

        if (targetUserId && targetUserId !== 'anonymous') {
          const adjustRes = await adjustUserBalance({
            userId: targetUserId,
            delta: depositAmount,
            type: 'DEPOSIT',
            referenceId: code,
            description: `Duyệt nạp tiền #${code}`,
          });
          newBal = adjustRes.newBalance;

          // Distribute 3% affiliate commission to referrer if applicable
          try {
            await distributeAffiliateCommission({
              refereeId: targetUserId,
              depositAmount,
              referenceCode: code,
            });
          } catch (affErr) {
            console.warn('[orders/action] Affiliate commission notice:', affErr);
          }
        }

        // Update PostgreSQL
        try {
          await queryPostgres(
            `UPDATE public.orders SET status = 'completed', updated_at = NOW() WHERE order_code = $1 OR id = $1`,
            [code]
          );
          await queryPostgres(
            `UPDATE public.deposit_requests SET status = 'approved', updated_at = NOW() WHERE request_code = $1 OR transfer_code = $1 OR id = $1`,
            [code]
          );
        } catch (pgErr) {
          console.warn('[orders/action] Postgres update notice:', pgErr);
        }

        // Update local stores
        serverStore.updateOrderStatus(code, 'completed');
        serverStore.updateTopupStatus(code, 'approved');

        // Update Supabase
        try {
          const supabaseAdmin = getSupabaseAdmin();
          if (supabaseAdmin) {
            await supabaseAdmin
              .from('orders')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .or(`order_code.eq.${code},id.eq.${code}`);

            await (supabaseAdmin as any)
              .from('deposit_requests')
              .update({ status: 'approved', updated_at: new Date().toISOString() })
              .or(`request_code.eq.${code},transfer_code.eq.${code},id.eq.${code}`);

            await (supabaseAdmin as any)
              .from('topup_requests')
              .update({ status: 'approved', updated_at: new Date().toISOString() })
              .or(`reference_code.eq.${code},id.eq.${code}`);
          }
        } catch {}

        return NextResponse.json({
          success: true,
          message: `✅ Đã duyệt nạp +${new Intl.NumberFormat('vi-VN').format(depositAmount)} VNĐ cho đơn #${code}!`,
          balance: newBal,
          status: 'completed',
        });
      } else {
        // Normal purchase order approval + optional deliveryInfo
        const extra: Record<string, any> = {};
        if (deliveryInfo) extra.delivery_info = deliveryInfo;
        serverStore.updateOrderStatus(code, 'completed', extra);
        try {
          awardOrderCashback(code);
        } catch (cbErr) {
          console.warn('[admin/orders/action] Cashback award notice:', cbErr);
        }

        // Update PostgreSQL
        try {
          await queryPostgres(
            `UPDATE public.orders SET status = 'completed', delivered_data = COALESCE(NULLIF($1, ''), delivered_data), updated_at = NOW() WHERE order_code = $2 OR id = $2`,
            [deliveryInfo, code]
          );
        } catch {}

        // Update Supabase
        try {
          const supabaseAdmin = getSupabaseAdmin();
          if (supabaseAdmin) {
            const updateData: any = {
              status: 'completed',
              updated_at: new Date().toISOString(),
            };
            if (deliveryInfo) updateData.delivery_info = deliveryInfo;
            await supabaseAdmin
              .from('orders')
              .update(updateData)
              .or(`order_code.eq.${code},id.eq.${code}`);
          }
        } catch {}

        // Notify customer on Telegram if deliveryInfo is provided
        try {
          const tgCfg = await getTelegramBotConfig();
          const botToken = tgCfg.bot_token;
          const targetTg = String(effectiveItem.telegram_id || '').trim();
          if (deliveryInfo && botToken && /^\d{5,15}$/.test(targetTg)) {
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetTg,
                parse_mode: 'HTML',
                text: `<b>[YUKISHOPMXH — BÀN GIAO ĐƠN HÀNG #${code}]</b>\nSản phẩm: ${effectiveItem.item_name || ''}\nThông tin nhận hàng:\n<code>${deliveryInfo}</code>`,
              }),
            }).catch(() => {});
          }
        } catch {}

        return NextResponse.json({
          success: true,
          message: `Đã duyệt đơn hàng #${code} thành công!`,
          status: 'completed',
          delivery_info: deliveryInfo || undefined,
        });
      }
    } else {
      // Reject action: Refund if it was a paid purchase order
      let refunded = false;
      if (!isDeposit) {
        const orderAmount = Number(effectiveItem.total_amount || effectiveItem.amount || 0);
        const isPaid = effectiveItem.paid || Number(effectiveItem.deducted_balance || 0) > 0;
        const targetUserId = effectiveItem.user_id;

        if (isPaid && orderAmount > 0 && targetUserId && targetUserId !== 'anonymous') {
          try {
            await adjustUserBalance({
              userId: targetUserId,
              delta: orderAmount,
              type: 'REFUND',
              referenceId: code,
              description: `Hoàn tiền đơn hàng #${code} bị từ chối`,
            });
            refunded = true;
          } catch (refErr) {
            console.warn('[orders/action] Refund notice:', refErr);
          }
        }
      }

      // Update PostgreSQL
      try {
        await queryPostgres(
          `UPDATE public.orders SET status = 'cancelled', updated_at = NOW() WHERE order_code = $1 OR id = $1`,
          [code]
        );
        await queryPostgres(
          `UPDATE public.deposit_requests SET status = 'rejected', updated_at = NOW() WHERE request_code = $1 OR transfer_code = $1 OR id = $1`,
          [code]
        );
      } catch {}

      serverStore.updateOrderStatus(code, 'cancelled', { refunded });
      serverStore.updateTopupStatus(code, 'rejected');

      try {
        const supabaseAdmin = getSupabaseAdmin();
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('orders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .or(`order_code.eq.${code},id.eq.${code}`);

          await (supabaseAdmin as any)
            .from('deposit_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .or(`request_code.eq.${code},transfer_code.eq.${code},id.eq.${code}`);

          await (supabaseAdmin as any)
            .from('topup_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .or(`reference_code.eq.${code},id.eq.${code}`);
        }
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Đã từ chối đơn #${code}` + (refunded ? ' (Đã hoàn tiền vào ví khách)' : '.'),
        status: 'cancelled',
      });
    }
  } catch (err: any) {
    console.error('[admin/orders/action] Error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý đơn.' }, { status: 500 });
  }
}
