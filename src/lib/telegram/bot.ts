// ==============================================================================
// YUKISHOPMXH — TELEGRAM BOT NOTIFICATION SERVICE (PRODUCTION SERVER-SIDE)
// ==============================================================================

import { getTelegramBotConfig } from '@/lib/system-settings';

export interface TelegramNotificationPayload {
  transactionType: 'MUA_SAN_PHAM' | 'BUFF_MXH' | 'NAP_VI' | 'TEST_BOT';
  orderId: string;
  itemDetails: string;
  amount: number;
  customerName: string;
  customerContact: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export function getTelegramConfig() {
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.NOTIFY_BOT_TOKEN ||
    '';
  const chatId =
    process.env.TELEGRAM_ADMIN_CHAT_ID ||
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TELEGRAM_ADMIN_ID ||
    process.env.ADMIN_TELEGRAM_ID ||
    '8960751162';
  return { token, chatId, adminId: chatId };
}

export async function sendTelegramAdminNotification(payload: TelegramNotificationPayload): Promise<{
  success: boolean;
  messageId?: number;
  error?: string;
  recipientChatId?: string;
}> {
  const dynamicCfg = await getTelegramBotConfig().catch(() => null);
  const token = dynamicCfg?.bot_token || getTelegramConfig().token;
  const chatId = dynamicCfg?.admin_id || getTelegramConfig().chatId;
  const adminId = chatId;

  let lastError: string | null = null;

  if (!token || !chatId) {
    console.warn('[TelegramBot] Token or Chat ID not configured');
    return { success: false, error: 'CONFIG_MISSING' };
  }

  const formatVND = (amt: number) => {
    return new Intl.NumberFormat('vi-VN').format(amt) + ' VNĐ';
  };

  const typeLabels: Record<string, string> = {
    MUA_SAN_PHAM: 'Mua Sản Phẩm Bản Quyền / AI API',
    BUFF_MXH: 'Thuê Dịch Vụ Buff Tương Tác MXH',
    NAP_VI: 'Nạp Tiền Ví ZaloPay QR (VietQR)',
    TEST_BOT: '🧪 Thử Nghiệm Kết Nối Bot (Admin Test)',
  };

  const now = payload.timestamp || new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const esc = (t: any) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const typeTag = payload.transactionType === 'NAP_VI' ? 'topup' : 'order';

  const text = 
`🔔 <b>[YUKISHOPMXH - THÔNG BÁO GIAO DỊCH MỚI]</b>
📌 <b>Loại giao dịch:</b> ${esc(typeLabels[payload.transactionType] || payload.transactionType)}
🆔 <b>Mã đơn hàng:</b> <code>${esc(payload.orderId)}</code>
📦 <b>Sản phẩm / Dịch vụ:</b> ${esc(payload.itemDetails)}
💰 <b>Giá thành / Số tiền:</b> <b>${formatVND(payload.amount)}</b>
👤 <b>Khách hàng:</b> ${esc(payload.customerName || 'Khách vãng lai')}
📬 <b>Kênh nhận hàng (Tele/Zalo/Gmail):</b> <b>${esc(payload.customerContact || 'Chưa cập nhật')}</b>
⏰ <b>Thời gian:</b> ${now}`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ Duyệt đơn', callback_data: `ord_ok:${payload.orderId}` },
        { text: '❌ Từ chối', callback_data: `ord_no:${payload.orderId}` },
      ],
      [
        { text: '⚠️ Giao trực tiếp (Liên hệ Admin)', callback_data: `deliv_none:${payload.orderId}` },
      ],
    ],
  };

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        chat_id: adminId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      lastError = data.description || 'TELEGRAM_ERROR';
      console.error('[TelegramBot] API Error:', data);
      return { success: false, error: lastError || undefined, recipientChatId: adminId };
    }

    return { 
      success: true, 
      messageId: data.result?.message_id,
      recipientChatId: adminId 
    };
  } catch (err: any) {
    lastError = err.message || 'Lỗi mạng khi gọi Telegram API';
    console.error('[TelegramBot] Request exception:', lastError);
    return { success: false, error: lastError || undefined, recipientChatId: adminId };
  }
}

