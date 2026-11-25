// ==============================================================================
// YUKISHOPMXH — TELEGRAM 2-WAY BOT SYNC & WEBHOOK REGISTRATION SERVICE
// ==============================================================================

import {
  getTelegramBotConfig,
  setTelegramBotConfig,
  generateEphemeralWebhookSecret,
  type TelegramBotSettings,
} from '@/lib/system-settings';

export const MAIN_BOT_COMMANDS = [
  { command: 'start', description: 'Bảng điều khiển Admin & Lấy Telegram ID' },
  { command: 'status', description: 'Thống kê doanh thu, đơn hàng & trạng thái hệ thống' },
  { command: 'pending', description: 'Danh sách đơn hàng & nạp ví chờ duyệt (1 chạm)' },
  { command: 'sleep', description: 'Bật / Tắt chế độ nghỉ duyệt tay (Sleep Mode)' },
  { command: 'duyet', description: 'Duyệt nhanh đơn/nạp theo mã (/duyet MÃ_ĐƠN)' },
  { command: 'huy', description: 'Hủy & hoàn tiền đơn theo mã (/huy MÃ_ĐƠN)' },
  { command: 'id', description: 'Xem Telegram ID của bạn để đăng ký tài khoản' },
  { command: 'help', description: 'Hướng dẫn sử dụng Bot 2 chiều' },
];

export const OTP_BOT_COMMANDS = [
  { command: 'start', description: 'Mở menu bảo mật & lấy ID Telegram' },
  { command: 'doimk', description: 'Nhập mã YK-XXXXXX đổi mật khẩu 2 chiều' },
  { command: 'id', description: 'Lấy ID Telegram cá nhân chính xác' },
  { command: 'cancel', description: 'Hủy phiên đổi mật khẩu hiện tại' },
  { command: 'help', description: 'Hướng dẫn bảo mật & khôi phục mật khẩu' },
];

export async function callTelegramApi(token: string, method: string, body?: any) {
  if (!token) return { ok: false, description: 'MISSING_TOKEN' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      signal: AbortSignal.timeout(9000),
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err?.message || 'NETWORK_ERROR' };
  }
}

