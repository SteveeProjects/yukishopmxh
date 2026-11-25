-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 12: STORED PROCEDURES & TRIGGERS
-- Version: 20261112000012
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Automatic User Provisioning Trigger Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Create Profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );

    -- 2. Assign Default Role USER
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'USER');

    -- 3. Provision Wallet Account (0 VND)
    INSERT INTO public.wallet_accounts (user_id, balance, currency)
    VALUES (NEW.id, 0, 'VND');

    -- 4. Assign Default FREE Membership
    INSERT INTO public.user_memberships (user_id, tier)
    VALUES (NEW.id, 'FREE');

    -- 5. Create Default User Settings
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'USER_PROVISIONING_FAILED: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_provisioning();

-- ------------------------------------------------------------------------------
-- 2. Atomic Top-up Approval Procedure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_topup_approval(
    p_topup_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_topup RECORD;
    v_current_balance BIGINT;
    v_new_balance BIGINT;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'ADMIN') THEN
        RAISE EXCEPTION 'UNAUTHORIZED_NOT_ADMIN';
    END IF;

    -- Lock and retrieve top-up request
    SELECT * INTO v_topup
    FROM public.topup_requests
    WHERE id = p_topup_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TOPUP_NOT_FOUND';
    END IF;

    IF v_topup.status != 'PENDING' THEN
        RAISE EXCEPTION 'TOPUP_ALREADY_PROCESSED';
    END IF;

    -- Lock user's wallet
    SELECT balance INTO v_current_balance
    FROM public.wallet_accounts
    WHERE user_id = v_topup.user_id
    FOR UPDATE;

    v_new_balance := v_current_balance + v_topup.amount;

    -- Update wallet balance
    UPDATE public.wallet_accounts
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = v_topup.user_id;

    -- Record in Immutable Ledger
    INSERT INTO public.wallet_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_id,
        description
    ) VALUES (
        v_topup.user_id,
        'TOPUP',
        v_topup.amount,
        v_current_balance,
        v_new_balance,
        v_topup.reference_code,
        'Nạp tiền QR thành công'
    );

    -- Record in Contribution Ledger for Rank progression
    INSERT INTO public.contribution_ledger (
        user_id,
        amount,
        source_type,
        source_id
    ) VALUES (
        v_topup.user_id,
        v_topup.amount,
        'TOPUP',
        v_topup.reference_code
    );

    -- Update topup request status
    UPDATE public.topup_requests
    SET status = 'APPROVED',
        reviewed_by = p_admin_id,
        reviewed_at = NOW()
    WHERE id = p_topup_id;

    -- Send in-app notification
    INSERT INTO public.notifications (
        user_id,
        title,
        content
    ) VALUES (
        v_topup.user_id,
        'Nạp tiền thành công',
        format('Yêu cầu nạp %s VND của bạn đã được phê duyệt.', v_topup.amount)
    );

    -- Log admin audit
    INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        target_table,
        target_id,
        new_state
    ) VALUES (
        p_admin_id,
        'APPROVE_TOPUP',
        'topup_requests',
        p_topup_id::text,
        jsonb_build_object('amount', v_topup.amount, 'user_id', v_topup.user_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_topup.user_id,
        'amount', v_topup.amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Weighted Fair Queue (WFQ) Job Dispatcher with Starvation Aging
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_next_queue_job(
    p_worker_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job RECORD;
    v_aging_factor INT := 3; -- +3 points per minute of waiting
BEGIN
    -- Update worker heartbeat
    INSERT INTO public.worker_logs (worker_id, last_heartbeat, status)
    VALUES (p_worker_id, NOW(), 'BUSY')
    ON CONFLICT (worker_id)
    DO UPDATE SET last_heartbeat = NOW(), status = 'BUSY';

    -- Find next available job:
    -- Dynamic effective priority = tier_priority + (waiting_seconds / 60 * aging_factor)
    -- Include orphan jobs where locked_until has expired
    SELECT id, user_id, job_type, payload, retry_count
    INTO v_job
    FROM public.queue_jobs
    WHERE (status = 'QUEUED')
       OR (status = 'PROCESSING' AND locked_until < NOW())
    ORDER BY (tier_priority + (EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)::INT * v_aging_factor) DESC,
             created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        UPDATE public.worker_logs SET status = 'ONLINE', current_job_id = NULL WHERE worker_id = p_worker_id;
        RETURN jsonb_build_object('has_job', false);
    END IF;

    -- Lock the job for 2 minutes (120 seconds lease)
    UPDATE public.queue_jobs
    SET status = 'PROCESSING',
        locked_by_worker = p_worker_id,
        locked_until = NOW() + INTERVAL '2 minutes'
    WHERE id = v_job.id;

    UPDATE public.worker_logs SET current_job_id = v_job.id WHERE worker_id = p_worker_id;

    RETURN jsonb_build_object(
        'has_job', true,
        'job_id', v_job.id,
        'user_id', v_job.user_id,
        'job_type', v_job.job_type,
        'payload', v_job.payload,
        'retry_count', v_job.retry_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Complete Queue Job Procedure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_queue_job(
    p_job_id UUID,
    p_worker_id TEXT,
    p_result_data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id FROM public.queue_jobs WHERE id = p_job_id;

    UPDATE public.queue_jobs
    SET status = 'COMPLETED',
        result_data = p_result_data,
        completed_at = NOW(),
        locked_by_worker = NULL,
        locked_until = NULL
    WHERE id = p_job_id;

    -- Increment daily quota used only on SUCCESSFUL completion
    UPDATE public.user_memberships
    SET daily_quota_used = daily_quota_used + 1,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    -- Update worker stats
    UPDATE public.worker_logs
    SET current_job_id = NULL,
        status = 'ONLINE',
        jobs_processed_count = jobs_processed_count + 1,
        last_heartbeat = NOW()
    WHERE worker_id = p_worker_id;
END;
$$;
