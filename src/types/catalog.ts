// ==============================================================================
// YUKI WEB V4 — CATALOG & STORE TYPES
// ==============================================================================

export type SkuStatus = 'ACTIVE' | 'INACTIVE' | 'NEEDS_REVIEW';
export type FulfillmentMode = 'MANUAL' | 'AUTO';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconName: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  badgeLabel: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number; // Stored as BIGINT VND
  originalPrice: number | null;
  durationDays: number | null; // null = Lifetime
  fulfillmentMode: FulfillmentMode;
  status: SkuStatus;
  stockLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPriceHistory {
  id: string;
  variantId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}
