import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {emitBundles} from '../scripts/published-bundles.mjs';
import {validatePublication} from '../scripts/publication.mjs';
import {currentCapabilityView, primaryCapabilities} from '../src/catalog.mjs';
import {evidenceDocument, evidenceVersions, summaryDocument, toMarkdown} from '../src/evidence.mjs';
import {prereleaseFixture} from './fixtures/prerelease.mjs';
const release = x => x.releases[0];
const assessed = x => release(x).capabilities[3];
test('accepted local-contract basis remains distinct from scenario credit, source, approval and publication', () => {
  const r = validatePublication(prereleaseFixture()).releases[0];
  assert.deepEqual([r.counts.prereleaseVerified, r.counts.scenarioVerified, r.counts.developerAssessed], [2, 1, 1]);
  assert.equal(r.capabilities[3].evidence.length, 0);
  assert.equal(r.capabilities[3].assessment.ingestedAt, null);
  assert.equal(r.publishedAt, null);
  assert.equal(r.reviewReference, null);
  assert.equal(r.capabilities[3].assessment.sourceBinding, 'observed-source-only');
});
for (const [name, change, reason] of [
 ['assessment as scenario', x => assessed(x).verificationBasis = 'historical-scenario', /Contradictory verification basis/],
 ['assessment with runtime record', x => assessed(x).evidence.push(structuredClone(release(x).capabilities[0].evidence[0])), /Assessment cannot supply runtime/],
 ['assessment as release verified', x => assessed(x).releaseStatus = 'verified', /Release verification requires/],
 ['assessment with retained release failure', x => assessed(x).releaseStatus = 'failed', /Assessment cannot supply runtime/],
 ['assessment changed to gap', x => assessed(x).status = 'not-yet-verified', /Assessment cannot supply runtime/],
 ['assessment changed to mixed', x => assessed(x).status = 'failed-or-mixed', /Assessment cannot supply runtime/],
 ['assessment whole claim', x => assessed(x).wholeClaim = true, /whole-capability credit/],
 ['assessment with deployed build', x => assessed(x).assessment.build = 'develop@' + 'e'.repeat(40), /Unexpected or missing fields/],
 ['assessment marked executed', x => assessed(x).assessment.basis = 'executed', /Invalid assessment basis/],
 ['assessment release binding', x => assessed(x).assessment.sourceBinding = 'released-image', /Invalid assessment basis/],
 ['assessment missing date', x => delete assessed(x).assessment.assessedAt, /Unexpected or missing fields/],
 ['ambiguous assessment date', x => assessed(x).assessment.assessedAt = '2026-10-06', /Invalid evidence timestamp/],
 ['invalid assessment calendar', x => assessed(x).assessment.assessedAt = '2026-02-30T09:31:27Z', /Invalid evidence timestamp/],
 ['future assessment date', x => assessed(x).assessment.assessedAt = '2099-10-06T09:31:27Z', /Future evidence timestamp/],
 ['future run date', x => release(x).capabilities[0].evidence[0].runFinishedAt = '2099-09-30T16:27:15Z', /Future evidence timestamp/],
 ['future generation date', x => release(x).generatedAt = '2099-10-08T16:50:00Z', /Future evidence timestamp/],
 ['assessment ingestion before assessment', x => assessed(x).assessment.ingestedAt = '2026-10-05T09:31:27Z', /ingestion dates out of order/],
 ['assessment after generation', x => assessed(x).assessment.assessedAt = '2026-10-08T17:00:00Z', /Assessment postdates draft/],
 ['assessment window relabelled', x => release(x).assessmentWindow.latestAssessedAt = '2026-10-08T16:50:00Z', /Assessment window/],
 ['draft with fabricated PR', x => release(x).reviewReference = 'https://github.com/kamiwaza-internal/capability-documentation/pull/8', /Draft cannot invent/],
 ['draft with publication timestamp', x => release(x).publishedAt = '2026-10-08T16:50:00Z', /Draft cannot invent/],
 ['published snapshot without review', x => { release(x).publicationState = 'published'; release(x).publishedAt = release(x).generatedAt; }, /Public review PR/],
 ['published snapshot predating generation', x => { release(x).publicationState = 'published'; release(x).publishedAt = '2026-10-08T16:49:00Z'; }, /Publication predates generation/],
 ['assessment source as tested build', x => release(x).testedBuilds.push('develop@' + assessed(x).assessment.observedSourceRevision), /Tested build has no evidence/],
 ['cross-build mixing outside selected builds', x => release(x).capabilities[1].evidence[0].build = 'develop@' + 'e'.repeat(40), /Evidence build mismatch/],
 ['aggregate hides developer basis', x => { release(x).counts.scenarioVerified = 2; release(x).counts.developerAssessed = 0; }, /Counts must match/],
 ['aggregate hides gap', x => release(x).counts.notYetVerified = 0, /Counts must match/],
 ['private packet identity field', x => assessed(x).assessment.packetId = 'e'.repeat(64), /Unexpected or missing fields/],
 ['private packet raw hash field', x => assessed(x).assessment.packetSha256 = 'f'.repeat(64), /Unexpected or missing fields/],
 ['private intake reference field', x => assessed(x).assessment.acceptedInputId = 'e'.repeat(64), /Unexpected or missing fields/],
 ['assessment private unknown field', x => assessed(x).assessment.rawLog = 'PRIVATE_CANARY', /Unexpected or missing fields/],
 ['assessment private path in limits', x => assessed(x).assessment.limits.push('/home/private/report.md'), /Private assessment content/],
 ['assessment internal URL in assumptions', x => assessed(x).assessment.assumptions.push('https://internal.invalid/issue'), /Private assessment content/],
 ['assessment environment value', x => assessed(x).assessment.limits.push('KAMIWAZA_PRIVATE_MODE=1'), /Private assessment content/],
 ['assessment canary in scope', x => assessed(x).assessment.limits.push('PRIVATE_CANARY_NOT_FOR_EXPORT'), /Private assessment content/],
 ['aggregate build claims a release', x => release(x).build = '1.3.0; released image tested for all capabilities', /aggregate tested build/],
 ['aggregate build falsely binds one source', x => release(x).build = '1.3.0; develop@' + 'e'.repeat(40), /aggregate tested build/],
 ['declaration contains private URL', x => release(x).capabilities[0].limits.push('https://internal.invalid/source'), /Private declaration/],
 ['declaration contains environment value', x => release(x).capabilities[0].conditions.push('PRIVATE_SETTING=true'), /Private declaration/],
 ['deferred capability credited', x => release(x).deferredCapabilities = ['synthetic.clean'], /Deferred capability/],
 ['assessment removed caveat', x => assessed(x).assessment.limits[0] = 'All live tests passed', /disclaim runtime and release/],
]) test('rejects ' + name, () => {
 const x = prereleaseFixture(); change(x); assert.throws(() => validatePublication(x), reason);
});

