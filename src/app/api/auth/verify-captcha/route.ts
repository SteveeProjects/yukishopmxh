import { NextResponse } from 'next/server';
import { verifyChallengeAnswer } from '@/lib/verify-captcha';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { challengeToken, answer } = body;

    if (!challengeToken || answer === undefined || answer === null || String(answer).trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập câu trả lời cho phép tính bảo mật.' },
        { status: 400 }
      );
    }

    const result = verifyChallengeAnswer(challengeToken, answer);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Câu trả lời không chính xác. Vui lòng thử lại.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verifiedToken: result.verifiedToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Lỗi xác minh thử thách bảo mật: ' + error.message },
      { status: 500 }
    );
  }
}
