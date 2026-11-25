-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 01: EXTENSIONS & ENUMS
-- Version: 20261112000001
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Define Application Roles
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Define Catalog SKU Statuses & Fulfillment Modes
DO $$ BEGIN
    CREATE TYPE public.sku_status AS ENUM ('ACTIVE', 'INACTIVE', 'NEEDS_REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.fulfillment_mode AS ENUM ('MANUAL', 'AUTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Define Financial Ledger Transaction Types
DO $$ BEGIN
    CREATE TYPE public.ledger_transaction_type AS ENUM (
        'TOPUP',
        'ORDER_PAYMENT',
        'REFUND',
        'ADMIN_ADJUSTMENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Define Top-up & Refund Request Statuses
DO $$ BEGIN
    CREATE TYPE public.topup_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.refund_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Define Membership & Rank Tiers
DO $$ BEGIN
    CREATE TYPE public.membership_tier AS ENUM ('FREE', 'VIP', 'SVIP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.rank_tier_name AS ENUM ('NONE', 'DONG', 'BAC', 'VANG', 'KIM_CUONG');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Define Coupon Discount Types
DO $$ BEGIN
    CREATE TYPE public.coupon_discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Define Order Lifecycle Statuses
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM (
        'PENDING_PAYMENT',
        'PAID',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'REFUND_PENDING',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 9. Define Buff MXH Request Statuses
DO $$ BEGIN
    CREATE TYPE public.buff_request_status AS ENUM (
        'PENDING_QUOTE',
        'QUOTED',
        'ACCEPTED_PAID',
        'IN_PROGRESS',
        'COMPLETED',
        'REJECTED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 10. Define Background Queue Job Statuses
DO $$ BEGIN
    CREATE TYPE public.job_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
