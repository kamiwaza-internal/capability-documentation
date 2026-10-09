// Named for the data file: tests/release-stamps.test.mjs already covers publication.json schema 6 snapshots.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {validateReleaseStamps} from '../scripts/release-stamps.mjs';
import {projectReleaseStamps, serialize} from '../scripts/project-release-stamps.mjs';
import {assertPublicOutputSafe} from '../scripts/public-output-privacy.mjs';
import {currentCapabilityView, joinLocalStamps, joinReleaseStamps, summarizeCurrentView} from '../src/catalog.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const fixture = () => ({
  schema: 'release-stamp-projection.v1', targetRelease: '9.9.2', releaseTag: 'v9.9.2',
  coreSource: {ref: 'v9.9.2', commit: 'd'.repeat(40)}, manifestId: 'f'.repeat(64),
  environment: 'local', sourceCommitBasis: 'operator-asserted', humanSignOff: false,
  source: {kitRepository: 'kamiwaza-internal/capability-kit', kitCommit: 'a'.repeat(40),
    kitPullRequest: 'https://github.com/kamiwaza-internal/capability-kit/pull/1', reportPath: 'reports/synthetic-replay'},
  limits: ['A release stamp is not human release sign-off.'],
  counts: {releaseStamps: 2, releaseStampsApi: 1, releaseStampsSdk: 1, sourceContractStamps: 1, sourceContractNotStamped: 1},
  releaseStamps: [
    {capability: 'synthetic.one', stampId: 'e'.repeat(64), lane: 'api', finishedAt: '2026-02-01T00:30:00.123456Z', scenarios: ['s-1'], supersededKit: false},
    {capability: 'synthetic.new', stampId: 'e'.repeat(64), lane: 'sdk', finishedAt: '2026-02-01T00:40:00Z', scenarios: ['s-2', 's-3'], selectionBasis: 'live-kit', supersededKit: true},
  ],
  sourceContractStamps: [{capability: 'synthetic.contract', stampId: 'c'.repeat(64), kits: [{kitId: 'local:synthetic-contract', tests: {passed: 7, failed: 0, skipped: 1, errors: 0}}]}],
  sourceContractNotStamped: [{capability: 'synthetic.unlicensed', reason: '5 of 16 commands did not meet their expectation'}],
  outsideCatalog: [],
});
const catalog = (...ids) => ({releases: [
  {baselineKind: 'prerelease-evidence', publicationRevision: 2, capabilities: ids.map(id => ({id}))},
  {baselineKind: 'prerelease-evidence', publicationRevision: 1, capabilities: [{id: 'synthetic.retired'}]},
]});
const all = ['synthetic.one', 'synthetic.new', 'synthetic.contract', 'synthetic.unlicensed'];

test('RS-1 synthetic projection is valid, alone and against a catalog that holds every capability', () => {
  assert.doesNotThrow(() => validateReleaseStamps(fixture()));
  assert.doesNotThrow(() => validateReleaseStamps(fixture(), catalog(...all)));
});

