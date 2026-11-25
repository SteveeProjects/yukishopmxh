#!/usr/bin/env node
// Local polling runner for Shop Bot — reads credentials strictly from env/.env.local
const path = require('path');
const fs = require('fs');

const rootEnvPath = path.resolve(__dirname, '..', '.env.local');
let botToken = process.env.TELEGRAM_BOT_TOKEN || '';
let webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';

if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, 'utf8');
  content.split('\n').forEach((line) => {
    const mToken = line.match(/^TELEGRAM_BOT_TOKEN=["']?([^"'\r\n]+)["']?$/);
    if (mToken && !botToken) botToken = mToken[1].trim();
    const mSec = line.match(/^TELEGRAM_WEBHOOK_SECRET=["']?([^"'\r\n]+)["']?$/);
    if (mSec && !webhookSecret) webhookSecret = mSec[1].trim();
  });
}

if (!botToken) {
  console.error('[TELEGRAM POLLER] TELEGRAM_BOT_TOKEN is not set. Exiting cleanly.');
  process.exit(0);
}

let offset = 0;
let isPolling = true;

async function pollLoop() {
  while (isPolling) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=15`);
      const data = await res.json();
      if (data?.error_code === 409) {
        await new Promise((r) => setTimeout(r, 20000));
        continue;
      }
      if (data?.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = Math.max(offset, update.update_id + 1);
          const headers = { 'Content-Type': 'application/json' };
          if (webhookSecret) headers['x-telegram-bot-api-secret-token'] = webhookSecret;
          await fetch('http://127.0.0.1:3000/api/telegram/webhook', {
            method: 'POST',
            headers,
            body: JSON.stringify(update),
          }).catch(() => {});
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
    await new Promise((r) => setTimeout(r, 800));
  }
}

pollLoop();
process.on('SIGINT', () => { isPolling = false; process.exit(0); });
process.on('SIGTERM', () => { isPolling = false; process.exit(0); });
