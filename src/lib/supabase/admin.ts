// ==============================================================================
// YUKI WEB V4 — ELEVATED ADMIN SUPABASE CLIENT (SERVER / WORKER ONLY)
// LAZY INITIALIZATION TO PREVENT BUILD-TIME SUPABASE_URL ERRORS ON VERCEL
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceKey, getSupabaseUrl } from '@/lib/supabase/env';

let _adminClient: SupabaseClient<any> | null = null;
let _adminCacheKey = '';

/**
 * Lazy-getter for elevated Supabase Admin client.
 * Reads environment variables only when called at request time.
 * Returns null if Supabase is not configured or in placeholder mode.
 */
export function getSupabaseAdmin(): SupabaseClient<any> | null {
  if (typeof window !== 'undefined') {
    throw new Error('SECURITY VIOLATION: getSupabaseAdmin() called in browser environment!');
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const cacheKey = `${supabaseUrl}::${serviceRoleKey.slice(-12)}`;
  if (!_adminClient || _adminCacheKey !== cacheKey) {
    _adminClient = createClient<any>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    _adminCacheKey = cacheKey;
  }

  return _adminClient;
}

/**
 * Throws a clear runtime error if Supabase credentials are missing on Vercel.
 */
export function getSupabaseAdminOrThrow(): SupabaseClient<any> {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error('Chưa cấu hình biến môi trường Supabase trên Vercel');
  }
  return client;
}

export function createAdminClient() {
  return getSupabaseAdmin();
}

/**
 * Safe proxy for backward compatibility.
 * Delegates to getSupabaseAdmin() lazily without throwing at build/import time.
 */
function createSafeDummyQuery() {
  const dummyResult = Promise.resolve({
    data: null,
    error: new Error('Chưa cấu hình biến môi trường Supabase trên Vercel'),
    count: null,
  });

  const chainable: any = {
    select: () => chainable,
    insert: () => chainable,
    update: () => chainable,
    upsert: () => chainable,
    delete: () => chainable,
    eq: () => chainable,
    neq: () => chainable,
    gt: () => chainable,
    gte: () => chainable,
    lt: () => chainable,
    lte: () => chainable,
    like: () => chainable,
    ilike: () => chainable,
    is: () => chainable,
    in: () => chainable,
    contains: () => chainable,
    containedBy: () => chainable,
    rangeGt: () => chainable,
    rangeGte: () => chainable,
    rangeLt: () => chainable,
    rangeLte: () => chainable,
    rangeAdjacent: () => chainable,
    overlaps: () => chainable,
    textSearch: () => chainable,
    match: () => chainable,
    not: () => chainable,
    or: () => chainable,
    filter: () => chainable,
    order: () => chainable,
    limit: () => chainable,
    range: () => chainable,
    abortSignal: () => chainable,
    single: () => dummyResult,
    maybeSingle: () => dummyResult,
    csv: () => dummyResult,
    then: dummyResult.then.bind(dummyResult),
    catch: dummyResult.catch.bind(dummyResult),
  };

  return chainable;
}

export const supabaseAdmin: SupabaseClient<any> = new Proxy({} as any, {
  get(_target, prop, receiver) {
    if (prop === 'then') return undefined; // Prevent awaiting proxy itself
    const client = getSupabaseAdmin();
    if (!client) {
      if (prop === 'from') {
        return () => createSafeDummyQuery();
      }
      if (prop === 'auth') {
        return {
          admin: {
            listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
            getUserById: () => Promise.resolve({ data: { user: null }, error: null }),
            updateUserById: () => Promise.resolve({ data: { user: null }, error: null }),
            createUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase chưa cấu hình') }),
            deleteUser: () => Promise.resolve({ data: null, error: null }),
          },
        };
      }
      return undefined;
    }
    const val = Reflect.get(client, prop, receiver);
    return typeof val === 'function' ? val.bind(client) : val;
  },
});
