import crypto from 'node:crypto';

/**
 * Validate raw binary image magic bytes before decoding with Sharp.
 * Accepts JPEG, PNG, WebP, GIF, and ISO-BMFF (HEIC/AVIF) signatures only.
 */
export function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png';
  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp';
  // GIF: GIF87a / GIF89a
  const head6 = buffer.subarray(0, 6).toString('ascii');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'image/gif';
  // AVIF / HEIC: ....ftyp(avif|avis|heic|heix|mif1)
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    if (['avif', 'avis', 'heic', 'heix', 'hevc', 'mif1'].includes(brand)) return 'image/avif';
  }
  return null;
}

export function assertValidImageBuffer(buffer) {
  const mime = detectImageMime(buffer);
  if (!mime) {
    const err = new Error('ไฟล์ที่อัปโหลดไม่ใช่รูปภาพที่รองรับ (รองรับเฉพาะ JPG, PNG, WebP, GIF)');
    err.statusCode = 400;
    throw err;
  }
  return mime;
}

/** Sliding-window in-memory rate limiter keyed by client IP and bucket name. */
export function createRateLimiter({ windowMs = 60_000, max = 30 } = {}) {
  const buckets = new Map();
  return function checkLimit(ipKey = 'local', now = Date.now()) {
    const key = String(ipKey || 'local');
    const cutoff = now - windowMs;
    const prev = (buckets.get(key) || []).filter((ts) => ts > cutoff);
    if (prev.length >= max) {
      const oldest = prev[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      buckets.set(key, prev);
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    prev.push(now);
    buckets.set(key, prev);
    if (buckets.size > 1000) {
      for (const [k, list] of buckets.entries()) {
        if (!list.length || list[list.length - 1] <= cutoff) buckets.delete(k);
      }
    }
    return { allowed: true, remaining: Math.max(0, max - prev.length), retryAfterSec: 0 };
  };
}

/** Validate 4-6 digit owner PIN format. */
export function isValidOwnerPin(pin) {
  return /^\d{4,6}$/.test(String(pin || '').trim());
}

/** Hash an optional 4-6 digit Owner PIN using per-record random salt + scrypt. */
export function hashOwnerPin(pin) {
  const clean = String(pin || '').trim();
  if (!clean) return '';
  if (!isValidOwnerPin(clean)) {
    const err = new Error('รหัส PIN เจ้าของประกาศต้องเป็นตัวเลข 4–6 หลัก');
    err.statusCode = 400;
    throw err;
  }
  const salt = crypto.randomBytes(12).toString('hex');
  const derived = crypto.scryptSync(clean, salt, 32).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

/** Constant-time verification of a 4-6 digit Owner PIN against its stored hash. */
export function verifyOwnerPin(pin, storedHash) {
  const hashStr = String(storedHash || '');
  if (!hashStr) return true;
  const clean = String(pin || '').trim();
  if (!clean || !hashStr.startsWith('scrypt:')) return false;
  const parts = hashStr.split(':');
  if (parts.length !== 3) return false;
  const [, salt, expectedHex] = parts;
  try {
    const derived = crypto.scryptSync(clean, salt, 32);
    const expected = Buffer.from(expectedHex, 'hex');
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
