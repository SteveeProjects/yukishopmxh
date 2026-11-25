-- ==============================================================================
-- YUKI WEB V4 — MIGRATION 15: CLEAN BUFF PLATFORMS (5 CORE PLATFORMS ONLY)
-- Version: 20261113000015
-- ==============================================================================

-- Ensure platform constraint strictly allows only 5 target platforms
ALTER TABLE public.buff_requests
    DROP CONSTRAINT IF EXISTS buff_requests_platform_check;

ALTER TABLE public.buff_requests
    ADD CONSTRAINT buff_requests_platform_check
    CHECK (platform IN ('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'TELEGRAM'));

-- Comment explaining strict catalog separation
COMMENT ON TABLE public.buff_requests IS 'Strict 5 Platforms: FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE, TELEGRAM. Threads, Shopee, and Spotify strictly removed from Buff.';
