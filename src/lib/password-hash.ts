import crypto from 'crypto';

const PBKDF2_PREFIX = 'pbkdf2_sha512$';
const PBKDF2_ITERATIONS = 10000;
const PBKDF2_KEYLEN = 64;
const LEGACY_SALT =
  process.env.PASSWORD_SALT || process.env.SESSION_SECRET || 'yuki_salt_2026_mxh';

function timingSafeCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Hashes a plaintext password using PBKDF2-SHA512 with a per-password 16-byte random salt.
 * Self-contained format: `pbkdf2_sha512$<saltHex>$<hashHex>` (independent of SESSION_SECRET).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, 'sha512')
    .toString('hex');
  return `${PBKDF2_PREFIX}${salt}$${hash}`;
}

export function needsPasswordRehash(storedHash?: string | null): boolean {
  return !storedHash || !storedHash.startsWith(PBKDF2_PREFIX);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith(PBKDF2_PREFIX)) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    if (!salt || !expectedHex || !/^[a-f0-9]+$/i.test(expectedHex)) return false;

    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (expectedBuf.length === 0) return false;
    const derived = crypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      expectedBuf.length,
      'sha512'
    );
    return timingSafeCompare(derived, expectedBuf);
  }

  // Legacy 64-char hex digests (raw SHA-256 or legacy static-salt PBKDF2-SHA512-32B)
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const expectedBuf = Buffer.from(storedHash, 'hex');
    const sha256Buf = crypto.createHash('sha256').update(password).digest();
    if (timingSafeCompare(sha256Buf, expectedBuf)) {
      return true;
    }

    const legacyPbkdf2Buf = crypto.pbkdf2Sync(
      password,
      LEGACY_SALT,
      PBKDF2_ITERATIONS,
      32,
      'sha512'
    );
    return timingSafeCompare(legacyPbkdf2Buf, expectedBuf);
  }

  // Fallback for legacy unhashed records
  return timingSafeCompare(Buffer.from(password, 'utf8'), Buffer.from(storedHash, 'utf8'));
}
