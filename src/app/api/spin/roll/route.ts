import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { userMutex } from '@/lib/mutex';
import { findDbUserByIdOrIdentifier, updateDbUserFields } from '@/lib/db-persistence';
import { queryPostgres } from '@/lib/autoMigrate';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để tham gia Vòng Quay May Mắn.' },
        { status: 401 }
      );
    }

    const rollResult = await userMutex.runExclusive(sessionUser.id, async () => {
      const dbUser = (await findDbUserByIdOrIdentifier(sessionUser.id)) || sessionUser;

      // Sync exact DB truth into warm cache (never Math.max stale cache!)
      const users = serverStore.loadUsers();
      const idx = users.findIndex((u) => u.id === sessionUser.id);
      if (idx >= 0) {
        users[idx].spinTickets = Number(dbUser.spinTickets || 0);
        users[idx].balance = Number(dbUser.balance || 0);
        users[idx].affiliateBalance = Number(dbUser.affiliateBalance || 0);
        users[idx].freeWithdrawalBalance = Number(dbUser.freeWithdrawalBalance || 0);
        serverStore.saveUsers(users);
      }

      // Atomic ticket decrement in PostgreSQL if connected
      try {
        const pgTick = await queryPostgres(
          `UPDATE public.profiles
           SET spin_tickets = COALESCE(spin_tickets, 0) - 1, updated_at = NOW()
           WHERE id = $1 AND COALESCE(spin_tickets, 0) >= 1
           RETURNING spin_tickets`,
          [sessionUser.id]
        );
        if (pgTick && (!pgTick.rows || pgTick.rows.length === 0)) {
          throw new Error('Bạn không còn vé quay may mắn nào.');
        }
      } catch (e: any) {
        if (String(e?.message || '').includes('vé quay')) throw e;
      }

      const result = serverStore.rollSpin(sessionUser.id);
      if (result.success) {
        const updatedUser = serverStore.findUserById(sessionUser.id);
        if (updatedUser) {
          await updateDbUserFields(sessionUser.id, {
            spin_tickets: updatedUser.spinTickets,
            balance: updatedUser.balance,
            affiliate_balance: updatedUser.affiliateBalance,
            withdrawable_balance: updatedUser.withdrawableBalance,
            free_withdrawal_balance: updatedUser.freeWithdrawalBalance,
            vouchers: updatedUser.vouchers,
          }).catch(() => {});
        }
      }
      return result;
    });

    return NextResponse.json(rollResult);
  } catch (err: any) {
    console.error('[API /api/spin/roll error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi thực hiện vòng quay.' },
      { status: 400 }
    );
  }
}
