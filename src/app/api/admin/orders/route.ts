import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Vui lòng đăng nhập tài khoản Admin.' },
        { status: 403 }
      );
    }

    await ensureDatabaseReady().catch(() => {});

    // 1. Load local orders and topups
    const localOrders = serverStore.loadOrders();
    const localTopups = serverStore.loadTopups();

    // 2. Query PostgreSQL directly
    let pgOrders: any[] = [];
    let pgDeposits: any[] = [];
    try {
      const resOrders = await queryPostgres(
        `SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 150`
      );
      if (resOrders?.rows) pgOrders = resOrders.rows;

      const resDeps = await queryPostgres(
        `SELECT * FROM public.deposit_requests ORDER BY created_at DESC LIMIT 100`
      );
      if (resDeps?.rows) pgDeposits = resDeps.rows;
    } catch (pgErr) {
      console.warn('[admin/orders] Postgres query notice:', pgErr);
    }

    // 3. Load Supabase orders & deposits (Service Role bypass RLS)
    let dbOrders: any[] = [];
    let userProfilesMap = new Map<string, any>();

    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        try {
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, telegram_id, email, phone');
          if (profiles) {
            for (const p of profiles) {
              userProfilesMap.set(p.id, p);
            }
          }
        } catch {}

        const { data: orders } = await supabaseAdmin
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(150);

        if (orders) dbOrders = orders;

        const { data: deposits } = await supabaseAdmin
          .from('deposit_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (deposits) {
          for (const d of deposits) {
            dbOrders.push({
              id: d.id,
              order_code: d.request_code || d.transfer_code || d.id,
              user_id: d.user_id,
              user_email: d.user_email,
              user_name: d.user_name || 'Khách Hàng',
              user_contact: d.user_contact || d.user_email || 'Chưa cập nhật',
              delivery_contact: d.user_contact || d.user_email || 'Chưa cập nhật',
              order_type: 'NAP_VI',
              service_type: 'NAP_VI',
              item_name: `Nạp tiền ví VietQR (+${new Intl.NumberFormat('vi-VN').format(d.amount)} đ)`,
              product_sku: 'TOPUP-VIETQR',
              sku: 'TOPUP-VIETQR',
              quantity: 1,
              total_amount: Number(d.amount || 0),
              target_link: 'Ví Web',
              paid: d.status === 'completed' || d.status === 'approved',
              status: d.status || 'pending',
              notes: d.notes || '',
              created_at: d.created_at,
              updated_at: d.updated_at,
            });
          }
        }
      }
    } catch (e) {
      console.warn('[admin/orders] Supabase fetch notice:', e);
    }

    // 4. Merge orders uniquely by order_code or id
    const seen = new Set<string>();
    const merged: any[] = [];

    // Local orders first
    for (const o of localOrders) {
      const key = o.order_code || o.id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          ...o,
          status: o.status || 'pending',
        });
      }
    }

    // Local topups
    for (const t of localTopups) {
      const key = t.code || t.id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          id: t.id,
          order_code: key,
          user_id: t.user_id,
          user_name: t.user_name || 'Khách Hàng',
          user_contact: t.user_contact || 'Chưa cập nhật',
          delivery_contact: t.user_contact || 'Chưa cập nhật',
          service_type: 'NAP_VI',
          order_type: 'NAP_VI',
          item_name: `Nạp tiền ví VietQR (+${new Intl.NumberFormat('vi-VN').format(t.amount)} đ)`,
          sku: 'TOPUP-VIETQR',
          quantity: 1,
          total_amount: Number(t.amount || 0),
          target_link: 'Ví Web',
          paid: t.status === 'approved',
          status: t.status || 'pending',
          notes: '',
          created_at: t.created_at,
          updated_at: t.updated_at,
        });
      }
    }

    // Postgres orders
    for (const o of pgOrders) {
      const key = o.order_code || o.id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          id: o.id,
          order_code: o.order_code || o.id,
          user_id: o.user_id,
          user_name: o.user_name || 'Khách Hàng',
          user_contact: o.user_contact || o.user_email || 'Chưa cập nhật',
          delivery_contact: o.delivery_contact || o.user_contact || 'Chưa cập nhật',
          service_type: o.service_type || o.order_type || 'MUA_SAN_PHAM',
          order_type: o.order_type || 'PRODUCT',
          item_name: o.item_name || 'Dịch vụ YukiShopMXH',
          sku: o.sku || o.product_sku || 'SKU',
          quantity: o.quantity || 1,
          total_amount: Number(o.total_amount ?? o.amount ?? 0),
          target_link: o.target_link || 'Website',
          paid: o.paid || o.status === 'completed',
          status: o.status || 'pending',
          notes: o.notes || '',
          created_at: o.created_at,
          updated_at: o.updated_at,
        });
      }
    }

    // Postgres deposits
    for (const d of pgDeposits) {
      const key = d.request_code || d.transfer_code || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          id: d.id,
          order_code: key,
          user_id: d.user_id,
          user_name: d.user_name || 'Khách Hàng',
          user_contact: d.user_contact || d.user_email || 'Chưa cập nhật',
          delivery_contact: d.user_contact || 'Chưa cập nhật',
          service_type: 'NAP_VI',
          order_type: 'NAP_VI',
          item_name: `Nạp tiền ví VietQR (+${new Intl.NumberFormat('vi-VN').format(d.amount)} đ)`,
          sku: 'TOPUP-VIETQR',
          quantity: 1,
          total_amount: Number(d.amount || 0),
          target_link: 'Ví Web',
          paid: d.status === 'approved' || d.status === 'completed',
          status: d.status || 'pending',
          notes: '',
          created_at: d.created_at,
          updated_at: d.updated_at,
        });
      }
    }

    // Supabase orders
    for (const o of dbOrders) {
      const key = o.order_code || o.id;
      if (!seen.has(key)) {
        seen.add(key);
        const profile = o.user_id ? userProfilesMap.get(o.user_id) : null;
        merged.push({
          id: o.id,
          order_code: o.order_code || o.id,
          user_id: o.user_id,
          user_name: profile?.full_name || profile?.telegram_id || profile?.email || 'Khách Hàng',
          user_contact: profile?.phone || profile?.telegram_id || profile?.email || o.delivery_contact || 'Chưa cập nhật',
          delivery_contact: o.delivery_contact || profile?.phone || profile?.telegram_id || profile?.email || 'Chưa cập nhật',
          service_type: o.order_type || 'MUA_SAN_PHAM',
          item_name: o.item_name || 'Dịch vụ YukiShopMXH',
          sku: o.sku || 'SKU',
          quantity: o.quantity || 1,
          total_amount: Number(o.total_amount ?? o.amount ?? 0),
          target_link: o.target_link || 'Website',
          paid: o.order_type !== 'DEPOSIT',
          status: o.status || 'pending',
          notes: o.notes || '',
          created_at: o.created_at,
          updated_at: o.updated_at,
        });
      }
    }

    // Sort by created_at descending
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Count pending orders
    const pendingCount = merged.filter(
      (o) => o.status === 'pending' || o.status === 'waiting_confirm'
    ).length;

    return NextResponse.json({
      success: true,
      orders: merged,
      pending_count: pendingCount,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
