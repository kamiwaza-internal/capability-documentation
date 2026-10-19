import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {primaryCapabilities} from '../src/catalog.mjs';
import {validatePublication} from '../scripts/publication.mjs';
import {assertPublicOutputSafe} from '../scripts/public-output-privacy.mjs';
const bytes = readFileSync(new URL('../data/publication.json', import.meta.url));
const publication = () => JSON.parse(bytes);

test('the actual 1.3.4 projection retains full inventory, failures and pending approval', () => {
  const data = validatePublication(publication());
  const snapshot = data.releaseStamps.find(row => row.id === '1.3.4-release-replay-r1');
  assert.deepEqual(snapshot.counts, {catalog:107, included:88, excluded:19, deferred:0, otherOwner:0, releaseStamped:29, failed:5, notStamped:54, wholeCapabilityPromotions:0});
  assert.equal(snapshot.source.ref, 'v1.3.4');
  assert.equal(snapshot.source.sourceRevision, '5f5f64656802eb497167f6eae6021093cfcdccf2');
  assert.deepEqual(snapshot.approval, {status:'pending', scope:'full-inventory', approvedBy:null, approvedAt:null, snapshotSha256:null});
  assert.equal(snapshot.capabilities.find(row => row.id === 'kaizen.conversation-event-streaming').status, 'failed');
  assert.equal(snapshot.capabilities.find(row => row.id === 'retrieval.async-retrieval-jobs').status, 'not-stamped');
  assert.ok(snapshot.capabilities.every(row => row.wholeClaim === false));
  assertPublicOutputSafe(bytes);
});

test('new 1.3.4 rows preserve every older version row and the original 50 accepted proofs', () => {
  const data = publication();
  const older = structuredClone(data);
  older.schema = 5; delete older.releaseStamps;
  const originalRows = primaryCapabilities(older);
  const allRows = primaryCapabilities(data);
  assert.deepEqual(allRows.filter(row => row.version !== '1.3.4'), originalRows);
  assert.equal(originalRows.filter(row => row.status === 'prerelease-verified').length, 50);
  const releaseRows = allRows.filter(row => row.version === '1.3.4');
  assert.equal(releaseRows.length, 88);
  assert.equal(releaseRows.filter(row => row.status === 'release-stamped').length, 30);
  assert.ok(releaseRows.every(row => row.status !== 'prerelease-verified'));
  const cap = 'kaizen.conversation-event-streaming';
  assert.equal(allRows.find(row => row.id === cap && row.version === '1.3.4').status, 'release-stamped');
  assert.deepEqual(allRows.find(row => row.id === cap && row.version === '1.3.0'), originalRows.find(row => row.id === cap && row.version === '1.3.0'));
});

test('revision two retains original failure history and refuses fresh incomplete builder credit', () => {
  const data = validatePublication(publication());
  const old = data.releaseStamps.find(row => row.id === '1.3.4-release-replay-r1');
  const current = data.releaseStamps.find(row => row.id === '1.3.4-release-replay-r2');
  assert.deepEqual(current.counts, {catalog:107, included:88, excluded:19, deferred:0, otherOwner:0, releaseStamped:30, failed:6, notStamped:52, wholeCapabilityPromotions:0});
  assert.equal(current.approval.status, 'pending');
  const id = 'kaizen.conversation-event-streaming';
  const previous = old.capabilities.find(row => row.id === id);
  const resolved = current.capabilities.find(row => row.id === id);
  assert.equal(previous.status, 'failed');
  assert.equal(previous.failures[0].resolvedByStampId, null);
  assert.equal(resolved.status, 'release-stamped');
  assert.equal(resolved.failures[0].finishedAt, previous.failures[0].finishedAt);
  assert.equal(resolved.failures[0].resolvedByStampId, resolved.stamp.id);
  for (const id of ['kaizen.agent-packages', 'kaizen.agent-auto-routing']) {
    const row = current.capabilities.find(row => row.id === id);
    assert.equal(row.status, 'failed');
    assert.equal(row.stamp, null);
    assert.equal(row.wholeClaim, false);
    assert.ok(row.limits.some(text => text.includes('six-point workflow failed')));
  }
});
