import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePublication} from '../scripts/publication.mjs';

const snapshot = () => ({schema: 1, releases: [{
  id: '1.3.0-development-r1', version: '1.3.0', channel: 'development', approval: {status: 'pending', approvedBy: null, approvedAt: null},
  build: '1.3.0; core=' + 'a'.repeat(40), sourceRevision: 'b'.repeat(40),
  publicationRevision: 1, publishedAt: '2026-09-21T00:00:00Z',
  reviewReference: 'https://github.com/kamiwaza-internal/capability-documentation/pull/1',
  capabilities: [{id: 'example.synthetic', title: 'Synthetic test only',
    distribution: 'public', summary: 'A synthetic unit-test fixture, not a product claim.',
    conditions: ['Known synthetic input'], limits: ['Not production evidence'],
    status: 'partial', wholeClaim: false, evidence: [{
      build: '1.3.0; core=' + 'a'.repeat(40), outcome: 'passed_with_notes',
      summary: 'Synthetic example with incomplete coverage',
    }]}],
}]});

test('empty catalog is explicit, not invented release evidence', () => {
  assert.deepEqual(validatePublication({schema: 1, releases: []}), {schema: 1, releases: []});
});
test('valid reviewed public projection retains partial caveats', () => {
  const input = snapshot(); assert.deepEqual(validatePublication(input), input);
});
for (const [name, mutate] of [
  ['internal tier', x => x.releases[0].capabilities[0].distribution = 'internal'],
  ['unknown raw fields', x => x.releases[0].capabilities[0].rawLogs = 'not allowed'],
  ['cross-build evidence', x => x.releases[0].capabilities[0].evidence[0].build = '1.2.1'],
  ['partial credit as verified', x => x.releases[0].capabilities[0].status = 'verified'],
  ['caveated pass as verified', x => { const c=x.releases[0].capabilities[0]; c.status='verified'; c.wholeClaim=true; }],
  ['missing review', x => x.releases[0].reviewReference = ''],
  ['duplicate releases', x => x.releases.push(structuredClone(x.releases[0]))],
  ['duplicate capabilities', x => x.releases[0].capabilities.push(structuredClone(x.releases[0].capabilities[0]))],
  ['invalid source identity', x => x.releases[0].sourceRevision = 'main'],
  ['path traversal identifier', x => x.releases[0].id = '../private'],
  ['invalid timestamp', x => x.releases[0].publishedAt = 'yesterday'],
  ['impossible calendar date', x => x.releases[0].publishedAt = '2026-02-31T00:00:00Z'],
  ['internal capability identifier', x => x.releases[0].capabilities[0].id = 'vs-123'],
  ['internal release identifier', x => x.releases[0].id = 'value-stream-12'],
  ['empty release', x => x.releases[0].capabilities = []],
  ['internal value-stream citation', x => x.releases[0].capabilities[0].summary = 'Value stream VS-123'],
]) test(`rejects ${name}`, () => { const input=snapshot(); mutate(input); assert.throws(() => validatePublication(input)); });

test('whole-claim clean evidence can retain the upstream verified label', () => {
  const input=snapshot(); const c=input.releases[0].capabilities[0];
  c.status='verified'; c.wholeClaim=true; c.evidence[0].outcome='passed';
  assert.equal(validatePublication(input).releases[0].capabilities[0].status, 'verified');
});

test('a release publishes while pending release-manager sign-off', () => {
  const input = snapshot();
  assert.equal(validatePublication(input).releases[0].approval.status, 'pending');
});
test('an approved release records who signed it off and when', () => {
  const input = snapshot();
  input.releases[0].approval = {status: 'approved', approvedBy: 'release-manager', approvedAt: '2026-09-25T00:00:00Z'};
  assert.equal(validatePublication(input).releases[0].approval.approvedBy, 'release-manager');
});
for (const [name, mutate] of [
  ['approved without an approver', x => x.releases[0].approval = {status: 'approved', approvedBy: null, approvedAt: '2026-09-25T00:00:00Z'}],
  ['approved without a timestamp', x => x.releases[0].approval = {status: 'approved', approvedBy: 'release-manager', approvedAt: null}],
  ['pending release naming an approver', x => x.releases[0].approval = {status: 'pending', approvedBy: 'release-manager', approvedAt: null}],
  ['unknown approval status', x => x.releases[0].approval.status = 'maybe'],
  ['missing approval axis', x => delete x.releases[0].approval],
]) {
  test(`rejects ${name}`, () => {
    const input = snapshot(); mutate(input);
    assert.throws(() => validatePublication(input));
  });
}

