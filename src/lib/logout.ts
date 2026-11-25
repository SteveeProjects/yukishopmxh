'use client';

import { createBrowserClient } from '@supabase/ssr';

export async function handleLogout() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabase.auth.signOut().catch(() => {});
  await fetch('/api/auth/logout', {
        cache: 'no-store',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allDevices: false }),
  }).catch(() => {});

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('yuki_user');
      localStorage.setItem('yuki_auth_event', JSON.stringify({ type: 'LOGOUT', ts: Date.now() }));
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('yuki_auth_sync');
        ch.postMessage({ type: 'LOGOUT', ts: Date.now() });
        ch.close();
      }
    } catch {}
    window.location.href = '/login';
  }
}
