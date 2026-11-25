-- ==============================================================================
-- YUKISHOPMXH — OFFICIAL COMPLETE DATABASE SCHEMA & MASTER SEED
-- Generated for Production Deployment
-- Includes:
--   1. Enums & Core Extensions (pgcrypto, uuid-ossp)
--   2. Profiles & RBAC (Role: ADMIN for YukiIsMe2311 / Chat ID: 8960751162)
--   3. App Settings (Telegram Bot Token & Admin Chat ID)
--   4. Wallet Accounts & Transaction Ledgers
--   5. Full Catalog Items: 19 Brands (92 packages) + 6 Buff Platforms (28 services, 57 servers) + API Tool SMS
--   6. Orders & Realtime Policies
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('ADMIN', 'CUSTOMER', 'SUPPORT', 'MODERATOR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
    END IF;
END $$;

-- 2. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('telegram_admin_chat_id', '8960751162', 'Default Telegram Chat ID for Admin alerts'),
    ('telegram_bot_token', 'ENV:TELEGRAM_BOT_TOKEN', 'Configure TELEGRAM_BOT_TOKEN in environment variables'),
    ('telegram_contact_url', 'https://t.me/YukiIsMe2311', 'Admin Telegram Contact Link'),
    ('discord_contact_url', 'https://discord.com/users/1312037242331729971', 'Admin Discord Profile Link')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 3. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    phone_number TEXT,
    telegram_id TEXT,
    telegram_username TEXT,
    role TEXT DEFAULT 'CUSTOMER',
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'CUSTOMER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    balance BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'VND',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Official Admin (YukiIsMe2311)
INSERT INTO public.profiles (id, email, full_name, phone, phone_number, telegram_id, telegram_username, role, terms_accepted_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'yukiisme2311@yukishopmxh.internal',
    'Yuki Admin',
    '8960751162',
    '8960751162',
    'YukiIsMe2311',
    'YukiIsMe2311',
    'ADMIN',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET 
    telegram_id = 'YukiIsMe2311',
    telegram_username = 'YukiIsMe2311',
    phone = '8960751162',
    role = 'ADMIN',
    updated_at = NOW();

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'ADMIN')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.wallet_accounts (user_id, balance, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 10000000, 'VND')
ON CONFLICT (user_id) DO NOTHING;

-- 4. CATALOG ITEMS TABLE
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
    warranty TEXT DEFAULT 'Bảo hành chu kỳ',
    stock INTEGER NOT NULL DEFAULT 999,
    image_url TEXT,
    description TEXT,
    server_id INTEGER,
    min_qty INTEGER DEFAULT 1,
    max_qty INTEGER DEFAULT 1000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Catalog Items (19 Brands x 92 Packages)
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('YT-SLOT-BHF-1M', '[SLOT+BHF] Youtube Premium 1 Months', 'YouTube', 'STORE', 'Giải Trí & Video', 25000, 79000, 'ACTIVE', 'Bảo hành full thời gian sử dụng', '/assets/icons/products/youtube.jpg', 'Xem video không quảng cáo, phát trong nền và YouTube Music bản quyền.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('YT-SLOT-BHF-3M', '[SLOT+BHF] Youtube Premium 3 Months', 'YouTube', 'STORE', 'Giải Trí & Video', 175000, 237000, 'ACTIVE', 'Bảo hành full thời gian sử dụng', '/assets/icons/products/youtube.jpg', 'Xem video không quảng cáo, phát trong nền và YouTube Music bản quyền.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('YT-SLOT-BHF-6M', '[SLOT+BHF] Youtube Premium 6 Months', 'YouTube', 'STORE', 'Giải Trí & Video', 315000, 474000, 'ACTIVE', 'Bảo hành full thời gian sử dụng', '/assets/icons/products/youtube.jpg', 'Xem video không quảng cáo, phát trong nền và YouTube Music bản quyền.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('YT-SLOT-BHF-12M', '[SLOT+BHF] Youtube Premium 12 Months', 'YouTube', 'STORE', 'Giải Trí & Video', 580000, 948000, 'ACTIVE', 'Bảo hành full 365 ngày 1 đổi 1', '/assets/icons/products/youtube.jpg', 'Xem video không quảng cáo, phát trong nền và YouTube Music bản quyền.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('YT-GMAIL-3M', '[GMAIL] Youtube Premium 3 Months', 'YouTube', 'STORE', 'Giải Trí & Video', 110000, 250000, 'ACTIVE', 'Bảo hành 3 tháng cấp sẵn tài khoản', '/assets/icons/products/youtube.jpg', 'Xem video không quảng cáo, phát trong nền và YouTube Music bản quyền.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CAPCUT-PRO-7D', '[BHF] Capcut Pro Team 7 Days', 'CapCut', 'STORE', 'Đồ Họa & Biên Tập', 15000, 35000, 'ACTIVE', 'Bảo hành full 7 ngày', '/assets/icons/products/capcut.jpg', 'Biên tập video ngắn hàng đầu, kho template VIP và xuất video 4K sắc nét.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CAPCUT-PRO-12M', '[BHF] Capcut Pro Team 12 Months', 'CapCut', 'STORE', 'Đồ Họa & Biên Tập', 760000, 1200000, 'ACTIVE', 'Bảo hành full 12 tháng', '/assets/icons/products/capcut.jpg', 'Biên tập video ngắn hàng đầu, kho template VIP và xuất video 4K sắc nét.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CHATGPT-GO-3M', '[BH24H] Chatgpt Go 3 Months', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 135000, 300000, 'ACTIVE', 'Bảo hành 24 giờ đầu kích hoạt', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CHATGPT-PLUS-1M', '[KBH] Chatgpt Plus 1 Months', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 165000, 490000, 'ACTIVE', 'Không bảo hành (KBH)', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CHATGPT-TEAM-BIZ', '[KBH] Chatgpt Team Bussiness', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 510000, 1200000, 'ACTIVE', 'Không bảo hành (KBH)', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CHATGPT-PRO-X5-30D', '[BH2D] ChatgptPro X5 30 Days', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 1620000, 4500000, 'ACTIVE', 'Bảo hành 2 ngày đầu', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CODEX-10M-2D', 'Codex API 10M Credit - 2 ngày - BH Full', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 95000, 150000, 'ACTIVE', 'Bảo hành full thời gian gói', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CODEX-20M-2D', 'Codex API 20M Credit - 2 ngày - BH Full', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 125000, 200000, 'ACTIVE', 'Bảo hành full thời gian gói', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CODEX-50M-2D', 'Codex API 50M Credit - 2 ngày - BH Full', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 150000, 250000, 'ACTIVE', 'Bảo hành full thời gian gói', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CODEX-100M-1D', 'Codex API 100M Credit - 1 ngày - BH Full', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 140000, 240000, 'ACTIVE', 'Bảo hành full 24h', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CODEX-100M-5D', 'Codex API 100M Credit - 5 ngày - BH Full', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 210000, 350000, 'ACTIVE', 'Bảo hành full 5 ngày', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CODEX-200M-1D', 'Codex API 200M Credit - 1 ngày - BH Full', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 210000, 350000, 'ACTIVE', 'Bảo hành full 24h', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CODEX-500M-1D', 'Codex API 500M Credit - 1 ngày - BH Full', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 309000, 500000, 'ACTIVE', 'Bảo hành full 24h', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CODEX-1B-2D', 'Codex API 1B Credit - 2 ngày - BH Full', 'ChatGPT & Codex API', 'STORE', 'Trí Tuệ Nhân Tạo AI', 619000, 990000, 'ACTIVE', 'Bảo hành full 2 ngày', '/assets/icons/products/chatgpt.jpg', 'OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GEMINI-CHINH-CHU-12M', '[SLOT] Gemini Chính Chủ 12 Months', 'Gemini', 'STORE', 'Trí Tuệ Nhân Tạo AI', 75000, 250000, 'ACTIVE', 'Bảo hành theo thời hạn slot', '/assets/icons/products/gemini.jpg', 'Mô hình đa phương thức tiên tiến từ Google với ngữ cảnh cực lớn.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GEMINI-PLUS-6M', '[LINK] Gemini Plus 6 Months', 'Gemini', 'STORE', 'Trí Tuệ Nhân Tạo AI', 45000, 150000, 'ACTIVE', 'Bảo hành link kích hoạt', '/assets/icons/products/gemini.jpg', 'Mô hình đa phương thức tiên tiến từ Google với ngữ cảnh cực lớn.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GROK-10M-3D', 'Grok API 10M Credit - 3 ngày - BHF', 'Grok', 'STORE', 'Trí Tuệ Nhân Tạo AI', 150000, 250000, 'ACTIVE', 'Bảo hành full 3 ngày', '/assets/icons/products/grok.jpg', 'Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GROK-30M-3D', 'Grok API 30M Credit - 3 ngày - BHF', 'Grok', 'STORE', 'Trí Tuệ Nhân Tạo AI', 200000, 320000, 'ACTIVE', 'Bảo hành full 3 ngày', '/assets/icons/products/grok.jpg', 'Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GROK-50M-3D', 'Grok API 50M Credit - 3 ngày - BHF', 'Grok', 'STORE', 'Trí Tuệ Nhân Tạo AI', 255000, 400000, 'ACTIVE', 'Bảo hành full 3 ngày', '/assets/icons/products/grok.jpg', 'Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GROK-100M-5D', 'Grok API 100M Credit - 5 ngày - BHF', 'Grok', 'STORE', 'Trí Tuệ Nhân Tạo AI', 400000, 650000, 'ACTIVE', 'Bảo hành full 5 ngày', '/assets/icons/products/grok.jpg', 'Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GROK-200M-5D', 'Grok API 200M Credit - 5 ngày - BHF', 'Grok', 'STORE', 'Trí Tuệ Nhân Tạo AI', 650000, 990000, 'ACTIVE', 'Bảo hành full 5 ngày', '/assets/icons/products/grok.jpg', 'Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GROK-SUPER-15X-1M', 'Grok Super 15X - 1 tháng - BH 24H', 'Grok', 'STORE', 'Trí Tuệ Nhân Tạo AI', 1400000, 2500000, 'ACTIVE', 'Bảo hành 24h đầu', '/assets/icons/products/grok.jpg', 'Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GROK-SUPER-1D', 'Grok Super - 1 ngày - KBH', 'Grok', 'STORE', 'Trí Tuệ Nhân Tạo AI', 120000, 200000, 'ACTIVE', 'Không bảo hành (KBH)', '/assets/icons/products/grok.jpg', 'Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('GROK-PLUS-30D', 'Grok Plus - 30 ngày - BH 24H', 'Grok', 'STORE', 'Trí Tuệ Nhân Tạo AI', 190000, 400000, 'ACTIVE', 'Bảo hành 24h đầu', '/assets/icons/products/grok.jpg', 'Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DEEPSEEK-10USD-1M', 'DeepSeek API 10$ - 1 tháng - BH Full', 'DeepSeek', 'STORE', 'Trí Tuệ Nhân Tạo AI', 89000, 150000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/deepseek.jpg', 'Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DEEPSEEK-30USD-1M', 'DeepSeek API 30$ - 1 tháng - BH Full', 'DeepSeek', 'STORE', 'Trí Tuệ Nhân Tạo AI', 119000, 220000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/deepseek.jpg', 'Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DEEPSEEK-50USD-1M', 'DeepSeek API 50$ - 1 tháng - BH Full', 'DeepSeek', 'STORE', 'Trí Tuệ Nhân Tạo AI', 155000, 300000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/deepseek.jpg', 'Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DEEPSEEK-100USD-1M', 'DeepSeek API 100$ - 1 tháng - BH Full', 'DeepSeek', 'STORE', 'Trí Tuệ Nhân Tạo AI', 249000, 450000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/deepseek.jpg', 'Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DEEPSEEK-200USD-1M', 'DeepSeek API 200$ - 1 tháng - BH Full', 'DeepSeek', 'STORE', 'Trí Tuệ Nhân Tạo AI', 399000, 700000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/deepseek.jpg', 'Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DEEPSEEK-50M-TOKENS-2D', 'DeepSeek Model 50M Tokens - 2 ngày', 'DeepSeek', 'STORE', 'Trí Tuệ Nhân Tạo AI', 150000, 250000, 'ACTIVE', 'Bảo hành 2 ngày', '/assets/icons/products/deepseek.jpg', 'Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DEEPSEEK-100M-TOKENS-4D', 'DeepSeek Model 100M Tokens - 4 ngày', 'DeepSeek', 'STORE', 'Trí Tuệ Nhân Tạo AI', 215000, 380000, 'ACTIVE', 'Bảo hành 4 ngày', '/assets/icons/products/deepseek.jpg', 'Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DEEPSEEK-500M-TOKENS-7D', 'DeepSeek Model 500M Tokens - 7 ngày', 'DeepSeek', 'STORE', 'Trí Tuệ Nhân Tạo AI', 829000, 1400000, 'ACTIVE', 'Bảo hành 7 ngày', '/assets/icons/products/deepseek.jpg', 'Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-10USD-1M', 'Claude API 10$ - 1 tháng - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 85000, 150000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-30USD-1M', 'Claude API 30$ - 1 tháng - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 105000, 200000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-50USD-1M', 'Claude API 50$ - 1 tháng - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 130000, 250000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-50USD-TOKEN-30D', 'Claude API 50$ Token - 30 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 175000, 300000, 'ACTIVE', 'Bảo hành full 30 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-100USD-TOKEN-30D', 'Claude API 100$ Token - 30 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 245000, 420000, 'ACTIVE', 'Bảo hành full 30 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-500USD-TOKEN-30D', 'Claude API 500$ Token - 30 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 410000, 750000, 'ACTIVE', 'Bảo hành full 30 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-10M-TOKEN-1M', 'Claude API 10M Token - 1 tháng - BHF', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 75000, 150000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-20M-TOKEN-1D', 'Claude API 20M Token - 1 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 115000, 200000, 'ACTIVE', 'Bảo hành full 1 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-50M-TOKEN-1D', 'Claude API 50M Token - 1 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 165000, 280000, 'ACTIVE', 'Bảo hành full 1 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-100M-TOKEN-1D', 'Claude API 100M Token - 1 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 285000, 450000, 'ACTIVE', 'Bảo hành full 1 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-100M-TOKEN-3D', 'Claude API 100M Token - 3 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 375000, 600000, 'ACTIVE', 'Bảo hành full 3 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-100M-TOKEN-7D', 'Claude API 100M Token - 7 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 365000, 580000, 'ACTIVE', 'Bảo hành full 7 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-200M-TOKEN-7D', 'Claude API 200M Token - 7 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 475000, 750000, 'ACTIVE', 'Bảo hành full 7 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-200M-TOKEN-30D', 'Claude API 200M Token - 30 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 549000, 890000, 'ACTIVE', 'Bảo hành full 30 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-500M-TOKEN-30D', 'Claude API 500M Token - 30 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 789000, 1300000, 'ACTIVE', 'Bảo hành full 30 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-1B-TOKEN-30D', 'Claude API 1B Token - 30 ngày - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 1280000, 2100000, 'ACTIVE', 'Bảo hành full 30 ngày', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-100USD-DIRECT-1M', 'Claude API 100$ - 1 tháng - BH Full (Gói cao cấp)', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 239000, 400000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-200USD-DIRECT-1M', 'Claude API 200$ - 1 tháng - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 419000, 700000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-300USD-DIRECT-1M', 'Claude API 300$ - 1 tháng - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 639000, 1050000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-500USD-DIRECT-1M', 'Claude API 500$ - 1 tháng - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 949000, 1550000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CLAUDE-1000USD-DIRECT-1M', 'Claude API 1000$ - 1 tháng - BH Full', 'Claude', 'STORE', 'Trí Tuệ Nhân Tạo AI', 2099000, 3500000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/claude.jpg', 'Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('MUSE-AI-31B-TOKENS', '[KBH] Muse Ai 31B Tokens', 'Muse AI', 'STORE', 'Trí Tuệ Nhân Tạo AI', 36000, 90000, 'ACTIVE', 'Không bảo hành (KBH)', '/assets/icons/products/museai.jpg', 'Nền tảng tạo video, lưu trữ và phát trực tuyến AI thế hệ mới.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CANVA-EDU-1Y', '[BH3M] Canva Edu 1 Years', 'Canva', 'STORE', 'Đồ Họa & Biên Tập', 35000, 70000, 'ACTIVE', 'Bảo hành 3 tháng 1 đổi 1', '/assets/icons/products/canva.jpg', 'Thiết kế đồ họa trực tuyến số 1, kho mẫu bản quyền không giới hạn.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CANVA-EDU-3Y', '[KBH] Canva Edu 3 Years', 'Canva', 'STORE', 'Đồ Họa & Biên Tập', 23000, 100000, 'ACTIVE', 'Không bảo hành (KBH)', '/assets/icons/products/canva.jpg', 'Thiết kế đồ họa trực tuyến số 1, kho mẫu bản quyền không giới hạn.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('CANVA-PRO-1Y-TEAM', '[BHF] Canva Pro 1 Years Add Team', 'Canva', 'STORE', 'Đồ Họa & Biên Tập', 129000, 250000, 'ACTIVE', 'Bảo hành full 1 năm', '/assets/icons/products/canva.jpg', 'Thiết kế đồ họa trực tuyến số 1, kho mẫu bản quyền không giới hạn.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('NETFLIX-PRIVATE-4K-30D', '[SLOT+BHF] Netflix Private 4K 30 Days', 'Netflix', 'STORE', 'Giải Trí & Video', 75000, 150000, 'ACTIVE', 'Bảo hành full 30 ngày', '/assets/icons/products/netflix.svg', 'Xem phim bom tấn, series truyền hình chất lượng 4K Ultra HD.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('NETFLIX-PRIVATE-4K-6M', '[SLOT+BHF] Netflix Private 4K 6 Months', 'Netflix', 'STORE', 'Giải Trí & Video', 560000, 900000, 'ACTIVE', 'Bảo hành full 6 tháng', '/assets/icons/products/netflix.svg', 'Xem phim bom tấn, series truyền hình chất lượng 4K Ultra HD.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('NETFLIX-4K-1M', '[BHF] Netflix 4K 1 Months', 'Netflix', 'STORE', 'Giải Trí & Video', 160000, 260000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/netflix.svg', 'Xem phim bom tấn, series truyền hình chất lượng 4K Ultra HD.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('DUOLINGO-SUPER-12M', '[BHF] Duolingo Super 12 Months', 'Duolingo', 'STORE', 'Học Tập & Ngôn Ngữ', 239000, 590000, 'ACTIVE', 'Bảo hành full 12 tháng', '/assets/icons/products/duolingo.jpg', 'Học ngoại ngữ thông minh không giới hạn trái tim, không quảng cáo.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('HMA-KEY-20-30D', '[KEY] HMA ANDROID/PC 20-30D', 'VPN (HMA & ExpressVPN)', 'STORE', 'Bảo Mật & Tiện Ích', 16000, 40000, 'ACTIVE', 'Bảo hành theo thời hạn key', '/assets/icons/products/expressvpn.jpg', 'Bảo mật kết nối Internet, ẩn danh và fake IP tốc độ cao trên PC/Mobile.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('EXPRESSVPN-KEY-25-30D', '[KEY] EXPRESS VPN 25-30D', 'VPN (HMA & ExpressVPN)', 'STORE', 'Bảo Mật & Tiện Ích', 55000, 120000, 'ACTIVE', 'Bảo hành theo thời hạn key', '/assets/icons/products/expressvpn.jpg', 'Bảo mật kết nối Internet, ẩn danh và fake IP tốc độ cao trên PC/Mobile.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('KLING-65-CREDITS-1M', '[BHF] Kling 65 Credits 1 Months', 'Kling AI', 'STORE', 'Trí Tuệ Nhân Tạo AI', 45000, 100000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/klingai.jpg', 'Công cụ tạo video AI chân thực, chuyển động mượt mà hàng đầu.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('KLING-PREMIER-8900-1M', '[BH72H] Kling Premier 8900 Credits 1 Months', 'Kling AI', 'STORE', 'Trí Tuệ Nhân Tạo AI', 1395000, 2500000, 'ACTIVE', 'Bảo hành 72 giờ đầu', '/assets/icons/products/klingai.jpg', 'Công cụ tạo video AI chân thực, chuyển động mượt mà hàng đầu.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('KLING-KEY-50K', '[BHF] Key Kling AI 50K', 'Kling AI', 'STORE', 'Trí Tuệ Nhân Tạo AI', 79000, 150000, 'ACTIVE', 'Bảo hành full', '/assets/icons/products/klingai.jpg', 'Công cụ tạo video AI chân thực, chuyển động mượt mà hàng đầu.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('HIGGSFIELD-GENJUTSU-30D', '[BH24H] HIGGFIELD GENJUTSU 30 Day', 'Higgsfield', 'STORE', 'Trí Tuệ Nhân Tạo AI', 39000, 90000, 'ACTIVE', 'Bảo hành 24 giờ đầu', '/assets/icons/products/higgsfield.jpg', 'Công nghệ tạo video cinematic từ camera và văn bản.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('MINIMAX-REDEEM-100K', 'MiniMax Redeem 100K Credit', 'MiniMax', 'STORE', 'Trí Tuệ Nhân Tạo AI', 69000, 120000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/minimax.jpg', 'Mô hình tạo video Hailuo AI chuyển động người và vật thể sống động.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('MINIMAX-REDEEM-131K', 'MiniMax Redeem 131K Credit', 'MiniMax', 'STORE', 'Trí Tuệ Nhân Tạo AI', 149000, 250000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/minimax.jpg', 'Mô hình tạo video Hailuo AI chuyển động người và vật thể sống động.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('MINIMAX-REDEEM-300K', 'MiniMax Redeem 300K Credit', 'MiniMax', 'STORE', 'Trí Tuệ Nhân Tạo AI', 219000, 380000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/minimax.jpg', 'Mô hình tạo video Hailuo AI chuyển động người và vật thể sống động.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('MINIMAX-REDEEM-1M', 'MiniMax Redeem 1M Credit', 'MiniMax', 'STORE', 'Trí Tuệ Nhân Tạo AI', 429000, 700000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/minimax.jpg', 'Mô hình tạo video Hailuo AI chuyển động người và vật thể sống động.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('MINIMAX-REDEEM-3M', 'MiniMax Redeem 3M Credit', 'MiniMax', 'STORE', 'Trí Tuệ Nhân Tạo AI', 949000, 1500000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/minimax.jpg', 'Mô hình tạo video Hailuo AI chuyển động người và vật thể sống động.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('MINIMAX-REDEEM-7M', 'MiniMax Redeem 7M Credit', 'MiniMax', 'STORE', 'Trí Tuệ Nhân Tạo AI', 2199000, 3500000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/minimax.jpg', 'Mô hình tạo video Hailuo AI chuyển động người và vật thể sống động.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('ELEVENLABS-REDEEM-100K', 'ElevenLabs Redeem 100K Credit', 'ElevenLabs', 'STORE', 'Trí Tuệ Nhân Tạo AI', 99000, 180000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/elevenlabs.jpg', 'Giọng đọc và nhân bản giọng nói AI tự nhiên, hỗ trợ tiếng Việt mượt mà.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('ELEVENLABS-REDEEM-131K', 'ElevenLabs Redeem 131K Credit', 'ElevenLabs', 'STORE', 'Trí Tuệ Nhân Tạo AI', 145000, 250000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/elevenlabs.jpg', 'Giọng đọc và nhân bản giọng nói AI tự nhiên, hỗ trợ tiếng Việt mượt mà.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('ELEVENLABS-REDEEM-300K', 'ElevenLabs Redeem 300K Credit', 'ElevenLabs', 'STORE', 'Trí Tuệ Nhân Tạo AI', 259000, 450000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/elevenlabs.jpg', 'Giọng đọc và nhân bản giọng nói AI tự nhiên, hỗ trợ tiếng Việt mượt mà.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('ELEVENLABS-REDEEM-1M', 'ElevenLabs Redeem 1M Credit', 'ElevenLabs', 'STORE', 'Trí Tuệ Nhân Tạo AI', 429000, 750000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/elevenlabs.jpg', 'Giọng đọc và nhân bản giọng nói AI tự nhiên, hỗ trợ tiếng Việt mượt mà.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('ELEVENLABS-REDEEM-3M', 'ElevenLabs Redeem 3M Credit', 'ElevenLabs', 'STORE', 'Trí Tuệ Nhân Tạo AI', 1049000, 1800000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/elevenlabs.jpg', 'Giọng đọc và nhân bản giọng nói AI tự nhiên, hỗ trợ tiếng Việt mượt mà.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('ELEVENLABS-REDEEM-7M', 'ElevenLabs Redeem 7M Credit', 'ElevenLabs', 'STORE', 'Trí Tuệ Nhân Tạo AI', 1999000, 3400000, 'ACTIVE', 'Bảo hành code kích hoạt', '/assets/icons/products/elevenlabs.jpg', 'Giọng đọc và nhân bản giọng nói AI tự nhiên, hỗ trợ tiếng Việt mượt mà.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('SPOTIFY-PREM-1M', 'Spotify 1 Months', 'Spotify', 'STORE', 'Âm Nhạc & Giải Trí', 15000, 59000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/spotify.jpg', 'Kho nhạc trực tuyến bản quyền, nghe offline không giới hạn không quảng cáo.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('SPOTIFY-PREM-3M', 'Spotify 3 Months', 'Spotify', 'STORE', 'Âm Nhạc & Giải Trí', 35000, 177000, 'ACTIVE', 'Bảo hành full 3 tháng', '/assets/icons/products/spotify.jpg', 'Kho nhạc trực tuyến bản quyền, nghe offline không giới hạn không quảng cáo.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('SPOTIFY-PREM-6M', 'Spotify 6 Months', 'Spotify', 'STORE', 'Âm Nhạc & Giải Trí', 75000, 354000, 'ACTIVE', 'Bảo hành full 6 tháng', '/assets/icons/products/spotify.jpg', 'Kho nhạc trực tuyến bản quyền, nghe offline không giới hạn không quảng cáo.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('SPOTIFY-PREM-12M', 'Spotify 12 Months', 'Spotify', 'STORE', 'Âm Nhạc & Giải Trí', 135000, 708000, 'ACTIVE', 'Bảo hành full 365 ngày', '/assets/icons/products/spotify.jpg', 'Kho nhạc trực tuyến bản quyền, nghe offline không giới hạn không quảng cáo.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('LOCKET-GOLD-BHF-1M', '[BHF] Locket Gold 1 Months', 'Locket Gold (iOS)', 'STORE', 'Mạng Xã Hội & Đời Sống', 35000, 89000, 'ACTIVE', 'Bảo hành full 1 tháng', '/assets/icons/products/locketgold.jpg', 'Chia sẻ ảnh widget màn hình chính cùng người thương và bạn bè thân thiết.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('LOCKET-GOLD-BHF-1Y', '[BHF] Locket Gold 1 Years', 'Locket Gold (iOS)', 'STORE', 'Mạng Xã Hội & Đời Sống', 45000, 299000, 'ACTIVE', 'Bảo hành full 1 năm', '/assets/icons/products/locketgold.jpg', 'Chia sẻ ảnh widget màn hình chính cùng người thương và bạn bè thân thiết.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('LOCKET-GOLD-BHF-LIFETIME', '[BHF] Locket Gold 1 Lifetimes', 'Locket Gold (iOS)', 'STORE', 'Mạng Xã Hội & Đời Sống', 85000, 599000, 'ACTIVE', 'Bảo hành trọn đời tài khoản', '/assets/icons/products/locketgold.jpg', 'Chia sẻ ảnh widget màn hình chính cùng người thương và bạn bè thân thiết.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('API-TOOL-SMS-150K', 'API Tool SMS Tiêu Chuẩn', 'API Tool SMS', 'STORE', 'API & Công Cụ Tool', 150000, 300000, 'ACTIVE', 'Hỗ trợ tích hợp và tài liệu API trọn đời', '/assets/icons/api/sms-tool.svg', 'Sản phẩm API Tool SMS riêng biệt, giao thức kết nối và giải pháp tích hợp an toàn.')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();

-- Standalone API Tool SMS
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, image_url, description)
VALUES ('TOOL-SMS-150K', 'API Tool SMS Yuki (Tích hợp tự động)', 'API Tool SMS', 'API_TOOL', 'API Tool', 150000, 250000, 'ACTIVE', 'Bảo hành cập nhật trọn đời', '/assets/icons/brands/tool-sms.png', 'Sản phẩm giải pháp API độc lập giá chuẩn 150.000 VNĐ')
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();

-- Buff MXH (6 Platforms, 28 Services, 57 Servers)
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-VIEW-SV3272', 'Tăng View TikTok - View Tiktok ♻️ 30 Day', 'TIKTOK', 'BUFF', 'TIKTOK', 500, 392, 'ACTIVE', 'Theo máy chủ', 3272, 1000, 10000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-VIEW-SV3471', 'Tăng View TikTok - View Tiktok ♻️ Trọn đời, ⚡', 'TIKTOK', 'BUFF', 'TIKTOK', 1900, 1523, 'ACTIVE', 'Theo máy chủ', 3471, 2000, 50000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-VIEW-SV3472', 'Tăng View TikTok - View TikTok Sale ⚡, ⚠️', 'TIKTOK', 'BUFF', 'TIKTOK', 200, 133, 'ACTIVE', 'Theo máy chủ', 3472, 1000, 2147483647, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-FOL-SV3463', 'Tăng Follower TikTok - Theo Dõi TikTok VN 🇻🇳, ♻️ 10Day', 'TIKTOK', 'BUFF', 'TIKTOK', 76000, 71760, 'ACTIVE', 'Theo máy chủ', 3463, 100, 5000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-FOL-SV3465', 'Tăng Follower TikTok - Follow Tik Tok Tây 🌐, ♻️ 30Day', 'TIKTOK', 'BUFF', 'TIKTOK', 107000, 101795, 'ACTIVE', 'Theo máy chủ', 3465, 100, 2000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-FOL-SV3468', 'Tăng Follower TikTok - Follow Tiktok tây 🌐, ⚡, ⚠️', 'TIKTOK', 'BUFF', 'TIKTOK', 39500, 36310, 'ACTIVE', 'Theo máy chủ', 3468, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-TIM-SV3238', 'Tăng Tim TikTok - Tim Tik vn - Có bonus 🇻🇳, ⚠️, ⚡', 'TIKTOK', 'BUFF', 'TIKTOK', 20500, 18144, 'ACTIVE', 'Theo máy chủ', 3238, 100, 10000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-TIM-SV3240', 'Tăng Tim TikTok - Tim TikTok VN 🇻🇳, ⚡, ⚠️', 'TIKTOK', 'BUFF', 'TIKTOK', 34000, 31096, 'ACTIVE', 'Theo máy chủ', 3240, 100, 50000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-TIM-SV3419', 'Tăng Tim TikTok - Tim tik vn - ít tụt 🇻🇳, ⚠️', 'TIKTOK', 'BUFF', 'TIKTOK', 19500, 17160, 'ACTIVE', 'Theo máy chủ', 3419, 100, 2000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-TIM-SV3469', 'Tăng Tim TikTok - Tim tik tây ♻️ 30Day, 🌐', 'TIKTOK', 'BUFF', 'TIKTOK', 28000, 25449, 'ACTIVE', 'Theo máy chủ', 3469, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-TIM-SV3479', 'Tăng Tim TikTok - Tim Tiktok Tây - Sale ⚠️, 🌐', 'TIKTOK', 'BUFF', 'TIKTOK', 31000, 28058, 'ACTIVE', 'Theo máy chủ', 3479, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-SHARE-SV738', 'Tăng Chia Sẻ TikTok - Share Tik Tok', 'TIKTOK', 'BUFF', 'TIKTOK', 7200, 5968, 'ACTIVE', 'Theo máy chủ', 738, 500, 2222222, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-CMT-SV3256', 'TikTok Comment - Comment Tiktok tây ⚠️, 🌐, ⚡', 'TIKTOK', 'BUFF', 'TIKTOK', 100000, 95024, 'ACTIVE', 'Theo máy chủ', 3256, 20, 50000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-FAV-SV740', 'Tăng Yêu Thích TikTok - Tăng Saves (yêu Thích) ⚡', 'TIKTOK', 'BUFF', 'TIKTOK', 650, 455, 'ACTIVE', 'Theo máy chủ', 740, 1000, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-TIM-CMT-SV1021', 'Tim Comment TikTok - Tim comment TikTok ⚠️', 'TIKTOK', 'BUFF', 'TIKTOK', 9500, 8034, 'ACTIVE', 'Theo máy chủ', 1021, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-STORY-SV3480', 'Tăng View Story TikTok - View story tiktok - điền link như buff fl', 'TIKTOK', 'BUFF', 'TIKTOK', 13500, 11772, 'ACTIVE', 'Theo máy chủ', 3480, 100, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TIKTOK-TT-LIVE-SV3412', 'Tăng Mắt Live TikTok - Mắt Live Tik Vn 60 phút', 'TIKTOK', 'BUFF', 'TIKTOK', 410000, 402133, 'ACTIVE', 'Theo máy chủ', 3412, 50, 500, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-LIKE-SV3274', 'Tăng Like Bài Viết - Tăng 😡 Phẫn nộ, ⚠️, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 4800, 3866, 'ACTIVE', 'Theo máy chủ', 3274, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-LIKE-SV3275', 'Tăng Like Bài Viết - Tăng 😢 Buồn, ⚠️, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 4800, 3866, 'ACTIVE', 'Theo máy chủ', 3275, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-LIKE-SV3276', 'Tăng Like Bài Viết - Tăng 😮 Wow, ⚠️, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 4800, 3866, 'ACTIVE', 'Theo máy chủ', 3276, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-LIKE-SV3277', 'Tăng Like Bài Viết - Tăng 😆 Haha, ⚠️, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 4800, 3866, 'ACTIVE', 'Theo máy chủ', 3277, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-LIKE-SV3278', 'Tăng Like Bài Viết - Tăng 🥰 Thương thương, ⚠️, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 4800, 3866, 'ACTIVE', 'Theo máy chủ', 3278, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-LIKE-SV3279', 'Tăng Like Bài Viết - Tăng ❤️ Yêu thích, ⚠️, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 4800, 3866, 'ACTIVE', 'Theo máy chủ', 3279, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-LIKE-SV3280', 'Tăng Like Bài Viết - Tăng 👍 Thích, ⚠️, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 4800, 3866, 'ACTIVE', 'Theo máy chủ', 3280, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-FOL-SV3295', 'Tăng Theo Dõi - Theo Dõi Fb Tây ⚠️, ⚡, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 7000, 5821, 'ACTIVE', 'Theo máy chủ', 3295, 100, 100000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-FOL-SV3467', 'Tăng Theo Dõi - Sub FB Vn Tk đẹp 🇻🇳', 'FACEBOOK', 'BUFF', 'FACEBOOK', 21000, 18641, 'ACTIVE', 'Theo máy chủ', 3467, 100, 5000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-GRP-SV3250', 'Tăng Thành Viên Nhóm - Members Group, ⚡, 🌐', 'FACEBOOK', 'BUFF', 'FACEBOOK', 16000, 14033, 'ACTIVE', 'Theo máy chủ', 3250, 100, 200000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-GRP-SV3304', 'Tăng Thành Viên Nhóm - thành viên Group fb 🌐, ♻️ trọn đời', 'FACEBOOK', 'BUFF', 'FACEBOOK', 12800, 10943, 'ACTIVE', 'Theo máy chủ', 3304, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-GRP-SV3305', 'Tăng Thành Viên Nhóm - member group sale 🌐, ⚠️', 'FACEBOOK', 'BUFF', 'FACEBOOK', 11200, 9564, 'ACTIVE', 'Theo máy chủ', 3305, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-VIEW-SV724', 'Tăng View Video - Tăng View Video ♻️ 30day, ⚡', 'FACEBOOK', 'BUFF', 'FACEBOOK', 1400, 1034, 'ACTIVE', 'Theo máy chủ', 724, 1000, 2000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-STORY-SV3481', 'Tăng View Story - mix cảm xúc 👍❤️🤗😆 Story Facebook', 'FACEBOOK', 'BUFF', 'FACEBOOK', 11800, 10001, 'ACTIVE', 'Theo máy chủ', 3481, 100, 100000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-FACEBOOK-FB-SHARE-SV3464', 'Tăng Chia Sẻ Facebook - Share post photo ⚡, ♻️ trọn đời', 'FACEBOOK', 'BUFF', 'FACEBOOK', 12500, 10710, 'ACTIVE', 'Theo máy chủ', 3464, 100, 2147483647, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-INSTAGRAM-IG-LIKE-SV3423', 'Tăng Like Instagram - Like instagram tây ♻️ trọn đời 🌐', 'INSTAGRAM', 'BUFF', 'INSTAGRAM', 7200, 5884, 'ACTIVE', 'Theo máy chủ', 3423, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-INSTAGRAM-IG-LIKE-SV3424', 'Tăng Like Instagram - Like instagram tây 🌐, ⚡, ♻️ 30Day', 'INSTAGRAM', 'BUFF', 'INSTAGRAM', 6000, 4866, 'ACTIVE', 'Theo máy chủ', 3424, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-INSTAGRAM-IG-FOL-SV3425', 'Tăng Theo Dõi Instagram - theo dõi ig vn - thủ công - chậm ⚠️, 🇻🇳', 'INSTAGRAM', 'BUFF', 'INSTAGRAM', 60000, 56271, 'ACTIVE', 'Theo máy chủ', 3425, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-INSTAGRAM-IG-VIEW-SV3421', 'Tăng View Instagram - view instagram ⚠️, ⚡', 'INSTAGRAM', 'BUFF', 'INSTAGRAM', 80, 34, 'ACTIVE', 'Theo máy chủ', 3421, 1000, 2147483647, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-YOUTUBE-YT-SUB-SV3283', 'YouTube Theo Dõi - Theo Dõi YouTube ⚡, ⚠️', 'YOUTUBE', 'BUFF', 'YOUTUBE', 300, 198, 'ACTIVE', 'Theo máy chủ', 3283, 1000, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-YOUTUBE-YT-SUB-SV3315', 'YouTube Theo Dõi - theo dõi YouTube 🌐, ⚠️, ⚡', 'YOUTUBE', 'BUFF', 'YOUTUBE', 700, 501, 'ACTIVE', 'Theo máy chủ', 3315, 1000, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-YOUTUBE-YT-SUB-SV3474', 'YouTube Theo Dõi - Theo Dõi Youtube 🌐, ⚡, ♻️ 30Day', 'YOUTUBE', 'BUFF', 'YOUTUBE', 375000, 368060, 'ACTIVE', 'Theo máy chủ', 3474, 100, 2000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-YOUTUBE-YT-LIKE-SV3282', 'YouTube Likes - Like Video Youtube ♻️ 30Day, 🌐, ⚡', 'YOUTUBE', 'BUFF', 'YOUTUBE', 33000, 30000, 'ACTIVE', 'Theo máy chủ', 3282, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-YOUTUBE-YT-LIKE-SV3473', 'YouTube Likes - Like Youtube 🌐, ♻️ 30Day ⚡', 'YOUTUBE', 'BUFF', 'YOUTUBE', 12800, 10972, 'ACTIVE', 'Theo máy chủ', 3473, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-YOUTUBE-YT-LIKE-SV3475', 'YouTube Likes - Like Youtube Vietnam ♻️ 30day, 🇻🇳', 'YOUTUBE', 'BUFF', 'YOUTUBE', 37000, 33896, 'ACTIVE', 'Theo máy chủ', 3475, 100, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-YOUTUBE-YT-LIKE-SV3476', 'YouTube Likes - Like Youtube Tây 🌐, ⚠️', 'YOUTUBE', 'BUFF', 'YOUTUBE', 12800, 10894, 'ACTIVE', 'Theo máy chủ', 3476, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-YOUTUBE-YT-VIEW-SV3281', 'YouTube View - View video ytb ♻️ 30day', 'YOUTUBE', 'BUFF', 'YOUTUBE', 34500, 31402, 'ACTIVE', 'Theo máy chủ', 3281, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-MEM-SV3284', 'Telegram Members - Member telegram 🌐, ♻️ 365Day, - chậm', 'TELEGRAM', 'BUFF', 'TELEGRAM', 13500, 11575, 'ACTIVE', 'Theo máy chủ', 3284, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-MEM-SV3431', 'Telegram Members - Member Telegram 🌐, ⚡, ♻️ 180Day', 'TELEGRAM', 'BUFF', 'TELEGRAM', 37500, 34726, 'ACTIVE', 'Theo máy chủ', 3431, 100, 5000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-MEM-SV3484', 'Telegram Members - Member Telegram Tây 🌐, ⚠️', 'TELEGRAM', 'BUFF', 'TELEGRAM', 7000, 5773, 'ACTIVE', 'Theo máy chủ', 3484, 100, 50000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-REACT-SV3285', 'Telegram Tăng Cảm Xúc Post - Tăng Reaction Tích Cực [👍❤️🔥...] + Free View', 'TELEGRAM', 'BUFF', 'TELEGRAM', 700, 487, 'ACTIVE', 'Theo máy chủ', 3285, 1000, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-REACT-SV3286', 'Telegram Tăng Cảm Xúc Post - Tăng Reaction Tiêu Cực [👎😱🤬...] + Free View', 'TELEGRAM', 'BUFF', 'TELEGRAM', 700, 487, 'ACTIVE', 'Theo máy chủ', 3286, 1000, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-REACT-SV3287', 'Telegram Tăng Cảm Xúc Post - Tăng Reaction Premium Tiêu Cực [🥱💔🥴...] + Free View', 'TELEGRAM', 'BUFF', 'TELEGRAM', 700, 487, 'ACTIVE', 'Theo máy chủ', 3287, 1000, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-REACT-SV3288', 'Telegram Tăng Cảm Xúc Post - Tăng Reaction Premium Tích Cực [💯❤️🔥🕊...] + Free View', 'TELEGRAM', 'BUFF', 'TELEGRAM', 700, 487, 'ACTIVE', 'Theo máy chủ', 3288, 1000, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-VIEW-SV3301', 'Telegram Tăng View - View Post tele real ⚡', 'TELEGRAM', 'BUFF', 'TELEGRAM', 3300, 2636, 'ACTIVE', 'Theo máy chủ', 3301, 500, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-VIEW-SV3302', 'Telegram Tăng View - View Post telegram ⚡', 'TELEGRAM', 'BUFF', 'TELEGRAM', 200, 117, 'ACTIVE', 'Theo máy chủ', 3302, 1000, 10000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-BOT-SV3466', 'Telegram Bot Start-Ref - TeleGram Bot /Start ⚡, ♻️ 30Day', 'TELEGRAM', 'BUFF', 'TELEGRAM', 8000, 6617, 'ACTIVE', 'Theo máy chủ', 3466, 100, 1000000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-TELEGRAM-TG-PREM-SV3258', 'Members Premium - Member tele premium ♻️ 30 day', 'TELEGRAM', 'BUFF', 'TELEGRAM', 240000, 232805, 'ACTIVE', 'Theo máy chủ', 3258, 100, 100000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-THREADS-TH-LIKE-SV3483', 'Threads Likes - Like thread 🌐, ⚠️, ⚡', 'THREADS', 'BUFF', 'THREADS', 39500, 36461, 'ACTIVE', 'Theo máy chủ', 3483, 100, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();
INSERT INTO public.catalog_items (sku, name, brand, group_type, category, price, original_price, status, warranty, server_id, min_qty, max_qty, description)
VALUES ('BUFF-THREADS-TH-FOL-SV3482', 'Threads Followers - Theo dõi Thread 🌐, ⚠️', 'THREADS', 'BUFF', 'THREADS', 39500, 36461, 'ACTIVE', 'Theo máy chủ', 3482, 100, 10000, NULL)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, original_price = EXCLUDED.original_price, updated_at = NOW();

-- 5. ORDERS TABLE (Zero mock data, pure production schema)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sku TEXT,
    item_name TEXT NOT NULL,
    amount BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    customer_contact TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active catalog" ON public.catalog_items;
CREATE POLICY "Public can view active catalog" ON public.catalog_items FOR SELECT TO anon, authenticated USING (status = 'ACTIVE' OR status = 'OUT_OF_STOCK');

DROP POLICY IF EXISTS "Admins full access catalog" ON public.catalog_items;
CREATE POLICY "Admins full access catalog" ON public.catalog_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'ADMIN')
);

DROP POLICY IF EXISTS "Users can view their orders" ON public.orders;
CREATE POLICY "Users can view their orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access orders" ON public.orders;
CREATE POLICY "Admins full access orders" ON public.orders FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'ADMIN')
);
-- ==============================================================================
-- YUKISHOPMXH — MIGRATION 23: FIX RLS ORDERS, WALLET TOPUPS & AUTH GUARD POLICIES
-- Version: 20261114000023
-- ==============================================================================

-- 1. Ensure Orders Table Schema with All Required Fields
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    user_contact TEXT,
    service_type TEXT NOT NULL DEFAULT 'MUA_SAN_PHAM',
    item_name TEXT NOT NULL,
    sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    target_link TEXT,
    total_amount BIGINT NOT NULL DEFAULT 0,
    amount BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure indexes for high performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 2. Ensure Wallet Topups Table Schema
CREATE TABLE IF NOT EXISTS public.wallet_topups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    user_contact TEXT,
    amount BIGINT NOT NULL,
    bank TEXT NOT NULL DEFAULT 'ZaloPay',
    account_number TEXT NOT NULL DEFAULT '99ZP26265M78019191',
    account_name TEXT NOT NULL DEFAULT 'ZALOPAY_NGUYEN THAI TU',
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_code ON public.wallet_topups(code);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_user_id ON public.wallet_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_status ON public.wallet_topups(status);

-- 3. Configure RLS Policies for Orders Table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Users can insert orders" 
ON public.orders FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users view their own orders" ON public.orders;
CREATE POLICY "Users view their own orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'ADMIN')
    )
);

DROP POLICY IF EXISTS "Admins full update on orders" ON public.orders;
CREATE POLICY "Admins full update on orders" 
ON public.orders FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'ADMIN')
    )
);

-- 4. Configure RLS Policies for Wallet Topups Table
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create topups" ON public.wallet_topups;
CREATE POLICY "Users can create topups" 
ON public.wallet_topups FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users view their topups" ON public.wallet_topups;
CREATE POLICY "Users view their topups" 
ON public.wallet_topups FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'ADMIN')
    )
);

DROP POLICY IF EXISTS "Admins manage topups" ON public.wallet_topups;
CREATE POLICY "Admins manage topups" 
ON public.wallet_topups FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'ADMIN')
    )
);
