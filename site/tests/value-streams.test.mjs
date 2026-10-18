import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync} from 'node:fs';
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
  assert.equal(pilot.recipe.steps.at(-1).api.status, 'untested');
  assert.equal(pilot.recipe.steps[0].kaizen_ui.status, 'untested');
  const driftedExample = structuredClone(streams);
  driftedExample.exampleSha256 = '0'.repeat(64);
  assert.throws(() => validateStreams(driftedExample, publication), /Public example differs from pinned private source/);
  const promoted = structuredClone(streams);
  promoted.streams.find(row => row.id === 'Analyst:VS2-5').status = 'tested';
  assert.throws(() => validateStreams(promoted, publication), /Whole-stream tested requires a sequence proof contract/);
  promoted.streams.find(row => row.id === 'Analyst:VS2-5').recipe.tested_build = 'build fingerprint ' + 'a'.repeat(64);
  assert.throws(() => validateStreams(promoted, publication), /Whole-stream tested requires a sequence proof contract/);
  assert.equal(validateStreams(streams, {...publication, releases: []}), null);
  const leaked = structuredClone(streams);
  leaked.streams.find(row => row.recipe).recipe.steps[0].api.example = '/Users/operator/private/example.py';
  assert.throws(() => validateStreams(leaked, publication), /Private absolute filesystem path/);
  const privateBuild = structuredClone(streams);
  privateBuild.streams.find(row => row.recipe).recipe.tested_build = 'ghcr.io/internal/core@sha256:abc';
  assert.throws(() => validateStreams(privateBuild, publication), /Invalid public tested-build fingerprint/);
  const falseUi = structuredClone(streams);
  falseUi.streams.find(row => row.recipe).recipe.steps[0].kaizen_ui.status = 'tested';
  assert.throws(() => validateStreams(falseUi, publication), /Tested Kaizen UI path requires an operation proof contract/);
  const unscopedApi = structuredClone(streams);
  unscopedApi.streams.find(row => row.recipe).recipe.steps[0].historical_observation = null;
  assert.throws(() => validateStreams(unscopedApi, publication), /scoped passing observation/);
  const falseDeploy = structuredClone(streams);
  const deploy = falseDeploy.streams.find(row => row.recipe).recipe.steps.at(-1);
  deploy.api.status = 'tested';
  deploy.historical_observation = '1.3.2 local api component: passed. No release binding or whole-stream credit.';
  assert.throws(() => validateStreams(falseDeploy, publication), /differs from reviewed kit export/);
});

test('one source snapshot supplies the human recipe and the complete ZIP JSON', () => {
  const entry = evidenceVersions(publication, null).find(row => row.version === '1.3.0');
  const markdown = toMarkdown(salesKitDocument(entry, publication, null, null, streams));
  assert.match(markdown, /Value streams and implementation paths/);
  assert.match(markdown, /Whole-stream status: untested/);
  assert.match(markdown, /Kaizen UI path: untested/);
  assert.match(markdown, /deployment timed out/i);
  assert.match(markdown, /connector-builder-import-test-generate\.py/);
  const out = mkdtempSync(join(tmpdir(), 'value-stream-zip-'));
  emitBundles(publication, out);
  const stamps = data('release-stamps-1.3.2');
  writeFileSync(join(out, 'release-stamps-1.3.2.json'), JSON.stringify(stamps));
  emitEvidence(publication, stamps, out, data('descriptions').descriptions, data('sales-guidance'), streams);
  const zip = readFileSync(join(out, 'evidence/1.3.0/kamiwaza-capabilities-1.3.0.zip'));
  assert.deepEqual(JSON.parse(zipEntry(zip, 'machine-readable/value-stream-recipes.json')), streams);
  assert.match(zipEntry(zip, 'examples/connector-builder-import-test-generate.py').toString(), /Deployment was not attempted/);
  assert.equal(JSON.parse(readFileSync(join(out, 'evidence/1.3.0/value-stream-recipes.json'))).streams.length, 25);
  assert.doesNotMatch(zipEntry(zip, 'machine-readable/value-stream-recipes.json').toString(), /(?:reports|probes|verification)\//);
  assert.doesNotMatch(markdown, /(?:reports|probes|verification)\//);
  for (const version of ['1.2.1', '1.3.2']) {
    const other = readFileSync(join(out, `evidence/${version}/kamiwaza-sales-dev-kit-${version}.md`), 'utf8');
    assert.ok(!other.includes('Analyst:VS2-5'), `1.3.0 recipe leaked into ${version}`);
    assert.ok(!readFileSync(join(out, `evidence/${version}/kamiwaza-capabilities-${version}.zip`)).includes(Buffer.from('value-stream-recipes.json')));
  }
});

// The typed contract is intentionally dormant until a separate review pins
// the exact projection hash. These synthetic links are never capability credit.
function typedFixture() {
  const typed = structuredClone(streams);
  const source = publication.releases.find(row => row.id === '1.3.0-prerelease-r3');
  typed.schema = 'public-value-stream-recipes.v3';
  typed.release = source.version;
  typed.publicationRevision = source.publicationRevision;
  typed.source.kitCommit = source.sourceRevision;
  typed.claimLinks = [];
  for (const stream of typed.streams) {
    if (!stream.recipe) continue;
    stream.recipe.sha256 = 'a'.repeat(64);
    for (const step of stream.recipe.steps) for (const capabilityId of step.capability_ids) {
      typed.claimLinks.push({streamId: stream.id, recipeRevision: stream.recipe.revision,
        recipeSha256: stream.recipe.sha256, stepId: step.id, capabilityId, role: 'uses', basis: null});
    }
  }
  return typed;
}
test('typed recipe links validate as ingredients but remain unpublished without a reviewed projection hash', () => {
  const typed = typedFixture();
  assert.equal(validateStreams(typed, publication), null);
  const first = typed.claimLinks[0];
  first.role = 'verifies';
  first.basis = 'A reviewed recipe link; not an effective capability verdict.';
  assert.equal(validateStreams(typed, publication), null);
  const entry = evidenceVersions(publication, null).find(row => row.version === typed.release);
  const markdown = toMarkdown(salesKitDocument(entry, publication, null, null, typed));
  assert.match(markdown, /Capability links:/);
  assert.match(markdown, /effective credit comes only from the published capability verdict/);
});
for (const [name, change, reason] of [
  ['missing step link', x => x.claimLinks.pop(), /links are incomplete/],
  ['unreviewed capability', x => x.claimLinks[0].capabilityId = 'private.unknown', /outside a reviewed step/],
  ['ingredient claims proof', x => x.claimLinks[0].basis = 'Proof of full capability', /Ingredient link cannot claim proof/],
  ['verifies link lacks basis', x => { x.claimLinks[0].role = 'verifies'; x.claimLinks[0].basis = null; }, /Invalid text/],
  ['private link basis', x => { x.claimLinks[0].role = 'verifies'; x.claimLinks[0].basis = '/home/private/receipt'; }, /Unsafe stream prose/],
  ['wrong source commit', x => x.source.kitCommit = 'f'.repeat(40), /source and publication revision differ/],
  ['wrong publication revision', x => x.publicationRevision++, /source and publication revision differ/],
  ['unreviewed whole stream pass', x => x.streams.find(row => row.recipe).status = 'tested', /Whole-stream tested requires/],
]) test('typed stream contract rejects ' + name, () => {
  const x = typedFixture(); change(x); assert.throws(() => validateStreams(x, publication), reason);
});
