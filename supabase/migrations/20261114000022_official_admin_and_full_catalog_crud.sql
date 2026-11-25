-- ==============================================================================
-- YUKISHOPMXH — MIGRATION 22: OFFICIAL ADMIN ACCOUNT, SETTINGS & CATALOG CRUD
-- Version: 20261114000022
-- ==============================================================================

-- 1. Create or Upgrade App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed System Default Settings (Telegram Admin & Contact Channels)
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('telegram_admin_chat_id', '8960751162', 'Default Telegram Chat ID for Admin alerts'),
    ('telegram_bot_token', 'ENV:TELEGRAM_BOT_TOKEN', 'Configure TELEGRAM_BOT_TOKEN in environment variables'),
    ('telegram_contact_url', 'https://t.me/YukiIsMe2311', 'Admin Telegram Contact Link'),
    ('discord_contact_url', 'https://discord.com/users/1312037242331729971', 'Admin Discord Profile Link')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 2. Ensure Catalog Items Table for Dynamic Admin Web CRUD
CREATE TABLE IF NOT EXISTS public.catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    group_type TEXT NOT NULL DEFAULT 'STORE' CHECK (group_type IN ('STORE', 'BUFF', 'API_TOOL')),
    category TEXT NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    original_price BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'HIDDEN', 'ARCHIVED')),
    warranty TEXT DEFAULT 'Bảo hành đầy đủ chu kỳ',
    stock INTEGER NOT NULL DEFAULT 999,
    image_url TEXT,
    description TEXT,
    server_id INTEGER,
    min_qty INTEGER DEFAULT 1,
    max_qty INTEGER DEFAULT 1000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON public.catalog_items(sku);
CREATE INDEX IF NOT EXISTS idx_catalog_items_group ON public.catalog_items(group_type);
CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON public.catalog_items(status);

-- 3. Enable RLS on catalog_items
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active products" ON public.catalog_items;
CREATE POLICY "Public can view active products"
ON public.catalog_items FOR SELECT
TO anon, authenticated
USING (status = 'ACTIVE' OR status = 'OUT_OF_STOCK');

DROP POLICY IF EXISTS "Admins have full control on catalog_items" ON public.catalog_items;
CREATE POLICY "Admins have full control on catalog_items"
ON public.catalog_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'ADMIN'
    )
);

-- 4. Seed / Ensure Official Admin Profile & Role
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 4a. Check if auth user exists or create a mock record
    -- In Supabase auth schema:
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE telegram_id = 'YukiIsMe2311') THEN
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            phone,
            phone_number,
            telegram_id,
            telegram_username,
            terms_accepted_at,
            created_at,
            updated_at
        )
        VALUES (
            v_admin_id,
            'yukiisme2311@yukishopmxh.internal',
            'Yuki Admin',
            '8960751162',
            '8960751162',
            'YukiIsMe2311',
            'YukiIsMe2311',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            telegram_id = 'YukiIsMe2311',
            telegram_username = 'YukiIsMe2311',
            phone = '8960751162',
            updated_at = NOW();

        -- 4b. Assign ADMIN Role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_admin_id, 'ADMIN')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- 4c. Provision Admin Wallet Account (Unlimited / 10.000.000 VND)
        INSERT INTO public.wallet_accounts (user_id, balance, currency)
        VALUES (v_admin_id, 10000000, 'VND')
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        -- Update existing record to ensure ADMIN role
        UPDATE public.profiles 
        SET telegram_id = 'YukiIsMe2311', 
            telegram_username = 'YukiIsMe2311', 
            phone = '8960751162',
            updated_at = NOW()
        WHERE telegram_id = 'YukiIsMe2311';

        INSERT INTO public.user_roles (user_id, role)
        SELECT id, 'ADMIN'::public.app_role 
        FROM public.profiles 
        WHERE telegram_id = 'YukiIsMe2311'
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
