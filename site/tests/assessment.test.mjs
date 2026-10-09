import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublication} from '../scripts/publication.mjs';
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
