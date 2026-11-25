import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import { adjustUserBalance } from '@/lib/wallet-service';
import { distributeAffiliateCommission } from '@/lib/affiliate-service';
import { awardOrderCashbackPersistent } from '@/lib/cashback-service';
import { getSiteSettings, getTelegramBotConfig, setSiteSettings } from '@/lib/system-settings';
import { verifySecretHeader } from '@/lib/webhook-security';
import { findDbOrderByCode, findDbUserByIdOrIdentifier, updateDbOrderFields } from '@/lib/db-persistence';
import { callTelegramApi, resolvePublicOrigin } from '@/lib/telegram/sync-service';
import { clearTelegramSession, getTelegramSession, setTelegramSession } from '@/lib/telegram/bot-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function esc(str: unknown): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function adminDashboardKeyboard(sleepMode: boolean) {
  return {
    inline_keyboard: [
      [
        { text: '📊 Thống Kê Nhanh', callback_data: 'adm_stats' },
        { text: '⏳ Đơn & Nạp Chờ Duyệt', callback_data: 'adm_pending' },
      ],
      [
        {
          text: sleepMode ? '🟢 Tắt Sleep Mode (Mở Ca)' : '🌙 Bật Sleep Mode (Nghỉ Tay)',
          callback_data: 'adm_toggle_sleep',
        },
      ],
    ],
  };
}

async function fetchStatsSummary(): Promise<{
  completedRevenue: number;
  totalDeposits: number;
  pendingOrders: number;
  pendingDeposits: number;
  sleepMode: boolean;
}> {
  const site = await getSiteSettings();
  let completedRevenue = 0;
  let totalDeposits = 0;
  let pendingOrders = 0;
  let pendingDeposits = 0;

  try {
    const pgOrd = await queryPostgres(
      `SELECT status, service_type, order_type, COALESCE(total_amount, amount, 0) AS amt FROM public.orders`
    );
    if (pgOrd?.rows) {
      for (const r of pgOrd.rows) {
        const st = String(r.status || '').toLowerCase();
        const isDep = r.service_type === 'NAP_VI' || r.service_type === 'DEPOSIT' || r.order_type === 'DEPOSIT';
        if (!isDep && ['completed', 'approved'].includes(st)) completedRevenue += Number(r.amt || 0);
        if (!isDep && ['pending', 'waiting_confirm'].includes(st)) pendingOrders += 1;
      }
    }
    const pgDep = await queryPostgres(`SELECT status, COALESCE(amount, 0) AS amt FROM public.deposit_requests`);
    if (pgDep?.rows) {
      for (const d of pgDep.rows) {
        const st = String(d.status || '').toLowerCase();
        if (['approved', 'completed'].includes(st)) totalDeposits += Number(d.amt || 0);
        if (['pending', 'waiting_confirm'].includes(st)) pendingDeposits += 1;
      }
    }
    return { completedRevenue, totalDeposits, pendingOrders, pendingDeposits, sleepMode: Boolean(site.sleep_mode) };
  } catch {}

  const orders = serverStore.loadOrders();
  const topups = serverStore.loadTopups();
  for (const o of orders) {
    const isDep = o.service_type === 'NAP_VI' || o.service_type === 'DEPOSIT' || String(o.order_code || '').startsWith('YukiSp_');
    if (!isDep && ['completed', 'approved'].includes(o.status)) completedRevenue += Number(o.total_amount || 0);
    if (!isDep && o.status === 'pending') pendingOrders += 1;
  }
  for (const t of topups) {
    if (t.status === 'approved') totalDeposits += Number(t.amount || 0);
    if (t.status === 'pending') pendingDeposits += 1;
  }

  return { completedRevenue, totalDeposits, pendingOrders, pendingDeposits, sleepMode: Boolean(site.sleep_mode) };
}

