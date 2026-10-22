import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import {emitBundles, emitEvidence} from './published-bundles.mjs';
import {validateDescriptions} from './project-descriptions.mjs';
import {loadReleaseCorpora, sha256} from './release-corpora.mjs';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';
import {validateReleaseStamps} from './release-stamps.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

// The site ZIP writer uses local DEFLATE entries. Inspect the emitted bytes, including every
// compressed member, instead of scanning a compressed buffer as UTF-8 text.
export function zipMembers(bytes) {
  const members = new Map();
  for (let at = 0; at + 4 <= bytes.length && bytes.readUInt32LE(at) === 0x04034b50;) {
    assert.equal(bytes.readUInt16LE(at + 8), 8, 'ZIP member must use DEFLATE');
    const packed = bytes.readUInt32LE(at + 18), size = bytes.readUInt32LE(at + 22);
    const nameLength = bytes.readUInt16LE(at + 26), extraLength = bytes.readUInt16LE(at + 28);
    const name = bytes.subarray(at + 30, at + 30 + nameLength).toString('utf8');
    assert.ok(!members.has(name), `duplicate ZIP member ${name}`);
    const start = at + 30 + nameLength + extraLength;
    const raw = inflateRawSync(bytes.subarray(start, start + packed));
    assert.equal(raw.length, size, `ZIP member size ${name}`);
    assertPublicOutputSafe(raw);
    members.set(name, raw);
    at = start + packed;
  }
  return members;
}

