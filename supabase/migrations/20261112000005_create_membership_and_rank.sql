-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 05: MEMBERSHIP & RANK SUBSYSTEM
-- Version: 20261112000005
-- ==============================================================================

-- 1. VIP Plans Table
CREATE TABLE IF NOT EXISTS public.vip_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier public.membership_tier NOT NULL,
    name TEXT NOT NULL,
    duration_days INT, -- NULL indicates Lifetime
    price BIGINT NOT NULL CHECK (price >= 0),
    daily_quota INT NOT NULL, -- -1 indicates Unlimited
    command_loop_limit INT NOT NULL,
    queue_weight INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. User Memberships Table
CREATE TABLE IF NOT EXISTS public.user_memberships (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    tier public.membership_tier NOT NULL DEFAULT 'FREE',
    plan_id UUID REFERENCES public.vip_plans(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL indicates Lifetime or FREE
    daily_quota_used INT NOT NULL DEFAULT 0,
    last_quota_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_tier ON public.user_memberships(tier);
CREATE INDEX IF NOT EXISTS idx_memberships_expires ON public.user_memberships(expires_at);

-- 3. Rank Tiers Configuration Table
CREATE TABLE IF NOT EXISTS public.rank_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier public.rank_tier_name NOT NULL UNIQUE,
    name TEXT NOT NULL,
    min_contribution BIGINT NOT NULL CHECK (min_contribution >= 0),
    discount_percent INT NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

-- 4. Contribution Ledger Table (Cumulative contribution from valid top-ups/donations)
CREATE TABLE IF NOT EXISTS public.contribution_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    source_type TEXT NOT NULL CHECK (source_type IN ('TOPUP', 'DONATION')),
    source_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contrib_user_id ON public.contribution_ledger(user_id);
