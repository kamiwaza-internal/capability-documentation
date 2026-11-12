import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePublication} from '../scripts/publication.mjs';
import {primaryCapabilities, withdrawn} from '../src/catalog.mjs';

const publication = validatePublication(JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8')));
const snapshot = id => publication.releaseStamps.find(row => row.id === id);
const statuses = row => Object.fromEntries(row.capabilities.map(cap => [cap.id, cap.status]));
const RECLASSIFIED = ['catalog.dataset-registry', 'catalog.writable-datasets', 'connectors.managed-data-sources',
  'context.dataset-indexing', 'models.openai-compatible-inference', 'platform.observability',
  'platform.operations-and-notifications'];
const FAILED = ['platform.access-requests', 'platform.usage-and-audit'];

test('1.4.0 release replay revision 2 restates revision 1 without changing it', () => {
  const [r1, r2] = [snapshot('1.4.0-release-replay-r1'), snapshot('1.4.0-release-replay-r2')];
  assert.deepEqual([r1.counts.releaseStamped, r1.counts.failed, r1.counts.notStamped], [34, 9, 44]);
  assert.deepEqual([r2.counts.catalog, r2.counts.included, r2.counts.excluded, r2.counts.releaseStamped,
    r2.counts.failed, r2.counts.notStamped, r2.counts.wholeCapabilityPromotions], [108, 87, 21, 35, 2, 50, 0]);
  assert.deepEqual([r2.manifestId, r2.source, r2.basis], [r1.manifestId, r1.source, r1.basis]);
  assert.equal(r2.reviewReference, 'https://github.com/kamiwaza-internal/capability-documentation/pull/68');
  assert.equal(r2.approval.status, 'pending');
  assert.ok(r2.capabilities.every(cap => cap.wholeClaim === false));

  const [before, after] = [statuses(r1), statuses(r2)];
  const changed = Object.keys(after).filter(id => before[id] !== after[id]).sort();
  assert.deepEqual(changed, [...RECLASSIFIED, 'connectors.oauth-tool-policies'].sort());
  assert.equal(after['connectors.oauth-tool-policies'], 'release-stamped');
  assert.deepEqual(r2.capabilities.filter(cap => cap.status === 'failed').map(cap => cap.id).sort(), FAILED);
  for (const id of RECLASSIFIED) {
    const cap = r2.capabilities.find(row => row.id === id);
    assert.deepEqual([before[id], cap.status, cap.failures, cap.stamp], ['failed', 'not-stamped', [], null], id);
    assert.match(cap.scope, /No test failed\.$/, id);
  }
});

test('the catalog withdraws a failed row that a later revision restates as not stamped', () => {
  const cards = new Map(primaryCapabilities(publication).filter(card => card.version === '1.4.0').map(card => [card.id, card]));
  for (const id of RECLASSIFIED) {
    assert.notEqual(cards.get(id).status, 'failed', id);
    assert.deepEqual(cards.get(id).failures.filter(failure => failure.axis === 'release'), [], id);
  }
  for (const id of FAILED) {
    assert.ok(cards.get(id).failures.some(failure => failure.snapshotId === '1.4.0-release-replay-r2'), id);
  }
});

test('withdrawal needs a later revision of the same replay with no failure', () => {
  const release = (revision, extra = {}) => ({id: 'x-r' + revision, version: '9.9.9', basis: 'b', manifestId: 'm',
    source: {ref: 'v9.9.9', sourceRevision: 's'}, publicationRevision: revision, ...extra});
  const row = (rel, status, failures = []) => ({release: rel, qualified: true, cap: {status, failures}});
  const failed = row(release(1), 'failed', [{finishedAt: 't', resolvedByStampId: null}]);
  assert.equal(withdrawn(failed, [failed, row(release(2), 'not-stamped')]), true);
  assert.equal(withdrawn(failed, [failed]), false);
  assert.equal(withdrawn(failed, [failed, row(release(2), 'failed', failed.cap.failures)]), false);
  assert.equal(withdrawn(failed, [failed, row(release(2, {manifestId: 'other'}), 'not-stamped')]), false);
  assert.equal(withdrawn(failed, [failed, row(release(2, {id: 'y-r2'}), 'not-stamped')]), false);
  const later = row(release(3), 'failed', failed.cap.failures);
  assert.equal(withdrawn(later, [later, row(release(2), 'not-stamped')]), false);
  assert.equal(withdrawn({...failed, qualified: false}, [row(release(2), 'not-stamped')]), false);
});
