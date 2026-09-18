import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const generateToken = (): string =>
  randomBytes(32).toString('base64url');

// Tokens are long, high-entropy strings: SHA-256 is enough and, unlike bcrypt,
// does not truncate its input to 72 bytes (two JWTs share a longer prefix).
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const tokenMatchesHash = (token: string, hash: string): boolean => {
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
};
