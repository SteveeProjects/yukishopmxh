import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, type RateLimitCategory } from '@/lib/rate-limit';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';

const PUBLIC_PATHS = [
  '/',
  '/services',
  '/buff',
  '/store',
  '/sms',
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/warranty-policy',
  '/reset-password',
  '/spin',
  '/api/catalog',
  '/api/buff',
  '/api/spin/roll',
  '/api/spin/state',
  '/api/spin/history',
  '/api/user/vouchers',
  '/api/auth/reset-password',
  '/api/telegram/webhook',
  '/api/telegram/otp-webhook',
  '/api/webhook/macrodroid',
  '/api/auth/resolve-identifier',
  '/api/auth/captcha',
  '/api/auth/verify-captcha',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/coupons/validate',
  '/api/wallet/topup/status',
  '/api/wallet/top-depositors',
  '/api/telegram/resolve-user',
  '/warranty',
  '/api/warranty/claim',
  '/orders',
  '/api/orders/lookup',
  '/affiliate',
  '/api/settings/announcement',
  '/api/activity',
  '/api/telegram/register-all-webhooks',
];

const SCANNER_UA_REGEX =
  /(sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wpscan|zgrab|acunetix|nessus|openvas|hydra|burpcollaborator|ffuf|nuclei|wfuzz|feroxbuster|httpx-toolkit)/i;

const SENSITIVE_PROBE_REGEX =
  /(\.env|\.git|\.aws|\.ssh|^\/data\/|\/(users|orders|topups|wallet_ledger|password_reset_otps|partner_codes|buff_overrides|catalog_overrides|categories|coupons|referral_logs|site_settings|macrodroid_logs)\.json|wp-admin|wp-login|phpinfo|setup\.php|xmlrpc\.php|admin\.php|config\.json|backup\.sql|\.bak|\.old|\.sql)/i;

