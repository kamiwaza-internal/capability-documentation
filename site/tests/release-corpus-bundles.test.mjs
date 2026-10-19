import assert from 'node:assert/strict';
import test from 'node:test';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkReleaseCorpusBuild, zipMembers} from '../scripts/check-release-corpus.mjs';
import {validateDescriptions} from '../scripts/project-descriptions.mjs';
import {loadReleaseCorpora, sha256} from '../scripts/release-corpora.mjs';
import {loadReleaseSidecars} from '../scripts/release-sidecars.mjs';
import {emitBundles, emitEvidence} from '../scripts/published-bundles.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const publication = JSON.parse(readFileSync(join(root, 'site/data/publication.json')));
const stamps = JSON.parse(readFileSync(join(root, 'site/data/release-stamps-1.3.2.json')));
const descriptions = validateDescriptions(JSON.parse(readFileSync(join(root, 'site/data/descriptions.json'))), publication)?.descriptions;
const homeLinks = index => index.versions.flatMap(entry => ['zip', 'summaryMd', 'summaryPdf']
  .map(key => `<a href="${entry.files[key].path}">${key}</a>`)).join('');

test('site workflow runs the consistency check after the production build', () => {
  const workflow = readFileSync(join(root, '.github/workflows/site.yml'), 'utf8');
  const buildAt = workflow.indexOf('run: npm run build');
  const checkAt = workflow.indexOf('run: npm run check:release-bundles');
  const uploadAt = workflow.indexOf('uses: actions/upload-pages-artifact');
  assert.ok(buildAt >= 0 && checkAt > buildAt && uploadAt > checkAt);
});

test('every public corpus emits matching detailed MD, PDF, ZIP, manifest, digests and home links', () => {
  const out = mkdtempSync(join(tmpdir(), 'release-corpus-bundle-'));
  emitBundles(publication, out);
  writeFileSync(join(out, 'release-stamps-1.3.2.json'), readFileSync(join(root, 'site/data/release-stamps-1.3.2.json')));
  emitEvidence(publication, stamps, out, descriptions, loadReleaseCorpora({publication}));
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
  const entry = index.versions.find(row => row.version === '1.3.4');
  assert.equal(entry.kind, 'release-corpus');
  const prior = mkdtempSync(join(tmpdir(), 'release-corpus-historical-'));
  emitBundles(publication, prior);
  writeFileSync(join(prior, 'release-stamps-1.3.2.json'), readFileSync(join(root, 'site/data/release-stamps-1.3.2.json')));
  emitEvidence(publication, stamps, prior, descriptions);
  for (const historical of index.versions.filter(row => row.version !== '1.3.4')) {
    for (const file of Object.values(historical.files)) assert.deepEqual(readFileSync(join(out, file.path)),
      readFileSync(join(prior, file.path)), `historical download ${file.path} must retain its bytes`);
  }
  const releaseIndex = JSON.parse(readFileSync(join(out, 'releases/index.json')));
  assert.deepEqual(releaseIndex.releases, JSON.parse(readFileSync(join(prior, 'releases/index.json'))).releases);
  assert.equal(releaseIndex.corpora.length, 1);
  assert.deepEqual(releaseIndex.releaseReplays, []);
  const corpusBundle = JSON.parse(readFileSync(join(out, releaseIndex.corpora[0].bundle)));
  assert.deepEqual(corpusBundle.downloads, entry.files);
  assert.equal(corpusBundle.state, 'review-candidate');
  assert.equal(corpusBundle.publicationBinding, null);
  assert.equal(corpusBundle.releaseReplay.id, '1.3.4-release-replay-r2');
  writeFileSync(join(out, 'index.html'), homeLinks(index));
  assert.equal(checkReleaseCorpusBuild({out}), index.versions.length);
  const members = zipMembers(readFileSync(join(out, entry.files.zip.path)));
  assert.deepEqual(members.get('records/release-corpus-catalog.json'), readFileSync(join(root, 'corpus/1.3.4/catalog.json')));
  assert.deepEqual(members.get('README.md'), readFileSync(join(out, entry.files.md.path)));
  assert.match(members.get('README.md').toString(), /Distinct pre-release credits \| 6/);
  assert.match(members.get('README.md').toString(), /Scoped release stamps \| 30/);
  assert.match(members.get('README.md').toString(), /Human release approval: not established/);
  for (const selected of [entry, index.versions.find(row => row.version === '1.3.2'),
    index.versions.find(row => row.version === '1.3.0')]) for (const file of ['md', 'pdf', 'zip']) {
      const path = join(out, selected.files[file].path);
      const valid = readFileSync(path);
      rmSync(path);
      assert.throws(() => checkReleaseCorpusBuild({out}), `missing ${selected.version}/${file} must fail`);
      writeFileSync(path, valid);
      const corrupt = Buffer.from(valid); corrupt[0] ^= 1; writeFileSync(path, corrupt);
      assert.throws(() => checkReleaseCorpusBuild({out}), `stale ${selected.version}/${file} must fail`);
      writeFileSync(path, valid);
  }
  assert.equal(checkReleaseCorpusBuild({out}), index.versions.length);
});

