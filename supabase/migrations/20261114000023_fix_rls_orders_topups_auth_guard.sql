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
