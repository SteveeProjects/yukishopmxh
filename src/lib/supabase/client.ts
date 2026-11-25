// ==============================================================================
// YUKI WEB V4 — BROWSER SUPABASE CLIENT (PUBLIC ANON KEY)
// ==============================================================================

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';

export function getSupabaseBrowserClient() {
  const supabaseUrl = getSupabaseUrl() || 'https://placeholder.supabase.co';
  const supabaseAnonKey = getSupabaseAnonKey() || 'placeholder-anon-key';

  return createBrowserClient<any>(supabaseUrl, supabaseAnonKey);
}

export function createClient() {
  return getSupabaseBrowserClient();
}
