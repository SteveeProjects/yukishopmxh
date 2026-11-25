// ==============================================================================
// YUKISHOPMXH — AUTOMATIC DATABASE MIGRATION & POSTGRESQL INITIALIZATION
// Automatically creates & verifies all tables, alters missing columns,
// grants permissions, reloads PostgREST schema, and seeds default data.
// Executes once per process lifecycle with global guard.
// ==============================================================================

import crypto from 'crypto';
import { Pool } from 'pg';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/password-hash';
import {
  getPostgresRawUrl,
  getSupabaseServiceKey,
  getSupabaseUrl,
  normalizePostgresSslUrl,
} from '@/lib/supabase/env';

declare global {
  // eslint-disable-next-line no-var
  var __dbMigrated: boolean | undefined;
  // eslint-disable-next-line no-var
  var __dbMigratePromise: Promise<boolean> | undefined;
  // eslint-disable-next-line no-var
  var __pgPoolInstance: Pool | undefined;
}

/**
 * Returns normalized PostgreSQL connection string with fallback order:
 * POSTGRES_URL_NON_POOLING -> POSTGRES_URL -> DATABASE_URL -> POSTGRES_PRISMA_URL -> SUPABASE_DB_URL
 */
export function getPostgresConnectionString(): string {
  return normalizePostgresSslUrl(getPostgresRawUrl());
}

export function isPostgresConfigured(): boolean {
  return Boolean(getPostgresConnectionString());
}

/**
 * Checks if a Database is configured (Postgres connection string or Supabase service role).
 */
export function isDatabaseConfigured(): boolean {
  if (getPostgresConnectionString()) return true;
  if (getSupabaseUrl() && getSupabaseServiceKey()) return true;
  return false;
}

/**
 * Returns lazy-initialized PostgreSQL Pool with normalized SSL support & socket recovery.
 */
export function getPostgresPool(): Pool | null {
  const connectionString = getPostgresConnectionString();
  if (!connectionString) return null;

  if (!global.__pgPoolInstance) {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 25000,
      connectionTimeoutMillis: 8000,
    });
    pool.on('error', (err) => {
      console.warn('[pgPool] Idle client error (resetting pool):', err?.message || err);
      global.__pgPoolInstance = undefined;
    });
    global.__pgPoolInstance = pool;
  }

  return global.__pgPoolInstance;
}

const TRANSIENT_PG_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', '57P01', '57P02', '57P03']);

/**
 * Executes a raw query via PostgreSQL pool if available, retrying once on dropped socket.
 */
