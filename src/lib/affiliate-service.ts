// ==============================================================================
// YUKISHOPMXH — AFFILIATE & REFERRAL COMMISSION SERVICE
// Distributes 5% (configurable) lifetime commission on friend deposits.
// ==============================================================================

import { serverStore } from '@/lib/server-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AffiliateSummary, ReferralLogRecord } from '@/types/affiliate';

export const COMMISSION_RATE = 0.05; // 5% default

export function getActiveAffiliateRate(): number {
  const rate = Number(serverStore.getSystemConfig().affiliate_rate);
  if (Number.isFinite(rate) && rate >= 0 && rate <= 0.5) return rate;
  return COMMISSION_RATE;
}

/**
 * Validate UUID format before querying PostgreSQL UUID columns
 */
export function isValidUUID(id?: string | null): boolean {
  return (
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  );
}

/**
 * Generate a short, clean referral code: YUKI + 5 uppercase alphanumeric chars
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `YUKI${rand}`;
}

/**
 * Mask email for privacy (e.g., "minh***@gmail.com")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'Bạn bè***';
  const [prefix, domain] = email.split('@');
  if (prefix.length <= 3) {
    return `${prefix.slice(0, 1)}***@${domain}`;
  }
  return `${prefix.slice(0, 3)}***@${domain}`;
}

/**
 * Get affiliate overview & statistics for a user
 */
export async function getAffiliateStats(userId: string, hostUrl?: string): Promise<AffiliateSummary> {
  const localSummary = serverStore.getReferralSummary(userId);
  let referralCode = localSummary.referralCode;
  let totalReferred = localSummary.totalReferred;
  let totalEarnings = localSummary.totalEarnings;
  let recentLogs: ReferralLogRecord[] = [];

  // Query Supabase if connected
  try {
    const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
    if (!isPlaceholder && supabaseAdmin) {
      // 1. Get user's profile for referral_code & referral_earnings
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('referral_code, referral_earnings')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.referral_code) {
        referralCode = profile.referral_code;
      }
      if (profile?.referral_earnings !== null && profile?.referral_earnings !== undefined) {
        totalEarnings = Math.max(totalEarnings, Number(profile.referral_earnings));
      }

      // 2. Count referred users
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by', userId);

      if (count !== null && count !== undefined) {
        totalReferred = Math.max(totalReferred, count);
      }

      // 3. Get recent referral logs
      const { data: dbLogs } = await supabaseAdmin
        .from('referral_logs')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (dbLogs && dbLogs.length > 0) {
        recentLogs = dbLogs.map((l: any) => ({
          id: l.id,
          referrer_id: l.referrer_id,
          referred_user_id: l.referred_user_id,
          deposit_order_id: l.deposit_order_id,
          deposit_amount: Number(l.deposit_amount),
          commission_rate: Number(l.commission_rate),
          commission_amount: Number(l.commission_amount),
          status: l.status,
          referee_email: l.referee_email ? maskEmail(l.referee_email) : 'Bạn bè ẩn danh',
          created_at: l.created_at,
        }));
      }
    }
  } catch (sbErr) {
    console.warn('[affiliate-service] Supabase query notice:', sbErr);
  }

  // Fallback to local logs if Supabase was empty
  if (recentLogs.length === 0 && localSummary.recentLogs.length > 0) {
    recentLogs = localSummary.recentLogs.map((l) => ({
      id: l.id,
      referrer_id: l.referrer_id,
      referred_user_id: l.referred_user_id,
      deposit_order_id: l.deposit_order_id,
      deposit_amount: l.deposit_amount,
      commission_rate: l.commission_rate,
      commission_amount: l.commission_amount,
      status: l.status,
      referee_email: l.referee_email ? maskEmail(l.referee_email) : 'Bạn bè ẩn danh',
      created_at: l.created_at,
    }));
  }

  const baseOrigin =
    hostUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://yukishopmxh.vn');
  const referralLink = `${baseOrigin.replace(/\/$/, '')}/register?ref=${referralCode}`;

  const activeRate = getActiveAffiliateRate();
  const localUser = serverStore.findUserById(userId);
  let referredByUsername: string | undefined;
  if (localUser?.referredBy) {
    const refUser = serverStore.findUserById(localUser.referredBy);
    if (refUser) {
      referredByUsername = refUser.username || refUser.fullName;
    }
  }

  return {
    referralCode,
    referralLink,
    totalReferred,
    totalEarnings,
    affiliateBalance: Number(localUser?.affiliateBalance || 0),
    commissionRate: activeRate,
    recentLogs,
    referredBy: localUser?.referredBy,
    referredByUsername,
  };
}

/**
 * Distribute 5% (configurable) commission to referrer's affiliate balance upon deposit completion
 */
