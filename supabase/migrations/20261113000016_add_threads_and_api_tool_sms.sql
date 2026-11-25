-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 16: ADD THREADS PLATFORM & API TOOL SMS PRODUCT
-- Version: 20261113000016
-- ==============================================================================

-- 1. Update Platform Check Constraint to Include THREADS (6 Buff Platforms)
ALTER TABLE public.buff_requests
    DROP CONSTRAINT IF EXISTS buff_requests_platform_check;

ALTER TABLE public.buff_requests
    ADD CONSTRAINT buff_requests_platform_check
    CHECK (platform IN ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'TELEGRAM', 'THREADS'));

-- 2. Insert Category for API Tools if not exists
INSERT INTO public.categories (slug, name, description, icon_name, display_order, is_active)
VALUES (
    'api-tools',
    'API & Công Cụ Tool',
    'Các giải pháp API, công cụ tự động và tài liệu tích hợp chuyên nghiệp.',
    'terminal',
    5,
    true
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. Insert Product: API Tool SMS (Default price 150.000đ, Manual approval)
WITH api_cat AS (
    SELECT id FROM public.categories WHERE slug = 'api-tools' LIMIT 1
)
INSERT INTO public.products (category_id, slug, name, description, thumbnail_url, badge_label, is_featured, is_active)
SELECT 
    id,
    'api-tool-sms',
    'API Tool SMS',
    'Sản phẩm API Tool SMS riêng biệt, cung cấp giao thức kết nối và giải pháp tích hợp an toàn. Không tự động cấp key khi chưa duyệt.',
    '/assets/icons/api/sms-tool.svg',
    'Sản Phẩm Độc Lập',
    true,
    true
FROM api_cat
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, thumbnail_url = EXCLUDED.thumbnail_url;

-- 4. Insert SKU Variant for API Tool SMS (150.000 VND)
WITH sms_prod AS (
    SELECT id FROM public.products WHERE slug = 'api-tool-sms' LIMIT 1
)
INSERT INTO public.product_variants (product_id, sku, name, price, original_price, duration_days, fulfillment_mode, status, stock_limit)
SELECT
    id,
    'API-TOOL-SMS-150K',
    'API Tool SMS Tiêu Chuẩn',
    150000,
    300000,
    NULL,
    'MANUAL',
    'ACTIVE',
    NULL
FROM sms_prod
ON CONFLICT (sku) DO UPDATE
SET price = EXCLUDED.price, status = EXCLUDED.status;

-- 5. Seed Website Settings for Welcome Notice and Telegram Contact
INSERT INTO public.system_settings (key, value, description, is_public)
VALUES 
(
    'welcome_notice',
    '{
        "enabled": true,
        "title": "CHÀO MỪNG ĐẾN VỚI YUKI WEB V4",
        "greeting": "Chào mừng bạn đến với Yuki Web V4! Yuki Web là nền tảng giới thiệu sản phẩm và tiếp nhận yêu cầu đặt hàng.",
        "important_notes": [
            "Website hiện không đấu nối API tự động cho toàn bộ đơn hàng. Tất cả đơn hàng đều được Admin kiểm tra và duyệt thủ công.",
            "Giá và tình trạng sản phẩm cần được xác nhận trước khi mua. Khách hàng vui lòng nhắn tin cho Admin trước khi đặt hàng hoặc thực hiện bất kỳ giao dịch nào.",
            "Không tự ý chuyển khoản khi chưa được Admin xác nhận thông tin thanh toán.",
            "Không cung cấp mật khẩu, OTP hoặc thông tin nhạy cảm cho bất kỳ ai."
        ],
        "process_steps": [
            "Xem sản phẩm hoặc dịch vụ.",
            "Liên hệ Admin trước khi mua.",
            "Xác nhận giá và tình trạng.",
            "Tạo yêu cầu đặt hàng.",
            "Chờ Admin kiểm tra và duyệt thủ công.",
            "Nhận kết quả xử lý."
        ],
        "telegram_contact_url": "https://t.me/yuki_support",
        "button_understand_text": "Đã hiểu",
        "button_contact_text": "Liên hệ Admin"
    }'::jsonb,
    'Cấu hình Popup Welcome Notice khi người dùng truy cập website',
    true
),
(
    'telegram_bot_settings',
    '{
        "scope": "ALL",
        "channel": "PRIVATE",
        "approval_mode": "MANUAL",
        "bot_username": "@yuki_v4_admin_bot",
        "webhook_enabled": true
    }'::jsonb,
    'Cấu hình Telegram Admin Bot Webhook',
    false
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- 6. Telegram Bot Event Queue & Idempotency Table
CREATE TABLE IF NOT EXISTS public.telegram_bot_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- ORDER_CREATED, ORDER_UPDATED, TOPUP_REQUEST, REFUND_REQUEST, CRITICAL_ERROR
    idempotency_key TEXT NOT NULL UNIQUE,
    reference_id TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'ACKNOWLEDGED')),
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_events_status ON public.telegram_bot_events(status);
CREATE INDEX IF NOT EXISTS idx_telegram_events_key ON public.telegram_bot_events(idempotency_key);
