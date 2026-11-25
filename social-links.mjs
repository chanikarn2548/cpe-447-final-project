// Zero-API-Key cross-app social link helpers for Pawtal
// Supports Instagram, TikTok, X (Twitter), Threads, LINE, Facebook, and public web links.

const TRACKING_PARAMS = new Set([
  'igsh', 'igshid', 'fbclid', 'gclid', 'si', 's', 't', '_r',
  'sender_device', 'sender_web_id', 'is_from_webapp', 'mibextid',
  'ref', 'ref_src', 'ref_url', 'utm_source', 'utm_medium',
  'utm_campaign', 'utm_term', 'utm_content', '__cft__[0]', '__tn__'
]);

const PLATFORM_DEFS = {
  instagram: { id: 'instagram', label: 'Instagram', badge: '📸 Instagram', colorClass: 'social-tag-ig', chipClass: 'ig' },
  tiktok:    { id: 'tiktok',    label: 'TikTok',    badge: '🎵 TikTok',    colorClass: 'social-tag-tt', chipClass: 'tt' },
  x:         { id: 'x',         label: 'X (Twitter)', badge: '𝕏 X',        colorClass: 'social-tag-x',  chipClass: 'x'  },
  threads:   { id: 'threads',   label: 'Threads',   badge: '🧵 Threads',   colorClass: 'social-tag-th', chipClass: 'th' },
  line:      { id: 'line',      label: 'LINE',      badge: '💚 LINE',      colorClass: 'social-tag-line', chipClass: 'line' },
  facebook:  { id: 'facebook',  label: 'Facebook',  badge: '📘 Facebook',  colorClass: 'fb-match-tag',  chipClass: 'fb' },
  web:       { id: 'web',       label: 'เว็บภายนอก', badge: '🌐 เว็บภายนอก', colorClass: 'social-tag-web', chipClass: 'web' }
};

const HOST_PLATFORM_MAP = [
  ['instagram', new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com', 'instagr.am'])],
  ['tiktok',    new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'])],
  ['x',         new Set(['x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'])],
  ['threads',   new Set(['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'])],
  ['line',      new Set(['line.me', 'openchat.line.me', 'liff.line.me', 'lin.ee', 'timeline.line.me', 'voom.line.me'])],
  ['facebook',  new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.com', 'www.fb.com', 'fb.watch'])]
];

const ALLOWED_PREVIEW_HOSTS = new Set([
  'instagram.com', 'www.instagram.com',
  'tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com',
  'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com',
  'threads.net', 'www.threads.net', 'threads.com', 'www.threads.com',
  'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'www.fb.com',
  'pantip.com', 'www.js100.com', 'fm91bkk.com', 'ifoundpet.com',
  'foundy.pet', 'www.kwanma.com', 'pawsociety.pet', 'petio.care',
  'www.petff.in.th', 'pethubthai.com', 'petfindhome.com', 'tagme.love'
]);

const SPECIES_LOST_HASHTAG = {
  cat: 'แมวหาย',
  dog: 'หมาหาย',
  bird: 'นกหาย',
  rabbit: 'กระต่ายหาย',
  hamster: 'แฮมสเตอร์หาย'
};

const SPECIES_ALT_SEARCH = {
  cat: 'แมวหาย',
  dog: 'สุนัขหาย',
  bird: 'นกหาย',
  rabbit: 'กระต่ายหาย',
  hamster: 'แฮมสเตอร์หาย'
};

function isPrivateOrLocalHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::1' || h === '[::1]') return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const parts = h.split('.').map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
  }
  return false;
}

export function normalizeSocialPostUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) return '';
  if (/^(?:www\.|m\.|vm\.|vt\.|web\.|mobile\.|openchat\.)?(?:instagram\.com|instagr\.am|tiktok\.com|x\.com|twitter\.com|threads\.(?:net|com)|line\.me|lin\.ee|facebook\.com|fb\.(?:com|watch))\//i.test(raw)) {
    raw = 'https://' + raw;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'https:' || isPrivateOrLocalHost(parsed.hostname)) return '';
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
      parsed.searchParams.delete(key);
    }
  }
  return parsed.href;
}

