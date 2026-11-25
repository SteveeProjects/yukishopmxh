import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { adjustUserBalance } from '@/lib/wallet-service';
import { userMutex } from '@/lib/mutex';
import { findDbUserByIdOrIdentifier, updateDbUserFields } from '@/lib/db-persistence';
import { queryPostgres } from '@/lib/autoMigrate';
import { getSiteSettings } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để đổi điểm thưởng.' }, { status: 401 });
    }

    return await userMutex.runExclusive(sessionUser.id, async () => {
      const dbUser = (await findDbUserByIdOrIdentifier(sessionUser.id)) || sessionUser;
      const siteCfg = await getSiteSettings().catch(() => null);
      const localCfg = serverStore.getSystemConfig();
      const minRedeem = Math.max(1000, Number(siteCfg?.cashback_min_redeem ?? localCfg.cashback_min_redeem ?? 5000));
      const currentPoints = Math.max(0, Math.round(Number(dbUser.cashbackPoints || 0)));

      const body = await req.json().catch(() => ({}));
      const requested = body.amount !== undefined ? Math.floor(Number(body.amount)) : currentPoints;
      const redeemAmount = Number.isFinite(requested) && requested > 0 ? requested : currentPoints;

      if (!Number.isInteger(redeemAmount) || redeemAmount <= 0) {
        return NextResponse.json(
          { error: 'Số điểm đổi phải là số nguyên dương hợp lệ.' },
          { status: 400 }
        );
      }

      if (currentPoints < minRedeem) {
        return NextResponse.json(
          {
            error: `Bạn cần tối thiểu ${new Intl.NumberFormat('vi-VN').format(minRedeem)} điểm để quy đổi sang ví (Hiện có: ${new Intl.NumberFormat('vi-VN').format(currentPoints)}đ).`,
          },
          { status: 400 }
        );
      }

      if (redeemAmount < minRedeem || redeemAmount > currentPoints) {
        return NextResponse.json(
          { error: 'Số điểm muốn đổi không hợp lệ hoặc vượt quá số dư hiện có.' },
          { status: 400 }
        );
      }

      // Atomic DB deduction first when PostgreSQL is configured
      let remainingPoints = currentPoints - redeemAmount;
      try {
        const pgDeduct = await queryPostgres(
          `UPDATE public.profiles
           SET cashback_points = COALESCE(cashback_points, 0) - $1, updated_at = NOW()
           WHERE id::text = $2 AND COALESCE(cashback_points, 0) >= $1
           RETURNING cashback_points`,
          [redeemAmount, dbUser.id]
        );
        if (pgDeduct) {
          if (!pgDeduct.rows || pgDeduct.rows.length === 0) {
            return NextResponse.json(
              { error: 'Số điểm khả dụng không đủ hoặc đã được quy đổi ở phiên khác.' },
              { status: 400 }
            );
          }
          remainingPoints = Number(pgDeduct.rows[0].cashback_points || 0);
        }
      } catch {}

      serverStore.adjustCashbackPoints(dbUser.id, -redeemAmount, 0);
      await updateDbUserFields(dbUser.id, { cashback_points: remainingPoints }).catch(() => {});

      try {
        const refCode = `CB_${Date.now()}`;
        const balResult = await adjustUserBalance({
          userId: dbUser.id,
          delta: redeemAmount,
          type: 'CASHBACK_REDEEM',
          referenceId: refCode,
          description: `Quy đổi ${new Intl.NumberFormat('vi-VN').format(redeemAmount)} điểm hoàn tiền 2% vào Ví mua hàng`,
        });

        return NextResponse.json({
          success: true,
          redeemed: redeemAmount,
          cashbackPoints: remainingPoints,
          balance: balResult.newBalance,
          message: `Đã quy đổi +${new Intl.NumberFormat('vi-VN').format(redeemAmount)}đ vào Ví mua hàng.`,
        });
      } catch (balErr: any) {
        // Rollback points on error
        serverStore.adjustCashbackPoints(dbUser.id, redeemAmount, 0);
        await queryPostgres(
          `UPDATE public.profiles SET cashback_points = COALESCE(cashback_points, 0) + $1, updated_at = NOW() WHERE id::text = $2`,
          [redeemAmount, dbUser.id]
        ).catch(() => {});
        throw balErr;
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi quy đổi điểm hoàn tiền.' }, { status: 500 });
  }
}
