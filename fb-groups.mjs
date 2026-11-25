// Pure helpers for validating and linking Facebook Groups/Pages without scraping or auth bypass.

const FB_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.com',
  'www.fb.com'
]);

const DISALLOWED_SLUGS = new Set([
  'login',
  'login.php',
  'reg',
  'recover',
  'dialog',
  'sharer',
  'share',
  'share.php',
  'plugins',
  'privacy',
  'policies',
  'help'
]);

export function normalizeFacebookGroupUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('กรุณาวางลิงก์กลุ่มหรือเพจ Facebook');
  if (/^(?:www\.|m\.|web\.)?(?:facebook|fb)\.com\//i.test(raw)) {
    raw = 'https://' + raw;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('รูปแบบลิงก์ไม่ถูกต้อง กรุณาวางลิงก์ขึ้นต้นด้วย https://www.facebook.com/...');
  }
  if (parsed.protocol !== 'https:' || !FB_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error('รองรับเฉพาะลิงก์ https://www.facebook.com/... เท่านั้น');
  }

  const cleanPath = parsed.pathname.replace(/\/+$/, '');
  const groupMatch = cleanPath.match(/^\/groups\/([^/?#]+)/i);
  if (groupMatch) {
    const slug = decodeURIComponent(groupMatch[1]);
    if (!slug || DISALLOWED_SLUGS.has(slug.toLowerCase())) {
      throw new Error('ไม่พบรหัสกลุ่มในลิงก์ Facebook นี้');
    }
    const url = `https://www.facebook.com/groups/${encodeURIComponent(slug)}/`;
    const isNumeric = /^\d+$/.test(slug);
    const defaultName = isNumeric ? `กลุ่ม Facebook (${slug})` : slug.replace(/[-_.]+/g, ' ').trim();
    return { url, kind: 'group', slug, defaultName };
  }

  const pageMatch = cleanPath.match(/^\/([^/?#]+)(?:\/posts\/[^/?#]+)?$/i);
  if (pageMatch) {
    const slug = decodeURIComponent(pageMatch[1]);
    if (!slug || DISALLOWED_SLUGS.has(slug.toLowerCase())) {
      throw new Error('ลิงก์นี้ไม่ใช่หน้ากลุ่มหรือเพจ Facebook');
    }
    const url = `https://www.facebook.com/${encodeURIComponent(slug)}/`;
    const defaultName = slug.replace(/[-_.]+/g, ' ').trim();
    return { url, kind: 'page', slug, defaultName };
  }

  throw new Error('กรุณาวางลิงก์หน้าหลักของกลุ่ม เช่น https://www.facebook.com/groups/ชื่อกลุ่ม หรือลิงก์เพจ');
}

export function buildGroupSearchUrl(groupUrl, { query = '', speciesLabel = '', breed = '', area = '' } = {}) {
  const cleanUrl = String(groupUrl || '').trim();
  if (!cleanUrl) return 'https://www.facebook.com/';
  let parsed;
  try {
    parsed = new URL(cleanUrl);
  } catch {
    return 'https://www.facebook.com/';
  }
  if (parsed.protocol !== 'https:' || !FB_HOSTS.has(parsed.hostname.toLowerCase())) {
    return 'https://www.facebook.com/';
  }

  const cleanBreed = String(breed || '').replace(/\([^)]*\)/g, '').trim();
  const terms = [speciesLabel, cleanBreed, area, query]
    .map(v => String(v || '').trim())
    .filter(v => v && !/ไม่ระบุ|ตัวอย่าง|ส่งต่อ|จากห้องตรวจจับ/.test(v));
  const searchQuery = [...new Set(terms)].join(' ').slice(0, 100).trim();

  const groupMatch = parsed.pathname.match(/^\/groups\/([^/?#]+)/i);
  if (groupMatch && searchQuery) {
    return `https://www.facebook.com/groups/${groupMatch[1]}/search/?q=${encodeURIComponent(searchQuery)}`;
  }
  return cleanUrl;
}
