-- ==============================================================================
-- YUKI WEB V4 / YUKISHOPMXH — MIGRATION 21: MULTI-MODAL AUTH, TERMS & NOTIFICATIONS
-- Version: 20261113000021
-- ==============================================================================

-- 1. Ensure Multi-Modal Auth columns exist on profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS telegram_id TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Backfill phone if phone_number is present
UPDATE public.profiles 
SET phone = phone_number 
WHERE phone IS NULL AND phone_number IS NOT NULL;

-- 2. Performance Indexes for Identifier Lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_username ON public.profiles(telegram_username);

-- 3. Update User Provisioning Trigger with Multi-Modal Attributes
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phone TEXT;
    v_tele TEXT;
    v_fullname TEXT;
BEGIN
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number');
    v_tele := COALESCE(NEW.raw_user_meta_data->>'telegram_id', NEW.raw_user_meta_data->>'telegram_username');
    v_fullname := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    -- 1. Create Profile with Multi-modal details
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        phone, 
        phone_number, 
        telegram_id, 
        telegram_username, 
        terms_accepted_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_fullname,
        v_phone,
        v_phone,
        v_tele,
        v_tele,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
        telegram_id = COALESCE(EXCLUDED.telegram_id, public.profiles.telegram_id),
        telegram_username = COALESCE(EXCLUDED.telegram_username, public.profiles.telegram_username),
        updated_at = NOW();

    -- 2. Assign Default Role USER
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'USER')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 3. Provision Wallet Account (0 VND)
    INSERT INTO public.wallet_accounts (user_id, balance, currency)
    VALUES (NEW.id, 0, 'VND')
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. Assign Default FREE Membership
    INSERT INTO public.user_memberships (user_id, tier)
    VALUES (NEW.id, 'FREE')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- 4. Audit Table for Pre-Order Confirmations & Telegram Dispatch
CREATE TABLE IF NOT EXISTS public.transaction_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'PRODUCT_PURCHASE', 'BUFF_MXH', 'WALLET_TOPUP'
    customer_identifier TEXT NOT NULL,
    amount BIGINT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    telegram_dispatched BOOLEAN NOT NULL DEFAULT false,
    telegram_response JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trans_notif_order_id ON public.transaction_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_trans_notif_type ON public.transaction_notifications(transaction_type);

-- Enable RLS on transaction_notifications
ALTER TABLE public.transaction_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full control on transaction_notifications"
ON public.transaction_notifications
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'ADMIN'
    )
);

CREATE POLICY "Users can view their own notifications"
ON public.transaction_notifications
FOR SELECT
TO authenticated
USING (
    customer_identifier = auth.jwt()->>'email' OR
    customer_identifier = (SELECT email FROM public.profiles WHERE id = auth.uid())
);
