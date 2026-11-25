-- ==============================================================================
-- YUKISHOPMXH / YUKI WEB V4 — MIGRATION 20261113000020
-- Full Upgrade: Rebranding YukiShopMXH, Topup Status Enums, Profiles & RBAC
-- ==============================================================================

-- 1. Extend topup_status enum with WAITING_TRANSFER, PENDING_VERIFICATION, CANCELLED
DO $$
BEGIN
  BEGIN
    ALTER TYPE public.topup_status ADD VALUE IF NOT EXISTS 'WAITING_TRANSFER';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER TYPE public.topup_status ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER TYPE public.topup_status ADD VALUE IF NOT EXISTS 'CANCELLED';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 2. Ensure columns in public.profiles for full profile management
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 3. Strict RLS on profiles: users can update their own profile (name, phone, telegram)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'users_update_own_profile'
  ) THEN
    CREATE POLICY users_update_own_profile ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 4. Ensure topup_requests RLS
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'topup_requests' AND policyname = 'users_view_own_topup'
  ) THEN
    CREATE POLICY users_view_own_topup ON public.topup_requests
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'topup_requests' AND policyname = 'users_create_own_topup'
  ) THEN
    CREATE POLICY users_create_own_topup ON public.topup_requests
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. System Audit Log for Migration 20
INSERT INTO public.admin_audit_logs (
  action,
  entity_type,
  entity_id,
  metadata
) VALUES (
  'MIGRATION_APPLIED',
  'SYSTEM',
  'MIGRATION_20261113000020',
  jsonb_build_object(
    'title', 'YukiShopMXH Full Rebrand & RBAC Upgrade',
    'version', '4.0.0-PROD',
    'timestamp', CURRENT_TIMESTAMP
  )
) ON CONFLICT DO NOTHING;
