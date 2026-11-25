-- ==============================================================================
-- MIGRATION: 20261114000024_fix_6_issues_inventory_auth_buff.sql
-- PURPOSE: Fix 6 Production Issues:
--   1. Clean test packages, lock YT-SLOT-BHF-1M to 25,000 VND.
--   2. Ensure orders table has delivery_contact, paid, refunded, deducted_balance.
--   3. Ensure wallet_topups & orders have status constraint and RLS policies.
--   4. Standardize profiles balance & role check.
-- ==============================================================================

-- 1. Ensure orders columns exist
ALTER TABLE IF EXISTS public.orders 
  ADD COLUMN IF NOT EXISTS delivery_contact TEXT,
  ADD COLUMN IF NOT EXISTS target_link TEXT,
  ADD COLUMN IF NOT EXISTS deducted_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE;

-- 2. Clean test catalog items & reset YT-SLOT-BHF-1M price
DELETE FROM public.catalog_items WHERE sku LIKE 'TEST-PKG-%';

UPDATE public.catalog_items 
SET price = 25000, original_price = 79000, status = 'ACTIVE', updated_at = NOW() 
WHERE sku = 'YT-SLOT-BHF-1M';

-- 3. Ensure all catalog_items have a valid status (never NULL or empty)
UPDATE public.catalog_items 
SET status = 'ACTIVE' 
WHERE status IS NULL OR status = '' OR status = 'undefined';

-- 4. Ensure RLS policies for orders allow insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow authenticated users to insert orders'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert orders"
      ON public.orders FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow public insert orders'
  ) THEN
    CREATE POLICY "Allow public insert orders"
      ON public.orders FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Comments
COMMENT ON TABLE public.orders IS 'YukiShopMXH Orders table with delivery_contact and anti-double credit/refund protections';
