// ==============================================================================
// YUKISHOPMXH — AUTOMATIC DATABASE MIGRATION & POSTGRESQL INITIALIZATION
// Automatically creates & verifies all tables, alters missing columns,
// grants permissions, reloads PostgREST schema, and seeds default data.
// Executes once per process lifecycle with global guard.
// ==============================================================================

import { Pool } from 'pg';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

declare global {
  // eslint-disable-next-line no-var
  var __dbMigrated: boolean | undefined;
  // eslint-disable-next-line no-var
  var __dbMigratePromise: Promise<boolean> | undefined;
  // eslint-disable-next-line no-var
  var __pgPoolInstance: Pool | undefined;
}

/**
 * Returns PostgreSQL connection string with fallback order:
 * POSTGRES_URL_NON_POOLING -> POSTGRES_URL -> DATABASE_URL -> POSTGRES_PRISMA_URL -> SUPABASE_DB_URL
 */
export function getPostgresConnectionString(): string {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim();
}

/**
 * Checks if a Database is configured (Postgres connection string or Supabase service role).
 */
export function isDatabaseConfigured(): boolean {
  if (getPostgresConnectionString()) return true;

  const sbUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const sbKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

  if (sbUrl && sbKey && !sbUrl.includes('placeholder') && !sbKey.includes('placeholder')) {
    return true;
  }

  return false;
}

/**
 * Returns lazy-initialized PostgreSQL Pool with SSL support.
 */
export function getPostgresPool(): Pool | null {
  const connectionString = getPostgresConnectionString();
  if (!connectionString) return null;

  if (!global.__pgPoolInstance) {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    global.__pgPoolInstance = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });
  }

  return global.__pgPoolInstance;
}

/**
 * Executes a raw query via PostgreSQL pool if available.
 */
export async function queryPostgres(text: string, params: any[] = []): Promise<any> {
  const pool = getPostgresPool();
  if (!pool) return null;
  return await pool.query(text, params);
}

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES / USERS
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT,
  balance NUMERIC DEFAULT 0,
  affiliate_balance NUMERIC DEFAULT 0,
  cashback_points NUMERIC DEFAULT 0,
  total_cashback_earned NUMERIC DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  telegram_id TEXT,
  phone TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all required columns exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_balance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdrawable_balance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_withdrawal_balance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cashback_points NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_cashback_earned NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_deposited NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spin_tickets INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deposit_spin_progress BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affi_spin_progress BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS saved_profiles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_accounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vouchers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  sell_price NUMERIC DEFAULT 0,
  original_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'AI & Công Nghệ',
  display_section TEXT DEFAULT 'Trang Chủ - Sản Phẩm Nổi Bật',
  image_url TEXT,
  icon TEXT,
  input_type TEXT DEFAULT 'none',
  allow_voucher BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_hidden BOOLEAN DEFAULT FALSE,
  stock INT DEFAULT 99,
  status TEXT DEFAULT 'ACTIVE',
  warranty_days INT DEFAULT 30,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Ensure all required columns exist on products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sell_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT 'Kho Bản Quyền Yuki';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'AI & Công Nghệ';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_section TEXT DEFAULT 'Trang Chủ - Sản Phẩm Nổi Bật';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS input_type TEXT DEFAULT 'none';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allow_voucher BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 99;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warranty_days INT DEFAULT 30;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. VOUCHERS / COUPONS
