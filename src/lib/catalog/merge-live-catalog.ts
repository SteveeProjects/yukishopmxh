import type { BrandInfo, PackageVariant } from '@/lib/catalog/brands-data';

export interface LiveCatalogProduct {
  sku: string;
  brand_slug?: string;
  name: string;
  category?: string;
  display_section?: string;
  sell_price: number;
  original_price?: number;
  stock?: number;
  sort_order?: number;
  status?: string;
  description?: string;
  icon?: string;
  warranty_days?: number;
  allow_voucher?: boolean;
  input_type?: string;
  delivery_mode?: string;
  custom_input_label?: string;
  fulfillment_mode?: string;
}

export interface LiveCatalogCategory {
  id: string;
  name: string;
  slug: string;
}

export function mergeLiveCatalog(
  baseBrands: BrandInfo[],
  apiData: { products?: LiveCatalogProduct[]; categories?: LiveCatalogCategory[] } | null | undefined
): { brands: BrandInfo[]; categories: string[] } {
  const products = Array.isArray(apiData?.products) ? apiData.products : [];
  const apiCategories = Array.isArray(apiData?.categories) ? apiData.categories : [];

  const productMap = new Map<string, LiveCatalogProduct>();
  const baseSkus = new Set<string>();

  for (const b of baseBrands) {
    for (const pkg of b.packages) {
      baseSkus.add(pkg.sku);
    }
  }

  for (const p of products) {
    if (p?.sku) productMap.set(p.sku, p);
  }

  const mergedBaseBrands: BrandInfo[] = [];

  for (const b of baseBrands) {
    if (products.length === 0) {
      mergedBaseBrands.push(b);
      continue;
    }

    const nextPackages: PackageVariant[] = [];
    for (const pkg of b.packages) {
      const live = productMap.get(pkg.sku);
      if (!live) {
        // Respect deletions if products came from live API
        continue;
      }
      if (
        String(live.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ||
        (live as any).is_active === false ||
        (live as any).is_hidden === true
      ) {
        continue;
      }

      const wDays =
        live.warranty_days !== undefined
          ? Number(live.warranty_days)
          : pkg.warranty_days ?? pkg.warrantyDays ?? 30;
      const warrantyText =
        wDays === 0
          ? 'Không bảo hành (KBH)'
          : pkg.warranty || `Bảo hành ${wDays} ngày`;

      nextPackages.push({
        ...pkg,
        name: live.name || pkg.name,
        price: Number(live.sell_price ?? pkg.price),
        originalPrice: Number(live.original_price ?? pkg.originalPrice ?? 0),
        stock: Number(live.stock ?? pkg.stock ?? 50),
        sort_order: Number(live.sort_order ?? pkg.sort_order ?? 100),
        category: live.category || pkg.category || b.category,
        display_section: live.display_section || pkg.display_section || live.category || b.category,
        warranty: warrantyText,
        warranty_days: wDays,
        warrantyDays: wDays,
        allow_voucher: live.allow_voucher ?? pkg.allow_voucher,
        allowVoucher: live.allow_voucher ?? pkg.allowVoucher,
        input_type: live.delivery_mode || live.input_type || pkg.delivery_mode || pkg.input_type,
        delivery_mode: live.delivery_mode || live.input_type || pkg.delivery_mode || pkg.input_type,
        custom_input_label: live.custom_input_label ?? pkg.custom_input_label,
        fulfillment_mode: live.fulfillment_mode || pkg.fulfillment_mode || pkg.fulfillmentMode,
        description: live.description || pkg.description,
      });
    }

    if (nextPackages.length > 0) {
      nextPackages.sort((a, x) => Number(a.sort_order ?? 100) - Number(x.sort_order ?? 100));
      const firstLive = productMap.get(nextPackages[0].sku);
      mergedBaseBrands.push({
        ...b,
        category: firstLive?.category || b.category,
        iconPath: firstLive?.icon || b.iconPath,
        packages: nextPackages,
      });
    }
  }

  // Append active custom products created in Admin (group by category if desired, or 1 brand card per custom SKU)
  const customActive = products.filter(
    (p) =>
      p?.sku &&
      !baseSkus.has(p.sku) &&
      String(p.status || 'ACTIVE').toUpperCase() === 'ACTIVE' &&
      (p as any).is_active !== false &&
      (p as any).is_hidden !== true
  );

  for (const cp of customActive) {
    const wDays = cp.warranty_days !== undefined ? Number(cp.warranty_days) : 30;
    const warrantyLabel = wDays === 0 ? 'Không bảo hành (KBH)' : `Bảo hành ${wDays} ngày`;
    mergedBaseBrands.push({
      slug: cp.sku.toLowerCase(),
      name: cp.name,
      category: cp.category || cp.display_section || 'Dịch vụ thêm',
      badgeLabel: 'Mới Thêm',
      shortDesc: cp.description || cp.name,
      fullDesc: cp.description || cp.name,
      iconPath: cp.icon || '/assets/icons/products/chatgpt.jpg',
      gradient: 'from-sky-500 to-blue-600',
      brandColor: '#0EA5E9',
      packages: [
        {
          sku: cp.sku,
          name: cp.name,
          price: Number(cp.sell_price || 0),
          originalPrice: Number(cp.original_price || 0),
          duration: 'Theo gói',
          durationDays: wDays > 0 ? wDays : null,
          status: 'ACTIVE',
          fulfillmentMode: cp.fulfillment_mode === 'AUTO' ? 'AUTO' : 'MANUAL',
          fulfillment_mode: cp.fulfillment_mode || 'MANUAL',
          allow_voucher: cp.allow_voucher ?? true,
          allowVoucher: cp.allow_voucher ?? true,
          input_type: cp.delivery_mode || cp.input_type || 'admin_deliver',
          delivery_mode: cp.delivery_mode || cp.input_type || 'admin_deliver',
          custom_input_label: cp.custom_input_label || '',
          sort_order: Number(cp.sort_order ?? 100),
          category: cp.category || cp.display_section || 'Dịch vụ thêm',
          display_section: cp.display_section || cp.category || 'Dịch vụ thêm',
          warranty: warrantyLabel,
          warranty_days: wDays,
          warrantyDays: wDays,
          description: cp.description || warrantyLabel,
          benefits: [cp.description || cp.name],
          usageConditions: ['Nhập Gmail / Telegram nhận đơn để Admin bàn giao'],
          stock: Number(cp.stock ?? 99),
        },
      ],
    });
  }

  const categorySet = new Set<string>();
  for (const c of apiCategories) {
    if (c?.name) categorySet.add(c.name.trim());
  }
  for (const b of mergedBaseBrands) {
    if (b.category) categorySet.add(b.category.trim());
  }

  return {
    brands: mergedBaseBrands,
    categories: ['ALL', ...Array.from(categorySet)],
  };
}
