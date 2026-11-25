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
  status?: string;
  description?: string;
  icon?: string;
  warranty_days?: number;
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
        warranty: warrantyText,
        warranty_days: wDays,
        warrantyDays: wDays,
        description: live.description || pkg.description,
      });
    }

    if (nextPackages.length > 0) {
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
          fulfillmentMode: 'MANUAL',
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
