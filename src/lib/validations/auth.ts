// ==============================================================================
// YUKI WEB V4 — AUTH VALIDATION SCHEMAS (ZOD COMPATIBLE)
// ==============================================================================

import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Định dạng email không hợp lệ')
    .max(100, 'Email quá dài'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái hoa')
    .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái thường')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 số'),
  fullName: z.string().max(50, 'Họ tên tối đa 50 ký tự').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Định dạng email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ cái hoa')
    .regex(/[a-z]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ cái thường')
    .regex(/[0-9]/, 'Mật khẩu mới phải chứa ít nhất 1 số'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
