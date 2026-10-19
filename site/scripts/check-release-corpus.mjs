import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import {evidenceVersions} from '../src/evidence.mjs';
import {emitBundles, emitEvidence} from './published-bundles.mjs';
import {validateDescriptions} from './project-descriptions.mjs';
import {loadReleaseCorpora, sha256} from './release-corpora.mjs';
import {assertPublicOutputSafe} from './public-output-privacy.mjs';

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
      `${entry.version} must show only the complete kit's three downloads`);
    for (const [, path] of links) readFileSync(join(out, path));
    const replay = (publication.releaseStamps ?? []).filter(row => row.version === entry.version)
      .sort((a, b) => b.publicationRevision - a.publicationRevision)[0];
    if (replay) {
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
  const stamps = JSON.parse(readFileSync(join(repo, 'site/data/release-stamps-1.3.2.json')));
  const corpora = loadReleaseCorpora({root: repo, publication});
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
  const home = readFileSync(join(out, 'index.html'), 'utf8');
  assert.equal(index.schema, 'capability-evidence-downloads.v1');
  checkHomeDownloadCards(home, index, publication, out);
  const expectedEntries = evidenceVersions(publication, stamps, corpora).filter(row => row.kind === 'release-corpus');
  assert.deepEqual(index.versions.filter(row => row.kind === 'release-corpus').map(row => row.version), expectedEntries.map(row => row.version));
  for (const entry of expectedEntries) {
    const actual = index.versions.find(row => row.version === entry.version);
    assert.ok(actual && actual.kind === 'release-corpus', `missing corpus download ${entry.version}`);
    assert.deepEqual(actual.source, {catalogSha256: entry.corpus.sha256, kitMergeCommit: entry.corpus.kitMergeCommit,
      productTag: entry.corpus.productTag, productCoreCommit: entry.corpus.productCoreCommit,
      publicationBinding: null, humanReleaseApproval: 'not-established'}, 'corpus source binding');
    for (const [key, file] of Object.entries(actual.files)) {
      const bytes = readFileSync(join(out, file.path));
      assert.equal(file.sha256, sha256(bytes), `built file digest ${key}`);
      assert.equal(file.bytes, bytes.length, `built file bytes ${key}`);
    }
    const unzipped = zipMembers(readFileSync(join(out, entry.path + '.zip')));
    assert.ok(unzipped.get('machine-readable/release-corpus-catalog.json')?.equals(entry.corpus.bytes), 'ZIP catalog must match reviewed corpus');
    assert.ok(unzipped.get('machine-readable/release-corpus-manifest.json')?.equals(entry.corpus.manifestBytes), 'ZIP manifest must match reviewed corpus');
    assert.equal(JSON.parse(unzipped.get('machine-readable/release-corpus-manifest.json')).sha256,
      sha256(unzipped.get('machine-readable/release-corpus-catalog.json')), 'manifest must bind the exact catalog');
    const readableKeys = ['md', 'pdf', 'summaryMd', 'summaryPdf', 'salesMd', 'salesPdf'];
    for (const key of readableKeys) {
      assert.ok(actual.files[key], `corpus kit must include ${key}`);
      const file = actual.files[key], name = 'human-readable/' + file.path.split('/').at(-1);
      assert.ok(unzipped.get(name)?.equals(readFileSync(join(out, file.path))), `ZIP must include standalone ${key}`);
      assert.equal(file.sha256, sha256(unzipped.get(name)), `standalone digest ${key}`);
    }
    for (const name of ['README.md', 'AGENTS.md', 'CLAUDE.md', 'SHA256SUMS']) assert.ok(unzipped.has(name), `missing ${name}`);
    assert.equal(unzipped.get('CLAUDE.md').toString(), '@AGENTS.md\n');
    assert.match(unzipped.get('AGENTS.md').toString(), /machine-readable\//);
    assert.match(unzipped.get('README.md').toString(), /AGENTS\.md/);
    const checksums = unzipped.get('SHA256SUMS').toString().trimEnd().split('\n').sort();
    assert.deepEqual(checksums, [...unzipped].filter(([name]) => name !== 'SHA256SUMS')
      .map(([name, bytes]) => `${sha256(bytes)}  ${name}`).sort(), 'checksums must cover every other member');
  }
  // Rebuild the complete kit contract in isolation, so this gate follows the same reviewed
  // packaging as historical downloads and validates every emitted corpus file and ZIP member.
  const expectedOut = mkdtempSync(join(tmpdir(), 'release-corpus-consistency-'));
  try {
    emitBundles(publication, expectedOut);
    writeFileSync(join(expectedOut, 'release-stamps-1.3.2.json'), JSON.stringify(stamps, null, 2) + '\n');
    const read = name => JSON.parse(readFileSync(join(repo, 'site/data', name)));
    const descriptions = validateDescriptions(read('descriptions.json'), publication);
    emitEvidence(publication, stamps, expectedOut, descriptions?.descriptions,
      read('sales-guidance.json'), read('value-streams.json'), corpora);
    const expectedIndex = JSON.parse(readFileSync(join(expectedOut, 'evidence/index.json')));
    for (const entry of expectedEntries) {
      const actual = index.versions.find(row => row.version === entry.version);
      const expected = expectedIndex.versions.find(row => row.version === entry.version);
      assert.deepEqual(actual, expected, `corpus download metadata ${entry.version}`);
      for (const [key, file] of Object.entries(expected.files)) {
        assert.ok(readFileSync(join(out, file.path)).equals(readFileSync(join(expectedOut, file.path))),
          `missing or stale ${entry.version}/${key}`);
        if (['zip', 'salesMd', 'salesPdf'].includes(key)) {
          assert.ok(home.includes(`href="${file.path}"`), `home page missing ${file.path}`);
        }
      }
      console.log(`Checked ${entry.version}: ${entry.corpus.sha256}; complete kit, corpus, manifest, digests and home links`);
    }
  } finally {
    rmSync(expectedOut, {recursive: true, force: true});
  }
  return expectedEntries.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkReleaseCorpusBuild();
}
