import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {validateLocalStamps} from '../scripts/local-stamps.mjs';
import {projectLocalStamps, serialize} from '../scripts/project-local-stamps.mjs';
import {assertPublicOutputSafe} from '../scripts/public-output-privacy.mjs';
import {currentCapabilityView, joinLocalStamps, summarizeCurrentView} from '../src/catalog.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const scenario = (scenarioId, extra = {}) => ({scenarioId, lane: 'sdk', status: 'passed',
  startedAt: '2026-02-01T00:00:00Z', finishedAt: '2026-02-01T00:30:00.123456Z', recordSha256: 'c'.repeat(64), ...extra});
const fixture = () => ({
  schema: 'local-stamp-projection.v1', kind: 'local-scoped-verification', releaseVerified: false, notAReleaseStamp: true,
  targetVersion: '9.9.2', baselineReleaseId: 'synthetic-r1', observationId: 'synthetic-obs', environment: 'local',
  runWindow: {earliestStartedAt: '2026-02-01T00:00:00Z', latestFinishedAt: '2026-02-01T01:00:00Z'},
  source: {kitRepository: 'kamiwaza-internal/capability-kit', kitCommit: 'a'.repeat(40),
    kitPullRequest: 'https://github.com/kamiwaza-internal/capability-kit/pull/1',
    stampSetPath: 'reports/synthetic/stamps.json', packetPath: 'reports/synthetic-run', stampSetSha256: 'b'.repeat(64)},
  coreSource: {ref: 'release/9.9.0', commit: 'd'.repeat(40)},
  limits: ['Each stamp covers only the listed scoped scenarios.'],
  counts: {capabilitiesInPacket: 5, capabilitiesWithoutFreshRecord: 2, stamps: 2, notStampedFailed: 1, stampedScenarioEntries: 3},
  stamps: [
    {capability: 'synthetic.one', stampSha256: 'e'.repeat(64), scenarios: [scenario('S-1'), scenario('S-2', {status: 'passed_with_notes'})]},
    {capability: 'synthetic.outside', stampSha256: 'e'.repeat(64), scenarios: [scenario('S-3')]},
  ],
  notStampedFailed: [{capability: 'synthetic.failed', failedScenarios: ['S-4']}],
});
const observed = (failedId, version = '9.9.2') => ({releases: [{id: 'synthetic-r1'}], observations: [{id: 'synthetic-obs', target: {version},
  evidenceWindow: {latestFinishedAt: '2026-02-01T01:00:00Z'}, capabilities: [{id: failedId, failedScenarios: 1}]}]});

test('LS-1 synthetic projection is valid, alone and against an agreeing observation', () => {
  assert.doesNotThrow(() => validateLocalStamps(fixture()));
  assert.doesNotThrow(() => validateLocalStamps(fixture(), observed('synthetic.failed')));
  assert.doesNotThrow(() => validateLocalStamps(fixture(), {schema: 1, releases: []}));
  assert.doesNotThrow(() => validateLocalStamps(fixture(), observed('synthetic.one', '9.9.0'))); // another version: not this run
});

