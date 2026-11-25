import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { detectionStatus, detectPets, insidePolygon, iou } from '../detection.mjs';
import { cropPet } from '../pet-crop.mjs';
import { nearestVertexIndex } from '../zone.js';

test('five-class ONNX detector is ready and returns valid detections', async () => {
  const status = detectionStatus();
  assert.equal(status.ready, true);
  assert.deepEqual(status.classes, ['cat', 'dog', 'bird', 'rabbit', 'hamster']);
  const sample = await fs.readFile(path.resolve(import.meta.dirname, '../assets/lost-cat-sample.jpg'));
  const res = await detectPets(sample);
  assert.ok(res.width > 0 && res.height > 0);
  assert.ok(Array.isArray(res.detections));
  for (const d of res.detections) {
    assert.ok(status.classes.includes(d.label));
    assert.ok(d.confidence >= 0.25 && d.confidence <= 1);
    assert.ok(d.x >= 0 && d.y >= 0 && d.width > 0 && d.height > 0);
    assert.ok(d.x + d.width <= 1.0001 && d.y + d.height <= 1.0001);
  }
});

test('polygon zone check and IoU calculation work as expected', () => {
  const pentagon = [[0.2, 0.2], [0.8, 0.2], [0.9, 0.6], [0.5, 0.9], [0.1, 0.6]];
  assert.equal(insidePolygon([0.5, 0.5], pentagon), true);
  assert.equal(insidePolygon([0.05, 0.05], pentagon), false);
  const a = { x: 0.1, y: 0.1, width: 0.4, height: 0.4 };
  const b = { x: 0.1, y: 0.1, width: 0.4, height: 0.4 };
  assert.ok(Math.abs(iou(a, b) - 1) < 1e-6);
});

test('cropPet supports all five species and ignores unknown species', async () => {
  const sentinel = Buffer.from('untouched');
  const res = await cropPet(sentinel, 'unknown');
  assert.equal(res.applied, false);
  assert.equal(res.reason, 'unsupported-species');
  assert.equal(res.image, sentinel);
});

test('nearestVertexIndex finds closest zone corner within threshold', () => {
  const poly = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.1, 0.5]];
  assert.equal(nearestVertexIndex([0.21, 0.21], poly), 0);
  assert.equal(nearestVertexIndex([0.79, 0.81], poly), 2);
  assert.equal(nearestVertexIndex([0.5, 0.5], poly), -1);
});
