import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolate storage tests in a fresh temporary directory so npm test never mutates data/tamnong.sqlite.
const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pawtal-storage-test-'));
process.env.DATA_DIR = tempDataDir;
process.env.PAWTAL_FRESH_DB = '1';

const {
  persistMediaImage,
  syncDatabaseState,
  getDatabaseStats,
  deleteTestRecords,
  createAlert,
  evaluateAlertsForCases,
  listAlerts,
  markAlertsRead,
  deleteAlert,
  deleteCaseRecord,
  updateCaseRecord,
  verifyCaseOwnerPin,
  listFacebookGroups,
  createFacebookGroup,
  deleteFacebookGroup,
  syncDiscoveredFacebookGroups,
  getCachedEmbedding,
  setCachedEmbedding
} = await import('../storage.mjs');
import { normalizeFacebookGroupUrl, buildGroupSearchUrl } from '../fb-groups.mjs';

test.after(() => {
  try { fs.rmSync(tempDataDir, { recursive: true, force: true }); } catch {}
});

test('SQLite database and content-addressable media storage persist cases and images', () => {
  // 1x1 PNG base64
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const mediaUrl = persistMediaImage(tinyPng);
  assert.ok(mediaUrl.startsWith('data/uploads/'));
  assert.ok(mediaUrl.endsWith('.png'));

  const state = syncDatabaseState({
    cases: [{
      id: 'sqlite-test-case-1',
      type: 'lost',
      species: 'cat',
      name: 'ส้มจี๊ด',
      kind: 'แมวส้ม',
      area: 'พญาไท',
      when: 'วันนี้',
      description: 'แมวส้มทดสอบฐานข้อมูล SQLite',
      image: tinyPng,
      images: [tinyPng],
      status: 'active'
    }],
    sightings: [{
      id: 'sqlite-test-sighting-1',
      caseId: 'sqlite-test-case-1',
      title: 'พบแมวส้มใกล้ BTS',
      info: 'พญาไท',
      image: tinyPng,
      status: 'pending'
    }]
  });

  assert.ok(state.cases.some(c => c.id === 'sqlite-test-case-1' && c.image.startsWith('data/uploads/')));
  assert.ok(state.sightings.some(s => s.id === 'sqlite-test-sighting-1' && s.image.startsWith('data/uploads/')));

  const stats = getDatabaseStats();
  assert.ok(stats.tables.cases >= 1);
  assert.ok(stats.tables.sightings >= 1);
  assert.ok(stats.mediaStorage.files >= 1);
  deleteTestRecords('sqlite-test-case-1', 'sqlite-test-sighting-1');
});