for (const [name, change, reason] of [
  ['humanSignOff: true', x => x.humanSignOff = true, /never human release sign-off/],
  ['a duplicate release-stamped capability', x => x.releaseStamps[1].capability = 'synthetic.one', /Duplicate identifiers/],
  ['a duplicate source-contract capability', x => x.sourceContractNotStamped[0].capability = 'synthetic.contract', /Duplicate identifiers/],
  ['a capability in both stamp lists', x => x.sourceContractStamps[0].capability = 'synthetic.one', /in both the release stamp and source-contract/],
  ['a release stamp count mismatch', x => x.counts.releaseStamps = 3, /Counts do not reconcile/],
  ['a lane count mismatch', x => { x.counts.releaseStampsApi = 2; x.counts.releaseStampsSdk = 0; }, /Counts do not reconcile/],
  ['a source-contract count mismatch', x => x.counts.sourceContractStamps = 0, /Counts do not reconcile/],
  ['a not-stamped count mismatch', x => x.counts.sourceContractNotStamped = 0, /Counts do not reconcile/],
  ['an unknown top-level field', x => x.releaseVerified = true, /Unexpected or missing fields/],
  ['an unknown stamp field', x => x.releaseStamps[0].recordPath = 'records/x.json', /Unexpected or missing fields/],
  ['an unknown kit field', x => x.sourceContractStamps[0].kits[0].runner = 'pytest', /Unexpected or missing fields/],
  ['a missing field', x => delete x.sourceCommitBasis, /Unexpected or missing fields/],
  ['a source commit basis other than operator-asserted', x => x.sourceCommitBasis = 'attested', /as recorded/],
  ['a core ref that is not the release tag', x => x.coreSource.ref = 'release/9.9.0', /release tag/],
  ['an unknown lane', x => x.releaseStamps[0].lane = 'browser', /Invalid lane/],
  ['a stamp with no scenario', x => x.releaseStamps[0].scenarios = [], /at least one valid scenario/],
  ['a failed test inside a source-contract stamp', x => x.sourceContractStamps[0].kits[0].tests.failed = 1, /did not pass/],
  ['a prefixed manifest digest', x => x.manifestId = 'sha256:' + 'f'.repeat(64), /Invalid manifest identifier/],
  ['a private workspace path', x => x.limits.push('see work/replay'), /Private content forbidden/],
  ['an image digest', x => x.limits.push('core@sha256:' + 'a'.repeat(64)), /Private content forbidden/],
  ['a bare digest prefix', x => x.sourceContractNotStamped[0].reason = 'sha256:abc', /Private content forbidden/],
  ['a registry host', x => x.limits.push('pulled from ghcr.io'), /Private content forbidden/],
  ['a patch file name', x => x.limits.push('applied fix.patch'), /Private content forbidden/],
  ['an absolute path', x => x.sourceContractNotStamped[0].reason = 'see /Users/someone/records', /Private content forbidden/],
  ['an absolute path as a whole value', x => x.limits.push('/private/tmp/out'), /Private content forbidden/],
  ['a URL other than the kit pull request', x => x.limits.push('https://example.invalid/run'), /Private content forbidden/],
  ['a foreign pull request link', x => x.source.kitPullRequest = 'https://example.invalid/pull/1', /Invalid kit pull request/],
  ['an outsideCatalog id with no entry', x => x.outsideCatalog = ['synthetic.absent'], /no entry here/],
]) test('RS-2 rejects ' + name, () => {
  const input = fixture(); change(input);
  assert.throws(() => validateReleaseStamps(input), reason);
});

test('RS-3 a capability outside the latest pre-release evidence release must be declared, and only then', () => {
  const missing = catalog(...all.filter(id => id !== 'synthetic.new'));
  assert.throws(() => validateReleaseStamps(fixture(), missing), /outsideCatalog: synthetic.new/);
  assert.doesNotThrow(() => validateReleaseStamps({...fixture(), outsideCatalog: ['synthetic.new']}, missing));
  assert.throws(() => validateReleaseStamps({...fixture(), outsideCatalog: ['synthetic.new']}, catalog(...all)), /outsideCatalog: synthetic.new/);
  // An older release does not count as the catalog.
  assert.throws(() => validateReleaseStamps({...fixture(), sourceContractNotStamped: [{capability: 'synthetic.retired', reason: 'x'}]}, catalog(...all)), /outsideCatalog: synthetic.retired/);
});

test('RS-4 join is additive: statuses, order and inputs unchanged; outside stamps are listed', () => {
  const rows = Object.freeze([{id: 'synthetic.one', status: 'verified', acceptedAt: '2026-01-01T00:00:00Z'}, {id: 'synthetic.contract', status: 'verified', acceptedAt: '2026-01-01T00:00:00Z'},
    {id: 'synthetic.none', status: 'not-yet-verified', acceptedAt: null}].map(Object.freeze));
  const joined = joinReleaseStamps(rows, fixture());
  assert.deepEqual(joined.rows.map(r => [r.id, r.status, r.releaseStamp, r.sourceContractStamp]), [
    ['synthetic.one', 'verified', {lane: 'api', scenarios: 1, finishedAt: '2026-02-01T00:30:00.123456Z'}, null],
    ['synthetic.contract', 'verified', null, {kits: 1, passed: 7}],
    ['synthetic.none', 'not-yet-verified', null, null],
  ]);
  const {rows: _, ...summary} = joined;
  assert.deepEqual(summary, {releaseStamped: 1, releaseStampedVerified: 1, releaseStampedNotPreviouslyVerified: [], sourceContract: 1, sourceContractVerified: 1,
    releaseStampedOutside: ['synthetic.new'], sourceContractOutside: []});
});

const published = JSON.parse(read('../data/publication.json'));
const raw = read('../data/release-stamps-1.3.2.json');
const stamps = JSON.parse(raw);
const neverVerified = ['kaizen.conversation-event-streaming', 'kaizen.prebuilt-agents'];

