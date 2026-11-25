import { NextRequest, NextResponse } from 'next/server';
import { loadBuffOverrides, saveBuffOverrides } from '@/lib/buff-store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables } from '@/lib/db';
import type { BuffOriginBadge, BuffSpeedBadge } from '@/lib/catalog/buff-badges';
import { isSupabaseConfigured, setSystemSetting } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const serverId = String(body.serverId || body.id || '').trim();
    const retailPrice = Number(body.retailPrice ?? body.sell_price ?? body.price ?? 0);
    const status = String(body.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';

    if (!serverId) {
      return NextResponse.json({ error: 'Thiếu serverId để cập nhật.' }, { status: 400 });
    }
    if (Number.isNaN(retailPrice) || retailPrice < 0) {
      return NextResponse.json({ error: 'Giá bán không hợp lệ.' }, { status: 400 });
    }

    const validOrigin: BuffOriginBadge | undefined =
      body.originBadge === 'Việt' || body.originBadge === 'Tây'
        ? body.originBadge
        : undefined;

    const validSpeed: BuffSpeedBadge | undefined =
      body.speedBadge === 'Tức thì' ||
      body.speedBadge === 'Nhanh' ||
      body.speedBadge === 'Ổn định' ||
      body.speedBadge === 'Chậm'
        ? body.speedBadge
        : undefined;

    const warrantyBadge =
      typeof body.warrantyBadge === 'string' && body.warrantyBadge.trim()
        ? body.warrantyBadge.trim().slice(0, 40)
        : undefined;

    const note =
      typeof body.note === 'string'
        ? body.note.replace(/[<>]/g, '').trim().slice(0, 280)
        : undefined;

    // 1. Update local overrides file
    const overrides = loadBuffOverrides();
    overrides[serverId] = {
      ...(overrides[serverId] || {}),
      retailPrice,
      status,
      ...(validOrigin ? { originBadge: validOrigin } : {}),
      ...(validSpeed ? { speedBadge: validSpeed } : {}),
      ...(warrantyBadge !== undefined ? { warrantyBadge } : {}),
      ...(note !== undefined ? { note } : {}),
      updatedAt: new Date().toISOString(),
    };
    saveBuffOverrides(overrides);
    await setSystemSetting('buff_overrides', overrides);

    // 2. Direct Database Persistence (PostgreSQL & Supabase)
    await autoEnsureTables().catch(() => {});
    try {
      await queryPostgres(
        `INSERT INTO public.buff_services (server_id, platform, service_type, name, sell_price, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (server_id) DO UPDATE SET
           sell_price = EXCLUDED.sell_price,
           status = EXCLUDED.status,
           platform = EXCLUDED.platform,
           service_type = EXCLUDED.service_type,
           name = EXCLUDED.name`,
        [serverId, body.platform || 'BUFF', body.serviceCode || 'BUFF', body.name || `Server #${serverId}`, retailPrice, status]
      );
    } catch (pgErr) {
      console.warn('[buff/update-price] Postgres notice:', pgErr);
    }

    // 3. Sync basic fields to Supabase buff_services
    try {
      if (isSupabaseConfigured() && supabaseAdmin) {
        await supabaseAdmin.from('buff_services').upsert(
          {
            server_id: serverId,
            platform: body.platform || 'BUFF',
            service_type: body.serviceCode || 'BUFF',
            name: body.name || `Server #${serverId}`,
            sell_price: retailPrice,
            status,
          },
          { onConflict: 'server_id' }
        );
      }
    } catch (sbErr) {
      console.warn('[buff/update-price] Supabase notice:', sbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật Server #${serverId} thành công! Giá mới: ${new Intl.NumberFormat('vi-VN').format(retailPrice)} đ`,
      serverId,
      override: overrides[serverId],
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
