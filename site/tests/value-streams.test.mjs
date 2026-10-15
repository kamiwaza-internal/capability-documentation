import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inflateRawSync} from 'node:zlib';
import {validateStreams} from '../scripts/value-streams.mjs';
import {emitBundles, emitEvidence} from '../scripts/published-bundles.mjs';
import {salesKitDocument} from '../src/sales-kit.mjs';
import {evidenceVersions, toMarkdown} from '../src/evidence.mjs';

const data = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url)));
const publication = data('publication'), streams = data('value-streams');

function zipEntry(bytes, wanted) {
  for (let offset = 0; bytes.readUInt32LE(offset) === 0x04034b50;) {
    const size = bytes.readUInt32LE(offset + 18), nameSize = bytes.readUInt16LE(offset + 26);
    const extraSize = bytes.readUInt16LE(offset + 28), start = offset + 30 + nameSize + extraSize;
    const name = bytes.subarray(offset + 30, offset + 30 + nameSize).toString();
    if (name === wanted) return inflateRawSync(bytes.subarray(start, start + size));
    offset = start + size;
  }
  throw new Error(`Missing ZIP entry: ${wanted}`);
}

test('stream sidecar keeps 25 gaps visible and cannot promote a component test to a stream', () => {
  assert.equal(validateStreams(streams, publication)?.streams.length, 25);
  assert.equal(streams.streams.filter(row => row.recipe).length, 1);
  const pilot = streams.streams.find(row => row.id === 'Analyst:VS2-5');
  assert.equal(pilot.status, 'untested');
  assert.equal(pilot.recipe.steps.at(-1).api.status, 'partial');
  assert.equal(pilot.recipe.steps[0].kaizen_ui.status, 'untested');
  const promoted = structuredClone(streams);
  promoted.streams.find(row => row.id === 'Analyst:VS2-5').status = 'tested';
  assert.throws(() => validateStreams(promoted, publication), /Tested stream needs a build/);
  promoted.streams.find(row => row.id === 'Analyst:VS2-5').recipe.tested_build = '1.3.2 local';
  assert.throws(() => validateStreams(promoted, publication), /Tested stream has an untested path/);
  assert.equal(validateStreams(streams, {...publication, releases: []}), null);
  const leaked = structuredClone(streams);
  leaked.streams.find(row => row.recipe).recipe.steps[0].api.example = '/Users/operator/private/example.py';
  assert.throws(() => validateStreams(leaked, publication), /Private absolute filesystem path/);
});

test('one source snapshot supplies the human recipe and the complete ZIP JSON', () => {
  const entry = evidenceVersions(publication, null).find(row => row.version === '1.3.0');
  const markdown = toMarkdown(salesKitDocument(entry, publication, null, null, streams));
  assert.match(markdown, /Value streams and implementation paths/);
  assert.match(markdown, /Whole-stream status: untested/);
  assert.match(markdown, /Kaizen UI path: untested/);
  assert.match(markdown, /deployment timed out/i);
  const out = mkdtempSync(join(tmpdir(), 'value-stream-zip-'));
  emitBundles(publication, out);
  emitEvidence(publication, null, out, data('descriptions').descriptions, data('sales-guidance'), streams);
  const zip = readFileSync(join(out, 'evidence/1.3.0/kamiwaza-capabilities-1.3.0.zip'));
  assert.deepEqual(JSON.parse(zipEntry(zip, 'machine-readable/value-stream-recipes.json')), streams);
  assert.equal(JSON.parse(readFileSync(join(out, 'evidence/1.3.0/value-stream-recipes.json'))).streams.length, 25);
  assert.ok(!zip.toString().includes('reports/eng-13825'));
});
