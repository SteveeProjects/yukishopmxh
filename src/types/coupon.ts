// ==============================================================================
// YUKI WEB V4 — COUPON TYPES
// ==============================================================================

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  maxUses: number;
  currentUses: number;
  maxUsesPerUser: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  userId: string;
  orderId: string;
  discountApplied: number;
  redeemedAt: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  code: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  calculatedDiscount: number;
  reason?: string;
}