CREATE TABLE IF NOT EXISTS public.vouchers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'PERCENT',
  discount_value NUMERIC DEFAULT 0,
  min_order NUMERIC DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  max_uses INT DEFAULT 100,
  usage_limit INT,
  used_count INT DEFAULT 0,
  applicable_to TEXT DEFAULT 'ALL',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vouchers ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'PERCENT',
  discount_value NUMERIC DEFAULT 0,
  min_order NUMERIC DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  max_uses INT DEFAULT 100,
  usage_limit INT,
  used_count INT DEFAULT 0,
  applicable_to TEXT DEFAULT 'ALL',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_code TEXT UNIQUE,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  user_contact TEXT,
  delivery_contact TEXT,
  product_id TEXT,
  product_name TEXT,
  item_name TEXT,
  product_sku TEXT,
  sku TEXT,
  quantity INT DEFAULT 1,
  amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  voucher_code TEXT,
  coupon_code TEXT,
  customer_input TEXT,
  target_link TEXT,
  account_credentials TEXT,
  delivered_data TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  paid BOOLEAN DEFAULT FALSE,
  order_type TEXT DEFAULT 'PRODUCT',
  service_type TEXT DEFAULT 'PRODUCT',
  telegram_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure order columns exist
ALTER TABLE public.orders ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_contact TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_contact TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_sku TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voucher_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS partner_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'wallet';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_input TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS target_link TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS account_credentials TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_data TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_info TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deducted_balance BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'PRODUCT';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'PRODUCT';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_days INT DEFAULT 30;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_claim_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_resolution_note TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_resolved_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cashback_awarded BIGINT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS partner_commission_awarded BIGINT DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS telegram_notified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. DEPOSIT_REQUESTS
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_code TEXT UNIQUE,
  user_id TEXT,
  username TEXT,
  user_email TEXT,
  user_name TEXT,
  user_contact TEXT,
  amount NUMERIC DEFAULT 0,
  transfer_code TEXT UNIQUE,
  transfer_content TEXT UNIQUE,
  bank_code TEXT DEFAULT 'ZALOPAY',
  payment_method TEXT DEFAULT 'VIETQR',
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  tx_ref TEXT,
  telegram_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deposit_requests ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS order_number BIGINT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS request_code TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS user_contact TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS transfer_code TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS transfer_content TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS bank_code TEXT DEFAULT 'ZALOPAY';
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'VIETQR';
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS tx_ref TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS telegram_notified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AFFILIATE_WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  username TEXT,
  user_email TEXT,
  amount NUMERIC DEFAULT 0,
  fee NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  bank_name TEXT,
  bank_account TEXT,
  account_number TEXT,
  account_holder TEXT,
  account_name TEXT,
  contact TEXT,
  qr_code_url TEXT,
  qr_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.affiliate_withdrawals ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS fee NUMERIC DEFAULT 0;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS account_holder TEXT;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.affiliate_withdrawals ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- 8. PASSWORD_RESET_TOKENS
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  user_id TEXT,
  telegram_id TEXT,
  token_type TEXT DEFAULT 'SHORT_OTP',
  verified_telegram BOOLEAN DEFAULT FALSE,
  magic_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.password_reset_tokens ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE public.password_reset_tokens ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'SHORT_OTP';
ALTER TABLE public.password_reset_tokens ADD COLUMN IF NOT EXISTS verified_telegram BOOLEAN DEFAULT FALSE;
ALTER TABLE public.password_reset_tokens ADD COLUMN IF NOT EXISTS magic_token TEXT;

-- 9. BUFF_SERVICES
CREATE TABLE IF NOT EXISTS public.buff_services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server_id TEXT UNIQUE NOT NULL,
  platform TEXT DEFAULT 'BUFF',
  service_type TEXT DEFAULT 'BUFF',
  name TEXT NOT NULL,
  sell_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. WALLET_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  delta BIGINT NOT NULL DEFAULT 0,
  balance_before NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS delta BIGINT NOT NULL DEFAULT 0;

