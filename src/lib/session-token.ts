import crypto from 'crypto';
import type { LocalUser } from '@/lib/server-store';

export function getSessionSecret(): string {
  const configured = (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.TELEGRAM_BOT_TOKEN ||
    ''
  ).trim();

  if (configured) return configured;
  if (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production') {
    return '';
  }
  return 'yuki-shop-mxh-local-dev-secret-v4';
}

export function normalizeRole(role?: string | null): 'admin' | 'user' {
  return String(role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
}

export function signSession(
  userId: string,
  role: string = 'user',
  sessionVersion = 1
): string {
  const secret = getSessionSecret();
  if (!secret) return '';
  const safeRole = normalizeRole(role);
  return crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${safeRole}:v${sessionVersion}`)
    .digest('hex');
}

export function createSessionPayload(user: {
  id: string;
  username?: string;
  fullName?: string;
  telegramId?: string;
  phone?: string;
  email?: string;
  role?: string;
  sessionVersion?: number;
}) {
  const sv = Number(user.sessionVersion || 1);
  const role = normalizeRole(user.role);
  return {
    id: user.id,
    username: user.username || '',
    fullName: user.fullName || user.username || 'Khách Hàng',
    telegramId: user.telegramId || '',
    phone: user.phone || '',
    email: user.email || '',
    role,
    sv,
    iat: Date.now(),
    sig: signSession(user.id, role, sv),
  };
}

export function isSessionPayloadValid(
  parsed: any,
  freshUser?: LocalUser | null
): boolean {
  if (!parsed || typeof parsed !== 'object' || !parsed.id || typeof parsed.id !== 'string') {
    return false;
  }

  if (typeof parsed.sig !== 'string' || !parsed.sig) {
    return false;
  }

  if (typeof parsed.iat === 'number') {
    const maxAgeMs = 31 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.iat > maxAgeMs) return false;
  }

  const tokenSv = Number(parsed.sv || 1);
  const tokenRole = normalizeRole(parsed.role);

  if (freshUser) {
    if (freshUser.id !== parsed.id) return false;
    const currentSv = Number(freshUser.sessionVersion || 1);
    const currentRole = normalizeRole(freshUser.role);
    if (tokenSv !== currentSv || tokenRole !== currentRole) return false;

    const expected = signSession(freshUser.id, currentRole, currentSv);
    if (!expected || parsed.sig.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(parsed.sig, 'utf8'),
        Buffer.from(expected, 'utf8')
      );
    } catch {
      return false;
    }
  }

  // Never trust an unverified admin role if DB/store lookup returned null
  if (tokenRole === 'admin') {
    return false;
  }

  const expected = signSession(parsed.id, tokenRole, tokenSv);
  if (!expected || parsed.sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(parsed.sig, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return false;
  }
}

export function getSessionCookieOptions(req?: Request) {
  const forwardedProto = req?.headers.get('x-forwarded-proto') || '';
  const isHttps =
    forwardedProto === 'https' ||
    Boolean(req?.url && req.url.startsWith('https://'));

  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30,
    secure: isHttps,
  };
}
