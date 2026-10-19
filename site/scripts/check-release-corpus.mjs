import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import {evidenceDocument, evidenceVersions, summaryDocument, toMarkdown} from '../src/evidence.mjs';
import {toPdf, toZip} from './evidence-files.mjs';
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
  for (const entry of expectedEntries) {
    const meta = entry.corpus, actual = index.versions.find(row => row.version === entry.version);
    assert.ok(actual, `missing corpus download ${entry.version}`);
    assert.equal(actual.kind, 'release-corpus');
    assert.deepEqual(actual.releaseIds, []);
    assert.equal(actual.headline, entry.headline);
    assert.equal(actual.basis, entry.basis);
    assert.deepEqual(actual.source, {catalogSha256: meta.sha256, kitMergeCommit: meta.kitMergeCommit,
      productTag: meta.productTag, productCoreCommit: meta.productCoreCommit,
      publicationBinding: null, humanReleaseApproval: 'not-established'});
    const name = `kamiwaza-capabilities-${entry.version}`;
    const markdown = Buffer.from(toMarkdown(evidenceDocument(entry, publication, stamps)));
    const pdf = toPdf(evidenceDocument(entry, publication, stamps), {title: `Kamiwaza platform capabilities, version ${entry.version}`,
      footer: `Kamiwaza capabilities ${entry.version} · capabilities.kamiwaza.dev`});
    const summary = summaryDocument(entry, publication, stamps);
    const summaryMd = Buffer.from(toMarkdown(summary));
    const summaryPdf = toPdf(summary, {title: `Kamiwaza ${entry.version}: features at a glance`,
      footer: `Kamiwaza ${entry.version} · capabilities.kamiwaza.dev · Not a release sign-off unless stated`,
      cover: {eyebrow: 'KAMIWAZA · CAPABILITY SUMMARY'}});
    const members = [
      {name: 'README.md', data: markdown}, {name: `${name}.pdf`, data: pdf},
      {name: 'records/release-corpus-catalog.json', data: meta.bytes},
      {name: 'records/release-corpus-manifest.json', data: meta.manifestBytes},
    ];
    members.push({name: 'SHA256SUMS', data: members.map(file => `${sha256(file.data)}  ${file.name}\n`).join('')});
    const zip = toZip(members);
    const files = {
      zip: [entry.path + '.zip', zip, 'machine'], md: [entry.path + '.md', markdown, 'machine'],
      pdf: [entry.path + '.pdf', pdf, 'machine'], summaryMd: [entry.summaryPath + '.md', summaryMd, 'human'],
      summaryPdf: [entry.summaryPath + '.pdf', summaryPdf, 'human'],
    };
    assert.deepEqual(Object.keys(actual.files).sort(), Object.keys(files).sort());
    for (const [key, [path, expected, audience]] of Object.entries(files)) {
      const item = actual.files[key];
      assert.deepEqual(item, {path, audience, sha256: sha256(expected), bytes: expected.length}, `index metadata ${entry.version}/${key}`);
      const built = readFileSync(join(out, path));
      assert.deepEqual(built, expected, `missing or stale ${entry.version}/${key}`);
      if (['zip', 'summaryMd', 'summaryPdf'].includes(key)) assert.ok(home.includes(`href="${path}"`), `home page missing ${path}`);
    }
    const unzipped = zipMembers(readFileSync(join(out, entry.path + '.zip')));
    assert.deepEqual([...unzipped.keys()], members.map(file => file.name), 'ZIP members must match reviewed manifest');
    for (const member of members) assert.deepEqual(unzipped.get(member.name), Buffer.from(member.data), `ZIP member ${member.name}`);
    console.log(`Checked ${entry.version}: ${meta.sha256}; MD, PDF, ZIP, summaries, manifest, digests and home links`);
  }
  return expectedEntries.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkReleaseCorpusBuild();
}
