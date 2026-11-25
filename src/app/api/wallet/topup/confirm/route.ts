import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import { getTelegramBotConfig } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để xác nhận giao dịch.' } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const referenceCode = String(body.referenceCode || body.code || body.orderId || '')
      .trim()
      .replace(/[^A-Za-z0-9_-]/g, '');

    if (!referenceCode) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_REF', message: 'Thiếu mã đơn nạp tiền.' } },
        { status: 400 }
      );
    }

    await ensureDatabaseReady().catch(() => {});

    const topups = serverStore.loadTopups();
    const topup = topups.find((t) => t.code === referenceCode || t.id === referenceCode);
    const orders = serverStore.loadOrders();
    const order = orders.find((o) => o.order_code === referenceCode || o.id === referenceCode);

    let dbOrder: any = null;
    let dbDeposit: any = null;

    try {
      const pgOrd = await queryPostgres(
        `SELECT * FROM public.orders WHERE order_code = $1 OR id = $1 LIMIT 1`,
        [referenceCode]
      );
      if (pgOrd?.rows?.[0]) dbOrder = pgOrd.rows[0];
      const pgDep = await queryPostgres(
        `SELECT * FROM public.deposit_requests WHERE request_code = $1 OR transfer_code = $1 OR id = $1 LIMIT 1`,
        [referenceCode]
      );
      if (pgDep?.rows?.[0]) dbDeposit = pgDep.rows[0];
    } catch {}

    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin && (!dbOrder || !dbDeposit)) {
      try {
        if (!dbOrder) {
          const { data: oData } = await sbAdmin.from('orders').select('*').eq('order_code', referenceCode).maybeSingle();
          dbOrder = oData;
        }
        if (!dbDeposit) {
          const { data: dData } = await sbAdmin.from('deposit_requests').select('*').eq('request_code', referenceCode).maybeSingle();
          dbDeposit = dData;
        }
      } catch {}
    }

    const effective = dbDeposit || dbOrder || topup || order;
    if (!effective) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy đơn nạp tiền hợp lệ.' } },
        { status: 404 }
      );
    }

    const isAdmin = await verifyAdminRequest();
    if (effective.user_id && effective.user_id !== currentUser.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xác nhận đơn nạp này.' } },
        { status: 403 }
      );
    }

    if (
      order?.status === 'completed' ||
      topup?.status === 'approved' ||
      dbOrder?.status === 'completed' ||
      dbDeposit?.status === 'approved' ||
      dbDeposit?.status === 'completed'
    ) {
      return NextResponse.json({
        success: true,
        alreadyApproved: true,
        message: 'Đơn này đã được hệ thống tự động duyệt và cộng tiền vào ví rồi!',
      });
    }

    const isAlreadyNotified = Boolean(
      topup?.telegram_notified ||
        order?.telegram_notified ||
        dbOrder?.telegram_notified ||
        dbDeposit?.telegram_notified
    );

    if (isAlreadyNotified) {
      return NextResponse.json({
        success: true,
        alreadyNotified: true,
        message: 'Đã gửi yêu cầu xác nhận trước đó, vui lòng chờ Admin duyệt!',
      });
    }

    const nowISO = new Date().toISOString();
    if (topup) {
      topup.telegram_notified = true;
      topup.updated_at = nowISO;
      serverStore.saveTopups(topups);
    }
    if (order) {
      order.telegram_notified = true;
      order.updated_at = nowISO;
      serverStore.saveOrders(orders);
    }

    try {
      await queryPostgres(
        `UPDATE public.deposit_requests SET telegram_notified = true, updated_at = NOW()
         WHERE request_code = $1 OR transfer_code = $1 OR id = $1`,
        [referenceCode]
      );
      await queryPostgres(
        `UPDATE public.orders SET telegram_notified = true, updated_at = NOW()
         WHERE order_code = $1 OR id = $1`,
        [referenceCode]
      );
    } catch {}

    if (sbAdmin) {
      try {
        await sbAdmin.from('deposit_requests').update({ telegram_notified: true, updated_at: nowISO }).eq('request_code', referenceCode);
        await sbAdmin.from('orders').update({ telegram_notified: true, updated_at: nowISO }).eq('order_code', referenceCode);
      } catch {}
    }

    const depositAmount = Number(
      dbDeposit?.amount ?? dbOrder?.total_amount ?? topup?.amount ?? order?.total_amount ?? 0
    );

    const customerName =
      currentUser.fullName || currentUser.username || dbDeposit?.user_name || topup?.user_name || order?.user_name || 'Thành Viên';
    const customerContact =
      currentUser.telegramId || currentUser.phone || currentUser.email || dbDeposit?.user_contact || topup?.user_contact || order?.delivery_contact || 'Chưa cập nhật';

    try {
      const botCfg = await getTelegramBotConfig();
      const botToken = botCfg.bot_token || process.env.TELEGRAM_BOT_TOKEN || process.env.SHOP_BOT_TOKEN || '';
      const adminChatId =
        botCfg.admin_id || process.env.TELEGRAM_ADMIN_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';

      if (botToken && adminChatId) {
        const text =
`⚡ <b>[YUKISHOPMXH — KHÁCH BÁO ĐÃ NẠP TIỀN]</b>
🆔 <b>Mã Đơn Nạp:</b> <code>${esc(referenceCode)}</code>
👤 <b>Khách Hàng:</b> ${esc(customerName)}
💰 <b>Số Tiền:</b> <b>${new Intl.NumberFormat('vi-VN').format(depositAmount)} VNĐ</b>
📬 <b>Liên Hệ:</b> <code>${esc(customerContact)}</code>
🏦 <b>Phương Thức:</b> ZaloPay VietQR (STK: <code>99ZP26265M78019191</code>)
⏳ <b>Trạng Thái:</b> 🟡 Đang chờ duyệt
⏰ <b>Thời Gian:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}

<i>Khách đã chuyển khoản và bấm xác nhận trên web. Bấm duyệt nếu Auto chưa khớp:</i>`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            chat_id: adminChatId,
            text,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Duyệt Nạp & Cộng Tiền', callback_data: `topup_ok:${referenceCode}` },
                  { text: '❌ Từ Chối', callback_data: `topup_no:${referenceCode}` },
                ],
              ],
            },
          }),
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        referenceCode,
        status: 'pending',
        message: 'Đã gửi yêu cầu xác nhận. Vui lòng chờ Admin duyệt!',
      },
      timestamp: nowISO,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
