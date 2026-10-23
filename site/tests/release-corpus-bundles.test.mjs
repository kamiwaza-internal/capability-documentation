import assert from 'node:assert/strict';
import test from 'node:test';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
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
const fixtureHome = (index, source = publication) => `<section aria-labelledby="releases"><ul class="releaseList">${index.versions.map(entry => {
  const replay = (source.releaseStamps ?? []).filter(row => row.version === entry.version)
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
  assert.equal(checkReleaseCorpusBuild({out}), index.versions.length);
  for (const [changed, reason] of [
    [validHome.replace(entry.files.salesPdf.path, entry.files.summaryPdf.path), /exactly one ZIP, PDF and MD download/],
    [validHome.replace('For AI, 1.3.4', 'For assistants, 1.3.4'), /download group labels/],
    [validHome + '<h2>Release build verification</h2>', /second release section/],
  ]) {
    writeFileSync(homePath, changed);
    assert.throws(() => checkReleaseCorpusBuild({out}), reason);
  }
  writeFileSync(homePath, validHome);
  const members = zipMembers(readFileSync(join(out, entry.files.zip.path)));
  for (const name of ['results.md', 'results.pdf', 'kit.zip', 'results.json']) {
    const path = 'verification-results/1.3.4-2026-10-22-markings/' + name;
    assert.deepEqual(members.get(path), readFileSync(join(root, 'site/static', path)), 'historical report bytes retained in standard ZIP');
  }
  assert.deepEqual(members.get('machine-readable/release-corpus-catalog.json'), readFileSync(join(root, 'corpus/1.3.4/catalog.json')));
  assert.deepEqual(members.get('human-readable/' + entry.files.md.path.split('/').at(-1)), readFileSync(join(out, entry.files.md.path)));
  assert.match(members.get('human-readable/' + entry.files.md.path.split('/').at(-1)).toString(), /58 historical prerelease/);
  assert.match(members.get('human-readable/' + entry.files.md.path.split('/').at(-1)).toString(), /69 of 87 capabilities/);
  assert.match(members.get('human-readable/' + entry.files.md.path.split('/').at(-1)).toString(), /whole-release approval/);
  for (const version of ['1.3.4', '1.3.0']) {
    const download = index.versions.find(row => row.version === version);
    for (const file of ['md', 'pdf', 'zip']) {
      const path = join(out, download.files[file].path);
      const valid = readFileSync(path);
      rmSync(path);
      assert.throws(() => checkReleaseCorpusBuild({out}), `missing ${version}/${file} must fail`);
      writeFileSync(path, valid);
      const corrupt = Buffer.from(valid); corrupt[0] ^= 1; writeFileSync(path, corrupt);
      assert.throws(() => checkReleaseCorpusBuild({out}), `stale ${version}/${file} must fail`);
      writeFileSync(path, valid);
    }
  }
  const indexPath = join(out, 'evidence/index.json'), zipPath = join(out, entry.files.zip.path);
  const validZip = readFileSync(zipPath);
  for (const [mutate, reason] of [
    [row => row.source.humanReleaseApproval = 'approved', /evidence index must match/],
    [row => row.files.zip.sha256 = 'f'.repeat(64), /evidence index must match/],
    [row => row.files.zip.bytes++, /evidence index must match/],
  ]) {
    const changed = structuredClone(index);
    mutate(changed.versions.find(row => row.version === entry.version));
    writeFileSync(indexPath, JSON.stringify(changed));
    assert.throws(() => checkReleaseCorpusBuild({out}), reason);
    writeFileSync(indexPath, JSON.stringify(index));
  }
  for (const [mutate, reason] of [
    [files => files.delete('AGENTS.md'), /evidence index must match/],
    [files => files.set('machine-readable/release-corpus-catalog.json', Buffer.from('{}')), /evidence index must match/],
    [files => files.set('SHA256SUMS', Buffer.from('invalid checksums\n')), /evidence index must match/],
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
  assert.equal(checkReleaseCorpusBuild({out}), index.versions.length);
});

test('a replay-only release gets a complete kit and cannot be omitted from the gate', () => {
  const repo = mkdtempSync(join(tmpdir(), 'replay-only-release-'));
  mkdirSync(join(repo, 'site/data'), {recursive: true});
  cpSync(join(root, 'corpus'), join(repo, 'corpus'), {recursive: true});
  cpSync(join(root, 'site/static/verification-results'), join(repo, 'site/static/verification-results'), {recursive: true});
  if (existsSync(join(root, 'site/static/current-verification'))) cpSync(join(root, 'site/static/current-verification'), join(repo, 'site/static/current-verification'), {recursive:true});
  for (const name of ['release-stamps-1.3.2.json', 'descriptions.json', 'sales-guidance.json', 'value-streams.json', 'release-corpora.json'])
    cpSync(join(root, 'site/data', name), join(repo, 'site/data', name));
  const extended = structuredClone(publication);
  const replay = structuredClone(extended.releaseStamps.at(-1));
  replay.id = 'synthetic-135-replay-r1'; replay.version = '1.3.5'; replay.publicationRevision = 1;
  replay.source.ref = 'v1.3.5';
  for (const row of replay.capabilities) if (row.stamp) {
    const oldId = row.stamp.id;
    row.stamp.id = sha256(Buffer.from(`${replay.id}:${row.id}`));
    row.stamp.targetRelease = replay.version;
    row.stamp.releaseSource.ref = replay.source.ref;
    for (const failure of row.failures) if (failure.resolvedByStampId === oldId) failure.resolvedByStampId = row.stamp.id;
  }
  extended.releaseStamps.push(replay);
  writeFileSync(join(repo, 'site/data/publication.json'), JSON.stringify(extended));
  const out = join(repo, 'build');
  emitBundles(extended, out);
  writeFileSync(join(out, 'release-stamps-1.3.2.json'), readFileSync(join(root, 'site/data/release-stamps-1.3.2.json')));
  emitEvidence(extended, stamps, out, descriptions, guidance, streams, loadReleaseCorpora({root: repo, publication: extended}));
  const indexPath = join(out, 'evidence/index.json');
  const index = JSON.parse(readFileSync(indexPath));
  const entry = index.versions.find(row => row.version === '1.3.5');
  assert.equal(entry.kind, 'release-replay');
  assert.deepEqual(entry.source, {snapshotId: replay.id, publicationRevision: 1,
    releaseSource: replay.source, humanReleaseApproval: 'pending'});
  const homePath = join(out, 'index.html');
  writeFileSync(homePath, fixtureHome(index, extended));
  assert.equal(checkReleaseCorpusBuild({repo, out}), index.versions.length);
  const members = zipMembers(readFileSync(join(out, entry.files.zip.path)));
  assert.deepEqual(members.get(`machine-readable/${replay.id}.bundle.json`),
    readFileSync(join(out, 'release-stamps', replay.id, 'bundle.json')));
  const omitted = structuredClone(index); omitted.versions = omitted.versions.filter(row => row.version !== replay.version);
  writeFileSync(indexPath, JSON.stringify(omitted));
  writeFileSync(homePath, fixtureHome(omitted, extended));
  assert.throws(() => checkReleaseCorpusBuild({repo, out}), /every source release version needs one complete download/);
  writeFileSync(indexPath, JSON.stringify(index));
  writeFileSync(homePath, fixtureHome(index, extended));
  for (const key of ['md', 'pdf', 'zip']) {
    const path = join(out, entry.files[key].path), valid = readFileSync(path);
    rmSync(path);
    assert.throws(() => checkReleaseCorpusBuild({repo, out}), `missing replay ${key}`);
    writeFileSync(path, valid);
    const stale = Buffer.from(valid); stale[0] ^= 1; writeFileSync(path, stale);
    assert.throws(() => checkReleaseCorpusBuild({repo, out}), `stale replay ${key}`);
    writeFileSync(path, valid);
  }
});

test('source discovery and pinning refuse incomplete, changed or extra corpora', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'release-corpus-source-'));
  mkdirSync(join(temporary, 'site/data'), {recursive: true});
  mkdirSync(join(temporary, 'corpus/1.3.4'), {recursive: true});
  cpSync(join(root, 'site/data/release-corpora.json'), join(temporary, 'site/data/release-corpora.json'));
  cpSync(join(root, 'corpus/1.3.4/catalog.json'), join(temporary, 'corpus/1.3.4/catalog.json'));
  cpSync(join(root, 'site/static/verification-results'), join(temporary, 'site/static/verification-results'), {recursive: true});
  if (existsSync(join(root, 'site/static/current-verification'))) cpSync(join(root, 'site/static/current-verification'), join(temporary, 'site/static/current-verification'), {recursive:true});
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
  const futureMeta = {...registry.corpora[0]};
  delete futureMeta.currentVerification;
  registry.corpora.push({...futureMeta, version: '1.3.5', productTag: 'v1.3.5', sha256: sha256(futureBytes)});
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
