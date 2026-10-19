import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const raw = readFileSync(new URL('../../corpus/1.3.4/catalog.json', import.meta.url), 'utf8');
const corpus = JSON.parse(raw);

function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} has an unexpected or missing field`);
}

function stringList(value, label) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  assert.ok(value.every((item) => typeof item === 'string' && item.length > 0), `${label} must contain strings only`);
}

function publicShape(document) {
  exactKeys(document, ['schema', 'release', 'publication', 'pins', 'counts', 'capabilities', 'recipes', 'establishedScopedProofs', 'gaps'], 'corpus');
  exactKeys(document.publication, ['state', 'sitePublished', 'publicationBinding', 'humanReleaseApproval'], 'publication');
  exactKeys(document.pins, [
    'kitMergeCommit', 'productTag', 'productCoreCommit', 'sdkProofProducerTag', 'sdkProofProducerCommit',
    'kaizenUatProducerTag', 'kaizenUatProducerCommit', 'approvedSessionHelperMergeCommit',
  ], 'pins');
  exactKeys(document.counts, [
    'capabilityDefinitions', 'includedCapabilities', 'excludedCapabilities', 'distinctPrereleaseCredits',
    'establishedScopedSdkProofs', 'freshCompleteUiProofs', 'technicalReleaseReplay', 'recipeDefinitions',
    'workbookRecipes', 'scopedProgrammaticRecipes',
  ], 'counts');
  exactKeys(document.counts.technicalReleaseReplay, ['scopedStamps', 'failedSelections', 'unstamped'], 'technical replay');
  for (const [key, value] of Object.entries(document.counts)) {
    if (key !== 'technicalReleaseReplay') assert.ok(Number.isSafeInteger(value) && value >= 0, `${key} must be a nonnegative count`);
  }
  for (const [key, value] of Object.entries(document.counts.technicalReleaseReplay)) {
    assert.ok(Number.isSafeInteger(value) && value >= 0, `${key} must be a nonnegative count`);
  }
  assert.ok(Array.isArray(document.capabilities));
  for (const row of document.capabilities) {
    exactKeys(row, ['id', 'title', 'disposition', 'sourceDeclaration', 'prereleaseStatus', 'prereleaseBasis'], 'capability');
    assert.ok(typeof row.id === 'string' && typeof row.title === 'string');
    assert.ok(['included', 'excluded'].includes(row.disposition));
    assert.ok(['declared', 'not-established', 're-review-required'].includes(row.sourceDeclaration));
    assert.ok(['verified', 'not-yet-verified'].includes(row.prereleaseStatus));
    assert.ok(row.prereleaseBasis === null || row.prereleaseBasis === 'value-stream-proof');
  }
  assert.ok(Array.isArray(document.recipes));
  for (const row of document.recipes) {
    exactKeys(row, [
      'id', 'title', 'definitionSchema', 'definitionRevision', 'sourceVersion', 'definitionKind',
      'orderedStepCount', 'reviewedVerifies', 'scopedSdkProof', 'completeUiProof', 'releaseMembership', 'gaps',
    ], 'recipe');
    for (const key of ['id', 'title', 'definitionSchema', 'sourceVersion']) assert.ok(typeof row[key] === 'string' && row[key]);
    assert.ok(Number.isSafeInteger(row.definitionRevision) && row.definitionRevision > 0);
    assert.ok(Number.isSafeInteger(row.orderedStepCount) && row.orderedStepCount > 0);
    assert.ok(['workbook-source', 'scoped-programmatic'].includes(row.definitionKind));
    assert.ok(['established', 'none'].includes(row.scopedSdkProof));
    assert.equal(row.completeUiProof, false);
    assert.equal(row.releaseMembership, 'unestablished');
    stringList(row.reviewedVerifies, 'reviewedVerifies');
    stringList(row.gaps, 'recipe gaps');
    assert.ok(row.gaps.every((gap) => [
      'typed-definition-needed', 'release-adaptation-needed', 'reviewed-verifies-needed', 'complete-ui-observation-needed',
    ].includes(gap)));
  }
  assert.ok(Array.isArray(document.establishedScopedProofs));
  for (const row of document.establishedScopedProofs) {
    exactKeys(row, ['recipeId', 'basis', 'creditedCapabilityIds'], 'proof summary');
    assert.ok(typeof row.recipeId === 'string' && row.recipeId);
    assert.equal(row.basis, 'complete-scoped-sdk-journey');
    stringList(row.creditedCapabilityIds, 'creditedCapabilityIds');
  }
  stringList(document.gaps, 'global gaps');
}

test('1.3.4 review corpus is a sanitized download without release approval', () => {
  publicShape(corpus);
  assert.equal(corpus.schema, 'sanitized-release-corpus.v1');
  assert.equal(corpus.release, '1.3.4');
  assert.deepEqual(corpus.publication, {
    state: 'review-candidate',
    sitePublished: false,
    publicationBinding: null,
    humanReleaseApproval: 'not-established',
  });
  for (const [, value] of Object.entries(corpus.pins).filter(([key]) => key.endsWith('Commit'))) {
    assert.match(value, /^[0-9a-f]{40}$/);
  }
  assert.doesNotMatch(raw, /https?:\/\/|\/(?:Users|home|tmp|var)\/|[\w.+-]+@[\w.-]+|localhost|127\.0\.0\.1/i);
  assert.doesNotMatch(raw, /(?:receipt|packet|credential|password|secret)[-_]?(?:path|hash|value|token)/i);
});

test('privacy boundary refuses extra fields at every public object level', () => {
  for (const [path, key, value] of [
    [[], 'rawTests', []],
    [['publication'], 'actor', 'private person'],
    [['pins'], 'environmentName', 'private deployment'],
    [['counts'], 'password', 'private value'],
    [['counts', 'technicalReleaseReplay'], 'receiptPath', 'private path'],
    [['capabilities', 0], 'actor', 'private person'],
    [['recipes', 0], 'rawTests', []],
    [['establishedScopedProofs', 0], 'receiptPath', 'private path'],
  ]) {
    const mutated = structuredClone(corpus);
    let target = mutated;
    for (const segment of path) target = target[segment];
    target[key] = value;
    assert.throws(() => publicShape(mutated), `${path.join('.') || 'corpus'}.${key} must be refused`);
  }
});

test('capability, proof and release-replay axes remain separate', () => {
  const { counts, capabilities, recipes, establishedScopedProofs: proofs } = corpus;
  assert.equal(capabilities.length, counts.capabilityDefinitions);
  assert.equal(new Set(capabilities.map((row) => row.id)).size, 107);
  assert.equal(capabilities.filter((row) => row.disposition === 'included').length, 88);
  assert.equal(capabilities.filter((row) => row.disposition === 'excluded').length, 19);
  assert.equal(counts.includedCapabilities + counts.excludedCapabilities, 107);

  const credited = new Set(capabilities.filter((row) => row.prereleaseStatus === 'verified').map((row) => row.id));
  assert.equal(credited.size, counts.distinctPrereleaseCredits);
  assert.equal(credited.size, 6);
  for (const row of capabilities) {
    if (credited.has(row.id)) {
      assert.equal(row.disposition, 'included');
      assert.equal(row.prereleaseBasis, 'value-stream-proof');
    } else {
      assert.equal(row.prereleaseBasis, null);
    }
  }

  assert.equal(proofs.length, counts.establishedScopedSdkProofs);
  assert.equal(proofs.length, 4);
  assert.deepEqual(new Set(proofs.flatMap((row) => row.creditedCapabilityIds)), credited);
  assert.equal(recipes.length, counts.recipeDefinitions);
  assert.equal(new Set(recipes.map((row) => row.id)).size, 32);
  assert.equal(recipes.filter((row) => row.definitionKind === 'workbook-source').length, 25);
  assert.equal(recipes.filter((row) => row.definitionKind === 'scoped-programmatic').length, 7);
  const recipesById = new Map(recipes.map((row) => [row.id, row]));
  for (const proof of proofs) {
    const recipe = recipesById.get(proof.recipeId);
    assert.equal(recipe.scopedSdkProof, 'established');
    assert.deepEqual(new Set(recipe.reviewedVerifies), new Set(proof.creditedCapabilityIds));
  }
  assert.ok(recipes.every((row) => row.releaseMembership === 'unestablished' && row.completeUiProof === false));
  assert.equal(counts.freshCompleteUiProofs, 0);
  assert.deepEqual(counts.technicalReleaseReplay, { scopedStamps: 30, failedSelections: 6, unstamped: 52 });
  assert.equal(Object.values(counts.technicalReleaseReplay).reduce((sum, value) => sum + value, 0), 88);
});
