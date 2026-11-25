import fs from 'fs';
import path from 'path';
import { serverStore } from '@/lib/server-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables } from '@/lib/db';

const BRANDS_FILE = path.join(process.cwd(), 'public', 'brands-catalog.json');
let geminiSupabaseSynced = false;

export const GEMINI_SEED_SKUS = [
  {
    sku: 'GEMINI-PRO-24M-FAMILY',
    name: 'Google Gemini Pro 24 Tháng (Add Family / Slot)',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    sell_price: 25000,
    original_price: 350000,
    stock: 100,
    status: 'ACTIVE',
    warranty_days: 730,
    description: 'Nâng cấp chính chủ qua nhóm Family (Slot riêng tư). Chỉ yêu cầu nhập Email Google nhận lời mời.',
  },
  {
    sku: 'GEMINI-PRO-3M',
    name: 'Gemini Pro 3 Tháng',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    sell_price: 79000,
    original_price: 180000,
    stock: 50,
    status: 'ACTIVE',
    warranty_days: 0,
    description: 'Không bảo hành (KBH) — Duyệt tay qua Bot Telegram',
  },
  {
    sku: 'GEMINI-PLUS-6M-SLOT',
    name: 'Gemini Plus 6 Tháng [Slot]',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    sell_price: 45000,
    original_price: 120000,
    stock: 50,
    status: 'ACTIVE',
    warranty_days: 0,
    description: 'Không bảo hành (KBH) — Duyệt tay qua Bot Telegram',
  },
  {
    sku: 'GEMINI-PRO-12M-STUDENT',
    name: 'Gemini Pro 12 Tháng Student',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    sell_price: 75000,
    original_price: 240000,
    stock: 50,
    status: 'ACTIVE',
    warranty_days: 0,
    description: 'Không bảo hành (KBH) — Duyệt tay qua Bot Telegram',
  },
  {
    sku: 'GEMINI-ULTRA-1M-FAMILY',
    name: 'Google AI Ultra — Slot Family 1 Tháng (Chính Chủ)',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    sell_price: 239000,
    original_price: 450000,
    stock: 50,
    status: 'ACTIVE',
    warranty_days: 30,
    description: 'Bảo hành 30 ngày — Slot Family riêng tư',
  },
  {
    sku: 'GEMINI-ULTRA-3M',
    name: 'Google AI Ultra — Gói 3 Tháng',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    sell_price: 59000,
    original_price: 150000,
    stock: 50,
    status: 'ACTIVE',
    warranty_days: 0,
    description: 'Không bảo hành (KBH) — Duyệt tay qua Bot Telegram',
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
  const deletedSet = new Set(overrides.deletedIds || []);
  const updatedMap = overrides.updatedItems || {};

  const obsoleteSkus = new Set(['GEMINI-PRO-3M-SLOT', 'GEMINI-ULTRA-12M-SLOT', 'GEMINI-ULTRA-UPGRADE']);
  const flatProducts: any[] = [];

  for (const b of brands) {
    for (const pkg of b.packages || []) {
      if (deletedSet.has(pkg.sku) || obsoleteSkus.has(pkg.sku)) continue;

      const override = updatedMap[pkg.sku];
      flatProducts.push({
        id: pkg.sku,
        sku: pkg.sku,
        brand_slug: b.slug,
        brand_name: b.name,
        name: override?.name || pkg.name,
        category: override?.category || b.category || b.name,
        display_section: override?.display_section || override?.category || b.name,
        sell_price: Number(override?.price ?? override?.sell_price ?? pkg.price),
        original_price: Number(override?.original_price ?? override?.originalPrice ?? pkg.originalPrice ?? 0),
        stock: Number(override?.stock ?? pkg.stock ?? 50),
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
        input_type:
          override?.input_type ||
          pkg.input_type ||
          (pkg.sku === 'GEMINI-PRO-24M-FAMILY' || pkg.sku === 'GEMINI-ULTRA-1M-FAMILY'
            ? 'email_only'
            : pkg.sku === 'MUSE-AI-1B-TOKENS' || pkg.sku === 'GEMINI-ULTRA-3M'
            ? 'credentials'
            : 'none'),
        requires_credentials:
          (override?.input_type || pkg.input_type) === 'credentials' ||
          pkg.requires_credentials ||
          pkg.sku === 'MUSE-AI-1B-TOKENS' ||
          pkg.sku === 'GEMINI-ULTRA-3M',
        updatedAt: override?.updatedAt || b.updatedAt,
      });
    }
  }

  for (const item of overrides.customItems || []) {
    if (deletedSet.has(item.sku) || obsoleteSkus.has(item.sku)) continue;
    const override = updatedMap[item.sku];
    const resolvedInputType = override?.input_type || item.input_type || 'none';
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
      input_type: resolvedInputType,
      requires_credentials: resolvedInputType === 'credentials',
      updatedAt: override?.updatedAt || item.updatedAt,
    });
  }

  return flatProducts;
}

