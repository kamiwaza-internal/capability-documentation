import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCurrentVerification} from './current-verification.mjs';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const keys = (row, fields) => assert.deepEqual(Object.keys(row).sort(), [...fields].sort());

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
    keys(row, ['version', 'channel', 'sourceBranch', 'originalVersion', 'originalReplayId', 'retainedVerification', 'prereleaseCarry']);
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
      assert.ok(retained.capabilities.some(row => row.id === cap.id) && !carry.capabilityIds.includes(cap.id));
      assert.ok(typeof cap.reason === 'string' && cap.reason.trim());
    }
    return {...row, retained, retainedBytes:readFileSync(join(repo, 'site/static', row.retainedVerification.path))};
  });
}
