import assert from 'node:assert/strict';
import test from 'node:test';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkReleaseCorpusBuild, zipMembers} from '../scripts/check-release-corpus.mjs';
import {loadReleaseCorpora, sha256} from '../scripts/release-corpora.mjs';
import {toZip} from '../scripts/evidence-files.mjs';
import {emitBundles, emitEvidence} from '../scripts/published-bundles.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const publication = JSON.parse(readFileSync(join(root, 'site/data/publication.json')));
const stamps = JSON.parse(readFileSync(join(root, 'site/data/release-stamps-1.3.2.json')));
const descriptions = JSON.parse(readFileSync(join(root, 'site/data/descriptions.json'))).descriptions;
const guidance = JSON.parse(readFileSync(join(root, 'site/data/sales-guidance.json')));
const streams = JSON.parse(readFileSync(join(root, 'site/data/value-streams.json')));
const fixtureHome = index => `<section aria-labelledby="releases"><ul class="releaseList">${index.versions.map(entry => {
  const replay = (publication.releaseStamps ?? []).filter(row => row.version === entry.version)
    .sort((a, b) => b.publicationRevision - a.publicationRevision)[0];
  return `<li class="releaseRow"><span class="releaseVersion">${entry.version}</span>${replay
    ? `<span>${replay.counts.releaseStamped} of ${replay.counts.included} included capabilities; ${replay.counts.failed} failed selections; ${replay.counts.notStamped} not stamped; Human release sign-off: ${replay.approval.status}</span>`
    : ''}<nav class="fileGroup" aria-label="For AI, ${entry.version}"><a href="${entry.files.zip.path}" download="">ZIP</a></nav><nav class="fileGroup" aria-label="For people, ${entry.version}"><a href="${entry.files.salesPdf.path}" download="">PDF</a><a href="${entry.files.salesMd.path}" download="">MD</a></nav></li>`;
}).join('')}</ul></section>`;

test('site workflow runs the consistency check after the production build', () => {
  const workflow = readFileSync(join(root, '.github/workflows/site.yml'), 'utf8');
  const buildAt = workflow.indexOf('run: npm run build');
  const checkAt = workflow.indexOf('run: npm run check:release-corpus');
  const uploadAt = workflow.indexOf('uses: actions/upload-pages-artifact');
  assert.ok(buildAt >= 0 && checkAt > buildAt && uploadAt > checkAt);
});

