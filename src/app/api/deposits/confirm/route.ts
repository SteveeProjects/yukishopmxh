import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables } from '@/lib/db';
import { serverStore } from '@/lib/server-store';
import { getTelegramBotConfig, isSupabaseConfigured } from '@/lib/system-settings';
import { getSessionUser } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập trước khi xác nhận chuyển khoản.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const referenceCode = String(
      body.referenceCode || body.transfer_code || body.code || body.orderId || ''
    )
      .trim()
      .replace(/[^A-Za-z0-9_-]/g, '');

    if (!referenceCode) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã tham chiếu giao dịch chuyển khoản.' },
        { status: 400 }
      );
    }

    await autoEnsureTables().catch(() => {});

    let existingTopup: any = null;

    try {
      const pgRes = await queryPostgres(
        `SELECT * FROM public.deposit_requests
         WHERE request_code = $1 OR transfer_code = $1 OR transfer_content = $1 OR id = $1
         LIMIT 1`,
        [referenceCode]
      );
      if (pgRes?.rows?.[0]) existingTopup = pgRes.rows[0];
    } catch {}

    const sbAdmin = getSupabaseAdmin();
    if (!existingTopup && isSupabaseConfigured() && sbAdmin) {
      try {
        const { data: byReq } = await sbAdmin
          .from('deposit_requests')
          .select('*')
          .eq('request_code', referenceCode)
          .maybeSingle();
        if (byReq) {
          existingTopup = byReq;
        } else {
          const { data: byTrf } = await sbAdmin
            .from('deposit_requests')
            .select('*')
            .eq('transfer_code', referenceCode)
            .maybeSingle();
          if (byTrf) existingTopup = byTrf;
        }
      } catch (e) {
        console.warn('[deposits/confirm] DB topup lookup notice:', e);
      }
    }

    if (!existingTopup) {
      const localTopups = serverStore.loadTopups();
      existingTopup = localTopups.find((t) => t.code === referenceCode || t.id === referenceCode) || null;
    }

    if (!existingTopup) {
      return NextResponse.json(
        {
          success: false,
          error: 'Không tìm thấy đơn nạp tiền hợp lệ. Vui lòng tạo mã VietQR mới trước khi xác nhận.',
        },
        { status: 404 }
      );
    }

    const isAdmin = String(currentUser.role || '').toLowerCase() === 'admin';
    if (existingTopup.user_id && existingTopup.user_id !== currentUser.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền xác nhận đơn nạp tiền này.' },
        { status: 403 }
      );
    }

    const st = String(existingTopup.status || 'pending').toLowerCase();
    if (st === 'completed' || st === 'approved') {
      return NextResponse.json({
        success: true,
        alreadyApproved: true,
        message: 'Giao dịch này đã được hệ thống tự động duyệt trước đó!',
      });
    }
    if (st === 'rejected' || st === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Đơn nạp này đã bị hủy hoặc từ chối. Vui lòng tạo mã nạp mới.' },
        { status: 400 }
      );
    }

    const amount = Number(existingTopup.amount || 0);
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Số tiền đơn nạp không hợp lệ.' }, { status: 400 });
    }

    const alreadyNotified = Boolean(existingTopup.telegram_notified);
    if (alreadyNotified) {
      return NextResponse.json({
        success: true,
        alreadyNotified: true,
        message: 'Đã gửi yêu cầu xác nhận trước đó. Vui lòng chờ Admin duyệt hoặc hệ thống Auto khớp tiền!',
      });
    }

    const nowISO = new Date().toISOString();
    const nowLocal = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

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
    } catch (pgErr) {
      console.warn('[deposits/confirm] Postgres update notice:', pgErr);
    }

    if (isSupabaseConfigured() && sbAdmin) {
      try {
        await sbAdmin
          .from('deposit_requests')
          .update({ telegram_notified: true, updated_at: nowISO })
          .eq('request_code', referenceCode);
        await sbAdmin
          .from('orders')
          .update({ telegram_notified: true, updated_at: nowISO })
          .eq('order_code', referenceCode);
      } catch (sbErr) {
        console.warn('[deposits/confirm] Supabase sync notice:', sbErr);
      }
    }

    try {
      const topups = serverStore.loadTopups();
      const idx = topups.findIndex((t) => t.code === referenceCode || t.id === referenceCode);
      if (idx >= 0) {
        topups[idx].telegram_notified = true;
        topups[idx].updated_at = nowISO;
        serverStore.saveTopups(topups);
      }
      const orders = serverStore.loadOrders();
      const oIdx = orders.findIndex((o) => o.order_code === referenceCode || o.id === referenceCode);
      if (oIdx >= 0) {
        orders[oIdx].telegram_notified = true;
        orders[oIdx].updated_at = nowISO;
        serverStore.saveOrders(orders);
      }
    } catch {}

    const userName = currentUser.fullName || currentUser.username || existingTopup.user_name || 'Khách Hàng';
    const userContact =
      currentUser.telegramId || currentUser.phone || currentUser.email || existingTopup.user_contact || 'Chưa cập nhật';

    const tgCfg = await getTelegramBotConfig().catch(() => null);
    const botToken = tgCfg?.bot_token || process.env.TELEGRAM_BOT_TOKEN || process.env.SHOP_BOT_TOKEN || '';
    const adminChatId =
      tgCfg?.admin_id || process.env.TELEGRAM_ADMIN_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';

    if (botToken && adminChatId) {
      const alertText =
        `💸 <b>[YUKISHOPMXH — KHÁCH BÁO ĐÃ CHUYỂN KHOẢN]</b>\n` +
        `🆔 <b>Mã đơn nạp:</b> <code>${escapeHtml(referenceCode)}</code>\n` +
        `👤 <b>Khách hàng:</b> ${escapeHtml(userName)}\n` +
        `📞 <b>Liên hệ:</b> <code>${escapeHtml(userContact)}</code>\n` +
        `💰 <b>Số tiền:</b> <b>+${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ</b>\n` +
        `🏦 <b>Kênh:</b> ZaloPay VietQR\n` +
        `⏰ <b>Thời gian:</b> ${escapeHtml(nowLocal)}`;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            chat_id: adminChatId,
            text: alertText,
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
        });
      } catch (tgErr) {
        console.error('[deposits/confirm] Telegram error:', tgErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã ghi nhận yêu cầu! Hệ thống MacroDroid tự động sẽ cộng tiền sau vài giây hoặc Admin sẽ duyệt ngay.',
      referenceCode,
      amount,
    });
  } catch (err: any) {
    console.error('[deposits/confirm] Fatal error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
