import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { ensureDatabaseReady, queryPostgres, isDatabaseConfigured } from '@/lib/autoMigrate';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { serverStore } from '@/lib/server-store';
import { getTelegramBotConfig } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    await ensureDatabaseReady().catch(() => {});

    let deposits: any[] = [];

    // Query from Postgres
    try {
      const pgRes = sessionUser.role === 'admin'
        ? await queryPostgres(`SELECT * FROM public.deposit_requests ORDER BY created_at DESC LIMIT 50`)
        : await queryPostgres(
            `SELECT * FROM public.deposit_requests WHERE user_id::text = $1 OR LOWER(COALESCE(user_email, '')) = LOWER($2) ORDER BY created_at DESC LIMIT 50`,
            [sessionUser.id, sessionUser.email || '']
          );
      if (pgRes?.rows) {
        deposits = pgRes.rows;
      }
    } catch {}

    if (deposits.length === 0) {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        try {
          let query = sbAdmin.from('deposit_requests').select('*').order('created_at', { ascending: false }).limit(50);
          if (sessionUser.role !== 'admin') {
            query = query.eq('user_id', sessionUser.id);
          }
          const { data: sbDeps } = await query;
          if (Array.isArray(sbDeps) && sbDeps.length > 0) {
            deposits = sbDeps;
          }
        } catch {}
      }
    }

    // Fallback to serverStore if both DBs returned empty
    if (deposits.length === 0) {
      const all = serverStore.loadTopups();
      deposits = sessionUser.role === 'admin'
        ? all
        : all.filter((t) => t.user_id === sessionUser.id);
    }

    return NextResponse.json({
      success: true,
      deposits,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập trước khi thực hiện.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const referenceCode = String(body.referenceCode || body.transfer_code || body.code || '')
      .trim()
      .replace(/[^A-Za-z0-9_-]/g, '');
    const amount = Number(body.amount || 0);

    if (!referenceCode) {
      return NextResponse.json({ error: 'Thiếu mã chuyển khoản.' }, { status: 400 });
    }

    if (!amount || !Number.isFinite(amount) || amount < 10000 || amount > 2000000) {
      return NextResponse.json(
        { error: 'Hạn mức nạp tiền từ 10.000 VNĐ đến 2.000.000 VNĐ cho mỗi lần tạo đơn.' },
        { status: 400 }
      );
    }

    await ensureDatabaseReady().catch(() => {});

    // Verify ownership if request already exists
    try {
      const existingPg = await queryPostgres(
        `SELECT user_id, status FROM public.deposit_requests WHERE request_code = $1 LIMIT 1`,
        [referenceCode]
      );
      const ex = existingPg?.rows?.[0];
      if (ex && ex.user_id && ex.user_id !== sessionUser.id && sessionUser.role !== 'admin') {
        return NextResponse.json({ error: 'Bạn không có quyền thao tác mã nạp này.' }, { status: 403 });
      }
      if (ex && ['approved', 'completed'].includes(String(ex.status || '').toLowerCase())) {
        return NextResponse.json({ success: true, alreadyApproved: true, message: 'Đơn nạp đã được duyệt.' });
      }
    } catch {}

    const nowISO = new Date().toISOString();
    const userId = sessionUser.id;
    const userEmail = sessionUser.email || '';
    const userName = sessionUser.fullName || sessionUser.username || 'Khách Hàng';
    const userContact = sessionUser.phone || sessionUser.telegramId || sessionUser.email || 'ZaloPay';

    // 1. Record to PostgreSQL (valid UUID id)
    let dbWriteOk = false;
    try {
      const pgDep = await queryPostgres(
        `INSERT INTO public.deposit_requests (id, request_code, user_id, user_email, user_name, user_contact, amount, transfer_code, payment_method, status, telegram_notified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $2, 'VIETQR', 'pending', true, now(), now())
         ON CONFLICT (request_code) DO UPDATE SET updated_at = now()`,
        [crypto.randomUUID(), referenceCode, userId, userEmail, userName, userContact, amount]
      );
      await queryPostgres(
        `INSERT INTO public.orders (id, order_code, user_id, user_email, user_name, user_contact, delivery_contact, order_type, service_type, item_name, product_sku, amount, total_amount, quantity, status, paid, telegram_notified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6, 'NAP_VI', 'NAP_VI', $7, 'TOPUP-VIETQR', $8, $8, 1, 'pending', false, true, now(), now())
         ON CONFLICT (order_code) DO UPDATE SET updated_at = now()`,
        [crypto.randomUUID(), referenceCode, userId, userEmail, userName, userContact, `Nạp ví ZaloPay VietQR (+${new Intl.NumberFormat('vi-VN').format(amount)} đ)`, amount]
      );
      if (pgDep !== null) dbWriteOk = true;
    } catch (pgErr) {
      console.warn('[deposits/POST] Postgres insert notice:', pgErr);
    }

    // 2. Sync to Supabase safely (verify ownership, never blind upsert)
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const { data: existingSb } = await supabaseAdmin
          .from('deposit_requests')
          .select('user_id, status')
          .eq('request_code', referenceCode)
          .maybeSingle();
        if (
          existingSb?.user_id &&
          existingSb.user_id !== userId &&
          String(sessionUser.role || '').toLowerCase() !== 'admin'
        ) {
          return NextResponse.json({ error: 'Bạn không có quyền thao tác mã nạp này.' }, { status: 403 });
        }
        if (existingSb && ['approved', 'completed'].includes(String(existingSb.status || '').toLowerCase())) {
          return NextResponse.json({ success: true, alreadyApproved: true, message: 'Đơn nạp đã được duyệt.' });
        }

        if (existingSb) {
          const { error: sbUpdErr } = await supabaseAdmin
            .from('deposit_requests')
            .update({ telegram_notified: true, updated_at: nowISO })
            .eq('request_code', referenceCode)
            .eq('user_id', existingSb.user_id);
          if (!sbUpdErr) dbWriteOk = true;
        } else {
          const { error: sbErr } = await supabaseAdmin.from('deposit_requests').insert({
            request_code: referenceCode,
            user_id: userId,
            user_email: userEmail,
            user_name: userName,
            user_contact: userContact,
            amount,
            transfer_code: referenceCode,
            payment_method: 'VIETQR',
            status: 'pending',
            telegram_notified: true,
            created_at: nowISO,
            updated_at: nowISO,
          });
          if (!sbErr) dbWriteOk = true;
        }
      }
    } catch {}

    if (isDatabaseConfigured() && !dbWriteOk) {
      return NextResponse.json(
        { error: 'Không thể lưu yêu cầu nạp ví vào Database.' },
        { status: 500 }
      );
    }

    // 3. Notify Admin Telegram
    try {
      const tgCfg = await getTelegramBotConfig();
      if (tgCfg.bot_token && tgCfg.admin_id) {
        const text =
`🔔 <b>[YUKISHOPMXH - KHÁCH BÁO ĐÃ NẠP TIỀN]</b>
🆔 <b>Mã giao dịch:</b> <code>${referenceCode}</code>
💰 <b>Số tiền nạp:</b> <b>+${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ</b>
👤 <b>Khách hàng:</b> <b>${userName}</b> (<code>${userEmail}</code>)
📞 <b>Liên hệ:</b> <b>${userContact}</b>
⚡ <b>Trạng thái:</b> <b>Chờ Admin duyệt nạp ví</b>
⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;

        await fetch(`https://api.telegram.org/bot${tgCfg.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            chat_id: tgCfg.admin_id,
            text,
            parse_mode: 'HTML',
          }),
        });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Đã gửi yêu cầu xác nhận nạp tiền!',
      referenceCode,
      amount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
