import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, ensureDatabaseReady } from '@/lib/autoMigrate';
import { hashPassword } from '@/lib/password-hash';
import { createSessionPayload, getSessionCookieOptions } from '@/lib/session-token';
import { sanitizePlainText } from '@/lib/security-sanitize';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TELEGRAM_ID_REGEX = /^\d{5,15}$/;

export async function POST(req: Request) {
  try {
    await ensureDatabaseReady().catch(() => {});

    const body = await req.json().catch(() => ({}));

    const rawEmail = sanitizePlainText(body.email || '', 160).toLowerCase();
    const telegramId = sanitizePlainText(body.telegramId || body.telegram_id || '', 20).replace(/^@/, '');
    const password = String(body.password || '').trim();
    const confirmPassword = String(body.confirmPassword || body.confirm_password || '').trim();
    const fullName = sanitizePlainText(body.fullName || body.full_name || '', 120);
    const phone = sanitizePlainText(body.phone || body.phoneNumber || '', 30);
    const usernameInput = sanitizePlainText(body.username || '', 60).toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');

    // 1. Validate Gmail / Email
    if (!rawEmail) {
      return NextResponse.json(
        { error: 'Vui lòng nhập địa chỉ Gmail cá nhân.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(rawEmail)) {
      return NextResponse.json(
        { error: 'Địa chỉ Gmail không đúng định dạng. Ví dụ: yourname@gmail.com' },
        { status: 400 }
      );
    }

    // 2. Validate Telegram ID
    if (!telegramId) {
      return NextResponse.json(
        { error: 'Vui lòng nhập ID Telegram cá nhân (dãy số, ví dụ 6123456789).' },
        { status: 400 }
      );
    }

    if (!TELEGRAM_ID_REGEX.test(telegramId)) {
      return NextResponse.json(
        {
          error:
            'ID Telegram phải là dãy số gồm 5 đến 15 chữ số (Ví dụ: 6123456789). Lấy ID tại @userinfobot trên Telegram.',
        },
        { status: 400 }
      );
    }

    // 3. Validate Password
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên.' },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Mật khẩu xác nhận không khớp với mật khẩu đã nhập.' },
        { status: 400 }
      );
    }

    const email = rawEmail;
    const username = usernameInput || email.split('@')[0] || `user_${telegramId}`;

    if (email === 'kyomeyuki2k@gmail.com') {
      return NextResponse.json(
        { error: 'Tài khoản Quản Trị Viên đã tồn tại. Vui lòng đăng nhập.' },
        { status: 409 }
      );
    }

    const role = 'user';

    // 4. Check uniqueness in PostgreSQL profiles
    try {
      const pgCheck = await queryPostgres(
        `SELECT email, username, telegram_id FROM public.profiles 
         WHERE LOWER(email) = $1 OR LOWER(username) = $2 OR telegram_id = $3 LIMIT 1`,
        [email, username, telegramId]
      );

      if (pgCheck && pgCheck.rows && pgCheck.rows.length > 0) {
        const found = pgCheck.rows[0];
        if (found.email?.toLowerCase() === email) {
          return NextResponse.json(
            { error: 'Địa chỉ Gmail này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc dùng Gmail khác.' },
            { status: 409 }
          );
        }
        if (found.telegram_id === telegramId) {
          return NextResponse.json(
            { error: 'ID Telegram này đã được liên kết với một tài khoản khác.' },
            { status: 409 }
          );
        }
      }
    } catch (e) {}

    // Check uniqueness in local store
    const existingByEmail = serverStore.findUserByEmail(email);
    if (existingByEmail) {
      return NextResponse.json(
        { error: 'Địa chỉ Gmail này đã được đăng ký trên hệ thống. Vui lòng đăng nhập.' },
        { status: 409 }
      );
    }
    const existingByTele = serverStore.findUserByTelegramId(telegramId);
    if (existingByTele) {
      return NextResponse.json(
        { error: 'ID Telegram này đã được liên kết với một tài khoản khác.' },
        { status: 409 }
      );
    }

    // 5. Check Referrer code
    const refCodeInput = String(body.referralCode || body.refCode || body.ref || '').trim().toUpperCase();
    let referredBy: string | undefined = undefined;

    if (refCodeInput) {
      try {
        const pgRef = await queryPostgres(
          'SELECT id, email, telegram_id FROM public.profiles WHERE referral_code = $1 LIMIT 1',
          [refCodeInput]
        );
        if (pgRef && pgRef.rows && pgRef.rows.length > 0) {
          const r = pgRef.rows[0];
          if (r.email?.toLowerCase() !== email && r.telegram_id !== telegramId) {
            referredBy = r.id;
          }
        }
      } catch (e) {}

      if (!referredBy) {
        const localReferrer = serverStore.findUserByReferralCode(refCodeInput);
        if (localReferrer && localReferrer.email?.toLowerCase() !== email && localReferrer.telegramId !== telegramId) {
          referredBy = localReferrer.id;
        }
      }
    }

    let userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const myReferralCode = 'YUKI' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const passHash = hashPassword(password);

    // 6. Create in Supabase Auth (with email_confirm = true so user can login immediately)
    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin) {
      try {
        const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username,
            full_name: fullName || username,
            telegram_id: telegramId,
          },
        });

        if (authData?.user?.id) {
          userId = authData.user.id;
        } else if (authError && authError.message.includes('already registered')) {
          return NextResponse.json(
            { error: 'Địa chỉ Gmail này đã được đăng ký trong hệ thống xác thực. Vui lòng đăng nhập.' },
            { status: 409 }
          );
        }
      } catch (sbErr) {
        console.warn('[register] Supabase auth notice:', sbErr);
      }
    }

    // 7. Persist directly to PostgreSQL public.profiles
    try {
      await queryPostgres(
        `INSERT INTO public.profiles (
          id, email, username, password_hash, balance, affiliate_balance,
          cashback_points, total_cashback_earned, referral_code, referred_by,
          telegram_id, phone, full_name, role, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 0, 0, 0, 0, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING`,
        [
          userId,
          email,
          username,
          passHash,
          myReferralCode,
          referredBy || null,
          telegramId,
          phone || null,
          fullName || username,
          role,
        ]
      );
    } catch (pgInsertErr) {
      console.warn('[register] Postgres profiles insert notice:', pgInsertErr);
    }

    // 8. Persist to Supabase profiles table
    if (sbAdmin) {
      try {
        await sbAdmin.from('profiles').upsert(
          {
            id: userId,
            email,
            username,
            password_hash: passHash,
            balance: 0,
            affiliate_balance: 0,
            referral_code: myReferralCode,
            referred_by: referredBy && referredBy.includes('-') ? referredBy : null,
            telegram_id: telegramId,
            phone: phone || null,
            full_name: fullName || username,
            role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );
      } catch (sbProfErr) {
        console.warn('[register] Supabase profiles upsert notice:', sbProfErr);
      }
    }

    // 9. Save to serverStore local memory (hashed password only)
    const newUser = serverStore.createUser({
      id: userId,
      username,
      password: passHash,
      fullName: fullName || username,
      telegramId,
      phone: phone || '',
      email,
      role: role as 'admin' | 'user',
      balance: 0,
      referralCode: myReferralCode,
      referredBy: referredBy,
      referralEarnings: 0,
    });

    const sessionData = {
      id: userId,
      email: newUser.email,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      telegramId: newUser.telegramId,
      phone: newUser.phone || '',
      balance: 0,
      referralCode: newUser.referralCode,
      referredBy: newUser.referredBy,
    };

    const cookiePayload = createSessionPayload({
      ...newUser,
      id: userId,
    });

    const res = NextResponse.json({
      success: true,
      user: sessionData,
      message: 'Đăng ký tài khoản YUKISHOPMXH thành công!',
    });

    res.cookies.set(
      'yuki_session',
      encodeURIComponent(JSON.stringify(cookiePayload)),
      getSessionCookieOptions(req)
    );

    return res;
  } catch (error: any) {
    console.error('[register] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo tài khoản: ' + (error?.message || 'Lỗi server.') },
      { status: 500 }
    );
  }
}
