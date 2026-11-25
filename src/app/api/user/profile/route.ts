import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để cập nhật hồ sơ.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const fullName = String(body.fullName || body.full_name || '').trim();
    const phone = String(body.phone || body.phoneNumber || body.phone_number || '').trim();
    const rawTele = String(body.telegramId || body.telegram_id || body.telegramUsername || '').trim();
    const telegramId = rawTele ? (rawTele.startsWith('@') ? rawTele : `@${rawTele}`) : '';

    await ensureDatabaseReady().catch(() => {});

    // 1. Update in PostgreSQL public.profiles
    try {
      await queryPostgres(
        `UPDATE public.profiles
         SET full_name = COALESCE(NULLIF($1, ''), full_name),
             phone = COALESCE(NULLIF($2, ''), phone),
             telegram_id = COALESCE(NULLIF($3, ''), telegram_id),
             updated_at = NOW()
         WHERE id::text = $4 OR LOWER(COALESCE(email, '')) = LOWER($5)`,
        [fullName, phone, telegramId, sessionUser.id, sessionUser.email || '']
      );
    } catch (pgErr) {
      console.warn('[user/profile] Postgres update notice:', pgErr);
    }

    // 2. Update in serverStore
    const users = serverStore.loadUsers();
    const user = users.find((u) => u.id === sessionUser.id || u.email === sessionUser.email);
    if (user) {
      if (fullName) user.fullName = fullName;
      if (phone !== undefined) user.phone = phone;
      if (telegramId !== undefined) user.telegramId = telegramId;
      serverStore.saveUsers(users);
    }

    // 3. Sync to Supabase if configured
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('profiles')
          .update({
            full_name: fullName || undefined,
            phone: phone || undefined,
            telegram_id: telegramId || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionUser.id);
      }
    } catch (sbErr) {
      console.warn('[user-profile] Supabase sync notice:', sbErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: sessionUser.id,
        username: sessionUser.username,
        fullName: fullName || user?.fullName || sessionUser.fullName,
        email: sessionUser.email,
        phone: phone || user?.phone || sessionUser.phone,
        telegramId: telegramId || user?.telegramId || sessionUser.telegramId,
        role: sessionUser.role,
        balance: sessionUser.balance,
      },
      message: 'Đã cập nhật thông tin hồ sơ thành công!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Lỗi xử lý cập nhật hồ sơ.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    await ensureDatabaseReady().catch(() => {});

    let freshProfile: any = null;
    try {
      const pgRes = await queryPostgres(
        `SELECT * FROM public.profiles WHERE id::text = $1 OR LOWER(COALESCE(email, '')) = LOWER($2) LIMIT 1`,
        [sessionUser.id, sessionUser.email || '']
      );
      if (pgRes?.rows && pgRes.rows.length > 0) {
        freshProfile = pgRes.rows[0];
      }
    } catch {}

    const localUser = serverStore.findUserById(sessionUser.id);

    return NextResponse.json({
      success: true,
      user: {
        id: sessionUser.id,
        username: freshProfile?.username || localUser?.username || sessionUser.username,
        fullName: freshProfile?.full_name || localUser?.fullName || sessionUser.fullName,
        email: freshProfile?.email || localUser?.email || sessionUser.email,
        phone: freshProfile?.phone || localUser?.phone || sessionUser.phone,
        telegramId: freshProfile?.telegram_id || localUser?.telegramId || sessionUser.telegramId,
        role: freshProfile?.role || localUser?.role || sessionUser.role,
        balance: Number(freshProfile?.balance ?? localUser?.balance ?? sessionUser.balance ?? 0),
        affiliateBalance: Number(freshProfile?.affiliate_balance ?? localUser?.affiliateBalance ?? 0),
        cashbackPoints: Number(freshProfile?.cashback_points ?? localUser?.cashbackPoints ?? 0),
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
