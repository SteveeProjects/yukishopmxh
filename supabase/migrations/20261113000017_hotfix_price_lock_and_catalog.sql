-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 17: HOTFIX PRICE LOCK & CATALOG CORRECTION
-- Version: 20261113000017
-- Strictly locks Master Data prices from authoritative mindmap images.
-- ==============================================================================

-- 1. Ensure Buff MXH Platform Check strictly allows only 6 platforms:
-- TIKTOK, FACEBOOK, INSTAGRAM, YOUTUBE, TELEGRAM, THREADS.
-- (Spotify and Shopee strictly prohibited in Buff MXH)
ALTER TABLE public.buff_requests
    DROP CONSTRAINT IF EXISTS buff_requests_platform_check;

ALTER TABLE public.buff_requests
    ADD CONSTRAINT buff_requests_platform_check
    CHECK (platform IN ('TIKTOK', 'FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'TELEGRAM', 'THREADS'));

-- 2. Update YouTube Variants with exact Mind Map prices
UPDATE public.product_variants
SET price = 25000, original_price = 79000, status = 'ACTIVE', updated_at = NOW()
WHERE sku = 'YT-SLOT-BHF-1M';

UPDATE public.product_variants
SET price = 175000, original_price = 237000, status = 'ACTIVE', updated_at = NOW()
WHERE sku = 'YT-SLOT-BHF-3M';

UPDATE public.product_variants
SET price = 315000, original_price = 474000, status = 'ACTIVE', updated_at = NOW()
WHERE sku = 'YT-SLOT-BHF-6M';

UPDATE public.product_variants
SET price = 580000, original_price = 948000, status = 'ACTIVE', updated_at = NOW()
WHERE sku = 'YT-SLOT-BHF-12M';

UPDATE public.product_variants
SET price = 110000, original_price = 250000, status = 'ACTIVE', updated_at = NOW()
WHERE sku = 'YT-GMAIL-3M';

-- 3. Mark CapCut Pro 12M as NEEDS_REVIEW (No confirmed price in mind map)
UPDATE public.product_variants
SET price = 0, status = 'NEEDS_REVIEW', updated_at = NOW()
WHERE sku = 'CAPCUT-PRO-12M';

-- 4. Mark ElevenLabs as NEEDS_REVIEW (No confirmed price in mind map)
UPDATE public.product_variants
SET price = 0, status = 'NEEDS_REVIEW', updated_at = NOW()
WHERE sku = 'ELEVENLABS-NEEDS-REVIEW';

-- 5. Mark Adobe Express as NEEDS_REVIEW (Not in authoritative mind map)
UPDATE public.product_variants
SET price = 0, status = 'NEEDS_REVIEW', updated_at = NOW()
WHERE sku = 'ADOBE-EXPRESS-4M-TRIAL';

-- 6. Lock API Tool SMS at confirmed 150.000 VND
UPDATE public.product_variants
SET price = 150000, original_price = 300000, status = 'ACTIVE', updated_at = NOW()
WHERE sku = 'API-TOOL-SMS-150K';
