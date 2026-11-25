// ==============================================================================
// YUKISHOPMXH — LAZY SUPABASE & POSTGRES ENV RESOLUTION (VERCEL SAFE)
// ==============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getSupabaseUrl(): string {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim();
  if (!url || url.includes('placeholder')) return '';
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();
  if (!key || key.includes('placeholder')) return '';
  return key;
}

export function getSupabaseServiceKey(): string {
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  ).trim();
  if (!key || key.includes('placeholder')) return '';
  return key;
}

export function getPostgresRawUrl(): string {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim();
}

/**
 * Strips conflicting sslmode / sslrootcert / sslcert / sslkey params from remote Postgres URLs
 * so node-postgres pg.Pool works cleanly with `ssl: { rejectUnauthorized: false }` on Vercel.
 */
export function normalizePostgresSslUrl(rawUrl: string): string {
  const clean = String(rawUrl || '').trim();
  if (!clean) return '';
  if (clean.includes('localhost') || clean.includes('127.0.0.1')) return clean;

  try {
    const parsed = new URL(clean);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('sslrootcert');
    parsed.searchParams.delete('sslcert');
    parsed.searchParams.delete('sslkey');
    parsed.searchParams.delete('uselibpqcompat');
    return parsed.toString();
  } catch {
    return clean
      .replace(/([?&])(sslmode|sslrootcert|sslcert|sslkey|uselibpqcompat)=[^&]*/gi, '$1')
      .replace(/[?&]+$/, '')
      .replace(/\?&/, '?');
  }
}

export function isUuid(val: unknown): boolean {
  return UUID_REGEX.test(String(val || '').trim());
}
