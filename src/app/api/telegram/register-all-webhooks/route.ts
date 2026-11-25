import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getTelegramBotConfig } from '@/lib/system-settings';
import { verifySecretHeader } from '@/lib/webhook-security';
import { syncTelegramBotsTwoWay, resolvePublicOrigin } from '@/lib/telegram/sync-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secretProvided =
      req.headers.get('x-telegram-secret') ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      searchParams.get('secret') ||
      '';

    const cfg = await getTelegramBotConfig();
    const isAdmin = await verifyAdminRequest();
    const isSecretValid = cfg.webhook_secret
      ? verifySecretHeader(secretProvided, cfg.webhook_secret)
      : false;

    if (!isAdmin && !isSecretValid) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Access denied.' }, { status: 401 });
    }

    if (!cfg.bot_token && !cfg.otp_bot_token) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình Token Bot Telegram trong Database hoặc biến môi trường.' },
        { status: 400 }
      );
    }

    const origin = resolvePublicOrigin(req);
    const syncRes = await syncTelegramBotsTwoWay({
      originUrl: origin,
      registerWebhook: origin.startsWith('https://'),
      syncCommands: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Toàn bộ Webhook Telegram 2 chiều & Bot Commands đã được đồng bộ thành công!',
      data: {
        ...syncRes,
        webhookSecret: syncRes.webhookSecret ? `••••${syncRes.webhookSecret.slice(-4)}` : '',
        macroDroid: {
          targetUrl: `${origin}/api/webhook/macrodroid`,
          secretHeader: 'x-macrodroid-secret',
          maxAutoLimit: '2,000,000 VNĐ',
        },
      },
    });
  } catch (err: any) {
    console.error('[API register-all-webhooks error]:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi đồng bộ Webhook: ' + err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
