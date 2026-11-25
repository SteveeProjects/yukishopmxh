import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverStore, type LocalUser } from '@/lib/server-store';
import {
  createSessionPayload,
  getSessionCookieOptions,
  isSessionPayloadValid,
} from '@/lib/session-token';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function clearInvalidCookieResponse(req: Request) {
  const res = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  res.cookies.set('yuki_session', '', {
    ...getSessionCookieOptions(req),
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('yuki_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      return clearInvalidCookieResponse(req);
    }

    if (!parsed?.id) {
      return clearInvalidCookieResponse(req);
    }

    // Ensure database migration is ready
    await ensureDatabaseReady().catch(() => {});

    // Always query PostgreSQL public.profiles for fresh balance & state
    let dbUser: any = null;
    try {
      const pgRes = await queryPostgres(
        `SELECT * FROM public.profiles WHERE id = $1 OR email = $2 LIMIT 1`,
        [parsed.id, parsed.email || '']
      );
      if (pgRes?.rows && pgRes.rows.length > 0) {
        dbUser = pgRes.rows[0];
      }
    } catch (pgErr) {
      console.warn('[auth/me] Postgres lookup notice:', pgErr);
    }

    // Fallback to Supabase Admin if Postgres direct pool was unavailable
    if (!dbUser) {
      try {
        const sbAdmin = getSupabaseAdmin();
        if (sbAdmin) {
          const { data: prof } = await sbAdmin
            .from('profiles')
            .select('*')
            .eq('id', parsed.id)
            .maybeSingle();
          if (prof) dbUser = prof;
        }
      } catch {}
    }

    const localUser = serverStore.findUserById(parsed.id);

    // If found in DB, reconcile fresh balance and data (NEVER trust cookie role override)
    const freshUser: LocalUser | null = dbUser
      ? {
          id: dbUser.id,
          username: dbUser.username || localUser?.username || parsed.username || 'User',
          fullName: dbUser.full_name || localUser?.fullName || parsed.fullName || 'Khách Hàng',
          telegramId: dbUser.telegram_id || localUser?.telegramId || parsed.telegramId || '',
          phone: dbUser.phone || localUser?.phone || parsed.phone || '',
          email: dbUser.email || localUser?.email || parsed.email || '',
          role: (String(dbUser.role || '').toLowerCase() === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
          balance: Number(dbUser.balance ?? localUser?.balance ?? 0),
          cashbackPoints: Number(dbUser.cashback_points ?? localUser?.cashbackPoints ?? 0),
          totalCashbackEarned: Number(dbUser.total_cashback_earned ?? localUser?.totalCashbackEarned ?? 0),
          affiliateBalance: Number(dbUser.affiliate_balance ?? localUser?.affiliateBalance ?? 0),
          referralCode: dbUser.referral_code || localUser?.referralCode || undefined,
          referredBy: dbUser.referred_by || localUser?.referredBy || undefined,
          savedProfiles: Array.isArray(dbUser.saved_profiles) ? dbUser.saved_profiles : localUser?.savedProfiles || [],
          sessionVersion: Number(dbUser.session_version ?? localUser?.sessionVersion ?? 1),
          createdAt: dbUser?.created_at || localUser?.createdAt || new Date().toISOString(),
        }
      : (localUser || null);

    if (!isSessionPayloadValid(parsed, freshUser)) {
      return clearInvalidCookieResponse(req);
    }

    const user = freshUser || { ...parsed, role: 'user' as const };

    // Cache updated profile in serverStore
    if (freshUser) {
      try {
        const users = serverStore.loadUsers();
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...freshUser, password: users[idx].password };
        } else {
          users.push(freshUser);
        }
        serverStore.saveUsers(users);
      } catch {}
    }

    let lifetimeDeposit = serverStore.getUserLifetimeDeposit(user.id);
    try {
      const pgDep = await queryPostgres(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM public.deposit_requests
         WHERE user_id = $1 AND status IN ('approved', 'completed')`,
        [user.id]
      );
      const pgTotal = Number(pgDep?.rows?.[0]?.total || 0);
      lifetimeDeposit = Math.max(lifetimeDeposit, pgTotal, Number(dbUser?.total_deposited || 0));
    } catch {}

    const res = NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          telegramId: user.telegramId,
          phone: user.phone,
          email: user.email,
          role: user.role,
          balance: Number(user.balance || 0),
          cashbackPoints: Number(user.cashbackPoints || 0),
          totalCashbackEarned: Number(user.totalCashbackEarned || 0),
          affiliateBalance: Number(user.affiliateBalance || 0),
          savedProfiles: Array.isArray(user.savedProfiles) ? user.savedProfiles : [],
          lifetimeDeposit,
          referralCode: user.referralCode || user.referral_code || null,
          referredBy: user.referredBy || user.referred_by || null,
          referralEarnings: Number(user.referralEarnings || user.referral_earnings || 0),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );

    // Sliding 30-day renewal
    res.cookies.set(
      'yuki_session',
      encodeURIComponent(JSON.stringify(createSessionPayload(user))),
      getSessionCookieOptions(req)
    );

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
