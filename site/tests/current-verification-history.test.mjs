import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadCurrentVerification} from '../scripts/current-verification.mjs';
import {preserveVerificationHistory} from '../scripts/preserve-history.mjs';

const source = JSON.parse(readFileSync(new URL('../static/verification-results/1.3.4-2026-10-22-markings/results.json', import.meta.url)));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'verification-lineage-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  mkdirSync(join(root, 'site/static/current-verification/1.3.4'), {recursive:true});
  function write(report, suffix) {
    const bytes = JSON.stringify(report), path = `current-verification/1.3.4/2026-10-23-${suffix}.json`;
    writeFileSync(join(root, 'site/static', path), bytes);
    const currentVerification = {path, sha256:createHash('sha256').update(bytes).digest('hex')};
    loadCurrentVerification(root, currentVerification); // Every negative example is internally valid.
    return {corpora:[{version:'1.3.4', currentVerification}]};
  }
  return {root, write, previous:write(source, 'previous')};
}
function recount(report) {
  const historical = new Set(report.historicalPrerelease.map(row => row.id));
  for (const row of report.capabilities) row.historicalPrerelease = historical.has(row.id);
  const accepted = report.capabilities.filter(row => row.status === 'accepted-scoped-release');
  report.counts = {included:report.capabilities.length, acceptedScoped:accepted.length,
    remaining:report.capabilities.length-accepted.length, historicalPrerelease:historical.size,
    historicalInScope:report.capabilities.filter(row => historical.has(row.id)).length,
    historicalOutsideScope:report.historicalPrerelease.filter(row => !report.capabilities.some(cap => cap.id === row.id)).length,
    historicalAlsoReleaseAccepted:accepted.filter(row => historical.has(row.id)).length};
  return report;
}

test('internally valid snapshots cannot drop prior capabilities or rewrite history', t => {
  const {root, write, previous} = fixture(t);
  for (const [label, mutate, error] of [
    ['removed', report => report.capabilities.splice(0, 1), /Prior capability cannot be removed/],
    ['unexplained', report => Object.assign(report.capabilities.find(row => row.status === 'accepted-scoped-release'),
      {status:'not-release-verified', gap:'   '}), /must explain its gap/],
    ['history-removed', report => report.historicalPrerelease.pop(), /Historical prerelease evidence/],
    ['history-edited', report => report.historicalPrerelease[0].title = 'rewritten history', /Historical prerelease evidence/],
  ]) {
    const report = structuredClone(source); mutate(report);
    assert.throws(() => preserveVerificationHistory(root, previous, write(recount(report), label)), error);
  }
});

test('new capabilities and refreshed evidence preserve the prior snapshot and historical records', t => {
  const {root, write, previous} = fixture(t), next = structuredClone(source);
  const pending = next.capabilities.find(row => row.status === 'not-release-verified');
  next.capabilities.push({...pending, id:'unit.new-capability', historicalPrerelease:false});
  next.capabilities.find(row => row.status === 'accepted-scoped-release').stampId = 'a'.repeat(64);
  assert.doesNotThrow(() => preserveVerificationHistory(root, previous, write(recount(next), 'next')));
  assert.doesNotThrow(() => preserveVerificationHistory(root, previous, previous));
  for (const current of [{corpora:[]}, {corpora:[{version:'1.3.4'}]}]) {
    assert.throws(() => preserveVerificationHistory(root, previous, current), /cannot be removed/);
  }
  const before = previous.corpora[0].currentVerification;
  writeFileSync(join(root, 'site/static', before.path), '{}');
  assert.throws(() => preserveVerificationHistory(root, previous, previous), /digest mismatch/);
});


test('a reviewed current regression can reduce credit without erasing its earlier acceptance', t => {
  const {root, write, previous} = fixture(t), next = structuredClone(source);
  const row = next.capabilities.find(row => row.status === 'accepted-scoped-release');
  row.status = 'not-release-verified';
  row.gap = 'Current replay failed; prior accepted proof is retained in the preceding snapshot.';
  const current = write(recount(next), 'regression');
  assert.doesNotThrow(() => preserveVerificationHistory(root, previous, current));
  const earlier = loadCurrentVerification(root, previous.corpora[0].currentVerification);
  const now = loadCurrentVerification(root, current.corpora[0].currentVerification);
  assert.equal(earlier.capabilities.find(cap => cap.id === row.id).status, 'accepted-scoped-release');
  assert.equal(now.capabilities.find(cap => cap.id === row.id).status, 'not-release-verified');
  assert.equal(now.counts.acceptedScoped, earlier.counts.acceptedScoped - 1);
});
