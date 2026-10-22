import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadCurrentVerification} from '../scripts/current-verification.mjs';
import {recipeGuide, verificationLabel} from '../src/verification-guide.mjs';
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
  for (const heading of ['Recipes', 'Ingredient glossary', 'What was tested', 'Expected result']) assert.ok(text.includes(heading));
  for (const row of source.capabilities) assert.ok(text.includes(`Ingredient: ${row.id}`));
  assert.equal(verificationLabel({status:'not-release-verified', historicalPrerelease:true}), 'Prerelease verified — release acceptance pending');
  assert.ok(text.includes('not a completed release UI verification'));
  assert.ok(text.includes('67 of 87'));
  const agent = agentsMd('1.3.4');
  for (const phrase of ['Do not generate a vendor response', 'Release verified — carried forward', 'current-verification.json']) assert.ok(agent.includes(phrase));
});
