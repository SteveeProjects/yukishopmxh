import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables, isDatabaseConfigured } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getUnifiedCatalogData } from '@/lib/catalog/server-catalog';
import { sanitizePlainText } from '@/lib/security-sanitize';
import { normalizeDeliveryMode } from '@/lib/catalog/delivery-modes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const data = await getUnifiedCatalogData({ includeInternal: true });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const sku = sanitizePlainText(body.sku || `YUKI-${Date.now().toString().slice(-6)}`, 80).toUpperCase();
    const name = sanitizePlainText(body.name || '', 160);
    const category = sanitizePlainText(body.category || body.display_section || 'Bản quyền', 80);
    const display_section = sanitizePlainText(
      body.display_section || body.category || 'Trang Chủ - Sản Phẩm Nổi Bật',
      80
    );
    const price = Number(body.sell_price ?? body.price ?? 0);
    const original_price = Math.max(0, Number(body.original_price ?? body.originalPrice ?? 0));
    const stock = Math.max(0, Math.floor(Number(body.stock ?? 99)));
    const sort_order = Math.max(0, Math.floor(Number(body.sort_order ?? 0)));
    const status = String(body.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';
    const description = sanitizePlainText(body.description || '', 500) || 'Không bảo hành (KBH)';
    const icon = sanitizePlainText(body.icon || body.iconPath || '', 300) || '/assets/icons/products/chatgpt.jpg';
    const supplier_name = sanitizePlainText(body.supplier_name || 'Kho Bản Quyền Yuki', 120);
    const cost_price = Math.max(0, Number(body.cost_price ?? Math.round(price * 0.7)));
    const warranty_days = body.warranty_days !== undefined ? Math.max(0, Number(body.warranty_days)) : 30;
    const rawDelivery = sanitizePlainText(body.delivery_mode || body.input_type || 'admin_deliver', 40);
    const delivery_mode = normalizeDeliveryMode(rawDelivery, sku);
    const custom_input_label = sanitizePlainText(body.custom_input_label || '', 200);
    const fulfillment_mode =
      String(body.fulfillment_mode || 'MANUAL').toUpperCase() === 'AUTO' ? 'AUTO' : 'MANUAL';
    const allow_voucher =
      body.allow_voucher !== undefined
        ? Boolean(body.allow_voucher)
        : body.allowVoucher !== undefined
        ? Boolean(body.allowVoucher)
        : !sku.includes('API-TOOL-SMS');

    if (!name) {
      return NextResponse.json({ error: 'Tên sản phẩm không được để trống.' }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Giá bán sản phẩm phải lớn hơn 0đ.' }, { status: 400 });
    }

    const newItem = {
      sku,
      name,
      category,
      display_section,
      price,
      sell_price: price,
      original_price,
      stock,
      sort_order,
      status,
      description,
      icon,
      supplier_name,
      cost_price,
      warranty_days,
      input_type: delivery_mode,
      delivery_mode,
      custom_input_label,
      fulfillment_mode,
      allow_voucher,
      updatedAt: new Date().toISOString(),
    };

    let dbWriteOk = false;
    await autoEnsureTables().catch(() => {});

    try {
      const pgRes = await queryPostgres(
        `INSERT INTO public.products (
          id, sku, name, category, display_section, price, sell_price, original_price, cost_price,
          supplier_name, stock, sort_order, status, description, icon, warranty_days,
          input_type, delivery_mode, custom_input_label, fulfillment_mode, allow_voucher, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16, $17, $18, $19, now())
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           display_section = EXCLUDED.display_section,
           price = EXCLUDED.price,
           sell_price = EXCLUDED.sell_price,
           original_price = EXCLUDED.original_price,
           cost_price = EXCLUDED.cost_price,
           supplier_name = EXCLUDED.supplier_name,
           stock = EXCLUDED.stock,
           sort_order = EXCLUDED.sort_order,
           status = EXCLUDED.status,
           description = EXCLUDED.description,
           icon = EXCLUDED.icon,
           warranty_days = EXCLUDED.warranty_days,
           input_type = EXCLUDED.input_type,
           delivery_mode = EXCLUDED.delivery_mode,
           custom_input_label = EXCLUDED.custom_input_label,
           fulfillment_mode = EXCLUDED.fulfillment_mode,
           allow_voucher = EXCLUDED.allow_voucher,
           updated_at = now()`,
        [
          crypto.randomUUID(),
          sku,
          name,
          category,
          display_section,
          price,
          original_price,
          cost_price,
          supplier_name,
          stock,
          sort_order,
          status,
          description,
          icon,
          warranty_days,
          delivery_mode,
          custom_input_label,
          fulfillment_mode,
          allow_voucher,
        ]
      );
      if (pgRes !== null) dbWriteOk = true;
    } catch (pgErr) {
      console.warn('[catalog] Postgres POST upsert notice:', pgErr);
    }

    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        const { error } = await sbAdmin.from('products').upsert(
          {
            sku,
            name,
            category,
            display_section,
            price,
            sell_price: price,
            original_price,
            cost_price,
            stock,
            sort_order,
            status,
            description,
            icon,
            warranty_days,
            input_type: delivery_mode,
            delivery_mode,
            custom_input_label,
            fulfillment_mode,
            allow_voucher,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'sku' }
        );
        if (!error) dbWriteOk = true;
      }
    } catch (sbErr) {
      console.warn('[catalog] Supabase POST upsert notice:', sbErr);
    }

    if (isDatabaseConfigured() && !dbWriteOk) {
      return NextResponse.json(
        { error: 'Không thể lưu sản phẩm vào Database (lỗi ghi PostgreSQL/Supabase).' },
        { status: 500 }
      );
    }

    const overrides = serverStore.loadCatalogOverrides();
    overrides.deletedIds = (overrides.deletedIds || []).filter((id: string) => id !== sku);
    if (!overrides.customItems) overrides.customItems = [];
    const existingIndex = overrides.customItems.findIndex((c: any) => c.sku === sku);
    if (existingIndex >= 0) {
      overrides.customItems[existingIndex] = newItem;
    } else {
      overrides.customItems.unshift(newItem);
    }
    serverStore.saveCatalogOverrides(overrides);

    return NextResponse.json({ success: true, product: newItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const sku = sanitizePlainText(body.sku || body.id || '', 80).toUpperCase();
    const name = sanitizePlainText(body.name || '', 160);
    const price = Number(body.sell_price ?? body.price ?? 0);
    const original_price = Math.max(0, Number(body.original_price ?? body.originalPrice ?? 0));
    const stock = Math.max(0, Math.floor(Number(body.stock ?? 99)));
    const sort_order = body.sort_order !== undefined ? Math.max(0, Math.floor(Number(body.sort_order))) : undefined;
    const status = String(body.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';
    const category = sanitizePlainText(body.category || body.display_section || 'Bản quyền', 80);
    const display_section = sanitizePlainText(
      body.display_section || body.category || 'Trang Chủ - Sản Phẩm Nổi Bật',
      80
    );
    const description =
      body.description !== undefined
        ? sanitizePlainText(body.description, 500) || 'Không bảo hành (KBH)'
        : undefined;
    const icon = body.icon !== undefined ? sanitizePlainText(body.icon, 300) : undefined;
    const supplier_name =
      body.supplier_name !== undefined ? sanitizePlainText(body.supplier_name, 120) : undefined;
    const cost_price = body.cost_price !== undefined ? Math.max(0, Number(body.cost_price)) : undefined;
    const warranty_days =
      body.warranty_days !== undefined ? Math.max(0, Number(body.warranty_days)) : undefined;
    const rawDelivery =
      body.delivery_mode !== undefined
        ? sanitizePlainText(body.delivery_mode, 40)
        : body.input_type !== undefined
        ? sanitizePlainText(body.input_type, 40)
        : undefined;
    const delivery_mode = rawDelivery !== undefined ? normalizeDeliveryMode(rawDelivery, sku) : undefined;
    const custom_input_label =
      body.custom_input_label !== undefined ? sanitizePlainText(body.custom_input_label, 200) : undefined;
    const fulfillment_mode =
      body.fulfillment_mode !== undefined
        ? String(body.fulfillment_mode).toUpperCase() === 'AUTO'
          ? 'AUTO'
          : 'MANUAL'
        : undefined;
    const allow_voucher =
      body.allow_voucher !== undefined
        ? Boolean(body.allow_voucher)
        : body.allowVoucher !== undefined
        ? Boolean(body.allowVoucher)
        : undefined;

    if (!sku) {
      return NextResponse.json({ error: 'Thiếu mã SKU sản phẩm cần cập nhật.' }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Giá bán sản phẩm phải lớn hơn 0đ.' }, { status: 400 });
    }

    let dbWriteOk = false;
    await autoEnsureTables().catch(() => {});

    try {
      const pgRes = await queryPostgres(
        `INSERT INTO public.products (
          id, sku, name, category, display_section, price, sell_price, original_price, stock, sort_order,
          status, description, icon, warranty_days, input_type, delivery_mode, custom_input_label, fulfillment_mode, allow_voucher, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, $15, $16, $17, now())
         ON CONFLICT (sku) DO UPDATE SET
           price = EXCLUDED.price,
           sell_price = EXCLUDED.sell_price,
           original_price = EXCLUDED.original_price,
           stock = EXCLUDED.stock,
           sort_order = COALESCE($9, public.products.sort_order),
           status = EXCLUDED.status,
           name = COALESCE(NULLIF(EXCLUDED.name, ''), public.products.name),
           category = COALESCE(NULLIF(EXCLUDED.category, ''), public.products.category),
           display_section = COALESCE(NULLIF(EXCLUDED.display_section, ''), public.products.display_section),
           description = COALESCE(NULLIF(EXCLUDED.description, ''), public.products.description),
           icon = COALESCE(NULLIF(EXCLUDED.icon, ''), public.products.icon),
           warranty_days = COALESCE($13, public.products.warranty_days),
           input_type = COALESCE(NULLIF($14, ''), public.products.input_type),
           delivery_mode = COALESCE(NULLIF($14, ''), public.products.delivery_mode),
           custom_input_label = COALESCE($15, public.products.custom_input_label),
           fulfillment_mode = COALESCE(NULLIF($16, ''), public.products.fulfillment_mode),
           allow_voucher = COALESCE($17, public.products.allow_voucher),
           updated_at = now()`,
        [
          crypto.randomUUID(),
          sku,
          name || '',
          category || '',
          display_section || '',
          price,
          original_price,
          stock,
          sort_order ?? null,
          status,
          description || '',
          icon || '',
          warranty_days ?? null,
          delivery_mode ?? null,
          custom_input_label ?? null,
          fulfillment_mode ?? null,
          allow_voucher ?? null,
        ]
      );
      if (pgRes !== null) dbWriteOk = true;
    } catch (pgErr) {
      console.warn('[catalog] Postgres PUT upsert notice:', pgErr);
    }

    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        const upsertPayload: any = {
          sku,
          price,
          sell_price: price,
          original_price,
          stock,
          status,
          updated_at: new Date().toISOString(),
        };
        if (name) upsertPayload.name = name;
        if (category) upsertPayload.category = category;
        if (display_section) upsertPayload.display_section = display_section;
        if (description) upsertPayload.description = description;
        if (icon) upsertPayload.icon = icon;
        if (sort_order !== undefined) upsertPayload.sort_order = sort_order;
        if (warranty_days !== undefined) upsertPayload.warranty_days = warranty_days;
        if (delivery_mode !== undefined) {
          upsertPayload.input_type = delivery_mode;
          upsertPayload.delivery_mode = delivery_mode;
        }
        if (custom_input_label !== undefined) upsertPayload.custom_input_label = custom_input_label;
        if (fulfillment_mode !== undefined) upsertPayload.fulfillment_mode = fulfillment_mode;
        if (allow_voucher !== undefined) upsertPayload.allow_voucher = allow_voucher;

        const { error } = await sbAdmin.from('products').upsert(upsertPayload, { onConflict: 'sku' });
        if (!error) dbWriteOk = true;
      }
    } catch (sbErr) {
      console.warn('[catalog] Supabase PUT update notice:', sbErr);
    }

    if (isDatabaseConfigured() && !dbWriteOk) {
      return NextResponse.json(
        { error: 'Không thể cập nhật sản phẩm lên Database.' },
        { status: 500 }
      );
    }

    const overrides = serverStore.loadCatalogOverrides();
    if (!overrides.updatedItems) overrides.updatedItems = {};
    overrides.updatedItems[sku] = {
      ...(overrides.updatedItems[sku] || {}),
      sku,
      name: name || overrides.updatedItems[sku]?.name,
      category,
      display_section,
      price,
      sell_price: price,
      original_price,
      stock,
      sort_order: sort_order ?? overrides.updatedItems[sku]?.sort_order ?? 0,
      status,
      description,
      icon,
      supplier_name,
      cost_price,
      warranty_days,
      input_type: delivery_mode ?? overrides.updatedItems[sku]?.input_type,
      delivery_mode: delivery_mode ?? overrides.updatedItems[sku]?.delivery_mode,
      custom_input_label: custom_input_label ?? overrides.updatedItems[sku]?.custom_input_label,
      fulfillment_mode: fulfillment_mode ?? overrides.updatedItems[sku]?.fulfillment_mode,
      allow_voucher,
      updatedAt: new Date().toISOString(),
    };
    serverStore.saveCatalogOverrides(overrides);

    return NextResponse.json({ success: true, message: 'Đã cập nhật sản phẩm thành công!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const items: Array<{ sku: string; sort_order: number; category?: string; display_section?: string }> =
      Array.isArray(body.items) ? body.items : Array.isArray(body.orders) ? body.orders : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'Thiếu danh sách sản phẩm cần sắp xếp.' }, { status: 400 });
    }

    await autoEnsureTables().catch(() => {});
    const overrides = serverStore.loadCatalogOverrides();
    if (!overrides.updatedItems) overrides.updatedItems = {};
    let dbOk = false;

    for (const item of items) {
      const sku = sanitizePlainText(item.sku, 80).toUpperCase();
      if (!sku) continue;
      const sortOrder = Math.max(0, Math.floor(Number(item.sort_order || 0)));
      const cat = item.category ? sanitizePlainText(item.category, 80) : undefined;
      const sec = item.display_section ? sanitizePlainText(item.display_section, 80) : cat;

      try {
        const res = await queryPostgres(
          `UPDATE public.products
           SET sort_order = $1,
               category = COALESCE(NULLIF($2, ''), category),
               display_section = COALESCE(NULLIF($3, ''), display_section),
               updated_at = NOW()
           WHERE sku = $4`,
          [sortOrder, cat || '', sec || '', sku]
        );
        if (res !== null) dbOk = true;
      } catch {}

      try {
        const sb = getSupabaseAdmin();
        if (sb) {
          const patch: any = { sort_order: sortOrder, updated_at: new Date().toISOString() };
          if (cat) patch.category = cat;
          if (sec) patch.display_section = sec;
          const { error } = await sb.from('products').update(patch).eq('sku', sku);
          if (!error) dbOk = true;
        }
      } catch {}

      overrides.updatedItems[sku] = {
        ...(overrides.updatedItems[sku] || {}),
        sku,
        sort_order: sortOrder,
        ...(cat ? { category: cat } : {}),
        ...(sec ? { display_section: sec } : {}),
        updatedAt: new Date().toISOString(),
      };
    }

    if (isDatabaseConfigured() && !dbOk) {
      return NextResponse.json({ error: 'Không thể lưu thứ tự sắp xếp vào Database.' }, { status: 500 });
    }

    serverStore.saveCatalogOverrides(overrides);
    return NextResponse.json({ success: true, message: 'Đã cập nhật thứ tự hiển thị thành công!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const sku = sanitizePlainText(body.sku || body.id || '', 80)
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    if (!sku) {
      return NextResponse.json({ error: 'Thiếu SKU sản phẩm để xóa.' }, { status: 400 });
    }

    let dbWriteOk = false;
    await autoEnsureTables().catch(() => {});

    try {
      const delRes = await queryPostgres(`DELETE FROM public.products WHERE sku = $1`, [sku]);
      if (delRes !== null) dbWriteOk = true;
    } catch {
      try {
        const hideRes = await queryPostgres(
          `UPDATE public.products SET status = 'HIDDEN', updated_at = now() WHERE sku = $1`,
          [sku]
        );
        if (hideRes !== null) dbWriteOk = true;
      } catch {}
    }

    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        const { error: delError } = await sbAdmin.from('products').delete().eq('sku', sku);
        if (!delError) {
          dbWriteOk = true;
        } else {
          const { error: hideErr } = await sbAdmin
            .from('products')
            .update({ status: 'HIDDEN', updated_at: new Date().toISOString() })
            .eq('sku', sku);
          if (!hideErr) dbWriteOk = true;
        }
      }
    } catch (sbErr) {
      console.warn('[catalog] Supabase DELETE notice:', sbErr);
    }

    if (isDatabaseConfigured() && !dbWriteOk) {
      return NextResponse.json(
        { error: 'Không thể xóa sản phẩm trong Database.' },
        { status: 500 }
      );
    }

    const overrides = serverStore.loadCatalogOverrides();
    if (!overrides.deletedIds) overrides.deletedIds = [];
    if (!overrides.deletedIds.includes(sku)) {
      overrides.deletedIds.push(sku);
    }
    if (overrides.customItems) {
      overrides.customItems = overrides.customItems.filter((c: any) => c.sku !== sku);
    }
    serverStore.saveCatalogOverrides(overrides);

    return NextResponse.json({ success: true, message: `Đã xóa sản phẩm ${sku} thành công!` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
