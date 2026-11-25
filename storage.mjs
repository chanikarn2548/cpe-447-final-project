import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { normalizeFacebookGroupUrl } from './fb-groups.mjs';
import { hashOwnerPin, verifyOwnerPin } from './security.mjs';

const root = path.resolve(import.meta.dirname);
const bundledDataDir = path.join(root, 'data');
export const dataDir = path.resolve(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || bundledDataDir);
export const uploadsDir = path.join(dataDir, 'uploads');
export const dbPath = path.join(dataDir, 'tamnong.sqlite');

fs.mkdirSync(uploadsDir, { recursive: true });
if (dataDir !== bundledDataDir && process.env.PAWTAL_FRESH_DB !== '1' && !fs.existsSync(dbPath) && fs.existsSync(path.join(bundledDataDir, 'tamnong.sqlite'))) {
  fs.copyFileSync(path.join(bundledDataDir, 'tamnong.sqlite'), dbPath);
  const bundledUploads = path.join(bundledDataDir, 'uploads');
  if (fs.existsSync(bundledUploads)) {
    for (const file of fs.readdirSync(bundledUploads)) {
      const src = path.join(bundledUploads, file), dst = path.join(uploadsDir, file);
      if (fs.statSync(src).isFile() && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
    }
  }
}

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    species TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT DEFAULT '',
    area TEXT DEFAULT '',
    when_text TEXT DEFAULT '',
    description TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    images_json TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    source_link TEXT DEFAULT '',
    owner_pin_hash TEXT DEFAULT '',
    ocr_text TEXT DEFAULT '',
    lat REAL,
    lon REAL,
    origin TEXT DEFAULT 'ผู้ใช้เว็บ',
    favorite INTEGER DEFAULT 0,
    followup_note TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cases_species_status ON cases(species, status);
  CREATE INDEX IF NOT EXISTS idx_cases_type ON cases(type);

  CREATE TABLE IF NOT EXISTS sightings (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    match_key TEXT DEFAULT '',
    title TEXT NOT NULL,
    info TEXT DEFAULT '',
    area TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    source_link TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    reviewed_at TEXT DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_sightings_case_id ON sightings(case_id);

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    kind TEXT DEFAULT '',
    color TEXT DEFAULT '',
    area TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    images_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS embedding_cache (
    cache_key TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    species TEXT NOT NULL,
    dimensions INTEGER NOT NULL,
    vector_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT DEFAULT '',
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    species TEXT DEFAULT 'all',
    area TEXT DEFAULT '',
    webhook_url TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alert_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id TEXT NOT NULL,
    case_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    webhook_sent INTEGER DEFAULT 0,
    seen INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS facebook_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    kind TEXT DEFAULT 'group',
    species TEXT DEFAULT 'all',
    area TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const DEFAULT_FACEBOOK_GROUPS = [
  {
    name: 'รวมหมาแมวหาย หมาแมวหลง (Lost and found dogs & cats of Thailand)',
    url: 'https://www.facebook.com/groups/217672018379895/',
    species: 'all',
    area: 'ทั่วไทย'
  },
  {
    name: 'แมวหมา-สัตว์เลี้ยงหาย (ได้กลับบ้านทั่วไทย)',
    url: 'https://www.facebook.com/groups/4465234313758768/',
    species: 'all',
    area: 'ทั่วไทย'
  },
  {
    name: 'ประกาศนกหาย ตามหาเจ้าของ (ประเทศไทย)',
    url: 'https://www.facebook.com/groups/261650613992940/',
    species: 'bird',
    area: 'ทั่วไทย'
  },
  {
    name: 'กลุ่มตามหานกหาย-นกหลุด (เครือข่าย Pawsociety)',
    url: 'https://www.facebook.com/groups/879535573409695/',
    species: 'bird',
    area: 'กรุงเทพฯ และปริมณฑล'
  },
  {
    name: 'ตามหาแมวหาย ตามหาบ้านให้น้องเหมียว',
    url: 'https://www.facebook.com/groups/330370007395358/',
    species: 'cat',
    area: 'ทั่วไทย'
  },
  {
    name: 'หมาหลง แมวหาย ตามหาเจ้าของ (Cat & Dog)',
    url: 'https://www.facebook.com/groups/1583911722984023/',
    species: 'all',
    area: 'ทั่วไทย'
  },
  {
    name: 'กลุ่มสัตว์หายได้กลับบ้าน (Pet Back Home)',
    url: 'https://www.facebook.com/groups/petbackhomegroup/',
    species: 'all',
    area: 'ทั่วไทย'
  },
  {
    name: 'กลุ่มสัตว์เลี้ยงหาย หมา แมว นก (เครือข่าย Pawsociety)',
    url: 'https://www.facebook.com/groups/912622389504022/',
    species: 'all',
    area: 'ทั่วไทย'
  },
  {
    name: 'กลุ่มตามหาแมว-สุนัขหาย (เครือข่าย Pawsociety)',
    url: 'https://www.facebook.com/groups/1146955245921778/',
    species: 'cat',
    area: 'ทั่วไทย'
  },
  {
    name: 'กลุ่มตามหาสุนัข-แมวหาย (เครือข่าย Pawsociety)',
    url: 'https://www.facebook.com/groups/143685079175348/',
    species: 'dog',
    area: 'ทั่วไทย'
  },
  {
    name: 'ตามหานกหาย หมาหาย แมวหาย และสัตว์เลี้ยงทุกชนิด',
    url: 'https://www.facebook.com/groups/274604807660778/',
    species: 'all',
    area: 'ทั่วไทย'
  },
  {
    name: 'ศูนย์รวมประกาศสุนัขหาย',
    url: 'https://www.facebook.com/groups/530073320391399/',
    species: 'dog',
    area: 'ทั่วไทย'
  },
  {
    name: 'หมาแมวหายได้กลับบ้าน',
    url: 'https://www.facebook.com/groups/399858348018822/',
    species: 'all',
    area: 'ทั่วไทย'
  },
  {
    name: 'หมาแมวหลง/หาย @นนทบุรี',
    url: 'https://www.facebook.com/groups/578917096096516/',
    species: 'all',
    area: 'นนทบุรี'
  },
  {
    name: 'กลุ่มคนรักหมาแมว นครปฐม (ภาคกลาง)',
    url: 'https://www.facebook.com/groups/1619330234961719/',
    species: 'all',
    area: 'นครปฐม / ภาคกลาง'
  },
  {
    name: 'หมาหายชลบุรี',
    url: 'https://www.facebook.com/groups/1128441937342674/',
    species: 'dog',
    area: 'ชลบุรี'
  },
  {
    name: 'ตามหาหมาแมวหลงพัทยา',
    url: 'https://www.facebook.com/groups/1781374372076187/',
    species: 'all',
    area: 'พัทยา / ชลบุรี'
  },
  {
    name: 'ประกาศแมวหาย สุนัขล่องหน เชียงใหม่',
    url: 'https://www.facebook.com/groups/1689605884677727/',
    species: 'all',
    area: 'เชียงใหม่'
  },
  {
    name: 'หมาแมวหลง-หาย (ใส่ #จังหวัด บนหัวโพสต์)',
    url: 'https://www.facebook.com/groups/624353101509966/',
    species: 'all',
    area: 'ทั่วไทย'
  },
  {
    name: '🆘 หมา-แมวหลง-หาย เชียงราย',
    url: 'https://www.facebook.com/groups/1633976433538628/',
    species: 'all',
    area: 'เชียงราย'
  },
  {
    name: 'หมา แมว หายในโคราช',
    url: 'https://www.facebook.com/groups/657874584313907/',
    species: 'all',
    area: 'นครราชสีมา / โคราช'
  }
];

function seedDefaultFacebookGroups() {
  const already = db.prepare("SELECT value FROM app_meta WHERE key = 'fb_groups_seeded_v2'").get();
  if (already) return;
  const upsert = db.prepare(`
    INSERT INTO facebook_groups (id, name, url, kind, species, area, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      name = CASE WHEN facebook_groups.name LIKE 'กลุ่ม Facebook (%' THEN excluded.name ELSE facebook_groups.name END,
      area = CASE WHEN facebook_groups.area = '' THEN excluded.area ELSE facebook_groups.area END
  `);
  const now = new Date().toISOString();
  for (let i = 0; i < DEFAULT_FACEBOOK_GROUPS.length; i++) {
    const g = DEFAULT_FACEBOOK_GROUPS[i];
    const norm = normalizeFacebookGroupUrl(g.url);
    const id = `fbg_sys_${i + 1}`;
    upsert.run(id, g.name, norm.url, norm.kind, g.species, g.area, now);
  }
  db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('fb_groups_seeded_v2', ?)").run(now);
}
seedDefaultFacebookGroups();

/**
 * Converts a data:image/...;base64 string into a content-addressed file in data/uploads/<sha256>.jpg
 * and returns the clean relative URL (/data/uploads/<sha256>.jpg). Leaves normal URLs/paths untouched.
 */
export function persistMediaImage(value) {
  if (typeof value !== 'string' || !value) return '';
  const match = value.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return value;
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const buf = Buffer.from(match[2], 'base64');
  if (!buf.length || buf.length > 8_000_000) return '';
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24);
  const fileName = `${hash}.${ext}`;
  const fullPath = path.join(uploadsDir, fileName);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, buf);
  }
  return `data/uploads/${fileName}`;
}

