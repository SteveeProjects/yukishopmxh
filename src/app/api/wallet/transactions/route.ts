import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/session-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const currentUser = await getSessionUser();

    if (!currentUser?.id) {
      return NextResponse.json({ success: true, transactions: [] });
    }

    const txs: any[] = [];

    // 0. Check local immutable Wallet Audit Ledger first
    const localLedger = serverStore.getWalletLedgerForUser(currentUser.id, 100);
    for (const entry of localLedger) {
      txs.push({
        id: entry.id,
        type: entry.type,
        amount: Math.abs(Number(entry.delta || 0)),
        delta: Number(entry.delta || 0),
        balanceBefore: Number(entry.balanceBefore || 0),
        balanceAfter: Number(entry.balanceAfter || 0),
        ref: entry.referenceId || '-',
        description: entry.description || 'Giao dịch ví',
        created_at: entry.createdAt,
      });
    }

    // 1. Fetch from Supabase wallet_transactions (if local ledger empty)
    if (txs.length === 0) {
      try {
        const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
        if (!isPlaceholder && supabaseAdmin && currentUser.id.includes('-')) {
          const { data: dbTxs } = await supabaseAdmin
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (dbTxs && dbTxs.length > 0) {
            for (const tx of dbTxs) {
              txs.push({
                id: tx.id,
                type: tx.type,
                amount: Number(tx.amount || 0),
                delta: tx.type === 'PURCHASE' || tx.type === 'ORDER_PAYMENT' ? -Number(tx.amount || 0) : Number(tx.amount || 0),
                balanceBefore: Number(tx.balance_before || 0),
                balanceAfter: Number(tx.balance_after || 0),
                ref: tx.reference_id || '-',
                description: tx.description || 'Giao dịch ví',
                created_at: tx.created_at,
              });
            }
          }
        }
      } catch (e) {
        console.warn('[wallet/transactions] Supabase fetch notice:', e);
      }
    }

    // 2. Fallback / Merge with local orders & topups
    if (txs.length === 0) {
      const allOrders = serverStore.loadOrders();
      const userOrders = allOrders.filter(
        (o) => o.user_id === currentUser.id || o.user_id === currentUser.username
      );
      for (const ord of userOrders) {
        txs.push({
          id: ord.id || ord.order_code,
          type: ord.service_type === 'DEPOSIT' ? 'TOPUP' : 'PURCHASE',
          amount: Number(ord.total_amount || 0),
          balanceBefore: Number(ord.balance_before ?? 0),
          balanceAfter: Number(ord.balance_after ?? 0),
          ref: ord.order_code,
          description: ord.item_name,
          created_at: ord.created_at,
        });
      }

      const allTopups = serverStore.loadTopups();
      const userTopups = allTopups.filter(
        (t) => t.user_id === currentUser.id || t.user_id === currentUser.username
      );
      for (const tp of userTopups) {
        if (!txs.some((t) => t.ref === tp.code)) {
          txs.push({
            id: tp.id || tp.code,
            type: 'TOPUP',
            amount: Number(tp.amount || 0),
            balanceBefore: Number(tp.balance_before ?? 0),
            balanceAfter: Number(tp.balance_after ?? 0),
            ref: tp.code,
            description: `Nạp tiền qua ZaloPay QR (${tp.status})`,
            created_at: tp.created_at,
          });
        }
      }

      // Sort descending by created_at
      txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Infer balances backwards if historical records have 0
      const localU = serverStore.findUserById(currentUser.id) || serverStore.findUserByIdentifier(currentUser.email || '');
      let runningBalance = localU?.balance ?? 0;

      for (let i = 0; i < txs.length; i++) {
        const item = txs[i];
        if (item.balanceAfter === 0 && item.balanceBefore === 0) {
          const isCredit = item.type === 'TOPUP' || item.type === 'DEPOSIT';
          item.balanceAfter = runningBalance;
          item.balanceBefore = isCredit ? Math.max(0, runningBalance - item.amount) : runningBalance + item.amount;
          runningBalance = item.balanceBefore;
        } else {
          runningBalance = item.balanceBefore;
        }
      }
    }

    return NextResponse.json({ success: true, transactions: txs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
