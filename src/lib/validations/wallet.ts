// ==============================================================================
// YUKI WEB V4 — WALLET VALIDATION SCHEMAS
// ==============================================================================

import { z } from 'zod';

export const topupRequestSchema = z.object({
  amount: z
    .number()
    .int('Số tiền phải là số nguyên')
    .min(10000, 'Số tiền nạp tối thiểu là 10.000 VND')
    .max(5000000, 'Số tiền nạp tối đa 1 lần là 5.000.000 VND'),
  bankName: z.string().min(2, 'Tên ngân hàng không hợp lệ').default('ZaloPay'),
});

export const refundRequestSchema = z.object({
  orderId: z.string().uuid('Mã đơn hàng không hợp lệ'),
  reason: z.string().min(10, 'Lý do khiếu nại phải có ít nhất 10 ký tự').max(500, 'Lý do quá dài'),
});

export const adminTopupReviewSchema = z.object({
  topupId: z.string().uuid('ID yêu cầu nạp không hợp lệ'),
  decision: z.enum(['APPROVE', 'REJECT']),
  adminNote: z.string().max(200).optional(),
});

export type TopupRequestInput = z.infer<typeof topupRequestSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type AdminTopupReviewInput = z.infer<typeof adminTopupReviewSchema>;
