import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  detectImageMime,
  assertValidImageBuffer,
  createRateLimiter,
  isValidOwnerPin,
  hashOwnerPin,
  verifyOwnerPin
} from '../security.mjs';
import { haversineKm, parseAgeDays, computeHybridScore } from '../hybrid-ranking.mjs';
import { analyzeCoatPattern } from '../coat-tagging.mjs';
import { createBackgroundWorker } from '../background-worker.mjs';
import { encodeQrMatrix, buildPosterHeadline, inferBehaviorBadge, resolvePosterBaseUrl } from '../poster-generator.mjs';

test('Magic bytes image validation accepts real image headers and blocks non-images', async () => {
  const pngBuf = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: 200, g: 120, b: 40 } } }).png().toBuffer();
  const jpgBuf = await sharp(pngBuf).jpeg().toBuffer();
  const webpBuf = await sharp(pngBuf).webp().toBuffer();
  const gifBuf = Buffer.from('GIF89a0123456789');

  assert.equal(detectImageMime(pngBuf), 'image/png');
  assert.equal(detectImageMime(jpgBuf), 'image/jpeg');
  assert.equal(detectImageMime(webpBuf), 'image/webp');
  assert.equal(detectImageMime(gifBuf), 'image/gif');
  assert.equal(assertValidImageBuffer(jpgBuf), 'image/jpeg');

  for (const bad of [
    Buffer.from('<html><script>alert(1)</script></html>'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    Buffer.from('short'),
    Buffer.alloc(0)
  ]) {
    assert.equal(detectImageMime(bad), null);
    assert.throws(() => assertValidImageBuffer(bad), (err) => err.statusCode === 400);
  }
});

test('Sliding-window rate limiter enforces quota and recovers after window elapses', () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 3 });
  assert.equal(limiter('1.2.3.4', 100).allowed, true);
  assert.equal(limiter('1.2.3.4', 200).allowed, true);
  assert.equal(limiter('1.2.3.4', 300).allowed, true);
  const blocked = limiter('1.2.3.4', 400);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSec >= 1);

  // Separate IP is unaffected
  assert.equal(limiter('5.6.7.8', 400).allowed, true);
  // Original IP recovers after oldest timestamp exits 1000ms window
  assert.equal(limiter('1.2.3.4', 1105).allowed, true);
});

test('Owner PIN hashing validates 4-6 digit format and uses salted scrypt verification', () => {
  assert.equal(isValidOwnerPin('1234'), true);
  assert.equal(isValidOwnerPin('987654'), true);
  assert.equal(isValidOwnerPin('123'), false);
  assert.equal(isValidOwnerPin('1234567'), false);
  assert.equal(isValidOwnerPin('12ab'), false);

  assert.throws(() => hashOwnerPin('abc'), (err) => err.statusCode === 400);
  const h1 = hashOwnerPin('2468');
  const h2 = hashOwnerPin('2468');
  assert.ok(h1.startsWith('scrypt:'));
  assert.notEqual(h1, h2); // unique random salt per hash
  assert.equal(verifyOwnerPin('2468', h1), true);
  assert.equal(verifyOwnerPin('2469', h1), false);
  assert.equal(verifyOwnerPin('', h1), false);
  assert.equal(verifyOwnerPin('', ''), true); // unprotected legacy case
});

