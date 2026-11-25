-- ==============================================================================
-- YUKISHOPMXH — COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- Defense-in-depth: Read own rows via auth.uid(), Block direct client mutations
-- All financial ledgers & balance alterations strictly restricted to server-side service role
-- ==============================================================================

-- 1. PROFILES
DO $$ BEGIN
  ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_service_role_all" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_service_role_all" ON profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. ORDERS
DO $$ BEGIN
  ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_service_role_all" ON orders;

CREATE POLICY "orders_select_own" ON orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "orders_service_role_all" ON orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. TRANSACTIONS
DO $$ BEGIN
  ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_service_role_all" ON transactions;

CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "transactions_service_role_all" ON transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. WALLET LEDGER
DO $$ BEGIN
  ALTER TABLE IF EXISTS wallet_ledger ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "wallet_ledger_select_own" ON wallet_ledger;
DROP POLICY IF EXISTS "wallet_ledger_service_role_all" ON wallet_ledger;

CREATE POLICY "wallet_ledger_select_own" ON wallet_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wallet_ledger_service_role_all" ON wallet_ledger
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. WITHDRAWALS
DO $$ BEGIN
  ALTER TABLE IF EXISTS withdrawals ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "withdrawals_select_own" ON withdrawals;
DROP POLICY IF EXISTS "withdrawals_service_role_all" ON withdrawals;

CREATE POLICY "withdrawals_select_own" ON withdrawals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "withdrawals_service_role_all" ON withdrawals
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. BANK ACCOUNTS
DO $$ BEGIN
  ALTER TABLE IF EXISTS bank_accounts ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "bank_accounts_select_own" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert_own" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_delete_own" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_service_role_all" ON bank_accounts;

CREATE POLICY "bank_accounts_select_own" ON bank_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "bank_accounts_insert_own" ON bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_accounts_delete_own" ON bank_accounts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "bank_accounts_service_role_all" ON bank_accounts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. VOUCHERS
DO $$ BEGIN
  ALTER TABLE IF EXISTS vouchers ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "vouchers_select_own_or_public" ON vouchers;
DROP POLICY IF EXISTS "vouchers_service_role_all" ON vouchers;

CREATE POLICY "vouchers_select_own_or_public" ON vouchers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "vouchers_service_role_all" ON vouchers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. PASSWORD RESET TOKENS (Service role only — block public & authenticated access)
DO $$ BEGIN
  ALTER TABLE IF EXISTS password_reset_tokens ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "password_reset_tokens_service_role_only" ON password_reset_tokens;

CREATE POLICY "password_reset_tokens_service_role_only" ON password_reset_tokens
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 9. TELEGRAM BOT SESSIONS (Service role only — block public & authenticated access)
DO $$ BEGIN
  ALTER TABLE IF EXISTS telegram_bot_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "telegram_bot_sessions_service_role_only" ON telegram_bot_sessions;

CREATE POLICY "telegram_bot_sessions_service_role_only" ON telegram_bot_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
