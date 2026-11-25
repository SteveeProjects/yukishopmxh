-- ==============================================================================
-- YUKISHOPMXH — MASTER PRODUCTION DATABASE MIGRATION FOR VERCEL & SUPABASE
-- File: supabase/VERCEL_FULL_MIGRATION.sql
-- Idempotent: Safe to run multiple times without data loss.
-- Supports both UUID and custom TEXT IDs (usr_*, admin_*, etc.).
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. SYSTEM SETTINGS (Telegram Config, Site Config, Sequential Deposit Counter, MacroDroid Logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.system_settings (key, value, updated_at)
VALUES
  ('site_settings', jsonb_build_object(
    'sleep_mode', false,
    'sleep_message', 'Shop đang tạm nghỉ duyệt tay. Nạp ví Auto 24/7 vẫn hoạt động; đơn xử lý thủ công sẽ được duyệt ngay khi mở ca.',
    'cashback_rate', 0.02,
    'cashback_min_order', 20000,
    'cashback_min_redeem', 5000,
    'affiliate_rate', 0.05
  ), NOW()),
  ('announcement_popup', jsonb_build_object(
    'is_active', false,
    'banner_active', true,
    'title', 'THÔNG BÁO TỪ YUKISHOPMXH',
    'content', 'Hệ thống vận hành kiểm duyệt thủ công 24/7 an toàn và chuẩn xác.',
    'cta_text', 'Tham Gia Kênh Telegram',
    'cta_link', 'https://t.me/yukismsnotice',
    'banner_text', 'YukiShopMXH: Dịch Vụ Số & MXH — Nạp Ví Auto 24/7 theo Mã Đơn Hàng — Bảo Mật Chuẩn Xác',
    'updated_at', NOW()
  ), NOW())
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 2. PROFILES / USERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT,
  phone TEXT,
  telegram_id TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  cashback_points NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_cashback_earned NUMERIC(15, 2) NOT NULL DEFAULT 0,
  affiliate_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  withdrawable_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  free_withdrawal_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  referral_earnings NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_deposited NUMERIC(15, 2) NOT NULL DEFAULT 0,
  spin_tickets INTEGER NOT NULL DEFAULT 0,
  deposit_spin_progress BIGINT NOT NULL DEFAULT 0,
  affi_spin_progress BIGINT NOT NULL DEFAULT 0,
  saved_profiles JSONB NOT NULL DEFAULT '[]'::jsonb,
  payout_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  vouchers JSONB NOT NULL DEFAULT '[]'::jsonb,
  session_version INTEGER NOT NULL DEFAULT 1,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cashback_points NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_cashback_earned NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_balance NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdrawable_balance NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_withdrawal_balance NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_earnings NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_deposited NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spin_tickets INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deposit_spin_progress BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affi_spin_progress BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS saved_profiles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_accounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vouchers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram ON public.profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_profiles_refcode ON public.profiles(referral_code);

INSERT INTO public.profiles (id, email, username, full_name, telegram_id, password_hash, role, balance, session_version, created_at, updated_at)
VALUES (
  'admin_kyomeyuki2k',
  'kyomeyuki2k@gmail.com',
  'kyomeyuki2k',
  'Admin YukiIsMe2311',
  '8960751162',
  '5336920e4f15951ece7bc9703fa3007fde69bd973e92cb544e0c37effc8605c5',
  'admin',
  999999999,
  1,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  telegram_id = '8960751162',
  password_hash = COALESCE(NULLIF(public.profiles.password_hash, ''), EXCLUDED.password_hash);

-- ==============================================================================
-- 3. WALLET TRANSACTIONS & DEPOSIT REQUESTS (SEQUENTIAL YukiSp_000001+)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'DEPOSIT',
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  delta BIGINT NOT NULL DEFAULT 0,
  balance_before NUMERIC(15, 2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(15, 2) NOT NULL DEFAULT 0,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS delta BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON public.wallet_transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_code TEXT UNIQUE,
  user_id TEXT,
  username TEXT,
  user_email TEXT,
  user_name TEXT,
  user_contact TEXT,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  transfer_code TEXT UNIQUE,
  transfer_content TEXT UNIQUE,
  bank_code TEXT DEFAULT 'ZALOPAY',
  payment_method TEXT DEFAULT 'VIETQR',
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  tx_ref TEXT,
  telegram_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS order_number BIGINT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS transfer_content TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS bank_code TEXT DEFAULT 'ZALOPAY';
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS tx_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_dep_req_code ON public.deposit_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_dep_transfer ON public.deposit_requests(transfer_code);
CREATE INDEX IF NOT EXISTS idx_dep_user ON public.deposit_requests(user_id);

-- ==============================================================================
-- 4. PRODUCTS, COUPONS & ORDERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(15, 2) DEFAULT 0,
  sell_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  original_price NUMERIC(15, 2) DEFAULT 0,
  cost_price NUMERIC(15, 2) DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'AI & Công Nghệ',
  display_section TEXT DEFAULT 'Trang Chủ - Sản Phẩm Nổi Bật',
  image_url TEXT,
  icon TEXT,
  input_type TEXT DEFAULT 'none',
  allow_voucher BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_hidden BOOLEAN DEFAULT FALSE,
  stock INTEGER NOT NULL DEFAULT 99,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  warranty_days INTEGER NOT NULL DEFAULT 30,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'PERCENT',
  discount_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(15, 2) DEFAULT NULL,
  min_order_amount NUMERIC(15, 2) DEFAULT 0,
  usage_limit INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  applicable_to TEXT DEFAULT 'ALL',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.coupons (code, discount_type, discount_value, max_discount, min_order_amount, usage_limit, applicable_to, is_active)
VALUES ('YUKI10', 'PERCENT', 10, 50000, 20000, 1000, 'ALL', true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_code TEXT UNIQUE NOT NULL,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  user_contact TEXT,
  delivery_contact TEXT NOT NULL DEFAULT '',
  telegram_id TEXT,
  product_id TEXT,
  product_name TEXT,
  item_name TEXT NOT NULL DEFAULT '',
  product_sku TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(15, 2) DEFAULT 0,
  discount_amount NUMERIC(15, 2) DEFAULT 0,
  amount NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15, 2) DEFAULT 0,
  cost_price NUMERIC(15, 2) DEFAULT 0,
  supplier_name TEXT,
  voucher_code TEXT,
  coupon_code TEXT,
  partner_code TEXT,
  payment_method TEXT DEFAULT 'wallet',
  customer_input TEXT,
  target_link TEXT,
  account_credentials TEXT,
  delivered_data TEXT,
  delivery_info TEXT,
  approved_by TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid BOOLEAN DEFAULT FALSE,
  deducted_balance BOOLEAN DEFAULT FALSE,
  refunded BOOLEAN DEFAULT FALSE,
  order_type TEXT DEFAULT 'PRODUCT',
  service_type TEXT DEFAULT 'PRODUCT',
  warranty_days INTEGER DEFAULT 30,
  warranty_claimed BOOLEAN DEFAULT FALSE,
  warranty_claim_reason TEXT,
  warranty_status TEXT,
  warranty_resolution_note TEXT,
  warranty_resolved_at TIMESTAMPTZ,
  cashback_awarded BIGINT DEFAULT 0,
  partner_commission_awarded BIGINT DEFAULT 0,
  telegram_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_info TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deducted_balance BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_claim_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_resolution_note TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ==============================================================================
-- 5. PASSWORD RESET TOKENS, BOT SESSIONS, AFFILIATE & PAYOUT ACCOUNTS
-- ==============================================================================
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

CREATE TABLE IF NOT EXISTS public.referral_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  deposit_order_id TEXT UNIQUE,
  deposit_amount NUMERIC(15, 2) NOT NULL,
  commission_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.05,
  commission_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DISTRIBUTED',
  referee_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  username TEXT,
  user_email TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  fee NUMERIC(15, 2) DEFAULT 0,
  net_amount NUMERIC(15, 2) NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  account_number TEXT,
  account_holder TEXT NOT NULL,
  account_name TEXT,
  contact TEXT,
  qr_code_url TEXT,
  qr_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source TEXT DEFAULT 'MACRODROID',
  method TEXT DEFAULT 'POST',
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  raw_payload TEXT DEFAULT '',
  received_amount NUMERIC(15, 2) DEFAULT 0,
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
  received_amount NUMERIC(15, 2) DEFAULT 0,
  order_code TEXT,
  status TEXT DEFAULT 'INFO',
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) & GRANTS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','wallet_transactions','deposit_requests','orders','system_settings',
    'products','coupons','password_reset_tokens','telegram_bot_sessions',
    'referral_logs','saved_payout_accounts','affiliate_withdrawals','webhook_logs','macro_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "service_role_all_%I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

COMMIT;
