import crypto from 'crypto';

const SALT = process.env.PASSWORD_SALT || process.env.SESSION_SECRET || 'yuki_salt_2026_mxh';

/**
 * Generates secure PBKDF2 hash for a password.
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  return crypto.pbkdf2Sync(password, SALT, 10000, 32, 'sha512').toString('hex');
}

/**
 * Safely verifies a password against stored hash or plaintext with timing-safe comparison.
 */
export function verifyPassword(password: string, storedHashOrPlain?: string | null): boolean {
  if (!storedHashOrPlain || !password) return false;

  // 1. Direct plaintext match (for legacy local store compatibility)
  if (storedHashOrPlain === password) return true;

  // 2. PBKDF2 SHA-512 match
  const computedPbkdf2 = hashPassword(password);
  if (computedPbkdf2.length === storedHashOrPlain.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(computedPbkdf2, 'utf8'), Buffer.from(storedHashOrPlain, 'utf8'))) {
        return true;
      }
    } catch {}
  }

  // 3. Simple SHA-256 match
  const sha256 = crypto.createHash('sha256').update(password).digest('hex');
  if (sha256.length === storedHashOrPlain.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(sha256, 'utf8'), Buffer.from(storedHashOrPlain, 'utf8'))) {
        return true;
      }
    } catch {}
  }

  return false;
}
