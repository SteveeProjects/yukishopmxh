// ==============================================================================
// YUKI WEB V4 — BROWSER SUPABASE CLIENT (PUBLIC ANON KEY)
// ==============================================================================

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function getSupabaseBrowserClient() {
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://placeholder.supabase.co'
  ).trim();

  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'placeholder-anon-key'
  ).trim();

  return createBrowserClient<any>(supabaseUrl, supabaseAnonKey);
}

export function createClient() {
  return getSupabaseBrowserClient();
}
