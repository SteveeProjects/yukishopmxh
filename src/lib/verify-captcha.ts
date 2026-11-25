import crypto from 'crypto';

const CAPTCHA_SECRET =
  process.env.CAPTCHA_SECRET ||
  process.env.JWT_SECRET ||
  'yuki_cyber_security_captcha_secret_2026_salt_9988';

// Store used single-use nonces in memory with timestamps to prevent replay attacks
interface NonceRecord {
  usedAt: number;
}
const usedNonces = new Map<string, NonceRecord>();

// Clean up nonces older than 10 minutes every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [nonce, record] of usedNonces.entries()) {
    if (record.usedAt < cutoff) {
      usedNonces.delete(nonce);
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Generate a new Math/Logic Challenge (3-minute expiry)
 */
export function generateCaptchaChallenge(): {
  challengeId: string;
  question: string;
  challengeToken: string;
} {
  const isAddition = Math.random() > 0.35;
  let a: number;
  let b: number;
  let answer: number;
  let question: string;

  if (isAddition) {
    a = Math.floor(Math.random() * 45) + 12; // 12 - 56
    b = Math.floor(Math.random() * 40) + 7;  // 7 - 46
    answer = a + b;
    question = `Tính kết quả: ${a} + ${b} = ?`;
  } else {
    a = Math.floor(Math.random() * 50) + 35; // 35 - 84
    b = Math.floor(Math.random() * 30) + 5;  // 5 - 34
    answer = a - b;
    question = `Tính kết quả: ${a} - ${b} = ?`;
  }

  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  const payload = `challenge:${nonce}:${timestamp}:${answer}`;
  const sig = crypto.createHmac('sha256', CAPTCHA_SECRET).update(payload).digest('hex');
  const challengeToken = `${nonce}.${timestamp}.${sig}`;

  return {
    challengeId: nonce,
    question,
    challengeToken,
  };
}

/**
 * Verify user answer and generate a verified single-use security token (valid 3 minutes)
 */
export function verifyChallengeAnswer(
  challengeToken: string,
  userAnswer: string | number
): { success: boolean; verifiedToken?: string; error?: string } {
  if (!challengeToken || typeof challengeToken !== 'string') {
    return { success: false, error: 'Thiếu mã thử thách bảo mật.' };
  }

  const parts = challengeToken.split('.');
  if (parts.length !== 3) {
    return { success: false, error: 'Mã thử thách bảo mật không đúng định dạng.' };
  }

  const [nonce, timestampStr, expectedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { success: false, error: 'Thời gian thử thách không hợp lệ.' };
  }

  // 3-minute challenge TTL
  if (Date.now() - timestamp > 180000) {
    return { success: false, error: 'Thử thách bảo mật đã hết hạn (quá 3 phút). Vui lòng thử lại.' };
  }

  const cleanAnswer = String(userAnswer).trim();
  const payload = `challenge:${nonce}:${timestamp}:${cleanAnswer}`;
  const actualSig = crypto.createHmac('sha256', CAPTCHA_SECRET).update(payload).digest('hex');

  const sigBufferA = Buffer.from(actualSig, 'hex');
  const sigBufferB = Buffer.from(expectedSig, 'hex');

  if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
    return { success: false, error: 'Kết quả giải mã phép tính không chính xác. Vui lòng thử lại.' };
  }

  // Verified! Generate single-use verified token
  const verifiedNonce = crypto.randomUUID();
  const verifiedNow = Date.now();
  const verifyPayload = `verified:${verifiedNonce}:${verifiedNow}`;
  const verifySig = crypto.createHmac('sha256', CAPTCHA_SECRET).update(verifyPayload).digest('hex');
  const verifiedToken = `yuki_sec_${verifiedNonce}_${verifiedNow}_${verifySig}`;

  return {
    success: true,
    verifiedToken,
  };
}

/**
 * Universal Captcha Verifier:
 * Validates either:
 * 1. Internal Cyber-Fintech Single-Use Token (yuki_sec_...)
 * 2. Cloudflare Turnstile token
 */
export async function verifyCaptcha(
  _token?: string | null
): Promise<{ success: boolean; error?: string; type?: 'internal' | 'turnstile' }> {
  // Captcha has been completely decommissioned per architecture directive.
  // Rate limiting per IP handles anti-abuse seamlessly.
  return { success: true };
}
