// ==============================================================================
// YUKISHOPMXH — PERSISTENT TELEGRAM BOT SESSION STORE
// Serverless-safe: Postgres / Supabase first, /tmp file cache fallback
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres } from '@/lib/autoMigrate';
import { getWritableDataDir } from '@/lib/server-store';

export interface TelegramBotSession {
  chatId: string;
  botType?: 'otp' | 'main';
  step:
    | 'awaiting_email'
    | 'awaiting_otp'
    | 'awaiting_token'
    | 'awaiting_new_password'
    | 'awaiting_delivery'
    | 'idle';
  email?: string;
  otp?: string;
  tokenId?: string;
  token?: string;
  userId?: string;
  orderCode?: string;
  promptMsgId?: number;
  expiresAt: number;
  updatedAt: number;
}

const SESSION_TTL_MS = 15 * 60 * 1000;

function getSessionsFilePath(): string {
  return path.join(getWritableDataDir(), 'telegram_bot_sessions.json');
}

function loadSessionsFromFile(): Record<string, TelegramBotSession> {
  try {
    const file = getSessionsFilePath();
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveSessionsToFile(sessions: Record<string, TelegramBotSession>): void {
  try {
    const file = getSessionsFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(sessions, null, 2), 'utf8');
  } catch {}
}

function sessionStorageKey(chatId: string | number, botType: 'otp' | 'main' = 'otp'): string {
  return botType === 'otp' ? String(chatId).trim() : `${botType}:${String(chatId).trim()}`;
}

export async function getTelegramSession(
  chatId: string | number,
  botType: 'otp' | 'main' = 'otp'
): Promise<TelegramBotSession | null> {
  const key = sessionStorageKey(chatId, botType);
  if (!key) return null;

  // 1. Direct PostgreSQL first (survives Serverless cold starts / different Lambdas)
  try {
    const pgRes = await queryPostgres(
      `SELECT * FROM public.telegram_bot_sessions WHERE chat_id = $1 LIMIT 1`,
      [key]
    );
    const row = pgRes?.rows?.[0];
    if (row) {
      const expiresAt = Number(row.expires_at || 0);
      if (expiresAt > Date.now()) {
        const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
        return {
          chatId: String(chatId).trim(),
          botType,
          step: row.step,
          email: row.email || payload.email || undefined,
          otp: row.otp || payload.otp || undefined,
          tokenId: payload.tokenId,
          token: payload.token,
          userId: payload.userId,
          orderCode: payload.orderCode,
          promptMsgId: payload.promptMsgId,
          expiresAt,
          updatedAt: new Date(row.updated_at || Date.now()).getTime(),
        };
      }
      await queryPostgres(`DELETE FROM public.telegram_bot_sessions WHERE chat_id = $1`, [key]).catch(() => {});
      return null;
    }
  } catch {}

  // 2. Supabase REST fallback
  try {
    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin) {
      const { data } = await sbAdmin
        .from('telegram_bot_sessions')
        .select('*')
        .eq('chat_id', key)
        .maybeSingle();

      if (data && Number(data.expires_at) > Date.now()) {
        const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};
        return {
          chatId: String(chatId).trim(),
          botType,
          step: data.step,
          email: data.email || payload.email || undefined,
          otp: data.otp || payload.otp || undefined,
          tokenId: payload.tokenId,
          token: payload.token,
          userId: payload.userId,
          orderCode: payload.orderCode,
          promptMsgId: payload.promptMsgId,
          expiresAt: Number(data.expires_at),
          updatedAt: new Date(data.updated_at || Date.now()).getTime(),
        };
      }
    }
  } catch {}

  // 3. Local writable cache fallback
  const sessions = loadSessionsFromFile();
  const local = sessions[key];
  if (local) {
    if (Date.now() > local.expiresAt) {
      delete sessions[key];
      saveSessionsToFile(sessions);
      return null;
    }
    return local;
  }

  return null;
}

export async function setTelegramSession(
  chatId: string | number,
  data: Partial<Omit<TelegramBotSession, 'chatId' | 'updatedAt'>>,
  botType: 'otp' | 'main' = 'otp'
): Promise<TelegramBotSession> {
  const key = sessionStorageKey(chatId, botType);
  const sessions = loadSessionsFromFile();
  const existing = (await getTelegramSession(chatId, botType)) || sessions[key];

  const now = Date.now();
  const updated: TelegramBotSession = {
    chatId: String(chatId).trim(),
    botType,
    step: data.step ?? existing?.step ?? 'idle',
    email: data.email !== undefined ? data.email : existing?.email,
    otp: data.otp !== undefined ? data.otp : existing?.otp,
    tokenId: data.tokenId !== undefined ? data.tokenId : existing?.tokenId,
    token: data.token !== undefined ? data.token : existing?.token,
    userId: data.userId !== undefined ? data.userId : existing?.userId,
    orderCode: data.orderCode !== undefined ? data.orderCode : existing?.orderCode,
    promptMsgId: data.promptMsgId !== undefined ? data.promptMsgId : existing?.promptMsgId,
    expiresAt: data.expiresAt ?? now + SESSION_TTL_MS,
    updatedAt: now,
  };

  sessions[key] = updated;
  saveSessionsToFile(sessions);

  const payloadJson = {
    email: updated.email,
    otp: updated.otp,
    tokenId: updated.tokenId,
    token: updated.token,
    userId: updated.userId,
    orderCode: updated.orderCode,
    promptMsgId: updated.promptMsgId,
  };

  try {
    await queryPostgres(
      `INSERT INTO public.telegram_bot_sessions (chat_id, bot_type, step, email, otp, payload, expires_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
       ON CONFLICT (chat_id) DO UPDATE SET
         bot_type = EXCLUDED.bot_type,
         step = EXCLUDED.step,
         email = EXCLUDED.email,
         otp = EXCLUDED.otp,
         payload = EXCLUDED.payload,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [key, botType, updated.step, updated.email || null, updated.otp || null, JSON.stringify(payloadJson), updated.expiresAt]
    );
  } catch {}

  try {
    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin) {
      await sbAdmin.from('telegram_bot_sessions').upsert({
        chat_id: key,
        bot_type: botType,
        step: updated.step,
        email: updated.email || null,
        otp: updated.otp || null,
        payload: payloadJson,
        expires_at: updated.expiresAt,
        updated_at: new Date().toISOString(),
      });
    }
  } catch {}

  return updated;
}

export async function clearTelegramSession(
  chatId: string | number,
  botType: 'otp' | 'main' = 'otp'
): Promise<void> {
  const key = sessionStorageKey(chatId, botType);
  const sessions = loadSessionsFromFile();
  delete sessions[key];
  saveSessionsToFile(sessions);

  try {
    await queryPostgres(`DELETE FROM public.telegram_bot_sessions WHERE chat_id = $1`, [key]);
  } catch {}

  try {
    const sbAdmin = getSupabaseAdmin();
    if (sbAdmin) {
      await sbAdmin.from('telegram_bot_sessions').delete().eq('chat_id', key);
    }
  } catch {}
}
