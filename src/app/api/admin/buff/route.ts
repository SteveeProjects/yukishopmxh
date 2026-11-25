import { NextResponse } from 'next/server';
import { BUFF_SERVICES } from '@/lib/catalog/buff-data';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadBuffOverrides } from '@/lib/buff-store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  resolveBuffServerMeta,
  type BuffOriginBadge,
  type BuffServerOverride,
  type BuffSpeedBadge,
} from '@/lib/catalog/buff-badges';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const fileOverrides = loadBuffOverrides();
    const dbOverrides: Record<string, BuffServerOverride> = {};

    try {
      const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
      if (!isPlaceholder && supabaseAdmin) {
        const { data } = await supabaseAdmin.from('buff_services').select('*');
        if (data) {
          for (const s of data) {
            dbOverrides[String(s.server_id)] = {
              retailPrice: Number(s.sell_price),
              status: s.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE',
            };
          }
        }
      }
    } catch {}

    const allServers: Array<{
      id: number;
      name: string;
      cleanName: string;
      platform: string;
      serviceCode: string;
      serviceName: string;
      unit: string;
      originalPrice: number;
      retailPrice: number;
      minQty: number;
      maxQty: number;
      status: 'ACTIVE' | 'HIDDEN';
      symbols: string[];
      note: string;
      originBadge: BuffOriginBadge;
      speedBadge: BuffSpeedBadge;
      warrantyBadge: string;
    }> = [];

    for (const svc of BUFF_SERVICES) {
      for (const srv of svc.servers) {
        const key = String(srv.id);
        const combinedOverride: BuffServerOverride = {
          ...(fileOverrides[key] || {}),
          ...(dbOverrides[key] || {}),
        };
        const meta = resolveBuffServerMeta(srv, combinedOverride);

        allServers.push({
          id: srv.id,
          name: srv.name,
          cleanName: meta.cleanName,
          platform: svc.platform,
          serviceCode: svc.code,
          serviceName: svc.name,
          unit: svc.unit,
          originalPrice: srv.originalPrice,
          retailPrice: meta.retailPrice,
          minQty: srv.minQty,
          maxQty: srv.maxQty,
          status: meta.status,
          symbols: srv.symbols,
          note: meta.serverNote,
          originBadge: meta.originBadge,
          speedBadge: meta.speedBadge,
          warrantyBadge: meta.warrantyBadge,
        });
      }
    }

    return NextResponse.json({ success: true, servers: allServers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
