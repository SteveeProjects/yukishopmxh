import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để nhập mã giới thiệu.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || '').trim();

    if (!code) {
      return NextResponse.json({ error: 'Vui lòng nhập mã giới thiệu hoặc username người mời.' }, { status: 400 });
    }

    const res = serverStore.bindUserReferrer(sessionUser.id, code);
    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Gắn mã giới thiệu thất bại.' }, { status: 400 });
    }

    // Sync to Supabase if configured
    try {
      const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
      if (!isPlaceholder && supabaseAdmin && res.referrer?.id) {
        supabaseAdmin
          .from('profiles')
          .update({ referred_by: res.referrer.id })
          .eq('id', sessionUser.id)
          .then(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      referrer: res.referrer,
      message: `Đã liên kết thành công với người giới thiệu ${res.referrer.username}!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi liên kết mã giới thiệu.' }, { status: 500 });
  }
}
