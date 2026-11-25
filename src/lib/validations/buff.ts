// ==============================================================================
// YUKI WEB V4 — BUFF MXH & COUPON VALIDATION SCHEMAS
// ==============================================================================

import { z } from 'zod';

export const buffQuoteRequestSchema = z.object({
  platform: z.enum(['YOUTUBE', 'TIKTOK', 'FACEBOOK', 'INSTAGRAM', 'TELEGRAM']),
  serviceCode: z.string().min(2, 'Mã dịch vụ không hợp lệ'),
  targetUrl: z.string().url('Đường dẫn liên kết không hợp lệ').min(10, 'Link quá ngắn'),
  quantity: z.number().int().min(10, 'Số lượng tối thiểu là 10').max(1000000, 'Số lượng vượt trần'),
  userNotes: z.string().max(300).optional(),
});

export const adminBuffQuotationSchema = z.object({
  requestId: z.string().uuid('ID yêu cầu không hợp lệ'),
  quotedUnitPrice: z.number().int().min(1, 'Đơn giá báo giá phải lớn hơn 0 VND'),
  adminNotes: z.string().max(300).optional(),
});

export const couponValidationSchema = z.object({
  code: z.string().min(3, 'Mã giảm giá tối thiểu 3 ký tự').max(20),
  subtotal: z.number().int().min(0),
});

export type BuffQuoteRequestInput = z.infer<typeof buffQuoteRequestSchema>;
export type AdminBuffQuotationInput = z.infer<typeof adminBuffQuotationSchema>;
export type CouponValidationInput = z.infer<typeof couponValidationSchema>;
