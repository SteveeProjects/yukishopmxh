import { NextResponse } from 'next/server';
import { getTelegramBotConfig } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const tgConfig = await getTelegramBotConfig().catch(() => null);
    const token = tgConfig?.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Telegram Bot chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawId = String(body.telegramId || body.telegram_id || '').trim().replace(/^@/, '');

    if (!rawId || !/^\d{5,15}$/.test(rawId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID Telegram không hợp lệ (phải là dãy số từ 5-15 chữ số).',
        },
        { status: 400 }
      );
    }

    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${token}/getChat?chat_id=${rawId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        }
      );

      const tgData = await tgRes.json().catch(() => null);

      if (tgData && tgData.ok && tgData.result) {
        const res = tgData.result;
        const username = res.username || null;
        const fullName = [res.first_name, res.last_name].filter(Boolean).join(' ').trim() || 'Người dùng Telegram';
        const chatUrl = username ? `https://t.me/${username}` : `tg://user?id=${rawId}`;

        return NextResponse.json({
          success: true,
          exists: true,
          telegramId: rawId,
          username,
          fullName,
          chatUrl,
        });
      }
    } catch (fetchErr) {
      console.warn('[resolve-user] Failed calling Telegram API:', fetchErr);
    }

    // Fallback safe representation for privacy-shielded or new users
    return NextResponse.json({
      success: true,
      exists: false,
      telegramId: rawId,
      username: null,
      fullName: `ID ${rawId}`,
      chatUrl: `tg://user?id=${rawId}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Lỗi xử lý tra cứu Telegram.',
      },
      { status: 500 }
    );
  }
}
