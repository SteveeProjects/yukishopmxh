import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        notification: null,
      });
    }

    const notification = serverStore.getUnseenMonthlyReward(sessionUser.id);
    return NextResponse.json({
      success: true,
      authenticated: true,
      notification: notification || null,
    });
  } catch (err: any) {
    console.error('[API /api/user/monthly-reward/unseen error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi kiểm tra thông báo quà tháng.' },
      { status: 500 }
    );
  }
}
