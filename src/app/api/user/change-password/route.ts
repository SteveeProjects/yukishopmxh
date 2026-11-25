import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword, verifyPassword } from '@/lib/password-hash';
import { isDatabaseConfigured, queryPostgres } from '@/lib/autoMigrate';
import { findDbUserByIdOrIdentifier, updateDbUserFields } from '@/lib/db-persistence';
import { createSessionPayload, getSessionCookieOptions } from '@/lib/session-token';
import { isUuid } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const oldPassword = String(body.oldPassword || body.currentPassword || '').trim();
    const newPassword = String(body.newPassword || body.password || '').trim();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' },
        { status: 400 }
      );
    }

    const existing = await findDbUserByIdOrIdentifier(sessionUser.id);
    const storedPasswordHash = existing?.password || '';
    if (storedPasswordHash) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu.' },
          { status: 400 }
        );
      }
      if (!verifyPassword(oldPassword, storedPasswordHash)) {
        return NextResponse.json(
          { error: 'Mật khẩu hiện tại không chính xác.' },
          { status: 401 }
        );
      }
    }

    const hashed = hashPassword(newPassword);
    const nextSv = Number(sessionUser.sessionVersion || 1) + 1;
    let dbSaved = false;

    const updated = await updateDbUserFields(sessionUser.id, {
      password_hash: hashed,
      session_version: nextSv,
    }).catch(() => false);
    if (updated) dbSaved = true;

    try {
      const pgRes = await queryPostgres(
        `UPDATE public.profiles
         SET password_hash = $1, session_version = $2, updated_at = NOW()
         WHERE id::text = $3 OR LOWER(COALESCE(email, '')) = LOWER($4)
         RETURNING id`,
        [hashed, nextSv, sessionUser.id, sessionUser.email || '']
      );
      if (pgRes?.rows && pgRes.rows.length > 0) dbSaved = true;
    } catch {}

    serverStore.updateUserPassword(sessionUser.id, hashed, {
      isPreHashed: true,
      nextSessionVersion: nextSv,
    });

    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        if (isUuid(sessionUser.id)) {
          try {
            await sbAdmin.auth.admin.updateUserById(sessionUser.id, { password: newPassword });
          } catch {}
        }
        const sbProfRes = isUuid(sessionUser.id)
          ? await sbAdmin
              .from('profiles')
              .update({ password_hash: hashed, session_version: nextSv, updated_at: new Date().toISOString() })
              .eq('id', sessionUser.id)
          : sessionUser.email
          ? await sbAdmin
              .from('profiles')
              .update({ password_hash: hashed, session_version: nextSv, updated_at: new Date().toISOString() })
              .ilike('email', sessionUser.email)
          : { error: new Error('Missing identifier') };
        if (!sbProfRes.error) dbSaved = true;
      }
    } catch (sbErr) {
      console.warn('[change-password] Supabase update notice:', sbErr);
    }

    if (isDatabaseConfigured() && !dbSaved) {
      return NextResponse.json(
        { error: 'Không thể lưu mật khẩu mới vào Database. Vui lòng thử lại.' },
        { status: 500 }
      );
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
