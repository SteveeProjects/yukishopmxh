import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { serverStore, type LocalUser } from '@/lib/server-store';
import { isSessionPayloadValid } from '@/lib/session-token';
import { findDbUserByIdOrIdentifier } from '@/lib/db-persistence';
import { isDatabaseConfigured } from '@/lib/autoMigrate';

export async function getSessionUser(): Promise<LocalUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('yuki_session')?.value;
    if (sessionCookie) {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      if (parsed?.id) {
        let freshUser = await findDbUserByIdOrIdentifier(parsed.id);
        if (!freshUser && parsed.email) {
          freshUser = await findDbUserByIdOrIdentifier(parsed.email);
        }

        if (isSessionPayloadValid(parsed, freshUser)) {
          if (freshUser) return freshUser;
          if (!isDatabaseConfigured() && String(parsed.role || '').toLowerCase() !== 'admin') {
            return { ...parsed, role: 'user' };
          }
        }
      }
    }
  } catch {}

  try {
    const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
    if (!isPlaceholder && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        const dbUser =
          (await findDbUserByIdOrIdentifier(user.id)) ||
          (user.email ? await findDbUserByIdOrIdentifier(user.email) : null);
        if (dbUser) return dbUser;

        const byId = serverStore.findUserById(user.id);
        if (byId) return byId;
        if (user.email) {
          const byEmail = serverStore.findUserByIdentifier(user.email);
          if (byEmail) return byEmail;
        }
        return {
          id: user.id,
          username: user.email || user.id,
          fullName: user.user_metadata?.full_name || user.email || 'Khách Hàng',
          telegramId: '',
          phone: '',
          email: user.email || '',
          role: 'user',
          balance: 0,
          createdAt: new Date().toISOString(),
        };
      }
    }
  } catch {}

  return null;
}
