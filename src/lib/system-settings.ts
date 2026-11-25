// ==============================================================================
// YUKISHOPMXH — DYNAMIC PERSISTENT SYSTEM SETTINGS (POSTGRESQL & SUPABASE FIRST)
// ==============================================================================

import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables, isDatabaseConfigured } from '@/lib/db';

export interface TelegramBotSettings {
  // Bot 1: Shop Control & Notification Bot (2-Way)
  bot_token: string;
  admin_id: string;
  webhook_secret: string;
  macrodroid_secret?: string;
  bot_username?: string;
  is_connected?: boolean;
  webhook_url?: string;

  // Bot 2: Forgot Password OTP Bot (2-Way)
  otp_bot_token?: string;
  otp_bot_username?: string;
  otp_is_connected?: boolean;
  otp_webhook_url?: string;

  updated_at?: string;
}

export interface SiteSettings {
  sleep_mode: boolean;
  sleep_message: string;
  cashback_rate: number;
  cashback_min_order: number;
  cashback_min_redeem: number;
  affiliate_rate: number;
  updated_at?: string;
}

const cache = new Map<string, { value: any; expiry: number }>();
const CACHE_TTL_MS = 10000;

export function isSupabaseConfigured(): boolean {
  return isDatabaseConfigured();
}

export async function getSystemSetting<T>(key: string, fallbackDefault: T): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.value as T;
  }

  await autoEnsureTables().catch(() => {});

  try {
    const pgRes = await queryPostgres('SELECT value FROM public.system_settings WHERE key = $1 LIMIT 1', [key]);
    if (pgRes && pgRes.rows && pgRes.rows.length > 0) {
      const val = pgRes.rows[0].value as T;
      cache.set(key, { value: val, expiry: Date.now() + CACHE_TTL_MS });
      return val;
    }
  } catch {}

  const sbAdmin = getSupabaseAdmin();
  if (sbAdmin) {
    try {
      const { data, error } = await sbAdmin
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (!error && data?.value !== undefined && data?.value !== null) {
        const val = data.value as T;
        cache.set(key, { value: val, expiry: Date.now() + CACHE_TTL_MS });
        return val;
      }
    } catch (err) {
      console.warn(`[system-settings] Supabase query notice for key '${key}':`, err);
    }
  }

  return fallbackDefault;
}

