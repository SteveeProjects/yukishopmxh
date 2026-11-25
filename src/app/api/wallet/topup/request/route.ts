import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/session-auth';
import { ensureDatabaseReady, queryPostgres, isDatabaseConfigured } from '@/lib/autoMigrate';
import { nextSequentialDepositCode } from '@/lib/db-persistence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();

    if (!currentUser?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập trước khi nạp tiền.' },
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);

    if (!amount || Number.isNaN(amount) || amount < 10000 || amount > 2000000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Hạn mức nạp tiền từ 10.000 VNĐ đến 2.000.000 VNĐ cho mỗi lần tạo đơn.',
          },
        },
        { status: 400 }
      );
    }

    await ensureDatabaseReady().catch(() => {});

    const userHint =
      currentUser.telegramId ||
      currentUser.username ||
      currentUser.id.slice(-6);
    const { code: referenceCode, sequence, orderNumber } = await nextSequentialDepositCode(userHint);
    const nowISO = new Date().toISOString();

    const paymentInfo = {
      bankName: 'ZaloPay',
      accountNumber: '99ZP26265M78019191',
      accountName: 'ZALOPAY_NGUYEN THAI TU',
      phoneNumber: '0385180629',
    };

    const qrUrl = `https://api.vietqr.io/image/970454-${paymentInfo.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(referenceCode)}&accountName=ZALOPAY_NGUYEN%20THAI%20TU`;

    const userId = currentUser.id;
    const userEmail = currentUser.email || '';
    const userName = currentUser.fullName || currentUser.username || 'Khách Hàng';
    const userContact = currentUser.phone || currentUser.telegramId || currentUser.email || 'ZaloPay';

    let dbWriteSucceeded = false;

    // 1. Insert into PostgreSQL deposit_requests & orders (always valid UUID for id)
    try {
      const depRowId = crypto.randomUUID();
      const ordRowId = crypto.randomUUID();
      const depPg = await queryPostgres(
        `INSERT INTO public.deposit_requests
          (id, request_code, order_number, user_id, username, user_email, user_name, user_contact, amount, transfer_code, transfer_content, bank_code, payment_method, status, telegram_notified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $2, $2, 'ZALOPAY', 'VIETQR', 'pending', false, NOW(), NOW())
         ON CONFLICT (request_code) DO NOTHING`,
        [depRowId, referenceCode, orderNumber, userId, currentUser.username || userName, userEmail, userName, userContact, amount]
      );

      await queryPostgres(
        `INSERT INTO public.orders
          (id, order_code, order_number, user_id, user_email, user_name, user_contact, delivery_contact, telegram_id, order_type, service_type, item_name, product_sku, sku, amount, total_amount, quantity, status, paid, notes, telegram_notified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, 'DEPOSIT', 'NAP_VI', $9, 'TOPUP-VIETQR', 'TOPUP-ZALOPAY', $10, $10, 1, 'pending', false, $11, false, NOW(), NOW())
         ON CONFLICT (order_code) DO NOTHING`,
        [
          ordRowId,
          referenceCode,
          orderNumber,
          userId,
          userEmail,
          userName,
          userContact,
          currentUser.telegramId || null,
          `Nạp ví ZaloPay VietQR #${sequence} (${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ)`,
          amount,
          `Mã nạp ví theo số đơn #${sequence}: ${referenceCode}`,
        ]
      );
      if (depPg !== null) dbWriteSucceeded = true;
    } catch (pgErr) {
      console.warn('[topup/request] Postgres insert notice:', pgErr);
    }

    // 2. Save in Supabase REST if configured (omit id so Postgres/Supabase UUID default applies cleanly)
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const { error: depErr } = await supabaseAdmin.from('deposit_requests').upsert(
          {
            request_code: referenceCode,
            order_number: orderNumber,
            user_id: userId,
            username: currentUser.username || userName,
            user_email: userEmail,
            user_name: userName,
            user_contact: userContact,
            amount,
            transfer_code: referenceCode,
            transfer_content: referenceCode,
            bank_code: 'ZALOPAY',
            payment_method: 'VIETQR',
            status: 'pending',
            telegram_notified: false,
            created_at: nowISO,
            updated_at: nowISO,
          },
          { onConflict: 'request_code' }
        );

        await supabaseAdmin.from('orders').upsert(
          {
            order_code: referenceCode,
            order_number: orderNumber,
            user_id: userId,
            user_email: userEmail,
            user_name: userName,
            user_contact: userContact,
            delivery_contact: userContact,
            telegram_id: currentUser.telegramId || null,
            order_type: 'DEPOSIT',
            service_type: 'NAP_VI',
            item_name: `Nạp ví ZaloPay QR #${sequence} (${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ)`,
            product_sku: 'TOPUP-VIETQR',
            sku: 'TOPUP-ZALOPAY',
            amount,
            total_amount: amount,
            quantity: 1,
            status: 'pending',
            paid: false,
            notes: `Mã nạp ví theo số đơn #${sequence}: ${referenceCode}`,
            telegram_notified: false,
            created_at: nowISO,
            updated_at: nowISO,
          },
          { onConflict: 'order_code' }
        );

        if (!depErr) dbWriteSucceeded = true;
      }
    } catch (sbErr) {
      console.warn('[topup/request] Supabase insert notice:', sbErr);
    }

    if (isDatabaseConfigured() && !dbWriteSucceeded) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DB_WRITE_FAILED',
            message: 'Không thể lưu đơn nạp tiền vào cơ sở dữ liệu. Vui lòng thử lại sau.',
          },
        },
        { status: 500 }
      );
    }

    // 3. Mirror in local writable cache
    try {
      serverStore.createTopup({
        id: referenceCode,
        code: referenceCode,
        user_id: currentUser.id,
        user_name: userName,
        user_contact: userContact,
        amount,
        bank: paymentInfo.bankName,
        account_number: paymentInfo.accountNumber,
        account_name: paymentInfo.accountName,
        telegram_notified: false,
        status: 'pending',
        created_at: nowISO,
      });

      serverStore.createOrder({
        id: referenceCode,
        order_code: referenceCode,
        user_id: currentUser.id,
        user_name: userName,
        user_contact: userContact,
        delivery_contact: userContact,
        telegram_id: currentUser.telegramId || undefined,
        service_type: 'NAP_VI',
        item_name: `Nạp ví ZaloPay QR #${sequence} (${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ)`,
        sku: 'TOPUP-ZALOPAY',
        quantity: 1,
        target_link: 'ZaloPay VietQR',
        total_amount: amount,
        paid: false,
        deducted_balance: 0,
        telegram_notified: false,
        status: 'pending',
        notes: `Mã nạp ví theo số đơn #${sequence}: ${referenceCode}`,
        created_at: nowISO,
      });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        data: {
          referenceCode,
          sequenceNumber: sequence,
          orderNumber,
          amount,
          bankName: paymentInfo.bankName,
          accountNumber: paymentInfo.accountNumber,
          accountName: paymentInfo.accountName,
          phoneNumber: paymentInfo.phoneNumber,
          qrUrl,
          status: 'pending',
        },
        timestamp: nowISO,
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[topup/request] Exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'Lỗi hệ thống khi tạo đơn nạp tiền.' },
      },
      { status: 500 }
    );
  }
}
