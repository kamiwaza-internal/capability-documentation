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

export function checkReleaseCorpusBuild({repo = root, out = join(repo, 'site/build')} = {}) {
  const publication = JSON.parse(readFileSync(join(repo, 'site/data/publication.json')));
  const stamps = JSON.parse(readFileSync(join(repo, 'site/data/release-stamps-1.3.2.json')));
  const corpora = loadReleaseCorpora({root: repo, publication});
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
  const home = readFileSync(join(out, 'index.html'), 'utf8');
  assert.equal(index.schema, 'capability-evidence-downloads.v1');
  const expectedEntries = evidenceVersions(publication, stamps, corpora).filter(row => row.kind === 'release-corpus');
  assert.deepEqual(index.versions.filter(row => row.kind === 'release-corpus').map(row => row.version), expectedEntries.map(row => row.version));
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
        assert.deepEqual(readFileSync(join(out, file.path)), readFileSync(join(expectedOut, file.path)),
          `missing or stale ${entry.version}/${key}`);
        if (['zip', 'summaryMd', 'summaryPdf', 'salesMd', 'salesPdf'].includes(key)) {
          assert.ok(home.includes(`href="${file.path}"`), `home page missing ${file.path}`);
        }
      }
      const unzipped = zipMembers(readFileSync(join(out, entry.path + '.zip')));
      const expectedMembers = zipMembers(readFileSync(join(expectedOut, entry.path + '.zip')));
      assert.deepEqual(unzipped, expectedMembers, 'complete ZIP members must match reviewed kit');
      assert.deepEqual(unzipped.get('machine-readable/release-corpus-catalog.json'), entry.corpus.bytes);
      assert.deepEqual(unzipped.get('machine-readable/release-corpus-manifest.json'), entry.corpus.manifestBytes);
      const readableKeys = ['md', 'pdf', 'summaryMd', 'summaryPdf', 'salesMd', 'salesPdf'];
      for (const key of readableKeys) {
        assert.ok(actual.files[key], `corpus kit must include ${key}`);
        const file = actual.files[key], name = 'human-readable/' + file.path.split('/').at(-1);
        assert.deepEqual(unzipped.get(name), readFileSync(join(out, file.path)), `ZIP must include standalone ${key}`);
        assert.equal(file.sha256, sha256(unzipped.get(name)), `standalone digest ${key}`);
      }
      for (const name of ['README.md', 'AGENTS.md', 'CLAUDE.md', 'SHA256SUMS']) assert.ok(unzipped.has(name), `missing ${name}`);
      assert.equal(unzipped.get('CLAUDE.md').toString(), '@AGENTS.md\n');
      assert.match(unzipped.get('AGENTS.md').toString(), /machine-readable\//);
      assert.match(unzipped.get('README.md').toString(), /AGENTS\.md/);
      const checksums = unzipped.get('SHA256SUMS').toString().trimEnd().split('\n').sort();
      assert.deepEqual(checksums, [...unzipped].filter(([name]) => name !== 'SHA256SUMS')
        .map(([name, bytes]) => `${sha256(bytes)}  ${name}`).sort(), 'checksums must cover every other member');

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
