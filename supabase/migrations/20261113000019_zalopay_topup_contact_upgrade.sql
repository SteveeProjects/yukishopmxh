-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 19: ZALOPAY TOPUP QR, ATOMIC SEQUENCE & CONTACT UPGRADE
-- Version: 20261113000019
-- ==============================================================================

-- 1. Database Sequence for Sequential Topup Codes (YukiSp_000001, YukiSp_000002...)
CREATE SEQUENCE IF NOT EXISTS public.topup_code_seq START WITH 1 INCREMENT BY 1;

-- 2. Atomic Function to Generate Sequential Topup Code
CREATE OR REPLACE FUNCTION public.generate_topup_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_val BIGINT;
BEGIN
    next_val := nextval('public.topup_code_seq');
    RETURN 'YukiSp_' || LPAD(next_val::TEXT, 6, '0');
END;
$$;

-- 3. Update topup_requests Amount Range Constraint (10.000đ - 5.000.000đ)
ALTER TABLE public.topup_requests DROP CONSTRAINT IF EXISTS check_topup_amount_range;
ALTER TABLE public.topup_requests ADD CONSTRAINT check_topup_amount_range CHECK (amount >= 10000 AND amount <= 5000000);

-- 4. Payment Settings Table (Editable by Admin in Dashboard)
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    bank_name TEXT NOT NULL DEFAULT 'ZaloPay',
    account_number TEXT NOT NULL DEFAULT '99ZP26265M78019191',
    account_name TEXT NOT NULL DEFAULT 'ZALOPAY_NGUYEN THAI TU',
    phone_number TEXT NOT NULL DEFAULT '0385180629',
    min_amount BIGINT NOT NULL DEFAULT 10000,
    max_amount BIGINT NOT NULL DEFAULT 5000000,
    qr_image_url TEXT NOT NULL DEFAULT '/assets/images/zalopay_qr.jpg',
    qr_api_template TEXT NOT NULL DEFAULT 'https://api.vietqr.io/image/970454-99ZP26265M78019191-compact2.png',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Official Default ZaloPay Config
INSERT INTO public.payment_settings (
    id, bank_name, account_number, account_name, phone_number, min_amount, max_amount, qr_image_url, qr_api_template
) VALUES (
    'default',
    'ZaloPay',
    '99ZP26265M78019191',
    'ZALOPAY_NGUYEN THAI TU',
    '0385180629',
    10000,
    5000000,
    '/assets/images/zalopay_qr.jpg',
    'https://api.vietqr.io/image/970454-99ZP26265M78019191-compact2.png'
)
ON CONFLICT (id) DO UPDATE SET
    bank_name = EXCLUDED.bank_name,
    account_number = EXCLUDED.account_number,
    account_name = EXCLUDED.account_name,
    phone_number = EXCLUDED.phone_number,
    min_amount = EXCLUDED.min_amount,
    max_amount = EXCLUDED.max_amount,
    qr_image_url = EXCLUDED.qr_image_url,
    qr_api_template = EXCLUDED.qr_api_template,
    updated_at = NOW();

-- 5. Contact & Support Settings Table (Admin-Configurable Channels)
CREATE TABLE IF NOT EXISTS public.contact_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    telegram_url TEXT NOT NULL DEFAULT 'https://t.me/YukiIsMe2311',
    discord_url TEXT NOT NULL DEFAULT 'https://discord.com/users/1312037242331729971',
    warning_notice TEXT NOT NULL DEFAULT 'Website hiện vận hành xử lý thủ công (không tự động done đơn qua API). Sau khi tạo đơn, vui lòng bấm nút liên hệ bên dưới để nhắn cho Admin kiểm tra và hoàn thành đơn hàng cho bạn.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Official Default Contact Links
INSERT INTO public.contact_settings (
    id, telegram_url, discord_url, warning_notice
) VALUES (
    'default',
    'https://t.me/YukiIsMe2311',
    'https://discord.com/users/1312037242331729971',
    'Website hiện vận hành xử lý thủ công (không tự động done đơn qua API). Sau khi tạo đơn, vui lòng bấm nút liên hệ bên dưới để nhắn cho Admin kiểm tra và hoàn thành đơn hàng cho bạn.'
)
ON CONFLICT (id) DO UPDATE SET
    telegram_url = EXCLUDED.telegram_url,
    discord_url = EXCLUDED.discord_url,
    warning_notice = EXCLUDED.warning_notice,
    updated_at = NOW();

-- 6. RLS Policies for payment_settings & contact_settings
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Payment Settings"
    ON public.payment_settings FOR SELECT
    USING (true);

CREATE POLICY "Admin All Payment Settings"
    ON public.payment_settings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
    ));

CREATE POLICY "Public Read Contact Settings"
    ON public.contact_settings FOR SELECT
    USING (true);

CREATE POLICY "Admin All Contact Settings"
    ON public.contact_settings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
    ));
