/**
 * Pure-JS ISO/IEC 18004 QR Code encoder (Byte mode, ECC Level L, Versions 1-6)
 * + HTML5 Canvas Auto-Poster Generator (1080x1350 PNG) for Lost & Found Pet Sharing.
 */

const QR_VERSIONS = [
  null,
  { size: 21, dataCodewords: 19, ecPerBlock: 7, blocks: 1, align: [] },
  { size: 25, dataCodewords: 34, ecPerBlock: 10, blocks: 1, align: [18] },
  { size: 29, dataCodewords: 55, ecPerBlock: 15, blocks: 1, align: [22] },
  { size: 33, dataCodewords: 80, ecPerBlock: 20, blocks: 1, align: [26] },
  { size: 37, dataCodewords: 108, ecPerBlock: 26, blocks: 1, align: [30] },
  { size: 41, dataCodewords: 136, ecPerBlock: 18, blocks: 2, align: [34] }
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEc(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    for (let i = 0; i < ecLen - 1; i++) rem[i] = rem[i + 1];
    rem[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let i = 0; i < ecLen; i++) rem[i] ^= gfMul(gen[i + 1], factor);
    }
  }
  return rem;
}

function formatBitsL(mask) {
  const data = (0b01 << 3) | (mask & 0b111); // ECC Level L = 01
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function applyMaskBit(mask, r, c) {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
    case 6: return (((r * c) % 2 + (r * c) % 3) % 2) === 0;
    case 7: return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
    default: return false;
  }
}

function penaltyScore(grid) {
  const n = grid.length;
  let score = 0;
  for (let r = 0; r < n; r++) {
    let run = 1;
    for (let c = 1; c < n; c++) {
      if (grid[r][c] === grid[r][c - 1]) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
  }
  for (let c = 0; c < n; c++) {
    let run = 1;
    for (let r = 1; r < n; r++) {
      if (grid[r][c] === grid[r - 1][c]) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
  }
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
    }
  }
  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (grid[r][c]) dark++;
  const ratio = Math.abs((dark * 100) / (n * n) - 50);
  score += Math.floor(ratio / 5) * 10;
  return score;
}

/**
 * Encode UTF-8 text into a scannable ISO/IEC 18004 QR Code matrix.
 * Returns { version, size, mask, modules: number[][] } where 1 = dark, 0 = light.
 */
export function encodeQrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text || '').slice(0, 134)));
  let version = 0;
  for (let v = 1; v < QR_VERSIONS.length; v++) {
    if (bytes.length <= QR_VERSIONS[v].dataCodewords - 2) {
      version = v;
      break;
    }
  }
  if (!version) throw new Error('ข้อความยาวเกินขนาด QR Code (สูงสุด 134 ไบต์)');
  const spec = QR_VERSIONS[version];
  const { size, dataCodewords, ecPerBlock, blocks, align } = spec;

  // Build Byte-mode bit stream
  const bits = [];
  const pushBits = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);
  const maxBits = dataCodewords * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    dataBytes.push(byte);
  }
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < dataCodewords) {
    dataBytes.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // Split blocks & compute Reed-Solomon EC codewords
  const dataPerBlock = dataCodewords / blocks;
  const dataBlocks = [], ecBlocks = [];
  for (let b = 0; b < blocks; b++) {
    const slice = dataBytes.slice(b * dataPerBlock, (b + 1) * dataPerBlock);
    dataBlocks.push(slice);
    ecBlocks.push(rsComputeEc(slice, ecPerBlock));
  }
  const codewords = [];
  for (let i = 0; i < dataPerBlock; i++) for (let b = 0; b < blocks; b++) codewords.push(dataBlocks[b][i]);
  for (let i = 0; i < ecPerBlock; i++) for (let b = 0; b < blocks; b++) codewords.push(ecBlocks[b][i]);

  // Build function pattern template
  const base = Array.from({ length: size }, () => new Uint8Array(size));
  const isFunc = Array.from({ length: size }, () => new Uint8Array(size));
  const setFunc = (r, c, val) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      base[r][c] = val ? 1 : 0;
      isFunc[r][c] = 1;
    }
  };

  const drawFinder = (top, left) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr, c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const dark = inOuter && (
          dr === 0 || dr === 6 || dc === 0 || dc === 6
          || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
        );
        setFunc(r, c, dark ? 1 : 0);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (const pos of align) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const dist = Math.max(Math.abs(dr), Math.abs(dc));
        setFunc(pos + dr, pos + dc, dist !== 1 ? 1 : 0);
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0 ? 1 : 0);
    setFunc(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Reserve Format Info & Dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isFunc[8][i] = 1;
      isFunc[i][8] = 1;
    }
  }
  for (let i = size - 8; i < size; i++) isFunc[8][i] = 1;
  for (let i = size - 7; i < size; i++) isFunc[i][8] = 1;
  setFunc(size - 8, 8, 1);

  // Place data bits in zigzag
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const c = right - offset;
        if (!isFunc[r][c]) {
          let bit = 0;
          if (bitIndex < totalBits) {
            bit = (codewords[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1;
            bitIndex++;
          }
          base[r][c] = bit;
        }
      }
    }
    upward = !upward;
  }

  // Evaluate masks 0..7 and pick lowest penalty
  let bestMask = 0, bestScore = Infinity, bestGrid = null;
  for (let mask = 0; mask < 8; mask++) {
    const grid = base.map((row, r) => row.map((v, c) => (isFunc[r][c] ? v : (applyMaskBit(mask, r, c) ? v ^ 1 : v))));
    const fmt = formatBitsL(mask);
    const fmtBit = (i) => (fmt >> i) & 1;
    // Top-left copy
    const tlCoords = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ];
    for (let i = 0; i < 15; i++) {
      const [r, c] = tlCoords[i];
      grid[r][c] = fmtBit(14 - i);
    }
    // Split copy (bottom-left + top-right)
    for (let i = 0; i < 7; i++) grid[size - 1 - i][8] = fmtBit(14 - i);
    for (let i = 0; i < 8; i++) grid[8][size - 8 + i] = fmtBit(7 - i);

    const sc = penaltyScore(grid);
    if (sc < bestScore) {
      bestScore = sc;
      bestMask = mask;
      bestGrid = grid;
    }
  }

  return {
    version,
    size,
    mask: bestMask,
    modules: bestGrid.map((row) => Array.from(row))
  };
}

