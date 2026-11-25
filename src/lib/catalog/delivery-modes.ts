// ==============================================================================
// YUKISHOPMXH — UNIFIED DELIVERY & FULFILLMENT MODES
// ==============================================================================

export type DeliveryMode =
  | 'email_only'
  | 'credentials'
  | 'credentials_2fa'
  | 'admin_deliver'
  | 'contact_admin';

export const ALLOWED_DELIVERY_MODES = new Set<string>([
  'email_only',
  'credentials',
  'credentials_2fa',
  'admin_deliver',
  'contact_admin',
]);

export interface DeliveryModeOption {
  value: DeliveryMode;
  label: string;
  shortBadge: string;
  customerInstruction: string;
}

export const DELIVERY_MODE_OPTIONS: DeliveryModeOption[] = [
  {
    value: 'email_only',
    label: 'Chỉ nhập Email Google (Slot Family)',
    shortBadge: 'Email Family',
    customerInstruction:
      'Chỉ cần nhập chính xác Email Google để Admin gửi lời mời tham gia nhóm Family chính chủ (không cần mật khẩu).',
  },
  {
    value: 'credentials',
    label: 'Khách nhập Tài khoản + Mật khẩu',
    shortBadge: 'TK + MK',
    customerInstruction:
      'Nhập Tài khoản và Mật khẩu cần nâng cấp gói. Nên tắt xác minh 2 bước qua thiết bị hoặc chuyển sang mã 2FA để xử lý nhanh.',
  },
  {
    value: 'credentials_2fa',
    label: 'Khách nhập TK + Mật khẩu + 2FA / Backup Code',
    shortBadge: 'TK + MK + 2FA',
    customerInstruction:
      'Nhập đầy đủ Tài khoản, Mật khẩu và Mã 2FA / Backup Codes để Admin đăng nhập kích hoạt gói không bị gián đoạn.',
  },
  {
    value: 'admin_deliver',
    label: 'Admin tạo & gửi TK / MK / 2FA / Key cho khách',
    shortBadge: 'Admin Gửi TK/Key',
    customerInstruction:
      'Bạn chỉ cần nhập Telegram / Zalo / Gmail nhận thông báo. Sau khi duyệt, Admin sẽ gửi sẵn Tài khoản/Key bàn giao ngay tại mục Đơn Hàng.',
  },
  {
    value: 'contact_admin',
    label: 'Liên hệ trực tiếp Admin (@YukiIsMe2311)',
    shortBadge: 'Nhắn Admin',
    customerInstruction:
      'Gói nâng chay / xử lý riêng: đặt đơn xong nhắn trực tiếp Telegram Admin @YukiIsMe2311 để được kích hoạt nhanh 1-1.',
  },
];

export function normalizeDeliveryMode(raw?: string | null, sku?: string | null): DeliveryMode {
  const s = String(raw || '').trim().toLowerCase();
  const cleanSku = String(sku || '').trim().toUpperCase();

  if (s === 'email_only' || s === 'google_email') return 'email_only';
  if (s === 'credentials_2fa' || s === 'credentials_pipe') return 'credentials_2fa';
  if (s === 'credentials') return 'credentials';
  if (s === 'contact_admin') return 'contact_admin';
  if (s === 'admin_deliver' || s === 'admin_delivered' || s === 'none') return 'admin_deliver';

  if (cleanSku === 'GEMINI-ULTRA-5X-1M' || cleanSku === 'GEMINI-ULTRA-20X-1M') {
    return 'email_only';
  }
  if (cleanSku === 'MUSE-AI-1B-TOKENS') {
    return 'credentials';
  }
  if (cleanSku === 'API-TOOL-SMS-120K') {
    return 'admin_deliver';
  }

  return 'admin_deliver';
}

export function getDeliveryModeMeta(raw?: string | null, sku?: string | null): DeliveryModeOption {
  const normalized = normalizeDeliveryMode(raw, sku);
  return DELIVERY_MODE_OPTIONS.find((opt) => opt.value === normalized) || DELIVERY_MODE_OPTIONS[3];
}
