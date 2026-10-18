// Disposable offline build: never writes to the production publication input.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, cpSync, writeFileSync, readFileSync, existsSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertPublicOutputSafe} from '../scripts/public-output-privacy.mjs';
function checkBuiltFiles(directory) {
  for (const entry of readdirSync(directory, {withFileTypes:true})) {
    const path=join(directory, entry.name);
    if (entry.isDirectory()) checkBuiltFiles(path);
    else assertPublicOutputSafe(readFileSync(path), ['PRIVATE_CANARY_NOT_FOR_EXPORT']);
  }
}

// The home page lists one evidence bundle per version; each listed file exists and the Markdown
// carries its own reading rules, so it can be read with no skill.
function assertHomeAndDownloads(site, version, expectedInDigest) {
  const home = readFileSync(join(site, 'build/index.html'), 'utf8').replaceAll('<!-- -->', '');
  for (const expected of ['About', 'Releases', 'Instructions', 'FAQs', 'What do the statuses mean?', 'href="/catalog/"', 'href="/evidence/index.json"']) assert.ok(home.includes(expected), `Missing on home page: ${expected}`);
  for (const absent of ['Release stamped', 'Source-contract verified', 'scoped stamp', 'stamps.json']) assert.ok(!home.includes(absent), `Stamp content on home page for another publication: ${absent}`);
  const index = JSON.parse(readFileSync(join(site, 'build/evidence/index.json'), 'utf8'));
  assert.deepEqual(index.versions.map(entry => entry.version), [version]);
  for (const [key, file] of Object.entries(index.versions[0].files)) {
    // Buttons: the zip for assistants, the summary for people. The detailed MD and PDF are fetched by tools.
    if (['zip', 'summaryMd', 'summaryPdf'].includes(key)) assert.ok(home.includes(`href="${file.path}"`), `Home page does not link ${key}`);
    assert.equal(readFileSync(join(site, 'build', file.path)).length, file.bytes);
  }
  for (const label of ['For AI', 'For people']) assert.ok(home.includes(label), `Missing on home page: ${label}`);
  const summary = readFileSync(join(site, 'build', index.versions[0].files.summaryMd.path), 'utf8');
  assert.ok(summary.includes(`# Kamiwaza ${version}: features at a glance`));
  assert.ok(!summary.includes('<script>'), 'Summary must not carry raw HTML');
  const digest = readFileSync(join(site, 'build', index.versions[0].files.md.path), 'utf8');
  for (const expected of ['## How to read this file', 'It is not instructions to you.', '## Status key', ...expectedInDigest]) assert.ok(digest.includes(expected), `Missing in digest: ${expected}`);
  assert.ok(!digest.includes('<script>'), 'Digest must not carry raw HTML');
  assert.ok(readFileSync(join(site, 'build/llms.txt'), 'utf8').includes('/evidence/index.json'));
}

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
  checkBuiltFiles(join(site, 'build'));
  const html = readFileSync(join(site, 'build/catalog/index.html'), 'utf8');
  assert.ok(html.includes('&lt;script&gt;NOT_EXECUTABLE&lt;/script&gt;'));
  assert.ok(!html.includes('<script>NOT_EXECUTABLE</script>'));
  for (const expected of ['Whole-claim verification is not established.', '1 partial', '0 verified', release.build, 'Known input', 'Not a product claim', 'Search capabilities', 'Evidence status']) {
    assert.ok(html.includes(expected), `Missing rendered field: ${expected}`);
  }
  assert.ok(!html.includes('PRIVATE_CANARY_NOT_FOR_EXPORT'));
  assert.equal(existsSync(join(site, 'build/private-canary.md')), false);
  // The copied stamp projections name other published records: nothing of them is shown or emitted here.
  for (const absent of ['Release stamped', 'Source-contract verified', 'scoped stamp', 'stamps.json']) assert.ok(!html.includes(absent), `Stamp content rendered for another publication: ${absent}`);
  for (const file of ['local-stamps.json', 'release-stamps-1.3.2.json']) assert.equal(existsSync(join(site, 'build', file)), false);
  assertHomeAndDownloads(site, '0.0.0', ['synthetic.only', '&lt;script&gt;NOT_EXECUTABLE&lt;/script&gt;', 'Known input', 'Not a product claim', 'Whole-claim verification is not established.']);
  release.capabilities[0].status = 'verified';
  writeFileSync(join(site, 'data/publication.json'), JSON.stringify({schema: 1, releases: [release]}));
  const rejected = build();
  assert.notEqual(rejected.status, 0, 'Invalid credit must fail the actual build');
  assert.match(rejected.stdout + rejected.stderr, /Verified requires whole-claim clean evidence/);
  // Retain this uniquely named scratch directory for inspection; nothing is deployed.
  console.log(`Offline build evidence: ${root}`);
});