function checkHomeDownloadCards(home, index, publication, out) {
  assert.ok(!home.includes('Release build verification'), 'release replay must not render as a second release section');
  const section = home.match(/<section aria-labelledby="releases">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(section, 'missing Releases section');
  const cards = [...section.matchAll(/<li class="releaseRow">([\s\S]*?)<\/li>/g)].map(match => match[1]);
  assert.equal(cards.length, index.versions.length, 'one release card per download version');
  for (const entry of index.versions) {
    const cardsForVersion = cards.filter(card => card.includes(`<span class="releaseVersion">${entry.version}</span>`));
    assert.equal(cardsForVersion.length, 1, `exactly one release card for ${entry.version}`);
    const card = cardsForVersion[0];
    const groups = [...card.matchAll(/<nav class="fileGroup" aria-label="([^"]+)">([\s\S]*?)<\/nav>/g)];
    assert.deepEqual(groups.map(group => group[1]), [`For AI, ${entry.version}`, `For people, ${entry.version}`],
      `${entry.version} download group labels`);
    const links = groups.flatMap(group => [...group[2].matchAll(/<a href="([^"]+)"[^>]*\sdownload(?:="")?[^>]*>([^<]+)<\/a>/g)]
      .map(match => [match[2], match[1]]));
    assert.deepEqual(links, [['ZIP', entry.files.zip.path], ['PDF', entry.files.salesPdf.path], ['MD', entry.files.salesMd.path]],
      `${entry.version} must show its exactly one ZIP, PDF and MD download`);
    for (const [, path] of links) readFileSync(join(out, path));
    const replay = (publication.releaseStamps ?? []).filter(row => row.version === entry.version)
      .sort((a, b) => b.publicationRevision - a.publicationRevision)[0];
    if (replay && !entry.source?.currentVerification) {
      const visible = card.replaceAll('<!-- -->', '');
      assert.ok(visible.includes(`${replay.counts.releaseStamped} of ${replay.counts.included} included capabilities`),
        `${entry.version} scoped replay totals must remain in its release card`);
      assert.ok(visible.includes(`${replay.counts.failed} failed selections`) &&
        visible.includes(`${replay.counts.notStamped} not stamped`) &&
        visible.includes(`Human release sign-off: ${replay.approval.status}`),
      `${entry.version} failures, gaps and approval must remain visible`);
    }
  }
}

export function checkReleaseCorpusBuild({repo = root, out = join(repo, 'site/build')} = {}) {
  const publication = JSON.parse(readFileSync(join(repo, 'site/data/publication.json')));
  const stampBytes = readFileSync(join(repo, 'site/data/release-stamps-1.3.2.json'));
  const candidateStamps = JSON.parse(stampBytes);
  const stamps = validateReleaseStamps(candidateStamps, publication) === null ? null : candidateStamps;
  const corpora = loadReleaseCorpora({root: repo, publication});
  const expectedOut = mkdtempSync(join(tmpdir(), 'release-download-consistency-'));
  try {
    emitBundles(publication, expectedOut);
    if (stamps) writeFileSync(join(expectedOut, 'release-stamps-1.3.2.json'), stampBytes);
    const read = name => JSON.parse(readFileSync(join(repo, 'site/data', name)));
    const descriptions = validateDescriptions(read('descriptions.json'), publication);
    emitEvidence(publication, stamps, expectedOut, descriptions?.descriptions,
      read('sales-guidance.json'), read('value-streams.json'), corpora);
    const expectedIndex = JSON.parse(readFileSync(join(expectedOut, 'evidence/index.json')));
    const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
    assert.equal(index.schema, 'capability-evidence-downloads.v1');
    const sourceVersions = new Set([...publication.releases.map(row => row.version),
      ...(publication.releaseStamps ?? []).map(row => row.version), ...corpora.map(row => row.version),
      ...(stamps ? [stamps.targetRelease] : [])]);
    assert.deepEqual(new Set(index.versions.map(row => row.version)), sourceVersions,
      'every source release version needs one complete download');
    assert.deepEqual(index, expectedIndex, 'evidence index must match all current source versions and digests');
    const home = readFileSync(join(out, 'index.html'), 'utf8');
    checkHomeDownloadCards(home, index, publication, out);
    for (const entry of index.versions) {
      for (const [key, file] of Object.entries(entry.files)) {
        const bytes = readFileSync(join(out, file.path));
        assert.ok(bytes.equals(readFileSync(join(expectedOut, file.path))),
          `missing or stale ${entry.version}/${key}`);
        assert.equal(file.sha256, sha256(bytes), `built file digest ${entry.version}/${key}`);
        assert.equal(file.bytes, bytes.length, `built file bytes ${entry.version}/${key}`);
      }
      const unzipped = zipMembers(readFileSync(join(out, entry.files.zip.path)));
      for (const key of ['md', 'pdf', 'summaryMd', 'summaryPdf', 'salesMd', 'salesPdf']) {
        assert.ok(entry.files[key], `${entry.version} needs ${key}`);
        const file = entry.files[key], name = 'human-readable/' + file.path.split('/').at(-1);
        assert.ok(unzipped.get(name)?.equals(readFileSync(join(out, file.path))), `${entry.version} ZIP must include ${key}`);
      }
      for (const name of ['README.md', 'AGENTS.md', 'CLAUDE.md', 'SHA256SUMS']) assert.ok(unzipped.has(name), `missing ${name}`);
      assert.equal(unzipped.get('CLAUDE.md').toString(), '@AGENTS.md\n');
      assert.match(unzipped.get('AGENTS.md').toString(), /machine-readable\//);
      assert.match(unzipped.get('README.md').toString(), /AGENTS\.md/);
      const checksums = unzipped.get('SHA256SUMS').toString().trimEnd().split('\n').sort();
      assert.deepEqual(checksums, [...unzipped].filter(([name]) => name !== 'SHA256SUMS')
        .map(([name, bytes]) => `${sha256(bytes)}  ${name}`).sort(), `${entry.version} ZIP checksums`);
      if (entry.kind === 'release-corpus') {
        const corpus = corpora.find(row => row.version === entry.version);
        assert.deepEqual(entry.source, {catalogSha256: corpus.sha256, kitMergeCommit: corpus.kitMergeCommit,
          productTag: corpus.productTag, productCoreCommit: corpus.productCoreCommit,
          ...(corpus.currentVerification ? {currentVerification: {path: corpus.currentVerification.sourcePath, sha256: corpus.currentVerification.sourceSha256, counts: corpus.currentVerification.counts}} : {}),
          publicationBinding: null, humanReleaseApproval: 'not-established'}, 'corpus source binding');
        assert.ok(unzipped.get('machine-readable/release-corpus-catalog.json')?.equals(corpus.bytes), 'ZIP catalog must match reviewed corpus');
        assert.ok(unzipped.get('machine-readable/release-corpus-manifest.json')?.equals(corpus.manifestBytes), 'ZIP manifest must match reviewed corpus');
        assert.equal(JSON.parse(unzipped.get('machine-readable/release-corpus-manifest.json')).sha256,
          sha256(unzipped.get('machine-readable/release-corpus-catalog.json')), 'manifest must bind the exact catalog');
      } else if (entry.kind === 'release-replay') {
        const replay = [...publication.releaseStamps].filter(row => row.version === entry.version)
          .sort((a, b) => b.publicationRevision - a.publicationRevision)[0];
        assert.deepEqual(entry.source, {snapshotId: replay.id, publicationRevision: replay.publicationRevision,
          releaseSource: replay.source, humanReleaseApproval: replay.approval.status}, 'replay source binding');
        assert.ok(unzipped.get(`machine-readable/${replay.id}.bundle.json`)?.equals(
          readFileSync(join(out, 'release-stamps', replay.id, 'bundle.json'))), 'ZIP replay source');
      }
      if (entry.kind === 'release-stamps') assert.ok(unzipped.get(`machine-readable/release-stamps-${entry.version}.json`)?.equals(
        readFileSync(join(out, `release-stamps-${entry.version}.json`))), 'ZIP release stamp source');
    }
    assert.deepEqual(readFileSync(join(out, 'releases/index.json')), readFileSync(join(expectedOut, 'releases/index.json')),
      'publication index and provenance');
    const releaseIndex = JSON.parse(readFileSync(join(out, 'releases/index.json')));
    for (const row of releaseIndex.releases) {
      const bytes = readFileSync(join(out, row.bundle));
      assert.deepEqual(bytes, readFileSync(join(expectedOut, row.bundle)), `${row.id} publication bundle`);
      assert.equal(sha256(bytes), row.sha256, `${row.id} publication digest`);
      assert.deepEqual(readFileSync(join(out, row.bundle.replace(/\.json$/, '.md'))),
        readFileSync(join(expectedOut, row.bundle.replace(/\.json$/, '.md'))), `${row.id} readable bundle`);
    }
    if (existsSync(join(expectedOut, 'release-stamps/index.json'))) {
      assert.deepEqual(readFileSync(join(out, 'release-stamps/index.json')),
        readFileSync(join(expectedOut, 'release-stamps/index.json')), 'replay index and provenance');
      const snapshots = JSON.parse(readFileSync(join(out, 'release-stamps/index.json'))).snapshots;
      for (const row of snapshots) {
        const bytes = readFileSync(join(out, row.bundle));
        assert.deepEqual(bytes, readFileSync(join(expectedOut, row.bundle)), `${row.id} replay bundle`);
        assert.equal(sha256(bytes), row.sha256, `${row.id} replay digest`);
        assert.deepEqual(readFileSync(join(out, row.bundle.replace(/\.json$/, '.md'))),
          readFileSync(join(expectedOut, row.bundle.replace(/\.json$/, '.md'))), `${row.id} readable replay`);
      }
    }
    if (stamps) assert.deepEqual(readFileSync(join(out, 'release-stamps-1.3.2.json')), stampBytes,
      'standalone release stamp sidecar');
    console.log(`Checked ${index.versions.length} complete release downloads, ${corpora.length} corpus source(s), and all publication/replay refs`);
    return index.versions.length;
  } finally {
    rmSync(expectedOut, {recursive: true, force: true});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkReleaseCorpusBuild();
}
