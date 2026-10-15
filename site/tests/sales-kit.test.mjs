import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {publicationDigest, validateGuidance} from '../scripts/sales-guidance.mjs';
import {salesKitDocument} from '../src/sales-kit.mjs';
import {evidenceDocument, evidenceVersions, toMarkdown} from '../src/evidence.mjs';
import {toDocx} from '../scripts/sales-docx.mjs';
import {emitBundles, emitEvidence} from '../scripts/published-bundles.mjs';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const read = name => JSON.parse(readFileSync(new URL('../data/' + name + '.json', import.meta.url)));
const publication = read('publication'), stamps = read('release-stamps-1.3.2'), guidance = read('sales-guidance');

function unzip(zip) {
  const entries = {};
  for (let pos = 0; zip.readUInt32LE(pos) === 0x04034b50;) {
    const size = zip.readUInt32LE(pos + 18), length = zip.readUInt16LE(pos + 26), extra = zip.readUInt16LE(pos + 28);
    const name = zip.subarray(pos + 30, pos + 30 + length).toString();
    const start = pos + 30 + length + extra;
    entries[name] = inflateRawSync(zip.subarray(start, start + size)).toString();
    pos = start + size;
  }
  return entries;
}

test('guidance is tied to the exact publication, published version and complete gap list', () => {
  assert.equal(validateGuidance(guidance, publication), guidance);
  const changed = structuredClone(publication); changed.releases[0].build += ' changed';
  assert.equal(validateGuidance(guidance, changed), null);
  const staleUnsafe = structuredClone(guidance); staleUnsafe.guides['catalog.registered-sources'].steps = ['PRIVATE_CANARY'];
  assert.throws(() => validateGuidance(staleUnsafe, changed), /Unsafe/);
  for (const mutate of [
    d => d.missingGuidance.push('unpublished.capability'),
    d => d.guides['catalog.registered-sources'].source_version = '9.9.9',
    d => d.guides['catalog.registered-sources'].use_cases[0].evidence_sha256 = ['f'.repeat(64)],
    d => d.guides['catalog.registered-sources'].steps = ['PRIVATE_CANARY in /Users/person/private'],
    d => d.guides['catalog.registered-sources'].releaseVerified = true,
  ]) { const data = structuredClone(guidance); mutate(data); assert.throws(() => validateGuidance(data, publication)); }
  const reordered = Object.fromEntries(Object.entries(publication).reverse());
  assert.equal(publicationDigest(reordered), publicationDigest(publication));
});

test('newly curated guidance covers evidence-only rows without altering historical declarations', () => {
  const cid = 'apps.app-garden';
  assert.equal(publication.releases.find(r => r.id === '1.3.0-prerelease-r3').capabilities.find(c => c.id === cid).declaration, null);
  assert.ok(guidance.guides[cid]);
  const changed = structuredClone(guidance);
  changed.guides['unpublished.capability'] = structuredClone(changed.guides[cid]);
  assert.throws(() => validateGuidance(changed, publication));
  const draftOnly = structuredClone(publication);
  for (const release of draftOnly.releases) release.capabilities = release.capabilities.filter(c => c.id !== cid);
  draftOnly.releases.find(r => r.publicationState === 'draft').capabilities.push({id: cid, evidence: []});
  const rebound = structuredClone(guidance); rebound.publicationSha256 = publicationDigest(draftOnly);
  assert.throws(() => validateGuidance(rebound, draftOnly));
});

test('a Sales Dev Kit retains every evidence block, labels examples and keeps version boundaries', () => {
  for (const entry of evidenceVersions(publication, stamps)) {
    const blocks = salesKitDocument(entry, publication, stamps, guidance);
    const text = toMarkdown(blocks);
    const reference = evidenceDocument(entry, publication, stamps).slice(1);
    assert.deepEqual(blocks.slice(-reference.length), reference);
    assert.match(text, /Draft a full response only when the user explicitly requests it/);
    assert.match(text, /No Slack bot, plugin or additional download is required/);
    if (entry.version === '1.2.1') {
      assert.match(text, /Guidance coverage: 0 of 8/);
      assert.match(text, /Usage guidance not yet published/);
      assert.ok(!text.includes(guidance.guides['catalog.registered-sources'].purpose));
    } else {
      assert.match(text, /Guidance coverage: 88 of 88/);
      assert.doesNotMatch(text, /Usage guidance not yet published/);
      for (const cid of ['apps.app-garden', 'models.local-deployment', 'tools.mcp-tool-shed']) assert.ok(text.includes(guidance.guides[cid].purpose));
      assert.match(text, /Illustrative example; not demonstrated/);
      assert.match(text, /Evidence-linked example; only the described scope is demonstrated/);
      assert.ok(text.includes(guidance.guides['catalog.registered-sources'].use_cases[0].evidence_sha256[0]));
      for (const value of ['catalog-registered-sources-listing', 'develop@030b2a297934f4b7ad1374cd419b08e01350ab8d', '2026-09-28T23:26:34Z', '1.3.0-prerelease-r3']) assert.ok(text.includes(value));
    }
  }
});

test('stale optional guidance cannot break evidence downloads or appear in new kits', () => {
  const changed = structuredClone(publication); changed.releases[0].build += ' updated';
  const out = mkdtempSync(join(tmpdir(), 'stale-sales-guidance-'));
  emitBundles(changed, out);
  writeFileSync(join(out, 'release-stamps-1.3.2.json'), JSON.stringify(stamps));
  emitEvidence(changed, stamps, out, {}, guidance);
  const index = JSON.parse(readFileSync(join(out, 'evidence/index.json')));
  for (const entry of index.versions) {
    const text = readFileSync(join(out, entry.files.salesMd.path), 'utf8');
    assert.match(text, /Usage guidance is unavailable for this publication/);
    assert.ok(!text.includes(guidance.guides['catalog.registered-sources'].purpose));
    assert.ok(readFileSync(join(out, entry.files.md.path)).length > 0);
  }
});

test('Word output is deterministic, editable OOXML with safe text and real tables', () => {
  const blocks = [{type: 'h', level: 1, text: 'Sales Dev Kit'}, {type: 'p', text: 'Keep <xml> & "quotes" and café.'},
    {type: 'li', level: 0, text: 'An ordered step'}, {type: 'table', head: ['Name', 'Result'], rows: [['One', 'Two']], widths: [0.3, 0.7]}];
  const bytes = toDocx(blocks);
  assert.deepEqual(bytes, toDocx(blocks));
  const files = unzip(bytes), xml = files['word/document.xml'];
  assert.match(xml, /Keep &lt;xml&gt; &amp; &quot;quotes&quot; and café/);
  assert.match(xml, /w:pStyle w:val="Title"/);
  assert.match(xml, /<w:tbl>/); assert.match(xml, /<w:tblHeader\/>/);
  assert.ok(!Object.values(files).some(value => /TargetMode="External"|vbaProject/.test(value)));
  for (const entry of evidenceVersions(publication, stamps)) {
    const blocks = salesKitDocument(entry, publication, stamps, guidance);
    const document = unzip(toDocx(blocks))['word/document.xml'];
    for (const block of blocks.filter(b => b.type === 'h')) assert.ok(document.includes(block.text.replace(/\*\*|`/g, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')));
  }
});
