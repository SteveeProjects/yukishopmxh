import { NextResponse } from 'next/server';
import { serverStore, type LocalUser } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSessionPayload, getSessionCookieOptions } from '@/lib/session-token';
import { ensureDatabaseReady, queryPostgres, isDatabaseConfigured } from '@/lib/autoMigrate';
import { verifyPassword, hashPassword, needsPasswordRehash } from '@/lib/password-hash';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function syncUserHashToLocalCache(user: LocalUser, hashedPass: string) {
  try {
    const users = serverStore.loadUsers();
    const existingIdx = users.findIndex((x) => x.id === user.id || x.email === user.email);
    const cachedRecord: LocalUser = {
      ...user,
      password: hashedPass || users[existingIdx]?.password || '',
    };
    if (existingIdx >= 0) {
      users[existingIdx] = { ...users[existingIdx], ...cachedRecord };
    } else {
      users.push(cachedRecord);
    }
    serverStore.saveUsers(users);
  } catch {}
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = String(body.identifier || body.username || body.email || '').trim();
    const password = String(body.password || '').trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ thông tin tài khoản và mật khẩu.' },
        { status: 400 }
      );
    }

    await ensureDatabaseReady().catch(() => {});

    const cleanTele = identifier.replace(/^@/, '');

    // 1. Check PostgreSQL public.profiles FIRST when database is configured
    try {
      const pgRes = await queryPostgres(
        `SELECT * FROM public.profiles
         WHERE LOWER(COALESCE(email, '')) = LOWER($1)
            OR LOWER(COALESCE(username, '')) = LOWER($1)
            OR LOWER(REPLACE(COALESCE(telegram_id, ''), '@', '')) = LOWER($2)
            OR COALESCE(phone, '') = $1
         LIMIT 1`,
        [identifier, cleanTele]
      );

      if (pgRes?.rows && pgRes.rows.length > 0) {
        const profile = pgRes.rows[0];
        if (!profile.password_hash || !verifyPassword(password, profile.password_hash)) {
          return NextResponse.json(
            { error: 'Mật khẩu không chính xác. Vui lòng thử lại.' },
            { status: 401 }
          );
        }

        let effectiveHash = String(profile.password_hash);
        if (needsPasswordRehash(effectiveHash)) {
          const upgradedHash = hashPassword(password);
          effectiveHash = upgradedHash;
          await queryPostgres(
            `UPDATE public.profiles SET password_hash = $1, updated_at = NOW() WHERE id::text = $2`,
            [upgradedHash, String(profile.id)]
          ).catch(() => {});
        }

        const userRole: 'admin' | 'user' = String(profile.role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
        const sessionUser: LocalUser = {
          id: profile.id,
          username: profile.username || profile.email?.split('@')[0] || 'User',
          fullName: profile.full_name || profile.username || 'Khách Hàng',
          telegramId: profile.telegram_id || '',
          phone: profile.phone || '',
          email: profile.email || '',
          role: userRole,
          balance: Number(profile.balance || 0),
          cashbackPoints: Number(profile.cashback_points || 0),
          affiliateBalance: Number(profile.affiliate_balance || 0),
          sessionVersion: Number(profile.session_version || 1),
          createdAt: profile.created_at || new Date().toISOString(),
        };

        syncUserHashToLocalCache(sessionUser, effectiveHash);

        const cookiePayload = createSessionPayload(sessionUser);
        const res = NextResponse.json({
          success: true,
          user: sessionUser,
          message: 'Đăng nhập thành công!',
        });

        res.cookies.set(
          'yuki_session',
          encodeURIComponent(JSON.stringify(cookiePayload)),
          getSessionCookieOptions(req)
        );
        return res;
      }
    } catch (pgErr) {
      console.warn('[login] Postgres profiles lookup notice:', pgErr);
    }

    // 2. Fallback to local persistent store (e.g. non-DB dev mode or synced user)
    const localUser = serverStore.findUserByIdentifier(identifier);
    if (localUser && !isDatabaseConfigured()) {
      const isMatch = Boolean(localUser.password && verifyPassword(password, localUser.password));
      if (!isMatch) {
        return NextResponse.json(
          { error: 'Mật khẩu không chính xác. Vui lòng thử lại.' },
          { status: 401 }
        );
      }

      const sessionData = {
        id: localUser.id,
        username: localUser.username,
        fullName: localUser.fullName,
        telegramId: localUser.telegramId,
        phone: localUser.phone,
        email: localUser.email,
        role: localUser.role,
        balance: Number(localUser.balance || 0),
        cashbackPoints: Number(localUser.cashbackPoints || 0),
        affiliateBalance: Number(localUser.affiliateBalance || 0),
      };
      const cookiePayload = createSessionPayload(localUser);

      const res = NextResponse.json({
        success: true,
        user: sessionData,
        message: 'Đăng nhập thành công!',
      });
      res.cookies.set(
        'yuki_session',
        encodeURIComponent(JSON.stringify(cookiePayload)),
        getSessionCookieOptions(req)
      );
      return res;
    }

    // 3. Fallback to Supabase Auth if configured
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        let targetEmail = identifier;
        if (!targetEmail.includes('@')) {
          const byUsername = await supabaseAdmin.from('profiles').select('email').ilike('username', identifier).maybeSingle();
          const byPhone = !byUsername.data?.email ? await supabaseAdmin.from('profiles').select('email').eq('phone', identifier).maybeSingle() : null;
          const byTele = !byUsername.data?.email && !byPhone?.data?.email ? await supabaseAdmin.from('profiles').select('email').eq('telegram_id', cleanTele).maybeSingle() : null;
          targetEmail = byUsername.data?.email || byPhone?.data?.email || byTele?.data?.email || targetEmail;
        }

        let { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (authError && /email not confirmed/i.test(authError.message || '')) {
          try {
            const { data: listed } = await supabaseAdmin.auth.admin.listUsers();
            const unconfirmed = listed?.users?.find(
              (u) => String(u.email || '').toLowerCase() === targetEmail.toLowerCase()
            );
            if (unconfirmed?.id) {
              await supabaseAdmin.auth.admin.updateUserById(unconfirmed.id, { email_confirm: true });
              const retried = await supabaseAdmin.auth.signInWithPassword({
                email: targetEmail,
                password,
              });
              authData = retried.data;
              authError = retried.error;
            }
          } catch {}
        }

        if (!authError && authData?.user) {
          const u = authData.user;
          const { data: prof } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', u.id)
            .maybeSingle();

          const sbRole: 'admin' | 'user' = String(prof?.role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
          const sessionUser: LocalUser = {
            id: u.id,
            username: prof?.username || prof?.telegram_id || u.email?.split('@')[0] || 'User',
            fullName: prof?.full_name || u.email?.split('@')[0] || 'User',
            telegramId: prof?.telegram_id || '',
            phone: prof?.phone || '',
            email: u.email || '',
            role: sbRole,
            balance: Number(prof?.balance || 0),
            cashbackPoints: Number(prof?.cashback_points || 0),
            affiliateBalance: Number(prof?.affiliate_balance || 0),
            sessionVersion: Number(prof?.session_version || 1),
            createdAt: prof?.created_at || new Date().toISOString(),
          };

          syncUserHashToLocalCache(sessionUser, String(prof?.password_hash || hashPassword(password)));

          const cookiePayload = createSessionPayload(sessionUser);
          const res = NextResponse.json({
            success: true,
            user: sessionUser,
            message: 'Đăng nhập thành công!',
          });
          res.cookies.set(
            'yuki_session',
            encodeURIComponent(JSON.stringify(cookiePayload)),
            getSessionCookieOptions(req)
          );
          return res;
        }
      }
    } catch (sbErr) {
      console.warn('[login] Supabase auth fallback error:', sbErr);
    }

    // 4. Final fallback to synced localUser ONLY when database is not configured
    if (localUser && !isDatabaseConfigured()) {
      const isMatch = Boolean(localUser.password && verifyPassword(password, localUser.password));
      if (!isMatch) {
        return NextResponse.json(
          { error: 'Mật khẩu không chính xác. Vui lòng thử lại.' },
          { status: 401 }
        );
      }
      const cookiePayload = createSessionPayload(localUser);
      const res = NextResponse.json({
        success: true,
        user: {
          id: localUser.id,
          username: localUser.username,
          fullName: localUser.fullName,
          telegramId: localUser.telegramId,
          phone: localUser.phone,
          email: localUser.email,
          role: localUser.role,
          balance: Number(localUser.balance || 0),
          cashbackPoints: Number(localUser.cashbackPoints || 0),
          affiliateBalance: Number(localUser.affiliateBalance || 0),
        },
        message: 'Đăng nhập thành công!',
      });
      res.cookies.set(
        'yuki_session',
        encodeURIComponent(JSON.stringify(cookiePayload)),
        getSessionCookieOptions(req)
      );
      return res;
    }

    return NextResponse.json(
      { error: 'Tài khoản không tồn tại hoặc sai mật khẩu.' },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xử lý đăng nhập' }, { status: 500 });
  }
}
