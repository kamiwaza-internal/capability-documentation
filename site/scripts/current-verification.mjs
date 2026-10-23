import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';

// Match the producer's sorted JSON digest; the embedded stamp remains independently inspectable.
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');

function validateReleaseLine(row, report) {
  const binding = row.releaseLine;
  assert.ok(binding, 'Different Core source requires an explicit release-line binding');
  assert.match(binding.ref ?? '', /^release\/\d+\.\d+\.\d+$/);
  const branch = binding.ref.slice('release/'.length).split('.').map(Number);
  const target = report.version.split('.').map(Number);
  assert.ok(branch[0] === target[0] && branch[1] === target[1] && branch[2] <= target[2],
    'Release branch must match the target major/minor and not exceed its patch');
  assert.equal(binding.sourceKitCommit, report.sourceKitCommit);
  assert.match(binding.reviewReference ?? '', /^https:\/\/github\.com\/kamiwaza-internal\/capability-kit\/pull\/\d+$/);
  const stamp = binding.stamp;
  assert.equal(stamp?.schema, 'capability-release-stamp.v1');
  const {id, ...payload} = stamp;
  assert.equal(digest(payload), id, 'Release-line stamp ID mismatch');
  assert.equal(digest(stamp), row.sourceStampSha256, 'Release-line source stamp digest mismatch');
  assert.equal(id, row.stampId);
  assert.equal(stamp.target_release, report.version);
  assert.equal(stamp.capability, row.id);
  assert.equal(stamp.release_source.repository, 'kamiwaza-internal/kamiwaza');
  assert.equal(stamp.release_source.ref, binding.ref);
  assert.equal(stamp.release_source.source_commit, row.sourceCommit);
  assert.equal(stamp.release_source.source_commit_basis, row.sourceBasis);
  assert.equal(stamp.manifest_id, 'sha256:' + row.manifestId);
  assert.equal(stamp.finished_at, row.finishedAt);
  assert.deepEqual(stamp.replayed_kits, row.kits);
  assert.deepEqual(stamp.assumptions, row.assumptions);
  assert.deepEqual(stamp.limits, row.limits);
}

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
      assert.match(row.sourceCommit ?? '', /^[a-f0-9]{40}$/);
      if (row.releaseLine || row.sourceCommit !== report.sourceCoreCommit) validateReleaseLine(row, report);
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
