const AREA_ZONES = [
  { keywords: ['อารีย์', 'พญาไท', 'สนามเป้า'], label: 'อารีย์ / พญาไท', lat: 13.7796, lon: 100.5447, region: 'bkk' },
  { keywords: ['สะพานควาย', 'ประดิพัทธ์'], label: 'สะพานควาย', lat: 13.7936, lon: 100.5498, region: 'bkk' },
  { keywords: ['จตุจักร', 'หมอชิต', 'ลาดยาว'], label: 'จตุจักร', lat: 13.8161, lon: 100.5582, region: 'bkk' },
  { keywords: ['บางซื่อ', 'เตาปูน', 'บางโพ'], label: 'บางซื่อ / บางโพ', lat: 13.8065, lon: 100.5255, region: 'bkk' },
  { keywords: ['ดอนเมือง', 'สรงประภา'], label: 'ดอนเมือง', lat: 13.9132, lon: 100.5898, region: 'bkk' },
  { keywords: ['ลาดพร้าว', 'โชคชัย 4', 'วังทองหลาง', 'ลาดปลาเค้า'], label: 'ลาดพร้าว', lat: 13.8058, lon: 100.6085, region: 'bkk' },
  { keywords: ['บางเขน', 'สายไหม', 'สะพานใหม่', 'รามอินทรา'], label: 'บางเขน / รามอินทรา', lat: 13.8738, lon: 100.6194, region: 'bkk' },
  { keywords: ['ห้วยขวาง', 'รัชดา', 'พระราม 9', 'สุทธิสาร'], label: 'ห้วยขวาง / รัชดา', lat: 13.7779, lon: 100.5738, region: 'bkk' },
  { keywords: ['สุขุมวิท', 'ทองหล่อ', 'เอกมัย', 'คลองเตย', 'อโศก'], label: 'สุขุมวิท / คลองเตย', lat: 13.7322, lon: 100.5762, region: 'bkk' },
  { keywords: ['สยาม', 'ปทุมวัน', 'สาทร', 'สีลม', 'สามย่าน'], label: 'ปทุมวัน / สาทร', lat: 13.7318, lon: 100.5345, region: 'bkk' },
  { keywords: ['บางนา', 'อุดมสุข', 'แบริ่ง', 'ประเวศ'], label: 'บางนา', lat: 13.6682, lon: 100.6258, region: 'bkk' },
  { keywords: ['พระราม 2', 'บางขุนเทียน', 'ธนบุรี', 'จอมทอง', 'บางแค', 'ฝั่งธน'], label: 'ธนบุรี / พระราม 2', lat: 13.6673, lon: 100.4496, region: 'bkk' },
  { keywords: ['มีนบุรี', 'หนองจอก', 'ลาดกระบัง', 'ร่มเกล้า'], label: 'มีนบุรี / ลาดกระบัง', lat: 13.7885, lon: 100.7453, region: 'bkk' },
  { keywords: ['รามคำแหง', 'บางกะปิ', 'หัวหมาก'], label: 'บางกะปิ / รามคำแหง', lat: 13.7658, lon: 100.6438, region: 'bkk' },
  { keywords: ['ปากเกร็ด', 'บางบัวทอง', 'นนทบุรี', 'เมืองทอง'], label: 'นนทบุรี / ปากเกร็ด', lat: 13.9022, lon: 100.4918, region: 'bkk' },
  { keywords: ['ปทุมธานี', 'รังสิต', 'คลองหลวง', 'ลำลูกกา'], label: 'ปทุมธานี / รังสิต', lat: 14.0052, lon: 100.6184, region: 'bkk' },
  { keywords: ['สมุทรปราการ', 'ปากน้ำ', 'บางพลี', 'ทิพวัลย์', 'สำโรง'], label: 'สมุทรปราการ', lat: 13.6069, lon: 100.6122, region: 'bkk' },
  { keywords: ['นครปฐม', 'ศาลายา'], label: 'นครปฐม / ศาลายา', lat: 13.8199, lon: 100.2896, region: 'bkk' },
  { keywords: ['กรุงเทพ', 'กทม', 'bangkok'], label: 'กรุงเทพมหานคร', lat: 13.7563, lon: 100.5018, region: 'bkk' },
  { keywords: ['เชียงใหม่', 'chiang mai'], label: 'เชียงใหม่', lat: 18.7883, lon: 98.9853, region: 'th' },
  { keywords: ['ลำพูน', 'แม่ทา'], label: 'ลำพูน', lat: 18.5745, lon: 99.0087, region: 'th' },
  { keywords: ['เชียงราย'], label: 'เชียงราย', lat: 19.9105, lon: 99.8406, region: 'th' },
  { keywords: ['พระนครศรีอยุธยา', 'อยุธยา'], label: 'พระนครศรีอยุธยา', lat: 14.3692, lon: 100.5877, region: 'th' },
  { keywords: ['ราชบุรี', 'เขาแก่นจันทร์'], label: 'ราชบุรี', lat: 13.5283, lon: 99.8134, region: 'th' },
  { keywords: ['ชลบุรี', 'พัทยา', 'บางแสน', 'ศรีราชา'], label: 'ชลบุรี / พัทยา', lat: 13.1992, lon: 100.9288, region: 'th' },
  { keywords: ['ระยอง'], label: 'ระยอง', lat: 12.6814, lon: 101.2816, region: 'th' },
  { keywords: ['นครราชสีมา', 'โคราช', 'ปากช่อง'], label: 'นครราชสีมา', lat: 14.9799, lon: 102.0978, region: 'th' },
  { keywords: ['บุรีรัมย์', 'กระสัง'], label: 'บุรีรัมย์', lat: 14.993, lon: 103.1029, region: 'th' },
  { keywords: ['ขอนแก่น'], label: 'ขอนแก่น', lat: 16.4419, lon: 102.836, region: 'th' },
  { keywords: ['อุดรธานี'], label: 'อุดรธานี', lat: 17.4156, lon: 102.7872, region: 'th' },
  { keywords: ['ภูเก็ต'], label: 'ภูเก็ต', lat: 7.8804, lon: 98.3923, region: 'th' },
  { keywords: ['สงขลา', 'หาดใหญ่'], label: 'สงขลา / หาดใหญ่', lat: 7.0084, lon: 100.4747, region: 'th' },
  { keywords: ['หัวหิน', 'ประจวบ'], label: 'หัวหิน / ประจวบฯ', lat: 12.5684, lon: 99.9577, region: 'th' }
];

