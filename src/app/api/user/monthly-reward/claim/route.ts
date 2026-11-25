import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const notificationId = String(body.notificationId || '').trim();

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu notificationId.' },
        { status: 400 }
      );
    }

    const ok = serverStore.markMonthlyRewardClaimed(notificationId, sessionUser.id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thông báo quà tặng hoặc bạn không có quyền.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chúc mừng! Quà tặng Top Nạp đã sẵn sàng trong tài khoản của bạn.',
    });
  } catch (err: any) {
    console.error('[API /api/user/monthly-reward/claim error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi nhận quà tháng.' },
      { status: 500 }
    );
  }
}
