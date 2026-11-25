-- ==============================================================================
-- MIGRATION: 20261116000022_affiliate_and_site_settings.sql
-- YUKISHOPMXH — AFFILIATE REFERRAL SYSTEM & SITE SETTINGS ANNOUNCEMENTS
-- ==============================================================================

-- 1. Extend profiles with referral fields
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_earnings NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- 2. Create referral_logs table for commission audit
CREATE TABLE IF NOT EXISTS public.referral_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deposit_order_id TEXT,
  deposit_amount NUMERIC NOT NULL CHECK (deposit_amount > 0),
  commission_rate NUMERIC NOT NULL DEFAULT 0.0300,
  commission_amount NUMERIC NOT NULL CHECK (commission_amount >= 0),
  status TEXT NOT NULL DEFAULT 'DISTRIBUTED' CHECK (status IN ('PENDING', 'DISTRIBUTED', 'CANCELLED')),
  referee_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_logs_referrer ON public.referral_logs(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_logs_referred ON public.referral_logs(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_logs_deposit ON public.referral_logs(deposit_order_id);

-- Enable RLS on referral_logs
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral earnings"
  ON public.referral_logs
  FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Service role full access on referral_logs"
  ON public.referral_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Create site_settings table for dynamic announcements and system configs
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on site_settings (Public read, Service Role write)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on site_settings"
  ON public.site_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow service role write on site_settings"
  ON public.site_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed initial announcement_popup configuration
INSERT INTO public.site_settings (key, value, updated_at)
VALUES (
  'announcement_popup',
  jsonb_build_object(
    'is_active', false,
    'banner_active', true,
    'title', '📢 THÔNG BÁO TỪ YUKISHOPMXH',
    'content', 'Hệ thống vận hành kiểm duyệt thủ công 24/7 an toàn và chuẩn xác. Chúc bạn có trải nghiệm tuyệt vời!',
    'cta_text', 'Tham Gia Kênh Telegram',
    'cta_link', 'https://t.me/yukismsnotice',
    'banner_text', '⚡ YukiShopMXH: Dịch Vụ Số & Mạng Xã Hội Chuyên Nghiệp — Duyệt nạp tự động dưới 2M — Kiểm duyệt bảo mật 24/7',
    'updated_at', NOW()
  ),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();
