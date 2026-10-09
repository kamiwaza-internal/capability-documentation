import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validatePublication, releaseSnapshotDigest} from '../scripts/publication.mjs';
import {preserveHistory} from '../scripts/preserve-history.mjs';
import {emitBundles} from '../scripts/published-bundles.mjs';
import {assertPublicOutputSafe} from '../scripts/public-output-privacy.mjs';
import {releaseStampsFixture} from './fixtures/release-stamps.mjs';
import {observationsFixture} from './fixtures/observations.mjs';
const first = publication => publication.releaseStamps[0];
test('scoped stamps retain failed, unexecuted and excluded inventory separately from human approval', () => {
  const snapshot = first(validatePublication(releaseStampsFixture()));
  assert.equal(snapshot.approval.status, 'approved');
  assert.equal(snapshot.counts.releaseStamped, 1);
  assert.equal(snapshot.counts.failed, 1);
  assert.equal(snapshot.counts.notStamped, 1);
  assert.ok(snapshot.capabilities.every(cap => cap.wholeClaim === false));
  const publication = releaseStampsFixture();
  first(publication).approval = {status: 'pending', scope: 'full-inventory', approvedBy: null, approvedAt: null, snapshotSha256: null};
  assert.doesNotThrow(() => validatePublication(publication));
});
test('additive migration keeps every old bundle and index byte-identical; new bundle hashes exact bytes', () => {
  const before = observationsFixture(), after = releaseStampsFixture();
  preserveHistory(before, after);
  const a = mkdtempSync(join(tmpdir(), 'stamp-before-')), b = mkdtempSync(join(tmpdir(), 'stamp-after-'));
  emitBundles(before, a); emitBundles(after, b);
  for (const axis of ['releases', 'observations']) {
    for (const item of before[axis]) for (const suffix of ['bundle.json', 'bundle.md']) {
      const path = join(axis, item.id, suffix);
      assert.deepEqual(readFileSync(join(a, path)), readFileSync(join(b, path)));
    }
    assert.deepEqual(readFileSync(join(a, axis, 'index.json')), readFileSync(join(b, axis, 'index.json')));
  }
  const index = JSON.parse(readFileSync(join(b, 'release-stamps/index.json')));
  const bytes = readFileSync(join(b, index.snapshots[0].bundle));
  assert.equal(index.snapshots[0].sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(JSON.parse(bytes).snapshot, first(after));
  assertPublicOutputSafe(bytes);
  const changed = structuredClone(after); first(changed).capabilities[2].scope = 'Changed public scope.';
  assert.throws(() => preserveHistory(after, changed), /Published release stamps/);
  assert.throws(() => preserveHistory(after, before), /Published revision|release stamps/);
});
for (const [name, mutate, reason] of [
  ['source mismatch', s => s.capabilities[0].stamp.releaseSource.sourceRevision = 'f'.repeat(40), /source mismatch/],
  ['wrong tag', s => s.source.ref = 'v1.3.0', /intended release/],
  ['short commit', s => s.source.sourceRevision = 'aaaaaaa', /intended release/],
  ['manifest mismatch', s => s.capabilities[0].stamp.manifestId = 'f'.repeat(64), /binding mismatch/],
  ['target mismatch', s => s.capabilities[0].stamp.targetRelease = '1.3.0', /binding mismatch/],
  ['capability mismatch', s => s.capabilities[0].stamp.capability = 'synthetic.unexecuted', /binding mismatch/],
  ['missing frontend', s => s.images[1].component = 'another', /frontend/],
  ['bad digest', s => s.images[0].digest = 'image:latest', /image digest/],
  ['duplicate image', s => s.images[1].component = 'core', /Duplicate identifiers/],
  ['observed only', s => s.basis = 'scoped-runtime-observations', /Canonical replay/],
  ['whole promotion', s => s.capabilities[0].wholeClaim = true, /whole capabilities/],
  ['raw canonical path', s => s.capabilities[0].stamp.evidence = '/home/private/evidence', /Unexpected or missing/],
  ['private notes', s => s.capabilities[0].limits.push('Bearer private-token'), /Private release/],
  ['private root path', s => s.capabilities[0].scope = '/root/private/fixture', /Private release/],
  ['private access token', s => s.capabilities[0].scope = 'access_token: SECRET', /Private release/],
  ['private quoted token', s => s.capabilities[0].scope = '{"access_token":"synthetic-secret"}', /Private release/],
  ['private escaped root path', s => s.capabilities[0].scope = String.raw`\u002froot\u002fprivate`, /Private release/],
  ['private session identifier', s => s.capabilities[0].scope = 'session_id: value', /Private release/],
  ['private host', s => s.capabilities[0].scope = 'Connect to https://private.invalid', /Private release/],
  ['fake approval', s => s.approval.snapshotSha256 = 'f'.repeat(64), /snapshot binding/],
  ['subset signoff', s => s.approval.scope = 'selected-passes-only', /Full inventory/],
  ['approval before body', s => s.approval.approvedAt = '2026-10-01T11:59:59Z', /predates snapshot/],
  ['duplicate row', s => s.capabilities.push(structuredClone(s.capabilities[0])), /Duplicate identifiers/],
  ['wrong counts', s => s.counts.catalog = 5, /full inventory/],
  ['unexecuted as pass', s => s.capabilities[2].status = 'release-stamped', /clean included/],
  ['excluded as pass', s => s.capabilities[0].disposition = 'excluded', /clean included/],
  ['missing failure', s => s.capabilities[1].failures = [], /retain unresolved/],
  ['erased failure', s => s.capabilities[1].status = 'not-stamped', /retain unresolved/],
  ['unresolved stamped failure', s => s.capabilities[0].failures[0].resolvedByStampId = null, /clean included/],
  ['wrong corrective stamp', s => s.capabilities[0].failures[0].resolvedByStampId = 'f'.repeat(64), /corrective replay/],
  ['stale corrective replay', s => s.capabilities[0].failures[0].finishedAt = '2026-10-01T11:00:00.000003Z', /corrective replay/],
  ['stamp outside window', s => s.capabilities[0].stamp.finishedAt = '2026-10-01T11:00:00.000003Z', /fresh replay window/],
  ['future run', s => s.evidenceWindow.latestFinishedAt = '2099-10-01T11:00:00Z', /Future observation/],
  ['invalid calendar', s => s.generatedAt = '2026-02-30T11:00:00Z', /Invalid observation/],
  ['stamp missing UTC', s => s.capabilities[0].stamp.finishedAt = '2026-10-01T11:00:00', /Invalid observation/],
]) test('rejects release stamp ' + name, () => {
  const publication = releaseStampsFixture(); const snapshot = first(publication); mutate(snapshot);
  assert.throws(() => validatePublication(publication), reason);
});
test('reviewed content changes require a new human snapshot binding, while approval metadata is outside that binding', () => {
  const publication = releaseStampsFixture(), snapshot = first(publication);
  const before = releaseSnapshotDigest(snapshot);
  snapshot.capabilities[2].scope = 'Changed scope awaiting human review.';
  assert.notEqual(releaseSnapshotDigest(snapshot), before);
  assert.throws(() => validatePublication(publication), /snapshot binding/);
});

test('excluded historical failures remain visible without becoming included failure or pass counts', () => {
  const publication = releaseStampsFixture(), snapshot = first(publication);
  snapshot.capabilities[3].failures.push({finishedAt: '2026-09-30T11:00:00Z', summary: 'Historical excluded failure retained.', resolvedByStampId: null});
  snapshot.approval.snapshotSha256 = releaseSnapshotDigest(snapshot);
  assert.doesNotThrow(() => validatePublication(publication));
  assert.equal(snapshot.counts.failed, 1);
  assert.equal(snapshot.counts.excluded, 1);
});

test('exact fully-qualified tag refs are retained rather than normalized', () => {
  const publication = releaseStampsFixture(), snapshot = first(publication);
  snapshot.source.ref = 'refs/tags/v1.3.2';
  snapshot.capabilities[0].stamp.releaseSource.ref = snapshot.source.ref;
  snapshot.approval.snapshotSha256 = releaseSnapshotDigest(snapshot);
  assert.equal(first(validatePublication(publication)).source.ref, 'refs/tags/v1.3.2');
});
