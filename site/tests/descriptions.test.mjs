import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {plain, projectDescriptions, serialize, validateDescriptions} from '../scripts/project-descriptions.mjs';
import {curatedIds} from '../src/evidence.mjs';

const raw = readFileSync(new URL('../data/descriptions.json', import.meta.url), 'utf8');
const publication = JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8'));
const published = new Set(publication.releases.flatMap(release => release.capabilities.map(cap => cap.id)));
const copy = () => JSON.parse(raw);
const curated = curatedIds(publication);
const uncurated = Array.from(published).filter(id => !curated.has(id)).sort();

test('DSC-1 the published descriptions validate, name curated published capabilities only and are plain text', () => {
  const data = validateDescriptions(copy(), publication);
  assert.ok(Object.keys(data.descriptions).length > 0);
  for (const [id, description] of Object.entries(data.descriptions)) {
    assert.ok(published.has(id), id);
    assert.ok(curated.has(id), id);
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

const UNSAFE = [
  ['a Linear URL', 'Tracked in https://linear.app/kamiwaza/issue/ENG-1234 until release.', /internal tracker/],
  ['a password variable name', 'Set KAMIWAZA_ADMIN_PASSWORD before the first sign-in.', /secret variable name/],
  ['a private IP address', 'The gateway listens on 10.0.12.4 inside the cluster.', /IP address/],
  ['an image digest', 'Runs kamiwaza-core@sha256:0123456789abcdef0123456789abcdef.', /image digest/],
  ['a registry reference', 'Pull ghcr.io/kamiwaza-internal/core before installing.', /container registry/],
];
for (const [name, value, reason] of UNSAFE) test('DSC-2 rejects ' + name, () => {
  const data = copy();
  data.descriptions[Object.keys(data.descriptions)[0]] = value;
  assert.throws(() => validateDescriptions(data, publication), reason);
});

test('DSC-2 rejects a description for a published id without a curated source declaration', () => {
  const data = copy();
  data.descriptions[uncurated[0]] = 'A plain sentence.';
  assert.throws(() => validateDescriptions(data, publication), new RegExp('without a curated source declaration: ' + uncurated[0].replaceAll('.', '\\.')));
});

test('DSC-4 the projector reads curated ids at the pinned commit, first paragraph only, and drops unsafe records', () => {
  const kit = mkdtempSync(join(tmpdir(), 'descriptions-kit-'));
  mkdirSync(join(kit, 'capabilities'));
  const git = (...args) => execFileSync('git', ['-C', kit, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', ...args], {encoding: 'utf8'});
  git('init', '-q');
  const record = (id, body) => writeFileSync(join(kit, 'capabilities', id + '.md'), `---\nid: ${id}\ntitle: T\nnot_supported:\n- Front matter stays private.\n---\n\n# T\n\n${body}`);
  const [described, noIntro, noRecord, unsafe, changed] = Array.from(curated).sort();
  const omittedOnly = publication.releases.flatMap(release => release.omittedCapabilities ?? []).find(id => !published.has(id));
  assert.ok(omittedOnly, 'fixture needs an id that is only ever omitted');
  record(described, 'Kamiwaza **decides** where a model\nruns, see [the guide](https://example.invalid/guide) and `security_marking`, _deliberately_.\n\nSecond paragraph stays private.\n\n## Supported operations\n\n- op-one\n');
  record(noIntro, '## Supported operations\n\n- op-one\n');
  record(unsafe, UNSAFE[0][1] + '\n');
  record(changed, 'Committed text.\n');
  record(uncurated[0], 'An uncurated capability is never read.\n');
  record(omittedOnly, 'An omitted capability is never published.\n\n## Supported operations\n');
  record('synthetic.not-in-publication', 'Not in the publication at all.\n');
  git('add', '.'); git('commit', '-q', '-m', 'records');
  const commit = git('rev-parse', 'HEAD').trim();
  record(changed, 'Working-tree text is not the pinned commit.\n');
  const {data, dropped} = projectDescriptions(kit, publication, commit);
  assert.deepEqual(data.descriptions, {[described]: 'Kamiwaza decides where a model runs, see the guide and security_marking, deliberately.', [changed]: 'Committed text.'});
  assert.ok(!Object.hasOwn(data.descriptions, noRecord));
  assert.equal(data.source.kitCommit, commit);
  assert.deepEqual(dropped.find(item => item.id === unsafe), {id: unsafe, reason: 'unsafe public text: internal tracker or repository reference'});
  assert.match(dropped.find(item => item.id === uncurated[0]).reason, /no curated source declaration/);
  for (const missing of [noIntro, noRecord]) assert.match(dropped.find(item => item.id === missing)?.reason ?? '', /no record or no introductory paragraph/);
  assert.equal(dropped.length + Object.keys(data.descriptions).length, published.size);
  assert.equal(plain('Keeps snake_case_names and 2 * 3 * 4 intact.'), 'Keeps snake_case_names and 2 * 3 * 4 intact.');
  assert.throws(() => projectDescriptions(kit, publication, 'f'.repeat(40)));
});

const kitDir = process.env.KIT_CHECKOUT ?? new URL('../../../capability-kit', import.meta.url).pathname;
test('DSC-5 projection regenerates data/descriptions.json byte for byte from the kit checkout',
  {skip: existsSync(kitDir + '/capabilities') ? false : 'kit checkout not present (expected in CI); set KIT_CHECKOUT to its directory to run'}, () => {
    assert.equal(serialize(projectDescriptions(kitDir, publication).data), raw);
  });
