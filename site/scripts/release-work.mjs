import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCurrentVerification} from './current-verification.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const keys = (row, fields) => assert.deepEqual(Object.keys(row).sort(), [...fields].sort());

// A target-work view references prior evidence; it never retargets a stamp or grants carry credit.
export function loadReleaseWork({repo = root, publication} = {}) {
  const path = join(repo, 'site/data/release-work.json');
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path));
  keys(data, ['schema', 'releases']);
  assert.equal(data.schema, 'release-verification-work.v1');
  assert.ok(Array.isArray(data.releases));
  assert.equal(new Set(data.releases.map(row => row.version)).size, data.releases.length);
  return data.releases.map(row => {
    keys(row, ['version', 'channel', 'sourceBranch', 'originalVersion', 'originalReplayId', 'retainedVerification']);
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
    return {...row, retained, retainedBytes:readFileSync(join(repo, 'site/static', row.retainedVerification.path))};
  });
}