test('SQLite alerts match new cases, track unread state, reject non-https webhooks, and delete cleanly', () => {
  assert.throws(() => createAlert({ name: 'bad hook', webhookUrl: 'http://insecure.invalid/hook' }), /https:\/\//);
  const created = createAlert({ name: 'แจ้งเตือนแมวอารีย์-test', species: 'cat', area: 'อารีย์', webhookUrl: 'https://example.invalid/webhook' });
  try {
    const triggered = evaluateAlertsForCases([
      { id: 'alert-test-case-1', species: 'cat', area: 'ซอยอารีย์ 2', type: 'found', name: 'แมวพบใหม่', status: 'active' },
      { id: 'alert-test-case-2', species: 'dog', area: 'ซอยอารีย์ 2', type: 'found', name: 'สุนัข', status: 'active' }
    ]);
    assert.equal(triggered.length, 1);
    assert.equal(triggered[0].webhookUrl, 'https://example.invalid/webhook');
    assert.ok(listAlerts().notifications.some(n => n.case_id === 'alert-test-case-1'));

    const afterRead = markAlertsRead();
    assert.equal(afterRead.unreadCount, 0);

    // Prevent duplicate notification for same alert + case
    const secondPass = evaluateAlertsForCases([{ id: 'alert-test-case-1', species: 'cat', area: 'ซอยอารีย์ 2', type: 'found', name: 'แมวพบใหม่', status: 'active' }]);
    assert.equal(secondPass.length, 0);

    syncDatabaseState({
      cases: [{ id: 'alert-test-case-1', type: 'found', species: 'cat', name: 'แมวพบใหม่', area: 'ซอยอารีย์ 2', image: 'assets/samples/cat.jpg', status: 'active' }]
    });
    assert.equal(deleteCaseRecord('alert-test-case-1'), true);
  } finally {
    deleteAlert(created.id);
    deleteTestRecords('alert-test-case-1', '');
  }
});

test('Facebook group URL normalization, search builder, default seeding, and SQLite persistence work cleanly', () => {
  const initial = listFacebookGroups();
  assert.ok(initial.count >= 21);
  assert.ok(initial.groups.some(g => g.url.includes('261650613992940') && g.species === 'bird'));
  assert.ok(initial.groups.some(g => g.url.includes('879535573409695') && g.species === 'bird'));
  assert.ok(initial.groups.some(g => g.url.includes('1689605884677727') && g.area.includes('เชียงใหม่')));
  assert.ok(initial.groups.some(g => g.url.includes('657874584313907') && g.area.includes('โคราช')));
  // Syncing already-known group URL is idempotent and adds 0 duplicates
  assert.equal(syncDiscoveredFacebookGroups([{ url: 'https://www.facebook.com/groups/217672018379895/', name: 'Dup' }]), 0);

  const norm = normalizeFacebookGroupUrl('facebook.com/groups/1234567890/?ref=share&mibextid=abc');
  assert.equal(norm.url, 'https://www.facebook.com/groups/1234567890/');
  assert.equal(norm.kind, 'group');
  assert.throws(() => normalizeFacebookGroupUrl('https://evil.example/groups/123'), /facebook\.com/);
  assert.throws(() => normalizeFacebookGroupUrl('https://www.facebook.com/login'), /ไม่ใช่หน้ากลุ่ม/);

  const qUrl = buildGroupSearchUrl(norm.url, { speciesLabel: 'นก', breed: 'ค็อกคาเทล (Cockatiel)', area: 'อารีย์' });
  assert.ok(qUrl.startsWith('https://www.facebook.com/groups/1234567890/search/?q='));
  assert.ok(decodeURIComponent(qUrl).includes('ค็อกคาเทล'));

  const saved = createFacebookGroup({ name: 'กลุ่มนกหาย ทดสอบ', url: 'https://www.facebook.com/groups/pawtal-test-bird-grp/', species: 'bird', area: 'กทม.' });
  try {
    assert.equal(saved.group.name, 'กลุ่มนกหาย ทดสอบ');
    assert.equal(saved.group.species, 'bird');
    assert.ok(listFacebookGroups().groups.some(g => g.id === saved.group.id));
    // Re-adding same URL updates rather than duplicating
    const updated = createFacebookGroup({ name: 'กลุ่มนกหาย อัปเดต', url: 'https://m.facebook.com/groups/pawtal-test-bird-grp?ref=1', species: 'bird', area: 'กรุงเทพฯ' });
    assert.equal(updated.group.id, saved.group.id);
    assert.equal(updated.group.area, 'กรุงเทพฯ');
  } finally {
    assert.equal(deleteFacebookGroup(saved.group.id).ok, true);
  }
});

test('SQLite embedding_cache persists valid vectors and rejects corrupt inputs', async () => {
  const key = 'v5-resmlp:pet-base:cat:https://example.invalid/cat.jpg';
  assert.equal(getCachedEmbedding(key), null);
  assert.equal(setCachedEmbedding(key, 'pet-base', 'cat', [NaN, 1]), false);
  assert.equal(setCachedEmbedding(key, 'pet-base', 'cat', [0.25, -0.5, 0.75]), true);
  assert.deepEqual(getCachedEmbedding(key), [0.25, -0.5, 0.75]);
  const stats = getDatabaseStats();
  assert.ok(stats.tables.embedding_cache >= 1);
  assert.ok(stats.tables.facebook_groups >= 21);

  const { rankPublicPosts } = await import('../public-posts.mjs');
  let embedCalls = 0;
  const cachedUrl = 'https://example.invalid/persisted-cat.jpg';
  setCachedEmbedding(`v5-resmlp:pet-base:cat:${cachedUrl}`, 'pet-base', 'cat', [1, 0, 0]);
  const res = await rankPublicPosts(
    Buffer.from('query'),
    'cat',
    async () => { embedCalls++; return [1, 0, 0]; },
    (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
    async () => [{ kind: 'public-web', species: 'cat', title: 'แมวส้ม', url: 'https://example.invalid/p/1', image: cachedUrl, source: 'Test' }],
    { get: getCachedEmbedding, set: setCachedEmbedding }
  );
  assert.equal(embedCalls, 1); // Only query embedded; candidate loaded from SQLite cache without network/embed!
  assert.equal(res.groups[0].results[0].score, 1);
});

test('Owner PIN hashes securely in SQLite, blocks unauthorized bulk sync overwrite/patch/delete, and persists OCR + GPS', () => {
  const state = syncDatabaseState({
    cases: [{
      id: 'pin-protected-case-1',
      type: 'lost',
      species: 'dog',
      name: 'โบ้',
      area: 'อารีย์',
      contact: '081-111-2222',
      ocrText: 'ปลอกคอสีฟ้า โทร 081-111-2222',
      lat: 13.7801,
      lon: 100.5449,
      image: 'assets/samples/dog.jpg',
      ownerPin: '5432',
      status: 'active'
    }]
  });
  const saved = state.cases.find(c => c.id === 'pin-protected-case-1');
  assert.ok(saved);
  assert.equal(saved.hasOwnerPin, true);
  assert.equal(saved.ownerPin, undefined);
  assert.equal(saved.owner_pin_hash, undefined);
  assert.equal(saved.ocrText, 'ปลอกคอสีฟ้า โทร 081-111-2222');
  assert.equal(saved.lat, 13.7801);
  assert.equal(saved.lon, 100.5449);

  // Bulk sync without PIN must NOT overwrite a PIN-protected case
  const afterTamper = syncDatabaseState({
    cases: [{
      id: 'pin-protected-case-1',
      type: 'lost',
      species: 'dog',
      name: 'ถูกแอบแก้ชื่อ',
      contact: '099-999-9999',
      image: 'assets/samples/dog.jpg',
      status: 'resolved'
    }]
  });
  const intact = afterTamper.cases.find(c => c.id === 'pin-protected-case-1');
  assert.equal(intact.name, 'โบ้');
  assert.equal(intact.contact, '081-111-2222');
  assert.equal(intact.status, 'active');

  // PATCH update enforces PIN server-side
  assert.throws(() => updateCaseRecord('pin-protected-case-1', { status: 'resolved' }, ''), (err) => err.statusCode === 403);
  assert.throws(() => updateCaseRecord('pin-protected-case-1', { status: 'resolved' }, '0000'), (err) => err.statusCode === 403);
  const patched = updateCaseRecord('pin-protected-case-1', { status: 'resolved', contact: '081-333-4444' }, '5432');
  assert.equal(patched.status, 'resolved');
  assert.equal(patched.contact, '081-333-4444');

  assert.equal(verifyCaseOwnerPin('pin-protected-case-1', '9999').ok, false);
  assert.equal(verifyCaseOwnerPin('pin-protected-case-1', '5432').ok, true);

  assert.throws(() => deleteCaseRecord('pin-protected-case-1', ''), (err) => err.statusCode === 403);
  assert.throws(() => deleteCaseRecord('pin-protected-case-1', '0000'), (err) => err.statusCode === 403);
  assert.equal(deleteCaseRecord('pin-protected-case-1', '5432'), true);
});
