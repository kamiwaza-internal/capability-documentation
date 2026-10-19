import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateReleaseStamps} from './release-stamps.mjs';
import {sha256} from './release-corpora.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

// A registered sidecar is a required input. If a publication change makes it
// inapplicable, the build fails until the registry is deliberately reviewed.
export function loadReleaseSidecars({repo = root, publication}) {
  const registry = JSON.parse(readFileSync(join(repo, 'site/data/release-sidecars.json')));
  assert.deepEqual(Object.keys(registry).sort(), ['schema', 'sidecars']);
  assert.equal(registry.schema, 'public-release-sidecars.v1');
  assert.ok(Array.isArray(registry.sidecars));
  assert.ok(registry.sidecars.length <= 1,
    'multiple release sidecars need an explicit multi-version evidence implementation');
  const seen = new Set();
  return registry.sidecars.map(row => {
    assert.deepEqual(Object.keys(row).sort(), ['file', 'sha256']);
    assert.match(row.file, /^release-stamps-\d+\.\d+\.\d+\.json$/);
    assert.ok(!seen.has(row.file), 'duplicate release sidecar');
    seen.add(row.file);
    assert.match(row.sha256, /^[a-f0-9]{64}$/);
    const bytes = readFileSync(join(repo, 'site/data', row.file));
    assert.equal(sha256(bytes), row.sha256, `${row.file} changed without registry review`);
    const data = JSON.parse(bytes);
    assert.ok(validateReleaseStamps(data, publication) !== null,
      `${row.file} is registered but not applicable to this publication`);
    assert.equal(row.file, `release-stamps-${data.targetRelease}.json`);
    return {file: row.file, bytes, data};
  });
}
