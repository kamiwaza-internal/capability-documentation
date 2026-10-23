import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadCurrentVerification, publishCurrentVerification, publishVerificationHistory} from '../scripts/current-verification.mjs';
import {recipeGuide, verificationLabel, verificationDocument} from '../src/verification-guide.mjs';
import {agentsMd} from '../src/evidence.mjs';
const source = JSON.parse(readFileSync(new URL('../static/verification-results/1.3.4-2026-10-22-markings/results.json', import.meta.url)));

test('current release status preserves historical evidence and rejects inconsistent credit', t => {
  const root = mkdtempSync(join(tmpdir(), 'current-verification-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const path = 'verification-results/1.3.4-2026-10-22-test/results.json';
  mkdirSync(join(root, 'site/static/verification-results/1.3.4-2026-10-22-test'), {recursive:true});
  const load = report => {
    const bytes = JSON.stringify(report);
    writeFileSync(join(root, 'site/static', path), bytes);
    return loadCurrentVerification(root, {path, sha256:createHash('sha256').update(bytes).digest('hex')});
  };
  const report = load(source);
  assert.equal(report.counts.acceptedScoped, 67);
  assert.equal(report.historicalPrerelease.length, 58);
  for (const mutate of [r => r.counts.acceptedScoped++, r => r.capabilities.push(r.capabilities[0]),
    r => r.capabilities[0].historicalPrerelease = false, r => r.capabilities[0].stampId = 'invented',
    r => r.capabilities[0].sourceCommit = '0'.repeat(40)]) {
    const bad = structuredClone(source); mutate(bad); assert.throws(() => load(bad));
  }
  assert.throws(() => loadCurrentVerification(root, {path, sha256:'0'.repeat(64)}), /digest mismatch/);
});

test('human guide links each recipe ingredient to current scoped status without promoting prerelease', () => {
  const blocks = recipeGuide(source);
  const text = blocks.map(b => b.text).join('\n');
  for (const heading of ['Recipe 1:', 'Ingredient glossary', 'tested scope and limits', 'Expected result']) assert.ok(text.includes(heading));
  for (const row of source.capabilities) assert.ok(text.includes(`Ingredient: ${row.id}`));
  assert.equal(verificationLabel({status:'not-release-verified', historicalPrerelease:true}), 'Prerelease verified — release acceptance pending');
  assert.ok(text.includes('not a completed release UI verification'));
  assert.ok(text.includes('67 of 87'));
  const agent = agentsMd('1.3.4');
  for (const phrase of ['Do not generate a vendor response', 'Release verified — carried forward', 'current-verification.json']) assert.ok(agent.includes(phrase));
});


test('detailed report preserves the explanation separating current OAuth proof from inherited limitations', () => {
  const row = source.capabilities.find(row => row.id === 'connectors.user-oauth-authorization');
  const text = verificationDocument(source).map(b => b.text).join('\n');
  assert.ok(text.includes(row.scopeNote));
  assert.ok(text.includes('Historical statements about missing release proof do not override'));
});

test('immutable current snapshots publish exact reviewed bytes independently of report pairs', t => {
  const root = mkdtempSync(join(tmpdir(), 'current-snapshot-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const path = 'current-verification/1.3.4/2026-10-23-reviewed.json';
  const folder = join(root, 'site/static/current-verification/1.3.4');
  mkdirSync(folder, {recursive:true});
  const bytes = JSON.stringify(source);
  writeFileSync(join(root, 'site/static', path), bytes);
  const binding = {path, sha256:createHash('sha256').update(bytes).digest('hex')};
  const out = join(root, 'build');
  assert.equal(loadCurrentVerification(root, binding).counts.acceptedScoped, 67);
  publishCurrentVerification(root, binding, out);
  assert.equal(readFileSync(join(out, path), 'utf8'), bytes);
  const old = 'current-verification/1.3.4/2026-10-22-reviewed.json';
  writeFileSync(join(root, 'site/static', old), bytes);
  publishVerificationHistory(root, out);
  assert.equal(readFileSync(join(out, old), 'utf8'), bytes);
  for (const path of ['current-verification/1.3.4/../../private.json', '/current-verification/1.3.4/2026-10-23-reviewed.json', 'unreviewed/1.3.4/2026-10-23-reviewed.json']) {
    assert.throws(() => publishCurrentVerification(root, {...binding, path}, out));
  }
  assert.throws(() => publishCurrentVerification(root, {...binding, sha256:'0'.repeat(64)}, out), /digest mismatch/);
  const wrongVersion = 'current-verification/1.4.0/2026-10-23-reviewed.json';
  mkdirSync(join(root, 'site/static/current-verification/1.4.0'), {recursive:true});
  writeFileSync(join(root, 'site/static', wrongVersion), bytes);
  assert.throws(() => publishCurrentVerification(root, {...binding, path:wrongVersion}, out), /path\/version mismatch/);
});


test('human glossary uses curated current scope while detailed evidence retains historical assumptions', () => {
  const report = structuredClone(source);
  const row = report.capabilities.find(row => row.id === 'kaizen.agent-packages');
  row.scopeNote = 'Live package journey passed; generic automatic routing is not verified.';
  row.assumptions = ['Historical unit tests did not execute a model.'];
  const human = recipeGuide(report).map(b => b.text).join('\n');
  assert.ok(human.includes(row.scopeNote));
  assert.ok(!human.includes(row.assumptions[0]));
  const detail = verificationDocument(report).map(b => b.text).join('\n');
  assert.ok(detail.includes(row.scopeNote));
  assert.ok(detail.includes(row.assumptions[0]));
});

test('accepted package publication adds exactly two IDs and retains historical rows and scope', () => {
  const root = new URL('../../', import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(join(root, 'site/data/release-corpora.json')));
  const bytes = readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-23-package-delegation.json'));
  const current = loadCurrentVerification(root, {path:'current-verification/1.3.4/2026-10-23-package-delegation.json',sha256:createHash('sha256').update(bytes).digest('hex')});
  const prior = new Set(source.capabilities.filter(row => row.status === 'accepted-scoped-release').map(row => row.id));
  const newlyAccepted = current.capabilities.filter(row => row.status === 'accepted-scoped-release' && !prior.has(row.id));
  assert.deepEqual(newlyAccepted.map(row => row.id).sort(), ['kaizen.agent-auto-routing', 'kaizen.agent-packages']);
  assert.equal(current.counts.acceptedScoped, 69);
  assert.equal(current.counts.remaining, 18);
  assert.deepEqual(current.historicalPrerelease, source.historicalPrerelease);
  for (const row of source.capabilities.filter(row => prior.has(row.id))) {
    assert.deepEqual(current.capabilities.find(item => item.id === row.id), row);
  }
  const guide = recipeGuide(current).map(row => row.text).join('\n');
  const detail = verificationDocument(current).map(row => row.text).join('\n');
  for (const row of newlyAccepted) {
    assert.ok(guide.includes(row.scopeNote));
    for (const assumption of row.assumptions) assert.ok(detail.includes(assumption));
  }
  assert.ok(guide.includes('69 of 87'));
  assert.ok(guide.includes('Explicitly delegate to a member-selected agent'));
  assert.ok(guide.includes('Create and use an approved guidance-only package'));
  assert.ok(!guide.includes('Automatic specialist help in chat, with member pin and exclude policy'));
  assert.ok(detail.includes('Automatic specialist help in chat, with member pin and exclude policy'));
  assert.ok(guide.includes('authenticated administrative API calls'));
});


test('sandbox acceptance adds one ID without changing prior evidence or historical entries', () => {
  const root = new URL('../../', import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(join(root, 'site/data/release-corpora.json')));
  const current = loadCurrentVerification(root, manifest.corpora[0].currentVerification);
  const prior = JSON.parse(readFileSync(join(root, 'site/static/current-verification/1.3.4/2026-10-23-package-delegation.json')));
  assert.equal(current.counts.acceptedScoped, 70);
  assert.equal(current.counts.remaining, 17);
  assert.deepEqual(current.historicalPrerelease, prior.historicalPrerelease);
  for (const row of prior.capabilities.filter(row => row.id !== 'apps.sandbox-workload-provider'))
    assert.deepEqual(current.capabilities.find(item => item.id === row.id), row);
  const sandbox = current.capabilities.find(row => row.id === 'apps.sandbox-workload-provider');
  assert.equal(sandbox.status, 'accepted-scoped-release');
  assert.equal(current.sourceKitCommit, 'd16f17521f8d7ad9a824c99c7e903f0a35938bcb');
  const guide = recipeGuide(current).map(row => row.text).join('\n');
  assert.ok(guide.includes('Run disposable workers with ready capacity'));
  assert.ok(guide.includes('standard shared-kernel containers'));
});


test('recipes start on new pages and end with scope, while every glossary status is explicit', () => {
  const blocks = recipeGuide(source);
  const starts = blocks.filter(b => b.type === 'h' && /^Recipe \d+:/.test(b.text));
  assert.ok(starts.length > 0);
  for (const [index, start] of starts.entries()) {
    assert.equal(start.pageBreakBefore, true);
    const end = blocks.findIndex(b => b.text === `End of recipe ${index + 1}: tested scope and limits`);
    assert.ok(end > blocks.indexOf(start));
    assert.ok(blocks[end + 1].text.length > 0);
  }
  const glossary = blocks.slice(blocks.findIndex(b => b.text === 'Ingredient glossary'));
  const statuses = glossary.filter(b => b.callout);
  assert.equal(statuses.length, source.capabilities.length);
  for (const [index, status] of statuses.entries()) {
    assert.equal(status.text, `**${verificationLabel(source.capabilities[index])}**`);
    assert.equal(status.tone, source.capabilities[index].status === 'accepted-scoped-release' ? 'green' : 'amber');
  }
});
