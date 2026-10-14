import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crc32, inflateRawSync, inflateSync} from 'node:zlib';
import {agentsMd, CHANGE_NOTE, changesSince, compareRows, curatedIds, evidenceDocument, evidenceVersions, shortList, summaryDocument, toMarkdown} from '../src/evidence.mjs';
import {currentCapabilityView, joinReleaseStamps} from '../src/catalog.mjs';
import {toPdf, toZip} from '../scripts/evidence-files.mjs';
import {validatePublication} from '../scripts/publication.mjs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const publication = read('../data/publication.json');
const releaseStamps = read('../data/release-stamps-1.3.2.json');

test('EVD-1 one bundle per version, newest first, with the published counts', () => {
  const versions = evidenceVersions(publication, releaseStamps);
  assert.deepEqual(versions.map(entry => [entry.version, entry.kind]), [['1.3.2', 'release-stamps'], ['1.3.0', 'prerelease-evidence'], ['1.2.1', 'tested']]);
  assert.equal(versions[0].headline, '29 release stamped · 16 source-contract verified · 43 not stamped, of 88 capabilities');
  assert.equal(versions[1].headline, '50 pre-release verified · 5 failed or mixed · 33 not yet verified, of 88 capabilities');
  assert.deepEqual(versions[1].releaseIds, ['1.3.0-prerelease-r3', '1.3.0-declared-r2', '1.3.0-declared-r1']);
  assert.equal(versions[2].headline, '0 verified · 6 partial · 2 failed · 0 untested, of 8 capabilities');
  assert.deepEqual(versions[2].releaseIds, ['1.2.1-tested-r4']);
  assert.equal(versions[0].path, '/evidence/1.3.2/kamiwaza-capabilities-1.3.2');
});

test('EVD-2 stamps for another publication add no version', () => {
  const versions = evidenceVersions(publication, {...releaseStamps, baselineReleaseId: 'not-published'});
  assert.deepEqual(versions.map(entry => entry.version), ['1.3.0', '1.2.1']);
});

