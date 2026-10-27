import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, realpathSync, readFileSync} from 'node:fs';
import {join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateFreshAgentRelease} from './publication.mjs';
import {loadCurrentVerification} from './current-verification.mjs';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const keys = (row, fields) => assert.deepEqual(Object.keys(row).sort(), [...fields].sort());

function loadFreshProjection(repo, binding, target, retained, publication) {
  keys(binding, ['path', 'sha256', 'sourceKitCommit', 'releaseId', 'reviewReference']);
  assert.match(binding.path, /^fresh-projections\/[a-zA-Z0-9._/-]+\.json$/);
  assert.ok(!binding.path.split('/').includes('..'), 'Projection path must remain in static sources');
  assert.match(binding.sha256, /^[a-f0-9]{64}$/);
  assert.match(binding.sourceKitCommit, /^[a-f0-9]{40}$/);
  assert.match(binding.reviewReference, /^https:\/\/github\.com\/kamiwaza-internal\/capability-documentation\/pull\/[1-9]\d*$/);
  const file = join(repo, 'site/static', binding.path);
  assert.ok(lstatSync(file).isFile(), 'Projection must be a regular file');
  assert.ok(realpathSync(file).startsWith(realpathSync(join(repo, 'site/static')) + sep + 'fresh-projections' + sep), 'Projection must remain in static fresh-projections');
  const bytes = readFileSync(file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), binding.sha256, 'Fresh projection digest mismatch');
  assertPublicOutputSafe(bytes);
  const container = JSON.parse(bytes);
  assertPublicOutputSafe(JSON.stringify(container));
  keys(container, ['schema', 'releases']);
  assert.ok([2, 4].includes(container.schema), 'Expected native prerelease projection container');
  assert.ok(Array.isArray(container.releases));
  assert.equal(new Set(container.releases.map(row => row.id)).size, container.releases.length, 'Duplicate projection release');
  for (const prior of container.releases.filter(row => row.id !== binding.releaseId)) {
    const known = publication.releases.find(row => row.id === prior.id);
    assert.ok(known, 'Unreviewed projection history');
    assert.deepEqual(prior, known, 'Projection cannot rewrite published history');
  }
  const release = container.releases.find(row => row.id === binding.releaseId);
  assert.ok(release, 'Selected fresh projection is absent');
  assert.equal(container.releases.at(-1), release, 'Current projection must be the final native revision');
  assert.equal(release.id, `${target}-prerelease-r${release.publicationRevision}`, 'Native projection identity mismatch');
  assert.equal(release.version, target, 'Fresh projection target mismatch');
  assert.equal(release.sourceRevision, binding.sourceKitCommit, 'Fresh projection source mismatch');
  validateFreshAgentRelease(release);
  assert.deepEqual(release.capabilities.map(row => row.id).sort(), retained.capabilities.map(row => row.id).sort(), 'Fresh projection must cover the complete ingredient inventory');
  return {release, bytes};
}

// A target-work view references prior evidence; it never retargets a stamp or grants carry credit.
export function loadReleaseWork({repo = root, publication} = {}) {
  const path = join(repo, 'site/data/release-work.json');
  if (!existsSync(path)) return [];
  const bytes = readFileSync(path);
  assertPublicOutputSafe(bytes);
  const data = JSON.parse(bytes);
  keys(data, ['schema', 'releases']);
  assert.equal(data.schema, 'release-verification-work.v1');
  assert.ok(Array.isArray(data.releases));
  assert.equal(new Set(data.releases.map(row => row.version)).size, data.releases.length);
  return data.releases.map(row => {
    keys(row, ['version', 'channel', 'sourceBranch', 'originalVersion', 'originalReplayId', 'retainedVerification', 'prereleaseCarry', ...(Object.hasOwn(row, 'freshProjection') ? ['freshProjection'] : [])]);
    assert.match(row.version, /^\d+\.\d+\.\d+$/);
    assert.equal(row.channel, 'prerelease');
    assert.match(row.sourceBranch, /^release\/\d+\.\d+\.\d+$/);
    assert.equal(row.version.split('.').slice(0, 2).join('.'), row.sourceBranch.slice(8).split('.').slice(0, 2).join('.'));
    assert.ok(row.version.localeCompare(row.originalVersion, undefined, {numeric:true}) > 0);
    keys(row.retainedVerification, ['path', 'sha256']);
    const retained = loadCurrentVerification(repo, row.retainedVerification);
    assert.equal(retained.version, row.originalVersion, 'Prior evidence keeps its original version');
    const original = publication.releaseStamps?.find(record => record.id === row.originalReplayId);
    assert.equal(original?.version, row.originalVersion, 'Original release replay must exist');
    assert.equal(original.source.ref, `v${row.originalVersion}`);
    assert.equal(original.source.sourceRevision, retained.sourceCoreCommit);
    const carry = row.prereleaseCarry;
    keys(carry, ['sourceKitCommit', 'reviewReference', 'capabilityIds', 'withheld']);
    assert.match(carry.sourceKitCommit, /^[a-f0-9]{40}$/);
    assert.match(carry.reviewReference, /^https:\/\/github\.com\/kamiwaza-internal\/capability-kit\/pull\/\d+$/);
    assert.ok(Array.isArray(carry.capabilityIds));
    assert.equal(new Set(carry.capabilityIds).size, carry.capabilityIds.length);
    assert.ok(carry.capabilityIds.every(id => retained.capabilities.some(cap => cap.id === id)));
    assert.ok(Array.isArray(carry.withheld));
    assert.equal(new Set(carry.withheld.map(cap => cap.id)).size, carry.withheld.length);
    for (const cap of carry.withheld) {
      keys(cap, ['id', 'reason']);
      assert.ok(retained.capabilities.some(row => row.id === cap.id), 'Withheld capability must exist');
      assert.ok(!carry.capabilityIds.includes(cap.id), 'Withheld capability cannot receive carry credit');
      assert.ok(typeof cap.reason === 'string' && cap.reason.trim());
    }
    const fresh = row.freshProjection ? loadFreshProjection(repo, row.freshProjection, row.version, retained, publication) : null;
    return {...row, ...(fresh ? {fresh} : {}), retained, retainedBytes:readFileSync(join(repo, 'site/static', row.retainedVerification.path))};
  });
}

// Build-time archive bytes belong in downloads, never in browser configuration.
export function releaseWorkSiteData({retainedBytes, fresh, ...row}) {
  return {...row, ...(fresh ? {fresh:{release:fresh.release}} : {})};
}
