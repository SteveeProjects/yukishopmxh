import fs from 'fs';
import path from 'path';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables } from '@/lib/db';
import { normalizeDeliveryMode } from '@/lib/catalog/delivery-modes';

const BRANDS_FILE = path.join(process.cwd(), 'public', 'brands-catalog.json');
let geminiSupabaseSynced = false;

export const OBSOLETE_SKUS = [
  'GEMINI-PRO-24M-FAMILY',
  'GEMINI-ULTRA-3M',
  'GEMINI-ULTRA-1M-FAMILY',
  'GEMINI-PRO-3M-SLOT',
  'GEMINI-ULTRA-12M-SLOT',
  'GEMINI-ULTRA-UPGRADE',
];

export const GEMINI_SEED_SKUS = [
  {
    sku: 'GEMINI-ULTRA-5X-1M',
    name: 'Google AI Ultra 5x (1 Tháng — Slot Family)',
    category: 'Google Gemini',
    display_section: 'Google Gemini',
    sell_price: 85000,
    original_price: 250000,
    stock: 99,
    sort_order: 1,
    status: 'ACTIVE',
    warranty_days: 30,
    input_type: 'email_only',
    delivery_mode: 'email_only',
    fulfillment_mode: 'MANUAL',
    custom_input_label: 'Email Google nhận lời mời Slot Family (Không cần mật khẩu)',
    description:
      'Nâng cấp Google AI Ultra 5x (1 Tháng) chính chủ qua lời mời Google Family (Slot riêng tư). Chỉ cần nhập Email Google.',
  },
  {
    sku: 'GEMINI-ULTRA-20X-1M',
    name: 'Google AI Ultra 20x (1 Tháng — Slot Family)',
    category: 'Google Gemini',
    display_section: 'Google Gemini',
    sell_price: 145000,
    original_price: 450000,
    stock: 99,
    sort_order: 2,
    status: 'ACTIVE',
    warranty_days: 30,
    input_type: 'email_only',
    delivery_mode: 'email_only',
    fulfillment_mode: 'MANUAL',
    custom_input_label: 'Email Google nhận lời mời Slot Family (Không cần mật khẩu)',
    description:
      'Nâng cấp Google AI Ultra 20x (1 Tháng) cao cấp qua lời mời Google Family (Slot riêng tư). Chỉ cần nhập Email Google.',
  },
];

