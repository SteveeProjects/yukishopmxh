-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 08: BUFF MXH & SERVICE PROVIDER CONFIGS
-- Version: 20261112000008
-- ==============================================================================

-- 1. Buff Requests Table (Quotation Flow)
CREATE TABLE IF NOT EXISTS public.buff_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    platform TEXT NOT NULL CHECK (platform IN ('YOUTUBE', 'TIKTOK', 'FACEBOOK', 'INSTAGRAM', 'TELEGRAM')),
    service_code TEXT NOT NULL,
    target_url TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    user_notes TEXT,
    quoted_price BIGINT, -- Unit price quoted by Admin
    total_quote_amount BIGINT,
    status public.buff_request_status NOT NULL DEFAULT 'PENDING_QUOTE',
    admin_notes TEXT,
    order_id UUID REFERENCES public.orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buff_user_id ON public.buff_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_buff_status ON public.buff_requests(status);
CREATE INDEX IF NOT EXISTS idx_buff_platform ON public.buff_requests(platform);

-- 2. Provider Configurations Table (SMS / External Gateways)
CREATE TABLE IF NOT EXISTS public.provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL UNIQUE CHECK (service_type IN ('SMS', 'SOCIAL_API', 'BANK_GATEWAY')),
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    provider_name TEXT NOT NULL,
    api_endpoint TEXT,
    credentials_encrypted JSONB NOT NULL DEFAULT '{}'::jsonb,
    rate_limit_per_minute INT NOT NULL DEFAULT 5,
    kill_switch_active BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