test('every public corpus emits matching detailed MD, PDF, ZIP, manifest, digests and home links', () => {
  const out = mkdtempSync(join(tmpdir(), 'release-corpus-bundle-'));
  emitBundles(publication, out);
  writeFileSync(join(out, 'release-stamps-1.3.2.json'), readFileSync(join(root, 'site/data/release-stamps-1.3.2.json')));
  emitEvidence(publication, stamps, out, descriptions, guidance, streams, loadReleaseCorpora({publication}));
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
  const entry = index.versions.find(row => row.version === '1.3.4');
  assert.equal(entry.kind, 'release-corpus');
  const prior = mkdtempSync(join(tmpdir(), 'release-corpus-historical-'));
  emitBundles(publication, prior);
  writeFileSync(join(prior, 'release-stamps-1.3.2.json'), readFileSync(join(root, 'site/data/release-stamps-1.3.2.json')));
  emitEvidence(publication, stamps, prior, descriptions, guidance, streams);
  for (const historical of index.versions.filter(row => row.version !== '1.3.4')) {
    for (const file of Object.values(historical.files)) assert.deepEqual(readFileSync(join(out, file.path)),
      readFileSync(join(prior, file.path)), `historical download ${file.path} must retain its bytes`);
  }
  assert.deepEqual(readFileSync(join(out, 'releases/index.json')), readFileSync(join(prior, 'releases/index.json')));
  const homePath = join(out, 'index.html'), validHome = fixtureHome(index);
  writeFileSync(homePath, validHome);
  assert.equal(checkReleaseCorpusBuild({out}), 1);
  for (const [changed, reason] of [
    [validHome.replace(entry.files.salesPdf.path, entry.files.summaryPdf.path), /three downloads/],
    [validHome.replace('For AI, 1.3.4', 'For assistants, 1.3.4'), /download group labels/],
    [validHome.replace('6 failed selections', '0 failed selections'), /failures, gaps and approval/],
    [validHome + '<h2>Release build verification</h2>', /second release section/],
  ]) {
    writeFileSync(homePath, changed);
    assert.throws(() => checkReleaseCorpusBuild({out}), reason);
  }
  writeFileSync(homePath, validHome);
  const members = zipMembers(readFileSync(join(out, entry.files.zip.path)));
  assert.deepEqual(members.get('machine-readable/release-corpus-catalog.json'), readFileSync(join(root, 'corpus/1.3.4/catalog.json')));
  assert.deepEqual(members.get('human-readable/' + entry.files.md.path.split('/').at(-1)), readFileSync(join(out, entry.files.md.path)));
  assert.match(members.get('human-readable/' + entry.files.md.path.split('/').at(-1)).toString(), /Distinct pre-release credits \| 6/);
  assert.match(members.get('human-readable/' + entry.files.md.path.split('/').at(-1)).toString(), /Scoped release stamps \| 30/);
  assert.match(members.get('human-readable/' + entry.files.md.path.split('/').at(-1)).toString(), /Human release approval: not established/);
  for (const file of ['md', 'pdf', 'zip']) {
    const path = join(out, entry.files[file].path);
    const valid = readFileSync(path);
    rmSync(path);
    assert.throws(() => checkReleaseCorpusBuild({out}), `missing ${file} must fail`);
    writeFileSync(path, valid);
    const corrupt = Buffer.from(valid); corrupt[0] ^= 1; writeFileSync(path, corrupt);
    assert.throws(() => checkReleaseCorpusBuild({out}), `stale ${file} must fail`);
    writeFileSync(path, valid);
  }
  const indexPath = join(out, 'evidence/index.json'), zipPath = join(out, entry.files.zip.path);
  const validZip = readFileSync(zipPath);
  for (const [mutate, reason] of [
    [row => row.source.humanReleaseApproval = 'approved', /corpus source binding/],
    [row => row.files.zip.sha256 = 'f'.repeat(64), /built file digest zip/],
    [row => row.files.zip.bytes++, /built file bytes zip/],
  ]) {
    const changed = structuredClone(index);
    mutate(changed.versions.find(row => row.version === entry.version));
    writeFileSync(indexPath, JSON.stringify(changed));
    assert.throws(() => checkReleaseCorpusBuild({out}), reason);
    writeFileSync(indexPath, JSON.stringify(index));
  }
  for (const [mutate, reason] of [
    [files => files.delete('AGENTS.md'), /missing AGENTS.md/],
    [files => files.set('machine-readable/release-corpus-catalog.json', Buffer.from('{}')), /ZIP catalog must match reviewed corpus/],
    [files => files.set('SHA256SUMS', Buffer.from('invalid checksums\n')), /checksums must cover every other member/],
  ]) {
    const files = new Map(members);
    mutate(files);
    const changedZip = toZip([...files].map(([name, data]) => ({name, data})));
    const changed = structuredClone(index), row = changed.versions.find(row => row.version === entry.version);
    row.files.zip.sha256 = sha256(changedZip); row.files.zip.bytes = changedZip.length;
    writeFileSync(zipPath, changedZip); writeFileSync(indexPath, JSON.stringify(changed));
    assert.throws(() => checkReleaseCorpusBuild({out}), reason);
    writeFileSync(zipPath, validZip); writeFileSync(indexPath, JSON.stringify(index));
  }
  assert.equal(checkReleaseCorpusBuild({out}), 1);
});

