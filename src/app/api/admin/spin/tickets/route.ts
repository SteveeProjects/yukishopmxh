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

    const body = await req.json();
    const { userId, email, delta, reason } = body;

    let targetUserId = userId;
    if (!targetUserId && email) {
      const user = serverStore.findUserByIdentifier(email);
      if (user) targetUserId = user.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy người dùng.' }, { status: 400 });
    }

    const numDelta = Number(delta);
    if (isNaN(numDelta) || numDelta === 0) {
      return NextResponse.json({ success: false, error: 'Số lượng vé thay đổi không hợp lệ.' }, { status: 400 });
    }

    const adjustResult = serverStore.adminAdjustSpinTickets(targetUserId, numDelta, reason || 'Admin can thiệp');
    if (!adjustResult.success) {
      return NextResponse.json({ success: false, error: adjustResult.error || 'Không thể cập nhật vé quay cho tài khoản.' }, { status: 404 });
    }

    const userName = adjustResult.user?.email || adjustResult.user?.username || targetUserId;
    return NextResponse.json({
      success: true,
      message: `Đã ${numDelta > 0 ? 'cộng' : 'trừ'} ${Math.abs(numDelta)} vé quay cho ${userName}.`,
      spinTickets: adjustResult.spinTickets,
    });
  } catch (err: any) {
    console.error('[API /api/admin/spin/tickets error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi xử lý vé quay.' },
      { status: 500 }
    );
  }
}
