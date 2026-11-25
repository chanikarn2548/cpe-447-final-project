import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAreaLocation, projectGeoPoint } from '../case-map.mjs';

test('resolveAreaLocation maps Bangkok districts and Thai provinces and projects bounded map coordinates', () => {
  const ari = resolveAreaLocation('แถวอารีย์ พญาไท');
  assert.equal(ari.exact, true);
  assert.equal(ari.region, 'bkk');

  const chiangMai = resolveAreaLocation('อำเภอเมือง จังหวัดเชียงใหม่');
  assert.equal(chiangMai.exact, true);
  assert.equal(chiangMai.region, 'th');

  const fallback = resolveAreaLocation('');
  assert.equal(fallback.exact, false);

  const bkkPoint = projectGeoPoint(ari.lat, ari.lon, 'bkk', 680, 420);
  assert.ok(bkkPoint.x >= 24 && bkkPoint.x <= 656);
  assert.ok(bkkPoint.y >= 24 && bkkPoint.y <= 396);

  const thPoint = projectGeoPoint(chiangMai.lat, chiangMai.lon, 'th', 680, 420);
  assert.ok(thPoint.x >= 24 && thPoint.x <= 656 && thPoint.y < 160);
});
