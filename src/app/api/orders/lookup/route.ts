import { NextRequest, NextResponse } from 'next/server';
import { sanitizePlainText } from '@/lib/security-sanitize';
import { findDbOrderByCode, findDbUserByIdOrIdentifier } from '@/lib/db-persistence';
import { getSessionUser } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

function normalizeContact(value?: string | null): string {
  return sanitizePlainText(value, 160)
    .toLowerCase()
    .replace(/^@/, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderCode = sanitizePlainText(body.orderCode || body.order_code || '', 64).toUpperCase();
    const contact = normalizeContact(body.contact || body.email || '');

    if (!orderCode || !contact) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ Mã đơn hàng và Email / Telegram / SĐT đã đặt.' },
        { status: 400 }
      );
    }

    const order = await findDbOrderByCode(orderCode);
    if (!order) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng khớp với mã đơn và thông tin liên hệ.' },
        { status: 404 }
      );
    }

    const owner = order.user_id && order.user_id !== 'anonymous'
      ? await findDbUserByIdOrIdentifier(order.user_id)
      : null;

    const candidates = [
      order.user_contact,
      order.delivery_contact,
      order.telegram_id,
      order.zalo_phone,
      owner?.email,
      owner?.phone,
      owner?.telegramId,
      owner?.username,
    ]
      .map(normalizeContact)
      .filter(Boolean);

    const matched = candidates.some((c) => c === contact);
    if (!matched) {
      return NextResponse.json(
        { error: 'Không tìm thấy đơn hàng khớp với mã đơn và thông tin liên hệ.' },
        { status: 404 }
      );
    }

    const sessionUser = await getSessionUser().catch(() => null);
    const canViewSensitiveDelivery = Boolean(
      sessionUser &&
        (String(sessionUser.role || '').toLowerCase() === 'admin' ||
          sessionUser.id === order.user_id)
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order.id || order.order_code,
        order_code: order.order_code,
        service_type: order.service_type,
        item_name: order.item_name,
        sku: order.sku,
        quantity: order.quantity,
        total_amount: order.total_amount,
        status: order.status,
        warranty_days: order.warranty_days,
        warranty_status: order.warranty_status,
        delivery_info: canViewSensitiveDelivery
          ? order.delivery_info
          : order.delivery_info
          ? 'Đã bàn giao — Đăng nhập đúng tài khoản đặt hàng để xem chi tiết.'
          : undefined,
        notes: order.notes,
        cashback_awarded: order.cashback_awarded || 0,
        created_at: order.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi tra cứu đơn hàng.' }, { status: 500 });
  }
}