function wrapLines(ctx, text, maxWidth, maxLines = 3) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const lines = [];
  let line = '';
  for (const ch of clean) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim());
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line.trim());
  if (lines.length === maxLines && clean.length > lines.join('').length + 2) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
  }
  return lines;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function loadPosterImage(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const SPECIES_TH = { dog: 'สุนัข', cat: 'แมว', bird: 'นก', rabbit: 'กระต่าย', hamster: 'แฮมสเตอร์' };
const SPECIES_EMOJI = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', hamster: '🐹' };
const DEFAULT_PUBLIC_BASE_URL = 'https://pawtal-web-production.up.railway.app';

export const POSTER_BEHAVIOR_PRESETS = [
  { id: 'shy', tone: 'warn', text: '⚠️ ขี้กลัว · ห้ามวิ่งไล่' },
  { id: 'friendly', tone: 'safe', text: '✅ เป็นมิตร · เรียกชื่อได้' },
  { id: 'startled', tone: 'warn', text: '⚡ ตกใจง่าย · อย่าจับแรง' },
  { id: 'treats', tone: 'safe', text: '🍖 ใช้ขนม/อาหารล่อได้' }
];

export function buildPosterHeadline(item = {}) {
  const isLost = item.type !== 'found';
  const sp = SPECIES_TH[item.species] || 'สัตว์เลี้ยง';
  return isLost ? `${sp}หาย!` : `พบ${sp}พลัดหลง`;
}

export function inferBehaviorBadge(item = {}) {
  const raw = String(item.description || '').trim();
  if (!raw) return null;
  if (/ดุ|กัด|ข่วน|ไม่ให้จับ|ระวัง/.test(raw)) {
    return { tone: 'warn', text: '⚠️ อาจตื่นกลัว · อย่าจับมือเปล่า' };
  }
  if (/ขี้กลัว|ตกใจ|ตื่นคน|หวาดกลัว|ห้ามวิ่งไล่|หนีคน/.test(raw)) {
    return { tone: 'warn', text: '⚠️ ขี้กลัว · ห้ามวิ่งไล่' };
  }
  if (/เป็นมิตร|เชื่อง|เรียกชื่อ|เข้าหา|ขี้อ้อน/.test(raw)) {
    const cleanName = String(item.name || '').trim();
    const usableName = cleanName && !/ยังไม่ระบุ|ที่พบ|ที่หาย|รูปที่ส่งมา/.test(cleanName);
    return {
      tone: 'safe',
      text: usableName ? `✅ เป็นมิตร · เรียกชื่อ “${cleanName.slice(0, 14)}” ได้` : '✅ เป็นมิตร · เรียกชื่อได้'
    };
  }
  return null;
}

export function resolvePosterBaseUrl({ publicBaseUrl = '', locationOrigin = '' } = {}) {
  const pub = String(publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(pub) && !/^https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?::\d+)?$/i.test(pub)) {
    return { baseUrl: pub, isPublicFallback: false };
  }
  const orig = String(locationOrigin || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(orig) && !/^https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?::\d+)?$/i.test(orig)) {
    return { baseUrl: orig, isPublicFallback: false };
  }
  return { baseUrl: DEFAULT_PUBLIC_BASE_URL, isPublicFallback: true };
}

