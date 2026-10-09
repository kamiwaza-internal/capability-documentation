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

test('only additive schema2-to5 migration preserves unchanged releases', () => {
  const old = {schema: 2, releases: [{id: 'r1', claim: 'declared'}]};
  assert.doesNotThrow(() => preserveHistory(old, {schema: 5, releases: old.releases, observations: []}));
  assert.throws(() => preserveHistory(old, {schema: 5, releases: [{id: 'r1', claim: 'verified'}], observations: []}));
  assert.throws(() => preserveHistory(old, {schema: 4, releases: old.releases}));
});

test('reordering keys inside a published release or observation is a rewrite', () => {
  const old = {schema: 5, releases: [{id: 'r1', claim: 'declared'}], observations: [{id: 'o1', state: 'seen'}]};
  assert.doesNotThrow(() => preserveHistory(old, structuredClone(old)));
  assert.throws(() => preserveHistory(old, {...old, releases: [{claim: 'declared', id: 'r1'}]}), /revision/);
  assert.throws(() => preserveHistory(old, {...old, observations: [{state: 'seen', id: 'o1'}]}), /observations/);
});
