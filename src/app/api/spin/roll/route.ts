import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { userMutex } from '@/lib/mutex';
import { findDbUserByIdOrIdentifier, updateDbUserFields } from '@/lib/db-persistence';
import { isDatabaseConfigured, queryPostgres } from '@/lib/autoMigrate';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

      // Sync or hydrate user into warm cache from exact DB truth
      const users = serverStore.loadUsers();
      const idx = users.findIndex((u) => u.id === sessionUser.id);
      if (idx >= 0) {
        users[idx].spinTickets = Number(dbUser.spinTickets || 0);
        users[idx].balance = Number(dbUser.balance || 0);
        users[idx].affiliateBalance = Number(dbUser.affiliateBalance || 0);
        users[idx].freeWithdrawalBalance = Number(dbUser.freeWithdrawalBalance || 0);
      } else {
        users.push({ ...dbUser, id: sessionUser.id });
      }
      serverStore.saveUsers(users);

      // Atomic ticket decrement across PostgreSQL or Supabase before rolling
      let ticketClaimedInDb = false;
      try {
        const pgTick = await queryPostgres(
          `UPDATE public.profiles
           SET spin_tickets = COALESCE(spin_tickets, 0) - 1, updated_at = NOW()
           WHERE id::text = $1 AND COALESCE(spin_tickets, 0) >= 1
           RETURNING spin_tickets`,
          [sessionUser.id]
        );
        if (pgTick) {
          if (!pgTick.rows || pgTick.rows.length === 0) {
            throw new Error('Bạn không còn vé quay may mắn nào.');
          }
          ticketClaimedInDb = true;
        }
      } catch (e: any) {
        if (String(e?.message || '').includes('vé quay')) throw e;
      }

      if (!ticketClaimedInDb && isDatabaseConfigured()) {
        const sbAdmin = getSupabaseAdmin();
        if (sbAdmin && isUuid(sessionUser.id)) {
          const curTickets = Math.max(0, Number(dbUser.spinTickets || 0));
          if (curTickets < 1) {
            throw new Error('Bạn không còn vé quay may mắn nào.');
          }
          const { data: sbClaimed, error: sbTickErr } = await sbAdmin
            .from('profiles')
            .update({ spin_tickets: curTickets - 1, updated_at: new Date().toISOString() })
            .eq('id', sessionUser.id)
            .eq('spin_tickets', curTickets)
            .gte('spin_tickets', 1)
            .select('spin_tickets')
            .maybeSingle();
          if (sbTickErr || !sbClaimed) {
            throw new Error('Bạn không còn vé quay may mắn nào hoặc phiên vừa thay đổi.');
          }
          ticketClaimedInDb = true;
        }
      }

      const result = serverStore.rollSpin(sessionUser.id);
      if (result.success) {
        const updatedUser = serverStore.findUserById(sessionUser.id);
        if (updatedUser) {
          const saved = await updateDbUserFields(sessionUser.id, {
            spin_tickets: updatedUser.spinTickets,
            balance: updatedUser.balance,
            affiliate_balance: updatedUser.affiliateBalance,
            withdrawable_balance: updatedUser.withdrawableBalance,
            free_withdrawal_balance: updatedUser.freeWithdrawalBalance,
            vouchers: updatedUser.vouchers,
          });
          if (isDatabaseConfigured() && !saved) {
            throw new Error('Không thể lưu kết quả vòng quay vào Database.');
          }
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
