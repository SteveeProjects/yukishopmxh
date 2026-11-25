import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adjustUserBalance } from '@/lib/wallet-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const orders = serverStore.loadOrders();
    const warrantyClaims = orders
      .filter((o) => o.warranty_claimed || o.warranty_status)
      .map((o) => {
        const warrantyDays = o.warranty_days !== undefined ? Number(o.warranty_days) : 30;
        const createdMs = new Date(o.created_at).getTime();
        const expiryMs = createdMs + warrantyDays * 86400 * 1000;
        return {
          ...o,
          warranty_days: warrantyDays,
          warranty_expires_at: new Date(expiryMs).toISOString(),
          warranty_status: o.warranty_status || (o.warranty_claimed ? 'PENDING' : 'PENDING'),
        };
      })
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

    return NextResponse.json({
      success: true,
      claims: warrantyClaims,
      pendingCount: warrantyClaims.filter((c) => c.warranty_status === 'PENDING' && c.warranty_claimed).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi tải danh sách bảo hành.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const orderCode = String(body.orderCode || body.order_code || '').trim();
    const action = String(body.action || '').toLowerCase(); // 'replace' | 'refund' | 'reject'
    const newDeliveryInfo = String(body.newDeliveryInfo || body.delivery_info || '').trim();
    const note = String(body.note || body.reason || '').trim();

    if (!orderCode || !['replace', 'refund', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Thiếu mã đơn hàng hoặc hành động bảo hành hợp lệ.' }, { status: 400 });
    }

    const order = serverStore.findOrderByCode(orderCode);
    if (!order) {
      return NextResponse.json({ error: `Không tìm thấy đơn hàng #${orderCode}.` }, { status: 404 });
    }

    const nowISO = new Date().toISOString();

    if (action === 'replace') {
      if (!newDeliveryInfo) {
        return NextResponse.json({ error: 'Vui lòng nhập tài khoản hoặc key đổi mới để bàn giao.' }, { status: 400 });
      }
      const updated = serverStore.updateOrderStatus(orderCode, 'completed', {
        delivery_info: newDeliveryInfo,
        warranty_claimed: false,
        warranty_status: 'RESOLVED_REPLACED',
        warranty_resolution_note: note || 'Đã đổi tài khoản bảo hành mới.',
        warranty_resolved_at: nowISO,
      });

      try {
        const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
        if (!isPlaceholder && supabaseAdmin) {
          await supabaseAdmin
            .from('orders')
            .update({ updated_at: nowISO })
            .or(`order_code.eq.${orderCode},id.eq.${orderCode}`);
        }
      } catch {}

      // Notify user on Telegram if numeric telegram_id exists
      const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
      const userTg = String(order.telegram_id || '').trim();
      if (botToken && /^\d{5,15}$/.test(userTg)) {
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userTg,
            parse_mode: 'HTML',
            text: `<b>[BẢO HÀNH HOÀN TẤT — ĐƠN #${orderCode}]</b>\nThông tin tài khoản đổi mới của bạn:\n<code>${newDeliveryInfo}</code>`,
          }),
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Đã đổi tài khoản mới cho đơn #${orderCode}.`,
        claim: updated,
      });
    }

    if (action === 'refund') {
      if (order.refunded || order.warranty_status === 'RESOLVED_REFUNDED') {
        return NextResponse.json({ error: `Đơn #${orderCode} đã được hoàn tiền trước đó.` }, { status: 409 });
      }
      const refundAmount = Number(order.total_amount || 0);
      let balanceResult: { previousBalance: number; newBalance: number } | null = null;

      if (refundAmount > 0 && order.user_id && order.user_id !== 'anonymous') {
        balanceResult = await adjustUserBalance({
          userId: order.user_id,
          delta: refundAmount,
          type: 'REFUND',
          referenceId: orderCode,
          description: `Hoàn tiền bảo hành đơn #${orderCode}`,
        });
      }

      const updated = serverStore.updateOrderStatus(orderCode, 'cancelled', {
        refunded: true,
        warranty_claimed: false,
        warranty_status: 'RESOLVED_REFUNDED',
        warranty_resolution_note: note || `Đã hoàn ${new Intl.NumberFormat('vi-VN').format(refundAmount)}đ về ví.`,
        warranty_resolved_at: nowISO,
      });

      return NextResponse.json({
        success: true,
        message: `Đã hoàn ${new Intl.NumberFormat('vi-VN').format(refundAmount)}đ về ví khách cho đơn #${orderCode}.`,
        claim: updated,
        balanceResult,
      });
    }

    // reject
    const updated = serverStore.updateOrderStatus(orderCode, order.status, {
      warranty_claimed: false,
      warranty_status: 'REJECTED',
      warranty_resolution_note: note || 'Không đủ điều kiện bảo hành theo quy định gói.',
      warranty_resolved_at: nowISO,
    });

    return NextResponse.json({
      success: true,
      message: `Đã từ chối yêu cầu bảo hành đơn #${orderCode}.`,
      claim: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xử lý bảo hành.' }, { status: 500 });
  }
}
