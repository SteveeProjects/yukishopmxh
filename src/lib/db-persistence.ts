// ==============================================================================
// YUKISHOPMXH — UNIFIED DUAL-ENGINE DB PERSISTENCE LAYER
// Works seamlessly across:
//   1. Direct PostgreSQL (POSTGRES_URL / DATABASE_URL)
//   2. Supabase REST (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
//   3. Writable local /tmp fallback cache (Serverless safe)
// ==============================================================================

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, ensureDatabaseReady } from '@/lib/autoMigrate';
import { getSystemSetting, setSystemSetting } from '@/lib/system-settings';
import {
  serverStore,
  type LocalUser,
  type LocalOrder,
  type MacroDroidLog,
  type PasswordResetToken,
} from '@/lib/server-store';
import { userMutex } from '@/lib/mutex';

export function mapProfileRowToLocalUser(row: any): LocalUser {
  return {
    id: String(row.id),
    username: row.username || row.email?.split('@')[0] || 'User',
    password: row.password_hash || row.password || undefined,
    fullName: row.full_name || row.username || 'Khách Hàng',
    telegramId: row.telegram_id || '',
    phone: row.phone || '',
    email: row.email || '',
    role: String(row.role || '').toLowerCase() === 'admin' ? 'admin' : 'user',
    balance: Number(row.balance || 0),
    cashbackPoints: Number(row.cashback_points || 0),
    totalCashbackEarned: Number(row.total_cashback_earned || 0),
    affiliateBalance: Number(row.affiliate_balance || 0),
    withdrawableBalance: Number(row.withdrawable_balance ?? row.affiliate_balance ?? 0),
    freeWithdrawalBalance: Number(row.free_withdrawal_balance || 0),
    referralCode: row.referral_code || '',
    referredBy: row.referred_by || undefined,
    referralEarnings: Number(row.referral_earnings || 0),
    spinTickets: Number(row.spin_tickets || 0),
    depositSpinProgress: Number(row.deposit_spin_progress || 0),
    affiSpinProgress: Number(row.affi_spin_progress || 0),
    savedProfiles: Array.isArray(row.saved_profiles) ? row.saved_profiles : [],
    vouchers: Array.isArray(row.vouchers) ? row.vouchers : [],
    sessionVersion: Number(row.session_version || 1),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function findDbUserByIdOrIdentifier(idOrIdent: string): Promise<LocalUser | null> {
  const raw = String(idOrIdent || '').trim();
  if (!raw) return null;
  const cleanLower = raw.toLowerCase();
  const cleanNoAt = cleanLower.replace(/^@/, '');

  await ensureDatabaseReady().catch(() => {});

  // 1. Direct PostgreSQL
  try {
    const pgRes = await queryPostgres(
      `SELECT * FROM public.profiles
       WHERE id = $1
          OR LOWER(COALESCE(email, '')) = $2
          OR LOWER(COALESCE(username, '')) = $2
          OR LOWER(REPLACE(COALESCE(telegram_id, ''), '@', '')) = $3
          OR COALESCE(phone, '') = $1
       LIMIT 1`,
      [raw, cleanLower, cleanNoAt]
    );
    if (pgRes?.rows?.[0]) {
      return mapProfileRowToLocalUser(pgRes.rows[0]);
    }
  } catch {}

  // 2. Supabase REST (safe parameterized column filters — no raw .or() string interpolation)
  try {
    const sb = getSupabaseAdmin();
    if (sb) {
      const queries = [
        sb.from('profiles').select('*').eq('id', raw).maybeSingle(),
        sb.from('profiles').select('*').ilike('email', cleanLower).maybeSingle(),
        sb.from('profiles').select('*').ilike('username', cleanLower).maybeSingle(),
        sb.from('profiles').select('*').eq('phone', raw).maybeSingle(),
        sb.from('profiles').select('*').eq('telegram_id', cleanNoAt).maybeSingle(),
        sb.from('profiles').select('*').eq('telegram_id', `@${cleanNoAt}`).maybeSingle(),
      ];
      for (const q of queries) {
        const { data } = await q;
        if (data) return mapProfileRowToLocalUser(data);
      }
    }
  } catch {}

  // 3. Local store fallback
  return serverStore.findUserById(raw) || serverStore.findUserByIdentifier(raw);
}

export async function updateDbUserFields(
  userId: string,
  patch: Partial<{
    password_hash: string;
    balance: number;
    affiliate_balance: number;
    withdrawable_balance: number;
    free_withdrawal_balance: number;
    cashback_points: number;
    total_cashback_earned: number;
    spin_tickets: number;
    deposit_spin_progress: number;
    affi_spin_progress: number;
    session_version: number;
    referred_by: string;
    referral_earnings: number;
    vouchers: any[];
    saved_profiles: any[];
    telegram_id: string;
    full_name: string;
    phone: string;
  }>
): Promise<boolean> {
  if (!userId) return false;
  await ensureDatabaseReady().catch(() => {});

  const nowISO = new Date().toISOString();
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return true;

  let ok = false;

  // 1. Direct PostgreSQL
  try {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [col, val] of entries) {
      if (col === 'vouchers' || col === 'saved_profiles') {
        sets.push(`${col} = $${idx}::jsonb`);
        vals.push(JSON.stringify(val));
      } else {
        sets.push(`${col} = $${idx}`);
        vals.push(val);
      }
      idx++;
    }
    sets.push(`updated_at = NOW()`);
    vals.push(userId);

    const res = await queryPostgres(
      `UPDATE public.profiles SET ${sets.join(', ')} WHERE id = $${idx} OR email = $${idx}`,
      vals
    );
    if (res) ok = true;
  } catch (pgErr) {
    console.warn('[db-persistence] updateDbUserFields pg notice:', pgErr);
  }

  // 2. Supabase REST
  try {
    const sb = getSupabaseAdmin();
    if (sb) {
      const sbPatch: Record<string, any> = { updated_at: nowISO };
      for (const [k, v] of entries) sbPatch[k] = v;
      const { error } = await sb.from('profiles').update(sbPatch).eq('id', userId);
      if (!error) ok = true;
    }
  } catch (sbErr) {
    console.warn('[db-persistence] updateDbUserFields sb notice:', sbErr);
  }

  // 3. Mirror to local warm cache
  try {
    const users = serverStore.loadUsers();
    const u = users.find((x) => x.id === userId || x.email === userId);
    if (u) {
      if (patch.password_hash !== undefined) u.password = patch.password_hash;
      if (patch.balance !== undefined) u.balance = patch.balance;
      if (patch.affiliate_balance !== undefined) u.affiliateBalance = patch.affiliate_balance;
      if (patch.withdrawable_balance !== undefined) u.withdrawableBalance = patch.withdrawable_balance;
      if (patch.free_withdrawal_balance !== undefined) u.freeWithdrawalBalance = patch.free_withdrawal_balance;
      if (patch.cashback_points !== undefined) u.cashbackPoints = patch.cashback_points;
      if (patch.total_cashback_earned !== undefined) u.totalCashbackEarned = patch.total_cashback_earned;
      if (patch.spin_tickets !== undefined) u.spinTickets = patch.spin_tickets;
      if (patch.deposit_spin_progress !== undefined) u.depositSpinProgress = patch.deposit_spin_progress;
      if (patch.affi_spin_progress !== undefined) u.affiSpinProgress = patch.affi_spin_progress;
      if (patch.session_version !== undefined) u.sessionVersion = patch.session_version;
      if (patch.referred_by !== undefined) u.referredBy = patch.referred_by;
      if (patch.referral_earnings !== undefined) u.referralEarnings = patch.referral_earnings;
      if (patch.vouchers !== undefined) u.vouchers = patch.vouchers;
      if (patch.saved_profiles !== undefined) u.savedProfiles = patch.saved_profiles;
      if (patch.telegram_id !== undefined) u.telegramId = patch.telegram_id;
      if (patch.full_name !== undefined) u.fullName = patch.full_name;
      if (patch.phone !== undefined) u.phone = patch.phone;
      serverStore.saveUsers(users);
    }
  } catch {}

  return ok;
}

function extractYukiSeqNumber(code?: string | null): number {
  if (!code) return 0;
  const s = String(code).trim();
  const dhMatch = s.match(/YUKISP[\s_-]*DH(\d+)/i);
  if (dhMatch) {
    const n = parseInt(dhMatch[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  const m = s.match(/^YukiSp[\s_-]*(\d+)$/i);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatUserHintTag(userHint?: string | null): string {
  const raw = String(userHint || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!raw) return '';
  return raw.slice(-4);
}

/**
 * Generates sequential wallet deposit code tied to order sequence:
 * YUKISP_DH000001_<USER4> (or YUKISP_DH000001 if no user hint).
 * Strictly monotonic across DB + local cache.
 */
export async function nextSequentialDepositCode(
  userHint?: string | null
): Promise<{ code: string; sequence: number; orderNumber: number }> {
  return await userMutex.runExclusive('__deposit_sequence__', async () => {
    await ensureDatabaseReady().catch(() => {});

    let maxSeq = 0;

    try {
      for (const t of serverStore.loadTopups()) {
        maxSeq = Math.max(maxSeq, extractYukiSeqNumber(t.code));
      }
      for (const o of serverStore.loadOrders()) {
        maxSeq = Math.max(maxSeq, extractYukiSeqNumber(o.order_code));
      }
    } catch {}

    try {
      const seqSetting = await getSystemSetting<{ lastSeq?: number }>('deposit_order_seq', { lastSeq: 0 });
      maxSeq = Math.max(maxSeq, Number(seqSetting?.lastSeq || 0));
    } catch {}

    try {
      const pgDep = await queryPostgres(
        `SELECT request_code, transfer_code, transfer_content, order_number
         FROM public.deposit_requests
         ORDER BY created_at DESC LIMIT 200`
      );
      if (pgDep?.rows) {
        for (const r of pgDep.rows) {
          maxSeq = Math.max(
            maxSeq,
            Number(r.order_number || 0),
            extractYukiSeqNumber(r.request_code),
            extractYukiSeqNumber(r.transfer_code),
            extractYukiSeqNumber(r.transfer_content)
          );
        }
      }
      const pgOrd = await queryPostgres(
        `SELECT order_code, order_number FROM public.orders WHERE order_code ILIKE 'YukiSp%' ORDER BY created_at DESC LIMIT 200`
      );
      if (pgOrd?.rows) {
        for (const r of pgOrd.rows) {
          maxSeq = Math.max(maxSeq, Number(r.order_number || 0), extractYukiSeqNumber(r.order_code));
        }
      }
    } catch {}

    try {
      const sb = getSupabaseAdmin();
      if (sb) {
        const [{ data: sbDeps }, { data: sbOrds }] = await Promise.all([
          sb
            .from('deposit_requests')
            .select('request_code, transfer_code, transfer_content, order_number')
            .order('created_at', { ascending: false })
            .limit(200),
          sb
            .from('orders')
            .select('order_code, order_number')
            .ilike('order_code', 'YukiSp%')
            .order('created_at', { ascending: false })
            .limit(200),
        ]);
        for (const r of sbDeps || []) {
          maxSeq = Math.max(
            maxSeq,
            Number(r.order_number || 0),
            extractYukiSeqNumber(r.request_code),
            extractYukiSeqNumber(r.transfer_code),
            extractYukiSeqNumber(r.transfer_content)
          );
        }
        for (const r of sbOrds || []) {
          maxSeq = Math.max(maxSeq, Number(r.order_number || 0), extractYukiSeqNumber(r.order_code));
        }
      }
    } catch {}

    const nextSeq = maxSeq + 1;
    await setSystemSetting('deposit_order_seq', {
      lastSeq: nextSeq,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    const padded = String(nextSeq).padStart(6, '0');
    const tag = formatUserHintTag(userHint);
    const code = tag ? `YUKISP_DH${padded}_${tag}` : `YUKISP_DH${padded}`;
    return {
      code,
      sequence: nextSeq,
      orderNumber: nextSeq,
    };
  });
}

export async function findDbOrderByCode(orderCode: string): Promise<LocalOrder | null> {
  const code = String(orderCode || '').trim();
  if (!code) return null;

  await ensureDatabaseReady().catch(() => {});

  try {
    const pgRes = await queryPostgres(
      `SELECT * FROM public.orders WHERE UPPER(order_code) = UPPER($1) OR id = $1 LIMIT 1`,
      [code]
    );
    if (pgRes?.rows?.[0]) {
      const r = pgRes.rows[0];
      return {
        id: r.id,
        order_code: r.order_code || r.id,
        user_id: r.user_id || 'anonymous',
        user_name: r.user_name || 'Khách Hàng',
        user_contact: r.user_contact || r.delivery_contact || '',
        delivery_contact: r.delivery_contact || r.user_contact || '',
        telegram_id: r.telegram_id || undefined,
        service_type: r.service_type || r.order_type || 'MUA_SAN_PHAM',
        item_name: r.item_name || r.product_name || 'Dịch vụ YukiShopMXH',
        sku: r.sku || r.product_sku || 'SKU',
        quantity: Number(r.quantity || 1),
        target_link: r.target_link || 'Website',
        total_amount: Number(r.total_amount ?? r.amount ?? 0),
        paid: Boolean(r.paid),
        deducted_balance: Number(r.deducted_balance || 0),
        coupon_code: r.coupon_code || r.voucher_code || undefined,
        discount_amount: Number(r.discount_amount || 0),
        partner_code: r.partner_code || undefined,
        cashback_awarded: r.cashback_awarded !== null && r.cashback_awarded !== undefined ? Number(r.cashback_awarded) : undefined,
        partner_commission_awarded: Number(r.partner_commission_awarded || 0),
        refunded: Boolean(r.refunded),
        telegram_notified: Boolean(r.telegram_notified),
        account_credentials: r.account_credentials || undefined,
        delivery_info: r.delivery_info || r.delivered_data || undefined,
        warranty_days: r.warranty_days !== undefined ? Number(r.warranty_days) : 30,
        warranty_claimed: Boolean(r.warranty_claimed),
        warranty_claim_reason: r.warranty_claim_reason || undefined,
        warranty_status: r.warranty_status || undefined,
        warranty_resolution_note: r.warranty_resolution_note || undefined,
        warranty_resolved_at: r.warranty_resolved_at || undefined,
        status: (String(r.status || 'pending').toLowerCase() as any),
        notes: r.notes || '',
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || r.created_at || new Date().toISOString(),
      };
    }
  } catch {}

  try {
    const sb = getSupabaseAdmin();
    if (sb) {
      let { data: r } = await sb.from('orders').select('*').eq('order_code', code).maybeSingle();
      if (!r) {
        const byId = await sb.from('orders').select('*').eq('id', code).maybeSingle();
        r = byId.data;
      }
      if (r) {
        return {
          id: r.id,
          order_code: r.order_code || r.id,
          user_id: r.user_id || 'anonymous',
          user_name: r.user_name || 'Khách Hàng',
          user_contact: r.user_contact || r.delivery_contact || '',
          delivery_contact: r.delivery_contact || r.user_contact || '',
          telegram_id: r.telegram_id || undefined,
          service_type: r.service_type || r.order_type || 'MUA_SAN_PHAM',
          item_name: r.item_name || r.product_name || 'Dịch vụ YukiShopMXH',
          sku: r.sku || r.product_sku || 'SKU',
          quantity: Number(r.quantity || 1),
          target_link: r.target_link || 'Website',
          total_amount: Number(r.total_amount ?? r.amount ?? 0),
          paid: Boolean(r.paid),
          deducted_balance: Number(r.deducted_balance || 0),
          coupon_code: r.coupon_code || r.voucher_code || undefined,
          discount_amount: Number(r.discount_amount || 0),
          refunded: Boolean(r.refunded),
          account_credentials: r.account_credentials || undefined,
          delivery_info: r.delivery_info || r.delivered_data || undefined,
          warranty_days: r.warranty_days !== undefined ? Number(r.warranty_days) : 30,
          warranty_claimed: Boolean(r.warranty_claimed),
          warranty_claim_reason: r.warranty_claim_reason || undefined,
          warranty_status: r.warranty_status || undefined,
          status: (String(r.status || 'pending').toLowerCase() as any),
          notes: r.notes || '',
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || r.created_at || new Date().toISOString(),
        };
      }
    }
  } catch {}

  return serverStore.findOrderByCode(code) || null;
}

export async function updateDbOrderFields(
  orderCode: string,
  patch: Record<string, any>
): Promise<boolean> {
  const code = String(orderCode || '').trim();
  if (!code) return false;

  await ensureDatabaseReady().catch(() => {});
  const nowISO = new Date().toISOString();
  let ok = false;

  const allowedCols = new Set([
    'status',
    'paid',
    'refunded',
    'delivered_data',
    'delivery_info',
    'approved_by',
    'notes',
    'warranty_claimed',
    'warranty_claim_reason',
    'warranty_status',
    'warranty_resolution_note',
    'warranty_resolved_at',
    'cashback_awarded',
    'partner_commission_awarded',
    'telegram_notified',
  ]);

  const cleanEntries = Object.entries(patch).filter(
    ([k, v]) => allowedCols.has(k) && v !== undefined
  );

  if (cleanEntries.length > 0) {
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      for (const [k, v] of cleanEntries) {
        sets.push(`${k} = $${idx++}`);
        vals.push(v);
      }
      sets.push('updated_at = NOW()');
      vals.push(code);
      const res = await queryPostgres(
        `UPDATE public.orders SET ${sets.join(', ')} WHERE UPPER(order_code) = UPPER($${idx}) OR id = $${idx}`,
        vals
      );
      if (res) ok = true;
    } catch {}

    try {
      const sb = getSupabaseAdmin();
      if (sb) {
        const sbPatch: Record<string, any> = { updated_at: nowISO };
        for (const [k, v] of cleanEntries) sbPatch[k] = v;
        const { error: e1 } = await sb.from('orders').update(sbPatch).eq('order_code', code);
        const { error: e2 } = await sb.from('orders').update(sbPatch).eq('id', code);
        if (!e1 || !e2) ok = true;
      }
    } catch {}
  }

  serverStore.updateOrderStatus(code, patch.status || undefined, patch);
  return ok;
}

export async function appendMacroDroidLogDb(
  entry: Omit<MacroDroidLog, 'id' | 'time'> & { id?: string; time?: string }
): Promise<MacroDroidLog> {
  const sanitizedSnippet = String(entry.rawSnippet || '')
    .replace(/"?(?:secret|secret_token|token|key)"?\s*[:=]\s*"?[^"\s,&}]+"?/gi, '[REDACTED_SECRET]');
  const created = serverStore.addMacroDroidLog({
    ...entry,
    rawSnippet: sanitizedSnippet.slice(0, 500),
  });

  await ensureDatabaseReady().catch(() => {});
  try {
    await queryPostgres(
      `INSERT INTO public.webhook_logs (id, source, method, title, content, raw_payload, received_amount, order_code, status, message, created_at)
       VALUES ($1, 'MACRODROID', $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        created.id,
        created.method || 'POST',
        created.title || '',
        created.text || '',
        sanitizedSnippet.slice(0, 500),
        Number(created.receivedAmount || 0),
        created.orderCode || null,
        created.status || 'INFO',
        created.message || '',
      ]
    );
    await queryPostgres(
      `INSERT INTO public.macro_logs (id, method, title, text, raw_snippet, received_amount, order_code, status, message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        created.id,
        created.method || 'POST',
        created.title || '',
        created.text || '',
        sanitizedSnippet.slice(0, 500),
        Number(created.receivedAmount || 0),
        created.orderCode || null,
        created.status || 'INFO',
        created.message || '',
      ]
    );
  } catch {}

  try {
    const existing = await getSystemSetting<MacroDroidLog[]>('macrodroid_logs', []);
    const merged = [created, ...(Array.isArray(existing) ? existing : [])].slice(0, 100);
    await setSystemSetting('macrodroid_logs', merged);
  } catch {}
  return created;
}

export async function getMacroDroidLogsDb(limit = 50): Promise<MacroDroidLog[]> {
  await ensureDatabaseReady().catch(() => {});
  try {
    const pgRes = await queryPostgres(
      `SELECT id, method, title, content AS text, raw_payload AS raw_snippet, received_amount, order_code, status, message, created_at
       FROM public.webhook_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    if (pgRes?.rows?.length) {
      return pgRes.rows.map((r: any) => ({
        id: r.id,
        time: r.created_at
          ? new Date(r.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
          : '',
        method: r.method || 'POST',
        title: r.title || '',
        text: r.text || '',
        rawSnippet: r.raw_snippet || '',
        receivedAmount: Number(r.received_amount || 0),
        orderCode: r.order_code || undefined,
        status: r.status || 'INFO',
        message: r.message || '',
      }));
    }
  } catch {}

  try {
    const dbLogs = await getSystemSetting<MacroDroidLog[]>('macrodroid_logs', []);
    if (Array.isArray(dbLogs) && dbLogs.length > 0) {
      return dbLogs.slice(0, limit);
    }
  } catch {}
  return serverStore.loadMacroDroidLogs().slice(0, limit);
}

export async function savePasswordResetTokenDb(record: {
  id: string;
  token: string;
  email: string;
  userId?: string;
  telegramId?: string;
  tokenType: 'SHORT_OTP' | 'MAGIC_LINK';
  verifiedTelegram: boolean;
  expiresAt: number;
}): Promise<void> {
  await ensureDatabaseReady().catch(() => {});
  const expiresISO = new Date(record.expiresAt).toISOString();

  try {
    await queryPostgres(
      `UPDATE public.password_reset_tokens SET used = TRUE WHERE LOWER(email) = LOWER($1) AND used = FALSE`,
      [record.email]
    );
    await queryPostgres(
      `INSERT INTO public.password_reset_tokens
        (id, token, email, user_id, telegram_id, token_type, verified_telegram, expires_at, used, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())
       ON CONFLICT (token) DO UPDATE SET
         expires_at = EXCLUDED.expires_at,
         used = FALSE,
         verified_telegram = EXCLUDED.verified_telegram`,
      [
        record.id,
        record.token,
        record.email.toLowerCase(),
        record.userId || null,
        record.telegramId || null,
        record.tokenType,
        record.verifiedTelegram,
        expiresISO,
      ]
    );
  } catch {}

  try {
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('email', record.email.toLowerCase())
        .eq('used', false);
      await sb.from('password_reset_tokens').upsert({
        id: record.id,
        token: record.token,
        email: record.email.toLowerCase(),
        user_id: record.userId || null,
        telegram_id: record.telegramId || null,
        token_type: record.tokenType,
        verified_telegram: record.verifiedTelegram,
        expires_at: expiresISO,
        used: false,
      });
    }
  } catch {}
}

export async function findPasswordResetTokenDb(tokenInput: string): Promise<PasswordResetToken | null> {
  const clean = String(tokenInput || '').trim();
  if (!clean || !/^[A-Za-z0-9_-]{4,128}$/.test(clean)) return null;
  await ensureDatabaseReady().catch(() => {});

  try {
    const pgRes = await queryPostgres(
      `SELECT * FROM public.password_reset_tokens
       WHERE (UPPER(token) = UPPER($1) OR id = $1) AND used = FALSE
       LIMIT 1`,
      [clean]
    );
    const r = pgRes?.rows?.[0];
    if (r) {
      const expiresAt = new Date(r.expires_at).getTime();
      if (Date.now() > expiresAt) return null;
      return {
        id: r.id,
        token: r.token,
        email: r.email,
        userId: r.user_id || undefined,
        telegramId: r.telegram_id || undefined,
        tokenType: r.token_type || (String(r.token).startsWith('YK-') ? 'SHORT_OTP' : 'MAGIC_LINK'),
        verifiedTelegram: Boolean(r.verified_telegram),
        expiresAt,
        used: Boolean(r.used),
        createdAt: r.created_at,
      };
    }
  } catch {}

  try {
    const sb = getSupabaseAdmin();
    if (sb) {
      let { data: r } = await sb
        .from('password_reset_tokens')
        .select('*')
        .ilike('token', clean)
        .eq('used', false)
        .maybeSingle();
      if (!r) {
        const byId = await sb
          .from('password_reset_tokens')
          .select('*')
          .eq('id', clean)
          .eq('used', false)
          .maybeSingle();
        r = byId.data;
      }
      if (r) {
        const expiresAt = new Date(r.expires_at).getTime();
        if (Date.now() > expiresAt) return null;
        return {
          id: r.id,
          token: r.token,
          email: r.email,
          userId: r.user_id || undefined,
          telegramId: r.telegram_id || undefined,
          tokenType: r.token_type || (String(r.token).startsWith('YK-') ? 'SHORT_OTP' : 'MAGIC_LINK'),
          verifiedTelegram: Boolean(r.verified_telegram),
          expiresAt,
          used: Boolean(r.used),
          createdAt: r.created_at,
        };
      }
    }
  } catch {}

  return serverStore.findPasswordResetToken(clean);
}

export async function markPasswordResetTokenUsedDb(tokenOrId: string): Promise<void> {
  const clean = String(tokenOrId || '').trim();
  if (!clean || !/^[A-Za-z0-9_-]{4,128}$/.test(clean)) return;
  serverStore.markPasswordResetTokenUsed(clean);
  try {
    await queryPostgres(
      `UPDATE public.password_reset_tokens SET used = TRUE WHERE UPPER(token) = UPPER($1) OR id = $1`,
      [clean]
    );
  } catch {}
  try {
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb.from('password_reset_tokens').update({ used: true }).ilike('token', clean);
      await sb.from('password_reset_tokens').update({ used: true }).eq('id', clean);
    }
  } catch {}
}
