import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validatePublication} from '../scripts/publication.mjs';
import {preserveHistory} from '../scripts/preserve-history.mjs';
import {emitBundles} from '../scripts/published-bundles.mjs';
import {filterCapabilities} from '../src/catalog.mjs';
import {prereleaseFixture} from './fixtures/prerelease.mjs';

const published = () => JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8'));
const [clean, mixed, gap] = [0, 1, 2];

test('valid pre-release snapshot keeps failures, gaps and the three separate axes', () => {
  const input = prereleaseFixture();
  const release = validatePublication(input).releases[0];
  assert.deepEqual(release.capabilities.map(c => c.status), ['prerelease-verified', 'failed-or-mixed', 'not-yet-verified', 'prerelease-verified']);
  assert.equal(release.counts.releaseVerified, 0);
  assert.equal(release.approval.status, 'pending');
  assert.equal(release.releaseBinding, 'not-established');
  assert.ok(release.capabilities.every(c => c.wholeClaim === false));
  // A capability with no published text is still searchable by its identifier.
  assert.deepEqual(filterCapabilities(release.capabilities, 'synthetic.gap', 'not-yet-verified'), [release.capabilities[gap]]);
});

const cap = (x, i) => x.releases[0].capabilities[i];
const first = x => cap(x, clean).evidence[0];
for (const [name, mutate, message] of [
  // Evidence must come from a development build this release names.
  ['cross-build evidence', x => first(x).build = 'develop@' + 'b'.repeat(12), /Evidence build mismatch/],
  ['released-version build as pre-release evidence', x => { first(x).build = '1.3.0'; x.releases[0].testedBuilds = ['1.3.0']; }, /Evidence build mismatch|Invalid tested builds/],
  ['tested build nothing ran on', x => x.releases[0].testedBuilds.push('develop@' + 'b'.repeat(12)), /Tested build has no evidence/],
  // Partial, offline or absent evidence never becomes whole credit.
  ['verified with a failing scenario', x => cap(x, mixed).status = 'prerelease-verified', /requires clean scenario evidence/],
  ['verified without any runtime record', x => cap(x, gap).status = 'prerelease-verified', /requires clean scenario evidence/],
  ['whole-capability credit', x => cap(x, clean).wholeClaim = true, /whole-capability credit/],
  ['failure hidden as a gap', x => cap(x, mixed).status = 'not-yet-verified', /cannot carry evidence/],
  ['failed label without a failing record', x => cap(x, clean).status = 'failed-or-mixed', /requires a failing record/],
  ['duplicate scenario padding', x => cap(x, mixed).evidence.push(structuredClone(cap(x, mixed).evidence[0])), /Duplicate identifiers/],
  ['count that hides a failure', x => { x.releases[0].counts.prereleaseVerified = 2; x.releases[0].counts.failedOrMixed = 0; }, /Counts must match/],
  ['count that hides a gap', x => x.releases[0].counts.included = 2, /Counts must match/],
  // Release verification and approval are separate axes this evidence cannot set.
  ['release-verified capability', x => cap(x, clean).releaseStatus = 'verified', /requires an established release binding/],
  ['release-verified count', x => x.releases[0].counts.releaseVerified = 1, /Counts must match/],
  ['hidden release failure', x => x.releases[0].counts.releaseFailed = 0, /Counts must match/],
  ['release binding', x => x.releases[0].releaseBinding = 'established', /cannot claim a release binding or approval/],
  ['released channel', x => x.releases[0].channel = 'released', /cannot claim a release binding or approval/],
  ['release approval', x => x.releases[0].approval = {status: 'approved', approvedBy: 'release-manager', approvedAt: '2026-10-08T18:00:00Z'}, /cannot claim a release binding or approval/],
  // Dates: run, then ingestion, then kit revision, then publication. None may be relabelled.
  ['unparseable run date', x => first(x).runFinishedAt = 'yesterday', /Invalid evidence timestamp/],
  ['impossible calendar date', x => first(x).runFinishedAt = '2026-02-31T00:00:00Z', /Invalid evidence timestamp/],
  ['date without a time', x => first(x).ingestedAt = '2026-09-30', /Invalid evidence timestamp/],
  ['run after its own ingestion', x => first(x).runFinishedAt = '2026-10-01T00:00:00Z', /Evidence dates out of order/],
  ['ingestion after the published kit revision', x => first(x).ingestedAt = '2026-10-08T12:00:00Z', /Evidence dates out of order/],
  ['draft before its evidence corpus', x => x.releases[0].generatedAt = '2026-10-07T00:00:00Z', /cannot predate its evidence corpus|Assessment postdates draft/],
  ['old run presented as a newer window', x => x.releases[0].evidenceWindow.latestRunFinishedAt = '2026-10-08T00:00:00Z', /Evidence window must match/],
  ['window that drops the oldest run', x => { cap(x, mixed).evidence[0].runFinishedAt = '2026-08-11T20:50:29Z'; }, /Evidence window must match/],
  // Statuses stay in the reviewed vocabulary.
  ['legacy verified label', x => cap(x, clean).status = 'verified', /Invalid pre-release verdict/],
  ['unknown outcome', x => first(x).outcome = 'skipped', /Invalid evidence outcome/],
  ['unknown release status', x => cap(x, gap).releaseStatus = 'pending', /requires an established release binding/],
  // Only allowlisted fields are public.
  ['raw log on a record', x => first(x).steps = ['PRIVATE'], /Unexpected or missing fields/],
  ['failure reason on a capability', x => cap(x, mixed).releaseFailure = 'PRIVATE', /Unexpected or missing fields/],
  ['image digest in a build', x => { const b = 'develop@' + 'a'.repeat(12) + '; ghcr.io/private@sha256:' + 'e'.repeat(64); first(x).build = b; x.releases[0].testedBuilds = [b]; }, /Evidence build mismatch|Invalid tested builds/],
  ['text without a curated declaration', x => cap(x, gap).summary = 'uncurated prose', /Text requires a curated declaration/],
  ['internal planning reference in a scenario', x => cap(x, mixed).evidence[0].scenario = 'VS-123', /Internal planning reference/],
  ['source baseline labelled schema 4', x => { x.schema = 3; x.releases[0].baselineKind = 'source-declaration'; }, /Schema 3 carries pre-release evidence only/],
]) test('rejects ' + name, () => {
  const input = prereleaseFixture(); mutate(input);
  assert.throws(() => validatePublication(input), message);
});