export const POSTER_THEMES = {
  urgent: {
    id: 'urgent',
    label: '🔴 เร่งด่วน',
    solid: '#C81E1E',
    solidDark: '#8F1616',
    bgTint: 'rgba(120, 22, 22, 0.18)',
    topGlass: 'rgba(178, 28, 34, 0.48)',
    topGlassEnd: 'rgba(220, 56, 38, 0.46)',
    bottomGlass: 'rgba(255, 252, 248, 0.80)',
    accent: '#FFD046',
    badgeBg: 'rgba(185, 28, 28, 0.12)',
    badgeText: '#991B1B',
    contactBg: 'rgba(220, 38, 38, 0.11)',
    contactBorder: 'rgba(220, 38, 38, 0.40)',
    contactText: '#9F1D1D',
    qrBorder: 'rgba(220, 38, 38, 0.40)',
    qrTitle: '#9F1D1D',
    statusPillBg: 'rgba(255, 255, 255, 0.22)',
    statusPillText: '#FFF4C2'
  },
  pawtal: {
    id: 'pawtal',
    label: '💛 ธีม Pawtal',
    solid: '#55337E',
    solidDark: '#3A2159',
    bgTint: 'rgba(65, 36, 98, 0.18)',
    topGlass: 'rgba(72, 42, 110, 0.48)',
    topGlassEnd: 'rgba(108, 66, 156, 0.46)',
    bottomGlass: 'rgba(255, 253, 247, 0.80)',
    accent: '#FFCA32',
    badgeBg: 'rgba(79, 49, 115, 0.12)',
    badgeText: '#492B6D',
    contactBg: 'rgba(255, 202, 50, 0.20)',
    contactBorder: 'rgba(184, 134, 11, 0.40)',
    contactText: '#492B6D',
    qrBorder: 'rgba(99, 60, 145, 0.40)',
    qrTitle: '#492B6D',
    statusPillBg: 'rgba(255, 202, 50, 0.26)',
    statusPillText: '#FFF3BF'
  },
  found: {
    id: 'found',
    label: '🟢 พบสัตว์',
    solid: '#187951',
    solidDark: '#11593B',
    bgTint: 'rgba(17, 94, 63, 0.18)',
    topGlass: 'rgba(17, 96, 65, 0.48)',
    topGlassEnd: 'rgba(32, 138, 94, 0.46)',
    bottomGlass: 'rgba(248, 254, 250, 0.82)',
    accent: '#FFCA32',
    badgeBg: 'rgba(20, 115, 74, 0.12)',
    badgeText: '#14532D',
    contactBg: 'rgba(26, 127, 86, 0.12)',
    contactBorder: 'rgba(26, 127, 86, 0.38)',
    contactText: '#14532D',
    qrBorder: 'rgba(26, 127, 86, 0.40)',
    qrTitle: '#14532D',
    statusPillBg: 'rgba(255, 255, 255, 0.22)',
    statusPillText: '#FFF4C2'
  }
};

function drawCoverImage(ctx, img, x, y, w, h, anchorY = 0.48) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) * anchorY;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawFrostedGlassPanel(ctx, img, rect, radius, fillStyle, borderStyle, blurPx = 20) {
  const { x, y, w, h } = rect;
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();
  // Real blurred backdrop slice from photo underneath for translucent frosted glass look
  if (img) {
    ctx.save();
    if ('filter' in ctx) ctx.filter = `blur(${blurPx}px)`;
    drawCoverImage(ctx, img, -24, -24, 1128, 1398, 0.48);
    ctx.restore();
  }
  ctx.fillStyle = fillStyle;
  ctx.fillRect(x, y, w, h);
  // Subtle specular top glass sheen
  const sheen = ctx.createLinearGradient(x, y, x, y + Math.min(h * 0.45, 70));
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, Math.min(h * 0.45, 70));
  ctx.restore();

  // Crisp translucent glass border
  ctx.save();
  ctx.strokeStyle = borderStyle;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
}

function drawQrMatrix(ctx, qr, qrX, qrY, qrBox, borderStyle) {
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrX, qrY, qrBox, qrBox, 18);
  ctx.fill();
  ctx.strokeStyle = borderStyle;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, qrX, qrY, qrBox, qrBox, 18);
  ctx.stroke();

  const quiet = 2;
  const cell = Math.floor((qrBox - 18) / (qr.size + quiet * 2));
  const totalDraw = cell * (qr.size + quiet * 2);
  const ox = qrX + Math.floor((qrBox - totalDraw) / 2) + quiet * cell;
  const oy = qrY + Math.floor((qrBox - totalDraw) / 2) + quiet * cell;
  ctx.fillStyle = '#140E1F';
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
    }
  }
}

