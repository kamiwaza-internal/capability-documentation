import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {unsafePublicText} from './public-output-privacy.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const keys = (value, allowed, label) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...allowed].sort(), `${label} has missing or unexpected fields`);
};
const strings = (value, label) => {
  assert.ok(Array.isArray(value) && value.every(item => typeof item === 'string' && item.length > 0), `${label} must contain nonempty strings`);
};
const count = (value, label) => assert.ok(Number.isSafeInteger(value) && value >= 0, `${label} must be a nonnegative integer`);
const unique = (values, label) => assert.equal(new Set(values).size, values.length, `${label} must be unique`);

// This is the production privacy boundary for every discovered corpus, not merely a test fixture.
export function validatePublicCorpus(corpus, raw) {
  keys(corpus, ['schema', 'release', 'publication', 'pins', 'counts', 'capabilities', 'recipes', 'establishedScopedProofs', 'gaps'], 'corpus');
  assert.equal(corpus.schema, 'sanitized-release-corpus.v1');
  assert.match(corpus.release, /^\d+\.\d+\.\d+$/);
  keys(corpus.publication, ['state', 'sitePublished', 'publicationBinding', 'humanReleaseApproval'], 'publication');
  assert.equal(corpus.publication.state, 'review-candidate');
  assert.equal(corpus.publication.sitePublished, false, 'a review-candidate download is not an approved site publication');
  assert.equal(corpus.publication.publicationBinding, null);
  assert.equal(corpus.publication.humanReleaseApproval, 'not-established');
  keys(corpus.pins, ['kitMergeCommit', 'productTag', 'productCoreCommit', 'sdkProofProducerTag', 'sdkProofProducerCommit',
    'kaizenUatProducerTag', 'kaizenUatProducerCommit', 'approvedSessionHelperMergeCommit'], 'pins');
  for (const [key, value] of Object.entries(corpus.pins)) {
    assert.equal(typeof value, 'string', `pins.${key} must be a string`);
    if (key.endsWith('Commit')) assert.match(value, /^[0-9a-f]{40}$/, `pins.${key} must be a commit`);
  }
  assert.equal(corpus.pins.productTag, `v${corpus.release}`);
  keys(corpus.counts, ['capabilityDefinitions', 'includedCapabilities', 'excludedCapabilities', 'distinctPrereleaseCredits',
    'establishedScopedSdkProofs', 'freshCompleteUiProofs', 'technicalReleaseReplay', 'recipeDefinitions', 'workbookRecipes',
    'scopedProgrammaticRecipes'], 'counts');
  keys(corpus.counts.technicalReleaseReplay, ['scopedStamps', 'failedSelections', 'unstamped'], 'technical replay');
  for (const [key, value] of Object.entries(corpus.counts)) if (key !== 'technicalReleaseReplay') count(value, `counts.${key}`);
  for (const [key, value] of Object.entries(corpus.counts.technicalReleaseReplay)) count(value, `technical replay.${key}`);
  assert.ok(Array.isArray(corpus.capabilities), 'capabilities must be an array');
  for (const row of corpus.capabilities) {
    keys(row, ['id', 'title', 'disposition', 'sourceDeclaration', 'prereleaseStatus', 'prereleaseBasis'], 'capability');
    assert.match(row.id, /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
    assert.ok(typeof row.title === 'string' && row.title.length > 0);
    assert.ok(['included', 'excluded'].includes(row.disposition));
    assert.ok(['declared', 'not-established', 're-review-required'].includes(row.sourceDeclaration));
    assert.ok(['verified', 'not-yet-verified'].includes(row.prereleaseStatus));
    assert.ok(row.prereleaseBasis === null || row.prereleaseBasis === 'value-stream-proof');
    assert.equal(row.prereleaseBasis === 'value-stream-proof', row.prereleaseStatus === 'verified');
    if (row.prereleaseStatus === 'verified') assert.equal(row.disposition, 'included');
  }
  unique(corpus.capabilities.map(row => row.id), 'capability IDs');
  assert.ok(Array.isArray(corpus.recipes), 'recipes must be an array');
  for (const row of corpus.recipes) {
    keys(row, ['id', 'title', 'definitionSchema', 'definitionRevision', 'sourceVersion', 'definitionKind', 'orderedStepCount',
      'reviewedVerifies', 'scopedSdkProof', 'completeUiProof', 'releaseMembership', 'gaps'], 'recipe');
    for (const key of ['id', 'title', 'definitionSchema', 'sourceVersion']) assert.ok(typeof row[key] === 'string' && row[key]);
    assert.ok(Number.isSafeInteger(row.definitionRevision) && row.definitionRevision > 0);
    assert.ok(Number.isSafeInteger(row.orderedStepCount) && row.orderedStepCount > 0);
    assert.ok(['workbook-source', 'scoped-programmatic'].includes(row.definitionKind));
    assert.ok(['established', 'none'].includes(row.scopedSdkProof));
    assert.equal(row.completeUiProof, false);
    assert.equal(row.releaseMembership, 'unestablished');
    strings(row.reviewedVerifies, 'reviewed verifies');
    strings(row.gaps, 'recipe gaps');
    assert.ok(row.gaps.every(gap => ['typed-definition-needed', 'release-adaptation-needed', 'reviewed-verifies-needed',
      'complete-ui-observation-needed'].includes(gap)));
  }
  unique(corpus.recipes.map(row => row.id), 'recipe IDs');
  assert.ok(Array.isArray(corpus.establishedScopedProofs));
  for (const row of corpus.establishedScopedProofs) {
    keys(row, ['recipeId', 'basis', 'creditedCapabilityIds'], 'proof');
    assert.equal(row.basis, 'complete-scoped-sdk-journey');
    strings(row.creditedCapabilityIds, 'credited capability IDs');
    unique(row.creditedCapabilityIds, 'credited capability IDs');
    const recipe = corpus.recipes.find(recipe => recipe.id === row.recipeId);
    assert.ok(recipe, `proof ${row.recipeId} needs a recipe`);
    assert.equal(recipe.scopedSdkProof, 'established');
    assert.deepEqual(new Set(row.creditedCapabilityIds), new Set(recipe.reviewedVerifies));
  }
  unique(corpus.establishedScopedProofs.map(row => row.recipeId), 'proof recipe IDs');
  strings(corpus.gaps, 'global gaps');
  const c = corpus.counts, caps = corpus.capabilities, recipes = corpus.recipes;
  assert.equal(caps.length, c.capabilityDefinitions);
  assert.equal(caps.filter(row => row.disposition === 'included').length, c.includedCapabilities);
  assert.equal(caps.filter(row => row.disposition === 'excluded').length, c.excludedCapabilities);
  assert.equal(caps.filter(row => row.prereleaseStatus === 'verified').length, c.distinctPrereleaseCredits);
  assert.equal(recipes.length, c.recipeDefinitions);
  assert.equal(recipes.filter(row => row.definitionKind === 'workbook-source').length, c.workbookRecipes);
  assert.equal(recipes.filter(row => row.definitionKind === 'scoped-programmatic').length, c.scopedProgrammaticRecipes);
  assert.equal(corpus.establishedScopedProofs.length, c.establishedScopedSdkProofs);
  assert.deepEqual(new Set(recipes.filter(row => row.scopedSdkProof === 'established').map(row => row.id)),
    new Set(corpus.establishedScopedProofs.map(row => row.recipeId)), 'Established recipe flags must match proof records');
  assert.equal(recipes.filter(row => row.completeUiProof).length, c.freshCompleteUiProofs);
  assert.equal(Object.values(c.technicalReleaseReplay).reduce((sum, value) => sum + value, 0), c.includedCapabilities);
  assert.deepEqual(new Set(corpus.establishedScopedProofs.flatMap(row => row.creditedCapabilityIds)),
    new Set(caps.filter(row => row.prereleaseStatus === 'verified').map(row => row.id)));
  assert.doesNotMatch(raw, /https?:\/\/|\/(?:Users|home|tmp|var)\/|[\w.+-]+@[\w.-]+|localhost|127\.0\.0\.1/i);
  assert.doesNotMatch(raw, /(?:receipt|packet|credential|password|secret)[-_]?(?:path|hash|value|token)/i);
  assert.equal(unsafePublicText(JSON.stringify(corpus)), null, 'Unsafe decoded public corpus text');
  return corpus;
}

export function loadReleaseCorpora({root = repoRoot, publication} = {}) {
  const manifest = JSON.parse(readFileSync(join(root, 'site/data/release-corpora.json')));
  keys(manifest, ['schema', 'corpora'], 'release corpus manifest');
  assert.equal(manifest.schema, 'public-release-corpora.v1');
  assert.ok(Array.isArray(manifest.corpora));
  const folder = join(root, 'corpus');
  const directories = existsSync(folder) ? readdirSync(folder, {withFileTypes: true}).filter(item => item.isDirectory()).map(item => item.name).sort() : [];
  const versions = manifest.corpora.map(row => row.version).sort();
  unique(versions, 'corpus manifest versions');
  assert.deepEqual(directories, versions, 'every corpus directory must have one manifest entry and vice versa');
  return manifest.corpora.map(meta => {
    keys(meta, ['version', 'sha256', 'kitMergeCommit', 'productTag', 'productCoreCommit', 'counts'], 'corpus manifest entry');
    assert.match(meta.version, /^\d+\.\d+\.\d+$/);
    assert.match(meta.sha256, /^[0-9a-f]{64}$/);
    const raw = readFileSync(join(folder, meta.version, 'catalog.json'));
    assert.equal(sha256(raw), meta.sha256, `corpus ${meta.version} changed without manifest review`);
    const catalog = validatePublicCorpus(JSON.parse(raw), raw.toString('utf8'));
    assert.equal(catalog.release, meta.version);
    for (const key of ['kitMergeCommit', 'productTag', 'productCoreCommit']) assert.equal(meta[key], catalog.pins[key], `corpus ${meta.version} ${key} differs from manifest`);
    assert.deepEqual(meta.counts, catalog.counts, `corpus ${meta.version} counts differ from manifest`);
    if (publication) {
      assert.ok(!publication.releases.some(release => release.version === meta.version), `corpus ${meta.version} collides with a publication release`);
      const snapshots = (publication.releaseStamps ?? []).filter(row => row.version === meta.version).sort((a, b) => b.publicationRevision - a.publicationRevision);
      if (snapshots.length) {
        const latest = snapshots[0];
        assert.equal(latest.source.ref, meta.productTag, `corpus ${meta.version} tag differs from release replay`);
        assert.equal(latest.source.sourceRevision, meta.productCoreCommit, `corpus ${meta.version} Core commit differs from release replay`);
        assert.deepEqual([latest.counts.catalog, latest.counts.included, latest.counts.excluded, latest.counts.releaseStamped,
          latest.counts.failed, latest.counts.notStamped], [meta.counts.capabilityDefinitions, meta.counts.includedCapabilities,
          meta.counts.excludedCapabilities, meta.counts.technicalReleaseReplay.scopedStamps,
          meta.counts.technicalReleaseReplay.failedSelections, meta.counts.technicalReleaseReplay.unstamped],
        `corpus ${meta.version} replay totals differ from latest published revision`);
      }
    }
    // Embed only this version's binding. Appending a later corpus must not rewrite an older ZIP.
    const manifestBytes = Buffer.from(JSON.stringify({schema: 'public-release-corpus-manifest.v1', ...meta}, null, 2) + '\n');
    return {...meta, catalog, bytes: raw, manifestBytes};
  });
}