// Schema 8 is a new reviewed consumer contract. Historical publication bytes
// remain untouched; these are synthetic rows with no private proof receipt.
function proofFixture() {
  const data = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8'));
  data.schema = 8;
  const r = structuredClone(data.releases.find(item => item.id === '1.3.0-prerelease-r3'));
  r.id = '1.3.0-prerelease-r4';
  r.publicationRevision = 4;
  r.publicationState = 'draft';
  r.publishedAt = null;
  r.reviewReference = null;
  r.generatedAt = '2026-10-17T23:00:00Z';
  data.releases.push(r);
  r.build = r.version + '; project pre-release baseline: historical development-build scenarios, local-contract assessments and scoped proofs; not a released ' + r.version + ' artifact; release unverified';
  r.counts.scopedProofVerified = 1;
  r.counts.prereleaseVerified++;
  r.counts.notYetVerified--;
  r.capabilities.forEach(cap => cap.proof = null);
  const cap = r.capabilities.find(item => item.id === 'apps.sandbox-workload-provider');
  cap.status = 'prerelease-verified';
  cap.verificationBasis = 'value-stream';
  r.proofWindow = {earliestObservedAt: '2026-10-07T00:00:00Z', latestObservedAt: '2026-10-07T00:00:00Z'};
  cap.proof = {state: 'established', proofSha256: 'c'.repeat(64), recipeId: 'Operator:VS1:text-inference', recipeRevision: 1,
    recipeSha256: 'a'.repeat(64), buildFingerprint: 'b'.repeat(64),
    observedAt: '2026-10-07T00:00:00Z', scope: 'One reviewed native text inference journey.',
    limits: ['One deployment only; no whole-capability or release verification.']};
  return {data, r, cap};
}
test('schema 8 accepts one effective scoped proof without changing historical scenario or assessment counts', () => {
  const {data, r, cap} = proofFixture();
  validatePublication(data);
  assert.equal(r.counts.prereleaseVerified, 51);
  assert.equal(r.counts.scenarioVerified, 33);
  assert.equal(r.counts.developerAssessed, 17);
  assert.equal(cap.proof.state, 'established');
});
test('a failed release replay does not erase established pre-release scoped proof credit', () => {
  const {data, r, cap} = proofFixture();
  cap.releaseStatus = 'failed';
  r.counts.releaseFailed++;
  assert.doesNotThrow(() => validatePublication(data));
});
for (const [name, change, reason] of [
  ['proof on old schema', x => x.data.schema = 6, /Scoped proof requires publication schema 8/],
  ['ingredient mistaken for proof', x => x.cap.proof.state = 'incomplete', /Scoped proof credit requires/],
  ['proof with raw path', x => x.cap.proof.scope = '/home/private/receipt.json', /Private release content/],
  ['proof with malformed digest', x => x.cap.proof.proofSha256 = 'short', /Invalid SHA256/],
  ['failed proof promoted', x => x.cap.proof.state = 'failed', /Scoped proof credit requires/],
  ['proof with forged count', x => x.r.counts.scopedProofVerified = 2, /Counts must match/],
  ['proof with wrong state and no effective basis', x => x.cap.verificationBasis = 'none', /requires clean scenario evidence/],
  ['proof with future observation', x => x.cap.proof.observedAt = '2099-01-01T00:00:00Z', /Future observation timestamp/],
]) test('schema 8 rejects ' + name, () => {
  const x = proofFixture(); change(x); assert.throws(() => validatePublication(x.data), reason);
});

