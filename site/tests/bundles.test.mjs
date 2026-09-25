import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {emitBundles} from '../scripts/published-bundles.mjs';
import {validatePublication} from '../scripts/publication.mjs';

const fixture = () => ({schema: 2, releases: [{
  id: 'synthetic-r1', version: '1.3.0', channel: 'development', approval: {status: 'pending', approvedBy: null, approvedAt: null},
  build: '1.3.0; source only', sourceRevision: 'a'.repeat(40), publicationRevision: 1,
  publishedAt: '2026-09-25T00:00:00Z',
  reviewReference: 'https://github.com/kamiwaza-internal/capability-documentation/pull/3',
  baselineKind: 'source-declaration', releaseBinding: 'not-established', omittedCapabilities: ['omitted.one'],
  capabilities: [{id: 'synthetic.one', title: 'Synthetic', distribution: 'public',
    summary: 'read', conditions: ['auth'], limits: ['no writes'], status: 'untested', wholeClaim: false, evidence: [],
    declaration: {documentSha256: 'b'.repeat(64), basis: 'curated-source-review', scope: 'Source only',
      mechanicalValidation: 'Members not extracted', citations: [{repo: 'example', path: 'api.py', symbol: 'route', kind: 'route-table', closed: false, read_at: 'c'.repeat(40)}]}}],
}]});

test('bundle matches index digest, retains limits and omitted IDs', () => {
  const out = mkdtempSync(join(tmpdir(), 'publication-bundle-'));
  const input = fixture(); emitBundles(input, out);
  const index = JSON.parse(readFileSync(join(out, 'releases/index.json')));
  const bytes = readFileSync(join(out, index.releases[0].bundle));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), index.releases[0].sha256);
  assert.deepEqual(JSON.parse(bytes), input);
  assert.match(readFileSync(join(out, 'releases/synthetic-r1/bundle.md'), 'utf8'), /no writes/);
});

for (const [name, change] of [
  ['runtime promotion', r => r.capabilities[0].status = 'verified'],
  ['released binding', r => r.releaseBinding = 'released'],
  ['missing citations', r => r.capabilities[0].declaration.citations = []],
  ['floating revision', r => r.capabilities[0].declaration.citations[0].read_at = 'main'],
  ['overlap', r => r.omittedCapabilities.push('synthetic.one')],
  ['raw log', r => r.capabilities[0].declaration.rawLog = 'PRIVATE'],
]) test('rejects ' + name, () => {
  const input = fixture(); change(input.releases[0]);
  assert.throws(() => validatePublication(input));
});
