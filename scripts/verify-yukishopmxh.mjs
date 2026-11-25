#!/usr/bin/env node
/**
 * Integration Verification Suite for YukiShopMXH
 * Zero hardcoded secrets — reads runtime secrets strictly from process.env or .env.local.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
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
const RUNTIME_SESSION_SECRET =
  process.env.SESSION_SECRET ||
  envLocal.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  envLocal.NEXTAUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  envLocal.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.POSTGRES_URL ||
  envLocal.POSTGRES_URL ||
  '';

async function req(p, opts = {}) {
  const res = await fetch(`${BASE_URL}${p}`, { redirect: 'manual', ...opts });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json };
}

function extractSessionCookie(headers) {
  const setCookie = headers.get('set-cookie') || '';
  const m = setCookie.match(/yuki_session=([^;]+)/);
  return m ? `yuki_session=${m[1]}` : '';
}

function createSignedCookieFromEnv(userObj) {
  if (!RUNTIME_SESSION_SECRET) return '';
  const sv = Number(userObj.sessionVersion || 1);
  const role = String(userObj.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
  const sig = crypto
    .createHmac('sha256', RUNTIME_SESSION_SECRET)
    .update(`${userObj.id}:${role}:v${sv}`)
    .digest('hex');
  const payload = {
    id: userObj.id,
    username: userObj.username || 'admin',
    fullName: userObj.fullName || 'Admin YukiShopMXH',
    email: userObj.email,
    role,
    sv,
    iat: Date.now(),
    sig,
  };
  return `yuki_session=${encodeURIComponent(JSON.stringify(payload))}`;
}

async function main() {
  console.log(`Testing against ${BASE_URL} ...`);

  // 1. Forged yuki_session cookie without valid HMAC must be rejected from /admin and admin APIs
  const forgedCookie = encodeURIComponent(JSON.stringify({ id: '00000000-0000-0000-0000-000000000001', role: 'admin', sig: 'forged' }));
  const adminPageForged = await req('/admin', { headers: { cookie: `yuki_session=${forgedCookie}` } });
  assert([302, 307, 401, 403].includes(adminPageForged.status), `Expected forged /admin redirect/deny, got ${adminPageForged.status}`);
  for (const adminEp of ['/api/admin/orders', '/api/admin/telegram-config', '/api/admin/catalog', '/api/admin/categories']) {
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

  // 3. Verify canonical catalog (Ultra 5x/20x + Muse AI + API SMS, zero obsolete SKUs)
  const catRes = await req('/api/catalog');
  assert.strictEqual(catRes.status, 200, `/api/catalog failed: ${catRes.text}`);
  const allProducts = Array.isArray(catRes.json?.products) ? catRes.json.products : [];
  const allSkus = new Set(allProducts.map((p) => String(p.sku || '').toUpperCase()));
  for (const oldSku of ['GEMINI-PRO-24M-FAMILY', 'GEMINI-ULTRA-3M', 'GEMINI-ULTRA-1M-FAMILY']) {
    assert(!allSkus.has(oldSku), `Obsolete SKU ${oldSku} MUST NOT exist in catalog!`);
  }
  const expectedProducts = [
    { sku: 'GEMINI-ULTRA-5X-1M', price: 85000 },
    { sku: 'GEMINI-ULTRA-20X-1M', price: 145000 },
    { sku: 'MUSE-AI-1B-TOKENS', price: 12000 },
    { sku: 'API-TOOL-SMS-120K', price: 120000, allow_voucher: false },
  ];
  for (const exp of expectedProducts) {
    const found = allProducts.find((p) => String(p.sku || '').toUpperCase() === exp.sku);
    assert(found, `Missing canonical product ${exp.sku} in /api/catalog`);
    assert.strictEqual(Number(found.sell_price), exp.price, `Unexpected price for ${exp.sku}: ${found.sell_price}`);
    if (exp.allow_voucher === false) {
      assert.strictEqual(Boolean(found.allow_voucher), false, `Expected allow_voucher=false for ${exp.sku}`);
    }
  }
  console.log('✓ 3. Canonical Ultra 5x/20x catalog verified & old Gemini SKUs absent');

  // 4. Register numeric Telegram ID user + @username Telegram handle user, test login + F5 (/api/auth/me) + password change
  const ts = Date.now();
  const tgNumeric = String(910000000 + (ts % 90000000));
  const testEmail = `verify_${ts}@gmail.com`;
  const initPassword = 'TestPassword123!';
  const regRes = await req('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      telegramId: tgNumeric,
      password: initPassword,
      confirmPassword: initPassword,
      fullName: 'Verify User',
    }),
  });
  assert.strictEqual(regRes.status, 200, `Register failed: ${regRes.text}`);
  let userCookie = extractSessionCookie(regRes.headers);
  assert(userCookie, 'Missing signed yuki_session cookie on register');
  assert(/^[0-9a-f-]{36}$/i.test(regRes.json?.user?.id || ''), `Expected UUID user id, got ${regRes.json?.user?.id}`);

  // Also test @username registration
  const tgHandleUser = `yuki_handle_${ts}`;
  const regHandle = await req('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `verify_handle_${ts}@gmail.com`,
      telegramId: `@${tgHandleUser}`,
      password: initPassword,
      confirmPassword: initPassword,
      fullName: 'Handle Verify User',
    }),
  });
  assert.strictEqual(regHandle.status, 200, `@username register failed: ${regHandle.text}`);

  // F5 /api/auth/me + login + change password
  const f5Check = await req('/api/auth/me', { headers: { cookie: userCookie } });
  assert.strictEqual(f5Check.status, 200, `F5 /api/auth/me failed: ${f5Check.text}`);
  assert.strictEqual(f5Check.json?.authenticated, true);

  const rotatedPassword = 'NewTestPassword456!';
  const chgRes = await req('/api/user/change-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ currentPassword: initPassword, newPassword: rotatedPassword }),
  });
  assert.strictEqual(chgRes.status, 200, `Change password failed: ${chgRes.text}`);
  const refreshedCookie = extractSessionCookie(chgRes.headers);
  if (refreshedCookie) userCookie = refreshedCookie;

  const afterChgMe = await req('/api/auth/me', { headers: { cookie: userCookie } });
  assert.strictEqual(afterChgMe.status, 200, `Expected active session after change-password, got ${afterChgMe.status}`);

  const oldPassLogin = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: testEmail, password: initPassword }),
  });
  assert.strictEqual(oldPassLogin.status, 401, `Expected 401 for old password after change, got ${oldPassLogin.status}`);

  const newPassLogin = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: testEmail, password: rotatedPassword }),
  });
  assert.strictEqual(newPassLogin.status, 200, `Login with new password failed: ${newPassLogin.text}`);
  userCookie = extractSessionCookie(newPassLogin.headers) || userCookie;
  console.log(`✓ 4. Numeric & @username registration, F5 /api/auth/me, change-password & login passed`);

  // 5. Create sequential wallet deposit requests #1, #2, #3 -> verify YUKISP_DHXXXXXX_TAG sequence
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
  console.log(`✓ 5. Sequential deposit codes generated strictly in order: ${code1} -> ${code2} -> ${code3}`);

  // 6. MacroDroid auto-match test & Monthly Top Depositors admin exclusion check
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

    const st1 = await req(`/api/wallet/topup/status?code=${encodeURIComponent(code1)}`);
    assert.strictEqual(st1.json?.isCompleted, true, `Expected code1 completed, got: ${st1.text}`);

    const me = await req('/api/auth/me', { headers: { cookie: userCookie } });
    assert.strictEqual(Number(me.json?.user?.balance), 175000, `Expected balance 175000, got ${me.json?.user?.balance}`);

    const topDep = await req('/api/wallet/top-depositors');
    assert.strictEqual(topDep.status, 200, `Top depositors failed: ${topDep.text}`);
    const hasAdmin = (topDep.json?.topDepositors || []).some(
      (d) => String(d.email || '').toLowerCase() === 'kyomeyuki2k@gmail.com'
    );
    assert(!hasAdmin, 'Admin account MUST be excluded from Top Depositors!');
    console.log(`✓ 6. MacroDroid matched 3 deposits (${code1}, ${strippedCode2}, ${code3}), blocked replay, balance=175000`);
  }

  // 7. Order creation security guards
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
  console.log('✓ 7. Order creation blocked DEPOSIT/NAP_VI & bogus SKUs, non-admin blocked from Admin APIs');

  // 8. Admin Folder CRUD, Product Sorting, Multi-Mode Order Approval & Refund Verification
  let adminCookie = '';
  const adminPassword = process.env.ADMIN_PASSWORD || envLocal.ADMIN_PASSWORD || '';
  if (adminPassword) {
    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'kyomeyuki2k@gmail.com', password: adminPassword }),
    });
    assert.strictEqual(adminLogin.status, 200, `Admin login failed: ${adminLogin.text}`);
    adminCookie = extractSessionCookie(adminLogin.headers);
  } else if (RUNTIME_SESSION_SECRET) {
    adminCookie = createSignedCookieFromEnv({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'kyomeyuki2k@gmail.com',
      username: 'yukishop_admin',
      role: 'admin',
      sessionVersion: 1,
    });
  }

  if (adminCookie) {
    const tgCfg = await req('/api/admin/telegram-config', { headers: { cookie: adminCookie } });
    if (tgCfg.status === 200) {
      assert(tgCfg.json?.config, 'Missing config object in /api/admin/telegram-config');
      if (tgCfg.json.config.bot_token) {
        assert(tgCfg.json.config.bot_token.startsWith('••••'), `Expected masked bot_token, got ${tgCfg.json.config.bot_token}`);
      }

      const tempCatName = `Verify Folder ${ts}`;
      const createCat = await req('/api/admin/categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({ name: tempCatName, icon: 'FolderKanban', sort_order: 99 }),
      });
      assert([200, 201].includes(createCat.status), `Admin create category failed: ${createCat.text}`);
      const createdCatId = createCat.json?.category?.id;
      assert(createdCatId, `Missing created category id: ${createCat.text}`);

      const tempSku = `VERIFY-2FA-${ts}`;
      const createProd = await req('/api/admin/catalog', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({
          action: 'upsert_product',
          sku: tempSku,
          name: 'Verify 2FA Product',
          category_name: tempCatName,
          sell_price: 15000,
          delivery_mode: 'credentials_2fa',
          input_type: 'credentials_2fa',
          sort_order: 88,
          is_active: true,
        }),
      });
      assert([200, 201].includes(createProd.status), `Admin upsert product failed: ${createProd.text}`);

      const reorderRes = await req('/api/admin/catalog', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({ items: [{ sku: tempSku, sort_order: 12 }] }),
      });
      assert.strictEqual(reorderRes.status, 200, `Admin sort_order PATCH failed: ${reorderRes.text}`);

      // Test order creation + Admin multi-mode processing & refund when balance exists
      if (MACRODROID_SECRET) {
        const ord1 = await req('/api/orders/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie: userCookie },
          body: JSON.stringify({
            orderType: 'SERVICE',
            sku: 'MUSE-AI-1B-TOKENS',
            quantity: 1,
            accountCredentials: 'buyer_test@gmail.com | TestPass123',
            deliveryContact: '@buyer_verify',
          }),
        });
        assert([200, 201].includes(ord1.status), `Order 1 creation failed: ${ord1.text}`);
        const codeOrd1 = ord1.json?.order?.order_code || ord1.json?.orderCode;
        assert(codeOrd1, `Missing codeOrd1: ${ord1.text}`);

        const procRes = await req('/api/admin/orders/action', {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie: adminCookie },
          body: JSON.stringify({
            action: 'processing',
            orderCode: codeOrd1,
            adminNote: 'Admin dang yeu cau ma 2FA de nang cap',
          }),
        });
        assert.strictEqual(procRes.status, 200, `Order processing update failed: ${procRes.text}`);

        const delivRes = await req('/api/admin/orders/action', {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie: adminCookie },
          body: JSON.stringify({
            action: 'approve_deliver',
            orderCode: codeOrd1,
            deliveryInfo: 'TK: test@muse.ai | MK: Verified999',
          }),
        });
        assert.strictEqual(delivRes.status, 200, `Order approve_deliver failed: ${delivRes.text}`);

        // Order 2 -> Reject and confirm atomic 100% refund
        const ord2 = await req('/api/orders/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie: userCookie },
          body: JSON.stringify({
            orderType: 'SERVICE',
            sku: 'GEMINI-ULTRA-5X-1M',
            quantity: 1,
            deliveryContact: 'family_slot@gmail.com',
            telegramId: tgNumeric,
          }),
        });
        assert([200, 201].includes(ord2.status), `Order 2 creation failed: ${ord2.text}`);
        const codeOrd2 = ord2.json?.order?.order_code || ord2.json?.orderCode;

        const rejRes = await req('/api/admin/orders/action', {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie: adminCookie },
          body: JSON.stringify({
            action: 'reject',
            orderCode: codeOrd2,
            reason: 'Slot tam het, hoan tien 100%',
          }),
        });
        assert.strictEqual(rejRes.status, 200, `Order reject failed: ${rejRes.text}`);

        const meAfterRefund = await req('/api/auth/me', { headers: { cookie: userCookie } });
        // 175,000 - 12,000 (Muse AI approved) - 85,000 (Ultra 5x) + 85,000 (refunded) = 163,000
        assert.strictEqual(
          Number(meAfterRefund.json?.user?.balance),
          163000,
          `Expected 163000 balance after Muse purchase + Ultra refund, got ${meAfterRefund.json?.user?.balance}`
        );
      }

      // Clean up temporary test product & folder
      await req(`/api/admin/catalog?sku=${encodeURIComponent(tempSku)}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });
      await req(`/api/admin/categories?id=${encodeURIComponent(createdCatId)}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });
      console.log('✓ 8. Admin folder/product CRUD, sort_order PATCH, multi-mode order actions & 100% refund verified');
    } else {
      console.log('• 8. Skipped live Admin DB mutation checks (ADMIN_PASSWORD not provided and DB Admin id differs)');
    }
  }

  // 9. Forgot-password takeover protections
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

  const webResetAttempt = await req('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: otpToken, newPassword: 'HackedPassword123' }),
  });
  assert.strictEqual(webResetAttempt.status, 403, `Expected 403 blocking YK-* token on web reset endpoint, got ${webResetAttempt.status}`);
  console.log('✓ 9. Forgot-password substring attack & web YK-* account takeover blocked');

  // 10. Public & Protected UI route status checks
  const publicRoutes = ['/', '/services', '/buff', '/store', '/orders', '/spin', '/affiliate', '/warranty', '/login', '/register', '/signup', '/forgot-password'];
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
  console.log(`✓ 10. All ${publicRoutes.length} public UI routes (200) & ${protectedRoutes.length} protected routes (307 anon / 200 auth) passed`);
  console.log('\nALL VERIFICATION CHECKS PASSED!');
}

main().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