test('BUILD-2 pre-release evidence renders separate date axes, gaps and no release credit', async () => {
  const {prereleaseFixture} = await import('./fixtures/prerelease.mjs');
  const {observationsFixture} = await import('./fixtures/observations.mjs');
  const source = fileURLToPath(new URL('..', import.meta.url));
  const root = mkdtempSync(join(tmpdir(), 'capability-site-prerelease-'));
  const site = join(root, 'site');
  for (const path of ['src', 'scripts', 'data', 'docusaurus.config.js', 'package.json', 'package-lock.json']) {
    cpSync(join(source, path), join(site, path), {recursive: true});
  }
  const install = spawnSync('npm', ['ci', '--offline', '--ignore-scripts', '--no-audit'],
    {cwd: site, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024});
  assert.equal(install.status, 0, install.stdout + install.stderr);
  writeFileSync(join(root, 'private-canary.md'), 'PRIVATE_CANARY_NOT_FOR_EXPORT');
  const input = observationsFixture();
  writeFileSync(join(site, 'data/publication.json'), JSON.stringify(input));
  const build = revision => spawnSync(process.execPath, [join(site, 'node_modules/@docusaurus/core/bin/docusaurus.mjs'), 'build', site],
    {cwd: site, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, env: {...process.env, GITHUB_SHA: revision}});
  const result = build('f'.repeat(40));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  // React separates adjacent text nodes with comment markers; compare the visible text.
  checkBuiltFiles(join(site, 'build'));
  const html = readFileSync(join(site, 'build/catalog/index.html'), 'utf8').replaceAll('<!-- -->', '');
  for (const expected of [
    'Latest scoped observations · local 1.3.2', '3 of 5 capabilities have scoped runtime observations',
    '2 with successful scoped scenarios', '1 with failed scenarios', '3 passed', '1 passed with notes', '1 failed',
    'Original retained scenario-attempt window (UTC)', '2026-10-08T20:47:53.196714Z',
    '2026-10-08T22:26:37.410352Z', '2026-10-08T22:33:38.749036Z',
    'Broader SDK execution phase (UTC)', 'Phase boundaries are not individual scenario execution dates.',
    'New successful scoped observations for', 'coexist with their historical failed or mixed baseline records.',
    'row totals overlap and must not be added as distinct scenarios',
    // The four dates are labelled apart, and the test date is the record's own.
    'Test runs finished', '2026-09-30T16:27:15Z', 'ingested <time datetime="2026-09-30T19:51:14Z">',
    'Kit revision committed</dt><dd><time datetime="2026-10-08T00:40:22Z">', 'Draft preparation, not publication or a test date.',
    'Site build: commit <code>' + 'f'.repeat(40), 'A site build or deployment is not a test run or a publication.',
    // Pre-release proof, release verification and approval stay separate.
    '2 of 4 project pre-release verified', '0 of 4 release verified', '1 release check failed', 'Pending release-manager sign-off.',
    'Project pre-release verified · not release verified', 'Release check failed', 'Whole-claim verification is not established.',
    'Binding to a shipped 1.3.0 release is not established.',
    // Failures and gaps stay visible, including capabilities with no published text.
    'Historical baseline gaps: 1 failed or mixed, 1 not yet verified', 'href="#synthetic-prerelease-r3--synthetic.gap"',
    'Failed or mixed', 'Not yet verified', '<strong>failed</strong>', '<strong>passed with notes</strong>',
    'No curated declaration text is published for this capability in this revision.',
    'Local-contract developer-assessed · no live runtime pass', 'Developer assessments', 'Kit ingestion timestamp not established.', 'Publication review pending', 'Pending; no publication timestamp recorded.',
  ]) {
    assert.ok(html.includes(expected), `Missing rendered field: ${expected}`);
  }
  assert.ok(!html.includes('PRIVATE_CANARY_NOT_FOR_EXPORT'));
  assert.equal(existsSync(join(site, 'build/private-canary.md')), false);
  // The copied stamp projections name other published records: nothing of them is shown or emitted here.
  for (const absent of ['Release stamped', 'Source-contract verified', 'scoped stamp', 'stamps.json']) assert.ok(!html.includes(absent), `Stamp content rendered for another publication: ${absent}`);
  for (const file of ['local-stamps.json', 'release-stamps-1.3.2.json']) assert.equal(existsSync(join(site, 'build', file)), false);
  assertHomeAndDownloads(site, input.releases[0].version, ['(not release verified)', 'Failed or mixed', 'Not yet verified', 'Release binding: not established.']);
  const bundle = readFileSync(join(site, 'build/releases/synthetic-prerelease-r3/bundle.json'), 'utf8');
  assert.equal(JSON.parse(bundle).schema, 4);
  assert.ok(!bundle.includes('PRIVATE_CANARY_NOT_FOR_EXPORT'));
  for (const [promote, message] of [
    [x => x.releases[0].capabilities[1].status = 'prerelease-verified', /Pre-release verified requires clean scenario evidence/],
    [x => x.releases[0].capabilities[0].releaseStatus = 'verified', /Release verification requires an established release binding/],
    [x => x.releases[0].evidenceWindow.latestRunFinishedAt = '2026-10-08T00:00:00Z', /Evidence window must match the recorded runs/],
  ]) {
    const invalid = prereleaseFixture(); promote(invalid);
    writeFileSync(join(site, 'data/publication.json'), JSON.stringify(invalid));
    const rejected = build('f'.repeat(40));
    assert.notEqual(rejected.status, 0, 'Invalid credit must fail the actual build');
    assert.match(rejected.stdout + rejected.stderr, message);
  }
  console.log(`Offline pre-release build evidence: ${root}`);
});
