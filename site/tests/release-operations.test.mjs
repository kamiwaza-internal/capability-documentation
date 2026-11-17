import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublication, releaseSnapshotDigest} from '../scripts/publication.mjs';
import {evidenceDocument, evidenceVersions, operationsVerified, replayLabel, replayOperations, replayStatusKey, summaryDocument, toMarkdown} from '../src/evidence.mjs';
import {releaseStampsFixture} from './fixtures/release-stamps.mjs';

// Synthetic contract only: the stamps fixture plus operation counts and not-stamped reasons.
function operationsFixture(mutate = () => {}) {
  const publication = releaseStampsFixture(), snapshot = publication.releaseStamps[0];
  const [stamped, failed, untested] = snapshot.capabilities;
  const extra = (id, notStampedReason, operations) => ({...structuredClone(untested), id, notStampedReason, operations});
  stamped.operations = {named: 3, verified: 3};
  failed.operations = {named: 2, verified: 1};
  Object.assign(untested, {notStampedReason: 'untested', operations: {named: 0, verified: 0}});
  snapshot.capabilities.push(extra('synthetic.skipped', 'skipped', {named: 2, verified: 0}),
    extra('synthetic.partial', 'partial', {named: 4, verified: 3}), extra('synthetic.incomplete', 'incomplete', {named: 1, verified: 0}));
  Object.assign(snapshot.counts, {catalog: 9, included: 6, notStamped: 4, operationsNamed: 12, operationsVerified: 7,
    untested: 1, skipped: 1, partial: 1, incomplete: 1});
  mutate(snapshot);
  if (snapshot.approval.status === 'approved') snapshot.approval.snapshotSha256 = releaseSnapshotDigest(snapshot);
  return publication;
}
const row = (snapshot, id) => snapshot.capabilities.find(cap => cap.id === 'synthetic.' + id);

test('a snapshot with operation counts and reasons validates; one without still does', () => {
  assert.doesNotThrow(() => validatePublication(operationsFixture()));
  assert.doesNotThrow(() => validatePublication(releaseStampsFixture()));
});

for (const [name, mutate, reason] of [
  ['mixed: row counts without snapshot counts', s => { for (const key of ['operationsNamed', 'operationsVerified', 'untested', 'skipped', 'partial', 'incomplete']) delete s.counts[key]; }, /Unexpected or missing/],
  ['mixed: one included row lacks operations', s => delete row(s, 'failed').operations, /Expected object/],
  ['mixed: not-stamped row lacks a reason', s => delete row(s, 'skipped').notStampedReason, /Invalid not-stamped reason/],
  ['mixed: only some counts', s => delete s.counts.incomplete, /Unexpected or missing/],
  ['excluded row with operations', s => row(s, 'excluded').operations = {named: 0, verified: 0}, /Unexpected or missing/],
  ['excluded row with a reason', s => row(s, 'excluded').notStampedReason = 'untested', /Unexpected or missing/],
  ['reason on a stamped row', s => row(s, 'stamped').notStampedReason = 'partial', /Unexpected or missing/],
  ['reason on a failed row', s => row(s, 'failed').notStampedReason = 'incomplete', /Unexpected or missing/],
  ['unknown reason', s => row(s, 'skipped').notStampedReason = 'flaky', /Invalid not-stamped reason/],
  ['verified above named', s => row(s, 'partial').operations.verified = 5, /Invalid operation counts/],
  ['negative count', s => row(s, 'skipped').operations.verified = -1, /Invalid operation counts/],
  ['non-integer count', s => row(s, 'skipped').operations.named = 2.5, /Invalid operation counts/],
  ['string count', s => row(s, 'skipped').operations.named = '2', /Invalid operation counts/],
  ['extra operations field', s => row(s, 'skipped').operations.passed = 0, /Unexpected or missing/],
  ['stamped row with an unverified operation', s => { row(s, 'stamped').operations.verified = 2; s.counts.operationsVerified = 6; }, /every named operation/],
  ['operation total not re-derived', s => s.counts.operationsVerified = 8, /Release counts must match/],
  ['named total not re-derived', s => s.counts.operationsNamed = 11, /Release counts must match/],
  ['reason count not re-derived', s => { s.counts.untested = 2; s.counts.skipped = 0; }, /Release counts must match/],
  ['reasons do not sum to not stamped', s => s.counts.partial = 0, /Release counts must match/],
]) test('operation counts reject ' + name, () => assert.throws(() => validatePublication(operationsFixture(mutate)), reason));

