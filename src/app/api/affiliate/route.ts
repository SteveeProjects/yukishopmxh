import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateStats } from '@/lib/affiliate-service';
import { getSessionUser } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để xem thông tin giới thiệu.' },
        { status: 401 }
      );
    }

    const host =
      req.headers.get('host') ||
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') ||
      (process.env.VERCEL_URL || 'yukishopmxh.vn');
    const protocol = req.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    const hostUrl = `${protocol}://${host}`;

    const stats = await getAffiliateStats(sessionUser.id, hostUrl);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (err: any) {
    console.error('[API /api/affiliate error]:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ: ' + err.message },
      { status: 500 }
    );
  }
}
