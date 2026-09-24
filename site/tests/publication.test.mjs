import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublication} from '../scripts/publication.mjs';

const snapshot = () => ({schema: 1, releases: [{
  id: '1.3.0-development-r1', version: '1.3.0', channel: 'development',
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