export async function getUnifiedCatalogData(options: { includeInternal?: boolean } = {}) {
  const { includeInternal = false } = options;
  let products = loadFullCatalogRaw();
  const overrides = serverStore.loadCatalogOverrides();
  const obsoleteSkus = ['GEMINI-PRO-3M-SLOT', 'GEMINI-ULTRA-12M-SLOT', 'GEMINI-ULTRA-UPGRADE'];
  const deletedSet = new Set([...(overrides.deletedIds || []), ...obsoleteSkus]);
  const updatedMap = overrides.updatedItems || {};

  // 1. Direct PostgreSQL sync
  await autoEnsureTables().catch(() => {});
  try {
    const pgRes = await queryPostgres('SELECT * FROM public.products ORDER BY created_at DESC');
    if (pgRes && pgRes.rows && pgRes.rows.length > 0) {
      const productMap = new Map(products.map((p) => [p.sku, p]));
      for (const dbP of pgRes.rows) {
        if (!dbP?.sku || deletedSet.has(dbP.sku)) continue;
        const existing = productMap.get(dbP.sku);
        const override = updatedMap[dbP.sku];
        const isGemini = String(dbP.sku).startsWith('GEMINI-');

        const resolvedStatus = (override?.status || dbP.status || existing?.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';
        const resolvedPrice = Number(override?.price ?? override?.sell_price ?? dbP.sell_price ?? existing?.sell_price ?? 0);
        const resolvedOrigPrice = Number(override?.original_price ?? override?.originalPrice ?? dbP.original_price ?? existing?.original_price ?? 0);
        const resolvedStock = Number(override?.stock ?? dbP.stock ?? existing?.stock ?? 99);
        const resolvedName = override?.name || dbP.name || existing?.name;
        const resolvedDesc = override?.description || dbP.description || existing?.description || '';
        const resolvedCategory = override?.category || dbP.category || existing?.category || 'Bản quyền';
        const resolvedSection = override?.display_section || dbP.display_section || existing?.display_section || resolvedCategory || 'Trang Chủ - Sản Phẩm Nổi Bật';
        const resolvedInputType = override?.input_type || existing?.input_type || (dbP.sku === 'GEMINI-PRO-24M-FAMILY' || dbP.sku === 'GEMINI-ULTRA-1M-FAMILY' ? 'email_only' : dbP.sku === 'MUSE-AI-1B-TOKENS' || dbP.sku === 'GEMINI-ULTRA-3M' ? 'credentials' : 'none');
        const resolvedAllowVoucher = override?.allow_voucher !== undefined ? Boolean(override.allow_voucher) : existing?.allow_voucher !== undefined ? existing.allow_voucher : !dbP.sku.includes('API-TOOL-SMS');

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
          sort_order: Number(override?.sort_order ?? dbP.sort_order ?? existing?.sort_order ?? 0),
          status: resolvedStatus,
          description: resolvedDesc,
          icon: override?.icon || dbP.icon || existing?.icon || '/assets/icons/products/chatgpt.jpg',
          warranty_days: override?.warranty_days !== undefined ? Number(override.warranty_days) : isGemini ? (dbP.sku === 'GEMINI-ULTRA-1M-FAMILY' ? 30 : 0) : dbP.warranty_days ?? existing?.warranty_days ?? 30,
          input_type: override?.input_type || dbP.input_type || resolvedInputType,
          requires_credentials: (override?.input_type || dbP.input_type || existing?.input_type) === 'credentials' || existing?.requires_credentials || dbP.sku === 'MUSE-AI-1B-TOKENS' || dbP.sku === 'GEMINI-ULTRA-3M',
          allow_voucher: override?.allow_voucher !== undefined ? Boolean(override.allow_voucher) : dbP.allow_voucher !== undefined ? Boolean(dbP.allow_voucher) : resolvedAllowVoucher,
          updatedAt: override?.updatedAt || dbP.updated_at,
        });
      }
      products = Array.from(productMap.values());
    }
  } catch (pgErr) {}

  try {
    const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
    if (!isPlaceholder && supabaseAdmin) {
      if (!geminiSupabaseSynced) {
        geminiSupabaseSynced = true;
        try {
          // Xóa dứt điểm các mã SKU cũ khỏi Supabase để tránh xung đột
          for (const obs of obsoleteSkus) {
            await supabaseAdmin.from('products').delete().eq('sku', obs);
          }
        } catch {}
      }

      const { data: dbProducts } = await supabaseAdmin
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbProducts && dbProducts.length > 0) {
        const productMap = new Map(products.map((p) => [p.sku, p]));
        for (const dbP of dbProducts) {
          if (!dbP?.sku || deletedSet.has(dbP.sku)) continue;
          const existing = productMap.get(dbP.sku);
          const override = updatedMap[dbP.sku];
          const isGemini = String(dbP.sku).startsWith('GEMINI-');

          const resolvedStatus = (override?.status || dbP.status || existing?.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';
          const resolvedPrice = Number(override?.price ?? override?.sell_price ?? dbP.sell_price ?? existing?.sell_price ?? 0);
          const resolvedOrigPrice = Number(override?.original_price ?? override?.originalPrice ?? dbP.original_price ?? existing?.original_price ?? 0);
          const resolvedStock = Number(override?.stock ?? dbP.stock ?? existing?.stock ?? 99);
          const resolvedName = override?.name || dbP.name || existing?.name;
          const resolvedDesc = override?.description || dbP.description || existing?.description || '';
          const resolvedCategory = override?.category || dbP.category || existing?.category || 'Bản quyền';
          const resolvedSection = override?.display_section || dbP.display_section || existing?.display_section || resolvedCategory || 'Trang Chủ - Sản Phẩm Nổi Bật';
          const resolvedInputType = override?.input_type || existing?.input_type || (dbP.sku === 'GEMINI-PRO-24M-FAMILY' || dbP.sku === 'GEMINI-ULTRA-1M-FAMILY' ? 'email_only' : dbP.sku === 'MUSE-AI-1B-TOKENS' || dbP.sku === 'GEMINI-ULTRA-3M' ? 'credentials' : 'none');
          const resolvedAllowVoucher = override?.allow_voucher !== undefined ? Boolean(override.allow_voucher) : existing?.allow_voucher !== undefined ? existing.allow_voucher : !dbP.sku.includes('API-TOOL-SMS');

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
            status: resolvedStatus,
            description: resolvedDesc,
            icon: override?.icon || existing?.icon || '/assets/icons/products/chatgpt.jpg',
            warranty_days: override?.warranty_days !== undefined ? Number(override.warranty_days) : isGemini ? (dbP.sku === 'GEMINI-ULTRA-1M-FAMILY' ? 30 : 0) : dbP.warranty_days ?? existing?.warranty_days ?? 30,
            input_type: resolvedInputType,
            requires_credentials: (override?.input_type || existing?.input_type) === 'credentials' || existing?.requires_credentials || dbP.sku === 'MUSE-AI-1B-TOKENS' || dbP.sku === 'GEMINI-ULTRA-3M',
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

  products.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

  const categories = serverStore.loadCategories();
  return { success: true, products, categories };
}