test('RS-5 published v1.3.2 stamps: 29 release stamps, 16 source-contract, 1 not stamped, none outside the catalog', () => {
  validateReleaseStamps(stamps, published);
  assert.deepEqual([stamps.releaseStamps.length, stamps.sourceContractStamps.length, stamps.targetRelease, stamps.releaseTag, stamps.humanSignOff, stamps.sourceCommitBasis, stamps.environment],
    [29, 16, '1.3.2', 'v1.3.2', false, 'operator-asserted', 'local']);
  assert.deepEqual(stamps.counts, {releaseStamps: 29, releaseStampsApi: 20, releaseStampsSdk: 9, sourceContractStamps: 16, sourceContractNotStamped: 1});
  assert.deepEqual(stamps.sourceContractNotStamped.map(e => e.capability), ['platform.licensing-and-eula']);
  assert.deepEqual(stamps.outsideCatalog, []);
  assert.deepEqual(stamps.coreSource, {ref: 'v1.3.2', commit: '28da02405d4e3a39cfea405f4bb44fda67286b0c'});
  assert.deepEqual(stamps.releaseStamps.filter(s => neverVerified.includes(s.capability)).map(s => s.selectionBasis), ['live-kit', 'live-kit']);
  assert.deepEqual(stamps.releaseStamps.filter(s => s.supersededKit).map(s => s.capability), ['auth.session-revocation']);
});

test('RS-6 published v1.3.2 stamps expose no private path, image digest, registry host, build string or producer', () => {
  for (const forbidden of ['work/', 'sha256:', '@sha256', 'ghcr.io', 'k0s', 'lima', '.patch', '/Users/', '/private/', '/tmp', 'records/', 'aggregates/', 'cleanup', 'producer', 'capture', 'claude', 'plan', 'tests/integration', 'rv-eula']) {
    assert.ok(!raw.includes(forbidden), forbidden);
  }
  assert.doesNotThrow(() => assertPublicOutputSafe(raw, ['PRIVATE_CANARY_NOT_FOR_EXPORT']));
  // The only URL is the kit pull request.
  assert.deepEqual(raw.match(/https?:[^"]*/g), ['https://github.com/kamiwaza-internal/capability-kit/pull/83']);
  // The only 40-hex values are the kit commit and the core release commit; the only 64-hex values are the manifest and stamp ids.
  assert.deepEqual([...new Set(raw.match(/\b[a-f0-9]{40}\b/g))].sort(), [stamps.coreSource.commit, stamps.source.kitCommit].sort());
  assert.equal(new Set(raw.match(/\b[a-f0-9]{64}\b/g)).size, 1 + 29 + 16);
});

test('RS-7 published join: 27 of 50 verified rows release stamped, 16 of 50 source-contract, 2 not previously verified, no status changes', () => {
  const rows = joinLocalStamps(currentCapabilityView(published), JSON.parse(read('../data/local-stamps.json'))).rows;
  const joined = joinReleaseStamps(rows, stamps);
  assert.deepEqual(joined.rows.map(r => [r.id, r.status]), rows.map(r => [r.id, r.status]));
  assert.deepEqual(summarizeCurrentView(joined.rows), summarizeCurrentView(rows));
  const {releaseStamp, sourceContractStamp, ...first} = joined.rows[0];
  assert.deepEqual(first, rows[0]); // nothing but the two added fields
  assert.equal(summarizeCurrentView(rows).verified, 50);
  assert.deepEqual([joined.releaseStamped, joined.releaseStampedVerified, joined.sourceContract, joined.sourceContractVerified], [29, 27, 16, 16]);
  assert.deepEqual(joined.releaseStampedNotPreviouslyVerified, neverVerified);
  assert.deepEqual([joined.releaseStampedOutside, joined.sourceContractOutside], [[], []]);
  assert.ok(joined.rows.every(r => !(r.releaseStamp && r.sourceContractStamp)), 'no row carries both grades');
  // Two of the four rows flagged with a 2026-10-08 scoped failure now also carry a later release stamp; the flag stays.
  const both = joined.rows.filter(r => r.laterNonApplicableFailure && r.releaseStamp);
  assert.deepEqual(both.map(r => r.id).sort(), ['catalog.writable-datasets', 'kaizen.notifications-inbox']);
  assert.equal(joined.rows.filter(r => r.laterNonApplicableFailure).length, 4);
  for (const row of both) for (const later of row.later.filter(l => l.failedScenarios > 0)) {
    assert.equal(later.finishedAt.slice(0, 10), '2026-10-08');
    assert.ok(Date.parse(later.finishedAt) < Date.parse(row.releaseStamp.finishedAt));
  }
});

const kitDir = process.env.KIT_RELEASE_REPLAY ?? new URL('../../../capability-kit/reports/2026-10-09-1.3.2-release-replay', import.meta.url).pathname;
test('RS-8 projection regenerates data/release-stamps-1.3.2.json byte for byte from the kit report directory',
  {skip: existsSync(kitDir + '/source-contract/source-contract-stamps.json') ? false : 'kit release replay report not present (expected in CI); set KIT_RELEASE_REPLAY to its directory to run'}, () => {
    assert.equal(serialize(projectReleaseStamps(kitDir, published)), raw);
  });
