import { NextResponse } from 'next/server';
import { generateCaptchaChallenge } from '@/lib/verify-captcha';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const challenge = generateCaptchaChallenge();
    return NextResponse.json({
      success: true,
      challengeId: challenge.challengeId,
      question: challenge.question,
      challengeToken: challenge.challengeToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Không thể tạo thử thách bảo mật: ' + error.message },
      { status: 500 }
    );
  }
}
