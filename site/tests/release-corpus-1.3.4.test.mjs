import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const raw = readFileSync(new URL('../../corpus/1.3.4/catalog.json', import.meta.url), 'utf8');
const corpus = JSON.parse(raw);

test('1.3.4 review corpus remains a non-published, sanitized snapshot', () => {
  assert.equal(corpus.schema, 'sanitized-release-corpus.v1');
  assert.equal(corpus.release, '1.3.4');
  assert.deepEqual(corpus.publication, {
    state: 'review-candidate',
    sitePublished: false,
    publicationBinding: null,
    humanReleaseApproval: 'not-established',
  });
  for (const [key, value] of Object.entries(corpus.pins).filter(([key]) => key.endsWith('Commit'))) {
    assert.match(value, /^[0-9a-f]{40}$/);
  }
  assert.doesNotMatch(raw, /https?:\/\/|\/(?:Users|home|tmp|var)\/|[\w.+-]+@[\w.-]+|localhost|127\.0\.0\.1/i);
  assert.doesNotMatch(raw, /(?:receipt|packet|credential|password|secret)[-_]?(?:path|hash|value|token)/i);
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
