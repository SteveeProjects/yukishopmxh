import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { adjustUserBalance } from '@/lib/wallet-service';
import { findDbUserByIdOrIdentifier } from '@/lib/db-persistence';
import { getSystemSetting, setSystemSetting } from '@/lib/system-settings';
import { queryPostgres } from '@/lib/autoMigrate';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface BalanceAdjustLog {
  id: string;
  userId: string;
  userName: string;
  identifier: string;
  delta: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  createdAt: string;
}

const LOGS_SETTING_KEY = 'admin_balance_adjust_logs';

export async function GET() {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let users = serverStore.loadUsers().map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      telegramId: u.telegramId,
      role: u.role,
      balance: Number(u.balance || 0),
    }));

    try {
      const pgUsers = await queryPostgres(
        `SELECT id, username, full_name, email, phone, telegram_id, role, balance FROM public.profiles ORDER BY created_at DESC LIMIT 200`
      );
      if (pgUsers?.rows?.length) {
        users = pgUsers.rows.map((u: any) => ({
          id: u.id,
          username: u.username || '',
          fullName: u.full_name || u.username || '',
          email: u.email || '',
          phone: u.phone || '',
          telegramId: u.telegram_id || '',
          role: (String(u.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
          balance: Number(u.balance || 0),
        }));
      } else {
        const sb = getSupabaseAdmin();
        if (sb) {
          const { data: sbUsers } = await sb
            .from('profiles')
            .select('id, username, full_name, email, phone, telegram_id, role, balance')
            .limit(200);
          if (sbUsers?.length) {
            users = sbUsers.map((u: any) => ({
              id: u.id,
              username: u.username || '',
              fullName: u.full_name || u.username || '',
              email: u.email || '',
              phone: u.phone || '',
              telegramId: u.telegram_id || '',
              role: (String(u.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
              balance: Number(u.balance || 0),
            }));
          }
        }
      }
    } catch {}

    const topups = serverStore.loadTopups().slice(0, 50);
    const logs = await getSystemSetting<BalanceAdjustLog[]>(LOGS_SETTING_KEY, []);

    return NextResponse.json({
      success: true,
      users,
      topups,
      logs: Array.isArray(logs) ? logs : [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi tải dữ liệu ví.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const identifier = String(body.identifier || body.userId || '').trim();
    const delta = Number(body.delta || 0);
    const reason = String(body.reason || 'Admin điều chỉnh số dư ví').trim();

    if (!identifier) {
      return NextResponse.json({ error: 'Vui lòng nhập Email, SĐT, Telegram ID hoặc User ID.' }, { status: 400 });
    }
    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ error: 'Số tiền điều chỉnh phải khác 0.' }, { status: 400 });
    }

    const user = await findDbUserByIdOrIdentifier(identifier);
    if (!user) {
      return NextResponse.json({ error: `Không tìm thấy người dùng "${identifier}".` }, { status: 404 });
    }

    const result = await adjustUserBalance({
      userId: user.id,
      delta,
      type: 'ADMIN_ADJUSTMENT',
      referenceId: `ADJ_${Date.now()}`,
      description: reason,
    });

    const newLog: BalanceAdjustLog = {
      id: `adj_${Date.now()}`,
      userId: user.id,
      userName: user.fullName || user.username || user.email,
      identifier,
      delta,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
      reason,
      createdAt: new Date().toISOString(),
    };

    const existingLogs = await getSystemSetting<BalanceAdjustLog[]>(LOGS_SETTING_KEY, []);
    const nextLogs = [newLog, ...(Array.isArray(existingLogs) ? existingLogs : [])].slice(0, 100);
    await setSystemSetting(LOGS_SETTING_KEY, nextLogs);

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật ví ${newLog.userName}: ${new Intl.NumberFormat('vi-VN').format(result.previousBalance)}đ → ${new Intl.NumberFormat('vi-VN').format(result.newBalance)}đ`,
      log: newLog,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi điều chỉnh số dư.' }, { status: 400 });
  }
}
