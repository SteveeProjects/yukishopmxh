-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 11: ROW LEVEL SECURITY (RLS) POLICIES
-- Version: 20261112000011
-- ==============================================================================

-- 1. Helper Security Function: Check if user has ADMIN role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

-- 2. Enable RLS on ALL Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buff_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Define Policies
-- ------------------------------------------------------------------------------

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User Roles: Only Admin can view or edit
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin() OR auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());

-- User Settings
CREATE POLICY "Users can manage own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Catalog: Public read for active items, Admin full management
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Public read active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());
CREATE POLICY "Admin manage products" ON public.products FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Public read active variants" ON public.product_variants FOR SELECT TO anon, authenticated USING (status = 'ACTIVE' OR public.is_admin());
CREATE POLICY "Admin manage variants" ON public.product_variants FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Admin view price history" ON public.product_price_history FOR SELECT TO authenticated USING (public.is_admin());

-- Wallet Accounts: User views own, Admin views all, no direct update by user
CREATE POLICY "Users view own wallet" ON public.wallet_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Wallet Transactions: Read-only for own, Admin views all, Immutable
CREATE POLICY "Users view own ledger" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Topup Requests: Users view own & insert, Admin views all & manages
CREATE POLICY "Users view own topup" ON public.topup_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create topup" ON public.topup_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage topup" ON public.topup_requests FOR UPDATE TO authenticated USING (public.is_admin());

-- Refund Requests
CREATE POLICY "Users view own refunds" ON public.refund_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create refund request" ON public.refund_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage refunds" ON public.refund_requests FOR UPDATE TO authenticated USING (public.is_admin());

-- Membership & Plans
CREATE POLICY "Public read active vip plans" ON public.vip_plans FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());
CREATE POLICY "Users view own membership" ON public.user_memberships FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Rank
CREATE POLICY "Public read rank tiers" ON public.rank_tiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users view own contribution" ON public.contribution_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Coupons
CREATE POLICY "Users read active coupons" ON public.coupons FOR SELECT TO authenticated USING (is_active = true OR public.is_admin());
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users view own coupon redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Orders & Items
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin());

-- Buff Requests
CREATE POLICY "Users view own buff requests" ON public.buff_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users insert buff request" ON public.buff_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage buff requests" ON public.buff_requests FOR ALL TO authenticated USING (public.is_admin());

-- Provider Configs
CREATE POLICY "Admin manage provider configs" ON public.provider_configs FOR ALL TO authenticated USING (public.is_admin());

-- Queue & Workers
CREATE POLICY "Users view own queue jobs" ON public.queue_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admin view worker logs" ON public.worker_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admin view dead letter" ON public.dead_letter_jobs FOR SELECT TO authenticated USING (public.is_admin());

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin Audit Logs & System Settings
CREATE POLICY "Admin view audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Public view public settings" ON public.system_settings FOR SELECT TO anon, authenticated USING (is_public = true OR public.is_admin());
CREATE POLICY "Admin manage settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin());
