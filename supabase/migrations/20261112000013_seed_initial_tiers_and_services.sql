-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 13: SEED TIERS, PLANS & 23 REFERENCE SERVICES
-- Version: 20261112000013
-- ==============================================================================

-- 1. Seed VIP & SVIP Plans (Fixed Rules from Master Prompt)
INSERT INTO public.vip_plans (id, tier, name, duration_days, price, daily_quota, command_loop_limit, queue_weight, is_active)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'VIP', 'VIP 30 Ngày', 30, 20000, 40, 20, 30, true),
    ('c2222222-2222-2222-2222-222222222222', 'VIP', 'VIP Trọn Đời', NULL, 100000, 40, 20, 30, true),
    ('c3333333-3333-3333-3333-333333333333', 'SVIP', 'SVIP 30 Ngày', 30, 35000, -1, 100, 50, true),
    ('c4444444-4444-4444-4444-444444444444', 'SVIP', 'SVIP Trọn Đời', NULL, 150000, -1, 100, 50, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Rank Tiers (Fixed Rules from Master Prompt)
INSERT INTO public.rank_tiers (tier, name, min_contribution, discount_percent)
VALUES
    ('NONE', 'Thành Viên', 0, 0),
    ('DONG', 'Đồng', 500000, 2),
    ('BAC', 'Bạc', 1000000, 5),
    ('VANG', 'Vàng', 3000000, 8),
    ('KIM_CUONG', 'Kim Cương', 5000000, 10)
ON CONFLICT (tier) DO NOTHING;

-- 3. Seed Default System Settings
INSERT INTO public.system_settings (key, value, description, is_public)
VALUES
    ('app_name', '"Yuki Web V4"'::jsonb, 'Tên chính thức của nền tảng', true),
    ('maintenance_mode', 'false'::jsonb, 'Chế độ bảo trì hệ thống toàn cục', true),
    ('min_topup_amount', '10000'::jsonb, 'Số tiền nạp tối thiểu (VND)', true),
    ('starvation_threshold_minutes', '15'::jsonb, 'Ngưỡng phút nâng ưu tiên chống bỏ đói WFQ', false)
ON CONFLICT (key) DO NOTHING;

-- 4. Seed Provider Configs (Default SMS Disabled with Kill-switch Active)
INSERT INTO public.provider_configs (service_type, is_enabled, provider_name, kill_switch_active, rate_limit_per_minute)
VALUES
    ('SMS', false, 'None (Chưa kích hoạt)', true, 5),
    ('SOCIAL_API', false, 'Quotation Workflow (Báo giá thủ công)', false, 10),
    ('BANK_GATEWAY', false, 'Manual VietQR', false, 30)
ON CONFLICT (service_type) DO NOTHING;
