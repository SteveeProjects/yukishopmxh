// ==============================================================================
// YUKISHOPMXH — OTP & PASSWORD RESET TELEGRAM BOT HANDLER (2-WAY SERVERLESS)
// Uses dynamic DB/env token, DB-backed multi-step sessions & exact Telegram verification
// ==============================================================================

import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres } from '@/lib/autoMigrate';
import { getTelegramBotConfig } from '@/lib/system-settings';
import { hashPassword } from '@/lib/password-hash';
import {
  findDbUserByIdOrIdentifier,
  findPasswordResetTokenDb,
  markPasswordResetTokenUsedDb,
  updateDbUserFields,
} from '@/lib/db-persistence';
import {
  getTelegramSession,
  setTelegramSession,
  clearTelegramSession,
} from '@/lib/telegram/bot-session';

async function resolveOtpToken(): Promise<string> {
  const cfg = await getTelegramBotConfig().catch(() => null);
  return (
    cfg?.otp_bot_token ||
    process.env.TELEGRAM_OTP_BOT_TOKEN ||
    process.env.OTP_BOT_TOKEN ||
    cfg?.bot_token ||
    ''
  ).trim();
}

function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://yukishopmxh.vn';
  return raw.replace(/\/$/, '');
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: any,
  tokenOverride?: string
) {
  try {
    const token = tokenOverride || (await resolveOtpToken());
    if (!token) return null;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.error('[otp-bot sendTelegramMessage] Error:', err.message);
    return null;
  }
}

export async function deleteTelegramMessage(
  chatId: string | number,
  messageId: number | string,
  tokenOverride?: string
) {
  if (!chatId || !messageId) return null;
  try {
    const token = tokenOverride || (await resolveOtpToken());
    if (!token) return null;
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        chat_id: chatId,
        message_id: Number(messageId),
      }),
    });
    return await res.json();
  } catch {
    return null;
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  tokenOverride?: string
) {
  try {
    const token = tokenOverride || (await resolveOtpToken());
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
      }),
    });
  } catch {}
}