export async function setSystemSetting<T>(key: string, value: T): Promise<boolean> {
  cache.set(key, { value, expiry: Date.now() + CACHE_TTL_MS });
  await autoEnsureTables().catch(() => {});

  let persisted = false;

  try {
    const jsonStr = JSON.stringify(value);
    const pgRes = await queryPostgres(
      `INSERT INTO public.system_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, jsonStr]
    );
    if (pgRes) persisted = true;
  } catch (pgErr) {
    console.warn(`[system-settings] Postgres upsert notice for '${key}':`, pgErr);
  }

  const sbAdmin = getSupabaseAdmin();
  if (sbAdmin) {
    try {
      const { error } = await sbAdmin
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (!error) persisted = true;
      else console.warn(`[system-settings] Supabase upsert error for '${key}':`, error);
    } catch (err) {
      console.warn(`[system-settings] Supabase exception for '${key}':`, err);
    }
  }

  return persisted;
}

export function generateEphemeralWebhookSecret(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function maskSecretValue(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.length <= 6) return '••••••';
  return `••••••••••••${s.slice(-4)}`;
}

export function isMaskedPlaceholder(val?: string | null): boolean {
  const s = String(val || '').trim();
  return !s || s.includes('••••');
}

export async function getTelegramBotConfig(): Promise<TelegramBotSettings> {
  const envToken = (
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.SHOP_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.NOTIFY_BOT_TOKEN ||
    ''
  ).trim();
  const envAdminId = (
    process.env.TELEGRAM_ADMIN_ID ||
    process.env.TELEGRAM_ADMIN_CHAT_ID ||
    process.env.TELEGRAM_CHAT_ID ||
    '8960751162'
  ).trim();
  const envWebhookSecret = (
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    process.env.MACRODROID_SECRET ||
    ''
  ).trim();
  const envMacrodroidSecret = (
    process.env.MACRODROID_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    ''
  ).trim();
  const envOtpToken = (
    process.env.TELEGRAM_OTP_BOT_TOKEN ||
    process.env.FORGOT_PASSWORD_BOT_TOKEN ||
    process.env.OTP_BOT_TOKEN ||
    process.env.FORGOT_PASS_BOT_TOKEN ||
    ''
  ).trim();

  const defaultSettings: TelegramBotSettings = {
    bot_token: envToken,
    admin_id: envAdminId,
    webhook_secret: envWebhookSecret,
    macrodroid_secret: envMacrodroidSecret,
    bot_username: undefined,
    is_connected: false,
    otp_bot_token: envOtpToken,
    otp_bot_username: undefined,
    otp_is_connected: false,
  };

  const stored = await getSystemSetting<TelegramBotSettings>('telegram_config', defaultSettings);

  const effectiveToken = (stored.bot_token || envToken).trim();
  const effectiveAdminId = (stored.admin_id || envAdminId).trim();
  const effectiveSecret = (stored.webhook_secret || envWebhookSecret).trim();
  const effectiveMacrodroidSecret = (stored.macrodroid_secret || envMacrodroidSecret || effectiveSecret).trim();
  const effectiveOtpToken = (stored.otp_bot_token || envOtpToken).trim();

  return {
    bot_token: effectiveToken,
    admin_id: effectiveAdminId,
    webhook_secret: effectiveSecret,
    macrodroid_secret: effectiveMacrodroidSecret,
    bot_username: stored.bot_username,
    is_connected: Boolean(effectiveToken && stored.bot_username),
    webhook_url: stored.webhook_url,
    otp_bot_token: effectiveOtpToken,
    otp_bot_username: stored.otp_bot_username,
    otp_is_connected: Boolean(effectiveOtpToken && stored.otp_bot_username),
    otp_webhook_url: stored.otp_webhook_url,
    updated_at: stored.updated_at,
  };
}

export async function setTelegramBotConfig(cfg: Partial<TelegramBotSettings>): Promise<boolean> {
  const current = await getTelegramBotConfig();
  const resolveField = (incoming: string | undefined, fallback: string | undefined) => {
    if (incoming === undefined || isMaskedPlaceholder(incoming)) return fallback || '';
    return incoming.trim();
  };
  const ensuredWebhookSecret =
    resolveField(cfg.webhook_secret, current.webhook_secret) || generateEphemeralWebhookSecret();
  const ensuredMacrodroidSecret =
    resolveField(cfg.macrodroid_secret, current.macrodroid_secret) || ensuredWebhookSecret;

  const next: TelegramBotSettings = {
    ...current,
    ...cfg,
    bot_token: resolveField(cfg.bot_token, current.bot_token),
    otp_bot_token: resolveField(cfg.otp_bot_token, current.otp_bot_token),
    webhook_secret: ensuredWebhookSecret,
    macrodroid_secret: ensuredMacrodroidSecret,
    updated_at: new Date().toISOString(),
  };

  cache.delete('telegram_config');
  return await setSystemSetting('telegram_config', next);
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const defaults: SiteSettings = {
    sleep_mode: false,
    sleep_message:
      'Shop đang tạm nghỉ duyệt tay. Nạp ví Auto 24/7 vẫn hoạt động; đơn xử lý thủ công sẽ được duyệt ngay khi mở ca.',
    cashback_rate: 0.02,
    cashback_min_order: 20000,
    cashback_min_redeem: 5000,
    affiliate_rate: 0.05,
  };

  return await getSystemSetting<SiteSettings>('site_settings', defaults);
}

export async function setSiteSettings(cfg: Partial<SiteSettings>): Promise<boolean> {
  const current = await getSiteSettings();
  const next: SiteSettings = {
    ...current,
    ...cfg,
    updated_at: new Date().toISOString(),
  };

  cache.delete('site_settings');
  return await setSystemSetting('site_settings', next);
}
