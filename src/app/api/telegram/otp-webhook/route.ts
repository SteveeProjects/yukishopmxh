import { NextResponse } from 'next/server';
import { processTelegramOtpUpdate } from '@/lib/telegram/otp-bot-handler';
import { getTelegramBotConfig } from '@/lib/system-settings';
import { verifySecretHeader } from '@/lib/webhook-security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const cfg = await getTelegramBotConfig().catch(() => null);
    const configuredSecret =
      cfg?.webhook_secret ||
      process.env.TELEGRAM_WEBHOOK_SECRET ||
      '';

    const headerSecret =
      req.headers.get('x-telegram-bot-api-secret-token') ||
      req.headers.get('x-webhook-secret') ||
      '';

    if (!verifySecretHeader(headerSecret, configuredSecret)) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED_WEBHOOK' }, { status: 401 });
    }

    const update = await req.json().catch(() => null);
    if (!update) {
      return NextResponse.json({ ok: false, error: 'Empty update' }, { status: 400 });
    }

    const result = await processTelegramOtpUpdate(update);
    return NextResponse.json({ ok: true, ...(result || {}) });
  } catch (error: any) {
    console.error('[otp-webhook] Global error:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
