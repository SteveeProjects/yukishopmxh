// ==============================================================================
// YUKI WEB V4 — CHECKOUT VALIDATION SCHEMAS
// ==============================================================================

import { z } from 'zod';

export const cartItemSchema = z.object({
  variantId: z.string().uuid('ID biến thể SKU không hợp lệ'),
  quantity: z.number().int().min(1, 'Số lượng tối thiểu là 1').max(99, 'Số lượng tối đa là 99'),
});

export const checkoutPayloadSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Giỏ hàng không được để trống'),
  couponCode: z.string().max(20).optional(),
  userNote: z.string().max(300).optional(),
  idempotencyKey: z.string().min(10, 'Idempotency key bắt buộc').max(64),
});

export type CheckoutCartItemInput = z.infer<typeof cartItemSchema>;
export type CheckoutPayloadInput = z.infer<typeof checkoutPayloadSchema>;
