import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crc32, inflateRawSync, inflateSync} from 'node:zlib';
import {evidenceDocument, evidenceVersions, summaryDocument, toMarkdown} from '../src/evidence.mjs';
import {toPdf, toZip} from '../scripts/evidence-files.mjs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const publication = read('../data/publication.json');
const releaseStamps = read('../data/release-stamps-1.3.2.json');

test('EVD-1 one bundle per version, newest first, with the published counts', () => {
  const versions = evidenceVersions(publication, releaseStamps);
  assert.deepEqual(versions.map(entry => [entry.version, entry.kind]), [['1.3.2', 'release-stamps'], ['1.3.0', 'prerelease-evidence']]);
  assert.equal(versions[0].headline, '29 release stamped · 16 source-contract verified · 43 not stamped, of 88 capabilities');
  assert.equal(versions[1].headline, '50 pre-release verified · 5 failed or mixed · 33 not yet verified, of 88 capabilities');
  assert.deepEqual(versions[1].releaseIds, ['1.3.0-prerelease-r3', '1.3.0-declared-r2', '1.3.0-declared-r1']);
  assert.equal(versions[0].path, '/evidence/1.3.2/kamiwaza-capabilities-1.3.2');
});

test('EVD-2 stamps for another publication add no version', () => {
  const versions = evidenceVersions(publication, {...releaseStamps, baselineReleaseId: 'not-published'});
  assert.deepEqual(versions.map(entry => entry.version), ['1.3.0']);
});

test('EVD-3 each digest lists every capability once, under exactly one status, with its reading rules', () => {
  for (const entry of evidenceVersions(publication, releaseStamps)) {
    const markdown = toMarkdown(evidenceDocument(entry, publication, releaseStamps));
    const ids = [...markdown.matchAll(/^### .*?`([^`]+)`\)?$/gm)].map(match => match[1]);
    assert.equal(ids.length, 88, entry.version);
    assert.equal(new Set(ids).size, 88, entry.version);
    for (const heading of ['## How to read this file', '## How to answer a capability question from this file', '## Status key', '## About this evidence', '## Summary']) {
      assert.ok(markdown.includes(heading), `${entry.version}: ${heading}`);
    }
    assert.ok(!/<[a-z]/i.test(markdown), 'no raw HTML');
  }
  const stamped = toMarkdown(evidenceDocument(evidenceVersions(publication, releaseStamps)[0], publication, releaseStamps));
  assert.ok(stamped.includes('## Release stamped for v1.3.2 (29)'));
  assert.ok(stamped.includes('## Source-contract verified for v1.3.2 (not runtime evidence) (16)'));
  assert.ok(stamped.includes('## Not stamped for v1.3.2 (43)'));
  assert.ok(stamped.includes('Human release sign-off: no'));
  for (const limit of releaseStamps.limits) assert.ok(stamped.includes(limit), limit);
  assert.ok(stamped.includes('Source-contract tests did not pass: 5 of 16 commands did not meet their expectation'));
});

test('EVD-4 pre-release digest keeps release binding and omissions explicit', () => {
  const entry = evidenceVersions(publication, releaseStamps)[1];
  const markdown = toMarkdown(evidenceDocument(entry, publication, releaseStamps));
  assert.ok(markdown.includes('Release binding: not established.'));
  assert.ok(markdown.includes('## Pre-release verified (not release verified) (50)'));
  const release = publication.releases.find(r => r.id === '1.3.0-prerelease-r3');
  const outside = new Set([...release.omittedCapabilities, ...release.deferredCapabilities]);
  assert.ok(markdown.includes(`## Outside this publication (${outside.size})`));
  assert.ok(!markdown.includes('Release stamped'), 'no v1.3.2 stamp wording in the 1.3.0 digest');
});

test('EVD-5 PDF is well formed, carries text and is deterministic', () => {
  const blocks = evidenceDocument(evidenceVersions(publication, releaseStamps)[0], publication, releaseStamps);
  const pdf = toPdf(blocks, {title: 'T', footer: 'F'});
  assert.deepEqual(pdf, toPdf(blocks, {title: 'T', footer: 'F'}));
  const text = pdf.toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.endsWith('%%EOF\n'));
  const startxref = Number(text.match(/startxref\n(\d+)\n%%EOF\n$/)[1]);
  assert.ok(text.slice(startxref).startsWith('xref\n'));
  const offsets = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map(match => Number(match[1]));
  offsets.forEach((offset, index) => assert.ok(text.slice(offset).startsWith(`${index + 1} 0 obj`), `object ${index + 1}`));
  const pages = Number(text.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)[1]);
  assert.ok(pages > 10);
  // Every page's stream inflates and draws the reading rules on page one.
  const streams = [...text.matchAll(/\/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/g)]
    .map(match => inflateSync(pdf.subarray(match.index + match[0].length, match.index + match[0].length + Number(match[1]))).toString('latin1'));
  assert.equal(streams.length, pages);
  assert.ok(streams[0].includes('(How to read this file)'));
});

test('EVD-6 zip entries round-trip with matching CRC and sizes', () => {
  const files = [{name: 'README.md', data: Buffer.from('# hi\n')}, {name: 'records/a.json', data: Buffer.from('{"a":1}\n'.repeat(50))}];
  const zip = toZip(files);
  assert.deepEqual(zip, toZip(files));
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt16LE(end + 10), files.length);
  let at = zip.readUInt32LE(end + 16);
  for (const file of files) {
    assert.equal(zip.readUInt32LE(at), 0x02014b50);
    const packed = zip.readUInt32LE(at + 20), size = zip.readUInt32LE(at + 24), nameLength = zip.readUInt16LE(at + 28), local = zip.readUInt32LE(at + 42);
    assert.equal(zip.subarray(at + 46, at + 46 + nameLength).toString(), file.name);
    const start = local + 30 + zip.readUInt16LE(local + 26);
    const data = inflateRawSync(zip.subarray(start, start + packed));
    assert.equal(size, file.data.length);
    assert.equal(zip.readUInt32LE(at + 16), crc32(file.data));
    assert.deepEqual(data, file.data);
    at += 46 + nameLength;
  }
});

test('EVD-7 human summary lists every feature once by area, with label counts that add up', () => {
  const expected = {
    '1.3.2': {'Tested on 1.3.2': 29, 'Code tests passed for 1.3.2 (not on a running system)': 16, 'Not yet tested on 1.3.2': 43},
    '1.3.0': {'Tested before release': 33, 'Checked with local tests before release': 17, 'Test failed or mixed': 5, 'Not yet verified': 33},
  };
  for (const entry of evidenceVersions(publication, releaseStamps)) {
    const markdown = toMarkdown(summaryDocument(entry, publication, releaseStamps));
    assert.ok(markdown.startsWith(`# Kamiwaza ${entry.version}: features at a glance`));
    for (const [label, n] of Object.entries(expected[entry.version])) assert.ok(markdown.includes(`- ${label}: ${n}
`), `${entry.version} ${label}`);
    const features = [...markdown.matchAll(/^- \*\*.+?\*\*: (.+?)\.(?: |$)/gm)].map(match => match[1]);
    assert.equal(features.length, 88, entry.version);
    for (const [label, n] of Object.entries(expected[entry.version])) assert.equal(features.filter(text => text === label).length, n, label);
    assert.ok(!/`|\/[a-z-]+\/\{/.test(markdown), 'no code or API paths in the human summary');
    assert.ok(markdown.includes('## Good to know'));
  }
});
