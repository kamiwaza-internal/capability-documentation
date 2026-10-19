import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {validateDescriptions} from './project-descriptions.mjs';
import {loadReleaseSidecars} from './release-sidecars.mjs';
import {emitBundles, emitEvidence} from './published-bundles.mjs';
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

const bytesAt = (out, path) => readFileSync(join(out, path));
const assertFile = (out, expected, path) => assert.deepEqual(bytesAt(out, path), bytesAt(expected, path), `missing or stale ${path}`);

// Recreate every release download from the checked-in sources, then compare actual build bytes.
// This catches a missing version as well as missing or stale MD, PDF, ZIP, indexes and bundle refs.
export function checkReleaseCorpusBuild({repo = root, out = join(repo, 'site/build')} = {}) {
  const publication = JSON.parse(readFileSync(join(repo, 'site/data/publication.json')));
  const sidecars = loadReleaseSidecars({repo, publication});
  const stamps = sidecars[0]?.data ?? null;
  const descriptions = validateDescriptions(JSON.parse(readFileSync(join(repo, 'site/data/descriptions.json'))), publication)?.descriptions;
  const corpora = loadReleaseCorpora({root: repo, publication});
  const expected = mkdtempSync(join(tmpdir(), 'release-download-check-'));
  try {
    emitBundles(publication, expected);
    for (const sidecar of sidecars) writeFileSync(join(expected, sidecar.file), sidecar.bytes);
    emitEvidence(publication, stamps, expected, descriptions, corpora);
    const wanted = JSON.parse(bytesAt(expected, 'evidence/index.json'));
    const actual = JSON.parse(bytesAt(out, 'evidence/index.json'));
    assert.deepEqual(actual, wanted, 'evidence index must match every current source version and digest');
    const sourceVersions = new Set([...publication.releases.map(row => row.version),
      ...(publication.releaseStamps ?? []).map(row => row.version), ...corpora.map(row => row.version),
      ...(stamps ? [stamps.targetRelease] : [])]);
    assert.deepEqual(new Set(actual.versions.map(row => row.version)), sourceVersions, 'every source version needs one download');
    const home = bytesAt(out, 'index.html').toString('utf8');
    for (const entry of wanted.versions) {
      for (const [key, file] of Object.entries(entry.files)) {
        const built = bytesAt(out, file.path);
        assertFile(out, expected, file.path);
        assert.equal(sha256(built), file.sha256, `${entry.version}/${key} index digest`);
        assert.equal(built.length, file.bytes, `${entry.version}/${key} index size`);
        if (['zip', 'summaryMd', 'summaryPdf'].includes(key))
          assert.ok(home.includes(`href="${file.path}"`), `home page missing ${file.path}`);
      }
      const actualZip = zipMembers(bytesAt(out, entry.files.zip.path));
      const expectedZip = zipMembers(bytesAt(expected, entry.files.zip.path));
      assert.deepEqual(actualZip, expectedZip, `${entry.version} ZIP members`);
      const sums = [...actualZip].filter(([name]) => name !== 'SHA256SUMS')
        .map(([name, bytes]) => `${sha256(bytes)}  ${name}\n`).join('');
      assert.equal(actualZip.get('SHA256SUMS')?.toString(), sums, `${entry.version} ZIP member digests`);
    }
    const releaseIndex = JSON.parse(bytesAt(out, 'releases/index.json'));
    assert.deepEqual(releaseIndex, JSON.parse(bytesAt(expected, 'releases/index.json')), 'release index and corpus references');
    for (const row of [...releaseIndex.releases, ...(releaseIndex.corpora ?? []), ...(releaseIndex.releaseReplays ?? [])]) {
      assertFile(out, expected, row.bundle);
      assert.equal(sha256(bytesAt(out, row.bundle)), row.sha256, `${row.id} bundle digest`);
      if (releaseIndex.releases.includes(row)) assertFile(out, expected, row.bundle.replace(/\.json$/, '.md'));
    }
    assert.equal((releaseIndex.corpora ?? []).length, corpora.length, 'each corpus needs a release-index bundle');
    assert.deepEqual(new Set((releaseIndex.releaseReplays ?? []).map(row => row.version)),
      new Set(actual.versions.filter(row => row.kind === 'release-replay').map(row => row.version)),
      'every replay-only version needs a release-index reference');
    for (const row of releaseIndex.corpora ?? []) {
      const bundle = JSON.parse(bytesAt(out, row.bundle));
      const corpus = corpora.find(item => item.version === row.version);
      const entry = actual.versions.find(item => item.version === row.version);
      assert.equal(bundle.schema, 'capability-release-corpus-bundle.v1');
      assert.equal(bundle.state, 'review-candidate');
      assert.equal(bundle.publicationBinding, null);
      assert.equal(bundle.humanReleaseApproval, 'not-established');
      assert.equal(bundle.catalog.sha256, corpus.sha256);
      assert.equal(bundle.manifest.sha256, sha256(corpus.manifestBytes));
      assert.deepEqual(bundle.downloads, entry.files);
      if (bundle.releaseReplay) {
        assertFile(out, expected, bundle.releaseReplay.bundle);
        assert.equal(sha256(bytesAt(out, bundle.releaseReplay.bundle)), bundle.releaseReplay.sha256);
      }
    }
    for (const sidecar of sidecars) assertFile(out, expected, sidecar.file);
    if (existsSync(join(expected, 'release-stamps/index.json'))) {
      assertFile(out, expected, 'release-stamps/index.json');
      const replays = JSON.parse(bytesAt(out, 'release-stamps/index.json'));
      for (const row of replays.snapshots) {
        assertFile(out, expected, row.bundle);
        assert.equal(sha256(bytesAt(out, row.bundle)), row.sha256, `${row.id} replay bundle digest`);
        assertFile(out, expected, row.bundle.replace(/\.json$/, '.md'));
      }
    }
    console.log(`Checked ${wanted.versions.length} release downloads, ${corpora.length} corpus bundles and all replay/publication refs`);
    return wanted.versions.length;
  } finally { rmSync(expected, {recursive: true, force: true}); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkReleaseCorpusBuild();
}