test('Hybrid ranking re-ranks near & recent match above slightly higher visual match across regions', () => {
  const distSame = haversineKm(13.78, 100.545, 13.785, 100.55);
  assert.ok(distSame !== null && distSame < 2);
  const distChiangMai = haversineKm(13.78, 100.545, 18.788, 98.985);
  assert.ok(distChiangMai !== null && distChiangMai > 500);

  const now = Date.UTC(2026, 10, 23, 12, 0, 0);
  assert.ok(parseAgeDays('พบวันนี้ · 10:00 น.', now) < 1);
  assert.equal(parseAgeDays('หายเมื่อวาน', now), 1);
  assert.equal(parseAgeDays('3 วันที่แล้ว', now), 3);
  assert.ok(Math.abs(parseAgeDays('20 พ.ย. 2569', now) - 3.5) < 1);

  const nearRecent = computeHybridScore(0.85, { area: 'อารีย์, พญาไท' }, { area: 'สะพานควาย, พญาไท', when: 'พบวันนี้' }, now);
  const farOld = computeHybridScore(0.88, { area: 'อารีย์, พญาไท' }, { area: 'เชียงใหม่', createdAt: '2026-06-01T00:00:00Z' }, now);

  assert.ok(nearRecent.score > farOld.score, `Expected near+recent (${nearRecent.score}) > far+old (${farOld.score})`);
  assert.ok(nearRecent.distanceKm !== null && nearRecent.distanceKm < 5);
  assert.ok(nearRecent.badge.includes('📍'));
  assert.ok(nearRecent.badge.includes('🕒'));

  const unknownArea = computeHybridScore(0.75, { area: '' }, { area: 'ไม่ระบุ' }, now);
  assert.equal(unknownArea.score, 0.75);
  assert.equal(unknownArea.distanceKm, null);

  // Real GPS lat/lon overrides empty area text and computes sub-km precision
  const gpsNear = computeHybridScore(0.80, { lat: 13.7800, lon: 100.5450 }, { lat: 13.7820, lon: 100.5460 }, now);
  assert.ok(gpsNear.distanceKm !== null && gpsNear.distanceKm < 0.5);
  assert.ok(gpsNear.score > 0.84);
  assert.ok(gpsNear.badge.includes('พื้นที่เดียวกัน'));
});

test('Coat pattern analyzer classifies Thai mixed-breed solid, bicolor, and calico coats', async () => {
  // Pure orange cat buffer
  const orangeBuf = await sharp({ create: { width: 96, height: 96, channels: 3, background: { r: 220, g: 120, b: 35 } } }).png().toBuffer();
  const orange = await analyzeCoatPattern(orangeBuf);
  assert.ok(orange.primaryTag.includes('ส้ม'), `Got: ${orange.primaryTag}`);

  // Tuxedo black + white buffer
  const w = 96, h = 96;
  const tuxRaw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      const isWhite = x >= w / 2;
      tuxRaw[idx] = isWhite ? 245 : 22;
      tuxRaw[idx + 1] = isWhite ? 245 : 22;
      tuxRaw[idx + 2] = isWhite ? 245 : 22;
    }
  }
  const tuxBuf = await sharp(tuxRaw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  const tux = await analyzeCoatPattern(tuxBuf);
  assert.ok(tux.primaryTag.includes('ขาว-ดำ'), `Got: ${tux.primaryTag}`);

  // Calico (white + black + orange) buffer
  const calicoRaw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      if (x < w / 3) { calicoRaw[idx] = 248; calicoRaw[idx + 1] = 248; calicoRaw[idx + 2] = 248; }
      else if (x < (2 * w) / 3) { calicoRaw[idx] = 20; calicoRaw[idx + 1] = 20; calicoRaw[idx + 2] = 20; }
      else { calicoRaw[idx] = 230; calicoRaw[idx + 1] = 125; calicoRaw[idx + 2] = 30; }
    }
  }
  const calicoBuf = await sharp(calicoRaw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  const calico = await analyzeCoatPattern(calicoBuf);
  assert.ok(calico.primaryTag.includes('สามสี'), `Got: ${calico.primaryTag}`);
});

test('Pure-JS ISO 18004 QR code encoder builds valid finder, timing, dark module, and multi-block V6 matrices', () => {
  for (const text of [
    'https://pawtal.app/?case=1',
    'http://127.0.0.1:4173/?case=tungthong',
    'https://pawtal-production.up.railway.app/?case=case-1794935438323-very-long-identifier-for-version6-check-1234567890'
  ]) {
    const qr = encodeQrMatrix(text);
    assert.equal(qr.modules.length, qr.size);
    assert.ok(qr.modules.every((row) => row.length === qr.size));
    assert.ok(qr.version >= 1 && qr.version <= 6);
    // Verify 3 finder corners have dark outer border and 3x3 dark core
    for (const [r0, c0] of [[0, 0], [0, qr.size - 7], [qr.size - 7, 0]]) {
      assert.equal(qr.modules[r0][c0], 1);
      assert.equal(qr.modules[r0 + 3][c0 + 3], 1);
      assert.equal(qr.modules[r0 + 1][c0 + 1], 0);
    }
    // Verify mandatory ISO dark module at (size - 8, 8)
    assert.equal(qr.modules[qr.size - 8][8], 1);
    // Verify alternating timing pattern on row 6
    assert.equal(qr.modules[6][8], 1);
    assert.equal(qr.modules[6][9], 0);
  }
});