test('published revisions are immutable; pre-release evidence is appended', () => {
  const current = published();
  const next = {...current, releases: [...current.releases, prereleaseFixture().releases[0]]};
  assert.doesNotThrow(() => preserveHistory(current, next));
  const promoted = structuredClone(next); promoted.releases[0].capabilities[0].status = 'verified';
  assert.throws(() => preserveHistory(current, promoted), /cannot be changed or removed: 1.3.0-declared-r1/);
  const redated = structuredClone(next); redated.releases[1].publishedAt = '2026-10-08T18:00:00Z';
  assert.throws(() => preserveHistory(current, redated), /cannot be changed or removed: 1.3.0-declared-r2/);
  assert.throws(() => preserveHistory(current, {...next, releases: next.releases.slice(1)}), /cannot be changed or removed/);
  assert.throws(() => preserveHistory(current, {...next, schema: 3}), /cannot be changed or removed/);
});

test('previously published bundle bytes survive; pre-release bundle is labelled schema 4', () => {
  const out = mkdtempSync(join(tmpdir(), 'publication-prerelease-'));
  const input = published(); input.releases.push(prereleaseFixture().releases[0]);
  emitBundles(input, out);
  const digest = name => createHash('sha256').update(readFileSync(join(out, 'releases', name, 'bundle.json'))).digest('hex');
  // Digests of the bundles deployed from main 9fae6745 on 2026-09-25.
  assert.equal(digest('1.3.0-declared-r1'), '7c04bc53cd71c61ddb380047becb61cff184a85988cba6985055ba12168e7f95');
  assert.equal(digest('1.3.0-declared-r2'), 'b64f528733d9eb34df74637a7c464944a67efc502a213ce45e20f5d1591f98b3');
  const bundle = JSON.parse(readFileSync(join(out, 'releases/synthetic-prerelease-r3/bundle.json'), 'utf8'));
  assert.equal(bundle.schema, 4);
  assert.deepEqual(validatePublication(bundle).releases, prereleaseFixture().releases);
  const index = JSON.parse(readFileSync(join(out, 'releases/index.json'), 'utf8'));
  assert.equal(index.releases.at(-1).sha256, digest('synthetic-prerelease-r3'));
});

test('current publication: every pre-release revision is sanitized and claims no release credit', () => {
  const releases = validatePublication(published()).releases.filter(r => r.baselineKind === 'prerelease-evidence');
  for (const release of releases) {
    assert.equal(release.counts.releaseVerified, 0);
    assert.equal(release.approval.status, 'pending');
    const {capabilities, omittedCapabilities, deferredCapabilities, ...metadata} = release;
    const structural = JSON.stringify([metadata, capabilities.map(c => [c.status, c.releaseStatus, c.evidence, c.assessment])]);
    // Capability identities are validated public identifiers, including federation.cluster-pairing.
    // Scan runtime metadata separately so a product identifier does not masquerade as a host.
    assert.doesNotMatch(structural, /ghcr\.io|sha256:|kubectl|\.test\b|cluster|mirror|bug-?bash|eng-\d+|feature\/|fix\/|localhost|\d+\.\d+\.\d+\.\d+/i);
  }
});