for (const [name, change, reason] of [
  ['releaseVerified: true', x => x.releaseVerified = true, /never release stamps/],
  ['notAReleaseStamp: false', x => x.notAReleaseStamp = false, /never release stamps/],
  ['a failed scenario inside a stamp', x => x.stamps[0].scenarios[0].status = 'failed', /did not pass/],
  ['a skipped scenario inside a stamp', x => x.stamps[0].scenarios[0].status = 'skipped', /did not pass/],
  ['a capability in both lists', x => x.notStampedFailed[0].capability = 'synthetic.one', /Duplicate identifiers/],
  ['a duplicate stamped capability', x => x.stamps[1].capability = 'synthetic.one', /Duplicate identifiers/],
  ['a stamp count mismatch', x => x.counts.stamps = 3, /Counts do not reconcile/],
  ['a scenario count mismatch', x => x.counts.stampedScenarioEntries = 4, /Counts do not reconcile/],
  ['a not-stamped count mismatch', x => x.counts.notStampedFailed = 0, /Counts do not reconcile/],
  ['an unknown top-level field', x => x.releaseStamp = true, /Unexpected or missing fields/],
  ['an unknown scenario field', x => x.stamps[0].scenarios[0].recordFile = 'evidence/x.json', /Unexpected or missing fields/],
  ['a missing target version', x => delete x.targetVersion, /Unexpected or missing fields/],
  ['an empty target version', x => x.targetVersion = '', /Missing target version/],
  ['a short stamp hash', x => x.stamps[0].stampSha256 = 'abc', /Invalid stamp hash/],
  ['an uppercase record hash', x => x.stamps[0].scenarios[0].recordSha256 = 'C'.repeat(64), /Invalid record hash/],
  ['a short stamp set hash', x => x.source.stampSetSha256 = 'b'.repeat(63), /Invalid stamp set hash/],
  ['an empty stamp', x => { x.stamps[1].scenarios = []; x.counts.stampedScenarioEntries = 2; }, /at least one scenario/],
  ['a scenario after the run window', x => x.stamps[0].scenarios[0].finishedAt = '2026-02-02T00:00:00Z', /outside the run window/],
  ['a private workspace path', x => x.source.packetPath = 'reports/work/full-run', /Private content forbidden/],
  ['an image digest in a limit', x => x.limits.push('core@sha256:' + 'a'.repeat(64)), /Private content forbidden/],
  ['a registry host in a limit', x => x.limits.push('pulled from ghcr.io'), /Private content forbidden/],
  ['a foreign pull request link', x => x.source.kitPullRequest = 'https://example.invalid/pull/1', /Invalid kit pull request/],
]) test('LS-2 rejects ' + name, () => {
  const input = fixture(); change(input);
  assert.throws(() => validateLocalStamps(input), reason);
});

test('LS-3 rejects a stamp that hides a published failure of the same run', () => {
  assert.throws(() => validateLocalStamps(fixture(), observed('synthetic.one')), /Published failure missing from notStampedFailed/);
});

test('LS-3b cross-checks apply only to the publication the stamps were projected against', () => {
  const disagreeing = observed('synthetic.one');
  assert.equal(validateLocalStamps(fixture(), observed('synthetic.failed')).targetVersion, '9.9.2'); // applies: data returned
  // Baseline release or observation absent: not applicable, not an error, even though the observation disagrees.
  assert.equal(validateLocalStamps(fixture(), {...disagreeing, releases: [{id: 'other-r1'}]}), null);
  assert.equal(validateLocalStamps(fixture(), {...disagreeing, observations: [{...disagreeing.observations[0], id: 'other-obs'}]}), null);
  assert.equal(validateLocalStamps(fixture(), {schema: 1, releases: []}), null);
  // The file's own checks still run there.
  assert.throws(() => validateLocalStamps({...fixture(), releaseVerified: true}, {schema: 1, releases: []}), /never release stamps/);
  for (const field of ['baselineReleaseId', 'observationId']) {
    const input = fixture(); delete input[field];
    assert.throws(() => validateLocalStamps(input), /Unexpected or missing fields/);
    assert.throws(() => validateLocalStamps({...fixture(), [field]: 'Not An Id'}), /must name the baseline release and observation/);
  }
});

test('LS-4 join is additive: statuses, order and inputs unchanged; outside stamps are listed', () => {
  const rows = Object.freeze([{id: 'synthetic.one', status: 'verified'}, {id: 'synthetic.failed', status: 'failed-or-mixed'}, {id: 'synthetic.none', status: 'not-yet-verified'}].map(Object.freeze));
  const joined = joinLocalStamps(rows, fixture());
  assert.deepEqual(joined.rows.map(r => [r.id, r.status, r.localStamp, r.localNotStamped]), [
    ['synthetic.one', 'verified', {scenarios: 2, runDate: '2026-02-01'}, false],
    ['synthetic.failed', 'failed-or-mixed', null, true],
    ['synthetic.none', 'not-yet-verified', null, false],
  ]);
  assert.deepEqual([joined.stamped, joined.stampedVerified, joined.stampedOutside, joined.notStampedOutside], [1, 1, ['synthetic.outside'], []]);
});

const published = JSON.parse(read('../data/publication.json'));
const raw = read('../data/local-stamps.json');
const stamps = JSON.parse(raw);
const flagged = ['catalog.writable-datasets', 'connectors.connector-builder', 'kaizen.notifications-inbox', 'kaizen.product-identity'];

