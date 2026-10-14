import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {plain, projectDescriptions, serialize, validateDescriptions} from '../scripts/project-descriptions.mjs';

const raw = readFileSync(new URL('../data/descriptions.json', import.meta.url), 'utf8');
const publication = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8'));
const published = new Set(publication.releases.flatMap(release => release.capabilities.map(cap => cap.id)));
const copy = () => JSON.parse(raw);

test('DSC-1 the published descriptions validate, name published capabilities only and are plain text', () => {
  const data = validateDescriptions(copy(), publication);
  assert.ok(Object.keys(data.descriptions).length > 0);
  for (const [id, description] of Object.entries(data.descriptions)) {
    assert.ok(published.has(id), id);
    assert.ok(!/`|\*\*|\]\(/.test(description), id);
  }
});

for (const [name, mutate, reason] of [
  ['an unknown field', data => { data.reviewer = 'someone'; }, /Unexpected or missing fields/],
  ['an unknown source field', data => { data.source.path = 'capabilities'; }, /Unexpected or missing fields/],
  ['an id outside the publication', data => { data.descriptions['synthetic.not-published'] = 'Text.'; }, /outside the publication: synthetic.not-published/],
  ['a non-string value', data => { data.descriptions[Object.keys(data.descriptions)[0]] = {text: 'Text.'}; }, /Invalid text/],
  ['an empty value', data => { data.descriptions[Object.keys(data.descriptions)[0]] = ' '; }, /Invalid text/],
  ['a private-looking value', data => { data.descriptions[Object.keys(data.descriptions)[0]] = 'See /Users/reviewer/kit/notes.md for details.'; }, /Private absolute filesystem path/],
  ['an unpinned kit commit', data => { data.source.kitCommit = 'main'; }, /pin a commit/],
]) test('DSC-2 rejects ' + name, () => {
  const data = copy();
  mutate(data);
  assert.throws(() => validateDescriptions(data, publication), reason);
});

test('DSC-3 descriptions projected against another publication do not apply', () => {
  assert.equal(validateDescriptions({...copy(), baselineReleaseId: 'not-published'}, publication), null);
});

test('DSC-4 the projector publishes the first paragraph only, as plain text, for published ids only', () => {
  const kit = mkdtempSync(join(tmpdir(), 'descriptions-kit-'));
  mkdirSync(join(kit, 'capabilities'));
  const record = (id, body) => writeFileSync(join(kit, 'capabilities', id + '.md'), `---\nid: ${id}\ntitle: T\nnot_supported:\n- Front matter stays private.\n---\n\n# T\n\n${body}`);
  const [described, noIntro, noRecord] = Array.from(published).sort();
  const omittedOnly = publication.releases.flatMap(release => release.omittedCapabilities ?? []).find(id => !published.has(id));
  assert.ok(omittedOnly, 'fixture needs an id that is only ever omitted');
  record(described, 'Kamiwaza **decides** where a model\nruns, see [the guide](https://example.invalid/guide) and `security_marking`, _deliberately_.\n\nSecond paragraph stays private.\n\n## Supported operations\n\n- op-one\n');
  record(noIntro, '## Supported operations\n\n- op-one\n');
  record(omittedOnly, 'An omitted capability is never published.\n\n## Supported operations\n');
  record('synthetic.not-in-publication', 'Not in the publication at all.\n');
  const data = projectDescriptions(kit, publication);
  assert.deepEqual(data.descriptions, {[described]: 'Kamiwaza decides where a model runs, see the guide and security_marking, deliberately.'});
  assert.ok(!Object.hasOwn(data.descriptions, noRecord));
  assert.match(data.source.kitCommit, /^[a-f0-9]{40}$/);
  assert.equal(plain('Keeps snake_case_names and 2 * 3 * 4 intact.'), 'Keeps snake_case_names and 2 * 3 * 4 intact.');
});

const kitDir = process.env.KIT_CHECKOUT ?? new URL('../../../capability-kit', import.meta.url).pathname;
test('DSC-5 projection regenerates data/descriptions.json byte for byte from the kit checkout',
  {skip: existsSync(kitDir + '/capabilities') ? false : 'kit checkout not present (expected in CI); set KIT_CHECKOUT to its directory to run'}, () => {
    assert.equal(serialize(projectDescriptions(kitDir, publication)), raw);
  });
