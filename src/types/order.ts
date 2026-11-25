// ==============================================================================
// YUKI WEB V4 — ORDER & CHECKOUT TYPES
// ==============================================================================

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  totalLineAmount: number;
  fulfillmentStatus: string;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  subtotalAmount: number;
  couponDiscountAmount: number;
  rankDiscountAmount: number;
  finalAmount: number;
  status: OrderStatus;
  couponId: string | null;
  userNote: string | null;
  adminNote: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface CheckoutCartItem {
  variantId: string;
  quantity: number;
}

export interface CheckoutRequestPayload {
  items: CheckoutCartItem[];
  couponCode?: string;
  userNote?: string;
  idempotencyKey: string;
}
