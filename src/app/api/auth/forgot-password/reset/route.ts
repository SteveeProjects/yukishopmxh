import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Legacy 6-digit OTP reset endpoint has been decommissioned to prevent brute-force
 * and unverified account takeover. Users must reset via @ForgetPassYuki_bot (/doimk).
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        'Chức năng đặt lại mật khẩu bằng OTP 6 số cũ đã ngừng hỗ trợ. Vui lòng dùng tính năng /forgot-password và xác minh qua Bot Telegram @ForgetPassYuki_bot (/doimk).',
    },
    { status: 410 }
  );
}
