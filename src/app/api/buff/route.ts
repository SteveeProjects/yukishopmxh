import { NextResponse } from 'next/server';
import { BUFF_SERVICES } from '@/lib/catalog/buff-data';
import { loadBuffOverrides } from '@/lib/buff-store';
import { resolveBuffServerMeta, type BuffServerOverride } from '@/lib/catalog/buff-badges';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSystemSetting, isSupabaseConfigured } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const fileOverrides = loadBuffOverrides();
    const storedOverrides = await getSystemSetting<Record<string, BuffServerOverride>>('buff_overrides', {});
    const mergedOverrides: Record<string, BuffServerOverride> = { ...fileOverrides, ...storedOverrides };

    try {
      if (isSupabaseConfigured() && supabaseAdmin) {
        const { data } = await supabaseAdmin.from('buff_services').select('server_id, sell_price, status');
        if (data) {
          for (const s of data) {
            const key = String(s.server_id);
            mergedOverrides[key] = {
              ...(mergedOverrides[key] || {}),
              ...(s.sell_price !== undefined ? { retailPrice: Number(s.sell_price) } : {}),
              ...(s.status ? { status: s.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE' } : {}),
            };
          }
        }
      }
    } catch {}

    const servers = [] as Array<{
      id: number;
      name: string;
      cleanName: string;
      platform: string;
      serviceCode: string;
      serviceName: string;
      unit: string;
      retailPrice: number;
      minQty: number;
      maxQty: number;
      status: 'ACTIVE' | 'HIDDEN';
      originBadge: 'Việt' | 'Tây';
      speedBadge: 'Tức thì' | 'Nhanh' | 'Ổn định' | 'Chậm';
      warrantyBadge: string;
      isNoWarranty: boolean;
      note: string;
    }>;

    for (const svc of BUFF_SERVICES) {
      for (const srv of svc.servers) {
        const ov = mergedOverrides[String(srv.id)];
        const meta = resolveBuffServerMeta(srv, ov);
        if (meta.status === 'HIDDEN') continue;

        servers.push({
          id: srv.id,
          name: srv.name,
          cleanName: meta.cleanName,
          platform: svc.platform,
          serviceCode: svc.code,
          serviceName: svc.name,
          unit: svc.unit,
          retailPrice: meta.retailPrice,
          minQty: srv.minQty,
          maxQty: srv.maxQty,
          status: meta.status,
          originBadge: meta.originBadge,
          speedBadge: meta.speedBadge,
          warrantyBadge: meta.warrantyBadge,
          isNoWarranty: meta.isNoWarranty,
          note: meta.serverNote,
        });
      }
    }

    return NextResponse.json({
      success: true,
      overrides: mergedOverrides,
      servers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
