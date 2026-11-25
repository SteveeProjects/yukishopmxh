import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { autoEnsureTables } from '@/lib/db';
import { getTelegramBotConfig } from '@/lib/system-settings';
import { findDbUserByIdOrIdentifier, savePasswordResetTokenDb } from '@/lib/db-persistence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = String(body.email || '').trim();
    const rawTelegram = String(body.telegram || body.telegramId || body.telegramUsername || '').trim();

    if (!rawEmail || !rawTelegram) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập đầy đủ cả Gmail và ID/@Username Telegram!' },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.toLowerCase();
    const normInput = rawTelegram.replace(/^@/, '').toLowerCase().trim();

    if (normInput.length < 3) {
      return NextResponse.json(
        { success: false, error: 'ID hoặc @Username Telegram không hợp lệ.' },
        { status: 400 }
      );
    }

    await autoEnsureTables().catch(() => {});

    // 1. Lookup exact account by email across Postgres / Supabase / local cache
    const matchedUser = await findDbUserByIdOrIdentifier(cleanEmail);
    if (!matchedUser || (matchedUser.email || '').toLowerCase().trim() !== cleanEmail) {
      return NextResponse.json(
        { success: false, error: '❌ Gmail hoặc ID/@Username Telegram không khớp với hồ sơ tài khoản!' },
        { status: 400 }
      );
    }

    // 2. Strict exact match against stored Telegram ID / username (NEVER substring match!)
    const storedTeleRaw = String(matchedUser.telegramId || '').trim();
    const normStored = storedTeleRaw.replace(/^@/, '').toLowerCase().trim();

    if (!normStored) {
      return NextResponse.json(
        { success: false, error: '❌ Tài khoản chưa liên kết ID/Username Telegram trong hồ sơ!' },
        { status: 400 }
      );
    }

    if (normStored !== normInput) {
      return NextResponse.json(
        { success: false, error: '❌ Gmail hoặc ID/@Username Telegram không khớp với hồ sơ tài khoản!' },
        { status: 400 }
      );
    }

    // 3. Issue 8-char YK-XXXXXX verification token redeemable ONLY via @ForgetPassYuki_bot
    const { token, expiresAt, id } = serverStore.createPasswordResetShortToken(cleanEmail, {
      userId: matchedUser.id,
      telegramId: matchedUser.telegramId,
    });

    await savePasswordResetTokenDb({
      id,
      token,
      email: cleanEmail,
      userId: matchedUser.id,
      telegramId: matchedUser.telegramId,
      tokenType: 'SHORT_OTP',
      verifiedTelegram: false,
      expiresAt,
    });

    // 4. Notify owner on Telegram if numeric chat ID is registered
    const botCfg = await getTelegramBotConfig();
    const activeOtpBotUsername = botCfg.otp_bot_username || 'ForgetPassYuki_bot';
    const botUrl = `https://t.me/${activeOtpBotUsername}`;
    const activeToken = botCfg.otp_bot_token || botCfg.bot_token;

    if (activeToken && /^\d{5,15}$/.test(normStored)) {
      try {
        await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            chat_id: normStored,
            text:
              `🔐 <b>[YUKISHOPMXH] MÃ XÁC THỰC QUÊN MẬT KHẨU</b>\n\n` +
              `Xin chào <b>${matchedUser.fullName || matchedUser.username}</b>,\n` +
              `Mã xác thực OTP của bạn là: <code>${token}</code> (hiệu lực <b>10 phút</b>).\n\n` +
              `👉 Hãy bấm <code>/doimk</code> tại Bot này hoặc dán mã trực tiếp vào đây để xác minh chính chủ và đổi mật khẩu mới.`,
            parse_mode: 'HTML',
          }),
        });
      } catch (e) {
        console.warn('[forgot-password] Direct telegram notify notice:', e);
      }
    }

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
      botUsername: activeOtpBotUsername,
      botUrl,
      message: 'Tạo mã Token khôi phục thành công! Vui lòng gửi mã này cho Bot Telegram OTP (/doimk) trong 10 phút.',
    });
  } catch (err: any) {
    console.error('[forgot-password] Server exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi hệ thống khi tạo mã khôi phục.' },
      { status: 500 }
    );
  }
}
