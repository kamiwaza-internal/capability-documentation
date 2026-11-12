import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePublication} from '../scripts/publication.mjs';

const publication = validatePublication(JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8')));

test('published 1.4.0 native baseline and bounded release snapshot remain distinct', () => {
  const baseline = publication.releases.find(row => row.id === '1.4.0-prerelease-r1277000');
  assert.ok(baseline);
  assert.equal(baseline.publicationState, 'published');
  assert.equal(baseline.reviewReference, 'https://github.com/kamiwaza-internal/capability-documentation/pull/66');
  assert.equal(baseline.publishedAt, '2026-11-12T15:11:07Z');
  assert.equal(baseline.releaseBinding, 'not-established');
  assert.equal(baseline.approval.status, 'pending');
  assert.equal(baseline.counts.included, 87);
  assert.equal(baseline.counts.prereleaseVerified, 66);
  assert.equal(baseline.counts.releaseVerified, 0);

  const snapshot = publication.releaseStamps.find(row => row.id === '1.4.0-scoped-r1');
  assert.ok(snapshot);
  assert.equal(snapshot.reviewReference, baseline.reviewReference);
  assert.equal(snapshot.publishedAt, baseline.publishedAt);
  assert.equal(snapshot.source.ref, 'v1.4.0');
  assert.deepEqual(
    [snapshot.counts.catalog, snapshot.counts.included, snapshot.counts.excluded,
      snapshot.counts.releaseStamped, snapshot.counts.failed, snapshot.counts.notStamped,
      snapshot.counts.wholeCapabilityPromotions],
    [108, 87, 21, 1, 0, 86, 0],
  );
  assert.equal(snapshot.approval.status, 'pending');
  assert.ok(snapshot.capabilities.every(row => row.wholeClaim === false));
  const stamped = snapshot.capabilities.filter(row => row.status === 'release-stamped');
  assert.equal(stamped.length, 1);
  assert.equal(stamped[0].id, 'auth.local-user-administration');
  assert.equal(stamped[0].stamp.basis, 'fresh-release-replay');
  assert.equal(stamped[0].stamp.targetRelease, '1.4.0');
  assert.match(stamped[0].assumptions.join(' '), /operator-asserted/);
  assert.ok(stamped[0].limits.some(limit => limit.includes('not the full auth.local-user-administration capability')));
});
