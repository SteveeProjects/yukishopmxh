import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { adjustUserBalance } from '@/lib/wallet-service';
import { sendTelegramWithdrawalNotification } from '@/lib/telegram/bot';
import { userMutex } from '@/lib/mutex';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import {
  calculateWithdrawalFee,
  normalizeAccountHolderName,
} from '@/lib/constants/vietnam-banks';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để thao tác hoa hồng.' }, { status: 401 });
    }

    return await userMutex.runExclusive(sessionUser.id, async () => {
      const user = serverStore.findUserById(sessionUser.id);
      if (!user) {
        return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
      }

      const body = await req.json().catch(() => ({}));
      const action = String(body.action || '').trim();
      const availableAff = Math.max(0, Math.round(Number(user.affiliateBalance || 0)));

      // =========================================================================
      // LỰA CHỌN 1: CHUYỂN HOA HỒNG VỀ VÍ MUA HÀNG (MIN 50K - PHÍ 0đ)
      // =========================================================================
      if (action === 'transfer_to_wallet') {
        const requested = body.amount !== undefined ? Math.floor(Number(body.amount)) : availableAff;
        const amount = Number.isFinite(requested) && requested > 0 ? requested : availableAff;

        const MIN_TRANSFER = 50000;
        if (amount < MIN_TRANSFER || !Number.isInteger(amount)) {
          return NextResponse.json(
            { error: `Số tiền chuyển về Ví tối thiểu là ${new Intl.NumberFormat('vi-VN').format(MIN_TRANSFER)}đ (Số nguyên dương).` },
            { status: 400 }
          );
        }

        if (amount > availableAff) {
          return NextResponse.json(
            { error: 'Số tiền chuyển vượt quá số dư hoa hồng khả dụng hiện có.' },
            { status: 400 }
          );
        }

        // Deduct affiliate balance first atomically
        const nextAffBalance = serverStore.adjustAffiliateBalance(user.id, -amount, 0);

        try {
          await queryPostgres(
            `UPDATE public.profiles SET affiliate_balance = $1, updated_at = NOW() WHERE id = $2`,
            [nextAffBalance, user.id]
          );
        } catch {}

        try {
          const balRes = await adjustUserBalance({
            userId: user.id,
            delta: amount,
            type: 'AFFILIATE_TRANSFER',
            referenceId: `AFF_WAL_${Date.now()}`,
            description: `Chuyển +${new Intl.NumberFormat('vi-VN').format(amount)}đ hoa hồng CTV sang Ví mua hàng (Miễn phí)`,
          });

          return NextResponse.json({
            success: true,
            transferred: amount,
            affiliateBalance: nextAffBalance,
            balance: balRes.newBalance,
            message: `Đã chuyển +${new Intl.NumberFormat('vi-VN').format(amount)}đ vào Ví mua hàng thành công (Phí 0đ)!`,
          });
        } catch (err: any) {
          // Rollback affiliate balance if wallet balance adjustment fails
          serverStore.adjustAffiliateBalance(user.id, amount, 0);
          throw err;
        }
      }

      // =========================================================================
      // LỰA CHỌN 2: RÚT TIỀN MẶT VỀ NGÂN HÀNG / VÍ ĐIỆN TỬ (MIN 100K - PHÍ 2K / 5K)
      // =========================================================================
      if (action === 'withdraw_telegram') {
        const amount = Math.floor(Number(body.amount || availableAff));
        const bankCode = String(body.bankCode || '').trim().toUpperCase();
        const bankName = String(body.bankName || '').trim();
        const bankAccount = String(body.bankAccount || '').trim();
        const rawHolder = String(body.accountHolder || '').trim();
        const accountHolder = normalizeAccountHolderName(rawHolder);
        const contact = String(body.contact || user.phone || user.telegramId || '').trim();
        const qrCodeUrl = String(body.qrCodeUrl || '').trim();

        const MIN_WITHDRAW = 100000;
        if (!Number.isFinite(amount) || amount < MIN_WITHDRAW || !Number.isInteger(amount)) {
          return NextResponse.json(
            { error: `Số tiền rút tối thiểu về Ngân hàng / Ví điện tử là ${new Intl.NumberFormat('vi-VN').format(MIN_WITHDRAW)}đ (Số nguyên dương).` },
            { status: 400 }
          );
        }

        if (amount > availableAff) {
          return NextResponse.json(
            { error: 'Số tiền rút vượt quá số dư hoa hồng hiện có.' },
            { status: 400 }
          );
        }

        if (!bankName || !bankAccount || !accountHolder) {
          return NextResponse.json(
            { error: 'Vui lòng điền đầy đủ Tên ngân hàng, Số tài khoản và Tên chủ tài khoản (Chữ in hoa không dấu).' },
            { status: 400 }
          );
        }

        // Calculate standard fee: 5.000đ for MoMo/ZaloPay/QR-mandatory, 2.000đ for standard bank
        const rawFee = calculateWithdrawalFee(bankCode, Boolean(qrCodeUrl));

        // Free withdrawal check from Lucky Spin cash rewards
        const currentFreeBal = Math.max(0, Number(user.freeWithdrawalBalance || 0));
        let fee = rawFee;
        let freeUsed = 0;

        if (currentFreeBal >= amount) {
          fee = 0; // 100% free of charge!
          freeUsed = amount;
        } else if (currentFreeBal > 0) {
          fee = 0; // Free withdrawal privilege applied
          freeUsed = currentFreeBal;
        }

        const netAmount = amount - fee;

        if (netAmount <= 0) {
          return NextResponse.json(
            { error: 'Số tiền thực nhận sau khi trừ phí phải lớn hơn 0đ.' },
            { status: 400 }
          );
        }

        // Deduct affiliate balance atomically
        const nextAffBalance = serverStore.adjustAffiliateBalance(user.id, -amount, 0);

        // Deduct freeWithdrawalBalance if used
        if (freeUsed > 0) {
          const users = serverStore.loadUsers();
          const uTarget = users.find((u) => u.id === user.id);
          if (uTarget) {
            uTarget.freeWithdrawalBalance = Math.max(0, Number(uTarget.freeWithdrawalBalance || 0) - freeUsed);
            serverStore.saveUsers(users);
          }
        }

        // Auto-generate VietQR URL if user didn't upload image QR, so Admin gets a scannable QR photo
        let finalQrCodeUrl = qrCodeUrl;
        if (!finalQrCodeUrl && bankAccount) {
          const cleanBankCode = encodeURIComponent((bankCode || bankName || 'VIETINBANK').trim().replace(/[\s/\\()]+/g, ''));
          const cleanStk = encodeURIComponent(bankAccount.replace(/\s+/g, ''));
          const encodedName = encodeURIComponent(accountHolder.trim().toUpperCase());
          const memo = encodeURIComponent(`RUT ${amount}D`);
          finalQrCodeUrl = `https://api.vietqr.io/image/${cleanBankCode}-${cleanStk}-compact2.png?amount=${netAmount}&addInfo=${memo}&accountName=${encodedName}`;
        }

        // Create withdrawal record
        const record = serverStore.createAffiliateWithdrawal({
          userId: user.id,
          username: user.username || user.fullName,
          amount,
          fee,
          netAmount,
          bankName,
          bankAccount,
          accountHolder,
          contact,
          qrCodeUrl: finalQrCodeUrl,
        });

        // Record into PostgreSQL affiliate_withdrawals & deduct affiliate_balance
        try {
          await queryPostgres(
            `INSERT INTO public.affiliate_withdrawals (id, user_id, user_email, amount, bank_name, account_number, account_name, qr_url, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            [record.id, user.id, user.email || '', netAmount, bankName, bankAccount, accountHolder, finalQrCodeUrl]
          );
          await queryPostgres(
            `UPDATE public.profiles SET affiliate_balance = $1, updated_at = NOW() WHERE id = $2`,
            [nextAffBalance, user.id]
          );
        } catch (pgErr) {
          console.warn('[affiliate/action] Postgres record withdrawal notice:', pgErr);
        }

        // Send Admin notification with QR photo support and inline action buttons
        await sendTelegramWithdrawalNotification({
          withdrawalId: record.id,
          userId: user.id,
          userName: user.username || user.fullName,
          amount,
          fee,
          netAmount,
          bankName,
          bankAccount,
          accountHolder,
          contact,
          qrCodeUrl: finalQrCodeUrl,
        }).catch((tgErr) => {
          console.warn('[affiliate-action] Telegram notification error:', tgErr);
        });

        return NextResponse.json({
          success: true,
          withdrawal: record,
          affiliateBalance: nextAffBalance,
          fee,
          netAmount,
          message: `Yêu cầu rút ${new Intl.NumberFormat('vi-VN').format(amount)}đ (Thực nhận: ${new Intl.NumberFormat('vi-VN').format(netAmount)}đ) đã được gửi tới Admin xử lý!`,
        });
      }

      return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xử lý Affiliate.' }, { status: 500 });
  }
}
