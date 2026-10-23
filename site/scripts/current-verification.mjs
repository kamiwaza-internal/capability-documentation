import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';

// A reviewed pointer, not 'newest filename wins'. Historical source bytes stay unchanged.
export function loadCurrentVerification(root, binding) {
  const pathVersion = binding.path.match(/^(?:verification-results\/(\d+\.\d+\.\d+)-[a-z0-9-]+\/results|current-verification\/(\d+\.\d+\.\d+)\/\d{4}-\d{2}-\d{2}(?:-[a-z0-9]+)+)\.json$/);
  assert.ok(pathVersion, 'Invalid current verification path');
  const bytes = readFileSync(join(root, 'site/static', binding.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), binding.sha256, 'Current verification digest mismatch');
  const report = JSON.parse(bytes);
  assert.equal(report.schema, 'verification-results-report.v1');
  assert.equal(report.version, pathVersion[1] ?? pathVersion[2], 'Current verification path/version mismatch');
  assert.equal(report.humanReleaseApproval, false);
  assert.match(report.sourceKitCommit, /^[a-f0-9]{40}$/);
  assert.match(report.sourceCoreCommit, /^[a-f0-9]{40}$/);
  const caps = report.capabilities, historical = report.historicalPrerelease;
  assert.equal(new Set(caps.map(row => row.id)).size, caps.length);
  assert.equal(new Set(historical.map(row => row.id)).size, historical.length);
  const past = new Set(historical.map(row => row.id));
  for (const row of caps) {
    assert.ok(['accepted-scoped-release', 'not-release-verified'].includes(row.status));
    assert.equal(row.historicalPrerelease, past.has(row.id));
    if (row.status === 'accepted-scoped-release') {
      for (const key of ['stampId', 'sourceStampSha256', 'manifestId']) assert.match(row[key], /^[a-f0-9]{64}$/);
      assert.equal(row.sourceCommit, report.sourceCoreCommit);
      assert.ok(row.kits.length && Array.isArray(row.assumptions) && Array.isArray(row.limits));
    } else assert.ok(row.gap);
  }
  const accepted = caps.filter(row => row.status === 'accepted-scoped-release');
  assert.deepEqual(report.counts, {included: caps.length, acceptedScoped: accepted.length,
    remaining: caps.length - accepted.length, historicalPrerelease: historical.length,
    historicalInScope: caps.filter(row => past.has(row.id)).length,
    historicalOutsideScope: historical.filter(row => !caps.some(cap => cap.id === row.id)).length,
    historicalAlsoReleaseAccepted: accepted.filter(row => past.has(row.id)).length});
  assertPublicOutputSafe(bytes);
  return {...report, sourcePath: '/' + binding.path, sourceSha256: binding.sha256};
}

// Publish only the reviewed binding; staticDirectories remains disabled.
export function publishCurrentVerification(root, binding, out) {
  const report = loadCurrentVerification(root, binding);
  const bytes = readFileSync(join(root, 'site/static', binding.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), report.sourceSha256);
  const destination = join(out, binding.path);
  mkdirSync(dirname(destination), {recursive: true});
  writeFileSync(destination, bytes);
}

// This append-only public namespace retains earlier reviewed snapshot URLs.
export function publishVerificationHistory(root, out) {
  const folder = join(root, 'site/static/current-verification');
  if (!existsSync(folder)) return;
  for (const version of readdirSync(folder, {withFileTypes:true})) {
    if (!version.isDirectory() || !/^\d+\.\d+\.\d+$/.test(version.name)) continue;
    for (const file of readdirSync(join(folder, version.name), {withFileTypes:true})) {
      if (!file.isFile() || !/^\d{4}-\d{2}-\d{2}(?:-[a-z0-9]+)+\.json$/.test(file.name)) continue;
      const path = `current-verification/${version.name}/${file.name}`;
      const sha256 = createHash('sha256').update(readFileSync(join(root, 'site/static', path))).digest('hex');
      publishCurrentVerification(root, {path, sha256}, out);
    }
  }
}
