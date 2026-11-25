import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { isSupabaseConfigured } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: List all coupons
export async function GET() {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    let coupons = serverStore.loadCoupons();

    await autoEnsureTables().catch(() => {});

    // Try direct PostgreSQL
    try {
      const pgRes = await queryPostgres('SELECT * FROM public.coupons ORDER BY created_at DESC');
      if (pgRes && pgRes.rows && pgRes.rows.length > 0) {
        const map = new Map(coupons.map((c) => [c.code.toUpperCase(), c]));
        for (const dbC of pgRes.rows) {
          map.set(dbC.code.toUpperCase(), {
            id: dbC.id,
            code: dbC.code.toUpperCase(),
            discount_type: dbC.discount_type,
            discount_value: Number(dbC.discount_value),
            max_discount: dbC.max_discount ? Number(dbC.max_discount) : null,
            min_order_amount: Number(dbC.min_order_amount || 0),
            usage_limit: dbC.usage_limit ? Number(dbC.usage_limit) : null,
            used_count: Number(dbC.used_count || 0),
            applicable_to: dbC.applicable_to || 'ALL',
            is_active: !!dbC.is_active,
            expires_at: dbC.expires_at || null,
            created_at: dbC.created_at,
          });
        }
        coupons = Array.from(map.values());
      }
    } catch (pgErr) {}

    // Sync from Supabase if table exists
    try {
      const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
      if (!isPlaceholder && supabaseAdmin) {
        const { data: dbCoupons, error } = await supabaseAdmin
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && dbCoupons && dbCoupons.length > 0) {
          const map = new Map(coupons.map((c) => [c.code.toUpperCase(), c]));
          for (const dbC of dbCoupons) {
            map.set(dbC.code.toUpperCase(), {
              id: dbC.id,
              code: dbC.code.toUpperCase(),
              discount_type: dbC.discount_type,
              discount_value: Number(dbC.discount_value),
              max_discount: dbC.max_discount ? Number(dbC.max_discount) : null,
              min_order_amount: Number(dbC.min_order_amount || 0),
              usage_limit: dbC.usage_limit ? Number(dbC.usage_limit) : null,
              used_count: Number(dbC.used_count || 0),
              applicable_to: dbC.applicable_to || 'ALL',
              is_active: !!dbC.is_active,
              expires_at: dbC.expires_at || null,
              created_at: dbC.created_at,
            });
          }
          coupons = Array.from(map.values());
        }
      }
    } catch (e) {
      console.warn('[admin/coupons] Supabase GET notice:', e);
    }

    return NextResponse.json({ success: true, coupons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new coupon
export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code || '').trim().toUpperCase();
    const discount_type = body.discount_type === 'FIXED' ? 'FIXED' : 'PERCENT';
    const discount_value = Number(body.discount_value || 0);
    const max_discount = body.max_discount ? Number(body.max_discount) : null;
    const min_order_amount = Number(body.min_order_amount || 0);
    const usage_limit = body.usage_limit ? Number(body.usage_limit) : null;
    const applicable_to = ['ALL', 'PRODUCT', 'BUFF'].includes(body.applicable_to) ? body.applicable_to : 'ALL';
    const is_active = body.is_active !== false;
    const expires_at = body.expires_at || null;

    if (!code) {
      return NextResponse.json({ error: 'Mã giảm giá (Code) không được để trống.' }, { status: 400 });
    }
    if (discount_value <= 0) {
      return NextResponse.json({ error: 'Giá trị giảm giá phải lớn hơn 0.' }, { status: 400 });
    }

    const newCoupon = serverStore.createCoupon({
      code,
      discount_type,
      discount_value,
      max_discount,
      min_order_amount,
      usage_limit,
      applicable_to,
      is_active,
      expires_at,
    });

    // Direct Database Persistence (PostgreSQL & Supabase)
    await autoEnsureTables().catch(() => {});
    try {
      await queryPostgres(
        `INSERT INTO public.coupons (code, discount_type, discount_value, max_discount, min_order_amount, usage_limit, applicable_to, is_active, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (code) DO UPDATE SET
           discount_type = EXCLUDED.discount_type,
           discount_value = EXCLUDED.discount_value,
           max_discount = EXCLUDED.max_discount,
           min_order_amount = EXCLUDED.min_order_amount,
           usage_limit = EXCLUDED.usage_limit,
           applicable_to = EXCLUDED.applicable_to,
           is_active = EXCLUDED.is_active,
           expires_at = EXCLUDED.expires_at`,
        [code, discount_type, discount_value, max_discount, min_order_amount, usage_limit, applicable_to, is_active, expires_at]
      );
    } catch (pgErr) {}

    // Sync to Supabase
    try {
      const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
      if (!isPlaceholder && supabaseAdmin) {
        await supabaseAdmin.from('coupons').upsert(
          {
            code,
            discount_type,
            discount_value,
            max_discount,
            min_order_amount,
            usage_limit,
            applicable_to,
            is_active,
            expires_at,
          },
          { onConflict: 'code' }
        );
      }
    } catch (e) {
      console.warn('[admin/coupons] Supabase POST notice:', e);
    }

    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PUT: Update coupon
export async function PUT(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const urlCode = req.nextUrl.searchParams.get('code') || req.nextUrl.searchParams.get('id');
    const body = await req.json().catch(() => ({}));
    const code = String(urlCode || body.code || body.id || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Mã giảm giá không hợp lệ.' }, { status: 400 });
    }

    const updated = serverStore.updateCoupon(code, body);
    if (!updated) {
      return NextResponse.json({ error: 'Không tìm thấy mã giảm giá.' }, { status: 404 });
    }

    // Direct Database Persistence (PostgreSQL & Supabase)
    await autoEnsureTables().catch(() => {});
    try {
      await queryPostgres(
        `UPDATE public.coupons SET
           discount_type = $2,
           discount_value = $3,
           max_discount = $4,
           min_order_amount = $5,
           usage_limit = $6,
           applicable_to = $7,
           is_active = $8,
           expires_at = $9
         WHERE code = $1`,
        [code, updated.discount_type, updated.discount_value, updated.max_discount, updated.min_order_amount, updated.usage_limit, updated.applicable_to, updated.is_active, updated.expires_at]
      );
    } catch (pgErr) {}

    // Sync to Supabase
    try {
      const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
      if (!isPlaceholder && supabaseAdmin) {
        await supabaseAdmin
          .from('coupons')
          .update({
            discount_type: updated.discount_type,
            discount_value: updated.discount_value,
            max_discount: updated.max_discount,
            min_order_amount: updated.min_order_amount,
            usage_limit: updated.usage_limit,
            applicable_to: updated.applicable_to,
            is_active: updated.is_active,
            expires_at: updated.expires_at,
          })
          .eq('code', code);
      }
    } catch (e) {
      console.warn('[admin/coupons] Supabase PUT notice:', e);
    }

    return NextResponse.json({ success: true, coupon: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete coupon
export async function DELETE(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const urlCode = req.nextUrl.searchParams.get('code') || req.nextUrl.searchParams.get('id');
    const body = await req.json().catch(() => ({}));
    const code = String(urlCode || body.code || body.id || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Mã giảm giá không hợp lệ.' }, { status: 400 });
    }

    serverStore.deleteCoupon(code);

    // Direct Database Persistence (PostgreSQL & Supabase)
    await autoEnsureTables().catch(() => {});
    try {
      await queryPostgres(`DELETE FROM public.coupons WHERE code = $1`, [code]);
    } catch (pgErr) {}

    // Sync to Supabase
    try {
      const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
      if (!isPlaceholder && supabaseAdmin) {
        await supabaseAdmin.from('coupons').delete().eq('code', code);
      }
    } catch (e) {
      console.warn('[admin/coupons] Supabase DELETE notice:', e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
