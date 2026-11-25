import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramAdminNotification } from '@/lib/telegram/bot';
import { verifyAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ==============================================================================
// YUKISHOPMXH — ADMIN TELEGRAM BOT TEST API ENDPOINT
// ==============================================================================

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '8960751162';
    const testOrderId = `TEST-BOT-${Date.now().toString().slice(-6)}`;

    const result = await sendTelegramAdminNotification({
      transactionType: 'TEST_BOT',
      orderId: testOrderId,
      itemDetails: 'Kiểm tra đường truyền Bot Thông Báo Shop tới Admin Chat ID: 8960751162',
      amount: 0,
      customerName: 'Admin',
      customerContact: `Admin Chat ID ${adminChatId}`,
      metadata: {
        serverTimestamp: new Date().toISOString(),
        testEnvironment: process.env.NODE_ENV || 'production',
      },
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: `Gửi test bot thất bại: ${result.error}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipientChatId: result.recipientChatId,
      message: `Đã gửi thành công tin nhắn kiểm thử tới Telegram Admin (${adminChatId})! Tin nhắn ID: ${result.messageId}`,
    });
  } catch (err: any) {
    console.error('Test bot API error:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