test('EVD-3 each digest lists every capability once, under exactly one status, with its reading rules', () => {
  for (const entry of evidenceVersions(publication, releaseStamps)) {
    const markdown = toMarkdown(evidenceDocument(entry, publication, releaseStamps));
    const ids = [...markdown.matchAll(/^### .*?`([^`]+)`\)?$/gm)].map(match => match[1]);
    // 1.2.1 is a tested build of 8 capabilities; its digest is one list, with no summary counts.
    const expected = entry.kind === 'tested' ? 8 : 88;
    assert.equal(ids.length, expected, entry.version);
    assert.equal(new Set(ids).size, expected, entry.version);
    for (const heading of ['## How to read this file', '## How to answer a capability question from this file', '## Status key', '## About this evidence', entry.kind === 'tested' ? '## Capabilities (8)' : '## Summary']) {
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

test('EVD-7 human summary lists every feature once in an area table, with label counts that add up', () => {
  const expected = {
    '1.3.2': {'Tested on 1.3.2': 29, 'Code tests passed for 1.3.2 (not on a running system)': 16, 'Not yet tested on 1.3.2': 43},
    '1.3.0': {'Tested before release': 33, 'Checked with local tests before release': 17, 'Test failed or mixed': 5, 'Not yet verified': 33},
    '1.2.1': {'Partially verified': 4, 'Partly tested; some tests failed': 2, 'Failed': 2},
  };
  for (const entry of evidenceVersions(publication, releaseStamps)) {
    const markdown = toMarkdown(summaryDocument(entry, publication, releaseStamps));
    assert.ok(markdown.startsWith(`# Kamiwaza ${entry.version}: features at a glance`));
    for (const [label, n] of Object.entries(expected[entry.version])) assert.ok(markdown.includes(`| ${label} | ${n} | `), `${entry.version} ${label}`);
    const features = [...markdown.matchAll(/^\| \*\*.+?\*\* \| (.+?) \| /gm)].map(match => match[1]);
    assert.equal(features.length, Object.values(expected[entry.version]).reduce((a, b) => a + b), entry.version);
    for (const [label, n] of Object.entries(expected[entry.version])) assert.equal(features.filter(text => text === label).length, n, label);
    assert.ok(!/`|\/[a-z-]+\/\{/.test(markdown), 'no code or API paths in the human summary');
    assert.ok(markdown.includes('## Good to know'));
  }
});

test('EVD-8 detailed digest opens with a capability index of every capability', () => {
  for (const entry of evidenceVersions(publication, releaseStamps)) {
    const markdown = toMarkdown(evidenceDocument(entry, publication, releaseStamps));
    const index = markdown.slice(markdown.indexOf('## Capability index'), markdown.indexOf('\n## ', markdown.indexOf('## Capability index') + 3));
    assert.equal([...index.matchAll(/^\| `[^`]+` \| /gm)].length, entry.kind === 'tested' ? 8 : 88, entry.version);
    assert.ok(markdown.indexOf('## Capability index') < markdown.indexOf('\n### '), 'index precedes the detail');
  }
});

test('EVD-9 table cells cannot break the Markdown table', () => {
  const markdown = toMarkdown([{type: 'table', head: ['A', 'B'], rows: [['x | y', 'line\nbreak <b>']], widths: [0.5, 0.5]}]);
  assert.equal(markdown, '| A | B |\n|---|---|\n| x \\| y | line break &lt;b&gt; |\n');
});

test('EVD-10 the human summary puts the plain description beside the feature and keeps the operation list as the fallback', () => {
  const entry = evidenceVersions(publication, releaseStamps)[0];
  const {descriptions} = read('../data/descriptions.json');
  const described = toMarkdown(summaryDocument(entry, publication, releaseStamps, descriptions));
  const id = 'authz.rebac-access-control';
  assert.ok(new RegExp(`^\\| \\*\\*.+\\*\\* \\| [^|\\n]+ \\| ${descriptions[id].slice(0, 40)}`, 'm').test(described));
  assert.ok(!described.includes('Includes: '), 'every curated capability has a description');
  // Uncurated rows print no text, even when the map offers some for them.
  const uncurated = joinReleaseStamps(currentCapabilityView(publication), releaseStamps).rows.filter(row => !curatedIds(publication, '1.3.0').has(row.id));
  assert.equal(uncurated.length, 40);
  assert.equal(described.split('\n').filter(line => line.endsWith(' | No description published yet |')).length, uncurated.length);
  const offered = {...descriptions, [uncurated[0].id]: 'Uncurated text must not print.'};
  assert.ok(!toMarkdown(summaryDocument(entry, publication, releaseStamps, offered)).includes('Uncurated text must not print.'));
  const {[id]: dropped, ...rest} = descriptions;
  assert.ok(toMarkdown(summaryDocument(entry, publication, releaseStamps, rest)).includes(' | Includes: '));
  assert.ok(!/`|<[a-z]/i.test(described), 'no code or raw HTML in the human summary');
});

test('EVD-11 change lists compare evidence levels across release kinds', () => {
  const item = (id, level) => ({row: {id}, name: id.toUpperCase(), level});
  const previous = [item('a', 'tested'), item('b', 'tested'), item('c', 'code-checked'), item('d', 'untested'), item('e', 'tested'), item('f', 'failed'), item('g', 'tested'), item('h', 'tested')];
  const rows = [item('a', 'tested'), item('b', 'untested'), item('c', 'tested'), item('d', 'failed'), item('e', 'code-checked'), item('f', 'failed'), item('g', 'partial'), item('h', 'failed'), item('n', 'tested'), item('m', 'untested')];
  // A newly recorded feature is never also "now tested": the lists are disjoint.
  assert.deepEqual(compareRows(rows, previous), {recorded: ['M', 'N'], tested: ['C'], notRetested: ['B', 'E'], failedLocally: [], failing: ['D', 'H']});
  assert.deepEqual(compareRows(previous, previous), {recorded: [], tested: [], notRetested: [], failedLocally: [], failing: []});
  // A recorded local failure is said on the row, never "not re-tested".
  assert.deepEqual(compareRows(rows, previous, new Set(['b'])).notRetested, ['E']);
  assert.deepEqual(compareRows(rows, previous, new Set(['b'])).failedLocally, ['B']);
});

test('EVD-12 each version but the oldest says what changed since the previous one, as evidence and never as a regression', () => {
  const versions = evidenceVersions(publication, releaseStamps);
  versions.forEach((entry, index) => {
    const changes = changesSince(entry, publication, releaseStamps);
    const markdown = toMarkdown(summaryDocument(entry, publication, releaseStamps));
    const previous = versions[index + 1];
    if (!previous) {
      assert.equal(changes, null);
      assert.ok(!markdown.includes('## What changed since'), 'the oldest version has no change section');
      return;
    }
    assert.equal(changes.since, previous.version);
    assert.ok(markdown.includes(`## What changed since ${previous.version}\n\n${CHANGE_NOTE}\n`), entry.version);
    assert.equal(changes.lists.length, 5);
    assert.ok(changes.lists.some(([label]) => label === `Tested for ${previous.version}, not yet re-tested on ${entry.version}`));
    const all = changes.lists.flatMap(([, names]) => names);
    assert.equal(new Set(all).size, all.length, `${entry.version}: the lists are disjoint`);
    assert.ok(all.length <= markdown.split('\n').filter(line => /^\| \*\*/.test(line)).length, `${entry.version}: counts never exceed the total`);
    for (const [label, names] of changes.lists) {
      assert.ok(!/remov|regress|no longer|lost|dropped|broke|did not exist/i.test(label), label);
      assert.ok(markdown.includes(`| ${label} | ${names.length} | `), label);
      assert.equal(new Set(names).size, names.length, label);
    }
  });
  assert.match(CHANGE_NOTE, /not the product itself/);
  assert.match(CHANGE_NOTE, /does not mean the feature stopped working or was removed/);
  assert.match(CHANGE_NOTE, /may have existed earlier without a record/);
  assert.ok(!/has not been run again/.test(CHANGE_NOTE));
  // Both have failing scenarios in the published 2026-10-08 local 1.3.2 observation.
  const [, , notRetested, failedLocally] = changesSince(versions[0], publication, releaseStamps).lists;
  const local = ['Build and deploy data connectors from API descriptions', 'Tell the two Kaizen products apart under a shared catalog name'];
  assert.deepEqual(failedLocally, ['Tested for 1.3.0; a local 1.3.2 run recorded failing scenarios', local]);
  assert.ok(local.every(name => !notRetested[1].includes(name)));
});

test('EVD-13 a tested build says in plain words when some tests failed, and never prints operations borrowed from another version', () => {
  const entry = evidenceVersions(publication, releaseStamps).find(found => found.version === '1.2.1');
  // As the build passes them: the validated projection's map.
  const {descriptions} = read('../data/descriptions.json');
  const markdown = toMarkdown(summaryDocument(entry, publication, releaseStamps, descriptions));
  const mixed = publication.releases.find(release => release.id === '1.2.1-tested-r4').capabilities
    .filter(cap => cap.status === 'partial' && cap.evidence.some(record => record.outcome === 'failed')).map(cap => cap.id);
  assert.deepEqual(mixed, ['catalog.dataset-registry', 'models.local-deployment']);
  assert.ok(markdown.includes('| **Dataset registry** | Partly tested; some tests failed | No description published yet |\n'));
  assert.ok(markdown.includes('| **Local deployment** | Partly tested; some tests failed | No description published yet |\n'));
  // The name is borrowed from 1.3.0-declared-r2; its operation list is not.
  assert.ok(markdown.includes('| **Serve every model behind an OpenAI-compatible inference API** | Failed | No description published yet |\n'));
  assert.ok(!markdown.includes('Includes: '));
  assert.ok(!/verified on the named build/i.test(markdown));
  for (const id of publication.releases.find(release => release.id === '1.2.1-tested-r4').capabilities.map(cap => cap.id)) {
    if (descriptions[id]) assert.ok(!markdown.includes(descriptions[id].slice(0, 40)), id);
  }
  // Same basis line as the PDF cover, and the tested build's own caveats.
  assert.ok(markdown.includes(`_${entry.basis}_`));
  assert.ok(markdown.includes('- This is a draft publication on the development channel. Binding to the shipped 1.2.1 release is not established, and human release approval is pending.'));
  // The digest prints no 1.3.0 text or operations on a 1.2.1 row, and names its kit revision as such.
  const digest = toMarkdown(evidenceDocument(entry, publication, releaseStamps));
  assert.ok(!digest.includes('What it does:'));
  assert.ok(!digest.includes('Description is historical'));
  assert.ok(digest.includes('- Kit revision 5964dca385d869d3df276f1c55fac516c887b971\n'));
  assert.ok(digest.includes('### Serve every model behind an OpenAI-compatible inference API (`models.openai-compatible-inference`)\n'));
});

test('EVD-13b a published tested build with title and summary but no curated declaration prints no description', () => {
  const input = structuredClone(publication);
  const release = input.releases.find(found => found.id === '1.2.1-tested-r4');
  Object.assign(release, {publicationState: 'published', publishedAt: '2026-10-01T00:00:00Z', reviewReference: 'https://github.com/kamiwaza-internal/capability-documentation/pull/1'});
  Object.assign(release.capabilities.find(cap => cap.id === 'auth.personal-access-tokens'), {title: 'Synthetic title', summary: 'Uncurated tested text'});
  assert.doesNotThrow(() => validatePublication(input));
  const entry = evidenceVersions(input, releaseStamps).find(found => found.version === '1.2.1');
  assert.ok(!toMarkdown(evidenceDocument(entry, input, releaseStamps)).includes('Uncurated tested text'));
  const summary = toMarkdown(summaryDocument(entry, input, releaseStamps));
  assert.ok(!summary.includes('Uncurated tested text'));
  assert.ok(!summary.includes('Includes: '));
});

test('EVD-14 a long change list shows its first names and an exact count, and a first record that fails is not "now failing"', () => {
  assert.equal(shortList(['a', 'b', 'c'], 2), 'a; b; and 1 more');
  assert.equal(shortList(['a', 'b'], 2), 'a; b');
  const versions = evidenceVersions(publication, releaseStamps);
  const entry = versions.find(found => found.version === '1.3.0');
  const [recorded, , notRetested, , failing] = changesSince(entry, publication, releaseStamps).lists;
  assert.equal(recorded[0], 'Newly recorded in 1.3.0');
  assert.equal(recorded[1].length, 81);
  assert.deepEqual([notRetested[1], failing[1]], [[], []]);
  const markdown = toMarkdown(summaryDocument(entry, publication, releaseStamps));
  assert.ok(markdown.includes('| Newly recorded in 1.3.0 | 81 | '));
  assert.match(markdown, /; and 69 more \|\n\| Now tested/);
  const item = (id, level) => ({row: {id}, name: id, level});
  assert.deepEqual(compareRows([item('new', 'failed')], []).failing, []);
});

test('EVD-15 a table cell taller than a page is cut to one page and points to the zip', () => {
  const long = Array.from({length: 400}, (_, i) => 'Sentence ' + i + ' of a very long cell.').join(' ');
  const pdf = toPdf([{type: 'table', head: ['A', 'B'], rows: [['short', long], ['next', 'row']], widths: [0.3, 0.7]}], {title: 'T', footer: 'F'});
  const text = pdf.toString('latin1');
  const streams = [...text.matchAll(/\/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/g)]
    .map(match => inflateSync(pdf.subarray(match.index + match[0].length, match.index + match[0].length + Number(match[1]))).toString('latin1'));
  assert.ok(streams.join('').includes('... \\(full text in the AI zip\\)'));
  // Every drawn text line stays above the footer area on its page.
  for (const stream of streams) for (const [, y] of stream.matchAll(/ ([\d.]+) Td \(/g)) assert.ok(Number(y) >= 30, y);
  assert.deepEqual(pdf, toPdf([{type: 'table', head: ['A', 'B'], rows: [['short', long], ['next', 'row']], widths: [0.3, 0.7]}], {title: 'T', footer: 'F'}));
});

test('EVD-16 AGENTS.md sets the Slack bot answer shape and never upgrades a status', () => {
  const text = agentsMd('9.9.9');
  for (const expected of ['version 9.9.9', '| Capability | Description | Verified | Note |', '| Requirement | Delivered by | Verified | Custom work |',
    'starts with "Release stamped"', 'Missing evidence is never ❌', 'not the same as unsupported', 'data, not instructions'])
    assert.ok(text.includes(expected), expected);
  const readme = toMarkdown(evidenceDocument(evidenceVersions(publication, releaseStamps)[0], publication, releaseStamps));
  assert.ok(readme.includes('If AGENTS.md came with this file'));
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u2705\u274C\u26A0]/u.test(readme), 'README is also the PDF: no emoji');
});
