// ==============================================================================
// YUKISHOPMXH — DUAL-CHECK ADMIN AUTHENTICATION HELPER
// Validates HMAC-signed session cookie & verified DB/Supabase role = 'admin'
// ==============================================================================

import { getSessionUser } from '@/lib/session-auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ADMIN_EMAIL } from '@/lib/constants';
import { findDbUserByIdOrIdentifier } from '@/lib/db-persistence';
import { isUuid } from '@/lib/supabase/env';

export async function verifyAdminRequest(): Promise<boolean> {
  try {
    const user = await getSessionUser();
    if (user?.id && String(user.role || '').toLowerCase() === 'admin') {
      const verified =
        (await findDbUserByIdOrIdentifier(user.id)) ||
        (user.email ? await findDbUserByIdOrIdentifier(user.email) : null);
      if (verified && String(verified.role || '').toLowerCase() === 'admin') {
        return true;
      }
    }
  } catch {}

  // Fallback check on verified Supabase Auth getUser()
  try {
    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin) {
      const supabase = createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const profRes = isUuid(user.id)
          ? await sbAdmin.from('profiles').select('role, email').eq('id', user.id).maybeSingle()
          : user.email
          ? await sbAdmin.from('profiles').select('role, email').ilike('email', user.email).maybeSingle()
          : { data: null };
        const prof = profRes.data;

        if (
          String(prof?.role || '').toLowerCase() === 'admin' &&
          (prof?.email || user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()
        ) {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[verifyAdminRequest] Supabase check notice:', err);
  }

  return false;
}
