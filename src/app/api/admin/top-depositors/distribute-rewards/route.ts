import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Truy cập bị từ chối. Cần quyền Quản Trị Viên.' }, { status: 403 });
    }

    let targetMonth: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.month === 'string' && body.month.trim()) {
        targetMonth = body.month.trim();
      }
    } catch {}

    const result = serverStore.distributeMonthlyTopDepositorRewards(targetMonth, 'ADMIN');
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Không thể phát quà Top Nạp.',
      }, { status: 400 });
    }

    return NextResponse.json({
      ...result,
      message: `Đã tổng kết và phát quà thành công cho ${result.distributedCount} tài khoản đạt mốc Top Nạp tháng ${result.month}.`,
    });
  } catch (err: any) {
    console.error('[API /api/admin/top-depositors/distribute-rewards error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi phát thưởng Top Nạp.' },
      { status: 500 }
    );
  }
}
