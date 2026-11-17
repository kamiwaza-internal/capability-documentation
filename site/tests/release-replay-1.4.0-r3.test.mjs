import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePublication} from '../scripts/publication.mjs';
import {primaryCapabilities} from '../src/catalog.mjs';

const publication = validatePublication(JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8')));
const snapshot = id => publication.releaseStamps.find(row => row.id === id);
const statuses = row => Object.fromEntries(row.capabilities.map(cap => [cap.id, cap.status]));
const PARTIAL = "Every test mapped to this capability passed in the release's Kajiya run, but the capability names operations no test covers. No test failed.";

test('1.4.0 release replay revision 3 refreshes the evidence without changing a status', () => {
  const [r2, r3] = [snapshot('1.4.0-release-replay-r2'), snapshot('1.4.0-release-replay-r3')];
  assert.deepEqual([r2.counts.releaseStamped, r2.counts.failed, r2.counts.notStamped], [35, 2, 50]);
  assert.deepEqual([r3.counts.catalog, r3.counts.included, r3.counts.excluded, r3.counts.releaseStamped,
    r3.counts.failed, r3.counts.notStamped, r3.counts.wholeCapabilityPromotions], [108, 87, 21, 35, 2, 50, 0]);
  assert.deepEqual([r3.manifestId, r3.source, r3.basis], [r2.manifestId, r2.source, r2.basis]);
  assert.equal(r3.reviewReference, 'https://github.com/kamiwaza-internal/capability-documentation/pull/69');
  assert.deepEqual(statuses(r3), statuses(r2));
  assert.deepEqual(r3.capabilities.filter(cap => cap.status === 'failed').map(cap => cap.id).sort(),
    ['platform.access-requests', 'platform.usage-and-audit']);
});

test('cold model download stays unstamped: its kit names operations no test covers', () => {
  const r3 = snapshot('1.4.0-release-replay-r3');
  const row = r3.capabilities.find(cap => cap.id === 'models.discover-and-download');
  assert.deepEqual([row.status, row.scope, row.stamp], ['not-stamped', PARTIAL, null]);
  const card = primaryCapabilities(publication).find(item => item.version === '1.4.0' && item.id === 'models.discover-and-download');
  assert.notEqual(card.status, 'release-stamped');
});
