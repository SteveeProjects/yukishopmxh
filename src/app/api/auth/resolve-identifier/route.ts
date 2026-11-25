import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { serverStore } from '@/lib/server-store';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { identifier } = await req.json().catch(() => ({}));
    const clean = String(identifier || '').trim();

    if (!clean || clean.length > 120 || !/^[a-zA-Z0-9_@.+ -]+$/.test(clean)) {
      return NextResponse.json(
        { error: 'Định dạng Email, Tên đăng nhập, SĐT hoặc ID Telegram không hợp lệ.' },
        { status: 400 }
      );
    }

    if (clean.includes('@')) {
      return NextResponse.json({ email: clean.toLowerCase() });
    }

    const normalizedTele = clean.replace(/^@/, '');

    // 1. Ensure DB schema is ready
    await ensureDatabaseReady().catch(() => {});

    // 2. Search local serverStore first (offline/hybrid support)
    const localUser =
      serverStore.findUserByIdentifier(clean) ||
      serverStore.findUserByTelegramId(normalizedTele);
    if (localUser?.email) {
      return NextResponse.json({ email: localUser.email.toLowerCase() });
    }

    // 3. Search PostgreSQL public.profiles directly via pool
    try {
      const pgRes = await queryPostgres(
        `SELECT email FROM public.profiles
         WHERE LOWER(username) = LOWER($1)
            OR LOWER(email) = LOWER($1)
            OR telegram_id ILIKE $1
            OR telegram_id ILIKE $2
            OR phone = $1
         LIMIT 1`,
        [clean, normalizedTele]
      );
      if (pgRes?.rows?.[0]?.email) {
        return NextResponse.json({ email: String(pgRes.rows[0].email).toLowerCase() });
      }
    } catch (pgErr) {
      console.warn('[resolve-identifier] Postgres query notice:', pgErr);
    }

    // 4. Search via Supabase Admin Client using safe single-column equality/ilike filters (no .or string interpolation)
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      try {
        const candidates = await Promise.all([
          supabaseAdmin.from('profiles').select('email').ilike('username', clean).limit(1).maybeSingle(),
          supabaseAdmin.from('profiles').select('email').ilike('telegram_id', normalizedTele).limit(1).maybeSingle(),
          supabaseAdmin.from('profiles').select('email').eq('phone', clean).limit(1).maybeSingle(),
          supabaseAdmin.from('profiles').select('email').ilike('email', clean).limit(1).maybeSingle(),
        ]);
        const matched = candidates.find((c) => c.data?.email)?.data;
        if (matched?.email) {
          return NextResponse.json({ email: String(matched.email).toLowerCase() });
        }
      } catch (sbErr) {
        console.warn('[resolve-identifier] Supabase query notice:', sbErr);
      }
    }

    return NextResponse.json(
      { error: 'Không tìm thấy tài khoản khớp với Tên đăng nhập, ID Telegram hoặc SĐT này.' },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xác thực danh tính.' }, { status: 500 });
  }
}
