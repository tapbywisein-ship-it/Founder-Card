import crypto from 'crypto';

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const BASE = ALPHABET.length; // 62

function toBase62(buf: Buffer): string {
  let n = BigInt('0x' + buf.toString('hex'));
  if (n === 0n) return ALPHABET[0];
  let out = '';
  const baseBig = BigInt(BASE);
  while (n > 0n) {
    out = ALPHABET[Number(n % baseBig)] + out;
    n = n / baseBig;
  }
  return out;
}

/**
 * Derive a stable 8-char base62 slug for a FounderCard.
 *
 * Slug is HMAC-SHA256(secret, cardId) → first 6 bytes → base62. The internal
 * UUID is not recoverable from the public URL, and 62^8 ≈ 2.18e14 keeps the
 * collision probability vanishing at our scale. The slug is stored on the
 * FounderCard row at create time and queried by unique index.
 */
export function cardIdToSlug(cardId: string): string {
  const secret = process.env.CARD_SLUG_SECRET || 'founderkey-card-slug-v1';
  const digest = crypto.createHmac('sha256', secret).update(cardId).digest();
  const slug = toBase62(digest.subarray(0, 6));
  return slug.padStart(8, ALPHABET[0]).slice(-8);
}

/** Generate a short random URL-safe token (used for Event.checkInToken). */
export function randomShortToken(bytes = 9): string {
  return toBase62(crypto.randomBytes(bytes));
}
