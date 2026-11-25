-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 14: SEED 10 BRANDS & 21 INITIAL PRICING VARIANTS
-- Version: 20261113000014
-- ==============================================================================

-- 1. Insert Categories for Brands
INSERT INTO public.categories (id, slug, name, description, icon_name, display_order, is_active)
VALUES
    ('b0000001-0000-0000-0000-000000000001', 'ai-tools', 'Công Cụ AI & Học Tập', 'Tài khoản trí tuệ nhân tạo và ngoại ngữ', 'Sparkles', 1, true),
    ('b0000002-0000-0000-0000-000000000002', 'creative-design', 'Đồ Họa & Biên Tập Video', 'Công cụ thiết kế Canva, CapCut, Adobe', 'Palette', 2, true),
    ('b0000003-0000-0000-0000-000000000003', 'vpn-security', 'Mạng Riêng Ảo & Bảo Mật', 'VPN tốc độ cao vượt tường lửa an toàn', 'Shield', 3, true),
    ('b0000004-0000-0000-0000-000000000004', 'entertainment', 'Âm Nhạc & Mạng Xã Hội', 'Spotify, Locket Gold giải trí', 'Music', 4, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. Insert 10 Dedicated Brand Products
INSERT INTO public.products (id, category_id, slug, name, description, thumbnail_url, badge_label, is_featured, is_active)
VALUES
    ('d0000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000002', 'canva', 'Canva', 'Nền tảng thiết kế đồ họa trực tuyến số 1 thế giới', '/brands/canva.svg', 'Phổ biến', true, true),
    ('d0000002-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'chatgpt', 'ChatGPT', 'Mô hình ngôn ngữ AI mạnh mẽ nhất từ OpenAI', '/brands/chatgpt.svg', 'Hot', true, true),
    ('d0000003-0000-0000-0000-000000000003', 'b0000002-0000-0000-0000-000000000002', 'capcut', 'CapCut', 'Phần mềm biên tập video ngắn TikTok chuyên nghiệp', '/brands/capcut.svg', 'Thịnh hành', true, true),
    ('d0000004-0000-0000-0000-000000000004', 'b0000002-0000-0000-0000-000000000002', 'adobe', 'Adobe Express', 'Bộ công cụ sáng tạo nội dung nhanh từ Adobe', '/brands/adobe.svg', 'Trial', false, true),
    ('d0000005-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 'hma-vpn', 'HMA VPN', 'VPN ẩn danh bảo mật cao trên Android và máy tính', '/brands/hma.svg', 'Tiết kiệm', false, true),
    ('d0000006-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 'expressvpn', 'ExpressVPN', 'Dịch vụ mạng riêng ảo cao cấp với băng thông không giới hạn', '/brands/expressvpn.svg', 'Tốc độ cao', true, true),
    ('d0000007-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'muse-ai', 'Muse AI', 'Nền tảng lưu trữ và tìm kiếm video bằng trí tuệ nhân tạo', '/brands/muse.svg', 'AI Search', false, true),
    ('d0000008-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'duolingo', 'Duolingo', 'Ứng dụng học ngoại ngữ số 1 thế giới với gói Super', '/brands/duolingo.svg', 'Học tập', true, true),
    ('d0000009-0000-0000-0000-000000000004', 'b0000004-0000-0000-0000-000000000004', 'spotify', 'Spotify', 'Nền tảng phát nhạc trực tuyến chất lượng cao không quảng cáo', '/brands/spotify.svg', 'Âm nhạc', true, true),
    ('d0000010-0000-0000-0000-000000000004', 'b0000004-0000-0000-0000-000000000004', 'locket-gold', 'Locket Gold (iOS)', 'Tiện ích mạng xã hội chia sẻ khoảnh khắc Live Widget', '/brands/locket.svg', 'iOS Only', true, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. Insert 21 Initial Pricing Variants (Exact Master Prompt Values)
INSERT INTO public.product_variants (product_id, sku, name, price, original_price, duration_days, fulfillment_mode, status, stock_limit)
VALUES
    -- Canva
    ('d0000001-0000-0000-0000-000000000001', 'CANVA-EDU-1Y', 'Canva Edu 1 năm', 35000, 70000, 365, 'MANUAL', 'ACTIVE', 50),
    ('d0000001-0000-0000-0000-000000000001', 'CANVA-EDU-3Y', 'Canva Edu 3 năm', 20000, 100000, 1095, 'MANUAL', 'NEEDS_REVIEW', 50),
    ('d0000001-0000-0000-0000-000000000001', 'CANVA-PRO-1Y-TEAM', 'Canva Pro 1 năm Add Team', 120000, 250000, 365, 'MANUAL', 'ACTIVE', 30),

    -- ChatGPT
    ('d0000002-0000-0000-0000-000000000002', 'CHATGPT-PLUS-30D', 'ChatGPT Plus 30 ngày', 220000, 490000, 30, 'MANUAL', 'ACTIVE', 20),
    ('d0000002-0000-0000-0000-000000000002', 'CHATGPT-PLUS-4M', 'ChatGPT Plus 4 tháng', 850000, 1960000, 120, 'MANUAL', 'ACTIVE', 10),
    ('d0000002-0000-0000-0000-000000000002', 'CHATGPT-TEAM-BIZ', 'ChatGPT Team / Business', 490000, 800000, 30, 'MANUAL', 'ACTIVE', 15),

    -- CapCut
    ('d0000003-0000-0000-0000-000000000003', 'CAPCUT-PRO-1M', 'CapCut Pro Team 1 tháng', 45000, 99000, 30, 'MANUAL', 'ACTIVE', 40),
    ('d0000003-0000-0000-0000-000000000003', 'CAPCUT-PRO-7D', 'CapCut Pro Team 7 ngày', 18000, 35000, 7, 'MANUAL', 'ACTIVE', 60),
    ('d0000003-0000-0000-0000-000000000003', 'CAPCUT-PRO-12M', 'CapCut Pro 12 tháng', 790000, 1500000, 365, 'MANUAL', 'ACTIVE', 10),

    -- Adobe
    ('d0000004-0000-0000-0000-000000000004', 'ADOBE-EXPRESS-4M-TRIAL', 'Adobe Express 4 tháng Trial', 47000, 120000, 120, 'MANUAL', 'ACTIVE', 25),

    -- HMA VPN
    ('d0000005-0000-0000-0000-000000000003', 'HMA-VPN-20-30D', 'HMA VPN Android/PC 20–30 ngày', 16500, 45000, 30, 'MANUAL', 'ACTIVE', 50),

    -- ExpressVPN
    ('d0000006-0000-0000-0000-000000000003', 'EXPRESSVPN-25-30D', 'ExpressVPN 25–30 ngày', 52000, 150000, 30, 'MANUAL', 'ACTIVE', 35),

    -- Muse AI
    ('d0000007-0000-0000-0000-000000000001', 'MUSE-AI-18TOKENS', 'Muse AI 18 Tokens', 18000, 40000, NULL, 'MANUAL', 'ACTIVE', 100),

    -- Duolingo
    ('d0000008-0000-0000-0000-000000000001', 'DUOLINGO-SUPER-12M', 'Duolingo Link Super 12 tháng', 65000, 180000, 365, 'MANUAL', 'ACTIVE', 40),

    -- Spotify
    ('d0000009-0000-0000-0000-000000000004', 'SPOTIFY-PREM-1M', 'Spotify Premium 1 tháng', 15000, 59000, 30, 'MANUAL', 'ACTIVE', 50),
    ('d0000009-0000-0000-0000-000000000004', 'SPOTIFY-PREM-3M', 'Spotify Premium 3 tháng', 32000, 177000, 90, 'MANUAL', 'ACTIVE', 40),
    ('d0000009-0000-0000-0000-000000000004', 'SPOTIFY-PREM-6M', 'Spotify Premium 6 tháng', 75000, 354000, 180, 'MANUAL', 'ACTIVE', 30),
    ('d0000009-0000-0000-0000-000000000004', 'SPOTIFY-PREM-12M', 'Spotify Premium 12 tháng', 155000, 708000, 365, 'MANUAL', 'ACTIVE', 25),

    -- Locket Gold (iOS)
    ('d0000010-0000-0000-0000-000000000004', 'LOCKET-GOLD-1M', 'Locket Gold 1 tháng', 35000, 80000, 30, 'MANUAL', 'ACTIVE', 30),
    ('d0000010-0000-0000-0000-000000000004', 'LOCKET-GOLD-1Y', 'Locket Gold 1 năm', 45000, 150000, 365, 'MANUAL', 'ACTIVE', 30),
    ('d0000010-0000-0000-0000-000000000004', 'LOCKET-GOLD-LIFETIME', 'Locket Gold vĩnh viễn', 80000, 300000, NULL, 'MANUAL', 'ACTIVE', 20)
ON CONFLICT (sku) DO UPDATE SET
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    duration_days = EXCLUDED.duration_days,
    status = EXCLUDED.status;
