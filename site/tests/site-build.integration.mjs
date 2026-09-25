// Disposable offline build: never writes to the production publication input.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, cpSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('BUILD-1 real static build renders public claims safely and excludes sibling private files', () => {
  const source = fileURLToPath(new URL('..', import.meta.url));
  const root = mkdtempSync(join(tmpdir(), 'capability-site-integration-'));
  const site = join(root, 'site');
  for (const path of ['src', 'scripts', 'data', 'docusaurus.config.js', 'package.json', 'package-lock.json']) {
    cpSync(join(source, path), join(site, path), {recursive: true});
  }
  // A shared node_modules symlink can resolve Docusaurus back to the original site.
  const install = spawnSync('npm', ['ci', '--offline', '--ignore-scripts', '--no-audit'],
    {cwd: site, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024});
  assert.equal(install.status, 0, install.stdout + install.stderr);
  writeFileSync(join(root, 'private-canary.md'), 'PRIVATE_CANARY_NOT_FOR_EXPORT');
  const release = {
    id: 'synthetic-development-r1', version: '0.0.0', channel: 'development', approval: {status: 'pending', approvedBy: null, approvedAt: null},
    build: '0.0.0; core=' + 'a'.repeat(40), sourceRevision: 'b'.repeat(40),
    publicationRevision: 1, publishedAt: '2026-09-21T00:00:00Z',
    reviewReference: 'https://github.com/kamiwaza-internal/capability-documentation/pull/1',
    capabilities: [{id: 'synthetic.only', title: '<script>NOT_EXECUTABLE</script>',
      distribution: 'public', summary: 'Synthetic integration input; not evidence.',
      conditions: ['Known input'], limits: ['Not a product claim'],
      status: 'partial', wholeClaim: false, evidence: []}],
  };
  writeFileSync(join(site, 'data/publication.json'), JSON.stringify({schema: 1, releases: [release]}));
  const build = () => spawnSync(process.execPath, [join(site, 'node_modules/@docusaurus/core/bin/docusaurus.mjs'), 'build', site],
    {cwd: site, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024});
  const result = build();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const html = readFileSync(join(site, 'build/index.html'), 'utf8');
  assert.ok(html.includes('&lt;script&gt;NOT_EXECUTABLE&lt;/script&gt;'));
  assert.ok(!html.includes('<script>NOT_EXECUTABLE</script>'));
  for (const expected of ['Whole-claim verification is not established.', '1 partial', '0 verified', release.build, 'Known input', 'Not a product claim', 'Search capabilities', 'Evidence status']) {
    assert.ok(html.includes(expected), `Missing rendered field: ${expected}`);
  }
  assert.ok(!html.includes('PRIVATE_CANARY_NOT_FOR_EXPORT'));
  assert.equal(existsSync(join(site, 'build/private-canary.md')), false);
  release.capabilities[0].status = 'verified';
  writeFileSync(join(site, 'data/publication.json'), JSON.stringify({schema: 1, releases: [release]}));
  const rejected = build();
  assert.notEqual(rejected.status, 0, 'Invalid credit must fail the actual build');
  assert.match(rejected.stdout + rejected.stderr, /Verified requires whole-claim clean evidence/);
  // Retain this uniquely named scratch directory for inspection; nothing is deployed.
  console.log(`Offline build evidence: ${root}`);
});
