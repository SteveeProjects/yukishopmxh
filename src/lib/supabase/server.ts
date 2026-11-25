// ==============================================================================
// YUKI WEB V4 — SERVER SUPABASE CLIENT (ROUTE HANDLERS & SSR)
// ==============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const supabaseUrl = getSupabaseUrl() || 'https://placeholder.supabase.co';
  const supabaseAnonKey = getSupabaseAnonKey() || 'placeholder-anon-key';

  return createServerClient<any>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Handled in middleware
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Handled in middleware
        }
      },
    },
  });
}

export function getSupabaseServerClient() {
  return createServerSupabaseClient();
}
