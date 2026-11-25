// ==============================================================================
// YUKISHOPMXH — IN-MEMORY SLIDING WINDOW RATE LIMITER (DDOS & BRUTE-FORCE SHIELD)
// Zero external dependencies, pure memory sliding window, automatic pruning
// ==============================================================================

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();
const MAX_STORE_SIZE = 3000;

function cleanupOldEntries(now: number) {
  for (const [key, record] of memoryStore.entries()) {
    if (
      record.timestamps.length === 0 ||
      now - record.timestamps[record.timestamps.length - 1] > 300000
    ) {
      memoryStore.delete(key);
    }
  }
}

export type RateLimitCategory = 'SENSITIVE' | 'AUTH' | 'LOOKUP' | 'TRANSACTION' | 'API_READ' | 'GENERAL';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  limit: number;
}

/**
 * Checks and updates sliding-window rate limit for a client IP (60s window):
 * - SENSITIVE / AUTH / TRANSACTION / SPIN: 15 req / min (Nhóm nhạy cảm: /api/auth/*, /api/spin/*, /api/orders/*, /api/affiliate/*)
 * - LOOKUP: 20 req / min (/api/orders/lookup, /api/warranty/claim, /api/coupons/validate)
 * - GENERAL / API_READ: 90 req / min (API chung)
 * - Webhooks (/api/telegram/*, /api/webhook/*): 100% exempt
 */
export function checkRateLimit(
  ip: string,
  category: RateLimitCategory
): RateLimitResult {
  const now = Date.now();
  const windowMs = 60000;

  if (memoryStore.size > MAX_STORE_SIZE) {
    cleanupOldEntries(now);
  }

  let limit = 90; // Default General API: 90 req / min / IP
  if (category === 'SENSITIVE' || category === 'AUTH' || category === 'TRANSACTION') {
    limit = 15; // Sensitive endpoints: max 15 req / min / IP
  } else if (category === 'LOOKUP') {
    limit = 20;
  } else if (category === 'API_READ' || category === 'GENERAL') {
    limit = 90;
  }

  const key = `${category}:${ip}`;
  let record = memoryStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
      limit,
    };
  }

  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetSeconds: 60,
    limit,
  };
}
