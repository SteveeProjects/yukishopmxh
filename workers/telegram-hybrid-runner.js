#!/usr/bin/env node
// ==============================================================================
// YUKISHOPMXH — HYBRID TELEGRAM BOT POLLING RUNNER (LOCAL DEV ONLY)
// Reads all tokens & secrets dynamically from .env.local or process.env.
// Yields automatically if a remote HTTPS Webhook is active.
// ==============================================================================

const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '..', '.env.local');

function loadEnv() {
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const mainBotToken = (process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || '').trim();
const otpBotToken = (process.env.TELEGRAM_OTP_BOT_TOKEN || env.TELEGRAM_OTP_BOT_TOKEN || '').trim();
const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || env.TELEGRAM_WEBHOOK_SECRET || '').trim();
const serverBaseUrl = (process.env.LOCAL_SERVER_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

let isRunning = true;

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function pollBot({ token, endpoint, label }) {
  if (!token) {
    console.warn(`[${label}] Token not configured in .env.local or environment. Skipped.`);
    return;
  }

  let offset = 0;
  const allowedUpdatesParam = encodeURIComponent(JSON.stringify(['message', 'callback_query']));

  while (isRunning) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=15&allowed_updates=${allowedUpdatesParam}`;
      const data = await fetchJson(url);

      if (data?.error_code === 409) {
        await new Promise((r) => setTimeout(r, 20000));
        continue;
      }

      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = Math.max(offset, update.update_id + 1);
          const headers = { 'Content-Type': 'application/json' };
          if (webhookSecret) {
            headers['x-telegram-bot-api-secret-token'] = webhookSecret;
          }
          await fetchJson(`${serverBaseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(update),
          }).catch(() => {});
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 4000));
    }
    await new Promise((r) => setTimeout(r, 600));
  }
}

Promise.all([
  pollBot({ token: mainBotToken, endpoint: '/api/telegram/webhook', label: 'MAIN-BOT' }),
  pollBot({ token: otpBotToken, endpoint: '/api/telegram/otp-webhook', label: 'OTP-BOT' }),
]).catch((err) => console.error('[BOT-RUNNER] Fatal:', err));

process.on('SIGINT', () => {
  isRunning = false;
  process.exit(0);
});
process.on('SIGTERM', () => {
  isRunning = false;
  process.exit(0);
});