const HEADLINE = '7 of 12 named operations verified on the release build · 1 of 6 included capabilities fully release stamped';
const BREAKDOWN = '1 capability has no test yet · 1 has a test that did not run · 1 is partly covered · 1 not stamped for another reason · 1 failed';
const replayEntry = publication => evidenceVersions({...publication, releases: []}, null).find(entry => entry.kind === 'release-replay');

test('headline shows operations and capabilities together, and the breakdown always travels with it', () => {
  const publication = operationsFixture(), snapshot = publication.releaseStamps[0];
  assert.deepEqual(replayOperations(snapshot), {headline: HEADLINE, breakdown: BREAKDOWN});
  const entry = replayEntry(publication);
  assert.equal(entry.headline, HEADLINE);
  assert.ok(entry.basis.startsWith(BREAKDOWN + '. '));
  Object.assign(snapshot.counts, {untested: 34, skipped: 7, partial: 9, incomplete: 0, failed: 2});
  assert.equal(replayOperations(snapshot).breakdown, '34 capabilities have no test yet · 7 have a test that did not run · 9 are partly covered · 2 failed');
});

test('each capability reads its own reason and operation count, with a legend sentence per label', () => {
  const publication = operationsFixture(), snapshot = publication.releaseStamps[0];
  assert.deepEqual(snapshot.capabilities.map(cap => [replayLabel(cap), operationsVerified(cap)]), [
    ['Release stamped', '3 of 3 operations verified'], ['Failed', '1 of 2 operations verified'], ['No test yet', null],
    ['Outside inventory', null], ['Outside inventory', null], ['Outside inventory', null],
    ['Test not run', '0 of 2 operations verified'], ['Partly covered', '3 of 4 operations verified'], ['Not stamped', '0 of 1 operations verified']]);
  assert.deepEqual(replayStatusKey([snapshot]).map(([label]) => label),
    ['Release stamped', 'Failed', 'No test yet', 'Test not run', 'Partly covered', 'Not stamped', 'Outside inventory']);
  const entry = replayEntry(publication);
  const digest = toMarkdown(evidenceDocument(entry, publication, null)), summary = toMarkdown(summaryDocument(entry, publication, null));
  for (const text of ['No test is registered for this capability yet. This says nothing about whether the capability works.',
    'A test is registered, but the release test run did not run it. This is a gap in the test run, not a product failure.',
    'Every registered test passed, but the capability names operations no test covers.',
    'replay status: Partly covered', 'Operations: 3 of 4 operations verified.', BREAKDOWN]) assert.ok(digest.includes(text), text);
  assert.ok(summary.includes('Test not run · 0 of 2 operations verified') && summary.includes(BREAKDOWN));
});

test('a snapshot without operation counts renders exactly as before', () => {
  const publication = releaseStampsFixture(), snapshot = publication.releaseStamps[0];
  assert.equal(replayOperations(snapshot), null);
  assert.deepEqual(snapshot.capabilities.map(cap => [replayLabel(cap), operationsVerified(cap)]), [['Release stamped', null], ['Failed', null],
    ['Not stamped', null], ['Outside inventory', null], ['Outside inventory', null], ['Outside inventory', null]]);
  assert.deepEqual(replayStatusKey([snapshot]).map(([label]) => label), ['Release stamped', 'Failed', 'Not stamped', 'Outside inventory']);
  const entry = replayEntry(publication);
  assert.equal(entry.headline, '1 scoped release stamps · 1 failed · 1 not stamped, of 3 included capabilities');
  assert.ok(entry.basis.startsWith('Replay of registered scenarios on v1.3.2'));
  const digest = toMarkdown(evidenceDocument(entry, publication, null));
  assert.doesNotMatch(digest, /operations verified|Operations named|No test yet|Test not run|Partly covered/);
});