async function listPendingItems() {
  const pendingOrders: Array<{ code: string; name: string; amount: number }> = [];
  const pendingDeposits: Array<{ code: string; user: string; amount: number }> = [];

  try {
    const pgO = await queryPostgres(
      `SELECT order_code, item_name, COALESCE(total_amount, amount, 0) AS amt
       FROM public.orders
       WHERE status IN ('pending', 'waiting_confirm')
         AND COALESCE(service_type, '') NOT IN ('NAP_VI', 'DEPOSIT')
         AND COALESCE(order_type, '') != 'DEPOSIT'
       ORDER BY created_at DESC LIMIT 5`
    );
    for (const r of pgO?.rows || []) {
      pendingOrders.push({ code: r.order_code, name: r.item_name || 'Đơn hàng', amount: Number(r.amt || 0) });
    }
    const pgD = await queryPostgres(
      `SELECT COALESCE(request_code, transfer_code, id) AS code, COALESCE(user_name, user_id) AS u, amount
       FROM public.deposit_requests
       WHERE status IN ('pending', 'waiting_confirm')
       ORDER BY created_at DESC LIMIT 5`
    );
    for (const d of pgD?.rows || []) {
      pendingDeposits.push({ code: d.code, user: d.u || 'Khách', amount: Number(d.amount || 0) });
    }
  } catch {}

  if (pendingOrders.length === 0 && pendingDeposits.length === 0) {
    for (const o of serverStore.loadOrders().filter((x) => x.status === 'pending').slice(0, 10)) {
      const isDep = o.service_type === 'NAP_VI' || o.service_type === 'DEPOSIT' || String(o.order_code || '').startsWith('YukiSp_');
      if (isDep) {
        if (pendingDeposits.length < 5) pendingDeposits.push({ code: o.order_code, user: o.user_name, amount: Number(o.total_amount || 0) });
      } else {
        if (pendingOrders.length < 5) pendingOrders.push({ code: o.order_code, name: o.item_name, amount: Number(o.total_amount || 0) });
      }
    }
  }

  return { pendingOrders, pendingDeposits };
}

async function notifyCustomerTelegram(token: string, order: any, title: string, bodyText: string) {
  try {
    let tgId = String(order?.telegram_id || '').trim().replace(/^@/, '');
    if (!/^\d{5,15}$/.test(tgId) && order?.user_id) {
      const u = await findDbUserByIdOrIdentifier(order.user_id);
      tgId = String(u?.telegramId || '').trim().replace(/^@/, '');
    }
    if (!token || !/^\d{5,15}$/.test(tgId)) return;
    await callTelegramApi(token, 'sendMessage', {
      chat_id: tgId,
      parse_mode: 'HTML',
      text: `<b>${title}</b>\n${bodyText}`,
    });
  } catch {}
}

