// ==============================================================================
// YUKISHOPMXH — CENTRALIZED WALLET SERVICE (ATOMIC BALANCE & IMMUTABLE LEDGER)
// ==============================================================================

import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { serverStore } from '@/lib/server-store';
import { userMutex } from '@/lib/mutex';
import { queryPostgres, isPostgresConfigured } from '@/lib/autoMigrate';
import { isUuid } from '@/lib/supabase/env';

export interface BalanceAdjustmentParams {
  userId: string;
  delta: number;
  type:
    | 'DEPOSIT'
    | 'PURCHASE'
    | 'REFUND'
    | 'ADMIN_ADJUSTMENT'
    | 'ORDER_PAYMENT'
    | 'CASHBACK_REDEEM'
    | 'AFFILIATE_TRANSFER';
  referenceId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export async function getUserBalance(userId: string): Promise<number> {
  if (!userId) return 0;

  // 1. Direct PostgreSQL query (Primary source of truth)
  try {
    const pgRes = await queryPostgres(
      `SELECT balance FROM public.profiles WHERE id::text = $1 OR LOWER(COALESCE(email, '')) = LOWER($1) LIMIT 1`,
      [userId]
    );
    if (pgRes?.rows && pgRes.rows.length > 0 && pgRes.rows[0].balance !== null) {
      return Math.max(0, Number(pgRes.rows[0].balance));
    }
  } catch (pgErr) {
    console.warn('[wallet-service] Postgres getUserBalance notice:', pgErr);
  }

  // 2. Check Supabase profiles / wallet_accounts if configured
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      // Query profiles by UUID or email fallback
      const { data: profile } = isUuid(userId)
        ? await supabaseAdmin.from('profiles').select('balance').eq('id', userId).maybeSingle()
        : await supabaseAdmin.from('profiles').select('balance').ilike('email', userId).maybeSingle();

      if (profile && profile.balance !== null && profile.balance !== undefined) {
        return Math.max(0, Number(profile.balance));
      }

      if (isUuid(userId)) {
        const { data: walletAccount } = await (supabaseAdmin as any)
          .from('wallet_accounts')
          .select('balance')
          .eq('user_id', userId)
          .maybeSingle();

        if (walletAccount && walletAccount.balance !== null && walletAccount.balance !== undefined) {
          return Math.max(0, Number(walletAccount.balance));
        }

        const { data: wallet } = await (supabaseAdmin as any)
          .from('wallets')
          .select('available_balance, balance')
          .eq('user_id', userId)
          .maybeSingle();

        if (wallet) {
          const bal = wallet.available_balance !== undefined ? wallet.available_balance : wallet.balance;
          if (bal !== null && bal !== undefined) {
            return Math.max(0, Number(bal));
          }
        }
      }
    }
  } catch (err) {
    console.warn('[wallet-service] Supabase getUserBalance notice:', err);
  }

  // 3. Fallback to local serverStore
  const localUser = serverStore.findUserById(userId);
  const localBal = localUser?.balance !== undefined ? Number(localUser.balance) : null;
  return localBal !== null ? Math.max(0, localBal) : 0;
}

