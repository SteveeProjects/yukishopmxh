import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để xem kho voucher.' },
        { status: 401 }
      );
    }

    const vouchers = serverStore.getUserVouchers(sessionUser.id);
    return NextResponse.json({
      success: true,
      vouchers,
    });
  } catch (err: any) {
    console.error('[API /api/user/vouchers error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi lấy kho voucher.' },
      { status: 500 }
    );
  }
}
