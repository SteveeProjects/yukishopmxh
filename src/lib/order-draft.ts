export interface OrderDraft {
  sku?: string;
  brandSlug?: string;
  packageIndex?: number;
  quantity?: number;
  deliveryContact?: string;
  notes?: string;
  couponCode?: string;
  updatedAt?: number;
}

export interface BuffDraft {
  platform?: string;
  serviceCode?: string;
  serverId?: number;
  targetUrl?: string;
  quantity?: number;
  telegramId?: string;
  zaloPhone?: string;
  notes?: string;
  couponCode?: string;
  updatedAt?: number;
}

const ORDER_DRAFT_KEY = 'yuki_order_draft_v4';
const BUFF_DRAFT_KEY = 'yuki_buff_draft_v4';

export function loadOrderDraft(): OrderDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ORDER_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrderDraft;
  } catch {
    return null;
  }
}

export function saveOrderDraft(draft: OrderDraft): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadOrderDraft() || {};
    window.sessionStorage.setItem(
      ORDER_DRAFT_KEY,
      JSON.stringify({ ...existing, ...draft, updatedAt: Date.now() })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function clearOrderDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ORDER_DRAFT_KEY);
  } catch {}
}

export function loadBuffDraft(): BuffDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BUFF_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BuffDraft;
  } catch {
    return null;
  }
}

export function saveBuffDraft(draft: BuffDraft): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadBuffDraft() || {};
    window.sessionStorage.setItem(
      BUFF_DRAFT_KEY,
      JSON.stringify({ ...existing, ...draft, updatedAt: Date.now() })
    );
  } catch {}
}

export function clearBuffDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(BUFF_DRAFT_KEY);
  } catch {}
}
