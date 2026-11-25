-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 09: QUEUE & BACKGROUND WORKERS
-- Version: 20261112000009
-- ==============================================================================

-- 1. Queue Jobs Table (Weighted Fair Queue & Starvation Aging)
CREATE TABLE IF NOT EXISTS public.queue_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    tier_priority INT NOT NULL DEFAULT 10, -- SVIP: 50, VIP: 30, REGULAR: 10
    effective_priority INT NOT NULL DEFAULT 10,
    status public.job_status NOT NULL DEFAULT 'QUEUED',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    locked_by_worker TEXT,
    locked_until TIMESTAMPTZ,
    last_error TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON public.queue_jobs(status, effective_priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON public.queue_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_locked_until ON public.queue_jobs(locked_until);

-- 2. Worker Logs & Heartbeat Table
CREATE TABLE IF NOT EXISTS public.worker_logs (
    worker_id TEXT PRIMARY KEY,
    hostname TEXT,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_job_id UUID REFERENCES public.queue_jobs(id),
    jobs_processed_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'BUSY', 'OFFLINE'))
);

CREATE INDEX IF NOT EXISTS idx_worker_heartbeat ON public.worker_logs(last_heartbeat);

-- 3. Dead Letter Queue Table (DLQ)
CREATE TABLE IF NOT EXISTS public.dead_letter_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    failure_reason TEXT NOT NULL,
    moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_user_id ON public.dead_letter_jobs(user_id);
