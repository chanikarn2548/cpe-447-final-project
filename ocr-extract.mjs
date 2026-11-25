import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { resolveAreaLocation } from './case-map.mjs';

const TESS_CACHE_DIR = path.join(os.tmpdir(), 'tamnong-tessdata-cache');
const workerPromises = new Map();

/**
 * Extract structured Thai contact/location cues from raw OCR text
 * (phone numbers, LINE IDs, collar/reward hints, and matched Thai districts/provinces).
 */
export function parseOcrFindings(rawText = '') {
  const normalized = String(rawText || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);

  // Thai mobile (06x, 08x, 09x -> 10 digits) and Bangkok/regional landlines (02-xxx-xxxx / 0xx-xxx-xxx -> 9 digits)
  const phoneMatches = normalized.match(/(?:\+?66[\s.-]?|0)(?:[689]\d[\s.-]?\d{3}[\s.-]?\d{4}|2[\s.-]?\d{3}[\s.-]?\d{4}|[3457]\d[\s.-]?\d{3}[\s.-]?\d{3,4})/g) || [];
  const phones = [...new Set(phoneMatches.map((m) => {
    const digits = m.replace(/^\+?66/, '0').replace(/\D/g, '');
    if (digits.length === 10 && /^0[689]/.test(digits)) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 9 && digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    return digits.length >= 9 && digits.length <= 10 ? digits : '';
  }).filter(Boolean))];

  // LINE ID patterns: "LINE ID: xxx", "ไลน์ @xxx", "ID: xxx"
  const lineIds = [];
  const lineRegex = /(?:line\s*(?:id)?|ไลน์(?:\s*ไอดี)?|id\s*line)\s*[:=@]?\s*(@?[a-z0-9._-]{3,32})/gi;
  let match;
  while ((match = lineRegex.exec(normalized)) !== null) {
    const candidate = match[1].replace(/[.,;]+$/, '');
    if (candidate && !/^\d{9,10}$/.test(candidate)) lineIds.push(candidate);
  }
  const uniqueLineIds = [...new Set(lineIds)];

  // Match Thai area / district via case-map.mjs
  const areas = [];
  const loc = resolveAreaLocation(normalized);
  if (loc.exact && loc.label) areas.push(loc.label);

  // Useful lost-pet poster / collar keywords
  const hints = [];
  if (/ปลอกคอ|collar/i.test(normalized)) hints.push('มีข้อมูลปลอกคอในภาพ');
  if (/รางวัล|สินน้ำใจ|reward/i.test(normalized)) hints.push('มีข้อความรางวัลนำจับ');
  if (/หาย|lost|ตามหา/i.test(normalized)) hints.push('ข้อความประกาศสัตว์หาย');
  if (/พบ|เจอ|found|หลง/i.test(normalized)) hints.push('ข้อความพบสัตว์พลัดหลง');

  const summaryParts = [];
  if (phones.length) summaryParts.push(`📞 ${phones.join(', ')}`);
  if (uniqueLineIds.length) summaryParts.push(`LINE: ${uniqueLineIds.join(', ')}`);
  if (areas.length) summaryParts.push(`📍 ${areas.join(', ')}`);

  return {
    text: normalized,
    lines,
    phones,
    lineIds: uniqueLineIds,
    areas,
    hints,
    summary: summaryParts.join(' · ')
  };
}

async function getOcrWorker(lang = 'tha+eng') {
  if (workerPromises.has(lang)) return workerPromises.get(lang);
  const promise = (async () => {
    await fs.mkdir(TESS_CACHE_DIR, { recursive: true });
    return await createWorker(lang, 1, {
      cachePath: TESS_CACHE_DIR,
      logger: () => {}
    });
  })();
  workerPromises.set(lang, promise);
  try {
    return await promise;
  } catch (err) {
    workerPromises.delete(lang);
    throw err;
  }
}

/**
 * Run OCR on an uploaded pet photo, collar tag, or lost-pet poster image.
 * Preprocesses with Sharp for cleaner text contrast and extracts phone/LINE/area cues.
 */
export async function extractImageText(imageBuffer, { lang = 'tha+eng' } = {}) {
  const prepped = await sharp(imageBuffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .normalize()
    .png()
    .toBuffer();

  let usedLang = lang;
  let result;
  try {
    const worker = await getOcrWorker(lang);
    result = await worker.recognize(prepped);
  } catch (err) {
    if (lang !== 'eng') {
      usedLang = 'eng';
      const fallbackWorker = await getOcrWorker('eng');
      result = await fallbackWorker.recognize(prepped);
    } else {
      throw err;
    }
  }

  const rawText = result?.data?.text || '';
  const confidence = Math.round(Number(result?.data?.confidence || 0));
  const parsed = parseOcrFindings(rawText);

  return {
    ...parsed,
    confidence,
    lang: usedLang,
    engine: 'tesseract.js'
  };
}

export async function terminateOcrWorker() {
  for (const [lang, promise] of workerPromises.entries()) {
    workerPromises.delete(lang);
    try {
      const worker = await promise;
      await worker.terminate();
    } catch {}
  }
}
