import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import { serverStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const referenceCode = String(body.referenceCode || body.code || '').trim();

    if (!referenceCode) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'MISSING_REF', message: 'Thiếu mã đơn nạp tiền' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    await ensureDatabaseReady().catch(() => {});
    const nowISO = new Date().toISOString();
    const isAdmin = sessionUser.role === 'admin';

    // Update PostgreSQL
    try {
      if (isAdmin) {
        await queryPostgres(
          `UPDATE public.deposit_requests SET status = 'cancelled', updated_at = NOW()
           WHERE (request_code = $1 OR transfer_code = $1 OR id::text = $1) AND status IN ('pending', 'waiting_confirm')`,
          [referenceCode]
        );
        await queryPostgres(
          `UPDATE public.orders SET status = 'cancelled', updated_at = NOW()
           WHERE (order_code = $1 OR id::text = $1) AND status IN ('pending', 'waiting_confirm')`,
          [referenceCode]
        );
      } else {
        await queryPostgres(
          `UPDATE public.deposit_requests SET status = 'cancelled', updated_at = NOW()
           WHERE (request_code = $1 OR transfer_code = $1 OR id::text = $1) AND user_id::text = $2 AND status IN ('pending', 'waiting_confirm')`,
          [referenceCode, sessionUser.id]
        );
        await queryPostgres(
          `UPDATE public.orders SET status = 'cancelled', updated_at = NOW()
           WHERE (order_code = $1 OR id::text = $1) AND user_id::text = $2 AND status IN ('pending', 'waiting_confirm')`,
          [referenceCode, sessionUser.id]
        );
      }
    } catch {}

    // Update Supabase
    const safeRef = referenceCode.replace(/[^A-Za-z0-9_-]/g, '');
    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin && safeRef) {
      let depQuery = sbAdmin
        .from('deposit_requests')
        .update({ status: 'cancelled', updated_at: nowISO })
        .eq('request_code', safeRef)
        .in('status', ['pending', 'waiting_confirm']);
      if (!isAdmin) depQuery = depQuery.eq('user_id', sessionUser.id);
      await depQuery;

      let ordQuery = sbAdmin
        .from('orders')
        .update({ status: 'cancelled', updated_at: nowISO })
        .eq('order_code', safeRef)
        .in('status', ['pending', 'waiting_confirm']);
      if (!isAdmin) ordQuery = ordQuery.eq('user_id', sessionUser.id);
      await ordQuery;
    }

    // Update local store cache (check ownership)
    const ord = serverStore.findOrderByCode(referenceCode);
    if (ord && (isAdmin || ord.user_id === sessionUser.id) && ['pending', 'waiting_confirm'].includes(String(ord.status))) {
      serverStore.updateOrderStatus(referenceCode, 'cancelled');
    }
    const topups = serverStore.loadTopups();
    const top = topups.find((t) => t.code === referenceCode || t.id === referenceCode);
    if (top && (isAdmin || top.user_id === sessionUser.id) && top.status === 'pending') {
      serverStore.updateTopupStatus(referenceCode, 'rejected');
    }

    return NextResponse.json({
      success: true,
      data: {
        referenceCode,
        status: 'cancelled',
        message: 'Đã hủy đơn nạp thành công.',
      },
      error: null,
      timestamp: nowISO,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: err instanceof Error ? err.message : 'Lỗi máy chủ' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
