import { NextResponse } from 'next/server';
import { sanitizePlainText } from '@/lib/security-sanitize';
import { getSessionUser } from '@/lib/session-auth';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { findDbOrderByCode, updateDbOrderFields } from '@/lib/db-persistence';
import { getTelegramBotConfig } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập tài khoản đã đặt hàng để gửi yêu cầu bảo hành.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const orderCode = sanitizePlainText(body.orderCode || body.order_code || '', 64).toUpperCase();
    const reason = sanitizePlainText(body.reason || '', 600);
    const customerContact = sanitizePlainText(body.customerContact || body.contact || '', 160);

    if (!orderCode) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp mã đơn hàng cần khiếu nại bảo hành.' },
        { status: 400 }
      );
    }

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng mô tả chi tiết lý do lỗi cần bảo hành (tối thiểu 5 ký tự).' },
        { status: 400 }
      );
    }

    const order = await findDbOrderByCode(orderCode);
    if (!order) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy đơn hàng #${orderCode} trong hệ thống.` },
        { status: 404 }
      );
    }

    const isAdmin = await verifyAdminRequest();
    if (!isAdmin && order.user_id !== sessionUser.id) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền gửi yêu cầu bảo hành cho đơn hàng này.' },
        { status: 403 }
      );
    }

    const warrantyDays = order.warranty_days !== undefined ? Number(order.warranty_days) : 30;
    if (warrantyDays === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Đơn hàng #${orderCode} thuộc gói Không Hỗ Trợ Bảo Hành (KBH). Không thể gửi khiếu nại.`,
        },
        { status: 400 }
      );
    }

    if (order.status !== 'completed' && order.status !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: `Đơn hàng #${orderCode} chưa được bàn giao hoàn tất nên không thể khiếu nại bảo hành.`,
        },
        { status: 400 }
      );
    }

    const orderDate = new Date(order.created_at || (order as any).createdAt || Date.now()).getTime();
    const expiryDate = orderDate + warrantyDays * 86400 * 1000;
    if (Date.now() > expiryDate) {
      return NextResponse.json(
        {
          success: false,
          error: `Đơn hàng #${orderCode} đã hết hạn bảo hành (${warrantyDays} ngày kể từ lúc mua).`,
        },
        { status: 400 }
      );
    }

    await updateDbOrderFields(orderCode, {
      warranty_claimed: true,
      warranty_claim_reason: reason,
      warranty_status: 'PENDING',
    });

    const tgCfg = await getTelegramBotConfig().catch(() => null);
    const botToken = tgCfg?.bot_token || process.env.TELEGRAM_BOT_TOKEN || process.env.SHOP_BOT_TOKEN || '';
    const chatId =
      tgCfg?.admin_id ||
      process.env.TELEGRAM_ADMIN_ID ||
      process.env.TELEGRAM_ADMIN_CHAT_ID ||
      process.env.TELEGRAM_CHAT_ID ||
      '';

    if (botToken && chatId) {
      const formatVND = (n: number) =>
        new Intl.NumberFormat('vi-VN').format(n) + ' VNĐ';

      const alertText =
`🛡️ <b>[YUKISHOPMXH - KHIẾU NẠI BẢO HÀNH KHẨN CẤP]</b>
🆔 <b>Mã đơn:</b> <code>${escapeHtml(orderCode)}</code>
📦 <b>Sản phẩm:</b> <code>${escapeHtml(order.item_name)}</code>
🏭 <b>Nguồn nhập:</b> <code>${escapeHtml(order.supplier_name || 'Kho Tổng Yuki')}</code> | Vốn: <code>${formatVND(order.cost_price || 0)}</code>
🛡️ <b>Chính sách:</b> <code>${warrantyDays} Ngày bảo hành</code>
👤 <b>Khách hàng:</b> ${escapeHtml(order.user_name || sessionUser.fullName || 'Khách Hàng')}
📬 <b>Kênh liên hệ:</b> <code>${escapeHtml(customerContact || order.delivery_contact || 'Chưa cung cấp')}</code>
⚠️ <b>Lý do lỗi khách báo:</b>
<pre>${escapeHtml(reason)}</pre>
⏰ <b>Thời gian báo:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          chat_id: chatId,
          text: alertText,
          parse_mode: 'HTML',
        }),
      }).catch((e) => console.error('[warranty] Telegram send failed:', e));
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi yêu cầu bảo hành cho đơn #${orderCode} thành công! Admin sẽ kiểm tra nguồn và hỗ trợ bạn sớm nhất.`,
      orderCode,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi xử lý khiếu nại bảo hành.' },
      { status: 500 }
    );
  }
}