export async function processTelegramOtpUpdate(update: any) {
  const token = await resolveOtpToken();
  const siteUrl = getSiteUrl();

  // 1. Handle Callback Query
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id || cb.from?.id;
    const userId = String(cb.from?.id || chatId);
    const data = String(cb.data || '').trim();

    await answerCallbackQuery(cb.id, undefined, token);

    if (data === 'doimk' || data === 'START_RESET_PW' || data === 'otp_reset') {
      await setTelegramSession(userId, { step: 'awaiting_token' }, 'otp');
      await sendTelegramMessage(
        chatId,
        '🔑 Vui lòng nhập mã Token khôi phục (dạng `YK-XXXXXX`) bạn vừa tạo trên web:',
        undefined,
        token
      );
      return { ok: true, step: 'awaiting_token' };
    }

    if (data === 'SHOW_ID') {
      await sendTelegramMessage(
        chatId,
        `🆔 *Telegram ID của bạn:* \`${userId}\`\nHãy chạm để sao chép và dán vào trang Đăng Ký hoặc Hồ Sơ YukiShopMXH.`,
        undefined,
        token
      );
      return { ok: true, shownId: userId };
    }

    if (data === 'SHOW_HELP' || data === 'otp_help') {
      const helpMsg =
        `📖 *HƯỚNG DẪN BẢO MẬT & LẤY LẠI MẬT KHẨU*\n\n` +
        `1️⃣ Truy cập trang tạo mã: ${siteUrl}/forgot-password\n` +
        `2️⃣ Nhập đúng *Gmail* và *ID/Username Telegram* đã liên kết.\n` +
        `3️⃣ Lấy mã \`YK-XXXXXX\` (hiệu lực 10 phút).\n` +
        `4️⃣ Gõ lệnh */doimk* hoặc dán thẳng mã \`YK-XXXXXX\` vào chat này để đổi mật khẩu 2 chiều an toàn.`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🌐 Mở Trang Quên Mật Khẩu', url: `${siteUrl}/forgot-password` }],
          [{ text: '🔑 Đổi Mật Khẩu (/doimk)', callback_data: 'doimk' }],
          [{ text: '🆔 Lấy Telegram ID', callback_data: 'SHOW_ID' }],
          [{ text: '💬 Liên Hệ Admin Hỗ Trợ', url: 'https://t.me/YukiIsMe2311' }],
        ],
      };
      await sendTelegramMessage(chatId, helpMsg, keyboard, token);
      return { ok: true, help: true };
    }

    return { ok: true };
  }

  // 2. Handle Text Messages
  const msg = update.message;
  if (!msg || !msg.text) return { ok: true, no_text: true };

  const chatId = msg.chat?.id;
  const userId = String(msg.from?.id || chatId);
  const senderUsername = String(msg.from?.username || '').replace(/^@/, '').toLowerCase().trim();
  const text = msg.text.trim();

  if (text.startsWith('/cancel')) {
    await clearTelegramSession(userId, 'otp');
    await sendTelegramMessage(
      chatId,
      '❌ Đã hủy thao tác đổi mật khẩu hiện tại. Gõ */start* hoặc */doimk* để bắt đầu lại.',
      undefined,
      token
    );
    return { ok: true, command: 'cancel' };
  }

  if (text.startsWith('/id')) {
    await sendTelegramMessage(
      chatId,
      `🆔 *Telegram ID chính xác của bạn:* \`${userId}\`${senderUsername ? `\n👤 *Username:* \`@${senderUsername}\`` : ''}`,
      undefined,
      token
    );
    return { ok: true, command: 'id' };
  }

  if (text.startsWith('/start')) {
    await clearTelegramSession(userId, 'otp');
    const welcomeText =
      `⚡ *BOT BẢO MẬT OTP 2 CHIỀU — YUKISHOPMXH*\n\n` +
      `🛡️ *ID Telegram của bạn:* \`${userId}\`${senderUsername ? ` (@${senderUsername})` : ''}\n\n` +
      `🔐 *Quy trình khôi phục mật khẩu:*\n` +
      `1️⃣ Mở: ${siteUrl}/forgot-password\n` +
      `2️⃣ Nhập Gmail & Telegram ID để nhận mã \`YK-XXXXXX\`\n` +
      `3️⃣ Gõ */doimk* hoặc dán thẳng mã \`YK-XXXXXX\` tại đây.`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🌐 Mở Trang Tạo Mã Token', url: `${siteUrl}/forgot-password` }],
        [{ text: '🔑 Đổi Mật Khẩu (/doimk)', callback_data: 'doimk' }],
        [{ text: '🆔 Copy Telegram ID', callback_data: 'SHOW_ID' }],
        [{ text: '💬 Liên Hệ Admin', url: 'https://t.me/YukiIsMe2311' }],
      ],
    };

    await sendTelegramMessage(chatId, welcomeText, keyboard, token);
    return { ok: true, command: 'start' };
  }

  if (text.startsWith('/help')) {
    await clearTelegramSession(userId, 'otp');
    const helpMsg =
      `📖 *HƯỚNG DẪN BOT OTP 2 CHIỀU*\n\n` +
      `• /doimk — Bắt đầu xác minh mã \`YK-XXXXXX\` và đặt mật khẩu mới\n` +
      `• /id — Lấy Telegram ID của bạn\n` +
      `• /cancel — Hủy phiên nhập hiện tại`;

    await sendTelegramMessage(chatId, helpMsg, {
      inline_keyboard: [
        [{ text: '🌐 Trang Tạo Mã Token', url: `${siteUrl}/forgot-password` }],
        [{ text: '🔑 Đổi Mật Khẩu (/doimk)', callback_data: 'doimk' }],
      ],
    }, token);
    return { ok: true, command: 'help' };
  }

  if (text.startsWith('/doimk')) {
    await setTelegramSession(userId, { step: 'awaiting_token' }, 'otp');
    await sendTelegramMessage(
      chatId,
      '🔑 Vui lòng nhập mã Token khôi phục (dạng `YK-XXXXXX`) bạn vừa tạo trên web:',
      undefined,
      token
    );
    return { ok: true, command: 'doimk' };
  }

  const session = await getTelegramSession(userId, 'otp');

  // D. Token verification step
  const tokenRegex = /(?:^|\s)(YK-[A-Za-z0-9]{6})(?:\s|$)/i;
  const tokenMatch = text.match(tokenRegex);
  const isCandidateToken = Boolean(
    tokenMatch ||
    (session?.step === 'awaiting_token' && text.toUpperCase().startsWith('YK-')) ||
    (session?.step === 'awaiting_token' && text.length >= 6 && text.length <= 12)
  );

  if (isCandidateToken && session?.step !== 'awaiting_new_password') {
    const rawToken = tokenMatch ? tokenMatch[1] : text;
    const cleanToken = rawToken.toUpperCase().trim();

    const tokenRecord = await findPasswordResetTokenDb(cleanToken);
    if (!tokenRecord || tokenRecord.used || Date.now() > tokenRecord.expiresAt) {
      await sendTelegramMessage(
        chatId,
        '❌ Mã Token không hợp lệ hoặc đã hết hạn (quá 10 phút). Vui lòng tạo mã mới trên web.',
        undefined,
        token
      );
      await deleteTelegramMessage(chatId, msg.message_id, token);
      return { ok: false, error: 'invalid_token' };
    }

    const userProfile = await findDbUserByIdOrIdentifier(tokenRecord.email);
    const senderTeleId = userId.toLowerCase().trim();

    // Strict exact Telegram ownership verification (NO substring .includes() matching!)
    const checkTeleExactMatch = (stored?: string): boolean => {
      if (!stored) return false;
      const norm = stored.replace(/^@/, '').toLowerCase().trim();
      if (!norm) return false;
      return norm === senderTeleId || (Boolean(senderUsername) && norm === senderUsername);
    };

    const isMatch = checkTeleExactMatch(tokenRecord.telegramId) || checkTeleExactMatch(userProfile?.telegramId);
    if (!isMatch) {
      await sendTelegramMessage(
        chatId,
        '⛔ Từ chối! Tài khoản Telegram này không khớp với chủ sở hữu đã đăng ký.',
        undefined,
        token
      );
      await deleteTelegramMessage(chatId, msg.message_id, token);
      return { ok: false, error: 'tele_mismatch' };
    }

    await setTelegramSession(
      userId,
      {
        step: 'awaiting_new_password',
        email: tokenRecord.email,
        tokenId: tokenRecord.id,
        token: tokenRecord.token,
        userId: userProfile?.id || tokenRecord.userId,
      },
      'otp'
    );

    await deleteTelegramMessage(chatId, msg.message_id, token);

    const sent = await sendTelegramMessage(
      chatId,
      '✅ Xác minh chính chủ thành công! Hãy gửi **mật khẩu mới** của bạn (tối thiểu 8 ký tự). Tin nhắn chứa mật khẩu sẽ tự động bị xóa ngay sau khi cập nhật.',
      undefined,
      token
    );

    if (sent?.result?.message_id) {
      await setTelegramSession(userId, { promptMsgId: sent.result.message_id }, 'otp');
    }

    return { ok: true, step: 'awaiting_new_password' };
  }

  // E. Setting new password step
  if (session?.step === 'awaiting_new_password') {
    await deleteTelegramMessage(chatId, msg.message_id, token);
    if (session.promptMsgId) {
      await deleteTelegramMessage(chatId, session.promptMsgId, token);
    }

    if (text.length < 8) {
      const sent = await sendTelegramMessage(
        chatId,
        '⚠️ Mật khẩu mới phải có tối thiểu 8 ký tự. Vui lòng nhập lại (hoặc gõ `/cancel` để hủy):',
        undefined,
        token
      );
      if (sent?.result?.message_id) {
        await setTelegramSession(userId, { promptMsgId: sent.result.message_id }, 'otp');
      }
      return { ok: false, error: 'short_password' };
    }

    const targetEmail = session.email || '';
    const targetUserId = session.userId || '';
    const hashed = hashPassword(text);

    if (targetUserId) {
      await updateDbUserFields(targetUserId, { password_hash: hashed });
    }
    try {
      await queryPostgres(
        `UPDATE public.profiles SET password_hash = $1, session_version = COALESCE(session_version, 1) + 1, updated_at = NOW()
         WHERE id = $2 OR LOWER(email) = LOWER($3)`,
        [hashed, targetUserId || '', targetEmail]
      );
    } catch {}

    serverStore.updateUserPassword(targetEmail || targetUserId, hashed);

    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin) {
      try {
        if (targetUserId && targetUserId.length > 20 && targetUserId.includes('-')) {
          await sbAdmin.auth.admin.updateUserById(targetUserId, { password: text });
        } else if (targetEmail) {
          const { data: usersData } = await sbAdmin.auth.admin.listUsers();
          const sbUser = usersData?.users?.find(
            (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
          );
          if (sbUser) {
            await sbAdmin.auth.admin.updateUserById(sbUser.id, { password: text });
          }
        }
        await sbAdmin
          .from('profiles')
          .update({ password_hash: hashed, updated_at: new Date().toISOString() })
          .eq('email', targetEmail);
      } catch (sbErr: any) {
        console.warn('[otp-bot] Supabase password sync notice:', sbErr.message);
      }
    }

    if (session.token || session.tokenId) {
      await markPasswordResetTokenUsedDb(session.token || session.tokenId!);
    }
    await clearTelegramSession(userId, 'otp');

    await sendTelegramMessage(
      chatId,
      '✅ Đổi mật khẩu thành công! Bạn có thể đăng nhập lại vào YUKISHOPMXH bằng mật khẩu mới ngay bây giờ.',
      undefined,
      token
    );

    return { ok: true, status: 'password_reset_completed' };
  }

  // F. Default 2-way guidance
  await sendTelegramMessage(
    chatId,
    `👋 Xin chào! Gõ */start* để xem hướng dẫn, */id* để lấy Telegram ID hoặc */doimk* để đổi mật khẩu.`,
    {
      inline_keyboard: [
        [{ text: '🔑 Nhập Mã Token (/doimk)', callback_data: 'doimk' }],
        [{ text: '🆔 Lấy Telegram ID', callback_data: 'SHOW_ID' }],
      ],
    },
    token
  );
  return { status: 'unrecognized' };
}
