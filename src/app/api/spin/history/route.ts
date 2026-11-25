import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const logs = serverStore.getRecentSpinLogs(20);
    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    console.error('[API /api/spin/history error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi lấy lịch sử vòng quay.' },
      { status: 500 }
    );
  }
}