export async function adjustUserBalance(params: BalanceAdjustmentParams): Promise<{
  success: boolean;
  newBalance: number;
  previousBalance: number;
}> {
  const { userId, delta, type, referenceId, description, metadata = {} } = params;

  if (!userId) {
    throw new Error('Thiếu thông tin người dùng (userId) để điều chỉnh số dư.');
  }

  if (typeof delta !== 'number' || Number.isNaN(delta) || !Number.isFinite(delta)) {
    throw new Error('Số tiền biến động (delta) không hợp lệ.');
  }

  return userMutex.runExclusive(userId, async () => {
    const currentBalance = await getUserBalance(userId);

    if (delta < 0 && currentBalance + delta < 0) {
      throw new Error(
        `Số dư ví không đủ để thực hiện giao dịch (Hiện có: ${new Intl.NumberFormat('vi-VN').format(
          currentBalance
        )} đ, Cần: ${new Intl.NumberFormat('vi-VN').format(Math.abs(delta))} đ). Vui lòng nạp thêm tiền!`
      );
    }

    let newBalance = Math.max(0, currentBalance + delta);
    const refCode = referenceId || `TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowISO = new Date().toISOString();

    let pgHandled = false;
    // 1. Atomic PostgreSQL balance update with constraint protection against race conditions
    if (isPostgresConfigured()) {
      try {
        const pgRes = await queryPostgres(
          `UPDATE public.profiles
           SET balance = balance + $1, updated_at = NOW()
           WHERE (id::text = $2 OR LOWER(COALESCE(email, '')) = LOWER($2)) AND (balance + $1) >= 0
           RETURNING balance`,
          [delta, userId]
        );
        if (pgRes?.rows && pgRes.rows.length > 0) {
          pgHandled = true;
          newBalance = Number(pgRes.rows[0].balance);
        } else if (pgRes && delta < 0) {
          throw new Error('Số dư ví không đủ hoặc tài khoản không tồn tại.');
        }

        if (pgHandled) {
          await queryPostgres(
            `INSERT INTO public.wallet_transactions
              (id, user_id, type, amount, delta, balance_before, balance_after, reference_id, description, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              crypto.randomUUID(),
              userId,
              type,
              Math.abs(delta),
              delta,
              currentBalance,
              newBalance,
              refCode,
              description || `Giao dịch ${type}`,
            ]
          ).catch(() => {});
        }
      } catch (pgErr: any) {
        if (pgErr.message?.includes('Số dư ví không đủ')) {
          throw pgErr;
        }
        console.warn('[wallet-service] Postgres atomic balance notice:', pgErr);
      }
    }

    // 2. Update local store + immutable Wallet Audit Ledger
    serverStore.updateUserBalance(userId, delta);
    serverStore.appendWalletLedger({
      userId,
      type,
      delta,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      referenceId: refCode,
      description: description || `Giao dịch ${type}`,
      createdAt: nowISO,
    });

    // Tự động tích lũy & cấp vé quay may mắn khi nạp tiền (cứ mỗi 100.000đ = +1 Vé Quay)
    if (type === 'DEPOSIT' && delta > 0) {
      try {
        const spinRes = serverStore.creditSpinTicketsForDeposit(userId, delta);
        await queryPostgres(
          `UPDATE public.profiles
           SET spin_tickets = COALESCE(spin_tickets, 0) + $1,
               deposit_spin_progress = $2,
               total_deposited = COALESCE(total_deposited, 0) + $3,
               updated_at = NOW()
           WHERE id::text = $4 OR LOWER(COALESCE(email, '')) = LOWER($4)`,
          [spinRes.newTickets, spinRes.progress, delta, userId]
        ).catch(() => {});
      } catch (spErr) {
        console.warn('[wallet-service] Spin ticket credit notice:', spErr);
      }
    }

    // 3. Update Supabase synchronously if configured (safe for Supabase-only deployments!)
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const profQuery = isUuid(userId)
          ? supabaseAdmin.from('profiles').update({ balance: newBalance, updated_at: nowISO }).eq('id', userId)
          : supabaseAdmin.from('profiles').update({ balance: newBalance, updated_at: nowISO }).ilike('email', userId);
        const { error: sbProfErr } = await profQuery;
        if (sbProfErr && !pgHandled && delta < 0) {
          throw new Error('Không thể cập nhật số dư ví trên Supabase: ' + sbProfErr.message);
        }

        if (isUuid(userId)) {
          try {
            await (supabaseAdmin as any)
              .from('wallet_accounts')
              .update({ balance: newBalance, updated_at: nowISO })
              .eq('user_id', userId);
          } catch {}

          try {
            await (supabaseAdmin as any)
              .from('wallets')
              .update({ available_balance: newBalance, balance: newBalance, updated_at: nowISO })
              .eq('user_id', userId);
          } catch {}
        }

        try {
          await supabaseAdmin.from('wallet_transactions').insert({
            user_id: userId,
            type: type === 'PURCHASE' ? 'PURCHASE' : type,
            amount: Math.abs(delta),
            balance_before: currentBalance,
            balance_after: newBalance,
            reference_id: refCode,
            description: description || `Giao dịch ${type}`,
            created_at: nowISO,
          });
        } catch (txErr) {
          console.warn('[wallet-service] wallet_transactions insert notice:', txErr);
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('Không thể cập nhật số dư ví')) {
        throw err;
      }
      console.warn('[wallet-service] Supabase adjustUserBalance notice:', err);
    }

    return {
      success: true,
      newBalance,
      previousBalance: currentBalance,
    };
  });
}
