import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramAdminNotification, TelegramNotificationPayload } from '@/lib/telegram/bot';
import { verifyAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { transactionType, orderId, itemDetails, amount, customerName, customerContact, metadata } = body;

    if (!transactionType || !orderId || amount === undefined) {
      return NextResponse.json(
        {
          error: 'MISSING_FIELDS',
          message: 'Thiếu thông tin giao dịch bắt buộc (transactionType, orderId, amount).',
        },
        { status: 400 }
      );
    }

    const payload: TelegramNotificationPayload = {
      transactionType,
      orderId,
      itemDetails: itemDetails || 'Chi tiết giao dịch',
      amount: Number(amount),
      customerName: customerName || 'Khách hàng',
      customerContact: customerContact || 'Không có',
      metadata,
    };

    const result = await sendTelegramAdminNotification(payload);

    return NextResponse.json({
      success: true,
      telegramDispatched: result.success,
      telegramError: result.error,
      orderId,
    });
  } catch (err: any) {
    console.error('Telegram notification endpoint error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Lỗi gửi thông báo Telegram',
      },
      { status: 500 }
    );
  }
}
