import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validatePublication} from '../scripts/publication.mjs';
import {emitBundles} from '../scripts/published-bundles.mjs';
import {preserveHistory} from '../scripts/preserve-history.mjs';
import {observationsFixture} from './fixtures/observations.mjs';
import {prereleaseFixture} from './fixtures/prerelease.mjs';
const observation = x => x.observations[0];
test('new observations stay separate from historical credit and deduplicate shared mappings', () => {
  const x = validatePublication(observationsFixture());
  assert.deepEqual(x.releases, prereleaseFixture().releases);
  assert.equal(observation(x).capabilities[1].baselineStatus, 'failed-or-mixed');
  assert.equal(observation(x).capabilities[1].failedScenarios, 0);
  assert.equal(observation(x).counts.passedScenarios, 3);
  assert.equal(observation(x).capabilities.reduce((n, row) => n + row.passedScenarios, 0), 4);
});
test('schema5 additive migration preserves all historical bundle bytes and exact observation digest', () => {
  const before = prereleaseFixture(); const after = observationsFixture();
  preserveHistory(before, after);
  const a = mkdtempSync(join(tmpdir(), 'observation-before-'));
  const b = mkdtempSync(join(tmpdir(), 'observation-after-'));
  emitBundles(before, a); emitBundles(after, b);
  for (const suffix of ['bundle.json', 'bundle.md']) {
    const path = 'releases/' + before.releases[0].id + '/' + suffix;
    assert.deepEqual(readFileSync(join(a, path)), readFileSync(join(b, path)));
  }
  assert.deepEqual(readFileSync(join(a, 'releases/index.json')), readFileSync(join(b, 'releases/index.json')));
  const index = JSON.parse(readFileSync(join(b, 'observations/index.json')));
  const bytes = readFileSync(join(b, index.observations[0].bundle));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), index.observations[0].sha256);
  assert.equal(JSON.parse(bytes).schema, 'capability-scoped-observations.v1');
  assert.match(readFileSync(join(b, 'llms.txt'), 'utf8'), /Do not add them to the historical baseline/);
  const rewritten = structuredClone(after); observation(rewritten).counts.catalog++;
  assert.throws(() => preserveHistory(after, rewritten), /Published observations/);
  assert.throws(() => preserveHistory(after, before), /Published revision|Published observations/);
});
for (const [name, mutate, reason] of [
  ['whole promotion', o => o.counts.wholeCapabilityPromotions = 1, /cannot promote/],
  ['release verified', o => o.counts.releaseVerified = 1, /cannot promote/],
  ['release binding', o => o.target.releaseBinding = 'released', /release claim/],
  ['deployed source binding', o => o.target.sourceBinding = 'running-image', /source binding/],
  ['unknown target host', o => o.target.host = 'private.invalid', /Unexpected or missing/],
  ['unknown packet path', o => o.privatePacket = '/home/private/packet', /Unexpected or missing/],
  ['unknown row prose', o => o.capabilities[0].notes = 'PRIVATE_CANARY', /Unexpected or missing/],
  ['unknown raw hash', o => o.recordSha256 = 'd'.repeat(64), /Unexpected or missing/],
  ['arbitrary outside identifier', o => o.capabilities[2].id = 'private.token-secret', /Unapproved public/],
  ['false baseline status', o => o.capabilities[1].baselineStatus = 'prerelease-verified', /relabel canonical/],
  ['wrong baseline membership', o => o.capabilities[2].inIncludedBaseline = true, /membership mismatch/],
  ['unknown baseline reference', o => o.baselineId = 'private-baseline', /baseline missing/],
  ['duplicate row', o => o.capabilities.push(structuredClone(o.capabilities[0])), /Duplicate identifiers/],
  ['empty row', o => {o.capabilities[2].passedScenarios = 0;}, /requires a scenario/],
  ['negative count', o => o.capabilities[0].failedScenarios = -1, /Invalid observation count/],
  ['float count', o => o.counts.passedScenarios = 3.5, /Invalid observation count/],
  ['sum pretending distinct', o => o.counts.passedScenarios = 4, /Distinct scenario counts/],
  ['category count mismatch', o => o.counts.successfulCapabilities = 3, /scope counts mismatch/],
  ['included count mismatch', o => o.counts.inIncludedBaseline = 3, /scope counts mismatch/],
  ['denominator smaller than observed', o => o.counts.catalog = 2, /scope counts mismatch/],
  ['mismatched mapping count', o => o.counts.sharedScenarioAssignments = 0, /assignment count mismatch/],
  ['mapping removed', o => o.sharedScenarioMappings = [], /Distinct scenario counts/],
  ['duplicate mapping', o => o.sharedScenarioMappings.push(structuredClone(o.sharedScenarioMappings[0])), /Duplicate identifiers|exceeds capability/],
  ['mapping duplicate capability', o => o.sharedScenarioMappings[0].capabilityIds[1] = 'synthetic.clean', /Duplicate identifiers/],
  ['mapping nonexistent row', o => o.sharedScenarioMappings[0].capabilityIds[1] = 'synthetic.gap', /unobserved capability/],
  ['mapping wrong outcome', o => o.sharedScenarioMappings[0].outcome = 'failed', /exceeds capability/],
  ['mapping private scenario identity', o => o.sharedScenarioMappings[0].scenario = 'PRIVATE_CANARY', /Unexpected or missing/],
  ['mapping unsupported outcome', o => o.sharedScenarioMappings[0].outcome = 'release-verified', /Invalid shared scenario outcome/],
  ['floating kit commit', o => o.sourceKitRevision = 'main', /full commit/],
  ['short source commit', o => o.target.sourceRevision = 'abcd1234', /source binding/],
  ['future timestamp', o => o.generatedAt = '2099-10-09T00:00:00Z', /Future observation timestamp/],
  ['invalid calendar', o => o.evidenceWindow.earliestStartedAt = '2026-02-30T10:00:00Z', /Invalid observation timestamp/],
  ['missing UTC zone', o => o.packetGeneratedAt = '2026-10-08T22:33:38', /Invalid observation timestamp/],
  ['microsecond dates reversed', o => {o.evidenceWindow.earliestStartedAt='2026-10-08T22:26:37.410353Z';}, /dates out of order/],
  ['packet before finish', o => o.packetGeneratedAt = '2026-10-08T22:26:37.410351Z', /dates out of order/],
  ['commit before packet', o => o.sourceCommittedAt = '2026-10-08T22:33:38Z', /dates out of order/],
  ['public generation before commit', o => o.generatedAt = '2026-10-08T22:42:09Z', /dates out of order/],
  ['SDK phase before observed finish', o => o.sdkExecutionWindow.latestFinishedAt = '2026-10-08T22:26:37Z', /SDK phase dates/],
  ['SDK phase after packet', o => o.sdkExecutionWindow.latestFinishedAt = '2026-10-08T22:33:38.749037Z', /SDK phase dates/],
]) test('rejects observation ' + name, () => {
  const x = observationsFixture(); mutate(observation(x)); assert.throws(() => validatePublication(x), reason);
});
