import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { adjustUserBalance } from '@/lib/wallet-service';
import { distributeAffiliateCommission } from '@/lib/affiliate-service';
import { awardOrderCashback } from '@/lib/cashback-service';
import { ensureDatabaseReady, isDatabaseConfigured, queryPostgres } from '@/lib/autoMigrate';
import { getTelegramBotConfig } from '@/lib/system-settings';
import { isUuid } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_ACTIONS = new Set([
  'approve',
  'approve_deliver',
  'approve_upgraded',
  'processing',
  'reject',
]);

async function sendCustomerOrderTelegram(targetTgRaw: unknown, text: string) {
  try {
    const tgCfg = await getTelegramBotConfig();
    const botToken = tgCfg.bot_token || process.env.TELEGRAM_BOT_TOKEN || process.env.SHOP_BOT_TOKEN || '';
    const targetTg = String(targetTgRaw || '').trim().replace(/^@/, '');
    if (!botToken || !/^\d{5,15}$/.test(targetTg)) return;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        chat_id: targetTg,
        parse_mode: 'HTML',
        text,
      }),
    });
  } catch {}
}

export async function POST(req: Request) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.orderId || body.code || body.id || body.orderCode || '').trim();
    const action = String(body.action || '').toLowerCase();
    const type = String(body.type || '').toLowerCase();
    const deliveryInfo = String(body.deliveryInfo || body.delivery_info || '').trim();
    const adminNote = String(body.adminNote || body.admin_note || '').trim();

    if (!code || !VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Thiếu mã đơn hoặc hành động xử lý không hợp lệ.' }, { status: 400 });
    }
    if (action === 'approve_deliver' && !deliveryInfo) {
      return NextResponse.json(
        { error: 'Vui lòng nhập thông tin TK / MK / Key / Ghi chú bàn giao trước khi duyệt giao hàng.' },
        { status: 400 }
      );
    }

    await ensureDatabaseReady().catch(() => {});

    const isTopupCode =
      /^YUKISP_/i.test(code) || code.startsWith('tp_') || code.startsWith('DEP-');

    // 1. Check in serverStore.orders & topups
    const orders = serverStore.loadOrders();
    const localOrder = orders.find((o) => o.order_code === code || o.id === code);

    const topups = serverStore.loadTopups();
    const localTopup = topups.find((t) => t.code === code || t.id === code);

    // 2. Check in PostgreSQL (safe id::text casts)
    let pgOrder: any = null;
    let pgDeposit: any = null;
    try {
      const resO = await queryPostgres(
        `SELECT * FROM public.orders WHERE order_code = $1 OR id::text = $1 LIMIT 1`,
        [code]
      );
      if (resO?.rows?.length > 0) pgOrder = resO.rows[0];

      const resD = await queryPostgres(
        `SELECT * FROM public.deposit_requests WHERE request_code = $1 OR transfer_code = $1 OR id::text = $1 LIMIT 1`,
        [code]
      );
      if (resD?.rows?.length > 0) pgDeposit = resD.rows[0];
    } catch {}

    // 3. Check in Supabase via SERVICE ROLE KEY (no non-UUID id filter errors)
    let dbOrder: any = null;
    let dbTopup: any = null;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        if (!localOrder && !pgOrder) {
          let { data } = await supabaseAdmin.from('orders').select('*').eq('order_code', code).maybeSingle();
          if (!data && isUuid(code)) {
            const byId = await supabaseAdmin.from('orders').select('*').eq('id', code).maybeSingle();
            data = byId.data;
          }
          dbOrder = data;
        }
        if (!localTopup && !pgDeposit && (isTopupCode || type === 'topup')) {
          let { data: depData } = await (supabaseAdmin as any)
            .from('deposit_requests')
            .select('*')
            .eq('request_code', code)
            .maybeSingle();
          if (!depData && isUuid(code)) {
            const byId = await (supabaseAdmin as any).from('deposit_requests').select('*').eq('id', code).maybeSingle();
            depData = byId.data;
          }
          if (depData) {
            dbTopup = depData;
          } else {
            const { data } = await (supabaseAdmin as any)
              .from('topup_requests')
              .select('*')
              .eq('reference_code', code)
              .maybeSingle();
            dbTopup = data;
          }
        }
      }
    } catch (e) {
      console.warn('[orders/action] Supabase query notice:', e);
    }

    const effectiveItem = pgOrder || pgDeposit || dbOrder || dbTopup || localOrder || localTopup;
    if (!effectiveItem) {
      return NextResponse.json({ error: `Không tìm thấy đơn hàng hoặc đơn nạp #${code}` }, { status: 404 });
    }

    const currentStatus = String(
      effectiveItem.status || (effectiveItem as any).state || 'pending'
    ).toLowerCase();

    // Anti-duplicate terminal state guard ('processing' is still editable until completed/cancelled)
    if (['approved', 'completed', 'cancelled', 'rejected'].includes(currentStatus)) {
      return NextResponse.json({ error: 'Đơn này đã được xử lý hoàn tất/hủy trước đó!' }, { status: 409 });
    }

    const isDeposit =
      isTopupCode ||
      type === 'topup' ||
      effectiveItem.order_type === 'DEPOSIT' ||
      effectiveItem.order_type === 'NAP_VI' ||
      effectiveItem.service_type === 'DEPOSIT' ||
      effectiveItem.service_type === 'NAP_VI' ||
      effectiveItem.product_sku === 'TOPUP-VIETQR' ||
      (effectiveItem.item_name && /nạp\s*(tiền\s*)?ví/i.test(effectiveItem.item_name));

    if (action === 'processing') {
      if (isDeposit) {
        return NextResponse.json({ error: 'Đơn nạp ví không hỗ trợ trạng thái xin 2FA.' }, { status: 400 });
      }
      const nextNote =
        adminNote ||
        '⚠️ Admin đang xử lý đơn — vui lòng gửi thêm mã 2FA / Backup Code hoặc xác nhận đăng nhập qua Telegram @YukiIsMe2311.';
      let dbOk = false;
      try {
        const pgRes = await queryPostgres(
          `UPDATE public.orders
           SET status = 'processing', approval_mode = 'awaiting_2fa', admin_note = $1, updated_at = NOW()
           WHERE (order_code = $2 OR id::text = $2) AND status IN ('pending', 'waiting_confirm', 'processing')`,
          [nextNote, code]
        );
        if (pgRes !== null) dbOk = true;
      } catch {}

      try {
        const supabaseAdmin = getSupabaseAdmin();
        if (supabaseAdmin) {
          const { error } = await supabaseAdmin
            .from('orders')
            .update({
              status: 'processing',
              approval_mode: 'awaiting_2fa',
              admin_note: nextNote,
              updated_at: new Date().toISOString(),
            })
            .eq('order_code', code);
          if (!error) dbOk = true;
        }
      } catch {}

      if (isDatabaseConfigured() && !dbOk) {
        return NextResponse.json({ error: 'Không thể cập nhật trạng thái đơn vào Database.' }, { status: 500 });
      }

      serverStore.updateOrderStatus(code, 'processing', { admin_note: nextNote, approval_mode: 'awaiting_2fa' });
      await sendCustomerOrderTelegram(
        effectiveItem.telegram_id,
        `⏳ <b>[YUKISHOPMXH — ĐƠN #${code} CẦN BỔ SUNG XÁC MINH]</b>\n` +
          `Gói: <b>${effectiveItem.item_name || ''}</b>\n` +
          `📌 <b>Lời nhắn Admin:</b> ${nextNote}\n👉 Nhắn ngay @YukiIsMe2311 để được kích hoạt nhanh nhất.`
      );

      return NextResponse.json({
        success: true,
        status: 'processing',
        admin_note: nextNote,
        message: `Đã chuyển đơn #${code} sang trạng thái Đang xử lý / Xin thêm 2FA!`,
      });
    }

    if (action === 'approve' || action === 'approve_deliver' || action === 'approve_upgraded') {
      if (isDeposit) {
        const depositAmount = Number(
          effectiveItem.total_amount ??
          effectiveItem.amount ??
          (effectiveItem as any).topup_amount ??
          0
        );

        if (depositAmount <= 0) {
          return NextResponse.json(
            { error: 'Số tiền nạp không hợp lệ (nhỏ hơn hoặc bằng 0).' },
            { status: 400 }
          );
        }

        let isTransitioned = false;
        try {
          const pgRes = await queryPostgres(
            `UPDATE public.deposit_requests
             SET status = 'approved', updated_at = NOW()
             WHERE (request_code = $1 OR transfer_code = $1 OR id::text = $1)
               AND status IN ('pending', 'waiting_confirm')
             RETURNING amount, user_id`,
            [code]
          );
          if (pgRes?.rows && pgRes.rows.length > 0) {
            isTransitioned = true;
          }

          const pgOrderRes = await queryPostgres(
            `UPDATE public.orders
             SET status = 'completed', updated_at = NOW()
             WHERE (order_code = $1 OR id::text = $1)
               AND status IN ('pending', 'waiting_confirm')
             RETURNING amount, user_id`,
            [code]
          );
          if (pgOrderRes?.rows && pgOrderRes.rows.length > 0) {
            isTransitioned = true;
          }
        } catch (pgErr) {
          console.warn('[orders/action] Postgres transition notice:', pgErr);
        }

        if (!isTransitioned && (pgDeposit || pgOrder)) {
          return NextResponse.json({ error: 'Đơn này đã được xử lý rồi!' }, { status: 409 });
        }

        const targetUserId = effectiveItem.user_id;
        let newBal = 0;

        if (targetUserId && targetUserId !== 'anonymous') {
          const adjustRes = await adjustUserBalance({
            userId: targetUserId,
            delta: depositAmount,
            type: 'DEPOSIT',
            referenceId: code,
            description: `Duyệt nạp tiền #${code}`,
          });
          newBal = adjustRes.newBalance;

          try {
            await distributeAffiliateCommission({
              refereeId: targetUserId,
              depositAmount,
              referenceCode: code,
            });
          } catch (affErr) {
            console.warn('[orders/action] Affiliate commission notice:', affErr);
          }
        }

        try {
          await queryPostgres(
            `UPDATE public.orders SET status = 'completed', updated_at = NOW() WHERE order_code = $1 OR id::text = $1`,
            [code]
          );
          await queryPostgres(
            `UPDATE public.deposit_requests SET status = 'approved', updated_at = NOW() WHERE request_code = $1 OR transfer_code = $1 OR id::text = $1`,
            [code]
          );
        } catch (pgErr) {
          console.warn('[orders/action] Postgres update notice:', pgErr);
        }

        serverStore.updateOrderStatus(code, 'completed');
        serverStore.updateTopupStatus(code, 'approved');

        try {
          const supabaseAdmin = getSupabaseAdmin();
          if (supabaseAdmin) {
            const { data: sbOrdClaim } = await supabaseAdmin
              .from('orders')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('order_code', code)
              .in('status', ['pending', 'waiting_confirm', 'processing'])
              .select('order_code');

            const { data: sbDepClaim } = await (supabaseAdmin as any)
              .from('deposit_requests')
              .update({ status: 'approved', updated_at: new Date().toISOString() })
              .eq('request_code', code)
              .in('status', ['pending', 'waiting_confirm'])
              .select('id');

            await (supabaseAdmin as any)
              .from('topup_requests')
              .update({ status: 'approved', updated_at: new Date().toISOString() })
              .eq('reference_code', code);

            if (!isTransitioned && !pgDeposit && !pgOrder && !(sbOrdClaim?.length || sbDepClaim?.length)) {
              // No claim succeeded when falling back to Supabase-only
              console.warn('[orders/action] Supabase deposit claim returned 0 rows:', code);
            }
          }
        } catch {}

        return NextResponse.json({
          success: true,
          message: `✅ Đã duyệt nạp +${new Intl.NumberFormat('vi-VN').format(depositAmount)} VNĐ cho đơn #${code}!`,
          balance: newBal,
          status: 'completed',
        });
      } else {
        const approvalMode =
          action === 'approve_upgraded' ? 'upgraded_family' : 'deliver_credentials';
        const effectiveDelivery =
          action === 'approve_upgraded'
            ? deliveryInfo ||
              '✅ Đã nâng cấp chính chủ / Đã gửi lời mời Family thành công! Vui lòng kiểm tra tài khoản hoặc hộp thư Gmail.'
            : deliveryInfo;

        let dbOk = false;
        try {
          const pgRes = await queryPostgres(
            `UPDATE public.orders
             SET status = 'completed',
                 approval_mode = $1,
                 delivery_info = COALESCE(NULLIF($2, ''), delivery_info),
                 delivered_data = COALESCE(NULLIF($2, ''), delivered_data),
                 admin_note = COALESCE(NULLIF($3, ''), admin_note),
                 updated_at = NOW()
             WHERE (order_code = $4 OR id::text = $4)
               AND status IN ('pending', 'waiting_confirm', 'processing')`,
            [approvalMode, effectiveDelivery, adminNote, code]
          );
          if (pgRes !== null) dbOk = true;
        } catch {}

        try {
          const supabaseAdmin = getSupabaseAdmin();
          if (supabaseAdmin) {
            const updateData: any = {
              status: 'completed',
              approval_mode: approvalMode,
              updated_at: new Date().toISOString(),
            };
            if (effectiveDelivery) {
              updateData.delivery_info = effectiveDelivery;
              updateData.delivered_data = effectiveDelivery;
            }
            if (adminNote) updateData.admin_note = adminNote;
            const { error } = await supabaseAdmin
              .from('orders')
              .update(updateData)
              .eq('order_code', code);
            if (!error) dbOk = true;
          }
        } catch {}

        if (isDatabaseConfigured() && !dbOk) {
          return NextResponse.json({ error: 'Không thể lưu kết quả duyệt đơn vào Database.' }, { status: 500 });
        }

        const extra: Record<string, any> = { approval_mode: approvalMode };
        if (effectiveDelivery) extra.delivery_info = effectiveDelivery;
        if (adminNote) extra.admin_note = adminNote;
        serverStore.updateOrderStatus(code, 'completed', extra);
        try {
          awardOrderCashback(code);
        } catch (cbErr) {
          console.warn('[admin/orders/action] Cashback award notice:', cbErr);
        }

        if (effectiveDelivery) {
          await sendCustomerOrderTelegram(
            effectiveItem.telegram_id,
            `<b>[YUKISHOPMXH — HOÀN TẤT ĐƠN HÀNG #${code}]</b>\n` +
              `Sản phẩm: ${effectiveItem.item_name || ''}\n` +
              `Thông tin nhận hàng:\n<code>${effectiveDelivery}</code>` +
              (adminNote ? `\nGhi chú: ${adminNote}` : '')
          );
        }

        return NextResponse.json({
          success: true,
          message:
            action === 'approve_upgraded'
              ? `✅ Đã xác nhận nâng cấp / add Family cho đơn #${code}!`
              : `✅ Đã duyệt & bàn giao đơn #${code} thành công!`,
          status: 'completed',
          delivery_info: effectiveDelivery || undefined,
          admin_note: adminNote || undefined,
        });
      }
    } else {
      // Atomic reject + refund guard
      let canRefundDb = true;
      let dbOk = false;
      let pgOrdUpd: any = null;
      try {
        pgOrdUpd = await queryPostgres(
          `UPDATE public.orders
           SET status = 'cancelled',
               admin_note = COALESCE(NULLIF($1, ''), admin_note),
               updated_at = NOW()
           WHERE (order_code = $2 OR id::text = $2)
             AND status IN ('pending', 'waiting_confirm', 'processing')
           RETURNING order_code`,
          [adminNote, code]
        );
        if (pgOrdUpd !== null) {
          dbOk = true;
          if (!isDeposit && pgOrder && (!pgOrdUpd.rows || pgOrdUpd.rows.length === 0)) {
            canRefundDb = false;
          }
        }
        const pgDepUpd = await queryPostgres(
          `UPDATE public.deposit_requests
           SET status = 'rejected', updated_at = NOW()
           WHERE (request_code = $1 OR transfer_code = $1 OR id::text = $1)
             AND status IN ('pending', 'waiting_confirm')`,
          [code]
        );
        if (pgDepUpd !== null) dbOk = true;
      } catch {}

      try {
        const supabaseAdmin = getSupabaseAdmin();
        if (supabaseAdmin) {
          const { data: sbOrdRej, error: e1 } = await supabaseAdmin
            .from('orders')
            .update({
              status: 'cancelled',
              ...(adminNote ? { admin_note: adminNote } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('order_code', code)
            .in('status', ['pending', 'waiting_confirm', 'processing'])
            .select('order_code');

          if (pgOrdUpd === null && !isDeposit && !e1 && Array.isArray(sbOrdRej) && sbOrdRej.length === 0) {
            canRefundDb = false;
          }

          await (supabaseAdmin as any)
            .from('deposit_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('request_code', code);

          await (supabaseAdmin as any)
            .from('topup_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('reference_code', code);

          if (!e1) dbOk = true;
        }
      } catch {}

      if (isDatabaseConfigured() && !dbOk) {
        return NextResponse.json({ error: 'Không thể cập nhật hủy đơn vào Database.' }, { status: 500 });
      }
      if (!canRefundDb) {
        return NextResponse.json({ error: 'Đơn này đã được hủy/hoàn tiền trước đó!' }, { status: 409 });
      }

      let refunded = false;
      if (!isDeposit) {
        const orderAmount = Number(effectiveItem.total_amount || effectiveItem.amount || 0);
        const isPaid = effectiveItem.paid || Number(effectiveItem.deducted_balance || 0) > 0;
        const targetUserId = effectiveItem.user_id;

        if (isPaid && orderAmount > 0 && targetUserId && targetUserId !== 'anonymous') {
          try {
            await adjustUserBalance({
              userId: targetUserId,
              delta: orderAmount,
              type: 'REFUND',
              referenceId: code,
              description: `Hoàn tiền đơn hàng #${code} bị từ chối`,
            });
            refunded = true;
            await queryPostgres(
              `UPDATE public.orders SET refunded = true, updated_at = NOW() WHERE order_code = $1 OR id::text = $1`,
              [code]
            ).catch(() => {});
          } catch (refErr) {
            console.warn('[orders/action] Refund notice:', refErr);
          }
        }
      }

      serverStore.updateOrderStatus(code, 'cancelled', { refunded, ...(adminNote ? { admin_note: adminNote } : {}) });
      serverStore.updateTopupStatus(code, 'rejected');

      await sendCustomerOrderTelegram(
        effectiveItem.telegram_id,
        `❌ <b>[YUKISHOPMXH — ĐƠN #${code} ĐÃ HỦY]</b>\n` +
          (refunded ? 'Hệ thống đã hoàn lại 100% số tiền về Ví của bạn.' : 'Vui lòng liên hệ Admin @YukiIsMe2311 nếu cần hỗ trợ.') +
          (adminNote ? `\nLý do: ${adminNote}` : '')
      );

      return NextResponse.json({
        success: true,
        message: `Đã từ chối đơn #${code}` + (refunded ? ' (Đã hoàn tiền vào ví khách)' : '.'),
        status: 'cancelled',
      });
    }
  } catch (err: any) {
    console.error('[admin/orders/action] Error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý đơn.' }, { status: 500 });
  }
}