function getEdgeSessionSecret(): string {
  const configured = (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  return 'yuki-shop-mxh-local-dev-secret-v4';
}

function timingSafeStrEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifySignedSessionCookie(rawCookie: string): Promise<any | null> {
  try {
    const secret = getEdgeSessionSecret();
    if (!secret) return null;

    const parsed = JSON.parse(decodeURIComponent(rawCookie));
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.sig !== 'string' || !parsed.sig) {
      return null;
    }
    if (typeof parsed.iat === 'number' && Date.now() - parsed.iat > 31 * 24 * 60 * 60 * 1000) {
      return null;
    }

    const sv = Number(parsed.sv || 1);
    const role = String(parsed.role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${parsed.id}:${role}:v${sv}`));
    const hex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (!timingSafeStrEqual(parsed.sig, hex)) {
      return null;
    }
    return { ...parsed, role };
  } catch {
    return null;
  }
}

function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  if ((request as any).ip) return String((request as any).ip);
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '127.0.0.1';
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';

  const isWebhookExempt =
    pathname === '/api/telegram/webhook' ||
    pathname === '/api/telegram/otp-webhook' ||
    pathname === '/api/webhook/macrodroid' ||
    pathname === '/api/webhook/deposit' ||
    pathname === '/api/macro' ||
    pathname.startsWith('/api/macro/');

  if (isWebhookExempt) {
    return NextResponse.next();
  }

  // 1. Block vulnerability scanners & sensitive file probes
  if (SCANNER_UA_REGEX.test(userAgent) || SENSITIVE_PROBE_REGEX.test(pathname)) {
    return withSecurityHeaders(
      NextResponse.json(
        {
          error: 'Truy cập bị từ chối. Phát hiện công cụ dò quét hoặc đường dẫn bảo mật bị cấm.',
          code: 'SECURITY_SCANNER_BLOCKED',
        },
        { status: 403 }
      )
    );
  }

  // 2. Guard oversized JSON payloads
  if (
    pathname.startsWith('/api/') &&
    (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')
  ) {
    const contentLength = Number(request.headers.get('content-length') || '0');
    const maxBytes = pathname.startsWith('/api/admin/upload-icon') ? 6_000_000 : 1_000_000;
    if (contentLength > maxBytes) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: 'Payload quá lớn. Vui lòng kiểm tra lại dữ liệu gửi lên.' },
          { status: 413 }
        )
      );
    }
  }

  // 3. Bypass static assets (never bypass /api/ routes)
  if (
    !pathname.startsWith('/api/') &&
    (pathname.startsWith('/_next') ||
      pathname.startsWith('/assets') ||
      pathname.startsWith('/uploads') ||
      pathname === '/favicon.ico' ||
      pathname === '/brands-catalog.json' ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg') ||
      pathname.endsWith('.gif') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.ico'))
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 4. Sliding-Window Tiered Rate Limiting
  if (pathname.startsWith('/api/')) {
    let category: RateLimitCategory = 'GENERAL';
    if (
      pathname === '/api/auth/login' ||
      pathname === '/api/auth/register' ||
      pathname === '/api/auth/forgot-password' ||
      pathname === '/api/auth/reset-password' ||
      pathname === '/api/user/change-password' ||
      pathname === '/api/spin/roll' ||
      pathname === '/api/orders/create' ||
      pathname === '/api/checkout' ||
      pathname === '/api/affiliate/action' ||
      pathname === '/api/wallet/topup/request' ||
      pathname === '/api/wallet/redeem-points'
    ) {
      category = 'SENSITIVE';
    } else if (
      pathname === '/api/orders/lookup' ||
      pathname === '/api/warranty/claim' ||
      pathname === '/api/coupons/validate'
    ) {
      category = 'LOOKUP';
    }

    const clientIp = getClientIp(request);
    const rateResult = checkRateLimit(clientIp, category);
    if (!rateResult.allowed) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            error: 'Bạn đang thao tác quá nhanh. Vui lòng chờ ít phút trước khi thử lại.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: rateResult.resetSeconds,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateResult.resetSeconds),
              'X-RateLimit-Limit': String(rateResult.limit),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      );
    }
  }

  // 5. Verify Signed Session Cookie (HMAC-SHA256)
  const sessionCookie = request.cookies.get('yuki_session')?.value;
  const localUser = sessionCookie ? await verifySignedSessionCookie(sessionCookie) : null;

  // 6. Check Supabase Auth Session
  let supabaseUser: any = null;
  const sbUrl = getSupabaseUrl();
  const sbAnon = getSupabaseAnonKey();
  const isPlaceholder = sbUrl.includes('placeholder');
  if (!isPlaceholder && sbUrl && sbAnon) {
    try {
      const tempResponse = NextResponse.next();
      const supabase = createServerClient(
        sbUrl,
        sbAnon,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
              cookiesToSet.forEach(({ name, value, options }) =>
                tempResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );
      const { data } = await supabase.auth.getUser();
      supabaseUser = data?.user || null;
    } catch {
      supabaseUser = null;
    }
  }

  const isAuth = !!localUser || !!supabaseUser;
  const isPublic = PUBLIC_PATHS.some((path) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  });

  // 7. Reject protected routes if unauthenticated
  if (!isAuth && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized. Vui lòng đăng nhập.' }, { status: 401 })
      );
    }
    return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }

  // 8. Redirect authenticated users away from /login, /register or /signup
  if (
    isAuth &&
    (pathname === '/login' || pathname === '/register' || pathname === '/signup') &&
    !request.nextUrl.searchParams.has('expired') &&
    !request.nextUrl.searchParams.has('force')
  ) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/', request.url)));
  }

  // 9. Admin Guard: Protect both /admin and /api/admin/* using strictly verified session
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const isAdmin =
      Boolean(localUser && String(localUser.role || '').toLowerCase() === 'admin') ||
      Boolean(supabaseUser && supabaseUser.email?.toLowerCase() === 'kyomeyuki2k@gmail.com');

    if (!isAdmin) {
      if (pathname.startsWith('/api/')) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: 'Forbidden. Chỉ dành riêng cho Quản trị viên hệ thống.' },
            { status: 403 }
          )
        );
      }
      return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