export function loadFullCatalogRaw() {
  let brands: any[] = [];
  try {
    if (fs.existsSync(BRANDS_FILE)) {
      brands = JSON.parse(fs.readFileSync(BRANDS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading brands-catalog.json:', e);
  }

  const overrides = serverStore.loadCatalogOverrides();
  const deletedSet = new Set([...(overrides.deletedIds || []), ...OBSOLETE_SKUS]);
  const updatedMap = overrides.updatedItems || {};

  const flatProducts: any[] = [];

  for (const b of brands) {
    for (const pkg of b.packages || []) {
      if (deletedSet.has(pkg.sku)) continue;

      const override = updatedMap[pkg.sku];
      const mode = normalizeDeliveryMode(
        override?.delivery_mode || override?.input_type || pkg.delivery_mode || pkg.input_type,
        pkg.sku
      );
      flatProducts.push({
        id: pkg.sku,
        sku: pkg.sku,
        brand_slug: b.slug,
        brand_name: b.name,
        name: override?.name || pkg.name,
        category: override?.category || b.category || b.name,
        display_section: override?.display_section || override?.category || b.category || b.name,
        sell_price: Number(override?.price ?? override?.sell_price ?? pkg.price),
        original_price: Number(override?.original_price ?? override?.originalPrice ?? pkg.originalPrice ?? 0),
        stock: Number(override?.stock ?? pkg.stock ?? 50),
        sort_order: Number(override?.sort_order ?? pkg.sort_order ?? 100),
        status: (override?.status || pkg.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE',
        description:
          override?.description ||
          pkg.description ||
          (pkg.benefits ? pkg.benefits.join('. ') : pkg.warranty) ||
          'Không bảo hành (KBH)',
        icon: override?.icon || b.iconPath || '/assets/icons/products/chatgpt.jpg',
        supplier_name: override?.supplier_name || 'Kho Bản Quyền Yuki',
        cost_price: Number(override?.cost_price ?? Math.round(Number(pkg.price) * 0.7)),
        warranty_days:
          override?.warranty_days !== undefined
            ? Number(override.warranty_days)
            : pkg.warranty_days !== undefined
            ? Number(pkg.warranty_days)
            : pkg.warrantyDays !== undefined
            ? Number(pkg.warrantyDays)
            : String(pkg.warranty || '').includes('KBH') || String(pkg.warranty || '').includes('Không bảo hành')
            ? 0
            : 30,
        allow_voucher:
          override?.allow_voucher !== undefined
            ? Boolean(override.allow_voucher)
            : pkg.allow_voucher !== undefined
            ? pkg.allow_voucher
            : pkg.allowVoucher !== undefined
            ? pkg.allowVoucher
            : !pkg.sku.includes('API-TOOL-SMS'),
        input_type: mode,
        delivery_mode: mode,
        custom_input_label: override?.custom_input_label ?? pkg.custom_input_label ?? '',
        fulfillment_mode: override?.fulfillment_mode || pkg.fulfillment_mode || pkg.fulfillmentMode || 'MANUAL',
        requires_credentials: mode === 'credentials' || mode === 'credentials_2fa',
        updatedAt: override?.updatedAt || b.updatedAt,
      });
    }
  }

  for (const item of overrides.customItems || []) {
    if (deletedSet.has(item.sku)) continue;
    const override = updatedMap[item.sku];
    const mode = normalizeDeliveryMode(
      override?.delivery_mode || override?.input_type || item.delivery_mode || item.input_type,
      item.sku
    );
    flatProducts.push({
      id: item.sku,
      sku: item.sku,
      brand_slug: 'custom',
      brand_name: override?.category || item.category || 'Dịch vụ thêm',
      name: override?.name || item.name,
      category: override?.category || item.category || 'Dịch vụ thêm',
      display_section: override?.display_section || item.display_section || override?.category || item.category || 'Dịch vụ thêm',
      sell_price: Number(override?.price ?? override?.sell_price ?? item.price ?? item.sell_price),
      original_price: Number(override?.original_price ?? override?.originalPrice ?? item.original_price ?? item.originalPrice ?? 0),
      stock: Number(override?.stock ?? item.stock ?? 99),
      sort_order: Number(override?.sort_order ?? item.sort_order ?? 100),
      status: (override?.status || item.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE',
      description: override?.description || item.description || 'Không bảo hành (KBH)',
      icon: override?.icon || item.icon || '/assets/icons/products/chatgpt.jpg',
      supplier_name: override?.supplier_name || item.supplier_name || 'Kho Bản Quyền Yuki',
      cost_price: Number(override?.cost_price ?? item.cost_price ?? Math.round(Number(item.sell_price || 0) * 0.7)),
      warranty_days:
        override?.warranty_days !== undefined
          ? Number(override.warranty_days)
          : item.warranty_days !== undefined
          ? Number(item.warranty_days)
          : 30,
      allow_voucher:
        override?.allow_voucher !== undefined
          ? Boolean(override.allow_voucher)
          : item.allow_voucher !== undefined
          ? Boolean(item.allow_voucher)
          : true,
      input_type: mode,
      delivery_mode: mode,
      custom_input_label: override?.custom_input_label ?? item.custom_input_label ?? '',
      fulfillment_mode: override?.fulfillment_mode || item.fulfillment_mode || 'MANUAL',
      requires_credentials: mode === 'credentials' || mode === 'credentials_2fa',
      updatedAt: override?.updatedAt || item.updatedAt,
    });
  }

  return flatProducts;
}

export async function getUnifiedCatalogData(options: { includeInternal?: boolean } = {}) {
  const { includeInternal = false } = options;
  let products = loadFullCatalogRaw();
  const overrides = serverStore.loadCatalogOverrides();
  const deletedSet = new Set([...(overrides.deletedIds || []), ...OBSOLETE_SKUS]);
  const updatedMap = overrides.updatedItems || {};

  // 1. Direct PostgreSQL sync
  await autoEnsureTables().catch(() => {});
  let dbCategories: any[] = [];
  try {
    const pgCats = await queryPostgres(
      'SELECT id::text as id, name, slug, icon, description, sort_order FROM public.categories ORDER BY sort_order ASC, name ASC'
    ).catch(() => null);
    if (pgCats?.rows?.length) {
      dbCategories = pgCats.rows;
    }

    const pgRes = await queryPostgres('SELECT * FROM public.products ORDER BY sort_order ASC, created_at DESC');
    if (pgRes && pgRes.rows && pgRes.rows.length > 0) {
      const productMap = new Map(products.map((p) => [p.sku, p]));
      for (const dbP of pgRes.rows) {
        if (!dbP?.sku || deletedSet.has(dbP.sku)) continue;
        const existing = productMap.get(dbP.sku);
        const override = updatedMap[dbP.sku];

        const resolvedStatus = (override?.status || dbP.status || existing?.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';
        const resolvedPrice = Number(override?.price ?? override?.sell_price ?? dbP.sell_price ?? existing?.sell_price ?? 0);
        const resolvedOrigPrice = Number(override?.original_price ?? override?.originalPrice ?? dbP.original_price ?? existing?.original_price ?? 0);
        const resolvedStock = Number(override?.stock ?? dbP.stock ?? existing?.stock ?? 99);
        const resolvedName = override?.name || dbP.name || existing?.name;
        const resolvedDesc = override?.description || dbP.description || existing?.description || '';
        const resolvedCategory = override?.category || dbP.category || existing?.category || 'Bản quyền';
        const resolvedSection = override?.display_section || dbP.display_section || existing?.display_section || resolvedCategory || 'Trang Chủ - Sản Phẩm Nổi Bật';
        const resolvedMode = normalizeDeliveryMode(
          override?.delivery_mode || override?.input_type || dbP.delivery_mode || dbP.input_type || existing?.delivery_mode || existing?.input_type,
          dbP.sku
        );
        const resolvedAllowVoucher = override?.allow_voucher !== undefined ? Boolean(override.allow_voucher) : dbP.allow_voucher !== undefined ? Boolean(dbP.allow_voucher) : existing?.allow_voucher !== undefined ? existing.allow_voucher : !dbP.sku.includes('API-TOOL-SMS');

        productMap.set(dbP.sku, {
          ...(existing || {}),
          id: dbP.id || dbP.sku,
          sku: dbP.sku,
          brand_slug: existing?.brand_slug || 'custom',
          name: resolvedName,
          category: resolvedCategory,
          display_section: resolvedSection,
          sell_price: resolvedPrice,
          original_price: resolvedOrigPrice,
          stock: resolvedStock,
          sort_order: Number(override?.sort_order ?? dbP.sort_order ?? existing?.sort_order ?? 100),
          status: resolvedStatus,
          description: resolvedDesc,
          icon: override?.icon || dbP.icon || existing?.icon || '/assets/icons/products/chatgpt.jpg',
          warranty_days: override?.warranty_days !== undefined ? Number(override.warranty_days) : dbP.warranty_days ?? existing?.warranty_days ?? 30,
          input_type: resolvedMode,
          delivery_mode: resolvedMode,
          custom_input_label: override?.custom_input_label ?? dbP.custom_input_label ?? existing?.custom_input_label ?? '',
          fulfillment_mode: override?.fulfillment_mode || dbP.fulfillment_mode || existing?.fulfillment_mode || 'MANUAL',
          requires_credentials: resolvedMode === 'credentials' || resolvedMode === 'credentials_2fa',
          allow_voucher: resolvedAllowVoucher,
          updatedAt: override?.updatedAt || dbP.updated_at,
        });
      }
      products = Array.from(productMap.values());
    }
  } catch (pgErr) {}

  try {
    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin) {
      if (!geminiSupabaseSynced) {
        geminiSupabaseSynced = true;
        try {
          await sbAdmin.from('products').delete().in('sku', OBSOLETE_SKUS);
        } catch {}
      }

      if (dbCategories.length === 0) {
        try {
          const { data: sbCats } = await (sbAdmin as any)
            .from('categories')
            .select('id, name, slug, icon, description, sort_order')
            .order('sort_order', { ascending: true });
          if (sbCats?.length) dbCategories = sbCats;
        } catch {}
      }

      const { data: dbProducts } = await sbAdmin
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (dbProducts && dbProducts.length > 0) {
        const productMap = new Map(products.map((p) => [p.sku, p]));
        for (const dbP of dbProducts) {
          if (!dbP?.sku || deletedSet.has(dbP.sku)) continue;
          const existing = productMap.get(dbP.sku);
          const override = updatedMap[dbP.sku];

          const resolvedStatus = (override?.status || dbP.status || existing?.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';
          const resolvedPrice = Number(override?.price ?? override?.sell_price ?? dbP.sell_price ?? existing?.sell_price ?? 0);
          const resolvedOrigPrice = Number(override?.original_price ?? override?.originalPrice ?? dbP.original_price ?? existing?.original_price ?? 0);
          const resolvedStock = Number(override?.stock ?? dbP.stock ?? existing?.stock ?? 99);
          const resolvedName = override?.name || dbP.name || existing?.name;
          const resolvedDesc = override?.description || dbP.description || existing?.description || '';
          const resolvedCategory = override?.category || dbP.category || existing?.category || 'Bản quyền';
          const resolvedSection = override?.display_section || dbP.display_section || existing?.display_section || resolvedCategory || 'Trang Chủ - Sản Phẩm Nổi Bật';
          const resolvedMode = normalizeDeliveryMode(
            override?.delivery_mode || override?.input_type || dbP.delivery_mode || dbP.input_type || existing?.delivery_mode || existing?.input_type,
            dbP.sku
          );
          const resolvedAllowVoucher = override?.allow_voucher !== undefined ? Boolean(override.allow_voucher) : dbP.allow_voucher !== undefined ? Boolean(dbP.allow_voucher) : existing?.allow_voucher !== undefined ? existing.allow_voucher : !dbP.sku.includes('API-TOOL-SMS');

          productMap.set(dbP.sku, {
            ...(existing || {}),
            id: dbP.id || dbP.sku,
            sku: dbP.sku,
            brand_slug: existing?.brand_slug || 'custom',
            name: resolvedName,
            category: resolvedCategory,
            display_section: resolvedSection,
            sell_price: resolvedPrice,
            original_price: resolvedOrigPrice,
            stock: resolvedStock,
            sort_order: Number(override?.sort_order ?? dbP.sort_order ?? existing?.sort_order ?? 100),
            status: resolvedStatus,
            description: resolvedDesc,
            icon: override?.icon || dbP.icon || existing?.icon || '/assets/icons/products/chatgpt.jpg',
            warranty_days: override?.warranty_days !== undefined ? Number(override.warranty_days) : dbP.warranty_days ?? existing?.warranty_days ?? 30,
            input_type: resolvedMode,
            delivery_mode: resolvedMode,
            custom_input_label: override?.custom_input_label ?? dbP.custom_input_label ?? existing?.custom_input_label ?? '',
            fulfillment_mode: override?.fulfillment_mode || dbP.fulfillment_mode || existing?.fulfillment_mode || 'MANUAL',
            requires_credentials: resolvedMode === 'credentials' || resolvedMode === 'credentials_2fa',
            allow_voucher: resolvedAllowVoucher,
            updatedAt: override?.updatedAt || dbP.updated_at,
          });
        }
        products = Array.from(productMap.values());
      }
    }
  } catch (e) {
    console.warn('[catalog] Supabase GET notice:', e);
  }

  if (!includeInternal) {
    products = products.map(({ cost_price: _cp, supplier_name: _sn, ...publicItem }) => publicItem);
  }

  products.sort((a, b) => Number(a.sort_order ?? 100) - Number(b.sort_order ?? 100));

  const categories = dbCategories.length > 0 ? dbCategories : serverStore.loadCategories();
  return { success: true, products, categories };
}
