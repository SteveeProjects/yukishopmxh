import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  getTelegramBotConfig,
  maskSecretValue,
  isMaskedPlaceholder,
} from '@/lib/system-settings';
import { isDatabaseConfigured } from '@/lib/db';
import {
  syncTelegramBotsTwoWay,
  resolvePublicOrigin,
  callTelegramApi,
} from '@/lib/telegram/sync-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const config = await getTelegramBotConfig();
    const effectiveMacro = config.macrodroid_secret || config.webhook_secret;
    return NextResponse.json(
      {
        success: true,
        isDatabaseConfigured: isDatabaseConfigured(),
        detectedOrigin: resolvePublicOrigin(req),
        config: {
          bot_token: maskSecretValue(config.bot_token),
          has_bot_token: Boolean(config.bot_token),
          admin_id: config.admin_id,
          webhook_secret: maskSecretValue(config.webhook_secret),
          has_webhook_secret: Boolean(config.webhook_secret),
          macrodroid_secret: maskSecretValue(effectiveMacro),
          has_macrodroid_secret: Boolean(effectiveMacro),
          bot_username: config.bot_username,
          is_connected: config.is_connected,
          webhook_url: config.webhook_url || '',
          otp_bot_token: maskSecretValue(config.otp_bot_token),
          has_otp_bot_token: Boolean(config.otp_bot_token),
          otp_bot_username: config.otp_bot_username || '',
          otp_is_connected: config.otp_is_connected || false,
          otp_webhook_url: config.otp_webhook_url || '',
          updated_at: config.updated_at,
        },
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const current = await getTelegramBotConfig();

    const rawToken = String(body.token || body.bot_token || '').trim();
    const rawOtpToken = String(body.otpToken || body.otp_bot_token || '').trim();
    const rawWebhookSecret = String(body.webhookSecret || body.webhook_secret || '').trim();
    const rawMacroSecret = String(body.macrodroidSecret || body.macrodroid_secret || rawWebhookSecret || '').trim();
    const adminId = String(body.adminId || body.admin_id || current.admin_id || '8960751162').trim();
    const customOrigin = String(body.publicDomain || '').trim();

    // Preserve real secrets if Admin UI submitted the masked placeholder unchanged
    const token = rawToken && !isMaskedPlaceholder(rawToken) ? rawToken : current.bot_token || '';
    const otpToken = rawOtpToken && !isMaskedPlaceholder(rawOtpToken) ? rawOtpToken : current.otp_bot_token || '';
    const webhookSecret =
      rawWebhookSecret && !isMaskedPlaceholder(rawWebhookSecret) ? rawWebhookSecret : undefined;
    const macrodroidSecret =
      rawMacroSecret && !isMaskedPlaceholder(rawMacroSecret) ? rawMacroSecret : undefined;

    if (!token && !otpToken) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập ít nhất 1 Token Bot Telegram (Shop Bot hoặc OTP Bot).' },
        { status: 400 }
      );
    }

    const originUrl = customOrigin || resolvePublicOrigin(req);
    const syncRes = await syncTelegramBotsTwoWay({
      originUrl,
      overrideConfig: {
        bot_token: token || undefined,
        otp_bot_token: otpToken || undefined,
        admin_id: adminId,
        ...(webhookSecret ? { webhook_secret: webhookSecret } : {}),
        ...(macrodroidSecret ? { macrodroid_secret: macrodroidSecret } : {}),
      },
    });

    if (!syncRes.mainBot.ok && !syncRes.otpBot.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token Bot không hợp lệ hoặc không thể kết nối tới Telegram API.',
          sync: syncRes,
        },
        { status: 400 }
      );
    }

    const activeToken = syncRes.mainBot.ok ? token : otpToken;
    if (activeToken && adminId) {
      const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const confirmMsg =
        `🟢 <b>[YUKISHOPMXH] ĐẤU NỐI BOT TELEGRAM 2 CHIỀU THÀNH CÔNG!</b>\n\n` +
        `🤖 <b>Bot 1 (Shop & Admin 2 Chiều):</b> ${syncRes.mainBot.username ? `@${syncRes.mainBot.username} (${syncRes.mainBot.webhookUrl ? 'Webhook 2 chiều' : 'Polling nội bộ'})` : 'Chưa cấu hình'}\n` +
        `🔐 <b>Bot 2 (OTP Đổi MK 2 Chiều):</b> ${syncRes.otpBot.username ? `@${syncRes.otpBot.username} (${syncRes.otpBot.webhookUrl ? 'Webhook 2 chiều' : 'Polling nội bộ'})` : 'Chưa cấu hình'}\n` +
        `🆔 <b>Admin Chat ID:</b> <code>${adminId}</code>\n` +
        `⏰ <b>Thời gian:</b> ${now}\n\n` +
        `<i>Bạn có thể gõ /start, /status, /pending, /sleep trực tiếp trong chat này bất kỳ lúc nào!</i>`;

      await callTelegramApi(activeToken, 'sendMessage', {
        chat_id: adminId,
        text: confirmMsg,
        parse_mode: 'HTML',
      }).catch(() => {});
    }

    const parts: string[] = [];
    if (syncRes.mainBot.username) parts.push(`Bot 1: @${syncRes.mainBot.username}`);
    if (syncRes.otpBot.username) parts.push(`Bot 2: @${syncRes.otpBot.username}`);

    return NextResponse.json(
      {
        success: true,
        bot_username: syncRes.mainBot.username,
        otp_bot_username: syncRes.otpBot.username,
        webhook_secret: maskSecretValue(syncRes.webhookSecret),
        bot_token: maskSecretValue(token),
        otp_bot_token: maskSecretValue(otpToken),
        sync: syncRes,
        message: `Đã lưu & kết nối 2 chiều thành công (${parts.join(' | ')})!${syncRes.isHttps ? ' Đã tự động đăng ký Webhook HTTPS.' : ' (Đang chạy Local HTTP — dùng Hybrid Poller hoặc deploy HTTPS để bật Webhook tự động).'}`,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
