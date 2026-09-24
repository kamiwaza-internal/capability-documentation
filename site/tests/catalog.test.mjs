import test from 'node:test';
import assert from 'node:assert/strict';
import {filterCapabilities, countStatuses} from '../src/catalog.mjs';

const capabilities = [
  {id: 'synthetic.a', title: 'Alpha', summary: 'Find documents', conditions: ['Provider consent'], limits: ['No video'], status: 'partial'},
  {id: 'synthetic.b', title: 'Beta', summary: 'Other example', conditions: [], limits: [], status: 'verified'},
];
test('CAT-1 search includes identifiers, claims, prerequisites and limits, case-insensitively', () => {
  for (const query of ['synthetic.a', 'ALPHA', 'documents', 'consent', 'video']) {
    assert.deepEqual(filterCapabilities(capabilities, query, 'all'), [capabilities[0]]);
  }
});
test('CAT-2 status and query are intersected without changing verdicts', () => {
  assert.deepEqual(filterCapabilities(capabilities, 'alpha', 'verified'), []);
  assert.deepEqual(filterCapabilities(capabilities, '  ', 'partial'), [capabilities[0]]);
  assert.equal(capabilities[0].status, 'partial');
});
test('CAT-3 counts include explicit zeros and only the selected snapshot', () => {
  assert.deepEqual(countStatuses(capabilities), {verified: 1, partial: 1, failed: 0, untested: 0});
  assert.deepEqual(countStatuses([]), {verified: 0, partial: 0, failed: 0, untested: 0});
});
test('CAT-4 unknown search matches nothing; no evidence inferred', () => {
  assert.deepEqual(filterCapabilities(capabilities, 'absent', 'all'), []);
});