test('Poster intelligence generates 1-second species headlines, behavior warnings, and public QR base URLs', () => {
  assert.equal(buildPosterHeadline({ species: 'dog', type: 'lost' }), 'สุนัขหาย!');
  assert.equal(buildPosterHeadline({ species: 'cat', type: 'lost' }), 'แมวหาย!');
  assert.equal(buildPosterHeadline({ species: 'bird', type: 'found' }), 'พบนกพลัดหลง');

  const shy = inferBehaviorBadge({ name: 'ถุงทอง', description: 'หางงอเล็กน้อย ขี้กลัวแต่เป็นมิตร' });
  assert.equal(shy.tone, 'warn');
  assert.ok(shy.text.includes('ห้ามวิ่งไล่'));

  const friendly = inferBehaviorBadge({ name: 'ส้มจี๊ด', description: 'เชื่อง เป็นมิตร ชอบเข้าหาคน' });
  assert.equal(friendly.tone, 'safe');
  assert.ok(friendly.text.includes('ส้มจี๊ด'));

  const localRes = resolvePosterBaseUrl({ publicBaseUrl: '', locationOrigin: 'http://127.0.0.1:4173' });
  assert.equal(localRes.isPublicFallback, true);
  assert.ok(localRes.baseUrl.startsWith('https://'));
  assert.ok(!localRes.baseUrl.includes('127.0.0.1'));

  const prodRes = resolvePosterBaseUrl({ publicBaseUrl: 'https://pawtal.th/', locationOrigin: 'http://127.0.0.1:4173' });
  assert.equal(prodRes.isPublicFallback, false);
  assert.equal(prodRes.baseUrl, 'https://pawtal.th');
});

test('Background pre-embedding worker warms only uncached posts and tracks run metrics', async () => {
  const store = new Map();
  store.set('v5-resmlp:pet-base:cat:https://cached.invalid/1.jpg', [1, 0, 0]);
  const origFetch = globalThis.fetch;
  let fetched = 0, embedded = 0;
  globalThis.fetch = async () => {
    fetched++;
    return new Response(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]));
  };
  try {
    const worker = createBackgroundWorker({
      collectSources: async () => ({
        posts: [
          { species: 'cat', image: 'https://cached.invalid/1.jpg' },
          { species: 'dog', image: 'https://new.invalid/2.jpg' }
        ]
      }),
      syncDiscoveredFacebookGroups: () => 0,
      getDiscoveredFacebookGroups: () => [],
      matchingEmbedding: async () => { embedded++; return [0.5, 0.5, 0.707]; },
      cacheStore: { get: (k) => store.get(k) || null, set: (k, _m, _s, v) => store.set(k, v) },
      maxNewPerRun: 5
    });
    const status = await worker.runOnce();
    assert.equal(fetched, 1);
    assert.equal(embedded, 1);
    assert.equal(status.runsCompleted, 1);
    assert.equal(status.lastPostsScanned, 2);
    assert.equal(status.lastCachedNewVectors, 1);
    assert.ok(store.has('v5-resmlp:pet-base:dog:https://new.invalid/2.jpg'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('Frontend save() syncs newly passed cases/sightings/profiles immediately before state mutation', async () => {
  const fs = await import('node:fs');
  const vm = await import('node:vm');
  const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('function save('), src.indexOf('function escapeHtml('));
  let postedBody = null;
  let badgeRefreshed = false;
  const ctx = {
    STORE: 'test',
    state: { cases: [{ id: 'old-1', isDemo: false }], sightings: [], profiles: [] },
    localStorage: { setItem: () => {} },
    refreshAlertBadge: () => { badgeRefreshed = true; },
    showToast: () => {},
    fetch: async (_url, opts) => {
      postedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ cases: [], alertsTriggered: 1 }) };
    }
  };
  vm.runInNewContext(fn, ctx);
  const nextCases = [{ id: 'brand-new-cat', species: 'cat', area: 'อารีย์' }, ...ctx.state.cases];
  assert.equal(ctx.save('cases', nextCases), true);
  await new Promise((r) => setTimeout(r, 15));
  assert.ok(postedBody.cases.some((c) => c.id === 'brand-new-cat'), 'POST /api/database must receive the newly submitted case immediately');
  assert.equal(badgeRefreshed, true);
});
