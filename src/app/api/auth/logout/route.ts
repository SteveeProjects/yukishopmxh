import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { getSessionCookieOptions } from '@/lib/session-token';
import { queryPostgres } from '@/lib/autoMigrate';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const allDevices = Boolean(body?.allDevices);

  if (allDevices) {
    try {
      const currentUser = await getSessionUser();
      if (currentUser?.id) {
        serverStore.bumpUserSessionVersion(currentUser.id);
        const nextSv = Number(currentUser.sessionVersion || 1) + 1;
        await queryPostgres(
          `UPDATE public.profiles SET session_version = COALESCE(session_version, 1) + 1, updated_at = NOW() WHERE id::text = $1`,
          [currentUser.id]
        ).catch(() => {});
        const sbAdmin = getSupabaseAdmin();
        if (sbAdmin) {
          try {
            await sbAdmin.from('profiles').update({ session_version: nextSv }).eq('id', currentUser.id);
          } catch {}
        }
      }
    } catch {}
  }

  const res = NextResponse.json({
    success: true,
    allDevices,
    message: allDevices
      ? 'Đã đăng xuất khỏi tất cả thiết bị.'
      : 'Đăng xuất thành công.',
  });

  res.cookies.set('yuki_session', '', {
    ...getSessionCookieOptions(req),
    maxAge: 0,
    expires: new Date(0),
  });

  return res;
}

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL('/login?expired=1', req.url));
  res.cookies.set('yuki_session', '', {
    ...getSessionCookieOptions(req),
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
