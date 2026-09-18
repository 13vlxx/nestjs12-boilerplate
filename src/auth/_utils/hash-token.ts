import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Refresh tokens are long, high-entropy strings, so a plain SHA-256 is enough
 * to store them safely. Do NOT use bcrypt here: it silently truncates its
 * input to 72 bytes, and two JWTs for the same user share far more than that.
 */
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const tokenMatchesHash = (token: string, hash: string): boolean => {
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
};
