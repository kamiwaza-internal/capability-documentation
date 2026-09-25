import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveHistory} from '../scripts/preserve-history.mjs';

test('allow first projection and additive revisions, reject rewriting or removing history', () => {
  const old = {schema: 2, releases: [{id: 'r1', claim: 'declared'}]};
  assert.doesNotThrow(() => preserveHistory({schema: 1, releases: []}, old));
  assert.doesNotThrow(() => preserveHistory(old, {schema: 2, releases: [...old.releases, {id: 'r2'}]}));
  assert.throws(() => preserveHistory(old, {schema: 2, releases: []}));
  assert.throws(() => preserveHistory(old, {schema: 2, releases: [{id: 'r1', claim: 'verified'}]}));
  assert.throws(() => preserveHistory(old, {schema: 1, releases: old.releases}));
});
