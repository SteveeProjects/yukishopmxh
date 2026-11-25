// ==============================================================================
// YUKISHOPMXH — SITE SETTINGS & ANNOUNCEMENT TYPES
// ==============================================================================

export interface AnnouncementPopupConfig {
  is_active: boolean; // Controls PortalModal on Home Page
  banner_active: boolean; // Controls running/pinned banner at top of Home Page
  title: string;
  content: string;
  cta_text: string;
  cta_link: string;
  banner_text: string;
  support_telegram_url?: string;
  updated_at: string;
}

export interface SystemConfig {
  sleep_mode: boolean;
  sleep_message: string;
  cashback_rate: number; // default 0.02 (2%)
  cashback_min_order: number; // default 20000
  cashback_min_redeem: number; // default 5000
  affiliate_rate: number; // default 0.05 (5%)
  updated_at: string;
}

export interface SiteSettingsRecord<T = any> {
  key: string;
  value: T;
  updated_at: string;
}
