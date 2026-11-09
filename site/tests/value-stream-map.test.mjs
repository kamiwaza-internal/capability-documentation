import test from 'node:test';
import assert from 'node:assert/strict';
import {loadReleaseCorpora} from '../scripts/release-corpora.mjs';
import {findStreams, mappingSummary, streamCapabilities, streamInventory} from '../src/value-stream-map.mjs';

const corpus = loadReleaseCorpora()[0].catalog;

test('every reviewed recipe remains in one stable parent group, keeping workrooms and ontologies distinct', () => {
  const streams = streamInventory(corpus);
  assert.deepEqual(streams.flatMap(stream => stream.recipes.map(recipe => recipe.id)).sort(), corpus.recipes.map(recipe => recipe.id).sort());
  const ontology = streams.find(stream => stream.id === 'Analyst:VS6');
  const workroom = streams.find(stream => stream.id === 'Analyst:Workroom');
  assert.notEqual(ontology.id, workroom.id);
  assert.deepEqual(streamCapabilities(ontology, corpus), []);
  assert.deepEqual(streamCapabilities(workroom, corpus), []);
});

test('a capability shared by recipes keeps one identity without gaining proof from a connection', () => {
  const stream = streamInventory(corpus).find(stream => stream.id === 'Operator:VS1');
  const caps = streamCapabilities(stream, corpus);
  const shared = 'models.openai-compatible-inference';
  assert.equal(stream.recipes.filter(recipe => recipe.reviewedVerifies.includes(shared)).length, 2);
  assert.equal(caps.filter(cap => cap.id === shared).length, 1);
  assert.equal(stream.recipes.find(recipe => recipe.id.endsWith(':text-inference')).scopedSdkProof, 'none');
  assert.ok(stream.recipes.every(recipe => recipe.releaseMembership === 'unestablished'));
});

test('search finds linked capability names and respects persona and empty results', () => {
  const streams = streamInventory(corpus);
  const name = corpus.capabilities.find(cap => cap.id === 'apps.app-garden').title;
  assert.deepEqual(findStreams(streams, name, 'Operator', corpus).map(stream => stream.id), ['Operator:VS3']);
  assert.deepEqual(findStreams(streams, name, 'Analyst', corpus), []);
  assert.deepEqual(findStreams(streams, 'no-such-stream', 'all', corpus), []);
});

test('mapping counts retain unlinked and excluded definitions in the inventory', () => {
  const summary = mappingSummary(corpus);
  assert.equal(summary.recipes, corpus.counts.recipeDefinitions);
  assert.equal(summary.linked + summary.unmapped, corpus.counts.capabilityDefinitions);
  assert.ok(summary.unmapped > 0);
  assert.ok(corpus.capabilities.some(cap => cap.disposition === 'excluded'));
});