export interface TelegramWithdrawalPayload {
  withdrawalId: string;
  userId: string;
  userName: string;
  amount: number;
  fee: number;
  netAmount: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  contact?: string;
  qrCodeUrl?: string;
  timestamp?: string;
}

export async function sendTelegramWithdrawalNotification(payload: TelegramWithdrawalPayload): Promise<{
  success: boolean;
  messageId?: number;
  error?: string;
}> {
  const dynamicCfg = await getTelegramBotConfig().catch(() => null);
  const token = dynamicCfg?.bot_token || getTelegramConfig().token;
  const chatId = dynamicCfg?.admin_id || getTelegramConfig().chatId;

  if (!token || !chatId) {
    console.warn('[TelegramBot] Token or Chat ID not configured for withdrawal');
    return { success: false, error: 'CONFIG_MISSING' };
  }

  const formatVND = (amt: number) => new Intl.NumberFormat('vi-VN').format(amt) + 'đ';
  const esc = (t: any) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const now = payload.timestamp || new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const text =
`💸 <b>[YUKISHOPMXH - YÊU CẦU RÚT HOA HỒNG CTV]</b>
🆔 <b>Mã yêu cầu:</b> <code>${esc(payload.withdrawalId)}</code>
👤 <b>Khách hàng:</b> <b>${esc(payload.userName)}</b> (ID: <code>${esc(payload.userId)}</code>)
📞 <b>Liên hệ:</b> <b>${esc(payload.contact || 'Chưa cập nhật')}</b>
━━━━━━━━━━━━━━━━━━━━
💰 <b>Số tiền rút:</b> <b>${formatVND(payload.amount)}</b>
🏷️ <b>Phí giao dịch:</b> <b>${formatVND(payload.fee)}</b>
💵 <b>THỰC NHẬN:</b> <b>${formatVND(payload.netAmount)}</b>
━━━━━━━━━━━━━━━━━━━━
🏦 <b>Ngân hàng / Ví:</b> <b>${esc(payload.bankName)}</b>
💳 <b>Số tài khoản / SĐT ví:</b> <code>${esc(payload.bankAccount)}</code>
🧾 <b>Tên chủ tài khoản:</b> <b>${esc(payload.accountHolder)}</b>
⏰ <b>Thời gian:</b> ${now}`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ Duyệt Rút Tiền', callback_data: `wd_ok:${payload.withdrawalId}` },
        { text: '❌ Từ Chối & Hoàn Tiền', callback_data: `wd_no:${payload.withdrawalId}` },
      ],
    ],
  };

  try {
    // 1. If QR code is provided as a Base64 data URL, upload as file Blob via FormData to sendPhoto
    if (payload.qrCodeUrl && payload.qrCodeUrl.startsWith('data:image/')) {
      try {
        const base64Match = payload.qrCodeUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1] || 'image/png';
          const base64Data = base64Match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const blob = new Blob([buffer], { type: mimeType });

          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('photo', blob, 'payout_qr.png');
          formData.append('caption', text);
          formData.append('parse_mode', 'HTML');
          formData.append('reply_markup', JSON.stringify(inlineKeyboard));

          const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
            body: formData,
          });
          const photoData = await photoRes.json();
          if (photoData && photoData.ok) {
            return { success: true, messageId: photoData.result?.message_id };
          }
        }
      } catch (base64Err) {
        console.warn('[TelegramBot] sendPhoto with base64 failed, falling back:', base64Err);
      }
    }

    // 2. If QR code is provided as a public HTTP/HTTPS URL, send URL directly
    if (payload.qrCodeUrl && (payload.qrCodeUrl.startsWith('http://') || payload.qrCodeUrl.startsWith('https://'))) {
      try {
        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            chat_id: chatId,
            photo: payload.qrCodeUrl,
            caption: text,
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard,
          }),
        });
        const photoData = await photoRes.json();
        if (photoData.ok) {
          return { success: true, messageId: photoData.result?.message_id };
        }
      } catch (photoErr) {
        console.warn('[TelegramBot] sendPhoto failed, falling back to sendMessage:', photoErr);
      }
    }

    // 3. Fallback: sendMessage with HTML formatted receipt
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || 'TELEGRAM_ERROR' };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    return { success: false, error: err.message || 'NET_ERROR' };
  }
}