test('release-stamp-only versions get downloads and cannot pass with missing or corrupt MD/PDF/ZIP', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'release-replay-only-'));
  mkdirSync(join(fixture, 'site'), {recursive: true});
  cpSync(join(root, 'site/data'), join(fixture, 'site/data'), {recursive: true});
  writeFileSync(join(fixture, 'site/data/release-corpora.json'), JSON.stringify({schema: 'public-release-corpora.v1', corpora: []}));
  const out = mkdtempSync(join(tmpdir(), 'release-replay-output-'));
  emitBundles(publication, out);
  writeFileSync(join(out, 'release-stamps-1.3.2.json'), readFileSync(join(root, 'site/data/release-stamps-1.3.2.json')));
  emitEvidence(publication, stamps, out, descriptions);
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
  const replay = index.versions.find(row => row.version === '1.3.4');
  assert.equal(replay.kind, 'release-replay');
  assert.equal(JSON.parse(readFileSync(join(out, 'releases/index.json'))).corpora, undefined);
  assert.equal(JSON.parse(readFileSync(join(out, 'releases/index.json'))).releaseReplays[0].id,
    '1.3.4-release-replay-r2');
  assert.ok(zipMembers(readFileSync(join(out, replay.files.zip.path))).has('records/1.3.4-release-replay-r2.bundle.json'));
  writeFileSync(join(out, 'index.html'), homeLinks(index));
  assert.equal(checkReleaseCorpusBuild({repo: fixture, out}), index.versions.length);
  for (const key of ['md', 'pdf', 'zip']) {
    const path = join(out, replay.files[key].path), original = readFileSync(path);
    rmSync(path);
    assert.throws(() => checkReleaseCorpusBuild({repo: fixture, out}), `missing replay ${key} must fail`);
    writeFileSync(path, original);
    const corrupt = Buffer.from(original); corrupt[0] ^= 1; writeFileSync(path, corrupt);
    assert.throws(() => checkReleaseCorpusBuild({repo: fixture, out}), `corrupt replay ${key} must fail`);
    writeFileSync(path, original);
  }
});

test('required release sidecars are pinned and must apply to the publication', () => {
  const registered = JSON.parse(readFileSync(join(root, 'site/data/release-sidecars.json')));
  const discovered = readdirSync(join(root, 'site/data')).filter(name => /^release-stamps-\d+\.\d+\.\d+\.json$/.test(name));
  assert.deepEqual(discovered, registered.sidecars.map(row => row.file), 'every checked-in sidecar must be registered');
  assert.equal(loadReleaseSidecars({publication}).length, 1);
  const fixture = mkdtempSync(join(tmpdir(), 'release-sidecar-source-'));
  mkdirSync(join(fixture, 'site/data'), {recursive: true});
  cpSync(join(root, 'site/data/release-sidecars.json'), join(fixture, 'site/data/release-sidecars.json'));
  cpSync(join(root, 'site/data/release-stamps-1.3.2.json'), join(fixture, 'site/data/release-stamps-1.3.2.json'));
  const changed = structuredClone(publication);
  changed.releases = changed.releases.filter(row => row.id !== stamps.baselineReleaseId);
  assert.throws(() => loadReleaseSidecars({repo: fixture, publication: changed}), /not applicable/);
  const sidecar = join(fixture, 'site/data/release-stamps-1.3.2.json');
  writeFileSync(sidecar, Buffer.concat([readFileSync(sidecar), Buffer.from(' ')]));
  assert.throws(() => loadReleaseSidecars({repo: fixture, publication}), /changed without registry review/);
  registered.sidecars.push({file: 'release-stamps-1.3.3.json', sha256: registered.sidecars[0].sha256});
  writeFileSync(join(fixture, 'site/data/release-sidecars.json'), JSON.stringify(registered));
  assert.throws(() => loadReleaseSidecars({repo: fixture, publication}), /multiple release sidecars/);
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
  check((corpus, pin) => { pin.corpora[0].counts.technicalReleaseReplay.scopedStamps++; corpus.counts.technicalReleaseReplay.scopedStamps++; },
    /Expected values to be strictly equal|replay totals differ/);
});
