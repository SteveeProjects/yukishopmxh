import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getTelegramBotConfig } from '@/lib/system-settings';
import { POST as macrodroidPost } from '@/app/api/webhook/macrodroid/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Admin-authenticated MacroDroid webhook simulator.
 * Lets Admin test parser/logging pipeline directly from /admin without exposing raw secrets in browser code.
 */
export async function POST(req: Request) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cfg = await getTelegramBotConfig();
    const secret =
      cfg.macrodroid_secret ||
      cfg.webhook_secret ||
      process.env.MACRODROID_SECRET ||
      process.env.TELEGRAM_WEBHOOK_SECRET ||
      '';

    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình Secret Key MacroDroid/Webhook.' },
        { status: 400 }
      );
    }

    const content = String(
      body.content || body.message || '[ZaloPay Test] Nhan +50.000d ND: YUKISP_DH_TEST_ADMIN'
    ).trim();

    const syntheticReq = new Request(req.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-macrodroid-secret': secret,
      },
      body: JSON.stringify({
        content,
        amount: body.amount,
      }),
    });

    return await macrodroidPost(syntheticReq);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi test webhook MacroDroid.' },
      { status: 500 }
    );
  }
}