async function processOrderOrTopupAction(params: {
  action: 'approve' | 'reject' | 'deliver_empty';
  entity: 'order' | 'topup';
  id: string;
  callerId: string;
  chatId: string | number;
  botToken: string;
}): Promise<string> {
  const { action, entity, id, callerId, chatId, botToken } = params;
  const sbAdmin = getSupabaseAdmin();
  const effectiveItem = await findDbOrderByCode(id);
  const localTopup = serverStore.loadTopups().find((t) => t.code === id || t.id === id);

  let dbDep: any = null;
  if (!effectiveItem && !localTopup) {
    try {
      const pgD = await queryPostgres(
        `SELECT * FROM public.deposit_requests WHERE request_code = $1 OR transfer_code = $1 OR id = $1 LIMIT 1`,
        [id]
      );
      if (pgD?.rows?.[0]) dbDep = pgD.rows[0];
    } catch {}
    if (!dbDep && sbAdmin) {
      const { data } = await sbAdmin
        .from('deposit_requests')
        .select('*')
        .or(`request_code.eq.${id},transfer_code.eq.${id},id.eq.${id}`)
        .maybeSingle();
      dbDep = data;
    }
  }

  const target: any = effectiveItem || localTopup || dbDep;
  if (!target) {
    return `⚠️ Không tìm thấy đơn #${id}`;
  }

  const currentStatus = String(target.status || 'pending').toLowerCase();
  if (['approved', 'completed', 'cancelled', 'rejected'].includes(currentStatus)) {
    return `⚠️ Đơn #${id} đã được xử lý trước đó (${currentStatus}).`;
  }

  const isTopupCode =
    /^YukiSp_/i.test(id) ||
    id.startsWith('tp_') ||
    id.startsWith('DEP-');
  const isDeposit =
    isTopupCode ||
    entity === 'topup' ||
    target.order_type === 'DEPOSIT' ||
    target.service_type === 'DEPOSIT' ||
    target.service_type === 'NAP_VI' ||
    Boolean(dbDep) ||
    String(target.item_name || '').toLowerCase().includes('nạp ví');

  if (action === 'deliver_empty') {
    await clearTelegramSession(callerId, 'main');
    await updateDbOrderFields(id, {
      status: 'completed',
      delivery_info: 'CONTACT_ADMIN',
      delivered_data: 'CONTACT_ADMIN',
      approved_by: 'ADMIN_TELEGRAM',
    });
    await awardOrderCashbackPersistent(id).catch(() => {});
    await notifyCustomerTelegram(
      botToken,
      target,
      `✅ ĐƠN HÀNG #${esc(id)} ĐÃ DUYỆT`,
      `Vui lòng nhắn tin Admin @YukiIsMe2311 hoặc kiểm tra mục /orders trên web để nhận bàn giao.`
    );
    return `✅ Đã duyệt đơn #${id} (Khách liên hệ Admin nhận hàng).`;
  }

  if (action === 'approve') {
    if (isDeposit) {
      const depositAmount = Number(target.total_amount ?? target.amount ?? 0);
      if (depositAmount <= 0) return '⚠️ Số tiền nạp không hợp lệ.';

      const nowISO = new Date().toISOString();
      try {
        await queryPostgres(
          `UPDATE public.deposit_requests SET status = 'approved', approved_by = 'ADMIN_TELEGRAM', approved_at = NOW(), updated_at = NOW()
           WHERE request_code = $1 OR transfer_code = $1 OR id = $1`,
          [id]
        );
        await queryPostgres(
          `UPDATE public.orders SET status = 'completed', paid = true, approved_by = 'ADMIN_TELEGRAM', updated_at = NOW()
           WHERE order_code = $1 OR id = $1`,
          [id]
        );
      } catch {}

      if (sbAdmin) {
        try {
          await sbAdmin
            .from('deposit_requests')
            .update({ status: 'approved', approved_by: 'ADMIN_TELEGRAM', approved_at: nowISO, updated_at: nowISO })
            .or(`request_code.eq.${id},transfer_code.eq.${id},id.eq.${id}`);
          await sbAdmin
            .from('orders')
            .update({ status: 'completed', paid: true, approved_by: 'ADMIN_TELEGRAM', updated_at: nowISO })
            .or(`order_code.eq.${id},id.eq.${id}`);
        } catch {}
      }

      serverStore.updateOrderStatus(id, 'completed', { paid: true });
      serverStore.updateTopupStatus(id, 'approved');

      const targetUserId = target.user_id;
      if (targetUserId && targetUserId !== 'anonymous') {
        await adjustUserBalance({
          userId: targetUserId,
          delta: depositAmount,
          type: 'DEPOSIT',
          referenceId: id,
          description: `Admin duyệt nạp tiền #${id} qua Telegram`,
        });
        await distributeAffiliateCommission({
          refereeId: targetUserId,
          depositAmount,
          referenceCode: id,
        }).catch(() => {});
        await notifyCustomerTelegram(
          botToken,
          target,
          `✅ NẠP VÍ THÀNH CÔNG (+${new Intl.NumberFormat('vi-VN').format(depositAmount)}đ)`,
          `Mã đơn nạp: <code>${esc(id)}</code>\nSố dư ví đã được cập nhật.`
        );
      }

      return `✅ ĐÃ DUYỆT CỘNG +${new Intl.NumberFormat('vi-VN').format(depositAmount)} VNĐ (#${id})!`;
    }

    // Purchase order -> enter persistent DB 2-step delivery state
    await setTelegramSession(
      callerId,
      { step: 'awaiting_delivery', orderCode: id },
      'main'
    );
    serverStore.setAdminPendingDelivery(callerId, id);

    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text:
        `📝 <b>[NHẬP THÔNG TIN BÀN GIAO ĐƠN #${esc(id)}]</b>\n\n` +
        `Vui lòng <b>gõ tin nhắn text trả lời ngay dưới đây</b> chứa tài khoản / key bản quyền cho khách.\n` +
        `<i>Hoặc chọn khách chủ động nhắn Admin:</i>`,
      reply_markup: {
        inline_keyboard: [[{ text: '📭 Trống (Khách liên hệ Admin nhận đơn)', callback_data: `deliv_none:${id}` }]],
      },
    });

    return `⏳ Đang chờ Admin nhập thông tin bàn giao cho đơn #${id}...`;
  }

  // Reject action -> cancel & refund if paid
  let refunded = false;
  if (!isDeposit) {
    const orderAmount = Number(target.total_amount ?? target.amount ?? 0);
    const isPaid = Boolean(target.paid) || Number(target.deducted_balance || 0) > 0;
    const targetUserId = target.user_id;

    if (isPaid && orderAmount > 0 && targetUserId && targetUserId !== 'anonymous') {
      try {
        await adjustUserBalance({
          userId: targetUserId,
          delta: orderAmount,
          type: 'REFUND',
          referenceId: id,
          description: `Hoàn tiền 100% đơn hàng #${id} bị Admin hủy`,
        });
        refunded = true;
      } catch {}
    }
  }

  await updateDbOrderFields(id, { status: 'cancelled', refunded, approved_by: 'ADMIN_TELEGRAM_REJECT' });
  try {
    await queryPostgres(
      `UPDATE public.deposit_requests SET status = 'rejected', approved_by = 'ADMIN_TELEGRAM_REJECT', updated_at = NOW()
       WHERE request_code = $1 OR transfer_code = $1 OR id = $1`,
      [id]
    );
  } catch {}
  if (sbAdmin) {
    try {
      await sbAdmin
        .from('deposit_requests')
        .update({ status: 'rejected', approved_by: 'ADMIN_TELEGRAM_REJECT', updated_at: new Date().toISOString() })
        .or(`request_code.eq.${id},transfer_code.eq.${id},id.eq.${id}`);
    } catch {}
  }
  serverStore.updateTopupStatus(id, 'rejected');

  await notifyCustomerTelegram(
    botToken,
    target,
    `❌ ĐƠN HÀNG #${esc(id)} ĐÃ BỊ HỦY`,
    refunded ? 'Hệ thống đã hoàn lại 100% số tiền về Ví Mua Hàng của bạn.' : 'Vui lòng liên hệ Admin @YukiIsMe2311 nếu cần hỗ trợ.'
  );

  return `❌ ĐÃ HỦY ĐƠN #${id}` + (refunded ? ' (Đã hoàn 100% tiền về ví)' : '');
}