const BOUNDS = {
  bkk: { minLat: 13.53, maxLat: 14.08, minLon: 100.24, maxLon: 100.82 },
  th: { minLat: 5.8, maxLat: 20.5, minLon: 97.2, maxLon: 105.7 }
};

export function resolveAreaLocation(areaText = '') {
  const text = String(areaText || '').toLowerCase();
  if (!text.trim()) return { label: 'กรุงเทพมหานคร (ทั่วไป)', lat: 13.7563, lon: 100.5018, region: 'bkk', exact: false };
  for (const zone of AREA_ZONES) {
    if (zone.keywords.some(k => text.includes(k))) return { ...zone, exact: true };
  }
  return { label: areaText.trim(), lat: 13.7563, lon: 100.5018, region: 'bkk', exact: false };
}

export function projectGeoPoint(lat, lon, viewMode = 'bkk', width = 680, height = 420) {
  const b = BOUNDS[viewMode] || BOUNDS.bkk;
  const x = ((lon - b.minLon) / (b.maxLon - b.minLon)) * (width - 80) + 40;
  const y = (1 - (lat - b.minLat) / (b.maxLat - b.minLat)) * (height - 70) + 35;
  return { x: Math.max(24, Math.min(width - 24, x)), y: Math.max(24, Math.min(height - 24, y)) };
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderCaseMap(container, cases = [], onSelectCase, viewMode = 'bkk') {
  if (!container) return;
  const W = 680, H = 420;
  const plotted = cases.map((item, idx) => {
    const hasGps = item.lat !== null && item.lat !== undefined && item.lon !== null && item.lon !== undefined
      && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon));
    const loc = hasGps
      ? { label: item.area || 'พิกัด GPS จริง', lat: Number(item.lat), lon: Number(item.lon), region: 'gps', exact: true }
      : resolveAreaLocation(`${item.area || ''} ${item.description || ''}`);
    const inView = viewMode === 'th' || (loc.lat >= BOUNDS.bkk.minLat && loc.lat <= BOUNDS.bkk.maxLat && loc.lon >= BOUNDS.bkk.minLon && loc.lon <= BOUNDS.bkk.maxLon);
    return { item, loc, idx, inView };
  });

  const visiblePins = plotted.filter(p => p.inView);
  const bucketCounts = new Map();
  const pins = visiblePins.map(p => {
    const base = projectGeoPoint(p.loc.lat, p.loc.lon, viewMode, W, H);
    const key = `${Math.round(base.x / 18)}:${Math.round(base.y / 18)}`;
    const count = bucketCounts.get(key) || 0;
    bucketCounts.set(key, count + 1);
    const angle = count * 2.3;
    const radius = count === 0 ? 0 : Math.min(26, 9 + count * 3.5);
    const px = Math.max(22, Math.min(W - 22, base.x + Math.cos(angle) * radius));
    const py = Math.max(22, Math.min(H - 22, base.y + Math.sin(angle) * radius));
    const color = p.item.status === 'resolved' ? '#7c5d8e' : p.item.type === 'found' ? '#2e8a57' : '#d95362';
    return { ...p, px, py, color };
  });

  const landmarks = (viewMode === 'bkk'
    ? AREA_ZONES.filter(z => z.region === 'bkk' && z.keywords[0] !== 'กรุงเทพ').slice(0, 12)
    : AREA_ZONES.filter(z => z.region === 'th' || z.keywords[0] === 'กรุงเทพ')
  ).map(z => ({ ...z, ...projectGeoPoint(z.lat, z.lon, viewMode, W, H) }));

  const bgBackdrop = viewMode === 'bkk'
    ? `<path d="M 335 12 Q 360 120 318 205 T 330 330 Q 345 385 385 415" fill="none" stroke="#c8e4fb" stroke-width="16" stroke-linecap="round" opacity=".75"/>
       <circle cx="340" cy="210" r="158" fill="none" stroke="#eadfcd" stroke-dasharray="6 5" stroke-width="1.5"/>`
    : `<path d="M 190 42 L 260 32 L 325 78 L 495 142 L 558 195 L 442 238 L 368 228 L 325 278 L 288 320 L 296 392 L 352 398 L 336 414 L 262 396 L 245 318 L 265 256 L 235 210 L 182 152 L 165 92 Z" fill="#f7f1e3" stroke="#dccbb0" stroke-width="2.5" stroke-linejoin="round"/>`;

  const selectedDefault = pins[0] || null;
  container.innerHTML = `
    <div class="case-map-shell">
      <div class="case-map-toolbar">
        <div class="case-map-tabs">
          <button type="button" class="filter ${viewMode === 'bkk' ? 'active' : ''}" data-map-mode="bkk">🏙️ กรุงเทพฯ–ปริมณฑล</button>
          <button type="button" class="filter ${viewMode === 'th' ? 'active' : ''}" data-map-mode="th">🇹🇭 ทั่วประเทศไทย</button>
        </div>
        <div class="case-map-legend">
          <span><i style="background:#d95362"></i> สัตว์หาย</span>
          <span><i style="background:#2e8a57"></i> พบสัตว์</span>
          <span><i style="background:#7c5d8e"></i> กลับบ้านแล้ว</span>
          <b>(${pins.length} หมุดในมุมมองนี้)</b>
        </div>
      </div>
      <div class="case-map-grid">
        <div class="case-map-canvas-wrap">
          <svg viewBox="0 0 ${W} ${H}" class="case-map-svg" role="img" aria-label="แผนที่ตำแหน่งสัตว์หายและพบสัตว์">
            <rect width="${W}" height="${H}" rx="20" fill="#fcfaf2"/>
            ${bgBackdrop}
            ${landmarks.map(l => `<g opacity=".78"><circle cx="${l.x.toFixed(1)}" cy="${l.y.toFixed(1)}" r="2.5" fill="#9a8b78"/><text x="${l.x.toFixed(1)}" y="${(l.y - 7).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="#776857">${esc(l.label)}</text></g>`).join('')}
            ${pins.map((p, i) => `
              <g class="map-pin-node ${i === 0 ? 'selected' : ''}" data-pin-idx="${i}" style="cursor:pointer">
                <circle cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="11" fill="${p.color}" fill-opacity=".18"/>
                <circle cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="6.5" fill="${p.color}" stroke="#fff" stroke-width="2"/>
              </g>
            `).join('')}
          </svg>
        </div>
        <aside class="case-map-sidebar" id="caseMapPreview"></aside>
      </div>
    </div>
  `;

  function showPin(pinIndex) {
    const preview = container.querySelector('#caseMapPreview');
    if (!preview) return;
    const p = pins[pinIndex];
    container.querySelectorAll('.map-pin-node').forEach((n, idx) => n.classList.toggle('selected', idx === pinIndex));
    if (!p) {
      preview.innerHTML = '<div class="empty">ยังไม่มีเคสที่ตรงกับพื้นที่ในมุมมองนี้ ลองสลับดู “ทั่วประเทศไทย”</div>';
      return;
    }
    const c = p.item;
    const statusLabel = c.status === 'resolved' ? '✓ กลับบ้านแล้ว' : c.type === 'lost' ? '🔎 สัตว์หาย' : '📷 พบสัตว์';
    preview.innerHTML = `
      <div class="map-preview-card">
        <img src="${esc(c.image)}" alt="${esc(c.name)}">
        <div>
          <span class="case-type ${c.type === 'lost' ? 'lost' : 'found'}" style="position:static;display:inline-block;margin-bottom:6px">${statusLabel}</span>
          <h3>${esc(c.name)}</h3>
          <p class="map-preview-area">📍 ${esc(c.area || p.loc.label)}</p>
          <p>${esc((c.description || '').slice(0, 120))}</p>
          <button type="button" class="btn btn-dark full" data-map-open-case="${esc(c.id)}">ดูรายละเอียดเคส →</button>
        </div>
      </div>
      <div class="map-pin-list">
        <small>รายการในมุมมองแผนที่ (${pins.length})</small>
        ${pins.slice(0, 8).map((row, idx) => `<button type="button" class="map-quick-row ${idx === pinIndex ? 'active' : ''}" data-pin-idx="${idx}"><i style="background:${row.color}"></i><span>${esc(row.item.name)}</span><small>${esc(row.loc.label)}</small></button>`).join('')}
      </div>
    `;
  }

  showPin(selectedDefault ? 0 : -1);
  container.onclick = e => {
    const tab = e.target.closest('[data-map-mode]');
    if (tab) { renderCaseMap(container, cases, onSelectCase, tab.dataset.mapMode); return; }
    const pinBtn = e.target.closest('[data-pin-idx]');
    if (pinBtn) { showPin(Number(pinBtn.dataset.pinIdx)); return; }
    const openBtn = e.target.closest('[data-map-open-case]');
    if (openBtn && typeof onSelectCase === 'function') onSelectCase(openBtn.dataset.mapOpenCase);
  };
}