test('LS-5 published local stamps: 34 stamped, 10 not stamped, never a release stamp', () => {
  assert.equal(validateLocalStamps(stamps, published), stamps); // applies to the real publication
  assert.deepEqual([stamps.baselineReleaseId, stamps.observationId], ['1.3.0-prerelease-r3', '2026-10-08-local-scoped-runtime']);
  assert.deepEqual([stamps.stamps.length, stamps.notStampedFailed.length, stamps.targetVersion, stamps.releaseVerified, stamps.notAReleaseStamp], [34, 10, '1.3.2', false, true]);
  assert.equal(stamps.stamps.reduce((n, s) => n + s.scenarios.length, 0), 47);
  // Same run as the published scoped observation, and the same two sets of capabilities.
  const observation = published.observations.find(o => o.target.version === '1.3.2');
  assert.deepEqual(stamps.runWindow, observation.evidenceWindow);
  assert.equal(stamps.coreSource.commit, observation.target.sourceRevision);
  const ids = test => observation.capabilities.filter(test).map(r => r.id).sort();
  assert.deepEqual(stamps.notStampedFailed.map(e => e.capability).sort(), ids(r => r.failedScenarios > 0));
  assert.deepEqual(stamps.stamps.map(s => s.capability).sort(), ids(r => r.failedScenarios === 0));
});

test('LS-6 published local stamps expose no private path, image digest, registry host or build string', () => {
  for (const forbidden of ['work/', 'sha256:', 'ghcr.io', 'k0s', 'lima', '.patch', 'recordFile', 'record_file', 'capture', '1.3.2;']) {
    assert.ok(!raw.includes(forbidden), forbidden);
  }
  assert.doesNotThrow(() => assertPublicOutputSafe(raw, ['PRIVATE_CANARY_NOT_FOR_EXPORT']));
  // The only URL is the kit pull request.
  assert.deepEqual(raw.match(/https?:[^"]*/g), ['https://github.com/kamiwaza-internal/capability-kit/pull/82']);
});

test('LS-7 published join: 27 of 50 verified rows stamped, flags agree, no status changes', () => {
  const rows = currentCapabilityView(published);
  const joined = joinLocalStamps(rows, stamps);
  assert.deepEqual(joined.rows.map(r => [r.id, r.status]), rows.map(r => [r.id, r.status]));
  assert.deepEqual(summarizeCurrentView(joined.rows), summarizeCurrentView(rows));
  const {localStamp, localNotStamped, ...first} = joined.rows[0];
  assert.deepEqual(first, rows[0]); // nothing but the two added fields
  // The 4 verified rows already flagged with a later scoped failure are exactly the verified rows not stamped for failure.
  assert.deepEqual(rows.filter(r => r.laterNonApplicableFailure).map(r => r.id).sort(), flagged);
  const notStamped = new Set(stamps.notStampedFailed.map(e => e.capability));
  assert.ok(flagged.every(id => notStamped.has(id)));
  assert.deepEqual(joined.rows.filter(r => r.status === 'verified' && r.localNotStamped).map(r => r.id).sort(), flagged);
  assert.ok(joined.rows.every(r => !(r.localStamp && (r.localNotStamped || r.laterNonApplicableFailure))), 'no row is both stamped and flagged');
  assert.deepEqual([joined.stampedVerified, joined.stamped], [27, 30]);
  assert.deepEqual(joined.stampedOutside, ['context.workroom-document-search', 'workrooms.admin-oversight', 'workrooms.create', 'workrooms.org-decommission']);
  assert.equal(joined.stamped + joined.stampedOutside.length, 34); // every stamp is shown somewhere
  assert.equal(joined.rows.filter(r => r.localNotStamped).length + joined.notStampedOutside.length, 10);
  assert.ok(joined.rows.filter(r => r.localStamp).every(r => r.localStamp.runDate === '2026-10-08' && r.localStamp.scenarios >= 1));
});

const kitFile = process.env.KIT_LOCAL_STAMPS ?? new URL('../../../capability-kit/reports/2026-10-09-1.3.2-local-verification-stamps/local-verification-stamps.json', import.meta.url);
test('LS-8 projection regenerates data/local-stamps.json byte for byte from the kit file',
  {skip: existsSync(kitFile) ? false : 'kit stamp set not present (expected in CI); set KIT_LOCAL_STAMPS to its path to run'}, () => {
    assert.equal(serialize(projectLocalStamps(readFileSync(kitFile))), raw);
  });
