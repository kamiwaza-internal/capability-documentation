import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';

export const roadmapNotice = 'These roadmap items are unverified for 1.4.1. The listed scope awaits release evidence. Some items still need confirmation that the behavior ships on 1.4.1.';
export const roadmapFilename = 'roadmap-verification.json';

export function loadRoadmapVerification(replay, releaseMap) {
  const raw = readFileSync(new URL('../data/roadmap-verification-1.4.1.json', import.meta.url), 'utf8');
  assertPublicOutputSafe(raw);
  const roadmap = JSON.parse(raw);
  assert.equal(roadmap.schema, 'release-roadmap-verification.v1');
  assert.equal(roadmap.release, replay.version);
  const features = new Set(roadmap.features.map(row => row.id));
  const capabilities = new Set(replay.capabilities.map(row => row.id));
  const mapped = new Set(releaseMap.streams.map(row => row.id));
  assert.equal(features.size, roadmap.features.length);
  assert.equal(new Set(roadmap.streams.map(row => row.id)).size, roadmap.streams.length);
  for (const row of roadmap.streams) {
    assert.equal(row.status, 'unverified');
    assert.equal(row.recipeStatus, 'unmapped');
    assert.ok(!mapped.has(row.id), 'A roadmap stream already has a published mapping: ' + row.id);
    assert.ok(row.features.every(id => features.has(id)), 'Unknown roadmap feature on ' + row.id);
  }
  for (const row of roadmap.features) {
    assert.equal(row.status, 'unverified');
    assert.ok(row.documentation === 'partial' || row.documentation === 'gap');
    assert.ok(row.relatedCapabilities.every(id => capabilities.has(id)), 'Unknown related capability on ' + row.id);
  }
  return {roadmap, bytes: Buffer.from(raw)};
}

export function roadmapBlocks(roadmap) {
  return [
    {type: 'h', level: 2, text: 'Roadmap verification pending'},
    {type: 'p', text: roadmapNotice},
    {type: 'h', level: 3, text: 'Value streams awaiting recipe mapping'},
    {type: 'table', head: ['Value stream', '1.4.1 verification', 'Related roadmap items'], widths: [0.36, 0.23, 0.41], rows: roadmap.streams.map(
      row => [`${row.title} (${row.roadmapRef})`, 'Unverified · recipe mapping pending', row.features.join(', ')])},
    {type: 'h', level: 3, text: 'Capability coverage gaps'},
    {type: 'table', head: ['Roadmap item', '1.4.1 verification', 'Remaining scope'], widths: [0.28, 0.18, 0.54], rows: roadmap.features.map(
      row => [`${row.title} (${row.id})`, 'Unverified', row.scopeGap])},
  ];
}
