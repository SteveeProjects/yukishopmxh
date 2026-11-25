import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getTelegramBotConfig, setTelegramBotConfig } from '@/lib/system-settings';
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cfg = await getTelegramBotConfig();
  const origin = resolvePublicOrigin(req);

  const [mainMe, mainWh, otpMe, otpWh] = await Promise.all([
    cfg.bot_token ? callTelegramApi(cfg.bot_token, 'getMe') : Promise.resolve(null),
    cfg.bot_token ? callTelegramApi(cfg.bot_token, 'getWebhookInfo') : Promise.resolve(null),
    cfg.otp_bot_token ? callTelegramApi(cfg.otp_bot_token, 'getMe') : Promise.resolve(null),
    cfg.otp_bot_token ? callTelegramApi(cfg.otp_bot_token, 'getWebhookInfo') : Promise.resolve(null),
  ]);

  return NextResponse.json({
    success: true,
    adminChatId: cfg.admin_id,
    detectedOrigin: origin,
    mainBot: {
      configured: Boolean(cfg.bot_token),
      ok: mainMe?.ok === true,
      username: mainMe?.result?.username || cfg.bot_username || null,
      firstName: mainMe?.result?.first_name || null,
      webhookUrl: mainWh?.result?.url || '',
      pendingUpdates: mainWh?.result?.pending_update_count || 0,
      lastError: mainWh?.result?.last_error_message || null,
      mode: mainWh?.result?.url ? 'WEBHOOK_2WAY' : 'HYBRID_POLLING',
    },
    otpBot: {
      configured: Boolean(cfg.otp_bot_token),
      ok: otpMe?.ok === true,
      username: otpMe?.result?.username || cfg.otp_bot_username || null,
      firstName: otpMe?.result?.first_name || null,
      webhookUrl: otpWh?.result?.url || '',
      pendingUpdates: otpWh?.result?.pending_update_count || 0,
      lastError: otpWh?.result?.last_error_message || null,
      mode: otpWh?.result?.url ? 'WEBHOOK_2WAY' : 'HYBRID_POLLING',
    },
  });
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'sync_all');
  const cfg = await getTelegramBotConfig();

  if (action === 'delete_webhook') {
    const [mainBotDelete, otpBotDelete] = await Promise.all([
      cfg.bot_token ? callTelegramApi(cfg.bot_token, 'deleteWebhook', { drop_pending_updates: false }) : Promise.resolve(null),
      cfg.otp_bot_token ? callTelegramApi(cfg.otp_bot_token, 'deleteWebhook', { drop_pending_updates: false }) : Promise.resolve(null),
    ]);
    await setTelegramBotConfig({ webhook_url: '', otp_webhook_url: '' });
    return NextResponse.json({
      success: true,
      message: 'Đã gỡ Webhook Telegram thành công. Cả 2 Bot sẵn sàng chạy chế độ Polling nội bộ.',
      results: { mainBotDelete, otpBotDelete },
    });
  }

  if (action === 'sync_commands') {
    const syncRes = await syncTelegramBotsTwoWay({
      originUrl: resolvePublicOrigin(req),
      registerWebhook: false,
      syncCommands: true,
    });
    return NextResponse.json({
      success: true,
      message: 'Đã đồng bộ menu lệnh 2 chiều cho cả 2 Bot Telegram!',
      results: syncRes,
    });
  }

  if (action === 'set_webhook' || action === 'sync_all') {
    const rawDomain = String(body.publicDomain || resolvePublicOrigin(req)).trim().replace(/\/$/, '');
    if (action === 'set_webhook' && !rawDomain.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'Telegram yêu cầu đường dẫn Webhook phải bắt đầu bằng HTTPS công khai!' },
        { status: 400 }
      );
    }

    const syncRes = await syncTelegramBotsTwoWay({
      originUrl: rawDomain,
      registerWebhook: rawDomain.startsWith('https://'),
      syncCommands: true,
    });

    return NextResponse.json({
      success: true,
      message: syncRes.isHttps
        ? `Đã đấu nối Webhook 2 chiều & Menu lệnh thành công tới ${syncRes.origin}`
        : 'Đã đồng bộ Menu lệnh 2 chiều cho cả 2 Bot (Cần domain HTTPS để gắn Webhook Telegram).',
      results: syncRes,
    });
  }

  return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 });
}