export async function distributeAffiliateCommission(params: {
  refereeId: string;
  depositAmount: number;
  referenceCode: string;
}): Promise<{ success: boolean; commission: number; referrerId?: string; reason?: string }> {
  const { refereeId, depositAmount, referenceCode } = params;

  if (!refereeId || depositAmount <= 0) {
    return { success: false, commission: 0, reason: 'Invalid parameters' };
  }

  // 1. Idempotency Check in local store & Supabase database
  const existingLogs = serverStore.loadReferralLogs();
  const alreadyProcessed = existingLogs.some(
    (l) => l.deposit_order_id === referenceCode && l.status === 'DISTRIBUTED'
  );
  if (alreadyProcessed) {
    return { success: false, commission: 0, reason: 'Commission already distributed for this deposit' };
  }

  try {
    const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
    if (!isPlaceholder && supabaseAdmin) {
      const { data: dbExisting } = await supabaseAdmin
        .from('referral_logs')
        .select('id')
        .eq('deposit_order_id', referenceCode)
        .eq('status', 'DISTRIBUTED')
        .maybeSingle();

      if (dbExisting) {
        return {
          success: false,
          commission: 0,
          reason: 'Commission already distributed for this deposit in database',
        };
      }
    }
  } catch (sbCheckErr) {
    console.warn('[affiliate-service] Supabase idempotency check notice:', sbCheckErr);
  }

  // 2. Resolve Referrer
  let referrerId: string | null = null;
  let refereeEmail: string = '';

  // Check local store
  const localUser = serverStore.findUserById(refereeId);
  if (localUser?.referredBy) {
    referrerId = localUser.referredBy;
    refereeEmail = localUser.email || '';
  }

  // Check Supabase profiles (if refereeId is a valid UUID)
  try {
    const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
    if (!isPlaceholder && supabaseAdmin && isValidUUID(refereeId)) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, referred_by')
        .eq('id', refereeId)
        .maybeSingle();

      if (profile?.referred_by) {
        referrerId = profile.referred_by;
        refereeEmail = profile.email || refereeEmail;
      }
    }
  } catch (sbErr) {
    console.warn('[affiliate-service] Supabase profile check notice:', sbErr);
  }

  // If user has no referrer, nothing to distribute
  if (!referrerId || referrerId === refereeId) {
    return { success: false, commission: 0, reason: 'No valid referrer attached' };
  }

  // 3. Compute dynamic affiliate commission (minimum 100đ)
  const activeRate = getActiveAffiliateRate();
  const commission = Math.max(100, Math.floor(depositAmount * activeRate));
  const maskedRefEmail = maskEmail(refereeEmail);
  const nowISO = new Date().toISOString();

  // 4. Credit Referrer's Affiliate Balance (transferable to Wallet or cash withdrawal via Telegram)
  try {
    serverStore.adjustAffiliateBalance(referrerId, commission, 0);
  } catch (err: any) {
    console.error('[affiliate-service] Failed crediting referrer affiliate balance:', err);
    return { success: false, commission: 0, reason: 'Failed crediting referrer affiliate balance: ' + err.message };
  }

  // Tự động tích lũy & cấp vé quay may mắn cho người giới thiệu (cứ mỗi 200.000đ tuyến dưới nạp = +1 Vé Quay)
  try {
    serverStore.creditSpinTicketsForAffiliate(referrerId, depositAmount);
  } catch (spAffErr) {
    console.warn('[affiliate-service] Spin ticket credit notice:', spAffErr);
  }

  // 5. Record Log in serverStore (increments referralEarnings on user)
  const newLog = serverStore.addReferralLog({
    referrer_id: referrerId,
    referred_user_id: refereeId,
    deposit_order_id: referenceCode,
    deposit_amount: depositAmount,
    commission_rate: activeRate,
    commission_amount: commission,
    status: 'DISTRIBUTED',
    referee_email: maskedRefEmail,
    created_at: nowISO,
  });

  // 6. Record Log in Supabase (only if UUIDs are valid PostgreSQL UUIDs)
  try {
    const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
    if (!isPlaceholder && supabaseAdmin && isValidUUID(referrerId) && isValidUUID(refereeId)) {
      await supabaseAdmin.from('referral_logs').insert({
        referrer_id: referrerId,
        referred_user_id: refereeId,
        deposit_order_id: referenceCode,
        deposit_amount: depositAmount,
        commission_rate: activeRate,
        commission_amount: commission,
        status: 'DISTRIBUTED',
        referee_email: maskedRefEmail,
        created_at: nowISO,
      });

      // Update referrer's referral_earnings
      const { data: refProfile } = await supabaseAdmin
        .from('profiles')
        .select('referral_earnings')
        .eq('id', referrerId)
        .maybeSingle();

      const currentEarnings = Number(refProfile?.referral_earnings || 0);
      await supabaseAdmin
        .from('profiles')
        .update({ referral_earnings: currentEarnings + commission, updated_at: nowISO })
        .eq('id', referrerId);
    }
  } catch (sbErr) {
    console.warn('[affiliate-service] Supabase referral log insert notice:', sbErr);
  }

  console.log(`[AFFILIATE] Credited +${commission.toLocaleString('vi-VN')}đ (${Math.round(activeRate * 100)}%) to referrer ${referrerId} for deposit ${referenceCode}`);

  return {
    success: true,
    commission,
    referrerId,
  };
}
