import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramAdminNotification, getTelegramConfig } from '@/lib/telegram/bot';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getTelegramBotConfig } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const dynamicCfg = await getTelegramBotConfig().catch(() => null);
    const token = dynamicCfg?.bot_token || getTelegramConfig().token;
    const chatId = dynamicCfg?.admin_id || getTelegramConfig().chatId;
    const testOrderId = `TEST-TG-${Date.now().toString().slice(-6)}`;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Chưa cấu hình TELEGRAM_BOT_TOKEN (hoặc BOT_TOKEN / NOTIFY_BOT_TOKEN) trên Vercel/môi trường.',
      }, { status: 400 });
    }

    const result = await sendTelegramAdminNotification({
      transactionType: 'TEST_BOT',
      orderId: testOrderId,
      itemDetails: 'Kiểm tra đường truyền Bot YukiShopMXH tới Admin Telegram ID: ' + chatId,
      amount: 0,
      customerName: 'Admin Yuki',
      customerContact: `Chat ID: ${chatId}`,
      metadata: {
        serverTimestamp: new Date().toISOString(),
        testEnvironment: process.env.NODE_ENV || 'production',
      },
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: `Gửi tin nhắn Telegram thất bại: ${result.error}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipientChatId: result.recipientChatId,
      message: `Đã gửi thành công tin nhắn kiểm thử tới Telegram Admin (${chatId})! Tin nhắn ID: ${result.messageId}`,
    });
  } catch (err: any) {
    console.error('Test telegram API error:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