export function deleteTestRecords(caseId, sightingId) {
  db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
  db.prepare('DELETE FROM sightings WHERE id = ?').run(sightingId);
}

export function logActivity(action, entityType, entityId, summary) {
  try {
    const stmt = db.prepare(
      'INSERT INTO activity_logs (action, entity_type, entity_id, summary, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(action, entityType, String(entityId || ''), String(summary || '').slice(0, 300), new Date().toISOString());
  } catch {}
}

try { db.exec("ALTER TABLE cases ADD COLUMN owner_pin_hash TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE cases ADD COLUMN ocr_text TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE cases ADD COLUMN lat REAL"); } catch {}
try { db.exec("ALTER TABLE cases ADD COLUMN lon REAL"); } catch {}

const getCasePinStmt = db.prepare('SELECT owner_pin_hash FROM cases WHERE id = ?');

const upsertCaseStmt = db.prepare(`
  INSERT INTO cases (
    id, type, species, name, kind, area, when_text, description, contact,
    image_url, images_json, status, source_link, origin, favorite, followup_note, owner_pin_hash, ocr_text, lat, lon, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    type = excluded.type,
    species = excluded.species,
    name = excluded.name,
    kind = excluded.kind,
    area = excluded.area,
    when_text = excluded.when_text,
    description = excluded.description,
    contact = excluded.contact,
    image_url = excluded.image_url,
    images_json = excluded.images_json,
    status = excluded.status,
    source_link = excluded.source_link,
    origin = excluded.origin,
    favorite = excluded.favorite,
    followup_note = excluded.followup_note,
    owner_pin_hash = CASE WHEN cases.owner_pin_hash != '' THEN cases.owner_pin_hash ELSE excluded.owner_pin_hash END,
    ocr_text = CASE WHEN excluded.ocr_text != '' THEN excluded.ocr_text ELSE cases.ocr_text END,
    lat = COALESCE(excluded.lat, cases.lat),
    lon = COALESCE(excluded.lon, cases.lon),
    updated_at = excluded.updated_at
`);

const upsertSightingStmt = db.prepare(`
  INSERT INTO sightings (
    id, case_id, match_key, title, info, area, image_url, source_link, status, note, created_at, reviewed_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    status = excluded.status,
    note = excluded.note,
    reviewed_at = excluded.reviewed_at
`);

const upsertProfileStmt = db.prepare(`
  INSERT INTO profiles (
    id, name, species, kind, color, area, notes, image_url, images_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    species = excluded.species,
    kind = excluded.kind,
    color = excluded.color,
    area = excluded.area,
    notes = excluded.notes,
    image_url = excluded.image_url,
    images_json = excluded.images_json,
    updated_at = excluded.updated_at
`);

function validCoord(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max ? num : null;
}

export function syncDatabaseState({ cases = [], sightings = [], profiles = [] } = {}) {
  const now = new Date().toISOString();
  const countBefore = db.prepare('SELECT COUNT(*) AS c FROM cases').get().c;

  for (const c of cases) {
    if (!c || c.isDemo || typeof c.id !== 'string') continue;
    const caseId = String(c.id).slice(0, 100);
    const existingPin = getCasePinStmt.get(caseId)?.owner_pin_hash || '';
    // Protect PIN-locked records from unauthorized bulk sync overwrites; authorized edits must pass matching PIN or use PATCH /api/cases/:id.
    if (existingPin && !verifyOwnerPin(c.ownerPin || '', existingPin)) continue;

    const rawImages = Array.isArray(c.images) && c.images.length ? c.images : [c.image].filter(Boolean);
    const savedImages = rawImages.slice(0, 2).map(persistMediaImage).filter(Boolean);
    const primaryImage = savedImages[0] || persistMediaImage(c.image);
    if (!primaryImage) continue;
    const pinHash = existingPin ? existingPin : (c.ownerPin ? hashOwnerPin(c.ownerPin) : '');
    const lat = validCoord(c.lat, -90, 90);
    const lon = validCoord(c.lon, -180, 180);
    upsertCaseStmt.run(
      caseId,
      c.type === 'found' ? 'found' : 'lost',
      String(c.species || 'unknown').slice(0, 20),
      String(c.name || 'ยังไม่ระบุชื่อ').slice(0, 120),
      String(c.kind || '').slice(0, 200),
      String(c.area || '').slice(0, 200),
      String(c.when || 'ไม่ระบุเวลา').slice(0, 100),
      String(c.description || '').slice(0, 1500),
      String(c.contact || '').slice(0, 200),
      primaryImage,
      JSON.stringify(savedImages),
      c.status === 'resolved' ? 'resolved' : 'active',
      String(c.sourceLink || '').slice(0, 500),
      String(c.origin || 'ผู้ใช้เว็บ').slice(0, 80),
      c.favorite ? 1 : 0,
      String(c.followupNote || '').slice(0, 2000),
      pinHash,
      String(c.ocrText || '').slice(0, 1500),
      lat,
      lon,
      String(c.createdAt || now).slice(0, 40),
      now
    );
  }

  for (const s of sightings) {
    if (!s || typeof s.title !== 'string') continue;
    const sid = s.id || crypto.createHash('sha1').update(`${s.caseId || ''}:${s.matchKey || s.createdAt || s.title}`).digest('hex').slice(0, 20);
    const imgUrl = persistMediaImage(s.image || '');
    upsertSightingStmt.run(
      sid,
      String(s.caseId || '').slice(0, 100),
      String(s.matchKey || '').slice(0, 500),
      String(s.title).slice(0, 400),
      String(s.info || '').slice(0, 300),
      String(s.area || '').slice(0, 200),
      imgUrl,
      String(s.sourceLink || '').slice(0, 500),
      String(s.status || 'pending').slice(0, 30),
      String(s.note || '').slice(0, 2000),
      String(s.createdAt || now).slice(0, 40),
      String(s.reviewedAt || '').slice(0, 40)
    );
  }

  for (const p of profiles) {
    if (!p || typeof p.name !== 'string') continue;
    const pid = p.id || crypto.createHash('sha1').update(`${p.name}:${p.species || ''}`).digest('hex').slice(0, 20);
    const rawImages = Array.isArray(p.images) && p.images.length ? p.images : [p.image].filter(Boolean);
    const savedImages = rawImages.slice(0, 4).map(persistMediaImage).filter(Boolean);
    const primaryImage = savedImages[0] || persistMediaImage(p.image || '');
    upsertProfileStmt.run(
      pid,
      String(p.name).slice(0, 120),
      String(p.species || 'dog').slice(0, 20),
      String(p.kind || '').slice(0, 200),
      String(p.color || '').slice(0, 200),
      String(p.area || '').slice(0, 200),
      String(p.notes || '').slice(0, 1500),
      primaryImage,
      JSON.stringify(savedImages),
      now,
      now
    );
  }

  const countAfter = db.prepare('SELECT COUNT(*) AS c FROM cases').get().c;
  if (countAfter > countBefore) {
    logActivity('UPSERT_CASE', 'cases', '', `บันทึกเคสใหม่ลงฐานข้อมูล SQLite รวม ${countAfter} เคส`);
  }
  return getDatabaseState();
}

export function getDatabaseState() {
  const caseRows = db.prepare('SELECT * FROM cases ORDER BY created_at DESC LIMIT 100').all();
  const sightingRows = db.prepare('SELECT * FROM sightings ORDER BY created_at DESC LIMIT 200').all();
  const profileRows = db.prepare('SELECT * FROM profiles ORDER BY updated_at DESC LIMIT 100').all();

  const cases = caseRows.map(r => ({
    id: r.id,
    type: r.type,
    species: r.species,
    name: r.name,
    kind: r.kind,
    area: r.area,
    when: r.when_text,
    description: r.description,
    contact: r.contact,
    image: r.image_url,
    images: JSON.parse(r.images_json || '[]'),
    status: r.status,
    sourceLink: r.source_link,
    origin: r.origin,
    position: 'center',
    updated: 'ซิงก์จากฐานข้อมูล SQLite',
    createdAt: r.created_at,
    favorite: Boolean(r.favorite),
    followupNote: r.followup_note,
    ocrText: r.ocr_text || '',
    lat: Number.isFinite(r.lat) ? r.lat : null,
    lon: Number.isFinite(r.lon) ? r.lon : null,
    hasOwnerPin: Boolean(r.owner_pin_hash)
  }));

  const sightings = sightingRows.map(r => ({
    id: r.id,
    caseId: r.case_id,
    matchKey: r.match_key,
    title: r.title,
    info: r.info,
    area: r.area,
    image: r.image_url,
    sourceLink: r.source_link,
    status: r.status,
    note: r.note,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at
  }));

  const profiles = profileRows.map(r => ({
    id: r.id,
    name: r.name,
    species: r.species,
    kind: r.kind,
    color: r.color,
    area: r.area,
    notes: r.notes,
    image: r.image_url,
    images: JSON.parse(r.images_json || '[]')
  }));

  return { cases, sightings, profiles, updatedAt: new Date().toISOString() };
}

export function getCachedEmbedding(cacheKey) {
  const key = String(cacheKey || '').trim();
  if (!key) return null;
  try {
    const row = db.prepare('SELECT dimensions, vector_json FROM embedding_cache WHERE cache_key = ?').get(key);
    if (!row) return null;
    const vector = JSON.parse(row.vector_json);
    if (!Array.isArray(vector) || vector.length !== row.dimensions || !vector.every(Number.isFinite)) return null;
    return vector;
  } catch {
    return null;
  }
}

export function setCachedEmbedding(cacheKey, model, species, vector) {
  const key = String(cacheKey || '').trim();
  if (!key || !Array.isArray(vector) || !vector.length || !vector.every(Number.isFinite)) return false;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO embedding_cache (cache_key, model, species, dimensions, vector_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET
      model = excluded.model,
      species = excluded.species,
      dimensions = excluded.dimensions,
      vector_json = excluded.vector_json,
      created_at = excluded.created_at
  `).run(key, String(model || ''), String(species || ''), vector.length, JSON.stringify(vector), now);
  const count = db.prepare('SELECT COUNT(*) AS c FROM embedding_cache').get().c;
  if (count > 1500) {
    db.prepare(`
      DELETE FROM embedding_cache
      WHERE cache_key IN (SELECT cache_key FROM embedding_cache ORDER BY created_at ASC LIMIT ?)
    `).run(count - 1200);
  }
  return true;
}

export function getDatabaseStats() {
  const casesCount = db.prepare('SELECT COUNT(*) AS c FROM cases').get().c;
  const sightingsCount = db.prepare('SELECT COUNT(*) AS c FROM sightings').get().c;
  const profilesCount = db.prepare('SELECT COUNT(*) AS c FROM profiles').get().c;
  const cacheCount = db.prepare('SELECT COUNT(*) AS c FROM embedding_cache').get().c;
  const alertsCount = db.prepare('SELECT COUNT(*) AS c FROM alerts').get().c;
  const fbGroupsCount = db.prepare('SELECT COUNT(*) AS c FROM facebook_groups').get().c;
  const recentLogs = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 8').all();
  let mediaFiles = 0, mediaBytes = 0;
  try {
    for (const name of fs.readdirSync(uploadsDir)) {
      const st = fs.statSync(path.join(uploadsDir, name));
      if (st.isFile()) { mediaFiles++; mediaBytes += st.size; }
    }
  } catch {}
  let dbSizeBytes = 0;
  try { dbSizeBytes = fs.statSync(dbPath).size; } catch {}

  return {
    engine: 'SQLite 3 (WAL Relational Mode) + Media Object Store',
    databaseFile: 'data/tamnong.sqlite',
    uploadsDirectory: 'data/uploads/',
    dbSizeBytes,
    tables: {
      cases: casesCount,
      sightings: sightingsCount,
      profiles: profilesCount,
      embedding_cache: cacheCount,
      alerts: alertsCount,
      facebook_groups: fbGroupsCount
    },
    mediaStorage: {
      files: mediaFiles,
      bytes: mediaBytes
    },
    recentLogs
  };
}

export function verifyCaseOwnerPin(caseId, pin = '') {
  const id = String(caseId || '').trim();
  if (!id) return { ok: false, hasOwnerPin: false };
  const row = db.prepare('SELECT owner_pin_hash FROM cases WHERE id = ?').get(id);
  if (!row) return { ok: false, hasOwnerPin: false, notFound: true };
  if (!row.owner_pin_hash) return { ok: true, hasOwnerPin: false };
  return { ok: verifyOwnerPin(pin, row.owner_pin_hash), hasOwnerPin: true };
}

export function updateCaseRecord(caseId, patch = {}, pin = '') {
  const id = String(caseId || '').trim();
  if (!id) return null;
  const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
  if (!row) return null;
  if (row.owner_pin_hash && !verifyOwnerPin(pin, row.owner_pin_hash)) {
    const err = new Error('กรุณากรอกรหัส PIN 4–6 หลักของเจ้าของประกาศให้ถูกต้องก่อนแก้ไข');
    err.statusCode = 403;
    throw err;
  }
  const now = new Date().toISOString();
  const nextLat = patch.lat !== undefined ? validCoord(patch.lat, -90, 90) : row.lat;
  const nextLon = patch.lon !== undefined ? validCoord(patch.lon, -180, 180) : row.lon;
  db.prepare(`
    UPDATE cases SET
      species = ?, name = ?, kind = ?, area = ?, when_text = ?,
      description = ?, contact = ?, status = ?, favorite = ?,
      followup_note = ?, ocr_text = ?, lat = ?, lon = ?, updated_at = ?
    WHERE id = ?
  `).run(
    patch.species !== undefined ? String(patch.species || 'unknown').slice(0, 20) : row.species,
    patch.name !== undefined ? String(patch.name || 'ยังไม่ระบุชื่อ').slice(0, 120) : row.name,
    patch.kind !== undefined ? String(patch.kind || '').slice(0, 200) : row.kind,
    patch.area !== undefined ? String(patch.area || '').slice(0, 200) : row.area,
    patch.when !== undefined ? String(patch.when || 'ไม่ระบุเวลา').slice(0, 100) : row.when_text,
    patch.description !== undefined ? String(patch.description || '').slice(0, 1500) : row.description,
    patch.contact !== undefined ? String(patch.contact || '').slice(0, 200) : row.contact,
    patch.status !== undefined ? (patch.status === 'resolved' ? 'resolved' : 'active') : row.status,
    patch.favorite !== undefined ? (patch.favorite ? 1 : 0) : row.favorite,
    patch.followupNote !== undefined ? String(patch.followupNote || '').slice(0, 2000) : row.followup_note,
    patch.ocrText !== undefined ? String(patch.ocrText || '').slice(0, 1500) : (row.ocr_text || ''),
    nextLat,
    nextLon,
    now,
    id
  );
  logActivity('UPDATE_CASE', 'cases', id, `อัปเดตประกาศเคส ${id}`);
  return getDatabaseState().cases.find(c => c.id === id) || null;
}

export function closeDatabase() {
  try { db.close(); } catch {}
}

export function deleteCaseRecord(caseId, pin = '') {
  const id = String(caseId || '').trim();
  if (!id) return false;
  const row = db.prepare('SELECT owner_pin_hash FROM cases WHERE id = ?').get(id);
  if (!row) return false;
  if (row.owner_pin_hash && !verifyOwnerPin(pin, row.owner_pin_hash)) {
    const err = new Error('กรุณากรอกรหัส PIN 4–6 หลักของเจ้าของประกาศให้ถูกต้องก่อนลบ');
    err.statusCode = 403;
    throw err;
  }
  const info = db.prepare('DELETE FROM cases WHERE id = ?').run(id);
  db.prepare('DELETE FROM sightings WHERE case_id = ?').run(id);
  db.prepare('DELETE FROM alert_notifications WHERE case_id = ?').run(id);
  if (info.changes) logActivity('DELETE_CASE', 'cases', id, `ลบประกาศเคส ${id}`);
  return info.changes > 0;
}

export function listAlerts() {
  const alerts = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50').all();
  const notifications = db.prepare('SELECT * FROM alert_notifications ORDER BY id DESC LIMIT 50').all();
  const unreadCount = db.prepare('SELECT COUNT(*) AS c FROM alert_notifications WHERE seen = 0').get().c;
  return { alerts, notifications, unreadCount };
}

export function createAlert({ name, species = 'all', area = '', webhookUrl = '' }) {
  const cleanName = String(name || '').trim().slice(0, 120);
  if (!cleanName) throw new Error('กรุณาระบุชื่อแจ้งเตือน');
  let cleanWebhook = '';
  if (webhookUrl && String(webhookUrl).trim()) {
    const parsed = new URL(String(webhookUrl).trim());
    if (parsed.protocol !== 'https:') throw new Error('Webhook ต้องเป็นลิงก์ https:// เท่านั้น');
    cleanWebhook = parsed.href;
  }
  const cleanSpecies = ['all', 'dog', 'cat', 'bird', 'rabbit', 'hamster'].includes(species) ? species : 'all';
  const cleanArea = String(area || '').trim().slice(0, 120);
  const id = `alert_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO alerts (id, name, species, area, webhook_url, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)').run(id, cleanName, cleanSpecies, cleanArea, cleanWebhook, now);
  logActivity('CREATE_ALERT', 'alerts', id, `ตั้งแจ้งเตือน: ${cleanName}`);
  const existingRows = db.prepare("SELECT id, type, species, name, area, status FROM cases WHERE status != 'resolved'").all();
  const matched = evaluateAlertsForCases(existingRows, { skipLog: true });
  return { id, name: cleanName, species: cleanSpecies, area: cleanArea, webhookUrl: cleanWebhook, initialMatches: matched.length };
}

export function deleteAlert(alertId) {
  const id = String(alertId || '').trim();
  const info = db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
  db.prepare('DELETE FROM alert_notifications WHERE alert_id = ?').run(id);
  return info.changes > 0;
}

export function markAlertsRead() {
  db.prepare('UPDATE alert_notifications SET seen = 1 WHERE seen = 0').run();
  return listAlerts();
}

export function evaluateAlertsForCases(inputCases = [], { skipLog = false } = {}) {
  const alerts = db.prepare('SELECT * FROM alerts WHERE active = 1').all();
  if (!alerts.length || !Array.isArray(inputCases) || !inputCases.length) return [];
  const created = [], now = new Date().toISOString();
  const checkDup = db.prepare('SELECT id FROM alert_notifications WHERE alert_id = ? AND case_id = ?');
  const insertNotif = db.prepare('INSERT INTO alert_notifications (alert_id, case_id, title, message, webhook_sent, seen, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)');
  for (const c of inputCases) {
    if (!c?.id || c.id === 'seed-check' || c.status === 'resolved') continue;
    for (const a of alerts) {
      if (a.species !== 'all' && c.species !== a.species) continue;
      if (a.area && !String(c.area || '').toLowerCase().includes(a.area.toLowerCase())) continue;
      if (checkDup.get(a.id, c.id)) continue;
      const title = `พบประกาศตรงกับ “${a.name}”`;
      const message = `${c.name || 'ไม่ระบุชื่อ'} (${c.species}) · ${c.area || 'ไม่ระบุพื้นที่'} [${c.type === 'found' ? 'พบสัตว์' : 'สัตว์หาย'}]`;
      insertNotif.run(a.id, c.id, title, message, 0, now);
      created.push({ alertId: a.id, webhookUrl: a.webhook_url || '', caseId: c.id, title, message });
      if (!skipLog) logActivity('ALERT_MATCH', 'alerts', a.id, message);
    }
  }
  return created;
}

export function listFacebookGroups() {
  const groups = db.prepare('SELECT * FROM facebook_groups ORDER BY created_at DESC LIMIT 100').all();
  return { groups, count: groups.length };
}

export function createFacebookGroup({ name = '', url, species = 'all', area = '' }) {
  const normalized = normalizeFacebookGroupUrl(url);
  const cleanName = (String(name || '').trim() || normalized.defaultName || 'กลุ่ม Facebook').slice(0, 120);
  const cleanSpecies = ['all', 'dog', 'cat', 'bird', 'rabbit', 'hamster'].includes(species) ? species : 'all';
  const cleanArea = String(area || '').trim().slice(0, 120);
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM facebook_groups WHERE url = ?').get(normalized.url);
  let id;
  if (existing) {
    id = existing.id;
    db.prepare('UPDATE facebook_groups SET name = ?, kind = ?, species = ?, area = ? WHERE id = ?').run(
      cleanName,
      normalized.kind,
      cleanSpecies,
      cleanArea,
      id
    );
  } else {
    id = `fbg_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO facebook_groups (id, name, url, kind, species, area, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id,
      cleanName,
      normalized.url,
      normalized.kind,
      cleanSpecies,
      cleanArea,
      now
    );
  }
  logActivity('LINK_FB_GROUP', 'facebook_groups', id, `เชื่อมกลุ่ม: ${cleanName}`);
  const group = db.prepare('SELECT * FROM facebook_groups WHERE id = ?').get(id);
  return { group, ...listFacebookGroups() };
}

export function deleteFacebookGroup(groupId) {
  const id = String(groupId || '').trim();
  const info = db.prepare('DELETE FROM facebook_groups WHERE id = ?').run(id);
  if (info.changes) logActivity('UNLINK_FB_GROUP', 'facebook_groups', id, `ยกเลิกเชื่อมกลุ่ม ${id}`);
  return { ok: info.changes > 0, ...listFacebookGroups() };
}

export function syncDiscoveredFacebookGroups(items = []) {
  if (!Array.isArray(items) || !items.length) return 0;
  const insert = db.prepare(
    'INSERT OR IGNORE INTO facebook_groups (id, name, url, kind, species, area, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  let added = 0;
  for (const item of items) {
    try {
      const norm = normalizeFacebookGroupUrl(item?.url);
      if (norm.kind !== 'group') continue;
      const cleanName = (String(item?.name || '').trim() || norm.defaultName).slice(0, 120);
      const cleanSpecies = ['all', 'dog', 'cat', 'bird', 'rabbit', 'hamster'].includes(item?.species) ? item.species : 'all';
      const cleanArea = String(item?.area || '').trim().slice(0, 120);
      const hashId = 'fbg_' + crypto.createHash('sha256').update(norm.url).digest('hex').slice(0, 12);
      const res = insert.run(hashId, cleanName, norm.url, norm.kind, cleanSpecies, cleanArea, now);
      if (res.changes > 0) added++;
    } catch {}
  }
  return added;
}
