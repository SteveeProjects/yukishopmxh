import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { queryPostgres, ensureDatabaseReady } from '@/lib/autoMigrate';
import { hashPassword } from '@/lib/password-hash';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseReady().catch(() => {});

    const body = await req.json();
    const { fullName, email, phone, telegramId, password, termsAccepted } = body;

    if (!termsAccepted) {
      return NextResponse.json({
        error: 'TERMS_NOT_ACCEPTED',
        message: 'Bạn phải đồng ý với Điều khoản dịch vụ & Chính sách bảo hành để tạo tài khoản.',
      }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({
        error: 'PASSWORD_TOO_SHORT',
        message: 'Mật khẩu phải chứa ít nhất 6 ký tự.',
      }, { status: 400 });
    }

    const cleanFullName = (fullName || '').trim() || 'Thành Viên';
    const cleanPhone = (phone || '').trim();
    const cleanTele = (telegramId || '').trim().replace(/^@/, '');
    let resolvedEmail = (email || '').trim().toLowerCase();

    // If no email provided, create a deterministic proxy email for Supabase Auth
    if (!resolvedEmail) {
      if (cleanPhone) {
        resolvedEmail = `${cleanPhone.replace(/[^0-9a-zA-Z]/g, '')}@yukishopmxh.internal`;
      } else if (cleanTele) {
        resolvedEmail = `tg_${cleanTele.replace(/[^0-9a-zA-Z_]/g, '')}@yukishopmxh.internal`;
      } else {
        return NextResponse.json({
          error: 'IDENTIFIER_REQUIRED',
          message: 'Vui lòng cung cấp ít nhất Email, Số điện thoại hoặc ID Telegram.',
        }, { status: 400 });
      }
    }

    // Check PostgreSQL profiles
    try {
      if (cleanPhone) {
        const pgP = await queryPostgres('SELECT id FROM public.profiles WHERE phone = $1 LIMIT 1', [cleanPhone]);
        if (pgP?.rows?.length > 0) {
          return NextResponse.json({
            error: 'PHONE_EXISTS',
            message: 'Số điện thoại này đã được sử dụng bởi một tài khoản khác.',
          }, { status: 409 });
        }
      }

      if (cleanTele) {
        const pgT = await queryPostgres('SELECT id FROM public.profiles WHERE telegram_id = $1 LIMIT 1', [cleanTele]);
        if (pgT?.rows?.length > 0) {
          return NextResponse.json({
            error: 'TELEGRAM_EXISTS',
            message: 'ID / Username Telegram này đã được sử dụng bởi một tài khoản khác.',
          }, { status: 409 });
        }
      }
    } catch (e) {}

    const supabase = getSupabaseAdmin();
    let createdUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (supabase) {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: resolvedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanFullName,
          phone: cleanPhone || null,
          telegram_id: cleanTele || null,
          terms_accepted_at: new Date().toISOString(),
        },
      });

      if (authData?.user?.id) {
        createdUserId = authData.user.id;
      } else if (authError) {
        // Fallback to client signup
        const anonClient = getSupabaseBrowserClient();
        const { data: publicAuth, error: publicError } = await anonClient.auth.signUp({
          email: resolvedEmail,
          password: password,
          options: {
            data: {
              full_name: cleanFullName,
              phone: cleanPhone || null,
              telegram_id: cleanTele || null,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });

        if (publicError) {
          return NextResponse.json({
            error: publicError.message,
            message: publicError.message.includes('User already registered')
              ? 'Tài khoản hoặc Email này đã tồn tại.'
              : publicError.message,
          }, { status: 400 });
        }

        if (publicAuth?.user?.id) {
          createdUserId = publicAuth.user.id;
        }
      }
    }

    if (resolvedEmail === 'kyomeyuki2k@gmail.com') {
      return NextResponse.json(
        { error: 'Tài khoản Quản Trị Viên đã tồn tại. Vui lòng đăng nhập.' },
        { status: 409 }
      );
    }

    const username = resolvedEmail.split('@')[0] || `user_${cleanTele || Date.now()}`;
    const myReferralCode = 'YUKI' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const role: 'user' = 'user';

    // Direct PostgreSQL persistence
    try {
      await queryPostgres(
        `INSERT INTO public.profiles (
          id, email, username, password_hash, balance, affiliate_balance,
          referral_code, telegram_id, phone, full_name, role, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING`,
        [
          createdUserId,
          resolvedEmail,
          username,
          hashPassword(password),
          myReferralCode,
          cleanTele || null,
          cleanPhone || null,
          cleanFullName,
          role,
        ]
      );
    } catch (pgErr) {
      console.warn('[register-multimodal] Postgres profiles notice:', pgErr);
    }

    // Supabase profiles persistence
    if (supabase) {
      try {
        await supabase.from('profiles').upsert(
          {
            id: createdUserId,
            email: resolvedEmail,
            username,
            full_name: cleanFullName,
            phone: cleanPhone || null,
            telegram_id: cleanTele || null,
            role,
            balance: 0,
            referral_code: myReferralCode,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );
      } catch (sbErr) {
        console.warn('[register-multimodal] Supabase profiles notice:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: createdUserId,
        email: resolvedEmail,
        fullName: cleanFullName,
      },
      resolvedEmail: resolvedEmail,
      message: 'Đăng ký tài khoản YukiShopMXH thành công!',
    });
  } catch (err: any) {
    console.error('Registration API error:', err);
    return NextResponse.json({
      error: 'SERVER_ERROR',
      message: err.message || 'Lỗi khi xử lý đăng ký.',
    }, { status: 500 });
  }
}
