#!/usr/bin/env node
/**
 * Integration Verification Suite for YukiShopMXH
 * Zero hardcoded secrets — reads secrets strictly from .env.local or process.env.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvLocal() {
  const envFile = path.resolve(__dirname, '..', '.env.local');
  const out = {};
  if (fs.existsSync(envFile)) {
    for (const raw of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      const k = line.slice(0, idx).trim();
      let v = line.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
  }
  return out;
}

const envLocal = loadEnvLocal();
const BASE_URL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3099').replace(/\/$/, '');
const MACRODROID_SECRET =
  process.env.MACRODROID_SECRET || envLocal.MACRODROID_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || envLocal.TELEGRAM_WEBHOOK_SECRET || '';
const TG_WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET || envLocal.TELEGRAM_WEBHOOK_SECRET || MACRODROID_SECRET || '';

async function req(p, opts = {}) {
  const res = await fetch(`${BASE_URL}${p}`, { redirect: 'manual', ...opts });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json };
}

async function main() {
  console.log(`Testing against ${BASE_URL} ...`);

  // 1. Forged yuki_session cookie without valid HMAC must be rejected from /admin and admin APIs
  const forgedCookie = encodeURIComponent(JSON.stringify({ id: '00000000-0000-0000-0000-000000000001', role: 'admin', sig: 'forged' }));
  const adminPageForged = await req('/admin', { headers: { cookie: `yuki_session=${forgedCookie}` } });
  assert([302, 307, 401, 403].includes(adminPageForged.status), `Expected forged /admin redirect/deny, got ${adminPageForged.status}`);
  for (const adminEp of ['/api/admin/orders', '/api/admin/telegram-config', '/api/admin/catalog']) {
    const adminApiForged = await req(adminEp, { headers: { cookie: `yuki_session=${forgedCookie}` } });
    assert([401, 403].includes(adminApiForged.status), `Expected forged ${adminEp} 401/403, got ${adminApiForged.status}`);
  }
  console.log('✓ 1. Forged Admin session cookie rejected on /admin and all /api/admin/* endpoints');

  // 2. Unauthenticated webhooks with wrong secret must fail with 401
  if (TG_WEBHOOK_SECRET) {
    const whBad = await req('/api/telegram/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-worker': 'true', 'x-telegram-bot-api-secret-token': 'wrong-secret' },
      body: JSON.stringify({ message: { text: '/status', from: { id: 8960751162 }, chat: { id: 8960751162 } } }),
    });
    assert.strictEqual(whBad.status, 401, `Expected 401 on spoofed /api/telegram/webhook, got ${whBad.status}`);

    const otpWhBad = await req('/api/telegram/otp-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 'wrong-secret' },
      body: JSON.stringify({ message: { text: '/start', from: { id: 12345 }, chat: { id: 12345 } } }),
    });
    assert.strictEqual(otpWhBad.status, 401, `Expected 401 on spoofed /api/telegram/otp-webhook, got ${otpWhBad.status}`);
  }
  for (const mdEndpoint of ['/api/webhook/macrodroid', '/api/webhook/deposit', '/api/macro']) {
    const mdBad = await req(mdEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Nhan 50.000d ND: YUKISP_DH000001_TEST', secret: 'wrong-secret' }),
    });
    assert.strictEqual(mdBad.status, 401, `Expected 401 on invalid secret for ${mdEndpoint}, got ${mdBad.status}`);
  }
  console.log('✓ 2. Spoofed Telegram & MacroDroid (/macrodroid, /deposit, /macro) webhooks rejected with 401');

  // 3. Register a fresh test user & capture signed session cookie
  const ts = Date.now();
  const tgNumeric = String(910000000 + (ts % 90000000));
  const testEmail = `verify_${ts}@gmail.com`;
  const regRes = await req('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      telegramId: tgNumeric,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      fullName: 'Verify User',
    }),
  });
  assert.strictEqual(regRes.status, 200, `Register failed: ${regRes.text}`);
  const setCookie = regRes.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(/yuki_session=([^;]+)/);
  assert(cookieMatch, 'Missing signed yuki_session cookie on register');
  const userCookie = `yuki_session=${cookieMatch[1]}`;
  console.log(`✓ 3. Registered test user ${testEmail} & got signed cookie`);

  // 4. Create sequential wallet deposit requests #1, #2, #3 -> verify YUKISP_DHXXXXXX_TAG sequence
  const dep1 = await req('/api/wallet/topup/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ amount: 50000 }),
  });
  assert.strictEqual(dep1.status, 201, `Deposit 1 failed: ${dep1.text}`);
  const code1 = dep1.json?.data?.referenceCode;
  const seq1 = dep1.json?.data?.sequenceNumber;
  assert(/^(YUKISP_DH\d{6,}_[A-Z0-9]+|YukiSp_\d{6,})$/i.test(code1), `Unexpected code1 format: ${code1}`);

  const dep2 = await req('/api/wallet/topup/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ amount: 100000 }),
  });
  assert.strictEqual(dep2.status, 201, `Deposit 2 failed: ${dep2.text}`);
  const code2 = dep2.json?.data?.referenceCode;
  const seq2 = dep2.json?.data?.sequenceNumber;
  assert.strictEqual(seq2, seq1 + 1, `Expected sequential order deposit number ${seq1 + 1}, got ${seq2}`);

  const dep3 = await req('/api/wallet/topup/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ amount: 25000 }),
  });
  assert.strictEqual(dep3.status, 201, `Deposit 3 failed: ${dep3.text}`);
  const code3 = dep3.json?.data?.referenceCode;
  const seq3 = dep3.json?.data?.sequenceNumber;
  assert.strictEqual(seq3, seq2 + 1, `Expected sequential order deposit number ${seq2 + 1}, got ${seq3}`);
  console.log(`✓ 4. Sequential deposit codes generated strictly in order: ${code1} -> ${code2} -> ${code3}`);

  // 5. MacroDroid auto-match test (/api/webhook/macrodroid, stripped underscore, /api/webhook/deposit, idempotency!)
  if (MACRODROID_SECRET) {
    const md1 = await req('/api/webhook/macrodroid', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'ZaloPay',
        text: `Bạn vừa nhận +50.000đ. Nội dung: ${code1}`,
        secret: MACRODROID_SECRET,
      }),
    });
    assert.strictEqual(md1.status, 200, `MacroDroid 1 HTTP error: ${md1.text}`);
    assert.strictEqual(md1.json?.success, true, `MacroDroid 1 failed: ${md1.text}`);
    assert.strictEqual(md1.json?.orderCode, code1);

    // Stripped underscore variant: e.g. "YUKISP DH000002 TAG"
    const strippedCode2 = code2.replace(/_/g, ' ').toUpperCase();
    const md2 = await req('/api/webhook/deposit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': MACRODROID_SECRET },
      body: JSON.stringify({
        title: 'MBBank',
        message: `TK +100,000VND ND: CHUYEN TIEN ${strippedCode2}`,
      }),
    });
    assert.strictEqual(md2.status, 200, `MacroDroid 2 (/api/webhook/deposit) HTTP error: ${md2.text}`);
    assert.strictEqual(md2.json?.success, true, `MacroDroid 2 failed: ${md2.text}`);
    assert.strictEqual(md2.json?.orderCode, code2);

    // /api/macro alias with explicit money + note
    const md3 = await req('/api/macro', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        note: `CHUYEN KHOAN ${code3}`,
        money: '25.000',
        token: MACRODROID_SECRET,
      }),
    });
    assert.strictEqual(md3.status, 200, `MacroDroid 3 (/api/macro) HTTP error: ${md3.text}`);
    assert.strictEqual(md3.json?.success, true, `MacroDroid 3 failed: ${md3.text}`);
    assert.strictEqual(md3.json?.orderCode, code3);

    // Duplicate replay must NOT double credit
    const mdDup = await req('/api/webhook/macrodroid', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'MBBank',
        text: `TK +100,000VND ND: ${strippedCode2}`,
        secret: MACRODROID_SECRET,
      }),
    });
    assert.strictEqual(mdDup.json?.alreadyProcessed, true, `Expected idempotent replay rejection, got: ${mdDup.text}`);

    // Verify topup status & wallet balance = 50,000 + 100,000 + 25,000 = 175,000
    const st1 = await req(`/api/wallet/topup/status?code=${encodeURIComponent(code1)}`);
    assert.strictEqual(st1.json?.isCompleted, true, `Expected code1 completed, got: ${st1.text}`);

    const me = await req('/api/auth/me', { headers: { cookie: userCookie } });
    assert.strictEqual(Number(me.json?.user?.balance), 175000, `Expected balance 175000, got ${me.json?.user?.balance}`);
    console.log(`✓ 5. MacroDroid matched ${code1}, ${strippedCode2} (/webhook/deposit), ${code3} (/macro), blocked replay, balance=175000`);
  }

  // 5b. Order creation security guards (DEPOSIT blocked, invalid/tampered SKU blocked, normal user rejected from Admin APIs)
  const normalUserAdminCheck = await req('/api/admin/telegram-config', { headers: { cookie: userCookie } });
  assert.strictEqual(normalUserAdminCheck.status, 403, `Expected 403 for non-admin user on /api/admin/telegram-config, got ${normalUserAdminCheck.status}`);

  const depositOrderBlock = await req('/api/orders/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ orderType: 'DEPOSIT', sku: 'NAP_VI', amount: 9999999 }),
  });
  assert.strictEqual(depositOrderBlock.status, 400, `Expected 400 blocking DEPOSIT via /api/orders/create, got ${depositOrderBlock.status}`);

  const bogusSkuBlock = await req('/api/orders/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ orderType: 'SERVICE', sku: 'TAMPERED-1DONG-SKU', amount: 1, quantity: 1 }),
  });
  assert([400, 404].includes(bogusSkuBlock.status), `Expected 400/404 blocking unknown SKU, got ${bogusSkuBlock.status}`);
  console.log('✓ 5b. Order creation blocked DEPOSIT/NAP_VI & bogus SKUs, non-admin blocked from /api/admin/telegram-config');

  // 5c. Admin session checks (if ADMIN_PASSWORD provided via env or .env.local)
  const adminPassword = process.env.ADMIN_PASSWORD || envLocal.ADMIN_PASSWORD || '';
  if (adminPassword) {
    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'kyomeyuki2k@gmail.com', password: adminPassword }),
    });
    assert.strictEqual(adminLogin.status, 200, `Admin login failed: ${adminLogin.text}`);
    const adminCookieMatch = (adminLogin.headers.get('set-cookie') || '').match(/yuki_session=([^;]+)/);
    assert(adminCookieMatch, 'Missing admin yuki_session cookie');
    const adminCookie = `yuki_session=${adminCookieMatch[1]}`;

    const tgCfg = await req('/api/admin/telegram-config', { headers: { cookie: adminCookie } });
    assert.strictEqual(tgCfg.status, 200, `Admin telegram-config GET failed: ${tgCfg.text}`);
    assert(tgCfg.json?.config, 'Missing config object in /api/admin/telegram-config');
    if (tgCfg.json.config.bot_token) {
      assert(tgCfg.json.config.bot_token.startsWith('••••'), `Expected masked bot_token, got ${tgCfg.json.config.bot_token}`);
    }

    const badProd = await req('/api/admin/catalog', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ action: 'upsert_product', sku: 'TEST-INVALID', name: 'Invalid Price Product', sell_price: 0, input_type: 'none' }),
    });
    assert.strictEqual(badProd.status, 400, `Expected 400 for sell_price <= 0 on /api/admin/catalog, got ${badProd.status}`);
    console.log('✓ 5c. Admin /api/admin/telegram-config masks secrets & /api/admin/catalog rejects invalid price');
  }

  // 6. Test forgot-password takeover protections
  const fpPartial = await req('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: testEmail, telegram: tgNumeric.slice(0, 4) }),
  });
  assert.strictEqual(fpPartial.status, 400, `Partial Telegram ID match MUST be blocked! Got ${fpPartial.status}`);

  const fpExact = await req('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: testEmail, telegram: tgNumeric }),
  });
  assert.strictEqual(fpExact.status, 200, `Exact forgot-password failed: ${fpExact.text}`);
  const otpToken = fpExact.json?.token;
  assert(otpToken && otpToken.startsWith('YK-'), `Expected YK-XXXXXX token, got ${otpToken}`);

  // Short token YK-XXXXXX MUST be rejected on web /api/auth/reset-password
  const webResetAttempt = await req('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: otpToken, newPassword: 'HackedPassword123' }),
  });
  assert.strictEqual(webResetAttempt.status, 403, `Expected 403 blocking YK-* token on web reset endpoint, got ${webResetAttempt.status}`);
  console.log('✓ 6. Forgot-password substring attack & web YK-* account takeover blocked');

  // 7. Public catalog & UI routes HTTP 200 check (plus auth-gated routes redirect anon -> 307 and render 200 for logged-in user)
  const publicCatalog = await req('/api/catalog');
  assert.strictEqual(publicCatalog.status, 200);
  const publicRoutes = ['/', '/services', '/buff', '/store', '/orders', '/spin', '/affiliate', '/warranty', '/login', '/register', '/forgot-password'];
  for (const r of publicRoutes) {
    const res = await req(r);
    assert.strictEqual(res.status, 200, `Public route ${r} returned HTTP ${res.status}`);
  }
  const protectedRoutes = ['/checkout', '/wallet', '/membership', '/dashboard'];
  for (const r of protectedRoutes) {
    const anonRes = await req(r);
    assert([302, 307].includes(anonRes.status), `Protected route ${r} should redirect unauthenticated user, got ${anonRes.status}`);
    const authRes = await req(r, { headers: { cookie: userCookie } });
    assert.strictEqual(authRes.status, 200, `Protected route ${r} with session cookie returned HTTP ${authRes.status}`);
  }
  console.log(`✓ 7. All ${publicRoutes.length} public UI routes (200), ${protectedRoutes.length} protected routes (307 anon / 200 auth), & /api/catalog passed`);
  console.log('\nALL VERIFICATION CHECKS PASSED!');
}

main().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
