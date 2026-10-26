import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadReleaseWork} from '../scripts/release-work.mjs';
import {loadReleaseCorpora} from '../scripts/release-corpora.mjs';
import {evidenceVersions, changesSince, agentsMd} from '../src/evidence.mjs';
import {recipeGuide, releaseWorkView, verificationLabel, prereleaseHistoryText} from '../src/verification-guide.mjs';
import {emitBundles, emitEvidence} from '../scripts/published-bundles.mjs';
import {zipMembers} from '../scripts/check-release-corpus.mjs';

const publication = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url)));
const source = JSON.parse(readFileSync(new URL('../data/release-work.json', import.meta.url)));

test('prerelease work preserves exact prior evidence and cannot retarget its stamps', t => {
  const repo = mkdtempSync(join(tmpdir(), 'release-work-'));
  t.after(() => rmSync(repo, {recursive:true, force:true}));
  mkdirSync(join(repo, 'site/data'), {recursive:true});
  const binding = source.releases[0].retainedVerification;
  mkdirSync(join(repo, 'site/static/current-verification/1.3.4'), {recursive:true});
  const original = readFileSync(new URL('../static/' + binding.path, import.meta.url));
  writeFileSync(join(repo, 'site/static', binding.path), original);
  const load = data => {
    writeFileSync(join(repo, 'site/data/release-work.json'), JSON.stringify(data));
    return loadReleaseWork({repo, publication});
  };
  const [work] = load(source);
  assert.equal(work.version, '1.3.5');
  assert.deepEqual(work.retainedBytes, original);
  assert.equal(work.retained.version, '1.3.4');
  for (const mutate of [
    row => row.version = '1.3.4', row => row.channel = 'released',
    row => row.sourceBranch = 'release/1.4.0', row => row.originalReplayId = 'invented',
    row => row.retainedVerification.sha256 = '0'.repeat(64), row => row.releaseVerified = 73,
    row => row.prereleaseCarry.capabilityIds.push('invented.capability'),
    row => row.prereleaseCarry.sourceKitCommit = 'invented',
    row => row.prereleaseCarry.capabilityIds.push(row.prereleaseCarry.capabilityIds[0]),
    row => row.prereleaseCarry.capabilityIds.push('delegation.run-claims-lifecycle'),
  ]) {
    const data = structuredClone(source); mutate(data.releases[0]);
    assert.throws(() => load(data));
  }
  for (const [mutate, error] of [
    [row => row.originalReplayId = 'invented', /Original release replay must exist/],
    [row => row.retainedVerification.sha256 = '0'.repeat(64), /Current verification digest mismatch/],
    [row => row.prereleaseCarry.capabilityIds.push('delegation.run-claims-lifecycle'), /Withheld capability cannot receive carry credit/],
  ]) {
    const data = structuredClone(source); mutate(data.releases[0]);
    assert.throws(() => load(data), error);
  }
});

test('original release and current prerelease work remain separate in cards and recipe statuses', () => {
  const work = loadReleaseWork({publication});
  const entries = evidenceVersions(publication, null, loadReleaseCorpora({publication}), [], work);
  const original = entries.find(row => row.version === '1.3.4');
  const newest = entries.find(row => row.version === '1.3.5');
  assert.equal(original.replay.id, '1.3.4-release-replay-r2');
  assert.equal(original.replay.counts.releaseStamped, 30);
  assert.equal(original.replay.counts.included, 88);
  assert.ok(!original.corpus?.currentVerification);
  assert.match(newest.headline, /Prerelease.*73 capabilities with retained scoped evidence/);
  assert.equal(changesSince(newest, publication, null), null);
  const view = releaseWorkView(newest.work);
  const text = recipeGuide(view).map(block => block.text).join('\n');
  assert.match(text, /Kamiwaza 1\.3\.5: recipes/);
  assert.match(text, /Prior recorded result/);
  assert.match(text, /not a fresh run on this target/);
  assert.match(text, /Ingredient glossary/);
  assert.equal(view.capabilities.filter(row => row.prereleaseCarried).length, 58);
  for (const row of view.capabilities.filter(row => row.prereleaseCarried)) assert.equal(verificationLabel(row), 'Prerelease verified — carried into 1.3.5');
  const withheld = view.capabilities.find(row => row.id === 'delegation.run-claims-lifecycle');
  assert.equal(withheld.prereleaseCarried, false);
  assert.match(verificationLabel(withheld), /current target blocked/);
  assert.match(text, /Target carry withheld:/);
  assert.match(text, /These overlapping counts are not additive/);
  const nativeOnly = view.capabilities.filter(row => row.prereleaseCarried && !row.historicalPrerelease);
  assert.equal(nativeOnly.length, 7);
  for (const row of nativeOnly) assert.match(prereleaseHistoryText(row), /Prerelease verified through native carry.*not listed in the original/);
  assert.match(prereleaseHistoryText({...nativeOnly[0], originalVersion:'1.3.5'}), /original 1\.3\.5 historical ledger/);
  assert.deepEqual(newest.work.retained.capabilities, JSON.parse(newest.work.retainedBytes).capabilities);
  assert.match(agentsMd('1.3.5', {targetWork:true}), /do not rename the original stamps, dates or build identities/);
  assert.match(agentsMd('1.3.5', {targetWork:true}), /carry for corrections not listed in prereleaseCarry remains pending/);
});

test('new target report pairs and retained historical reports both enter the complete work ZIP', t => {
  const out = mkdtempSync(join(tmpdir(), 'release-work-reports-'));
  t.after(() => rmSync(out, {recursive:true, force:true}));
  const reports = ['1.3.4', '1.3.5'].map(version => ({version, files: ['md', 'pdf'].map(extension => ({
    name:`verification-results/${version}-2026-10-26-synthetic/results.${extension}`,
    data:Buffer.from(`Synthetic ${version} test report; not product evidence. ${extension}`),
  }))}));
  emitBundles(publication, out);
  emitEvidence(publication, null, out, {}, null, null, loadReleaseCorpora({publication}), reports, loadReleaseWork({publication}));
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
  const work = index.versions.find(row => row.version === '1.3.5');
  assert.deepEqual(work.source.prereleaseCarry, source.releases[0].prereleaseCarry);
  const members = zipMembers(readFileSync(join(out, work.files.zip.path)));
  for (const file of reports.flatMap(report => report.files)) {
    assert.deepEqual(members.get(file.name), file.data);
    assert.ok(members.get('README.md').toString().includes(file.name));
    assert.ok(members.get('SHA256SUMS').toString().includes(file.name));
  }
  assert.match(members.get('README.md').toString(), /mirrors native prerelease carry at the cited Kit revision/);
  assert.doesNotMatch(members.get('README.md').toString(), /not test execution or carry approval/);
  const original = index.versions.find(row => row.version === '1.3.4');
  const originalMembers = zipMembers(readFileSync(join(out, original.files.zip.path)));
  for (const file of reports.flatMap(report => report.files)) assert.ok(!originalMembers.has(file.name));
});
