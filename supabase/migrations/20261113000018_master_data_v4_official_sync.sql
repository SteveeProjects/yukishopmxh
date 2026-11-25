-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 18: MASTER DATA V4 OFFICIAL SYNC & SMM SERVERS
-- Version: 20261113000018
-- Synchronizes 100% approved Master Data v4 from Project Owner
-- ==============================================================================

-- 1. Create smm_servers table for dynamic Buff MXH price and server lookup
CREATE TABLE IF NOT EXISTS public.smm_servers (
    id INT PRIMARY KEY,
    service_code TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('TIKTOK', 'FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'TELEGRAM', 'THREADS')),
    name TEXT NOT NULL,
    original_price BIGINT NOT NULL, -- Giá gốc (cho Admin đối chiếu)
    retail_price BIGINT NOT NULL,   -- Giá bán lẻ đã duyệt (per 1.000 đơn vị)
    min_qty INT NOT NULL DEFAULT 100,
    max_qty BIGINT NOT NULL DEFAULT 100000,
    symbols JSONB NOT NULL DEFAULT '[]'::jsonb,
    note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smm_servers_platform ON public.smm_servers(platform);
CREATE INDEX IF NOT EXISTS idx_smm_servers_service ON public.smm_servers(service_code);

-- 2. Seed / Upsert all 57 approved SMM servers
INSERT INTO public.smm_servers (id, service_code, platform, name, original_price, retail_price, min_qty, max_qty, symbols, note)
VALUES
(3272, 'TT-VIEW', 'TIKTOK', 'View Tiktok ♻️ 30 Day', 392, 500, 1000, 10000000, '["♻️"]'::jsonb, 'Bảo hành 30 ngày'),
(3471, 'TT-VIEW', 'TIKTOK', 'View Tiktok ♻️ Trọn đời, ⚡', 1523, 1900, 2000, 50000, '["♻️", "⚡"]'::jsonb, 'Bảo hành trọn đời, siêu tốc'),
(3472, 'TT-VIEW', 'TIKTOK', 'View TikTok Sale ⚡, ⚠️', 133, 200, 1000, 2147483647, '["⚡", "⚠️"]'::jsonb, 'Giá rẻ nhất, không bảo hành'),
(3463, 'TT-FOL', 'TIKTOK', 'Theo Dõi TikTok VN 🇻🇳, ♻️ 10Day', 71760, 76000, 100, 5000, '["🇻🇳", "♻️"]'::jsonb, 'Nick Việt thật, bảo hành 10 ngày'),
(3465, 'TT-FOL', 'TIKTOK', 'Follow Tik Tok Tây 🌐, ♻️ 30Day', 101795, 107000, 100, 2000, '["🌐", "♻️"]'::jsonb, 'Acc Tây, bảo hành 30 ngày'),
(3468, 'TT-FOL', 'TIKTOK', 'Follow Tiktok tây 🌐, ⚡, ⚠️', 36310, 39500, 100, 100000, '["🌐", "⚡", "⚠️"]'::jsonb, 'Acc Tây siêu tốc, không bảo hành'),
(3238, 'TT-TIM', 'TIKTOK', 'Tim Tik vn - Có bonus 🇻🇳, ⚠️, ⚡', 18144, 20500, 100, 10000000, '["🇻🇳", "⚠️", "⚡"]'::jsonb, 'Có tặng thêm tim'),
(3240, 'TT-TIM', 'TIKTOK', 'Tim TikTok VN 🇻🇳, ⚡, ⚠️', 31096, 34000, 100, 50000, '["🇻🇳", "⚡", "⚠️"]'::jsonb, 'Tim Việt chạy nhanh'),
(3419, 'TT-TIM', 'TIKTOK', 'Tim tik vn - ít tụt 🇻🇳, ⚠️', 17160, 19500, 100, 2000, '["🇻🇳", "⚠️"]'::jsonb, 'Tim Việt ổn định, ít tụt'),
(3469, 'TT-TIM', 'TIKTOK', 'Tim tik tây ♻️ 30Day, 🌐', 25449, 28000, 100, 1000000, '["♻️", "🌐"]'::jsonb, 'Tim Tây, bảo hành 30 ngày'),
(3479, 'TT-TIM', 'TIKTOK', 'Tim Tiktok Tây - Sale ⚠️, 🌐', 28058, 31000, 100, 1000000, '["⚠️", "🌐"]'::jsonb, 'Tim Tây giá sale'),
(738, 'TT-SHARE', 'TIKTOK', 'Share Tik Tok', 5968, 7200, 500, 2222222, '[]'::jsonb, 'Tăng lượt chia sẻ video'),
(3256, 'TT-CMT', 'TIKTOK', 'Comment Tiktok tây ⚠️, 🌐, ⚡', 95024, 100000, 20, 50000, '["⚠️", "🌐", "⚡"]'::jsonb, 'Bình luận tiếng Anh / Tây'),
(740, 'TT-FAV', 'TIKTOK', 'Tăng Saves (yêu Thích) ⚡', 455, 650, 1000, 1000000, '["⚡"]'::jsonb, 'Tăng lượt lưu video yêu thích'),
(1021, 'TT-TIM-CMT', 'TIKTOK', 'Tim comment TikTok ⚠️', 8034, 9500, 100, 1000000, '["⚠️"]'::jsonb, 'Tăng like cho bình luận'),
(3480, 'TT-STORY', 'TIKTOK', 'View story tiktok - điền link như buff fl', 11772, 13500, 100, 10000, '[]'::jsonb, 'Điền link trang cá nhân như buff follow'),
(3412, 'TT-LIVE', 'TIKTOK', 'Mắt Live Tik Vn 60 phút', 402133, 410000, 50, 500, '["🇻🇳"]'::jsonb, 'Duy trì mắt xem trong 60 phút'),
(3274, 'FB-LIKE', 'FACEBOOK', 'Tăng 😡 Phẫn nộ, ⚠️, 🌐', 3866, 4800, 100, 100000, '["⚠️", "🌐"]'::jsonb, 'Cảm xúc Phẫn nộ'),
(3275, 'FB-LIKE', 'FACEBOOK', 'Tăng 😢 Buồn, ⚠️, 🌐', 3866, 4800, 100, 1000000, '["⚠️", "🌐"]'::jsonb, 'Cảm xúc Buồn'),
(3276, 'FB-LIKE', 'FACEBOOK', 'Tăng 😮 Wow, ⚠️, 🌐', 3866, 4800, 100, 100000, '["⚠️", "🌐"]'::jsonb, 'Cảm xúc Wow'),
(3277, 'FB-LIKE', 'FACEBOOK', 'Tăng 😆 Haha, ⚠️, 🌐', 3866, 4800, 100, 100000, '["⚠️", "🌐"]'::jsonb, 'Cảm xúc Haha'),
(3278, 'FB-LIKE', 'FACEBOOK', 'Tăng 🥰 Thương thương, ⚠️, 🌐', 3866, 4800, 100, 100000, '["⚠️", "🌐"]'::jsonb, 'Cảm xúc Thương thương'),
(3279, 'FB-LIKE', 'FACEBOOK', 'Tăng ❤️ Yêu thích, ⚠️, 🌐', 3866, 4800, 100, 100000, '["⚠️", "🌐"]'::jsonb, 'Cảm xúc Yêu thích (Tim)'),
(3280, 'FB-LIKE', 'FACEBOOK', 'Tăng 👍 Thích, ⚠️, 🌐', 3866, 4800, 100, 100000, '["⚠️", "🌐"]'::jsonb, 'Cảm xúc Thích (Like)'),
(3295, 'FB-FOL', 'FACEBOOK', 'Theo Dõi Fb Tây ⚠️, ⚡, 🌐', 5821, 7000, 100, 100000000, '["⚠️", "⚡", "🌐"]'::jsonb, 'Follower Tây siêu tốc'),
(3467, 'FB-FOL', 'FACEBOOK', 'Sub FB Vn Tk đẹp 🇻🇳', 18641, 21000, 100, 5000, '["🇻🇳"]'::jsonb, 'Sub nick Việt thật tài khoản đẹp'),
(3250, 'FB-GRP', 'FACEBOOK', 'Members Group, ⚡, 🌐', 14033, 16000, 100, 200000, '["⚡", "🌐"]'::jsonb, 'Thành viên nhóm siêu tốc'),
(3304, 'FB-GRP', 'FACEBOOK', 'thành viên Group fb 🌐, ♻️ trọn đời', 10943, 12800, 100, 1000000, '["🌐", "♻️"]'::jsonb, 'Bảo hành trọn đời'),
(3305, 'FB-GRP', 'FACEBOOK', 'member group sale 🌐, ⚠️', 9564, 11200, 100, 1000000, '["🌐", "⚠️"]'::jsonb, 'Giá khuyến mãi không bảo hành'),
(724, 'FB-VIEW', 'FACEBOOK', 'Tăng View Video ♻️ 30day, ⚡', 1034, 1400, 1000, 2000000, '["♻️", "⚡"]'::jsonb, 'Bảo hành 30 ngày, siêu tốc'),
(3481, 'FB-STORY', 'FACEBOOK', 'mix cảm xúc 👍❤️🤗😆 Story Facebook', 10001, 11800, 100, 100000000, '[]'::jsonb, 'Xem kèm mix cảm xúc story'),
(3464, 'FB-SHARE', 'FACEBOOK', 'Share post photo ⚡, ♻️ trọn đời', 10710, 12500, 100, 2147483647, '["⚡", "♻️"]'::jsonb, 'Chia sẻ bài viết ảnh bảo hành trọn đời'),
(3423, 'IG-LIKE', 'INSTAGRAM', 'Like instagram tây ♻️ trọn đời 🌐', 5884, 7200, 100, 100000, '["♻️", "🌐"]'::jsonb, 'Bảo hành trọn đời'),
(3424, 'IG-LIKE', 'INSTAGRAM', 'Like instagram tây 🌐, ⚡, ♻️ 30Day', 4866, 6000, 100, 1000000, '["🌐", "⚡", "♻️"]'::jsonb, 'Bảo hành 30 ngày siêu tốc'),
(3425, 'IG-FOL', 'INSTAGRAM', 'theo dõi ig vn - thủ công - chậm ⚠️, 🇻🇳', 56271, 60000, 100, 100000, '["⚠️", "🇻🇳"]'::jsonb, 'Nick Việt lên chậm thủ công'),
(3421, 'IG-VIEW', 'INSTAGRAM', 'view instagram ⚠️, ⚡', 34, 80, 1000, 2147483647, '["⚠️", "⚡"]'::jsonb, 'View video / Reels siêu tốc'),
(3283, 'YT-SUB', 'YOUTUBE', 'Theo Dõi YouTube ⚡, ⚠️', 198, 300, 1000, 10000, '["⚡", "⚠️"]'::jsonb, 'Sub nhanh không bảo hành'),
(3315, 'YT-SUB', 'YOUTUBE', 'theo dõi YouTube 🌐, ⚠️, ⚡', 501, 700, 1000, 100000, '["🌐", "⚠️", "⚡"]'::jsonb, 'Sub quốc tế'),
(3474, 'YT-SUB', 'YOUTUBE', 'Theo Dõi Youtube 🌐, ⚡, ♻️ 30Day', 368060, 375000, 100, 2000, '["🌐", "⚡", "♻️"]'::jsonb, 'Sub chất lượng cao bảo hành 30 ngày'),
(3282, 'YT-LIKE', 'YOUTUBE', 'Like Video Youtube ♻️ 30Day, 🌐, ⚡', 30000, 33000, 100, 100000, '["♻️", "🌐", "⚡"]'::jsonb, 'Like video quốc tế bảo hành 30 ngày'),
(3473, 'YT-LIKE', 'YOUTUBE', 'Like Youtube 🌐, ♻️ 30Day ⚡', 10972, 12800, 100, 100000, '["🌐", "♻️", "⚡"]'::jsonb, 'Bảo hành 30 ngày siêu tốc'),
(3475, 'YT-LIKE', 'YOUTUBE', 'Like Youtube Vietnam ♻️ 30day, 🇻🇳', 33896, 37000, 100, 10000, '["♻️", "🇻🇳"]'::jsonb, 'Like người dùng Việt bảo hành 30 ngày'),
(3476, 'YT-LIKE', 'YOUTUBE', 'Like Youtube Tây 🌐, ⚠️', 10894, 12800, 100, 100000, '["🌐", "⚠️"]'::jsonb, 'Like Tây không bảo hành'),
(3281, 'YT-VIEW', 'YOUTUBE', 'View video ytb ♻️ 30day', 31402, 34500, 100, 1000000, '["♻️"]'::jsonb, 'Bảo hành 30 ngày'),
(3284, 'TG-MEM', 'TELEGRAM', 'Member telegram 🌐, ♻️ 365Day, - chậm', 11575, 13500, 100, 100000, '["🌐", "♻️"]'::jsonb, 'Bảo hành 365 ngày'),
(3431, 'TG-MEM', 'TELEGRAM', 'Member Telegram 🌐, ⚡, ♻️ 180Day', 34726, 37500, 100, 5000000, '["🌐", "⚡", "♻️"]'::jsonb, 'Bảo hành 180 ngày siêu tốc'),
(3484, 'TG-MEM', 'TELEGRAM', 'Member Telegram Tây 🌐, ⚠️', 5773, 7000, 100, 50000, '["🌐", "⚠️"]'::jsonb, 'Member Tây không bảo hành'),
(3285, 'TG-REACT', 'TELEGRAM', 'Tăng Reaction Tích Cực [👍❤️🔥...] + Free View', 487, 700, 1000, 10000, '[]'::jsonb, 'Tặng kèm lượt xem bài viết'),
(3286, 'TG-REACT', 'TELEGRAM', 'Tăng Reaction Tiêu Cực [👎😱🤬...] + Free View', 487, 700, 1000, 10000, '[]'::jsonb, 'Tặng kèm lượt xem bài viết'),
(3287, 'TG-REACT', 'TELEGRAM', 'Tăng Reaction Premium Tiêu Cực [🥱💔🥴...] + Free View', 487, 700, 1000, 10000, '[]'::jsonb, 'Reaction Premium tiêu cực'),
(3288, 'TG-REACT', 'TELEGRAM', 'Tăng Reaction Premium Tích Cực [💯❤️🔥🕊...] + Free View', 487, 700, 1000, 10000, '[]'::jsonb, 'Reaction Premium tích cực'),
(3301, 'TG-VIEW', 'TELEGRAM', 'View Post tele real ⚡', 2636, 3300, 500, 1000000, '["⚡"]'::jsonb, 'View thật người dùng thực'),
(3302, 'TG-VIEW', 'TELEGRAM', 'View Post telegram ⚡', 117, 200, 1000, 10000000, '["⚡"]'::jsonb, 'View nhanh số lượng lớn'),
(3466, 'TG-BOT', 'TELEGRAM', 'TeleGram Bot /Start ⚡, ♻️ 30Day', 6617, 8000, 100, 1000000, '["⚡", "♻️"]'::jsonb, 'Bấm Start bot kèm ref link'),
(3258, 'TG-PREM', 'TELEGRAM', 'Member tele premium ♻️ 30 day', 232805, 240000, 100, 100000, '["♻️"]'::jsonb, 'Tài khoản có Telegram Premium'),
(3483, 'TH-LIKE', 'THREADS', 'Like thread 🌐, ⚠️, ⚡', 36461, 39500, 100, 10000, '["🌐", "⚠️", "⚡"]'::jsonb, 'Like Threads quốc tế'),
(3482, 'TH-FOL', 'THREADS', 'Theo dõi Thread 🌐, ⚠️', 36461, 39500, 100, 10000, '["🌐", "⚠️"]'::jsonb, 'Follower Threads quốc tế')
ON CONFLICT (id) DO UPDATE SET
    service_code = EXCLUDED.service_code,
    platform = EXCLUDED.platform,
    name = EXCLUDED.name,
    original_price = EXCLUDED.original_price,
    retail_price = EXCLUDED.retail_price,
    min_qty = EXCLUDED.min_qty,
    max_qty = EXCLUDED.max_qty,
    symbols = EXCLUDED.symbols,
    note = EXCLUDED.note,
    updated_at = NOW();

-- 3. Update CapCut Pro 12M (Approved price 760.000đ)
UPDATE public.product_variants
SET price = 760000, original_price = 1200000, status = 'ACTIVE', updated_at = NOW()
WHERE sku = 'CAPCUT-PRO-12M';

-- 4. Update YouTube Premium packages
UPDATE public.product_variants SET price = 25000, status = 'ACTIVE' WHERE sku = 'YT-SLOT-BHF-1M';
UPDATE public.product_variants SET price = 175000, status = 'ACTIVE' WHERE sku = 'YT-SLOT-BHF-3M';
UPDATE public.product_variants SET price = 315000, status = 'ACTIVE' WHERE sku = 'YT-SLOT-BHF-6M';
UPDATE public.product_variants SET price = 580000, status = 'ACTIVE' WHERE sku = 'YT-SLOT-BHF-12M';
UPDATE public.product_variants SET price = 110000, status = 'ACTIVE' WHERE sku = 'YT-GMAIL-3M';

-- 5. Seed / Update ElevenLabs Product & Variants (6 Approved SKUs)
WITH cat_ai AS (
    SELECT id FROM public.categories WHERE slug IN ('ai-tools', 'tri-tue-nhan-tao') LIMIT 1
)
INSERT INTO public.products (category_id, slug, name, description, thumbnail_url, badge_label, is_featured, is_active)
SELECT 
    id,
    'elevenlabs',
    'ElevenLabs Voice AI',
    'Giọng đọc và nhân bản giọng nói AI tự nhiên, hỗ trợ tiếng Việt mượt mà.',
    '/assets/icons/products/elevenlabs.jpg',
    'Giọng Đọc AI Số 1',
    true,
    true
FROM cat_ai
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

WITH el_prod AS (
    SELECT id FROM public.products WHERE slug = 'elevenlabs' LIMIT 1
)
INSERT INTO public.product_variants (product_id, sku, name, price, original_price, duration_days, fulfillment_mode, status, stock_limit)
SELECT id, 'ELEVENLABS-REDEEM-100K', 'ElevenLabs Redeem 100K Credit', 99000, 180000, 30, 'MANUAL', 'ACTIVE', 30 FROM el_prod
UNION ALL
SELECT id, 'ELEVENLABS-REDEEM-131K', 'ElevenLabs Redeem 131K Credit', 145000, 250000, 30, 'MANUAL', 'ACTIVE', 25 FROM el_prod
UNION ALL
SELECT id, 'ELEVENLABS-REDEEM-300K', 'ElevenLabs Redeem 300K Credit', 259000, 450000, 30, 'MANUAL', 'ACTIVE', 20 FROM el_prod
UNION ALL
SELECT id, 'ELEVENLABS-REDEEM-1M', 'ElevenLabs Redeem 1M Credit', 429000, 750000, 30, 'MANUAL', 'ACTIVE', 15 FROM el_prod
UNION ALL
SELECT id, 'ELEVENLABS-REDEEM-3M', 'ElevenLabs Redeem 3M Credit', 1049000, 1800000, 30, 'MANUAL', 'ACTIVE', 10 FROM el_prod
UNION ALL
SELECT id, 'ELEVENLABS-REDEEM-7M', 'ElevenLabs Redeem 7M Credit', 1999000, 3400000, 30, 'MANUAL', 'ACTIVE', 8 FROM el_prod
ON CONFLICT (sku) DO UPDATE SET
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    status = 'ACTIVE',
    updated_at = NOW();

-- 6. Seed / Update Locket Gold Lifetimes Variant (85.000đ)
WITH locket_prod AS (
    SELECT id FROM public.products WHERE slug = 'locketgold' LIMIT 1
)
INSERT INTO public.product_variants (product_id, sku, name, price, original_price, duration_days, fulfillment_mode, status, stock_limit)
SELECT id, 'LOCKET-GOLD-BHF-LIFETIME', '[BHF] Locket Gold 1 Lifetimes', 85000, 599000, NULL, 'MANUAL', 'ACTIVE', 30 FROM locket_prod
ON CONFLICT (sku) DO UPDATE SET
    price = EXCLUDED.price,
    status = 'ACTIVE',
    updated_at = NOW();

-- 7. Archive Old VIP/SVIP and Old SMS Packages (Do not delete history)
UPDATE public.product_variants
SET status = 'ARCHIVED', updated_at = NOW()
WHERE sku IN ('MEMBERSHIP-VIP-1M', 'MEMBERSHIP-SVIP-1M', 'MEMBERSHIP-VIP-1Y', 'MEMBERSHIP-SVIP-1Y', 'SMS-GATEWAY-BASIC', 'SMS-GATEWAY-PRO', 'ADOBE-EXPRESS-4M-TRIAL');

-- 8. Enable RLS on smm_servers table
ALTER TABLE public.smm_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active smm servers"
ON public.smm_servers
FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admin full control on smm servers"
ON public.smm_servers
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
);
