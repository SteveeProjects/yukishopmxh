-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 04: WALLET & IMMUTABLE FINANCIAL LEDGER
-- Version: 20261112000004
-- ==============================================================================

-- 1. Wallet Accounts Table
CREATE TABLE IF NOT EXISTS public.wallet_accounts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency TEXT NOT NULL DEFAULT 'VND' CHECK (currency = 'VND'),
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_locked ON public.wallet_accounts(is_locked);

-- 2. Immutable Financial Ledger (wallet_transactions)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    transaction_type public.ledger_transaction_type NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    balance_before BIGINT NOT NULL CHECK (balance_before >= 0),
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    reference_id TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounting Equation Integrity Constraint
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS check_ledger_equation;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT check_ledger_equation CHECK (
    (transaction_type IN ('TOPUP', 'REFUND') AND balance_after = balance_before + amount)
    OR
    (transaction_type = 'ORDER_PAYMENT' AND balance_after = balance_before - amount)
    OR
    (transaction_type = 'ADMIN_ADJUSTMENT')
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.wallet_transactions(reference_id);

-- 3. Top-up Requests Table (Manual VietQR Flow)
CREATE TABLE IF NOT EXISTS public.topup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    reference_code TEXT NOT NULL UNIQUE,
    amount BIGINT NOT NULL CHECK (amount >= 10000),
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status public.topup_status NOT NULL DEFAULT 'PENDING',
    admin_note TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topup_user_id ON public.topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_status ON public.topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_reference ON public.topup_requests(reference_code);

-- 4. Refund Requests Table
CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status public.refund_status NOT NULL DEFAULT 'PENDING_REVIEW',
    admin_response TEXT,
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_user_id ON public.refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_order_id ON public.refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_status ON public.refund_requests(status);