export function detectSocialPlatform(input) {
  const normalized = normalizeSocialPostUrl(input);
  if (!normalized) return null;
  const parsed = new URL(normalized);
  const host = parsed.hostname.toLowerCase();
  let def = PLATFORM_DEFS.web;
  for (const [key, hosts] of HOST_PLATFORM_MAP) {
    if (hosts.has(host)) {
      def = PLATFORM_DEFS[key];
      break;
    }
  }
  let handle = '';
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  if (def.id === 'tiktok' || def.id === 'threads') {
    const at = pathParts.find(p => p.startsWith('@'));
    if (at) handle = decodeURIComponent(at);
  } else if (def.id === 'x' && pathParts[0] && !['search', 'hashtag', 'i', 'explore', 'home', 'intent'].includes(pathParts[0].toLowerCase())) {
    handle = '@' + decodeURIComponent(pathParts[0]);
  } else if (def.id === 'instagram' && pathParts[0] && !['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'tv'].includes(pathParts[0].toLowerCase())) {
    handle = '@' + decodeURIComponent(pathParts[0]);
  }
  return { ...def, url: normalized, host, handle };
}

export function getPlatformPreset(presetKey) {
  const map = {
    __ig: PLATFORM_DEFS.instagram,
    __tiktok: PLATFORM_DEFS.tiktok,
    __x: PLATFORM_DEFS.x,
    __threads: PLATFORM_DEFS.threads,
    __line: PLATFORM_DEFS.line,
    __manual: PLATFORM_DEFS.facebook
  };
  return map[presetKey] || null;
}

function cleanQueryPart(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/ไม่ระบุ|ตัวอย่าง|ส่งต่อ|จากห้องตรวจจับ|ยังไม่ระบุชื่อ|ยังไม่ระบุบริเวณ/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCrossAppSearchLinks({ species = '', speciesLabel = '', breed = '', area = '' } = {}) {
  const sp = String(species || '').toLowerCase();
  const baseTag = SPECIES_LOST_HASHTAG[sp] || 'สัตว์เลี้ยงหาย';
  const baseWord = SPECIES_ALT_SEARCH[sp] || cleanQueryPart(speciesLabel) || 'สัตว์เลี้ยงหาย';
  const cleanArea = cleanQueryPart(area).slice(0, 36);
  const cleanBreed = cleanQueryPart(breed).slice(0, 32);

  const shortTerms = [...new Set([baseWord, cleanArea].filter(Boolean))];
  const fullTerms = [...new Set([baseWord, cleanBreed, cleanArea].filter(Boolean))];
  const xQuery = shortTerms.join(' ') || baseWord;
  const ttQuery = fullTerms.join(' ') || baseWord;
  const thQuery = shortTerms.join(' ') || baseWord;

  const igTag = baseTag;
  const igAreaNote = cleanArea ? ` · ${cleanArea}` : '';

  return [
    {
      id: 'instagram',
      platform: 'Instagram',
      icon: '📸',
      chipClass: 'ig',
      label: `📸 Instagram #${igTag}`,
      sublabel: cleanArea ? `แท็ก #${igTag}${igAreaNote}` : `เปิดดูโพสต์ #${igTag}`,
      query: `#${igTag}`,
      url: `https://www.instagram.com/explore/tags/${encodeURIComponent(igTag)}/`
    },
    {
      id: 'x',
      platform: 'X (Twitter)',
      icon: '𝕏',
      chipClass: 'x',
      label: `𝕏 X ล่าสุด “${xQuery}”`,
      sublabel: 'เรียงโพสต์ล่าสุด (Live)',
      query: xQuery,
      url: `https://x.com/search?q=${encodeURIComponent(xQuery)}&f=live`
    },
    {
      id: 'tiktok',
      platform: 'TikTok',
      icon: '🎵',
      chipClass: 'tt',
      label: `🎵 TikTok “${ttQuery}”`,
      sublabel: 'ค้นคลิปประกาศสัตว์หาย',
      query: ttQuery,
      url: `https://www.tiktok.com/search?q=${encodeURIComponent(ttQuery)}`
    },
    {
      id: 'threads',
      platform: 'Threads',
      icon: '🧵',
      chipClass: 'th',
      label: `🧵 Threads “${thQuery}”`,
      sublabel: 'ค้นโพสต์ชุมชน Threads',
      query: thQuery,
      url: `https://www.threads.net/search?q=${encodeURIComponent(thQuery)}&serp_type=default`
    }
  ];
}

export function isAllowedPreviewHost(hostname) {
  return ALLOWED_PREVIEW_HOSTS.has(String(hostname || '').toLowerCase());
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaTag(html, attrName, attrVal) {
  const escaped = attrVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`<meta[^>]+${attrName}=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attrName}=["']${escaped}["']`, 'i');
  const match = html.match(re1) || html.match(re2);
  return match ? decodeHtmlEntities(match[1]) : '';
}

function isGenericLoginTitle(title) {
  const t = String(title || '').trim().toLowerCase();
  if (!t || t.length < 3) return true;
  return /^(instagram|facebook|log in|login|sign in|x|twitter|threads|tiktok|เข้าสู่ระบบ|เข้าสู่ระบบ facebook|error|page not found)/.test(t);
}

export async function fetchSocialLinkPreview(rawUrl, fetchImpl = fetch) {
  const platform = detectSocialPlatform(rawUrl);
  if (!platform) {
    throw new Error('กรุณาวางลิงก์ที่ขึ้นต้นด้วย https:// (เช่น Instagram, TikTok, X, Threads, LINE หรือ Facebook)');
  }
  const base = {
    ok: true,
    url: platform.url,
    platform,
    title: '',
    author: platform.handle || '',
    description: '',
    previewRead: false,
    note: `ตรวจพบลิงก์ ${platform.badge}${platform.handle ? ` (${platform.handle})` : ''} · กด Ctrl+V วางภาพจากโพสต์เพื่อให้ AI เทียบได้ทันที`
  };

  if (!isAllowedPreviewHost(platform.host)) {
    return base;
  }

  // 1. Official zero-auth TikTok oEmbed endpoint
  if (platform.id === 'tiktok') {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(platform.url)}`;
      const res = await fetchImpl(oembedUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Pawtal-LostPet-Bridge/1.0' }
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const title = String(data?.title || '').trim().slice(0, 220);
        const author = String(data?.author_name || platform.handle || '').trim().slice(0, 80);
        if (title && !isGenericLoginTitle(title)) {
          return {
            ...base,
            title,
            author,
            description: title,
            previewRead: true,
            note: `อ่านหัวข้อจาก TikTok oEmbed สำเร็จ (${author || 'TikTok'}) · กด Ctrl+V วางภาพเพื่อสแกน AI ได้ทันที`
          };
        }
      }
    } catch {}
  }

  // 2. Public OpenGraph meta inspection (SSRF-safe allowlisted hosts only, bounded size)
  try {
    const res = await fetchImpl(platform.url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(4500),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Pawtal-LostPet-Preview/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    if (res.ok && String(res.headers?.get?.('content-type') || '').includes('text/html')) {
      const html = (await res.text()).slice(0, 220_000);
      const ogTitle = extractMetaTag(html, 'property', 'og:title') || extractMetaTag(html, 'name', 'twitter:title');
      const ogDesc = extractMetaTag(html, 'property', 'og:description') || extractMetaTag(html, 'name', 'description');
      const cleanTitle = isGenericLoginTitle(ogTitle) ? '' : ogTitle.slice(0, 220);
      const cleanDesc = isGenericLoginTitle(ogDesc) ? '' : ogDesc.slice(0, 320);
      if (cleanTitle || cleanDesc) {
        return {
          ...base,
          title: cleanTitle || cleanDesc.slice(0, 120),
          description: cleanDesc || cleanTitle,
          previewRead: true,
          note: `อ่านข้อความตัวอย่างจาก ${platform.badge} สำเร็จ · กด Ctrl+V วางภาพจากโพสต์เพื่อให้ AI เทียบได้ทันที`
        };
      }
    }
  } catch {}

  return {
    ...base,
    note: `ตรวจพบลิงก์ ${platform.badge}${platform.handle ? ` (${platform.handle})` : ''} แล้ว · แพลตฟอร์มนี้จำกัดการดึงข้อความอัตโนมัติ ให้กด Ctrl+V วางภาพ/แคปหน้าจอจากโพสต์ลงด้านล่างได้เลย`
  };
}
