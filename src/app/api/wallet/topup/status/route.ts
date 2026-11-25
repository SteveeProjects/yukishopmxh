import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import { getTelegramBotConfig } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get('code') || '').trim();

    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
    }

    await ensureDatabaseReady().catch(() => {});

    const localOrders = serverStore.loadOrders();
    const localTopups = serverStore.loadTopups();
    const order = localOrders.find((o) => o.order_code === code || o.id === code);
    const topup = localTopups.find((t) => t.code === code || t.id === code);

    let status: string = order?.status || topup?.status || 'pending';
    let paid = order?.paid || false;

    try {
      const pgDep = await queryPostgres(
        `SELECT status FROM public.deposit_requests WHERE request_code = $1 OR transfer_code = $1 OR id = $1 LIMIT 1`,
        [code]
      );
      if (pgDep?.rows?.[0]?.status) {
        status = String(pgDep.rows[0].status).toLowerCase();
        if (status === 'approved' || status === 'completed') paid = true;
      } else {
        const pgOrd = await queryPostgres(
          `SELECT status, paid FROM public.orders WHERE order_code = $1 OR id = $1 LIMIT 1`,
          [code]
        );
        if (pgOrd?.rows?.[0]?.status) {
          status = String(pgOrd.rows[0].status).toLowerCase();
          paid = Boolean(pgOrd.rows[0].paid);
        }
      }
    } catch {}

    const safeCode = code.replace(/[^A-Za-z0-9_-]/g, '');
    const sbAdmin = getSupabaseAdmin();
    if (!['completed', 'approved'].includes(status) && sbAdmin && safeCode) {
      try {
        const { data: dbOrd } = await sbAdmin
          .from('orders')
          .select('status, paid')
          .eq('order_code', safeCode)
          .maybeSingle();
        if (dbOrd?.status) {
          status = String(dbOrd.status).toLowerCase();
          paid = Boolean(dbOrd.paid);
        } else {
          const { data: dbDep } = await sbAdmin
            .from('deposit_requests')
            .select('status')
            .eq('request_code', safeCode)
            .maybeSingle();
          if (dbDep?.status) {
            status = String(dbDep.status).toLowerCase();
          }
        }
      } catch {}
    }

    const isCompleted = status === 'completed' || status === 'approved';
    const user = await getSessionUser().catch(() => null);

    return NextResponse.json(
      {
        success: true,
        code,
        status: isCompleted ? 'completed' : status,
        paid: paid || isCompleted,
        isCompleted,
        balance: user ? Number(user.balance || 0) : undefined,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
