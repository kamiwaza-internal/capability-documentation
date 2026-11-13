import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePublication} from '../scripts/publication.mjs';
import {primaryCapabilities} from '../src/catalog.mjs';

const publication = validatePublication(JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8')));
const snapshot = id => publication.releaseStamps.find(row => row.id === id);
const statuses = row => Object.fromEntries(row.capabilities.map(cap => [cap.id, cap.status]));

test('1.4.0 release replay revision 3 adds one stamp and leaves revision 2 intact', () => {
  const [r2, r3] = [snapshot('1.4.0-release-replay-r2'), snapshot('1.4.0-release-replay-r3')];
  assert.deepEqual([r2.counts.releaseStamped, r2.counts.failed, r2.counts.notStamped], [35, 2, 50]);
  assert.deepEqual([r3.counts.catalog, r3.counts.included, r3.counts.excluded, r3.counts.releaseStamped,
    r3.counts.failed, r3.counts.notStamped, r3.counts.wholeCapabilityPromotions], [108, 87, 21, 36, 2, 49, 0]);
  assert.deepEqual([r3.manifestId, r3.source, r3.basis], [r2.manifestId, r2.source, r2.basis]);
  assert.equal(r3.reviewReference, 'https://github.com/kamiwaza-internal/capability-documentation/pull/69');
  const [before, after] = [statuses(r2), statuses(r3)];
  assert.deepEqual(Object.keys(after).filter(id => before[id] !== after[id]), ['models.discover-and-download']);
  assert.equal(after['models.discover-and-download'], 'release-stamped');
  assert.deepEqual(r3.capabilities.filter(cap => cap.status === 'failed').map(cap => cap.id).sort(),
    ['platform.access-requests', 'platform.usage-and-audit']);
});

test('the catalog shows the revision 3 stamp for cold model download', () => {
  const card = primaryCapabilities(publication).find(row => row.version === '1.4.0' && row.id === 'models.discover-and-download');
  assert.equal(card.status, 'release-stamped');
});
