import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSessionUser } from '@/lib/session-auth';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isStrictOrderOwner(order: any, user: { id: string; email?: string }): boolean {
  if (!order || !user?.id) return false;
  if (order.user_id && order.user_id === user.id) return true;
  if (user.email && order.user_email && String(order.user_email).toLowerCase() === user.email.toLowerCase()) {
    return true;
  }
  return false;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    const localUser = await getSessionUser();
    if (!localUser?.id) {
      return NextResponse.json({ error: 'Yêu cầu đăng nhập để xem đơn hàng.' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest();
    await ensureDatabaseReady().catch(() => {});

    const orderMap = new Map<string, any>();

    // 1. Local cache
    for (const o of serverStore.loadOrders()) {
      if (o?.order_code || o?.id) orderMap.set(o.order_code || o.id, o);
    }

    // 2. PostgreSQL direct query
    try {
      const pgRes = isAdmin
        ? await queryPostgres(`SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 150`)
        : await queryPostgres(
            `SELECT * FROM public.orders WHERE user_id::text = $1 OR ($2 <> '' AND LOWER(COALESCE(user_email, '')) = LOWER($2)) ORDER BY created_at DESC LIMIT 100`,
            [localUser.id, localUser.email || '']
          );
      for (const pgo of pgRes?.rows || []) {
        const key = pgo.order_code || pgo.id;
        if (key) {
          const existing = orderMap.get(key);
          orderMap.set(key, { ...(existing || {}), ...pgo });
        }
      }
    } catch {}

    // 3. Supabase REST fallback
    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        let query = sbAdmin.from('orders').select('*').order('created_at', { ascending: false }).limit(100);
        if (!isAdmin) {
          query = query.eq('user_id', localUser.id);
        }
        const { data: dbOrders } = await query;
        for (const dbo of dbOrders || []) {
          const key = dbo.order_code || dbo.id;
          if (key) {
            const existing = orderMap.get(key);
            orderMap.set(key, { ...(existing || {}), ...dbo });
          }
        }
      }
    } catch (sbErr) {
      console.warn('[orders/route] Supabase query notice:', sbErr);
    }

    const allOrders = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    if (code) {
      const cleanCode = code.trim();
      const matched = allOrders.find((o) => o.order_code === cleanCode || o.id === cleanCode);
      if (!matched) {
        return NextResponse.json({ success: true, orders: [] });
      }

      if (!isAdmin && !isStrictOrderOwner(matched, localUser)) {
        return NextResponse.json(
          { error: 'Bạn không có quyền truy cập thông tin đơn hàng này.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: true, orders: [matched] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    if (isAdmin) {
      return NextResponse.json(
        { success: true, orders: allOrders },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const myOrders = allOrders.filter((o) => isStrictOrderOwner(o, localUser));
    return NextResponse.json(
      { success: true, orders: myOrders },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