export async function queryPostgres(text: string, params: any[] = []): Promise<any> {
  const pool = getPostgresPool();
  if (!pool) return null;

  try {
    return await pool.query(text, params);
  } catch (err: any) {
    const msg = String(err?.message || '');
    const isTransient =
      TRANSIENT_PG_CODES.has(String(err?.code || '')) ||
      /Connection terminated|ECONNRESET|ETIMEDOUT|Client has encountered a connection error|self-signed certificate/i.test(
        msg
      );
    if (!isTransient) throw err;

    console.warn('[queryPostgres] Transient error, recreating pool and retrying once:', msg);
    try {
      await pool.end().catch(() => {});
    } catch {}
    global.__pgPoolInstance = undefined;
    const freshPool = getPostgresPool();
    if (!freshPool) throw err;
    return await freshPool.query(text, params);
  }
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
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'admin_deliver';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_input_label TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fulfillment_mode TEXT DEFAULT 'MANUAL';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2B. CATEGORIES (FOLDERS)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT,
  icon TEXT DEFAULT 'Folder',
  description TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Folder';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approval_mode TEXT;
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
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS telegram_notified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sequence for sequential order-tied topup codes
CREATE SEQUENCE IF NOT EXISTS public.deposit_order_seq START WITH 1 INCREMENT BY 1;

-- Indexes for fast, idempotent & conflict-safe upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_uniq ON public.profiles(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_uniq ON public.products(sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_uniq ON public.categories(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_uniq ON public.coupons(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_code_uniq ON public.orders(order_code) WHERE order_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dep_req_code_uniq ON public.deposit_requests(request_code) WHERE request_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dep_fingerprint_uniq ON public.deposit_requests(fingerprint) WHERE fingerprint IS NOT NULL;

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
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buff_services ENABLE ROW LEVEL SECURITY;

-- Safe fault-tolerant trigger for Supabase Auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (
      id, email, username, full_name, telegram_id, role, balance, session_version, created_at, updated_at
    )
    VALUES (
      NEW.id::text,
      LOWER(NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(COALESCE(NEW.email, ''), '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
      NEW.raw_user_meta_data->>'telegram_id',
      'user',
      0,
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  RETURN NEW;
END;
$$;
`;

export const OBSOLETE_CATALOG_SKUS = [
  'GEMINI-PRO-24M-FAMILY',
  'GEMINI-ULTRA-3M',
  'GEMINI-ULTRA-1M-FAMILY',
  'GEMINI-PRO-3M-SLOT',
  'GEMINI-ULTRA-12M-SLOT',
  'GEMINI-ULTRA-UPGRADE',
];

const DEFAULT_CATEGORIES = [
  { name: 'Google Gemini', slug: 'google-gemini', icon: 'Sparkles', description: 'Gói Google AI Ultra 5x / 20x Slot Family chính chủ', sort_order: 1 },
  { name: 'Muse AI', slug: 'muse-ai', icon: 'Video', description: 'Muse AI Tokens & Gói VIP tạo Video', sort_order: 2 },
  { name: 'Dịch Vụ SMS & OTP', slug: 'dich-vu-sms-otp', icon: 'Terminal', description: 'API Tool SMS & Dịch vụ xác thực SMS', sort_order: 3 },
  { name: 'Trí Tuệ Nhân Tạo AI', slug: 'tri-tue-nhan-tao-ai', icon: 'Bot', description: 'ChatGPT, Claude, Grok, DeepSeek & Codex API', sort_order: 4 },
  { name: 'Giải Trí & Video', slug: 'giai-tri-video', icon: 'Film', description: 'YouTube Premium, Netflix 4K, Spotify', sort_order: 5 },
  { name: 'Đồ Họa & Biên Tập', slug: 'do-hoa-bien-tap', icon: 'Palette', description: 'Canva Pro, CapCut Pro, Adobe Creative', sort_order: 6 },
  { name: 'Học Tập & Ngôn Ngữ', slug: 'hoc-tap-ngon-ngu', icon: 'BookOpen', description: 'Duolingo Super & Nền tảng học tập', sort_order: 7 },
  { name: 'Tài Chính & Ngân Hàng', slug: 'tai-chinh-ngan-hang', icon: 'Landmark', description: 'Voucher Số Đẹp MB Bank & Tiện ích ngân hàng', sort_order: 8 },
  { name: 'VPN & Bảo Mật', slug: 'vpn-bao-mat', icon: 'Shield', description: 'HMA VPN, ExpressVPN tốc độ cao', sort_order: 9 },
];

const INITIAL_CATALOG = [
  {
    sku: 'GEMINI-ULTRA-5X-1M',
    name: 'Google AI Ultra 5x (1 Tháng — Slot Family)',
    category: 'Google Gemini',
    display_section: 'Google Gemini',
    price: 85000,
    sell_price: 85000,
    original_price: 250000,
    stock: 99,
    sort_order: 1,
    status: 'ACTIVE',
    description:
      'Gói Google AI Ultra 5x (1 Tháng) nâng cấp chính chủ qua lời mời Google Family (Slot riêng tư). Chỉ cần nhập Email Google nhận lời mời.',
    warranty_days: 30,
    input_type: 'email_only',
    delivery_mode: 'email_only',
    fulfillment_mode: 'MANUAL',
    custom_input_label: 'Email Google nhận lời mời Slot Family (Không cần mật khẩu)',
    allow_voucher: true,
    icon: '/assets/icons/products/gemini.jpg',
  },
  {
    sku: 'GEMINI-ULTRA-20X-1M',
    name: 'Google AI Ultra 20x (1 Tháng — Slot Family)',
    category: 'Google Gemini',
    display_section: 'Google Gemini',
    price: 145000,
    sell_price: 145000,
    original_price: 450000,
    stock: 99,
    sort_order: 2,
    status: 'ACTIVE',
    description:
      'Gói Google AI Ultra 20x (1 Tháng) cao cấp nâng cấp chính chủ qua lời mời Google Family (Slot riêng tư). Chỉ cần nhập Email Google.',
    warranty_days: 30,
    input_type: 'email_only',
    delivery_mode: 'email_only',
    fulfillment_mode: 'MANUAL',
    custom_input_label: 'Email Google nhận lời mời Slot Family (Không cần mật khẩu)',
    allow_voucher: true,
    icon: '/assets/icons/products/gemini.jpg',
  },
  {
    sku: 'MUSE-AI-1B-TOKENS',
    name: 'Muse AI 1B Tokens (Gói VIP)',
    category: 'Muse AI',
    display_section: 'Muse AI',
    price: 12000,
    sell_price: 12000,
    original_price: 60000,
    stock: 100,
    sort_order: 3,
    status: 'ACTIVE',
    description:
      'Cấp hạn mức 1 tỷ tokens gói VIP trên Muse AI. Nhập thông tin tài khoản để Admin kích hoạt.',
    warranty_days: 0,
    input_type: 'credentials',
    delivery_mode: 'credentials',
    fulfillment_mode: 'MANUAL',
    custom_input_label: 'Tài khoản & Mật khẩu Muse AI cần nâng cấp',
    allow_voucher: true,
    icon: '/assets/icons/products/museai.jpg',
  },
  {
    sku: 'API-TOOL-SMS-120K',
    name: 'API Tool SMS (30 Ngày)',
    category: 'Dịch Vụ SMS & OTP',
    display_section: 'Dịch Vụ SMS & OTP',
    price: 120000,
    sell_price: 120000,
    original_price: 250000,
    stock: 99,
    sort_order: 4,
    status: 'ACTIVE',
    description:
      'Gói API Tool SMS thời hạn 30 ngày tốc độ cao. Admin tạo & bàn giao Key/Tài liệu cài đặt. Không áp dụng mã giảm giá.',
    warranty_days: 30,
    input_type: 'admin_deliver',
    delivery_mode: 'admin_deliver',
    fulfillment_mode: 'MANUAL',
    custom_input_label: 'Telegram / Zalo nhận bộ Key & Hướng dẫn API',
    allow_voucher: false,
    icon: '/assets/icons/api/sms-tool.svg',
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

        // 2. Grant permissions, remove restrictive auth.users FKs / legacy CHECKs, sync deposit_order_seq & reload schema
        try {
          await pool.query(`
            DO $$
            DECLARE
              tbl TEXT;
              r RECORD;
            BEGIN
              -- Drop foreign keys pointing to auth.users that block custom/admin inserts
              FOR r IN (
                SELECT c.conname, t.relname
                FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                JOIN pg_namespace n ON t.relnamespace = n.oid
                WHERE n.nspname = 'public'
                  AND c.contype = 'f'
                  AND c.confrelid = 'auth.users'::regclass
              ) LOOP
                EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;', r.relname, r.conname);
              END LOOP;

              -- Drop overly restrictive legacy CHECK constraints on key tables
              FOR r IN (
                SELECT c.conname, t.relname
                FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                JOIN pg_namespace n ON t.relnamespace = n.oid
                WHERE n.nspname = 'public'
                  AND c.contype = 'c'
                  AND t.relname IN ('profiles', 'products', 'orders', 'deposit_requests', 'wallet_transactions', 'topup_requests')
              ) LOOP
                EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;', r.relname, r.conname);
              END LOOP;

              -- Ensure safe UUID/TEXT defaults for id column across core tables
              FOR r IN (
                SELECT table_name, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND column_name = 'id'
                  AND table_name IN (
                    'profiles','products','categories','coupons','vouchers','orders',
                    'deposit_requests','wallet_transactions','affiliate_withdrawals',
                    'password_reset_tokens','referral_logs','saved_payout_accounts',
                    'webhook_logs','macro_logs'
                  )
              ) LOOP
                IF r.udt_name = 'uuid' THEN
                  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid();', r.table_name);
                ELSE
                  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;', r.table_name);
                END IF;
              END LOOP;

              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
                 AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
                 AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
                REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
                REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
                GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
                GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
              END IF;
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
                FOREACH tbl IN ARRAY ARRAY[
                  'profiles','orders','deposit_requests','system_settings','password_reset_tokens',
                  'affiliate_withdrawals','vouchers','coupons','wallet_transactions',
                  'telegram_bot_sessions','referral_logs','saved_payout_accounts','webhook_logs',
                  'macro_logs','categories','products','buff_services'
                ]
                LOOP
                  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
                    EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON public.%I;', tbl, tbl);
                    EXECUTE format('CREATE POLICY "service_role_all_%I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
                  END IF;
                END LOOP;
              END IF;
            END
            $$;
          `);

          // Sync sequential deposit_order_seq with historical records
          await pool.query(`
            SELECT setval(
              'public.deposit_order_seq',
              GREATEST(
                COALESCE((SELECT MAX(order_number) FROM public.orders), 0),
                COALESCE((SELECT MAX(order_number) FROM public.deposit_requests), 0),
                1
              ),
              true
            );
          `).catch(() => {});

          // Delete obsolete legacy SKUs cleanly
          await pool.query(
            `DELETE FROM public.products WHERE sku = ANY($1::text[])`,
            [OBSOLETE_CATALOG_SKUS]
          ).catch(() => {});

          await pool.query("NOTIFY pgrst, 'reload schema';").catch(() => {});
        } catch (grantErr) {
          // Non-fatal if roles don't exist
        }

        // 3. Seed default Admin profile with valid UUID & salted hash (respecting ADMIN_INITIAL_PASSWORD / ADMIN_PASSWORD when set)
        try {
          const adminInitialPassword = (
            process.env.ADMIN_INITIAL_PASSWORD ||
            process.env.ADMIN_PASSWORD ||
            ''
          ).trim();
          const defaultAdminSha256 =
            '5336920e4f15951ece7bc9703fa3007fde69bd973e92cb544e0c37effc8605c5';
          const effectiveAdminHash = adminInitialPassword
            ? hashPassword(adminInitialPassword)
            : defaultAdminSha256;
          await pool.query(
            `INSERT INTO public.profiles (id, email, username, full_name, telegram_id, password_hash, role, balance, session_version, created_at, updated_at)
             VALUES (
               $1,
               'kyomeyuki2k@gmail.com',
               'kyomeyuki2k',
               'Admin YukiIsMe2311',
               '8960751162',
               $2,
               'admin',
               999999999,
               1,
               NOW(),
               NOW()
             )
             ON CONFLICT (email) DO UPDATE SET
               role = 'admin',
               telegram_id = '8960751162',
               password_hash = CASE WHEN $3 THEN EXCLUDED.password_hash ELSE COALESCE(NULLIF(public.profiles.password_hash, ''), EXCLUDED.password_hash) END,
               username = COALESCE(public.profiles.username, 'kyomeyuki2k');`,
            [crypto.randomUUID(), effectiveAdminHash, Boolean(adminInitialPassword)]
          );
        } catch (adminErr) {
          console.warn('[autoMigrate] Admin profile seed notice:', adminErr);
        }

        // 4A. Seed folders ONLY IF categories table is completely empty (count === 0)
        try {
          const catCountRes = await pool.query('SELECT COUNT(*) as cnt FROM public.categories');
          const catCount = parseInt(catCountRes?.rows?.[0]?.cnt || '0', 10);
          if (catCount === 0) {
            for (const cat of DEFAULT_CATEGORIES) {
              await pool.query(
                `INSERT INTO public.categories (name, slug, icon, description, sort_order, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                 ON CONFLICT (name) DO NOTHING;`,
                [cat.name, cat.slug, cat.icon, cat.description, cat.sort_order]
              );
            }
          }
        } catch (catErr) {
          console.warn('[autoMigrate] Categories seed notice:', catErr);
        }

        // 4B. Seed products ONLY IF products table is completely empty (count === 0)
        try {
          const countRes = await pool.query('SELECT COUNT(*) as cnt FROM public.products');
          const count = parseInt(countRes?.rows?.[0]?.cnt || '0', 10);
          if (count === 0) {
            for (const item of INITIAL_CATALOG) {
              await pool.query(`
                INSERT INTO public.products (
                  id, sku, name, description, price, sell_price, original_price,
                  category, display_section, stock, sort_order, status, is_active, is_hidden,
                  warranty_days, input_type, delivery_mode, fulfillment_mode, custom_input_label,
                  allow_voucher, icon, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, false, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
                ON CONFLICT (sku) DO NOTHING;
              `, [
                crypto.randomUUID(),
                item.sku,
                item.name,
                item.description,
                item.price,
                item.sell_price,
                item.original_price,
                item.category,
                item.display_section,
                item.stock,
                item.sort_order,
                item.status,
                item.warranty_days,
                item.input_type,
                item.delivery_mode,
                item.fulfillment_mode,
                item.custom_input_label,
                item.allow_voucher,
                item.icon,
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
          // Remove obsolete SKUs cleanly
          await sbAdmin.from('products').delete().in('sku', OBSOLETE_CATALOG_SKUS);

          // Seed categories if empty
          try {
            const { count: catCount } = await (sbAdmin as any)
              .from('categories')
              .select('*', { count: 'exact', head: true });
            if (catCount === 0 || catCount === null) {
              await (sbAdmin as any).from('categories').upsert(DEFAULT_CATEGORIES, { onConflict: 'name' });
            }
          } catch {}

          // Check if products table is empty (count === 0)
          const { count } = await sbAdmin.from('products').select('*', { count: 'exact', head: true });
          if (count === 0 || count === null) {
            await sbAdmin.from('products').upsert(INITIAL_CATALOG, { onConflict: 'sku' });
          }

          // Ensure Admin in Supabase Auth & profiles with valid UUID
          try {
            const adminInitialPassword = (
              process.env.ADMIN_INITIAL_PASSWORD ||
              process.env.ADMIN_PASSWORD ||
              ''
            ).trim();

            let adminId: string = crypto.randomUUID();
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

            const effectiveSbAdminHash = adminInitialPassword
              ? hashPassword(adminInitialPassword)
              : '5336920e4f15951ece7bc9703fa3007fde69bd973e92cb544e0c37effc8605c5';

            if (!existingAdmin) {
              await sbAdmin.from('profiles').insert({
                id: adminId,
                email: 'kyomeyuki2k@gmail.com',
                username: 'kyomeyuki2k',
                full_name: 'Admin YukiIsMe2311',
                telegram_id: '8960751162',
                password_hash: effectiveSbAdminHash,
                role: 'admin',
                balance: 999999999,
                session_version: 1,
                updated_at: new Date().toISOString(),
              });
            } else if (adminInitialPassword) {
              await sbAdmin
                .from('profiles')
                .update({ password_hash: effectiveSbAdminHash, updated_at: new Date().toISOString() })
                .eq('id', existingAdmin.id);
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
