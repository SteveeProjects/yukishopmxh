import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables, isDatabaseConfigured } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getUnifiedCatalogData } from '@/lib/catalog/server-catalog';
import { sanitizePlainText } from '@/lib/security-sanitize';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_INPUT_TYPES = new Set(['none', 'credentials', 'email_only', 'admin_delivered']);

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
    const input_type = sanitizePlainText(body.input_type || 'none', 40).toLowerCase();
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
    if (!ALLOWED_INPUT_TYPES.has(input_type)) {
      return NextResponse.json({ error: 'Loại đầu vào (input_type) không hợp lệ.' }, { status: 400 });
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
      input_type,
      allow_voucher,
      updatedAt: new Date().toISOString(),
    };

    let dbWriteOk = false;
    await autoEnsureTables().catch(() => {});

    try {
      const pgRes = await queryPostgres(
        `INSERT INTO public.products (
          id, sku, name, category, display_section, price, sell_price, original_price, cost_price,
          supplier_name, stock, sort_order, status, description, icon, warranty_days, input_type, allow_voucher, updated_at
        )
         VALUES ($1, $1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
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
           allow_voucher = EXCLUDED.allow_voucher,
           updated_at = now()`,
        [
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
          input_type,
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
            id: sku,
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
            input_type,
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
    const input_type =
      body.input_type !== undefined
        ? sanitizePlainText(body.input_type, 40).toLowerCase()
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
    if (input_type !== undefined && !ALLOWED_INPUT_TYPES.has(input_type)) {
      return NextResponse.json({ error: 'Loại đầu vào (input_type) không hợp lệ.' }, { status: 400 });
    }

    let dbWriteOk = false;
    await autoEnsureTables().catch(() => {});

    try {
      const pgRes = await queryPostgres(
        `INSERT INTO public.products (
          id, sku, name, category, display_section, price, sell_price, original_price, stock, sort_order,
          status, description, icon, warranty_days, input_type, allow_voucher, updated_at
        )
         VALUES ($1, $1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
         ON CONFLICT (sku) DO UPDATE SET
           price = EXCLUDED.price,
           sell_price = EXCLUDED.sell_price,
           original_price = EXCLUDED.original_price,
           stock = EXCLUDED.stock,
           sort_order = COALESCE($8, public.products.sort_order),
           status = EXCLUDED.status,
           name = COALESCE(NULLIF(EXCLUDED.name, ''), public.products.name),
           category = COALESCE(NULLIF(EXCLUDED.category, ''), public.products.category),
           display_section = COALESCE(NULLIF(EXCLUDED.display_section, ''), public.products.display_section),
           description = COALESCE(NULLIF(EXCLUDED.description, ''), public.products.description),
           icon = COALESCE(NULLIF(EXCLUDED.icon, ''), public.products.icon),
           warranty_days = COALESCE($12, public.products.warranty_days),
           input_type = COALESCE(NULLIF($13, ''), public.products.input_type),
           allow_voucher = COALESCE($14, public.products.allow_voucher),
           updated_at = now()`,
        [
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
          input_type ?? null,
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
          id: sku,
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
        if (input_type !== undefined) upsertPayload.input_type = input_type;
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
      input_type,
      allow_voucher,
      updatedAt: new Date().toISOString(),
    };
    serverStore.saveCatalogOverrides(overrides);

    return NextResponse.json({ success: true, message: 'Đã cập nhật sản phẩm thành công!' });
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