// Tested-build drafts: the published 1.2.1 object, exactly as the kit exporter wrote it.
const actual = () => JSON.parse(readFileSync(new URL('../data/publication.json', import.meta.url), 'utf8'));
const tested = x => x.releases.find(release => release.id === '1.2.1-tested-r4');
const cap = (x, id) => tested(x).capabilities.find(found => found.id === id);
const PR = 'https://github.com/kamiwaza-internal/capability-documentation/pull/1';

test('the published 1.2.1 tested-build draft validates beside the unchanged 1.3.0 releases', () => {
  const release = tested(validatePublication(actual()));
  assert.deepEqual([release.publicationState, release.publishedAt, release.reviewReference, release.approval.status], ['draft', null, null, 'pending']);
  assert.deepEqual(release.capabilities.map(found => found.status).sort(), ['failed', 'failed', 'partial', 'partial', 'partial', 'partial', 'partial', 'partial']);
  assert.ok(release.capabilities.every(found => found.wholeClaim === false && found.title === null && found.summary === null));
});
for (const [name, mutate, reason] of [
  ['verified without a whole claim', x => cap(x, 'skills.skills-library').status = 'verified', /Verified requires whole-claim clean evidence/],
  ['verified over a failed scenario', x => Object.assign(cap(x, 'models.local-deployment'), {status: 'verified', wholeClaim: true}), /Verified requires whole-claim clean evidence/],
  ['verified without evidence', x => Object.assign(cap(x, 'skills.skills-library'), {status: 'verified', wholeClaim: true, evidence: []}), /Verified requires whole-claim clean evidence/],
  ['a draft naming a review', x => tested(x).reviewReference = PR, /Draft cannot invent/],
  ['a draft naming a publication time', x => tested(x).publishedAt = '2026-10-01T00:00:00Z', /Draft cannot invent/],
  ['published without a publication time', x => Object.assign(tested(x), {publicationState: 'published', reviewReference: PR}), /Invalid evidence timestamp/],
  ['published without a review', x => Object.assign(tested(x), {publicationState: 'published', publishedAt: '2026-10-01T00:00:00Z'}), /Public review PR reference required/],
  ['no publication state', x => delete tested(x).publicationState, /Unexpected or missing fields/],
  ['an unknown publication state', x => tested(x).publicationState = 'final', /Invalid publication state/],
  ['an unknown field', x => tested(x).rawLogs = 'not allowed', /Unexpected or missing fields/],
  ['a title without a curated summary', x => cap(x, 'workrooms.create').title = 'Create a workroom', /Invalid text/],
  ['limits without curated text', x => cap(x, 'workrooms.create').limits = ['Some limit'], /Text requires a curated description/],
  ['cross-build evidence', x => cap(x, 'workrooms.create').evidence[0].build = '1.3.0', /Evidence build mismatch/],
  ['a runtime verdict relabelled as a source declaration', x => tested(x).baselineKind = 'source-declaration', /Unexpected or missing fields/],
]) test('rejects a tested-build draft with ' + name, () => {
  const input = actual(); mutate(input);
  assert.throws(() => validatePublication(input), reason);
});
test('a published tested build names its review and time together, and may carry curated text', () => {
  const input = actual();
  Object.assign(tested(input), {publicationState: 'published', publishedAt: '2026-10-01T00:00:00Z', reviewReference: PR});
  Object.assign(cap(input, 'workrooms.create'), {title: 'Synthetic title', summary: 'Synthetic summary', limits: ['Synthetic limit']});
  assert.doesNotThrow(() => validatePublication(input));
});
test('a tested-build draft is not admitted below container schema 5, and the older kinds gain no draft', () => {
  const input = actual();
  assert.throws(() => validatePublication({schema: 2, releases: [tested(input)]}), /Unexpected or missing fields/);
  assert.throws(() => validatePublication({schema: 1, releases: [tested(input)]}), /Unexpected or missing fields/);
  const source = actual(); Object.assign(source.releases[0], {publishedAt: null, reviewReference: null});
  assert.throws(() => validatePublication(source), /Invalid evidence timestamp/);
  const legacy = snapshot(); legacy.releases[0].capabilities[0].title = null;
  assert.throws(() => validatePublication(legacy), /Invalid text/);
});