test('schema 8 emits a proof-labelled new bundle and preserves older bundle labels', () => {
  const {data} = proofFixture();
  const dir = mkdtempSync(join(tmpdir(), 'scoped-proof-publication-'));
  try {
    emitBundles(data, dir);
    const proof = JSON.parse(readFileSync(join(dir, 'releases', '1.3.0-prerelease-r4', 'bundle.json'), 'utf8'));
    const historical = JSON.parse(readFileSync(join(dir, 'releases', '1.3.0-prerelease-r3', 'bundle.json'), 'utf8'));
    assert.equal(proof.schema, 8);
    assert.equal(historical.schema, 4);
    validatePublication(proof);
    validatePublication(historical);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

function proofOnlyFixture() {
  const x = proofFixture();
  const {r, cap} = x;
  r.testedBuilds = [];
  r.evidenceWindow = null;
  r.assessmentWindow = null;
  r.build = '1.3.0; project pre-release baseline: scoped proofs; not a released 1.3.0 artifact; release unverified';
  for (const row of r.capabilities) {
    row.evidence = [];
    row.assessment = null;
    row.releaseStatus = 'not-stamped';
    if (row !== cap) {
      row.status = 'not-yet-verified';
      row.verificationBasis = 'none';
    }
  }
  r.counts = {included: 88, prereleaseVerified: 1, scenarioVerified: 0, developerAssessed: 0,
    failedOrMixed: 0, notYetVerified: 87, releaseVerified: 0, releaseFailed: 0, scopedProofVerified: 1};
  return x;
}
function successor(x, state) {
  const r = structuredClone(x.r);
  r.id = '1.3.0-prerelease-r5';
  r.publicationRevision = 5;
  r.generatedAt = '2026-10-18T00:22:00Z';
  r.sourceCommittedAt = '2026-10-18T00:21:00Z';
  const cap = r.capabilities.find(item => item.id === x.cap.id);
  cap.verificationBasis = 'none';
  r.counts.prereleaseVerified = 0;
  r.counts.scopedProofVerified = 0;
  if (state === 'failed') {
    cap.status = 'failed-or-mixed';
    cap.proof.state = 'failed';
    cap.proof.observedAt = '2026-10-18T00:20:00Z';
    r.proofWindow = {earliestObservedAt: cap.proof.observedAt, latestObservedAt: cap.proof.observedAt};
    r.counts.failedOrMixed = 1;
  } else {
    cap.status = 'not-yet-verified';
    cap.proof = null;
    r.proofWindow = null;
    r.build = '1.3.0; project pre-release baseline: no qualifying evidence; not a released 1.3.0 artifact; release unverified';
    r.counts.notYetVerified = 88;
  }
  x.data.releases.push(r);
  return {r, cap};
}
const targetRow = (rows) => rows.find(row => row.id === 'apps.sandbox-workload-provider' && row.version === '1.3.0');

test('proof-only schema 8 accepts absent scenario and assessment bases in browser and downloads', () => {
  const x = proofOnlyFixture();
  validatePublication(x.data);
  const primary = targetRow(primaryCapabilities(x.data));
  assert.equal(primary.status, 'prerelease-verified');
  const current = currentCapabilityView(x.data).find(row => row.id === x.cap.id);
  assert.equal(current.status, 'verified');
  const entry = evidenceVersions(x.data, null).find(item => item.version === '1.3.0');
  assert.match(entry.headline, /1 pre-release verified/);
  assert.match(entry.basis, /established scoped proofs/);
  const document = toMarkdown(evidenceDocument(entry, x.data, null));
  const summary = toMarkdown(summaryDocument(entry, x.data, null));
  assert.match(document, /Scoped proof established/);
  assert.match(document, /Scenario tested builds: none in this revision/);
  assert.doesNotMatch(document, /Scenario runs between/);
  assert.match(summary, /scoped proofs/i);
});
test('proof-only and mixed bases require exact derived windows and tested builds', () => {
  for (const [fixture, mutate, reason] of [
    [proofOnlyFixture, x => delete x.r.proofWindow, /Unexpected or missing fields/],
    [proofOnlyFixture, x => x.r.proofWindow.latestObservedAt = '2026-10-08T00:00:00Z', /Proof window/],
    [proofOnlyFixture, x => x.r.evidenceWindow = {earliestRunFinishedAt: '2026-10-07T00:00:00Z', latestRunFinishedAt: '2026-10-07T00:00:00Z'}, /Absent scenarios/],
    [proofOnlyFixture, x => x.r.assessmentWindow = {earliestAssessedAt: '2026-10-07T00:00:00Z', latestAssessedAt: '2026-10-07T00:00:00Z'}, /Absent assessments/],
    [proofOnlyFixture, x => x.r.testedBuilds = ['develop@' + 'a'.repeat(40)], /Tested build has no evidence/],
    [proofFixture, x => x.r.evidenceWindow = null, /Expected object/],
    [proofFixture, x => x.r.assessmentWindow = null, /Expected object/],
    [proofFixture, x => x.r.proofWindow = null, /Expected object/],
  ]) {
    const x = fixture(); mutate(x);
    assert.throws(() => validatePublication(x.data), reason);
  }
});
for (const state of ['failed', 'withdrawn']) test('later same-release native ' + state + ' verdict removes earlier scoped-proof credit without erasing history', () => {
  const x = proofOnlyFixture();
  const older = structuredClone(x.r);
  const {r} = successor(x, state);
  validatePublication(x.data);
  assert.equal(r.counts.scopedProofVerified, 0);
  const primary = targetRow(primaryCapabilities(x.data));
  assert.equal(primary.snapshotId, r.id);
  assert.equal(primary.status, state === 'failed' ? 'failed-or-mixed' : 'not-yet-verified');
  assert.ok(primary.history.some(item => item.snapshotId === older.id && item.status === 'prerelease-verified'));
  if (state === 'failed') assert.ok(primary.failures.some(item => item.axis === 'scoped-proof' && item.applicable));
  const current = currentCapabilityView(x.data).find(row => row.id === x.cap.id);
  assert.equal(current.status, primary.status);
  const entry = evidenceVersions(x.data, null).find(item => item.version === '1.3.0');
  assert.doesNotMatch(entry.headline, /1 pre-release verified/);
  const document = toMarkdown(evidenceDocument(entry, x.data, null));
  const summary = toMarkdown(summaryDocument(entry, x.data, null));
  assert.doesNotMatch(document, /Status: Pre-release verified/);
  assert.doesNotMatch(summary, /1 pre-release verified/);
  const dir = mkdtempSync(join(tmpdir(), 'scoped-proof-history-'));
  try {
    emitBundles(x.data, dir);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'releases', older.id, 'bundle.json'), 'utf8')).releases[0], older);
  } finally {rmSync(dir, {recursive: true, force: true});}
});
test('a newer verdict for another release cannot withdraw 1.3.0 proof credit', () => {
  const x = proofOnlyFixture();
  const {r} = successor(x, 'failed');
  r.id = '1.4.0-prerelease-r1';
  r.version = '1.4.0';
  r.publicationRevision = 1;
  r.build = r.build.replaceAll('1.3.0', '1.4.0');
  validatePublication(x.data);
  assert.equal(targetRow(primaryCapabilities(x.data)).status, 'prerelease-verified');
  assert.equal(targetRow(primaryCapabilities(x.data)).snapshotId, x.r.id);
  assert.equal(currentCapabilityView(x.data, '1.3.0').find(row => row.id === x.cap.id).status, 'verified');
  const entry = evidenceVersions(x.data, null).find(item => item.version === '1.3.0');
  assert.match(entry.headline, /1 pre-release verified/);
  assert.match(toMarkdown(evidenceDocument(entry, x.data, null)), /Status: Pre-release verified/);
  assert.match(toMarkdown(summaryDocument(entry, x.data, null)), /Scoped proof before release/);
});