test('source discovery and pinning refuse incomplete, changed or extra corpora', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'release-corpus-source-'));
  mkdirSync(join(temporary, 'site/data'), {recursive: true});
  mkdirSync(join(temporary, 'corpus/1.3.4'), {recursive: true});
  cpSync(join(root, 'site/data/release-corpora.json'), join(temporary, 'site/data/release-corpora.json'));
  cpSync(join(root, 'corpus/1.3.4/catalog.json'), join(temporary, 'corpus/1.3.4/catalog.json'));
  const source = join(temporary, 'corpus/1.3.4/catalog.json');
  assert.equal(loadReleaseCorpora({root: temporary, publication}).length, 1);
  const original = readFileSync(source);
  writeFileSync(source, Buffer.concat([original, Buffer.from(' ')]));
  assert.throws(() => loadReleaseCorpora({root: temporary, publication}), /changed without manifest review/);
  writeFileSync(source, original);
  rmSync(source);
  assert.throws(() => loadReleaseCorpora({root: temporary, publication}));
  writeFileSync(source, original);
  mkdirSync(join(temporary, 'corpus/1.3.5'));
  assert.throws(() => loadReleaseCorpora({root: temporary, publication}), /every corpus directory/);
  const oldManifest = loadReleaseCorpora({publication})[0].manifestBytes;
  const future = JSON.parse(original);
  future.release = '1.3.5'; future.pins.productTag = 'v1.3.5';
  const futureBytes = Buffer.from(JSON.stringify(future) + '\n');
  writeFileSync(join(temporary, 'corpus/1.3.5/catalog.json'), futureBytes);
  const registry = JSON.parse(readFileSync(join(temporary, 'site/data/release-corpora.json')));
  registry.corpora.push({...registry.corpora[0], version: '1.3.5', productTag: 'v1.3.5', sha256: sha256(futureBytes)});
  writeFileSync(join(temporary, 'site/data/release-corpora.json'), JSON.stringify(registry));
  const withFuture = loadReleaseCorpora({root: temporary, publication});
  assert.equal(withFuture.length, 2);
  assert.deepEqual(withFuture[0].manifestBytes, oldManifest, 'adding a future corpus must not rewrite this version\'s ZIP manifest');
});

test('production validation rejects altered counts, pins and private fields even with refreshed source SHA', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'release-corpus-invalid-'));
  mkdirSync(join(temporary, 'site/data'), {recursive: true});
  mkdirSync(join(temporary, 'corpus/1.3.4'), {recursive: true});
  const source = JSON.parse(readFileSync(join(root, 'corpus/1.3.4/catalog.json')));
  const manifest = JSON.parse(readFileSync(join(root, 'site/data/release-corpora.json')));
  const check = (mutate, pattern) => {
    const changed = structuredClone(source), pin = structuredClone(manifest);
    mutate(changed, pin);
    const bytes = Buffer.from(JSON.stringify(changed));
    pin.corpora[0].sha256 = sha256(bytes);
    writeFileSync(join(temporary, 'corpus/1.3.4/catalog.json'), bytes);
    writeFileSync(join(temporary, 'site/data/release-corpora.json'), JSON.stringify(pin));
    assert.throws(() => loadReleaseCorpora({root: temporary, publication}), pattern);
  };
  check(corpus => corpus.counts.distinctPrereleaseCredits++, /counts differ from manifest|Expected values to be strictly equal/);
  check(corpus => corpus.pins.productCoreCommit = 'a'.repeat(40), /differs from manifest/);
  check(corpus => corpus.capabilities[0].receiptPath = '/Users/private/receipt', /unexpected fields/);
  check(corpus => corpus.capabilities[0].title = 'SYNTHETIC_ADMIN_PASSWORD=not-real-secret', /Unsafe decoded public corpus text/);
  check(corpus => corpus.recipes.find(row => row.scopedSdkProof === 'none').scopedSdkProof = 'established', /Established recipe flags must match proof records/);
  check((corpus, pin) => { pin.corpora[0].counts.technicalReleaseReplay.scopedStamps++; corpus.counts.technicalReleaseReplay.scopedStamps++; },
    /Expected values to be strictly equal|replay totals differ/);
});