export function resolvePublicOrigin(req?: Request): string {
  const fromHeadersHost =
    req?.headers.get('x-forwarded-host') || req?.headers.get('host') || '';
  const fromHeadersProto = req?.headers.get('x-forwarded-proto') || '';

  const envUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  ).trim();

  if (fromHeadersHost && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(fromHeadersHost)) {
    const proto = fromHeadersProto === 'http' ? 'http' : 'https';
    return `${proto}://${fromHeadersHost}`.replace(/\/$/, '');
  }

  if (envUrl) {
    const withProto = /^https?:\/\//i.test(envUrl) ? envUrl : `https://${envUrl}`;
    return withProto.replace(/\/$/, '');
  }

  if (fromHeadersHost) {
    return `${fromHeadersProto || 'http'}://${fromHeadersHost}`.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

export interface SyncBotsResult {
  origin: string;
  isHttps: boolean;
  webhookSecret: string;
  mainBot: {
    configured: boolean;
    ok: boolean;
    username: string | null;
    firstName: string | null;
    commandsSynced: boolean;
    webhookSet: boolean;
    webhookUrl: string;
    pendingUpdates: number;
    lastError: string | null;
    mode: 'WEBHOOK_2WAY' | 'POLLING_OR_UNSET';
  };
  otpBot: {
    configured: boolean;
    ok: boolean;
    username: string | null;
    firstName: string | null;
    commandsSynced: boolean;
    webhookSet: boolean;
    webhookUrl: string;
    pendingUpdates: number;
    lastError: string | null;
    mode: 'WEBHOOK_2WAY' | 'POLLING_OR_UNSET';
  };
}

export async function syncTelegramBotsTwoWay(options: {
  originUrl?: string;
  registerWebhook?: boolean;
  syncCommands?: boolean;
  overrideConfig?: Partial<TelegramBotSettings>;
} = {}): Promise<SyncBotsResult> {
  const current = await getTelegramBotConfig();
  const effectiveSecret =
    (options.overrideConfig?.webhook_secret ?? current.webhook_secret) ||
    generateEphemeralWebhookSecret();

  const mainToken = (options.overrideConfig?.bot_token ?? current.bot_token).trim();
  const otpToken = (options.overrideConfig?.otp_bot_token ?? current.otp_bot_token ?? '').trim();
  const adminId = (options.overrideConfig?.admin_id ?? current.admin_id ?? '8960751162').trim();

  const origin = (options.originUrl || resolvePublicOrigin()).replace(/\/$/, '');
  const isHttps = origin.startsWith('https://') && !origin.includes('localhost') && !origin.includes('127.0.0.1');
  const shouldSetWebhook = options.registerWebhook ?? isHttps;
  const shouldSyncCommands = options.syncCommands ?? true;

  const inspectAndSyncOne = async (
    token: string,
    webhookPath: string,
    commands: Array<{ command: string; description: string }>
  ) => {
    if (!token) {
      return {
        configured: false,
        ok: false,
        username: null,
        firstName: null,
        commandsSynced: false,
        webhookSet: false,
        webhookUrl: '',
        pendingUpdates: 0,
        lastError: null,
        mode: 'POLLING_OR_UNSET' as const,
      };
    }

    const meRes = await callTelegramApi(token, 'getMe');
    const ok = meRes?.ok === true;
    const username = meRes?.result?.username || null;
    const firstName = meRes?.result?.first_name || null;

    let commandsSynced = false;
    if (ok && shouldSyncCommands) {
      const cmdRes = await callTelegramApi(token, 'setMyCommands', { commands });
      commandsSynced = cmdRes?.ok === true;
    }

    let webhookSet = false;
    if (ok && shouldSetWebhook && isHttps) {
      const targetUrl = `${origin}${webhookPath}`;
      const whSetRes = await callTelegramApi(token, 'setWebhook', {
        url: targetUrl,
        secret_token: effectiveSecret,
        drop_pending_updates: false,
        allowed_updates: ['message', 'callback_query'],
      });
      webhookSet = whSetRes?.ok === true;
    }

    const infoRes = ok ? await callTelegramApi(token, 'getWebhookInfo') : null;
    const currentUrl = String(infoRes?.result?.url || '');

    return {
      configured: true,
      ok,
      username,
      firstName,
      commandsSynced,
      webhookSet,
      webhookUrl: currentUrl,
      pendingUpdates: Number(infoRes?.result?.pending_update_count || 0),
      lastError: infoRes?.result?.last_error_message || null,
      mode: currentUrl ? ('WEBHOOK_2WAY' as const) : ('POLLING_OR_UNSET' as const),
    };
  };

  const [mainBot, otpBot] = await Promise.all([
    inspectAndSyncOne(mainToken, '/api/telegram/webhook', MAIN_BOT_COMMANDS),
    inspectAndSyncOne(otpToken, '/api/telegram/otp-webhook', OTP_BOT_COMMANDS),
  ]);

  await setTelegramBotConfig({
    bot_token: mainToken,
    otp_bot_token: otpToken,
    admin_id: adminId,
    webhook_secret: effectiveSecret,
    macrodroid_secret: options.overrideConfig?.macrodroid_secret ?? current.macrodroid_secret ?? effectiveSecret,
    bot_username: mainBot.username || current.bot_username,
    is_connected: mainBot.ok,
    webhook_url: mainBot.webhookUrl || current.webhook_url,
    otp_bot_username: otpBot.username || current.otp_bot_username,
    otp_is_connected: otpBot.ok,
    otp_webhook_url: otpBot.webhookUrl || current.otp_webhook_url,
  });

  return {
    origin,
    isHttps,
    webhookSecret: effectiveSecret,
    mainBot,
    otpBot,
  };
}
