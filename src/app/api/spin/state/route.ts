import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { findDbUserByIdOrIdentifier } from '@/lib/db-persistence';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        spinTickets: 0,
        depositSpinProgress: 0,
        affiSpinProgress: 0,
        withdrawableBalance: 0,
        vouchersCount: 0,
      });
    }

    const dbUser = await findDbUserByIdOrIdentifier(sessionUser.id);
    const localState = serverStore.getUserSpinState(sessionUser.id);

    const spinTickets = Math.max(Number(dbUser?.spinTickets || 0), Number(localState?.spinTickets || 0));
    const depositSpinProgress = Number(dbUser?.depositSpinProgress ?? localState?.depositSpinProgress ?? 0);
    const affiSpinProgress = Number(dbUser?.affiSpinProgress ?? localState?.affiSpinProgress ?? 0);
    const withdrawableBalance = Number(
      dbUser?.affiliateBalance ?? dbUser?.withdrawableBalance ?? localState?.withdrawableBalance ?? 0
    );
    const freeWithdrawalBalance = Number(dbUser?.freeWithdrawalBalance ?? localState?.freeWithdrawalBalance ?? 0);
    const vouchers = (dbUser?.vouchers?.length ? dbUser.vouchers : localState?.vouchers) || [];

    return NextResponse.json({
      success: true,
      authenticated: true,
      spinTickets,
      depositSpinProgress,
      depositNeedForNext: Math.max(0, 100000 - depositSpinProgress),
      affiSpinProgress,
      affiNeedForNext: Math.max(0, 200000 - affiSpinProgress),
      withdrawableBalance,
      freeWithdrawalBalance,
      balance: Number(dbUser?.balance ?? sessionUser.balance ?? 0),
      vouchers,
      vouchersCount: vouchers.filter((v: any) => !v.isUsed).length,
    });
  } catch (err: any) {
    console.error('[API /api/spin/state error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi lấy trạng thái vòng quay.' },
      { status: 500 }
    );
  }
}