function resolveBehaviorStyle(behaviorText) {
  const txt = String(behaviorText || '').trim();
  if (!txt) return null;
  const isSafe = /^✅|^🍖|เป็นมิตร|เชื่อง|เรียกชื่อ|ขนม/.test(txt) && !/⚠️|⚡|ห้าม|ดุ|กลัว|ตกใจ/.test(txt);
  return {
    text: txt,
    bg: isSafe ? 'rgba(22, 163, 74, 0.14)' : 'rgba(217, 119, 6, 0.16)',
    border: isSafe ? 'rgba(22, 163, 74, 0.42)' : 'rgba(217, 119, 6, 0.48)',
    color: isSafe ? '#14532D' : '#92400E'
  };
}

/**
 * Render Lost/Found Pet Poster in either:
 * - mode: 'social' (1080x1350 full-bleed with slim frosted translucent banners)
 * - mode: 'a4'     (1240x1754 ink-saving printable A4 poster with giant street-readable phone & QR)
 */
export async function renderPetPosterCanvas(item, options = {}) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }
  const canvas = options.canvas || document.createElement('canvas');
  const mode = options.mode === 'a4' ? 'a4' : 'social';
  const isLost = item.type !== 'found';
  const themeKey = options.theme && POSTER_THEMES[options.theme]
    ? options.theme
    : (isLost ? 'urgent' : 'found');
  const t = POSTER_THEMES[themeKey];
  const { baseUrl, isPublicFallback } = resolvePosterBaseUrl({
    publicBaseUrl: options.baseUrl || options.publicBaseUrl || '',
    locationOrigin: typeof location !== 'undefined' ? location.origin : ''
  });
  const caseUrl = `${baseUrl}/?case=${encodeURIComponent(item.id || '')}`;
  const displayFont = '"Mitr", "Prompt", system-ui, sans-serif';
  const bodyFont = '"Prompt", system-ui, sans-serif';
  const headline = buildPosterHeadline(item);
  const rewardText = String(options.reward ?? item.reward ?? '').trim();
  const contactText = String(options.contact ?? item.contact ?? '').trim();
  const petMeta = String(options.petMeta ?? item.petMeta ?? '').trim();
  const rawBehavior = options.behavior !== undefined
    ? String(options.behavior || '').trim()
    : (inferBehaviorBadge(item)?.text || '');
  const behaviorStyle = resolveBehaviorStyle(rawBehavior);
  const spEmoji = SPECIES_EMOJI[item.species] || '🐾';
  const spLabel = SPECIES_TH[item.species] || 'สัตว์เลี้ยง';
  const cleanBreed = String(item.breed || item.kind || '').split('·')[0].trim();
  const identityChip = [ `${spEmoji} ${spLabel}`, cleanBreed, petMeta ].filter(Boolean).join(' · ');
  const petTitle = String(item.name || (isLost ? `${spLabel}หาย` : `พบ${spLabel}พลัดหลง`)).trim();
  const areaStr = String(item.area || 'ไม่ระบุพื้นที่').trim();
  const whenStr = String(item.when || 'ล่าสุด').trim();
  const colorLabel = String(item.color || (String(item.kind || '').includes('·') ? String(item.kind).split('·').slice(1).join(' · ').trim() : '')).trim();
  const descText = String(item.description || 'หากพบเห็นน้องกรุณาติดต่อเบอร์ด้านล่าง หรือสแกน QR เพื่อส่งรูปและพิกัดแจ้งเบาะแสได้ทันที').trim();

  const img = await loadPosterImage(item.image || (item.images && item.images[0]) || '');
  const qr = encodeQrMatrix(caseUrl);

  // ==================== MODE B: INK-SAVING PRINTABLE A4 (1240 x 1754) ====================
  if (mode === 'a4') {
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext('2d');

    // Pure white ink-saving paper background + thin outer guide border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1240, 1754);
    ctx.strokeStyle = '#E5DFD5';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 26, 26, 1188, 1702, 24);
    ctx.stroke();

    // Top High-Contrast Street Headline Bar (ink-smart outlined banner with bold color stripe)
    const hdrY = 44, hdrH = 166;
    ctx.fillStyle = t.solid;
    drawRoundedRect(ctx, 48, hdrY, 1144, hdrH, 22);
    ctx.fill();
    ctx.fillStyle = t.accent;
    ctx.fillRect(48, hdrY + hdrH - 12, 1144, 12);

    // Giant 1-Second Species Headline ("สุนัขหาย!" / "แมวหาย!")
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 84px ${displayFont}`;
    ctx.fillText(headline, 82, hdrY + 114);

    // Right side of Header: Brand pill + Reward pill
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    drawRoundedRect(ctx, 976, hdrY + 22, 188, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 22px ${displayFont}`;
    ctx.fillText('🐾 PAWTAL', 1002, hdrY + 52);

    if (rewardText) {
      const rw = `🏆 ${rewardText.slice(0, 26)}`;
      ctx.font = `600 24px ${displayFont}`;
      const rwW = Math.min(460, ctx.measureText(rw).width + 38);
      ctx.fillStyle = '#FFD046';
      drawRoundedRect(ctx, 1164 - rwW, hdrY + 86, rwW, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#3B2000';
      ctx.fillText(rw, 1164 - rwW + 19, hdrY + 121);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font = `500 23px ${bodyFont}`;
      ctx.textAlign = 'right';
      ctx.fillText(isLost ? 'โปรดช่วยสังเกตและแชร์ต่อ' : 'กำลังตามหาเจ้าของน้อง', 1162, hdrY + 120);
      ctx.textAlign = 'left';
    }

    // Large Unobstructed Crisp Pet Photo (x: 48, y: 232, w: 1144, h: 724)
    const px = 48, py = 232, pw = 1144, ph = 724;
    ctx.save();
    drawRoundedRect(ctx, px, py, pw, ph, 22);
    ctx.fillStyle = '#F5F1EB';
    ctx.fill();
    ctx.clip();
    if (img) {
      const isTall = img.height / Math.max(1, img.width) >= 0.9;
      drawCoverImage(ctx, img, px, py, pw, ph, isTall ? 0.25 : 0.45);
    } else {
      ctx.fillStyle = '#7A688A';
      ctx.font = `600 36px ${displayFont}`;
      ctx.textAlign = 'center';
      ctx.fillText('ไม่มีรูปภาพประกอบ', px + pw / 2, py + ph / 2);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    ctx.strokeStyle = '#DDD4C6';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, px, py, pw, ph, 22);
    ctx.stroke();

    // Name + Species/Meta + Behavior Warning Row (y: 980..1130)
    ctx.fillStyle = '#1E142C';
    ctx.font = `600 54px ${displayFont}`;
    const a4Title = wrapLines(ctx, petTitle, 720, 1)[0] || petTitle;
    ctx.fillText(a4Title, 52, 1034);

    // Inline Species · Breed · Pet Meta pill
    ctx.font = `600 24px ${bodyFont}`;
    const idLine = wrapLines(ctx, identityChip, 740, 1)[0] || identityChip;
    const idW = Math.min(760, ctx.measureText(idLine).width + 36);
    ctx.fillStyle = t.badgeBg;
    drawRoundedRect(ctx, 52, 1054, idW, 46, 23);
    ctx.fill();
    ctx.fillStyle = t.badgeText;
    ctx.fillText(idLine, 70, 1086);

    // Separated High-Contrast Behavior Warning Box on Right
    if (behaviorStyle) {
      ctx.font = `600 25px ${displayFont}`;
      const bTxt = wrapLines(ctx, behaviorStyle.text, 390, 1)[0] || behaviorStyle.text;
      const bW = Math.min(440, Math.max(290, ctx.measureText(bTxt).width + 44));
      const bX = 1192 - bW;
      ctx.fillStyle = behaviorStyle.bg;
      drawRoundedRect(ctx, bX, 992, bW, 92, 18);
      ctx.fill();
      ctx.strokeStyle = behaviorStyle.border;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, bX, 992, bW, 92, 18);
      ctx.stroke();
      ctx.fillStyle = behaviorStyle.color;
      ctx.font = `600 18px ${bodyFont}`;
      ctx.fillText('คำแนะนำเมื่อพบเห็น', bX + 20, 1024);
      ctx.font = `600 25px ${displayFont}`;
      ctx.fillText(bTxt, bX + 20, 1066);
    }

    // Divider line
    ctx.strokeStyle = '#E8E0D5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, 1122);
    ctx.lineTo(1192, 1122);
    ctx.stroke();

    // Details (Left) + Extra-Large Street QR (Right) (y: 1144..1504)
    let yCur = 1184;
    ctx.fillStyle = '#1E142C';
    ctx.font = `600 28px ${bodyFont}`;
    for (const ln of wrapLines(ctx, `📍 พื้นที่: ${areaStr}`, 760, 2)) {
      ctx.fillText(ln, 52, yCur);
      yCur += 40;
    }
    ctx.fillStyle = '#4C3D61';
    ctx.font = `500 25px ${bodyFont}`;
    ctx.fillText(`🕒 เวลา: ${whenStr.slice(0, 48)}`, 52, yCur + 4);
    yCur += 46;

    if (colorLabel) {
      ctx.fillStyle = '#5D3587';
      ctx.font = `600 24px ${bodyFont}`;
      ctx.fillText(`🎨 สี/ลาย: ${colorLabel.slice(0, 48)}`, 52, yCur);
      yCur += 40;
    }

    ctx.fillStyle = '#2F253E';
    ctx.font = `400 24px ${bodyFont}`;
    for (const ln of wrapLines(ctx, descText, 780, colorLabel ? 3 : 4)) {
      ctx.fillText(ln, 52, yCur);
      yCur += 36;
    }

    // Extra-Large Street QR Card (Right, white ink-saving card with crisp border)
    const qrBox = 276;
    const qrCardX = 842, qrCardY = 1142, qrCardW = 350, qrCardH = 362;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, 22);
    ctx.fill();
    ctx.strokeStyle = t.qrBorder;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, 22);
    ctx.stroke();

    drawQrMatrix(ctx, qr, Math.round(qrCardX + (qrCardW - qrBox) / 2), qrCardY + 18, qrBox, '#E6DDD0');
    ctx.textAlign = 'center';
    ctx.fillStyle = t.qrTitle;
    ctx.font = `600 25px ${displayFont}`;
    ctx.fillText('สแกนแจ้งเบาะแสทันที', qrCardX + qrCardW / 2, qrCardY + qrBox + 48);
    ctx.textAlign = 'left';

    // GIANT Full-Width Street-Readable Phone Banner (y: 1524..1686)
    const pBoxY = 1524, pBoxH = 162;
    ctx.fillStyle = t.contactBg;
    drawRoundedRect(ctx, 48, pBoxY, 1144, pBoxH, 22);
    ctx.fill();
    ctx.strokeStyle = t.solid;
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, 48, pBoxY, 1144, pBoxH, 22);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#573F48';
    ctx.font = `600 24px ${bodyFont}`;
    ctx.fillText(contactText ? 'พบเห็นหรือมีเบาะแส โทรติดต่อด่วนได้ทันที' : 'พบเห็นหรือมีเบาะแส กรุณาสแกน QR Code ด้านบน', 620, pBoxY + 46);

    ctx.fillStyle = t.contactText;
    const bigContact = contactText || 'สแกน QR เพื่อส่งรูปและพิกัดผ่าน Pawtal';
    const bigSize = !contactText ? 40 : (bigContact.length > 26 ? 44 : bigContact.length > 16 ? 54 : 66);
    ctx.font = `600 ${bigSize}px ${displayFont}`;
    ctx.fillText(wrapLines(ctx, `📞 ${bigContact}`, 1080, 1)[0] || bigContact, 620, pBoxY + 124);

    // Clean Ink-Saving Print Footer
    ctx.fillStyle = '#6E5F80';
    ctx.font = `500 20px ${bodyFont}`;
    ctx.fillText(`🐾 PAWTAL · ลิงก์แจ้งเบาะแส: ${caseUrl}`, 620, 1718);
    ctx.textAlign = 'left';

    return { canvas, caseUrl, qrVersion: qr.version, theme: themeKey, mode, isPublicFallback };
  }

  // ==================== MODE A: SOCIAL 4:5 FROSTED TRANSLUCENT GLASS (1080 x 1350) ====================
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  // 1. Soft Blurred Ambient Full-Canvas Backdrop
  ctx.fillStyle = '#261C33';
  ctx.fillRect(0, 0, 1080, 1350);
  if (img) {
    ctx.save();
    if ('filter' in ctx) ctx.filter = 'blur(32px)';
    drawCoverImage(ctx, img, -40, -40, 1160, 1430, 0.5);
    ctx.restore();
    ctx.fillStyle = t.bgTint;
    ctx.fillRect(0, 0, 1080, 1350);
  } else {
    ctx.fillStyle = '#F5EFE6';
    ctx.fillRect(0, 0, 1080, 1350);
  }

  // 2. Full-Bleed Sharp Hero Pet Photo (edge-to-edge 1080x995 — huge unobstructed clear view!)
  const photoH = 995;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1080, photoH);
  ctx.clip();
  if (img) {
    const isTall = img.height / Math.max(1, img.width) >= 0.9;
    drawCoverImage(ctx, img, 0, 0, 1080, photoH, isTall ? 0.22 : 0.45);
  } else {
    ctx.fillStyle = '#EFE7DB';
    ctx.fillRect(0, 0, 1080, photoH);
    ctx.fillStyle = '#7A688A';
    ctx.font = `600 32px ${displayFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('ไม่มีรูปภาพประกอบ', 540, 480);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  const edgeFade = ctx.createLinearGradient(0, 900, 0, photoH);
  edgeFade.addColorStop(0, 'rgba(24, 16, 36, 0)');
  edgeFade.addColorStop(1, 'rgba(24, 16, 36, 0.30)');
  ctx.fillStyle = edgeFade;
  ctx.fillRect(0, 900, 1080, photoH - 900);

  // 3. Ultra-Slim Frosted Translucent Top Banner (68px tall — 1-second species headline, never blocks face!)
  const topRect = { x: 28, y: 18, w: 1024, h: 68 };
  const topGrad = ctx.createLinearGradient(topRect.x, topRect.y, topRect.x + topRect.w, topRect.y);
  topGrad.addColorStop(0, t.topGlass);
  topGrad.addColorStop(1, t.topGlassEnd);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.20)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  drawRoundedRect(ctx, topRect.x, topRect.y, topRect.w, topRect.h, 34);
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  ctx.fill();
  ctx.restore();
  drawFrostedGlassPanel(ctx, img, topRect, 34, topGrad, 'rgba(255, 255, 255, 0.54)', 18);

  // Brand chip + Big 1-Second Species Headline ("สุนัขหาย!" / "แมวหาย!")
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  drawRoundedRect(ctx, topRect.x + 12, topRect.y + 13, 152, 42, 21);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 19px ${displayFont}`;
  ctx.fillText('🐾 PAWTAL', topRect.x + 28, topRect.y + 41);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 38px ${displayFont}`;
  ctx.fillText(headline, topRect.x + 182, topRect.y + 48);
  ctx.restore();

  // Right Pill inside Slim Top Bar: Gold Reward Pill OR Status Chip
  if (rewardText) {
    const rwLabel = `🏆 ${rewardText.slice(0, 26)}`;
    ctx.font = `600 20px ${displayFont}`;
    const rwW = Math.min(360, ctx.measureText(rwLabel).width + 32);
    ctx.fillStyle = 'rgba(255, 210, 70, 0.95)';
    drawRoundedRect(ctx, topRect.x + topRect.w - rwW - 12, topRect.y + 13, rwW, 42, 21);
    ctx.fill();
    ctx.fillStyle = '#3B2000';
    ctx.fillText(rwLabel, topRect.x + topRect.w - rwW + 4, topRect.y + 41);
  } else {
    const stLabel = isLost ? 'URGENT · ช่วยตามหา' : 'FOUND · ตามหาเจ้าของ';
    ctx.font = `600 19px ${bodyFont}`;
    const stW = ctx.measureText(stLabel).width + 30;
    ctx.fillStyle = t.statusPillBg;
    drawRoundedRect(ctx, topRect.x + topRect.w - stW - 12, topRect.y + 14, stW, 40, 20);
    ctx.fill();
    ctx.fillStyle = t.statusPillText;
    ctx.fillText(stLabel, topRect.x + topRect.w - stW + 3, topRect.y + 41);
  }

  // (y = 86..918 is 832px x 1080px of 100% CLEAN, UNOBSTRUCTED PET PHOTO!)

  // 4. Compact Frosted Translucent Bottom Info + QR Dock (y: 920..1308, height 388px)
  const dock = { x: 28, y: 920, w: 1024, h: 388 };
  ctx.save();
  ctx.shadowColor = 'rgba(18, 10, 32, 0.26)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  drawRoundedRect(ctx, dock.x, dock.y, dock.w, dock.h, 30);
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  ctx.fill();
  ctx.restore();
  drawFrostedGlassPanel(ctx, img, dock, 30, t.bottomGlass, 'rgba(255, 255, 255, 0.84)', 24);

  // Left Info Column inside Translucent Dock
  const lx = dock.x + 28;
  const lw = 700;

  // Row 1: Pet Name + Inline Species/Breed/Meta Chip
  ctx.font = `600 19px ${bodyFont}`;
  const chipMaxW = 410;
  const chipTxt = wrapLines(ctx, identityChip, chipMaxW - 26, 1)[0] || identityChip;
  const chipW = Math.min(chipMaxW, ctx.measureText(chipTxt).width + 28);
  const nameMaxW = Math.max(210, lw - chipW - 14);

  ctx.font = `600 40px ${displayFont}`;
  const titleLine = wrapLines(ctx, petTitle, nameMaxW, 1)[0] || 'ประกาศสัตว์เลี้ยง';
  const titleW = ctx.measureText(titleLine).width;
  ctx.fillStyle = '#241736';
  ctx.fillText(titleLine, lx, dock.y + 52);

  const chipX = Math.min(lx + titleW + 14, lx + lw - chipW);
  ctx.fillStyle = t.badgeBg;
  drawRoundedRect(ctx, chipX, dock.y + 19, chipW, 38, 19);
  ctx.fill();
  ctx.fillStyle = t.badgeText;
  ctx.font = `600 19px ${bodyFont}`;
  ctx.fillText(chipTxt, chipX + 14, dock.y + 45);

  // Row 2: Location & Time
  ctx.fillStyle = '#4B3C5E';
  ctx.font = `500 21px ${bodyFont}`;
  const metaLine = wrapLines(ctx, `📍 ${areaStr}   ·   🕒 ${whenStr}`, lw, 1)[0] || '';
  ctx.fillText(metaLine, lx, dock.y + 92);

  // Row 3: SEPARATED Behavior Warning Badge (high-visibility safety cue!)
  let bodyY = dock.y + 132;
  if (behaviorStyle) {
    ctx.font = `600 21px ${displayFont}`;
    const bTxt = wrapLines(ctx, behaviorStyle.text, lw - 32, 1)[0] || behaviorStyle.text;
    const bW = Math.min(lw, ctx.measureText(bTxt).width + 32);
    ctx.fillStyle = behaviorStyle.bg;
    drawRoundedRect(ctx, lx, dock.y + 106, bW, 40, 12);
    ctx.fill();
    ctx.strokeStyle = behaviorStyle.border;
    ctx.lineWidth = 1.8;
    drawRoundedRect(ctx, lx, dock.y + 106, bW, 40, 12);
    ctx.stroke();
    ctx.fillStyle = behaviorStyle.color;
    ctx.fillText(bTxt, lx + 16, dock.y + 133);
    bodyY = dock.y + 178;
  }

  // Row 4: Coat color + Physical Description
  if (colorLabel && !behaviorStyle) {
    ctx.fillStyle = '#623B8A';
    ctx.font = `600 19px ${bodyFont}`;
    ctx.fillText(`🎨 ${colorLabel.slice(0, 50)}`, lx, bodyY);
    bodyY += 32;
  }
  const combinedDesc = (colorLabel && behaviorStyle) ? `สี/ลาย: ${colorLabel} · ${descText}` : descText;
  ctx.fillStyle = '#332744';
  ctx.font = `400 20.5px ${bodyFont}`;
  const descLines = wrapLines(ctx, combinedDesc, lw, 2);
  for (const line of descLines) {
    ctx.fillText(line, lx, bodyY);
    bodyY += 31;
  }

  // Row 5: EXTRA-LARGE High-Contrast Contact Box at bottom of left column
  const cBarY = dock.y + dock.h - 106;
  const cBarH = 84;
  ctx.fillStyle = t.contactBg;
  drawRoundedRect(ctx, lx, cBarY, lw, cBarH, 18);
  ctx.fill();
  ctx.strokeStyle = t.contactBorder;
  ctx.lineWidth = 2.4;
  drawRoundedRect(ctx, lx, cBarY, lw, cBarH, 18);
  ctx.stroke();

  if (contactText) {
    ctx.fillStyle = '#6B4E58';
    ctx.font = `600 17px ${bodyFont}`;
    ctx.fillText('พบเห็นหรือมีเบาะแส ติดต่อด่วนได้ที่', lx + 20, cBarY + 26);
    ctx.fillStyle = t.contactText;
    const phoneSize = contactText.length > 26 ? 29 : contactText.length > 17 ? 35 : 41;
    ctx.font = `600 ${phoneSize}px ${displayFont}`;
    const cLine = wrapLines(ctx, `📞 ${contactText}`, lw - 36, 1)[0] || contactText;
    ctx.fillText(cLine, lx + 20, cBarY + 69);
  } else {
    ctx.fillStyle = t.contactText;
    ctx.font = `600 25px ${displayFont}`;
    ctx.fillText('📲 สแกน QR ด้านขวา เพื่อส่งรูปและเบาะแสผ่าน Pawtal', lx + 20, cBarY + 51);
  }

  // Subtle Vertical Glass Divider
  const divX = dock.x + 750;
  ctx.strokeStyle = 'rgba(74, 53, 90, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(divX, dock.y + 24);
  ctx.lineTo(divX, dock.y + dock.h - 24);
  ctx.stroke();

  // Right QR Column inside Translucent Dock
  const qrColCenterX = dock.x + 750 + (dock.w - 750) / 2;
  const qrBox = 222;
  const qrX = Math.round(qrColCenterX - qrBox / 2);
  const qrY = dock.y + 24;
  drawQrMatrix(ctx, qr, qrX, qrY, qrBox, t.qrBorder);

  ctx.textAlign = 'center';
  ctx.fillStyle = t.qrTitle;
  ctx.font = `600 24px ${displayFont}`;
  ctx.fillText('สแกนแจ้งเบาะแส', qrColCenterX, qrY + qrBox + 38);
  ctx.fillStyle = '#57476B';
  ctx.font = `400 18px ${bodyFont}`;
  ctx.fillText('ส่งรูป + พิกัดเข้าเคสตรง', qrColCenterX, qrY + qrBox + 65);
  ctx.fillStyle = '#8B7B9E';
  ctx.font = `500 14px monospace`;
  ctx.fillText(`PAWTAL · ${String(item.id || '').slice(0, 14)}`, qrColCenterX, qrY + qrBox + 92);
  ctx.textAlign = 'left';

  // 5. Minimal Clean Footer Line
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `500 18.5px ${bodyFont}`;
  ctx.textAlign = 'center';
  ctx.fillText('🐾 PAWTAL · ประตูเชื่อมเบาะแส พาสัตว์เลี้ยงกลับบ้าน · แชร์ลง IG / FB / LINE หรือสลับโหมด A4 พิมพ์ติดได้', 540, 1335);
  ctx.restore();
  ctx.textAlign = 'left';

  return { canvas, caseUrl, qrVersion: qr.version, theme: themeKey, mode, isPublicFallback };
}

export async function downloadPetPoster(item, options = {}) {
  const { canvas, caseUrl } = await renderPetPosterCanvas(item, options);
  const safeId = String(item.id || 'pet').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'pet';
  const link = document.createElement('a');
  link.download = `pawtal-poster-${safeId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  return { caseUrl };
}
