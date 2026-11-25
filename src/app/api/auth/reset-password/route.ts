import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import { hashPassword } from '@/lib/password-hash';
import {
  findPasswordResetTokenDb,
  markPasswordResetTokenUsedDb,
  updateDbUserFields,
} from '@/lib/db-persistence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isShortUnverifiedOtpToken(token: string, tokenType?: string, verifiedTelegram?: boolean): boolean {
  if (verifiedTelegram) return false;
  return token.toUpperCase().startsWith('YK-') || tokenType === 'SHORT_OTP' || token.length < 24;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = String(searchParams.get('token') || '').trim();

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Thiếu mã token xác thực.' }, { status: 400 });
    }

    await ensureDatabaseReady().catch(() => {});
    const record = await findPasswordResetTokenDb(token);

    if (!record) {
      return NextResponse.json(
        { valid: false, error: 'Mã khôi phục không hợp lệ hoặc đã hết hạn.' },
        { status: 400 }
      );
    }

    if (isShortUnverifiedOtpToken(record.token, record.tokenType, record.verifiedTelegram)) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Mã YK-XXXXXX chỉ dùng để xác minh qua Bot Telegram OTP (@ForgetPassYuki_bot /doimk), không dùng trực tiếp trên web.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      email: record.email,
      message: 'Token hợp lệ.',
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message || 'Lỗi kiểm tra token.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const newPassword = String(body.newPassword || body.password || '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Thiếu mã token xác thực.' }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' }, { status: 400 });
    }

    await ensureDatabaseReady().catch(() => {});

    const record = await findPasswordResetTokenDb(token);
    if (!record || record.used || Date.now() > record.expiresAt) {
      return NextResponse.json(
        { error: 'Token không hợp lệ hoặc đã hết hạn.' },
        { status: 400 }
      );
    }

    // Prevent account takeover: reject short YK-XXXXXX tokens on the web endpoint
    if (isShortUnverifiedOtpToken(record.token, record.tokenType, record.verifiedTelegram)) {
      return NextResponse.json(
        {
          error:
            'Mã xác thực YK-XXXXXX chỉ được phép sử dụng trong cuộc trò chuyện với Bot Telegram OTP (@ForgetPassYuki_bot -> lệnh /doimk) để bảo vệ tài khoản.',
        },
        { status: 403 }
      );
    }

    const targetEmail = record.email;
    const hashed = hashPassword(newPassword);

    await markPasswordResetTokenUsedDb(record.token);

    if (record.userId) {
      await updateDbUserFields(record.userId, { password_hash: hashed });
    }
    try {
      await queryPostgres(
        `UPDATE public.profiles SET password_hash = $1, session_version = COALESCE(session_version, 1) + 1, updated_at = NOW()
         WHERE LOWER(email) = LOWER($2)`,
        [hashed, targetEmail]
      );
    } catch {}

    serverStore.updateUserPassword(targetEmail, hashed);

    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        const { data: userData } = await sbAdmin.auth.admin.listUsers();
        const authUser = userData?.users?.find(
          (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
        );
        if (authUser) {
          await supabaseAdminSafeUpdatePassword(sbAdmin, authUser.id, newPassword);
        }
        await sbAdmin
          .from('profiles')
          .update({ password_hash: hashed, updated_at: new Date().toISOString() })
          .eq('email', targetEmail);
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Đặt lại mật khẩu mới thành công! Vui lòng đăng nhập với mật khẩu mới.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xử lý đặt lại mật khẩu.' }, { status: 500 });
  }
}

async function supabaseAdminSafeUpdatePassword(sbAdmin: any, userId: string, password: string) {
  try {
    await sbAdmin.auth.admin.updateUserById(userId, { password });
  } catch {}
}
