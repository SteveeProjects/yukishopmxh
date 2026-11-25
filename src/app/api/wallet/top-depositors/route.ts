import { NextRequest, NextResponse } from 'next/server';
import { serverStore, getVietnamMonth } from '@/lib/server-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, ensureDatabaseReady } from '@/lib/autoMigrate';

export const dynamic = 'force-dynamic';

function maskName(raw: string): string {
  const s = String(raw || '').trim();
  if (!s || s === 'anonymous') return 'Thành viên';
  if (s.includes('@')) {
    const [prefix, domain] = s.split('@');
    return `${prefix.slice(0, Math.min(3, prefix.length))}***@${domain}`;
  }
  if (/^\d+$/.test(s)) return `ID ***${s.slice(-4)}`;
  if (s.length > 4) return `${s.slice(0, 3)}***${s.slice(-2)}`;
  return `${s.slice(0, 2)}***`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetMonth = searchParams.get('month') || getVietnamMonth();

    const localTop = serverStore.getTopDepositors(10, targetMonth);

    // Also aggregate real approved topups from Supabase if configured
    const depositMap = new Map<string, number>();
    for (const item of localTop) {
      depositMap.set(item.userId, item.totalDeposit);
    }

    // Query from PostgreSQL deposit_requests directly
    try {
      await ensureDatabaseReady().catch(() => {});
      const pgRes = await queryPostgres(
        `SELECT user_id, amount, created_at FROM public.deposit_requests WHERE status IN ('approved', 'completed')`
      );
      if (pgRes?.rows) {
        for (const r of pgRes.rows) {
          if (r.user_id) {
            if (targetMonth && targetMonth !== 'all') {
              const rMonth = getVietnamMonth(r.created_at);
              if (rMonth !== targetMonth) continue;
            }
            depositMap.set(r.user_id, (depositMap.get(r.user_id) || 0) + (Number(r.amount) || 0));
          }
        }
      }
    } catch {}

    try {
      const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
      if (!isPlaceholder && supabaseAdmin) {
        let query = (supabaseAdmin as any)
          .from('topup_requests')
          .select('user_id, amount, status, created_at')
          .eq('status', 'approved');

        const { data: rows } = await query;

        if (Array.isArray(rows) && rows.length > 0) {
          const dbTotals = new Map<string, number>();
          for (const r of rows) {
            if (r.user_id) {
              if (targetMonth && targetMonth !== 'all') {
                const rMonth = getVietnamMonth(r.created_at);
                if (rMonth !== targetMonth) continue;
              }
              dbTotals.set(r.user_id, (dbTotals.get(r.user_id) || 0) + (Number(r.amount) || 0));
            }
          }
          for (const [uid, amt] of dbTotals.entries()) {
            const existing = depositMap.get(uid) || 0;
            if (amt > existing) depositMap.set(uid, amt);
          }
        }
      }
    } catch {
      // Fallback gracefully to local store
    }

    if (depositMap.size === 0) {
      return NextResponse.json({
        success: true,
        month: targetMonth,
        topDepositors: [],
      });
    }

    const users = serverStore.loadUsers();
    const sorted = Array.from(depositMap.entries())
      .filter(([uid, amt]) => {
        if (amt <= 0) return false;
        const matched = users.find((u) => u.id === uid || u.username === uid || u.email === uid);
        if (matched) {
          if (
            matched.role?.toLowerCase() === 'admin' ||
            matched.email?.toLowerCase() === 'kyomeyuki2k@gmail.com' ||
            matched.id === '00000000-0000-0000-0000-000000000001' ||
            matched.username === 'YukiIsMe2311' ||
            matched.phone === '8960751162' ||
            matched.telegramId === '8960751162'
          ) {
            return false;
          }
        }
        if (
          uid === '00000000-0000-0000-0000-000000000001' ||
          uid === 'admin_kyomeyuki2k' ||
          uid === 'YukiIsMe2311' ||
          uid === '8960751162' ||
          uid === 'kyomeyuki2k@gmail.com'
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([uid, totalDeposit], idx) => {
        const matched = users.find((u) => u.id === uid || u.username === uid);
        const raw = matched?.email || matched?.telegramId || matched?.username || uid;
        let vipTier: 'MEMBER' | 'SILVER' | 'GOLD' | 'DIAMOND' = 'MEMBER';
        let vipBadge = 'MEMBER';
        if (totalDeposit >= 3000000) {
          vipTier = 'DIAMOND';
          vipBadge = 'DIAMOND VIP';
        } else if (totalDeposit >= 1500000) {
          vipTier = 'GOLD';
          vipBadge = 'GOLD VIP';
        } else if (totalDeposit >= 500000) {
          vipTier = 'SILVER';
          vipBadge = 'SILVER VIP';
        }
        const tierInfo = serverStore.evaluateTopDepositorTier(idx + 1, totalDeposit);
        return {
          rank: idx + 1,
          userId: uid,
          maskedName: maskName(raw),
          totalDeposit,
          vipTier,
          vipBadge,
          month: targetMonth,
          tierInfo,
        };
      });

    return NextResponse.json({
      success: true,
      month: targetMonth,
      topDepositors: sorted,
    });
  } catch (error: any) {
    console.error('[top-depositors] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể lấy bảng xếp hạng top nạp: ' + error.message },
      { status: 500 }
    );
  }
}
