import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/password-hash';
import { queryPostgres } from '@/lib/autoMigrate';
import { updateDbUserFields } from '@/lib/db-persistence';
import { createSessionPayload, getSessionCookieOptions } from '@/lib/session-token';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để đổi mật khẩu.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const newPassword = String(body.newPassword || body.password || '').trim();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' },
        { status: 400 }
      );
    }

    const hashed = hashPassword(newPassword);
    const nextSv = Number(sessionUser.sessionVersion || 1) + 1;

    await updateDbUserFields(sessionUser.id, {
      password_hash: hashed,
      session_version: nextSv,
    });
    try {
      await queryPostgres(
        `UPDATE public.profiles
         SET password_hash = $1, session_version = $2, updated_at = NOW()
         WHERE id = $3 OR LOWER(email) = LOWER($4)`,
        [hashed, nextSv, sessionUser.id, sessionUser.email || '']
      );
    } catch {}

    serverStore.updateUserPassword(sessionUser.id, hashed);

    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        if (sessionUser.id.includes('-')) {
          try {
            await sbAdmin.auth.admin.updateUserById(sessionUser.id, { password: newPassword });
          } catch {}
        }
        await sbAdmin
          .from('profiles')
          .update({ password_hash: hashed, session_version: nextSv, updated_at: new Date().toISOString() })
          .eq('id', sessionUser.id);
      }
    } catch (sbErr) {
      console.warn('[change-password] Supabase update notice:', sbErr);
    }

    const res = NextResponse.json({
      success: true,
      message: 'Đã cập nhật mật khẩu mới thành công!',
    });

    // Refresh current session cookie with incremented session_version so current user stays logged in
    res.cookies.set(
      'yuki_session',
      encodeURIComponent(JSON.stringify(createSessionPayload({ ...sessionUser, sessionVersion: nextSv }))),
      getSessionCookieOptions(req)
    );

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Lỗi xử lý đổi mật khẩu.' },
      { status: 500 }
    );
  }
}