-- 11. TELEGRAM_BOT_SESSIONS
CREATE TABLE IF NOT EXISTS public.telegram_bot_sessions (
  chat_id TEXT PRIMARY KEY,
  bot_type TEXT NOT NULL DEFAULT 'otp',
  step TEXT NOT NULL DEFAULT 'idle',
  email TEXT,
  otp TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  expires_at BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.telegram_bot_sessions ADD COLUMN IF NOT EXISTS bot_type TEXT DEFAULT 'otp';
ALTER TABLE public.telegram_bot_sessions ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.telegram_bot_sessions ADD COLUMN IF NOT EXISTS expires_at BIGINT DEFAULT 0;

-- 12. REFERRAL_LOGS & SAVED_PAYOUT_ACCOUNTS
CREATE TABLE IF NOT EXISTS public.referral_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  deposit_order_id TEXT,
  deposit_amount NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0.05,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'DISTRIBUTED',
  referee_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_payout_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  contact TEXT,
  qr_code_url TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. WEBHOOK_LOGS & MACRO_LOGS (MacroDroid + Telegram Audit Logs)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source TEXT DEFAULT 'MACRODROID',
  method TEXT DEFAULT 'POST',
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  raw_payload TEXT DEFAULT '',
  received_amount NUMERIC DEFAULT 0,
  order_code TEXT,
  status TEXT DEFAULT 'INFO',
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.macro_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  method TEXT DEFAULT 'POST',
  title TEXT DEFAULT '',
  text TEXT DEFAULT '',
  raw_snippet TEXT DEFAULT '',
  received_amount NUMERIC DEFAULT 0,
  order_code TEXT,
  status TEXT DEFAULT 'INFO',
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) to prevent unauthorized REST/GraphQL table dumping
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_logs ENABLE ROW LEVEL SECURITY;
`;

const INITIAL_CATALOG = [
  {
    id: 'GEMINI-PRO-24M-FAMILY',
    sku: 'GEMINI-PRO-24M-FAMILY',
    name: 'Google Gemini Pro 24 Tháng (Add Family / Slot)',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    price: 25000,
    sell_price: 25000,
    original_price: 350000,
    stock: 100,
    status: 'ACTIVE',
    description: 'Nâng cấp chính chủ qua nhóm Family (Slot riêng tư). Chỉ yêu cầu nhập Email Google nhận lời mời.',
    warranty_days: 730,
    input_type: 'email_only',
    allow_voucher: true,
  },
  {
    id: 'GEMINI-ULTRA-1M-FAMILY',
    sku: 'GEMINI-ULTRA-1M-FAMILY',
    name: 'Google AI Ultra — Slot Family 1 Tháng (Chính Chủ)',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    price: 239000,
    sell_price: 239000,
    original_price: 450000,
    stock: 50,
    status: 'ACTIVE',
    description: 'Gói Google AI Ultra dạng Slot Family 1 Tháng (Chính Chủ). Nâng cấp trực tiếp qua lời mời Google Family.',
    warranty_days: 30,
    input_type: 'email_only',
    allow_voucher: true,
  },
  {
    id: 'GEMINI-ULTRA-3M',
    sku: 'GEMINI-ULTRA-3M',
    name: 'Google AI Ultra — Gói 3 Tháng',
    category: 'AI & Công Nghệ',
    display_section: 'Google Gemini',
    price: 59000,
    sell_price: 59000,
    original_price: 150000,
    stock: 50,
    status: 'ACTIVE',
    description: 'Gói Google AI Ultra thời hạn 3 tháng. Định dạng tài khoản hoặc nâng cấp (Duyệt tay qua Bot Telegram).',
    warranty_days: 0,
    input_type: 'credentials',
    allow_voucher: true,
  },
  {
    id: 'MUSE-AI-1B-TOKENS',
    sku: 'MUSE-AI-1B-TOKENS',
    name: 'Muse AI 1 Tỷ Tokens (Gói VIP Bẻ Khóa)',
    category: 'AI & Công Nghệ',
    display_section: 'Muse AI',
    price: 12000,
    sell_price: 12000,
    original_price: 150000,
    stock: 100,
    status: 'ACTIVE',
    description: 'Truy cập mô hình Muse AI tạo video & text cực đại 1 tỷ tokens. Yêu cầu nhập tài khoản.',
    warranty_days: 30,
    input_type: 'credentials',
    allow_voucher: true,
  },
  {
    id: 'API-TOOL-SMS-120K',
    sku: 'API-TOOL-SMS-120K',
    name: 'Key API Tool Spam SMS Tốc Độ Cao (30 Ngày)',
    category: 'Dịch Vụ SMS & OTP',
    display_section: 'Tool Spam SMS',
    price: 120000,
    sell_price: 120000,
    original_price: 250000,
    stock: 99,
    status: 'ACTIVE',
    description: 'Cổng API spam tin nhắn SMS tốc độ cao 30 ngày. Không áp dụng mã giảm giá voucher.',
    warranty_days: 30,
    input_type: 'none',
    allow_voucher: false,
  },
];

/**
 * Ensures all tables exist, permissions are granted, and seed data is populated.
 * Runs non-blocking once per serverless process lifecycle.
 */
export async function ensureDatabaseReady(): Promise<boolean> {
  if (global.__dbMigrated) return true;
  if (global.__dbMigratePromise) return await global.__dbMigratePromise;

  global.__dbMigratePromise = (async () => {
    try {
      const pool = getPostgresPool();

      if (pool) {
        // 1. Run full DDL migration
        await pool.query(MIGRATION_SQL);

        // 2. Grant permissions, ensure strict service_role + products policies & reload PostgREST schema
        try {
          await pool.query(`
            DO $$
            DECLARE tbl TEXT;
            BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
                 AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
                 AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
                GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
                GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
              END IF;
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
                FOREACH tbl IN ARRAY ARRAY[
                  'profiles','orders','deposit_requests','system_settings','password_reset_tokens',
                  'affiliate_withdrawals','vouchers','coupons','wallet_transactions',
                  'telegram_bot_sessions','referral_logs','saved_payout_accounts','webhook_logs','macro_logs'
                ]
                LOOP
                  EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON public.%I;', tbl, tbl);
                  EXECUTE format('CREATE POLICY "service_role_all_%I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
                END LOOP;
              END IF;
            END
            $$;
          `);
          await pool.query("NOTIFY pgrst, 'reload schema';").catch(() => {});
        } catch (grantErr) {
          // Non-fatal if roles don't exist
        }

        // 3. Seed default Admin profile with SHA-256 hash (zero plaintext password in source)
        try {
          const defaultAdminSha256 =
            '5336920e4f15951ece7bc9703fa3007fde69bd973e92cb544e0c37effc8605c5';
          await pool.query(
            `INSERT INTO public.profiles (id, email, username, full_name, telegram_id, password_hash, role, balance, session_version, created_at, updated_at)
             VALUES (
               'admin_kyomeyuki2k',
               'kyomeyuki2k@gmail.com',
               'kyomeyuki2k',
               'Admin YukiIsMe2311',
               '8960751162',
               $1,
               'admin',
               999999999,
               1,
               NOW(),
               NOW()
             )
             ON CONFLICT (email) DO UPDATE SET
               role = 'admin',
               telegram_id = '8960751162',
               password_hash = COALESCE(NULLIF(public.profiles.password_hash, ''), EXCLUDED.password_hash),
               username = COALESCE(public.profiles.username, 'kyomeyuki2k');`,
            [defaultAdminSha256]
          );
        } catch (adminErr) {
          console.warn('[autoMigrate] Admin profile seed notice:', adminErr);
        }

        // 4. Seed products ONLY IF products table is completely empty (count === 0)
        try {
          const countRes = await pool.query('SELECT COUNT(*) as cnt FROM public.products');
          const count = parseInt(countRes?.rows?.[0]?.cnt || '0', 10);
          if (count === 0) {
            for (const item of INITIAL_CATALOG) {
              await pool.query(`
                INSERT INTO public.products (
                  id, sku, name, description, price, sell_price, original_price,
                  category, display_section, stock, status, is_active, is_hidden,
                  warranty_days, input_type, allow_voucher, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, false, $12, $13, $14, NOW(), NOW())
                ON CONFLICT (sku) DO NOTHING;
              `, [
                item.id,
                item.sku,
                item.name,
                item.description,
                item.price,
                item.sell_price,
                item.original_price,
                item.category,
                item.display_section,
                item.stock,
                item.status,
                item.warranty_days,
                item.input_type,
                item.allow_voucher,
              ]);
            }
          }
        } catch (prodErr) {
          console.warn('[autoMigrate] Products seed notice:', prodErr);
        }

        // 5. Seed default system settings if not exists
        try {
          await pool.query(`
            INSERT INTO public.system_settings (key, value, updated_at)
            VALUES 
              ('site_settings', '{"sleep_mode": false, "sleep_message": "Shop đang tạm nghỉ duyệt tay. Nạp ví Auto 24/7 vẫn hoạt động; đơn xử lý thủ công sẽ được duyệt ngay khi mở ca.", "cashback_rate": 0.02, "affiliate_rate": 0.05}'::jsonb, NOW()),
              ('announcement_popup', '{"is_active": false, "banner_active": true, "title": "Thông Báo Hệ Thống YukiShopMXH", "content": "", "cta_text": "Kênh Hỗ Trợ Telegram", "cta_link": "https://t.me/YukiIsMe2311", "banner_text": ""}'::jsonb, NOW())
            ON CONFLICT (key) DO NOTHING;
          `);
        } catch (settingsErr) {}

        global.__dbMigrated = true;
        return true;
      }

      // Supabase fallback if direct PostgreSQL connection is absent
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        try {
          // Check if products table is empty
          const { count } = await sbAdmin.from('products').select('*', { count: 'exact', head: true });
          if (count === 0 || count === null) {
            await sbAdmin.from('products').upsert(INITIAL_CATALOG, { onConflict: 'sku' });
          }

          // Ensure Admin in Supabase Auth & profiles (only when env password is provided)
          try {
            const adminInitialPassword = (
              process.env.ADMIN_INITIAL_PASSWORD ||
              process.env.ADMIN_PASSWORD ||
              ''
            ).trim();

            let adminId = 'admin_kyomeyuki2k';
            if (adminInitialPassword) {
              const { data: authUser } = await sbAdmin.auth.admin.createUser({
                email: 'kyomeyuki2k@gmail.com',
                password: adminInitialPassword,
                email_confirm: true,
                user_metadata: {
                  username: 'kyomeyuki2k',
                  full_name: 'Admin YukiIsMe2311',
                  telegram_id: '8960751162',
                },
              });
              if (authUser?.user?.id) adminId = authUser.user.id;
            }

            const { data: existingAdmin } = await sbAdmin
              .from('profiles')
              .select('id')
              .eq('email', 'kyomeyuki2k@gmail.com')
              .maybeSingle();

            if (!existingAdmin) {
              await sbAdmin.from('profiles').insert({
                id: adminId,
                email: 'kyomeyuki2k@gmail.com',
                username: 'kyomeyuki2k',
                full_name: 'Admin YukiIsMe2311',
                telegram_id: '8960751162',
                password_hash: '5336920e4f15951ece7bc9703fa3007fde69bd973e92cb544e0c37effc8605c5',
                role: 'admin',
                balance: 999999999,
                session_version: 1,
                updated_at: new Date().toISOString(),
              });
            }
          } catch {}
        } catch (sbErr) {
          console.warn('[autoMigrate] Supabase fallback seed notice:', sbErr);
        }

        global.__dbMigrated = true;
        return true;
      }

      return false;
    } catch (err: any) {
      console.warn('[autoMigrate] Database migration error (safe fallback):', err?.message || err);
      return false;
    }
  })();

  return await global.__dbMigratePromise;
}
