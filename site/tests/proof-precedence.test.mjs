import test from 'node:test';
import assert from 'node:assert/strict';
import {primaryCapabilities} from '../src/catalog.mjs';

// One synthetic capability per revision isolates the native scorer's effective
// verdict from unrelated observations and qualified release-stamp precedence.
const revision = (state, number) => {
  const proof = state === 'withdrawn' ? null : {
    state, observedAt: '2026-10-0' + number + 'T00:00:00Z',
  };
  const cap = {
    id: 'synthetic.proof', title: null, summary: null, conditions: [], limits: [],
    declaration: null, wholeClaim: false, evidence: [], assessment: null,
    releaseStatus: 'not-stamped', proof,
    status: state === 'established' ? 'prerelease-verified' : state === 'failed' ? 'failed-or-mixed' : 'not-yet-verified',
    verificationBasis: state === 'established' ? 'value-stream' : 'none',
  };
  return {
    id: 'synthetic-prerelease-r' + number, version: '9.9.0', publicationRevision: number,
    baselineKind: 'prerelease-evidence', generatedAt: '2026-10-0' + number + 'T01:00:00Z',
    counts: {scopedProofVerified: Number(state === 'established')},
    omittedCapabilities: [], deferredCapabilities: [], capabilities: [cap],
  };
};
const view = states => primaryCapabilities({releases: states.map((state, i) => revision(state, i + 1))})[0];
const proofFailures = row => row.failures.filter(failure => failure.axis === 'scoped-proof');

test('first failed proof claims no earlier acceptance', () => {
  const row = view(['failed']);
  assert.equal(row.status, 'failed-or-mixed');
  assert.deepEqual(proofFailures(row).map(f => [f.applicable, f.supersedes, f.superseded]), [[true, false, false]]);
});
test('failure followed by native withdrawal remains a historical failure, not a pass', () => {
  const row = view(['failed', 'withdrawn']);
  assert.equal(row.status, 'not-yet-verified');
  assert.deepEqual(proofFailures(row).map(f => [f.applicable, f.supersedes, f.superseded]), [[false, false, false]]);
  assert.deepEqual(row.history.map(item => item.status), ['failed-or-mixed', 'not-yet-verified']);
});
test('failure followed by another failure invents neither acceptance nor recovery', () => {
  const row = view(['failed', 'failed']);
  assert.equal(row.status, 'failed-or-mixed');
  assert.deepEqual(proofFailures(row).map(f => [f.applicable, f.supersedes, f.superseded]),
    [[false, false, false], [true, false, false]]);
});
test('failure followed by an established effective proof records a real recovery', () => {
  const row = view(['failed', 'established']);
  assert.equal(row.status, 'prerelease-verified');
  assert.deepEqual(proofFailures(row).map(f => [f.applicable, f.supersedes, f.superseded]), [[false, false, true]]);
});
test('only a failure immediately after effective proof credit supersedes that credit', () => {
  const row = view(['established', 'failed']);
  assert.equal(row.status, 'failed-or-mixed');
  assert.deepEqual(proofFailures(row).map(f => [f.applicable, f.supersedes, f.superseded]), [[true, true, false]]);
  const withdrawn = view(['established', 'withdrawn', 'failed']);
  assert.equal(withdrawn.status, 'failed-or-mixed');
  assert.deepEqual(proofFailures(withdrawn).map(f => [f.applicable, f.supersedes, f.superseded]), [[true, false, false]]);
});
test('a later withdrawal does not leave an older failure labelled as a current recovery', () => {
  const row = view(['failed', 'established', 'withdrawn']);
  assert.equal(row.status, 'not-yet-verified');
  assert.deepEqual(proofFailures(row).map(f => [f.applicable, f.supersedes, f.superseded]), [[false, false, false]]);
});
