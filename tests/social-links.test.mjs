import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  normalizeSocialPostUrl,
  detectSocialPlatform,
  buildCrossAppSearchLinks,
  fetchSocialLinkPreview,
  isAllowedPreviewHost
} from '../social-links.mjs';

test('normalizeSocialPostUrl & detectSocialPlatform identify IG, TikTok, X, Threads, LINE, Facebook and strip tracking', () => {
  const ig = detectSocialPlatform('instagram.com/p/C9abc123/?igsh=MzRlODBiNWFlZA==&utm_source=ig_web');
  assert.equal(ig.id, 'instagram');
  assert.equal(ig.badge, '📸 Instagram');
  assert.equal(ig.url, 'https://instagram.com/p/C9abc123/');

  const tt = detectSocialPlatform('https://www.tiktok.com/@petloverth/video/740123456789?is_from_webapp=1&sender_device=pc');
  assert.equal(tt.id, 'tiktok');
  assert.equal(tt.handle, '@petloverth');
  assert.equal(tt.url, 'https://www.tiktok.com/@petloverth/video/740123456789');

  const xPost = detectSocialPlatform('https://x.com/js100radio/status/1840001122?s=20&t=abc');
  assert.equal(xPost.id, 'x');
  assert.equal(xPost.handle, '@js100radio');
  assert.equal(xPost.url, 'https://x.com/js100radio/status/1840001122');

  const th = detectSocialPlatform('https://www.threads.net/@catfinder/post/DBxyz123');
  assert.equal(th.id, 'threads');
  assert.equal(th.handle, '@catfinder');

  const line = detectSocialPlatform('https://openchat.line.me/th/cover/abc123');
  assert.equal(line.id, 'line');

  const fb = detectSocialPlatform('https://www.facebook.com/groups/lostcatth/posts/999/?fbclid=xyz');
  assert.equal(fb.id, 'facebook');
  assert.equal(fb.url, 'https://www.facebook.com/groups/lostcatth/posts/999/');

  // Unsafe schemes and local/private hosts are rejected
  assert.equal(normalizeSocialPostUrl('javascript:alert(1)'), '');
  assert.equal(normalizeSocialPostUrl('http://127.0.0.1:4173/admin'), '');
  assert.equal(normalizeSocialPostUrl('https://192.168.1.1/secret'), '');
  assert.equal(normalizeSocialPostUrl('https://localhost/test'), '');
});

test('buildCrossAppSearchLinks generates 1-click Thai search URLs for IG, X Live, TikTok, and Threads', () => {
  const links = buildCrossAppSearchLinks({
    species: 'cat',
    speciesLabel: 'แมว',
    breed: 'สกอตติชโฟลด์ (Scottish Fold)',
    area: 'อารีย์'
  });
  assert.equal(links.length, 4);
  const byId = Object.fromEntries(links.map(l => [l.id, l]));

  assert.ok(byId.instagram.url.startsWith('https://www.instagram.com/explore/tags/'));
  assert.ok(decodeURIComponent(byId.instagram.url).includes('แมวหาย'));
  assert.ok(byId.x.url.includes('&f=live'));
  assert.ok(decodeURIComponent(byId.x.url).includes('แมวหาย อารีย์'));
  assert.ok(byId.tiktok.url.startsWith('https://www.tiktok.com/search?q='));
  assert.ok(decodeURIComponent(byId.tiktok.url).includes('สกอตติชโฟลด์'));
  assert.ok(byId.threads.url.startsWith('https://www.threads.net/search?q='));

  const dogLinks = buildCrossAppSearchLinks({ species: 'dog', area: 'เชียงใหม่' });
  assert.ok(decodeURIComponent(dogLinks[0].url).includes('หมาหาย'));
  const birdLinks = buildCrossAppSearchLinks({ species: 'bird', area: 'ลาดพร้าว' });
  assert.ok(decodeURIComponent(birdLinks[0].url).includes('นกหาย'));
});

test('fetchSocialLinkPreview reads TikTok oEmbed, falls back cleanly on IG login wall, and blocks unallowlisted SSRF hosts', async () => {
  // 1. TikTok official zero-auth oEmbed
  const ttPreview = await fetchSocialLinkPreview(
    'https://www.tiktok.com/@bkkcat/video/740001',
    async (url) => {
      assert.ok(url.startsWith('https://www.tiktok.com/oembed?url='));
      return {
        ok: true,
        async json() { return { title: 'ตามหาแมวส้มหายแถวอารีย์ #แมวหาย', author_name: 'bkkcat' }; }
      };
    }
  );
  assert.equal(ttPreview.previewRead, true);
  assert.equal(ttPreview.title, 'ตามหาแมวส้มหายแถวอารีย์ #แมวหาย');
  assert.equal(ttPreview.author, 'bkkcat');

  // 2. Instagram login wall returns graceful zero-crash fallback
  const igPreview = await fetchSocialLinkPreview(
    'https://www.instagram.com/p/C9lostcat/',
    async () => ({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      async text() { return '<html><head><meta property="og:title" content="Instagram"></head></html>'; }
    })
  );
  assert.equal(igPreview.ok, true);
  assert.equal(igPreview.platform.id, 'instagram');
  assert.equal(igPreview.previewRead, false);
  assert.ok(igPreview.note.includes('Ctrl+V'));

  // 3. Non-allowlisted host does NOT invoke network fetch (SSRF protection)
  assert.equal(isAllowedPreviewHost('evil.example'), false);
  let called = false;
  const extPreview = await fetchSocialLinkPreview('https://example.org/lost-cat', async () => {
    called = true;
    throw new Error('Should not fetch non-allowlisted host');
  });
  assert.equal(called, false);
  assert.equal(extPreview.ok, true);
  assert.equal(extPreview.platform.id, 'web');
});

test('matching.js renders Cross-App Social Strip and Instagram platform badge on imported social match rows', () => {
  const source = fs.readFileSync(new URL('../matching.js', import.meta.url), 'utf8');
  const render = source.slice(source.indexOf('function renderMatchPage('), source.indexOf('async function matchCase('));
  const cards = source.slice(source.indexOf('function matchingRows('), source.indexOf('async function matchImageAutomatically('));
  const s = {
    matchReview: {
      item: { id: 'q', species: 'cat', kind: 'Bengal', area: 'อารีย์' },
      allRows: [
        { id: 'ig-1', name: 'แมวส้มจากไอจี', image: 'ig.jpg', score: 0.91, sourceLink: 'https://www.instagram.com/p/C9demo/', origin: '📸 Instagram', recordType: 'case' }
      ],
      external: { linkedGroups: [] },
      failed: 0,
      localError: ''
    },
    escapeHtml: String,
    safeExternalUrl: u => u || '',
    speciesIcon: () => '🐱',
    speciesName: () => 'แมว',
    openMatchResults: (title, hint, html) => { s.output = { title, hint, html }; }
  };
  vm.runInNewContext(cards + render, s);
  s.renderMatchPage(5);
  assert.ok(s.output.html.includes('social-cross-strip'));
  assert.ok(s.output.html.includes('instagram.com/explore/tags/'));
  assert.ok(s.output.html.includes('x.com/search?q='));
  assert.ok(s.output.html.includes('tiktok.com/search?q='));
  assert.ok(s.output.html.includes('threads.net/search?q='));
  assert.ok(s.output.html.includes('📸 Instagram'));
});
