import { resolveAreaLocation } from './case-map.mjs';

const EARTH_RADIUS_KM = 6371;
const THAI_MONTHS = {
  'ม.ค.': 0, 'มกราคม': 0, 'ก.พ.': 1, 'กุมภาพันธ์': 1, 'มี.ค.': 2, 'มีนาคม': 2,
  'เม.ย.': 3, 'เมษายน': 3, 'พ.ค.': 4, 'พฤษภาคม': 4, 'มิ.ย.': 5, 'มิถุนายน': 5,
  'ก.ค.': 6, 'กรกฎาคม': 6, 'ส.ค.': 7, 'สิงหาคม': 7, 'ก.ย.': 8, 'กันยายน': 8,
  'ต.ค.': 9, 'ตุลาคม': 9, 'พ.ย.': 10, 'พฤศจิกายน': 10, 'ธ.ค.': 11, 'ธันวาคม': 11
};

/** Compute great-circle distance in kilometers using the Haversine formula. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

/** Parse ISO timestamp, Thai relative phrases, or Thai calendar dates into age in days. */
export function parseAgeDays(text, nowMs = Date.now()) {
  const raw = String(text || '').trim();
  if (!raw || /ไม่ระบุ/.test(raw)) return null;
  if (/เมื่อสักครู่|วันนี้|ตอนนี้|ไม่กี่นาที|ชั่วโมง/.test(raw)) return 0.2;
  if (/เมื่อวาน/.test(raw)) return 1;
  const relDays = raw.match(/(\d+)\s*วัน/);
  if (relDays) return Math.max(0, Number(relDays[1]));
  const relWeeks = raw.match(/(\d+)\s*สัปดาห์/);
  if (relWeeks) return Math.max(0, Number(relWeeks[1]) * 7);

  // Thai date format e.g. "17 พ.ย. 2569" or "17 พ.ย. 69"
  const thaiDate = raw.match(/(\d{1,2})\s+([ก-ฮ.]+)\s+(\d{2,4})/);
  if (thaiDate) {
    const day = Number(thaiDate[1]);
    const month = THAI_MONTHS[thaiDate[2]];
    let year = Number(thaiDate[3]);
    if (month !== undefined) {
      if (year < 100) year += 2500;
      if (year > 2400) year -= 543;
      const ms = Date.UTC(year, month, day);
      if (Number.isFinite(ms)) return Math.max(0, (nowMs - ms) / 86_400_000);
    }
  }

  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) {
    const diffDays = (nowMs - parsed) / 86_400_000;
    if (diffDays >= -2 && diffDays <= 3650) return Math.max(0, diffDays);
  }
  return null;
}

/**
 * Re-rank a visual similarity score using bounded Haversine geo-distance and recency signals.
 * Visual cosine similarity stays dominant; metadata refines close ties transparently.
 */
export function computeHybridScore(visualScore, queryMeta = {}, candidateMeta = {}, nowMs = Date.now()) {
  const base = Number(visualScore);
  if (!Number.isFinite(base)) {
    return { score: 0, visualScore: 0, distanceKm: null, ageDays: null, boost: 0, badge: '' };
  }

  let boost = 0;
  let distanceKm = null;
  const resolveMetaLoc = (meta, text) => {
    const lat = meta?.lat !== null && meta?.lat !== undefined && meta?.lat !== '' ? Number(meta.lat) : NaN;
    const lon = meta?.lon !== null && meta?.lon !== undefined && meta?.lon !== '' ? Number(meta.lon) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon, exact: true, gps: true };
    }
    return text ? resolveAreaLocation(text) : { exact: false };
  };
  const qAreaText = `${queryMeta?.area || ''} ${queryMeta?.description || ''}`.trim();
  const cAreaText = `${candidateMeta?.area || ''} ${candidateMeta?.title || ''} ${candidateMeta?.name || ''} ${candidateMeta?.description || ''}`.trim();
  const qLoc = resolveMetaLoc(queryMeta, qAreaText);
  const cLoc = resolveMetaLoc(candidateMeta, cAreaText);

  if (qLoc.exact && cLoc.exact) {
    distanceKm = Math.round(haversineKm(qLoc.lat, qLoc.lon, cLoc.lat, cLoc.lon) * 10) / 10;
    if (distanceKm <= 5) boost += 0.045;
    else if (distanceKm <= 15) boost += 0.025;
    else if (distanceKm <= 40) boost += 0.01;
    else if (distanceKm >= 200) boost -= 0.025;
  }

  const ageDays = parseAgeDays(candidateMeta?.createdAt || candidateMeta?.date || candidateMeta?.when, nowMs);
  if (ageDays !== null) {
    if (ageDays <= 3) boost += 0.02;
    else if (ageDays <= 14) boost += 0.01;
    else if (ageDays >= 90) boost -= 0.015;
  }

  const badges = [];
  if (distanceKm !== null) {
    badges.push(distanceKm < 1 ? '📍 พื้นที่เดียวกัน' : `📍 ห่าง ~${distanceKm} กม.`);
  }
  if (ageDays !== null) {
    if (ageDays < 1) badges.push('🕒 ล่าสุดวันนี้');
    else if (ageDays <= 7) badges.push(`🕒 ${Math.round(ageDays)} วันที่แล้ว`);
  }

  return {
    score: Math.round((base + boost) * 100000) / 100000,
    visualScore: Math.round(base * 100000) / 100000,
    distanceKm,
    ageDays: ageDays === null ? null : Math.round(ageDays * 10) / 10,
    boost: Math.round(boost * 100000) / 100000,
    badge: badges.join(' · ')
  };
}
