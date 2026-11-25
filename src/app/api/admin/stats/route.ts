import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDayKey(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export async function GET() {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await ensureDatabaseReady().catch(() => {});

    const localOrders = serverStore.loadOrders();
    const localTopups = serverStore.loadTopups();

    const orderMap = new Map<string, any>();
    for (const o of localOrders) {
      orderMap.set(o.order_code || o.id, o);
    }

    const topupMap = new Map<string, any>();
    for (const t of localTopups) {
      topupMap.set(t.code || t.id, t);
    }

    try {
      const [pgOrd, pgDep] = await Promise.all([
        queryPostgres(`SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 300`),
        queryPostgres(`SELECT * FROM public.deposit_requests ORDER BY created_at DESC LIMIT 300`),
      ]);
      for (const o of pgOrd?.rows || []) {
        const key = o.order_code || o.id;
        if (key) orderMap.set(key, { ...(orderMap.get(key) || {}), ...o });
      }
      for (const d of pgDep?.rows || []) {
        const key = d.request_code || d.transfer_code || d.id;
        if (key) {
          topupMap.set(key, {
            code: key,
            amount: Number(d.amount || 0),
            status: d.status,
            created_at: d.created_at,
          });
        }
      }
    } catch {}

    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        const [{ data: dbOrders }, { data: dbDeps }] = await Promise.all([
          sbAdmin.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
          sbAdmin.from('deposit_requests').select('*').order('created_at', { ascending: false }).limit(200),
        ]);

        for (const o of dbOrders || []) {
          const key = o.order_code || o.id;
          if (key && !orderMap.has(key)) orderMap.set(key, o);
        }
        for (const d of dbDeps || []) {
          const key = d.request_code || d.transfer_code || d.id;
          if (key && !topupMap.has(key)) {
            topupMap.set(key, {
              code: key,
              amount: Number(d.amount || 0),
              status: d.status,
              created_at: d.created_at,
            });
          }
        }
      }
    } catch {}

    const allOrders = Array.from(orderMap.values()).filter(
      (o) => !String(o.sku || '').startsWith('TEST-')
    );
    const allTopups = Array.from(topupMap.values());

    const completedRevenue = allOrders
      .filter(
        (o) =>
          ['completed', 'approved'].includes(String(o.status || '').toLowerCase()) &&
          o.order_type !== 'DEPOSIT' &&
          o.service_type !== 'DEPOSIT' &&
          o.service_type !== 'NAP_VI'
      )
      .reduce((sum, o) => sum + (Number(o.total_amount || o.amount) || 0), 0);

    const totalDeposits = allTopups
      .filter((t) => ['approved', 'completed'].includes(String(t.status || '').toLowerCase()))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const pendingOrdersCount = allOrders.filter((o) =>
      ['pending', 'waiting_confirm'].includes(String(o.status || '').toLowerCase())
    ).length;

    const pendingWarrantyCount = allOrders.filter(
      (o) => o.warranty_claimed && (!o.warranty_status || o.warranty_status === 'PENDING')
    ).length;

    const days: Array<{ key: string; label: string; revenue: number; topups: number; ordersCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400 * 1000);
      const key = getDayKey(d);
      const label = d.toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
      });
      days.push({ key, label, revenue: 0, topups: 0, ordersCount: 0 });
    }

    const dayIndex = new Map(days.map((d, idx) => [d.key, idx]));

    for (const o of allOrders) {
      const k = getDayKey(o.created_at);
      const idx = dayIndex.get(k);
      if (
        idx !== undefined &&
        o.order_type !== 'DEPOSIT' &&
        o.service_type !== 'DEPOSIT' &&
        o.service_type !== 'NAP_VI'
      ) {
        days[idx].ordersCount += 1;
        if (['completed', 'approved'].includes(String(o.status || '').toLowerCase())) {
          days[idx].revenue += Number(o.total_amount || o.amount) || 0;
        }
      }
    }

    for (const t of allTopups) {
      const k = getDayKey(t.created_at);
      const idx = dayIndex.get(k);
      if (idx !== undefined && ['approved', 'completed'].includes(String(t.status || '').toLowerCase())) {
        days[idx].topups += Number(t.amount) || 0;
      }
    }

    return NextResponse.json(
      {
        success: true,
        kpis: {
          completedRevenue,
          totalDeposits,
          pendingOrdersCount,
          pendingWarrantyCount,
          totalOrdersCount: allOrders.length,
        },
        series: days,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi tải thống kê.' }, { status: 500 });
  }
}
