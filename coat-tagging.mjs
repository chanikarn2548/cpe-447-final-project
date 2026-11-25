import sharp from 'sharp';

/**
 * Classify dominant Thai coat colors & patterns from a cropped pet image.
 * Designed specifically to help match mixed-breed Thai cats, dogs, rabbits, and hamsters.
 */
export async function analyzeCoatPattern(croppedBuffer) {
  const meta = await sharp(croppedBuffer).rotate().metadata();
  const w = meta.width || 224, h = meta.height || 224;
  const left = Math.round(w * 0.12), top = Math.round(h * 0.12);
  const cw = Math.max(1, w - 2 * left), ch = Math.max(1, h - 2 * top);
  const size = 48;
  const raw = await sharp(croppedBuffer)
    .rotate()
    .extract({ left, top, width: cw, height: ch })
    .resize(size, size, { fit: 'fill' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer();

  const bins = { white: 0, black: 0, grey: 0, orange: 0, brown: 0, cream: 0 };
  let totalW = 0, edgeSum = 0, edgeCount = 0;
  const lumGrid = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - (size - 1) / 2) / ((size - 1) / 2);
      const dy = (y - (size - 1) / 2) / ((size - 1) / 2);
      const weight = Math.exp(-(dx * dx + dy * dy) * 0.75);
      const idx = (y * size + x) * 3;
      const r = raw[idx] / 255, g = raw[idx + 1] / 255, b = raw[idx + 2] / 255;
      const maxC = Math.max(r, g, b), minC = Math.min(r, g, b), delta = maxC - minC;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = maxC > 0 ? delta / maxC : 0;
      lumGrid[y * size + x] = lum;

      let hue = 0;
      if (delta > 1e-4) {
        if (maxC === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        else if (maxC === g) hue = ((b - r) / delta + 2) * 60;
        else hue = ((r - g) / delta + 4) * 60;
      }

      totalW += weight;
      if (lum > 0.76 && sat < 0.20) bins.white += weight;
      else if (lum < 0.24 && sat < 0.35) bins.black += weight;
      else if (sat < 0.18) bins.grey += weight;
      else if (hue >= 14 && hue <= 46 && lum >= 0.36 && sat >= 0.30) bins.orange += weight;
      else if (hue >= 18 && hue <= 52 && lum >= 0.62 && sat < 0.36) bins.cream += weight;
      else if (hue >= 10 && hue <= 52 && lum < 0.55) bins.brown += weight;
      else bins.grey += weight;
    }
  }

  // Estimate tabby/striped coat texture via local luminance gradients inside central body
  for (let y = 8; y < size - 8; y++) {
    for (let x = 8; x < size - 8; x++) {
      const c = lumGrid[y * size + x];
      const gx = Math.abs(c - lumGrid[y * size + (x + 1)]);
      const gy = Math.abs(c - lumGrid[(y + 1) * size + x]);
      edgeSum += gx + gy;
      edgeCount++;
    }
  }

  const ratio = Object.fromEntries(Object.entries(bins).map(([k, v]) => [k, v / (totalW || 1)]));
  const avgEdge = edgeCount ? edgeSum / edgeCount : 0;
  const striped = avgEdge >= 0.085 && (ratio.brown + ratio.grey + ratio.orange >= 0.35);

  const tags = [];
  const hasWhite = ratio.white >= 0.20;
  const hasBlack = ratio.black >= 0.18;
  const hasOrange = ratio.orange >= 0.18;
  const hasBrown = ratio.brown >= 0.22;
  const hasGrey = ratio.grey >= 0.28;
  const hasCream = ratio.cream >= 0.24;
  const isCalico = ratio.white >= 0.14 && (ratio.black >= 0.12 || ratio.brown >= 0.14) && ratio.orange >= 0.12;

  if (isCalico) tags.push('สามสี (คาลิโก้/เปรอะ)');
  else if (hasOrange && hasWhite) tags.push('ส้ม-ขาว');
  else if (hasOrange) tags.push('สีส้ม / ส้มทอง');
  else if (hasBlack && hasWhite) tags.push('ขาว-ดำ (ทักซิโด้)');
  else if (hasBrown && hasWhite) tags.push('น้ำตาล-ขาว');
  else if (hasBlack && ratio.black >= 0.48) tags.push('สีดำล้วน');
  else if (hasWhite && ratio.white >= 0.52) tags.push('สีขาวล้วน');
  else if (hasGrey && hasWhite) tags.push('เทา-ขาว');
  else if (hasGrey) tags.push('สีเทา / สวาด');
  else if (hasBrown) tags.push('สีน้ำตาล / น้ำตาลทอง');
  else if (hasCream) tags.push('สีครีม / นวล');

  if (striped) tags.push('ลายสลิด / ลายเสือ');
  if (!tags.length) {
    const topColor = Object.entries(ratio).sort((a, b) => b[1] - a[1])[0]?.[0];
    const fallbackMap = { white: 'โทนขาว', black: 'โทนดำ', grey: 'โทนเทา', orange: 'โทนส้ม', brown: 'โทนน้ำตาล', cream: 'โทนครีม' };
    tags.push(fallbackMap[topColor] || 'สีขนผสม');
  }

  return {
    primaryTag: tags[0],
    tags: tags.slice(0, 3),
    striped,
    ratios: Object.fromEntries(Object.entries(ratio).map(([k, v]) => [k, Math.round(v * 100)]))
  };
}
