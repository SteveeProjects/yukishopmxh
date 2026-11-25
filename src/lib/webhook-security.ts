import crypto from 'crypto';

/**
 * Constant-time webhook secret verification.
 * Always fails closed when no expected secret is configured, and hashes both values
 * before timingSafeEqual so secret length is never leaked via timing.
 */
export function verifySecretHeader(
  providedSecret: string | null | undefined,
  configuredSecret: string | null | undefined
): boolean {
  const expected = String(configuredSecret || '').trim();
  const provided = String(providedSecret || '').trim();

  if (!expected || !provided) {
    return false;
  }

  try {
    const expectedHash = crypto.createHash('sha256').update(expected, 'utf8').digest();
    const providedHash = crypto.createHash('sha256').update(provided, 'utf8').digest();
    return crypto.timingSafeEqual(providedHash, expectedHash);
  } catch {
    return false;
  }
}