export async function POST(req: Request) {
  try {
    const tgCfg = await getTelegramBotConfig().catch(() => null);
    const configuredSecret =
      tgCfg?.webhook_secret || process.env.TELEGRAM_WEBHOOK_SECRET || '';
    const headerSecret =
      req.headers.get('x-telegram-bot-api-secret-token') ||
      req.headers.get('x-webhook-secret') ||
      '';

    if (!verifySecretHeader(headerSecret, configuredSecret)) {
      return NextResponse.json({ error: 'UNAUTHORIZED_WEBHOOK' }, { status: 401 });
    }

    await ensureDatabaseReady().catch(() => {});
    const update = await req.json().catch(() => ({}));
    const botToken = tgCfg?.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
    const adminChatId = String(
      tgCfg?.admin_id || process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '8960751162'
    ).trim();
    const allowedAdminIds = new Set(
      [adminChatId, process.env.TELEGRAM_CHAT_ID || '', process.env.TELEGRAM_ADMIN_CHAT_ID || '', '8960751162']
        .map((s) => s.trim())
        .filter(Boolean)
    );

    // =========================================================================
    // 1. 2-WAY TEXT COMMANDS & MESSAGES
    // =========================================================================
    const message = update?.message;
    if (message && message.text) {
      const msgCallerId = String(message.from?.id || '');
      const chatId = message.chat.id;
      const trimmed = String(message.text || '').trim();
      const senderUsername = String(message.from?.username || '').trim();

      // 1A. Customer 2-Way Helper (non-admin)
      if (!allowedAdminIds.has(msgCallerId)) {
        const origin = resolvePublicOrigin(req);
        if (botToken) {
          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text:
              `🤖 <b>YUKISHOPMXH — HỖ TRỢ KHÁCH HÀNG 24/7</b>\n\n` +
              `🆔 <b>Telegram ID của bạn:</b> <code>${esc(msgCallerId)}</code>${senderUsername ? `\n👤 <b>Username:</b> @${esc(senderUsername)}` : ''}\n\n` +
              `👉 Chạm vào dãy số ID ở trên để sao chép và dán vào ô <b>ID Telegram</b> khi đăng ký hoặc đặt hàng tại website.`,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛍️ Mở Cửa Hàng YukiShopMXH', url: origin }],
                [{ text: '💬 Nhắn Trực Tiếp Admin (@YukiIsMe2311)', url: 'https://t.me/YukiIsMe2311' }],
              ],
            },
          });
        }
        return NextResponse.json({ ok: true, customerReply: true });
      }

      // 1B. Admin /id command
      if (/^\/id$/i.test(trimmed)) {
        if (botToken) {
          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text: `🆔 <b>Admin Chat ID:</b> <code>${esc(msgCallerId)}</code> (Group/Chat: <code>${esc(chatId)}</code>)`,
          });
        }
        return NextResponse.json({ ok: true, id: msgCallerId });
      }

      // 1C. Admin /start & /help interactive dashboard
      if (/^\/(start|help)$/i.test(trimmed)) {
        const site = await getSiteSettings();
        if (botToken) {
          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text:
              `⚡ <b>BẢNG ĐIỀU KHIỂN ADMIN 2 CHIỀU — YUKISHOPMXH</b>\n\n` +
              `• <code>/status</code> — Xem doanh thu, tổng nạp & đơn chờ\n` +
              `• <code>/pending</code> — Danh sách đơn & nạp chờ duyệt 1 chạm\n` +
              `• <code>/sleep on|off</code> — Bật/Tắt chế độ nghỉ duyệt tay\n` +
              `• <code>/duyet MÃ_ĐƠN</code> — Duyệt nhanh đơn/nạp\n` +
              `• <code>/huy MÃ_ĐƠN</code> — Hủy & hoàn tiền đơn\n` +
              `• Trạng thái Sleep Mode: <b>${site.sleep_mode ? '🌙 ĐANG BẬT' : '🟢 ĐANG TẮT (24/7)'}</b>`,
            reply_markup: adminDashboardKeyboard(Boolean(site.sleep_mode)),
          });
        }
        return NextResponse.json({ ok: true, dashboard: true });
      }

      // 1D. Admin /status or /stats
      if (/^\/(status|stats)$/i.test(trimmed)) {
        const stats = await fetchStatsSummary();
        if (botToken) {
          const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text:
              `📊 <b>THỐNG KÊ HỆ THỐNG YUKISHOPMXH</b>\n\n` +
              `💰 <b>Doanh thu đơn hoàn tất:</b> <code>${fmt(stats.completedRevenue)}</code>\n` +
              `🏦 <b>Tổng nạp ví đã duyệt:</b> <code>${fmt(stats.totalDeposits)}</code>\n` +
              `📦 <b>Đơn mua hàng chờ duyệt:</b> <code>${stats.pendingOrders}</code>\n` +
              `💳 <b>Đơn nạp ví chờ duyệt:</b> <code>${stats.pendingDeposits}</code>\n` +
              `🌙 <b>Sleep Mode:</b> <b>${stats.sleepMode ? 'ĐANG BẬT' : 'ĐANG TẮT'}</b>`,
            reply_markup: adminDashboardKeyboard(stats.sleepMode),
          });
        }
        return NextResponse.json({ ok: true, stats });
      }

      // 1E. Admin /pending or /don
      if (/^\/(pending|don)$/i.test(trimmed)) {
        const { pendingOrders, pendingDeposits } = await listPendingItems();
        if (botToken) {
          const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
          const lines: string[] = ['⏳ <b>DANH SÁCH CHỜ DUYỆT MỚI NHẤT</b>\n'];
          const kbRows: any[][] = [];

          if (pendingDeposits.length > 0) {
            lines.push('<b>💳 Nạp ví chờ duyệt:</b>');
            for (const d of pendingDeposits) {
              lines.push(`• <code>${esc(d.code)}</code> — ${esc(d.user)} — <b>${fmt(d.amount)}</b>`);
              kbRows.push([
                { text: `✅ Duyệt ${d.code}`, callback_data: `topup_ok:${d.code}` },
                { text: `❌ Hủy ${d.code}`, callback_data: `topup_no:${d.code}` },
              ]);
            }
            lines.push('');
          }

          if (pendingOrders.length > 0) {
            lines.push('<b>📦 Đơn hàng chờ duyệt:</b>');
            for (const o of pendingOrders) {
              lines.push(`• <code>${esc(o.code)}</code> — ${esc(o.name)} — <b>${fmt(o.amount)}</b>`);
              kbRows.push([
                { text: `✅ Bàn giao ${o.code}`, callback_data: `ord_ok:${o.code}` },
                { text: `❌ Hủy ${o.code}`, callback_data: `ord_no:${o.code}` },
              ]);
            }
          }

          if (pendingOrders.length === 0 && pendingDeposits.length === 0) {
            lines.push('🎉 Hiện không có đơn hàng hay lệnh nạp ví nào đang chờ duyệt!');
          }

          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text: lines.join('\n'),
            reply_markup: kbRows.length > 0 ? { inline_keyboard: kbRows } : undefined,
          });
        }
        return NextResponse.json({ ok: true, pendingListed: true });
      }

      // 1F. Admin /sleep [on|off]
      if (/^\/sleep(\s+(on|off))?$/i.test(trimmed)) {
        const arg = trimmed.split(/\s+/)[1]?.toLowerCase();
        const current = await getSiteSettings();
        const nextSleep = arg === 'on' ? true : arg === 'off' ? false : !current.sleep_mode;
        await setSiteSettings({ sleep_mode: nextSleep });
        serverStore.updateSystemConfig({ sleep_mode: nextSleep });
        if (botToken) {
          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text: nextSleep
              ? `🌙 <b>SLEEP MODE: ĐÃ BẬT</b>\nNạp ví Auto 24/7 vẫn chạy bình thường; web đã hiển thị thông báo tạm nghỉ duyệt tay.`
              : `🟢 <b>SLEEP MODE: ĐÃ TẮT</b>\nShop đã quay lại trạng thái duyệt đơn trực tiếp 24/7!`,
          });
        }
        return NextResponse.json({ ok: true, sleep_mode: nextSleep });
      }

      // 1G. Admin /duyet <CODE> or /huy <CODE>
      const quickCmd = trimmed.match(/^\/(duyet|huy)\s+([A-Za-z0-9_-]+)$/i);
      if (quickCmd) {
        const cmdVerb = quickCmd[1].toLowerCase() === 'duyet' ? 'approve' : 'reject';
        const targetCode = quickCmd[2];
        const resultMsg = await processOrderOrTopupAction({
          action: cmdVerb,
          entity: targetCode.startsWith('YukiSp_') ? 'topup' : 'order',
          id: targetCode,
          callerId: msgCallerId,
          chatId,
          botToken,
        });
        if (botToken) {
          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text: resultMsg,
          });
        }
        return NextResponse.json({ ok: true, message: resultMsg });
      }

      // 1H. Admin 2-Step Order Delivery Reply (DB-backed session + local fallback)
      const dbMainSess = await getTelegramSession(msgCallerId, 'main');
      const pendingOrderCode =
        (dbMainSess?.step === 'awaiting_delivery' ? dbMainSess.orderCode : null) ||
        serverStore.getAdminPendingDelivery(msgCallerId);

      if (pendingOrderCode && !trimmed.startsWith('/')) {
        await clearTelegramSession(msgCallerId, 'main');
        serverStore.clearAdminPendingDelivery(msgCallerId);

        const order = await findDbOrderByCode(pendingOrderCode);
        await updateDbOrderFields(pendingOrderCode, {
          status: 'completed',
          delivery_info: trimmed,
          delivered_data: trimmed,
          approved_by: 'ADMIN_TELEGRAM_2STEP',
        });

        await awardOrderCashbackPersistent(pendingOrderCode).catch(() => {});

        if (order) {
          await notifyCustomerTelegram(
            botToken,
            order,
            `🎉 BÀN GIAO ĐƠN HÀNG #${esc(pendingOrderCode)} THÀNH CÔNG!`,
            `📦 <b>Thông tin bàn giao:</b>\n<pre>${esc(trimmed)}</pre>\n\nBạn cũng có thể xem lại tại mục <b>Đơn Hàng</b> trên website.`
          );
        }

        if (botToken) {
          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            parse_mode: 'HTML',
            text: `✅ <b>ĐÃ BÀN GIAO ĐƠN #${esc(pendingOrderCode)}!</b>\n<pre>${esc(trimmed)}</pre>`,
          });
        }
        return NextResponse.json({ ok: true, delivered: true, orderCode: pendingOrderCode });
      }
    }

    // =========================================================================
    // 2. INLINE CALLBACK QUERIES
    // =========================================================================
    const callback = update?.callback_query;
    if (!callback?.data) return NextResponse.json({ ok: true });

    const callerId = String(callback.from?.id || '');
    const cbChatId = callback.message?.chat?.id || callerId;

    if (!allowedAdminIds.has(callerId)) {
      if (botToken && callback.id) {
        await callTelegramApi(botToken, 'answerCallbackQuery', {
          callback_query_id: callback.id,
          text: '⛔ Bạn không có quyền thực hiện thao tác quản trị!',
          show_alert: true,
        });
      }
      return NextResponse.json({ ok: true, unauthorized: true });
    }

    const dataStr = String(callback.data).trim();

    // Dashboard inline controls
    if (dataStr === 'adm_stats') {
      if (botToken && callback.id) await callTelegramApi(botToken, 'answerCallbackQuery', { callback_query_id: callback.id });
      const stats = await fetchStatsSummary();
      const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
      await callTelegramApi(botToken, 'sendMessage', {
        chat_id: cbChatId,
        parse_mode: 'HTML',
        text:
          `📊 <b>THỐNG KÊ NHANH YUKISHOPMXH</b>\n` +
          `💰 Doanh thu: <code>${fmt(stats.completedRevenue)}</code>\n` +
          `🏦 Tổng nạp: <code>${fmt(stats.totalDeposits)}</code>\n` +
          `📦 Đơn chờ: <code>${stats.pendingOrders}</code> | 💳 Nạp chờ: <code>${stats.pendingDeposits}</code>\n` +
          `🌙 Sleep Mode: <b>${stats.sleepMode ? 'ĐANG BẬT' : 'ĐANG TẮT'}</b>`,
        reply_markup: adminDashboardKeyboard(stats.sleepMode),
      });
      return NextResponse.json({ ok: true });
    }

    if (dataStr === 'adm_pending') {
      if (botToken && callback.id) await callTelegramApi(botToken, 'answerCallbackQuery', { callback_query_id: callback.id });
      const { pendingOrders, pendingDeposits } = await listPendingItems();
      const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
      const lines: string[] = ['⏳ <b>ĐƠN HÀNG & NẠP VÍ CHỜ DUYỆT</b>\n'];
      const kbRows: any[][] = [];
      for (const d of pendingDeposits) {
        lines.push(`• 💳 <code>${esc(d.code)}</code> (${esc(d.user)}): <b>${fmt(d.amount)}</b>`);
        kbRows.push([
          { text: `✅ Duyệt ${d.code}`, callback_data: `topup_ok:${d.code}` },
          { text: `❌ Hủy ${d.code}`, callback_data: `topup_no:${d.code}` },
        ]);
      }
      for (const o of pendingOrders) {
        lines.push(`• 📦 <code>${esc(o.code)}</code> (${esc(o.name)}): <b>${fmt(o.amount)}</b>`);
        kbRows.push([
          { text: `✅ Duyệt ${o.code}`, callback_data: `ord_ok:${o.code}` },
          { text: `❌ Hủy ${o.code}`, callback_data: `ord_no:${o.code}` },
        ]);
      }
      if (kbRows.length === 0) lines.push('🎉 Không có mục nào đang chờ duyệt.');
      await callTelegramApi(botToken, 'sendMessage', {
        chat_id: cbChatId,
        parse_mode: 'HTML',
        text: lines.join('\n'),
        reply_markup: kbRows.length > 0 ? { inline_keyboard: kbRows } : undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (dataStr === 'adm_toggle_sleep') {
      const cur = await getSiteSettings();
      const next = !cur.sleep_mode;
      await setSiteSettings({ sleep_mode: next });
      serverStore.updateSystemConfig({ sleep_mode: next });
      if (botToken && callback.id) {
        await callTelegramApi(botToken, 'answerCallbackQuery', {
          callback_query_id: callback.id,
          text: next ? '🌙 Đã BẬT Sleep Mode' : '🟢 Đã TẮT Sleep Mode',
          show_alert: true,
        });
      }
      return NextResponse.json({ ok: true, sleep_mode: next });
    }

    // Parse entity/action callbacks
    let action: 'approve' | 'reject' | 'deliver_empty' | '' = '';
    let entity: 'order' | 'topup' | 'withdrawal' = 'order';
    let id = '';

    if (dataStr.startsWith('ord_ok:')) { action = 'approve'; entity = 'order'; id = dataStr.slice(7); }
    else if (dataStr.startsWith('ord_no:')) { action = 'reject'; entity = 'order'; id = dataStr.slice(7); }
    else if (dataStr.startsWith('deliv_none:')) { action = 'deliver_empty'; entity = 'order'; id = dataStr.slice(11); }
    else if (dataStr.startsWith('wd_ok:')) { action = 'approve'; entity = 'withdrawal'; id = dataStr.slice(6); }
    else if (dataStr.startsWith('wd_no:')) { action = 'reject'; entity = 'withdrawal'; id = dataStr.slice(6); }
    else if (dataStr.startsWith('topup_ok:')) { action = 'approve'; entity = 'topup'; id = dataStr.slice(9); }
    else if (dataStr.startsWith('topup_no:')) { action = 'reject'; entity = 'topup'; id = dataStr.slice(9); }
    else if (dataStr.startsWith('APPROVE_ORDER_')) { action = 'approve'; entity = 'order'; id = dataStr.slice(14); }
    else if (dataStr.startsWith('CANCEL_ORDER_')) { action = 'reject'; entity = 'order'; id = dataStr.slice(13); }
    else if (dataStr.startsWith('DELIVER_EMPTY_')) { action = 'deliver_empty'; entity = 'order'; id = dataStr.slice(14); }
    else if (dataStr.includes(':')) {
      const parts = dataStr.split(':');
      action = parts[0].toLowerCase() as any;
      if (parts.length === 3) { entity = parts[1] as any; id = parts[2]; }
      else { id = parts[1]; }
    }

    // Handle Affiliate Withdrawal callbacks
    if (entity === 'withdrawal' && id) {
      const sbAdmin = getSupabaseAdmin();
      let wd: any = serverStore.findAffiliateWithdrawalById(id);
      if (!wd) {
        const pgW = await queryPostgres(`SELECT * FROM public.affiliate_withdrawals WHERE id = $1 LIMIT 1`, [id]).catch(() => null);
        if (pgW?.rows?.[0]) {
          const r = pgW.rows[0];
          wd = { id: r.id, userId: r.user_id, amount: Number(r.amount || 0), status: r.status };
        } else if (sbAdmin) {
          const { data } = await sbAdmin.from('affiliate_withdrawals').select('*').eq('id', id).maybeSingle();
          if (data) wd = { id: data.id, userId: data.user_id, amount: Number(data.amount || 0), status: data.status };
        }
      }

      if (!wd) {
        if (botToken && callback.id) await callTelegramApi(botToken, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'Không tìm thấy yêu cầu rút tiền.', show_alert: true });
        return NextResponse.json({ ok: false });
      }
      if (wd.status !== 'pending') {
        if (botToken && callback.id) await callTelegramApi(botToken, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'Yêu cầu rút tiền đã được xử lý trước đó!', show_alert: true });
        return NextResponse.json({ ok: true, alreadyProcessed: true });
      }

      const nextStatus = action === 'approve' ? 'approved' : 'rejected';
      serverStore.updateAffiliateWithdrawalStatus(id, nextStatus, action === 'reject' ? 'Từ chối qua Telegram Admin' : undefined);
      await queryPostgres(
        `UPDATE public.affiliate_withdrawals SET status = $1, processed_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [nextStatus, id]
      ).catch(() => {});
      if (sbAdmin) {
        try {
          await sbAdmin
            .from('affiliate_withdrawals')
            .update({ status: nextStatus, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id);
        } catch {}
      }

      if (action === 'reject') {
        const refundAmt = Math.max(0, Number(wd.amount || wd.netAmount || 0));
        serverStore.adjustAffiliateBalance(wd.userId, refundAmt, 0);
        await queryPostgres(
          `UPDATE public.profiles SET affiliate_balance = COALESCE(affiliate_balance, 0) + $1, updated_at = NOW() WHERE id = $2`,
          [refundAmt, wd.userId]
        ).catch(() => {});
      }

      const statusBanner =
        action === 'approve'
          ? `\n\n✅ <b>ĐÃ DUYỆT RÚT TIỀN</b> (${new Date().toLocaleString('vi-VN')})`
          : `\n\n❌ <b>ĐÃ TỪ CHỐI & HOÀN HOA HỒNG</b> (${new Date().toLocaleString('vi-VN')})`;

      if (botToken && callback.message?.chat?.id && callback.message?.message_id) {
        const editMethod = callback.message.photo ? 'editMessageCaption' : 'editMessageText';
        const key = callback.message.photo ? 'caption' : 'text';
        await callTelegramApi(botToken, editMethod, {
          chat_id: callback.message.chat.id,
          message_id: callback.message.message_id,
          [key]: (callback.message.caption || callback.message.text || '') + statusBanner,
          parse_mode: 'HTML',
        });
      }
      if (botToken && callback.id) {
        await callTelegramApi(botToken, 'answerCallbackQuery', {
          callback_query_id: callback.id,
          text: action === 'approve' ? '✅ Đã duyệt yêu cầu rút tiền!' : '❌ Đã từ chối & hoàn tiền hoa hồng!',
          show_alert: true,
        });
      }
      return NextResponse.json({ ok: true, withdrawalStatus: nextStatus });
    }

    // Handle Order / Topup callbacks
    if (action && id) {
      const statusText = await processOrderOrTopupAction({
        action,
        entity: entity === 'topup' ? 'topup' : 'order',
        id,
        callerId,
        chatId: cbChatId,
        botToken,
      });

      if (botToken && callback.id) {
        await callTelegramApi(botToken, 'answerCallbackQuery', {
          callback_query_id: callback.id,
          text: statusText.slice(0, 190),
          show_alert: true,
        });
      }

      if (
        botToken &&
        callback.message?.chat?.id &&
        callback.message?.message_id &&
        (action === 'reject' || action === 'deliver_empty' || (action === 'approve' && (entity === 'topup' || /^YukiSp_/i.test(id))))
      ) {
        await callTelegramApi(botToken, 'editMessageText', {
          chat_id: callback.message.chat.id,
          message_id: callback.message.message_id,
          text: esc(callback.message.text || '') + `\n\n📌 <b>Trạng thái:</b> ${esc(statusText)}`,
          parse_mode: 'HTML',
        });
      }

      return NextResponse.json({ ok: true, statusText });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[telegram/webhook] Error:', err);
    return NextResponse.json({ ok: true });
  }
}
