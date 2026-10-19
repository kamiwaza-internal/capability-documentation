import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {publicationDigest} from './sales-guidance.mjs';
import {id, requireValue, shape, text} from './local-stamps.mjs';
import {assertPublicOutputSafe, unsafePublicText} from './public-output-privacy.mjs';

const pathStatus = new Set(['untested', 'partial', 'tested', 'inapplicable']);
const streamStatus = new Set(['unmapped', ...pathStatus]);
// Updated only after reviewing the projection from its pinned private kit commit.
const reviewedStreamsSha256 = '47758f678c243990c437d49fb28ad8c43c7fd3722c8751b7bb739b94d2421aec';
// A typed projection stays in review until a separate publication PR pins its exact digest.
const reviewedTypedSha256 = null;
const prose = value => {
  text(value);
  requireValue(value.length <= 2000 && !unsafePublicText(value), 'Unsafe stream prose');
};
const proseList = (value, max = 30) => {
  requireValue(Array.isArray(value) && value.length <= max, 'Invalid stream list');
  value.forEach(prose);
};
const path = value => {
  shape(value, ['status', 'instructions', 'example']);
  requireValue(pathStatus.has(value.status), 'Invalid stream path status');
  proseList(value.instructions);
  requireValue(value.status !== 'inapplicable' || value.instructions.length > 0, 'Inapplicable path needs a reason');
  if (value.example !== null) prose(value.example);
};

export function validateStreams(data, publication) {
  const typed = data?.schema === 'public-value-stream-recipes.v3';
  const baseKeys = ['schema', 'publicationSha256', 'source', 'exampleSha256', 'inventoryCount', 'historicalMappingCount', 'streams'];
  shape(data, typed ? [...baseKeys, 'release', 'publicationRevision', 'claimLinks'] : baseKeys);
  requireValue(typed || data.schema === 'public-value-stream-recipes.v1', 'Unsupported stream recipes');
  requireValue(typeof data.publicationSha256 === 'string' && /^[a-f0-9]{64}$/.test(data.publicationSha256), 'Invalid stream publication hash');
  const applies = data.publicationSha256 === publicationDigest(publication);
  shape(data.source, ['sourceKind', 'kitCommit']);
  requireValue(data.source.sourceKind === 'reviewed-private-kit' && /^[a-f0-9]{40}$/.test(data.source.kitCommit), 'Unpinned stream source');
  let boundRelease = null;
  if (typed) {
    requireValue(typeof data.release === 'string' && /^\d+\.\d+\.\d+$/.test(data.release) &&
      Number.isSafeInteger(data.publicationRevision) && data.publicationRevision > 0, 'Invalid typed projection release binding');
    const boundReleases = publication.releases.filter(r => r.version === data.release && r.publicationRevision === data.publicationRevision &&
      r.publicationState === 'published' && r.baselineKind === 'prerelease-evidence' && r.sourceRevision === data.source.kitCommit);
    requireValue(boundReleases.length > 0, 'Typed recipe source and publication revision differ');
    requireValue(boundReleases.length === 1, 'Ambiguous typed recipe publication revision');
    boundRelease = boundReleases[0];
    requireValue(Array.isArray(data.claimLinks) && data.claimLinks.length <= 5000, 'Invalid typed claim links');
  }
  requireValue(Number.isInteger(data.inventoryCount) && data.inventoryCount > 0 && Number.isInteger(data.historicalMappingCount) && data.historicalMappingCount >= 0, 'Invalid stream migration totals');
  requireValue(data.exampleSha256 === null || (typeof data.exampleSha256 === 'string' && /^[a-f0-9]{64}$/.test(data.exampleSha256)), 'Invalid example digest');
  requireValue(Array.isArray(data.streams) && data.streams.length === data.inventoryCount, 'Incomplete stream inventory');
  const seen = new Set();
  const expectedLinks = new Set();
  const boundIds = typed ? new Set(boundRelease.capabilities.map(cap => cap.id)) : null;
  const published = typed ? null : new Set(publication.releases.filter(r => r.publicationState !== 'draft')
    .flatMap(r => r.capabilities.map(c => `${r.version}:${c.id}`)));
  for (const item of data.streams) {
    shape(item, ['id', 'title', 'status', 'recipe']);
    prose(item.id); prose(item.title);
    requireValue(!seen.has(item.id) && streamStatus.has(item.status), 'Duplicate or invalid stream');
    seen.add(item.id);
    if (item.recipe === null) {
      requireValue(item.status === 'unmapped' || item.status === 'untested', 'Invalid missing stream recipe');
      continue;
    }
    const recipeKeys = ['revision', 'outcome', 'source_version', 'tested_build', 'roles', 'prerequisites', 'configuration', 'custom_app_boundary', 'limits', 'steps'];
    shape(item.recipe, typed ? [...recipeKeys, 'sha256'] : recipeKeys);
    const recipe = item.recipe;
    requireValue(item.status !== 'unmapped', 'A mapped recipe cannot be unmapped');
    requireValue(Number.isInteger(recipe.revision) && recipe.revision > 0 && /^\d+\.\d+\.\d+$/.test(recipe.source_version), 'Invalid stream revision or version');
    if (typed) requireValue(recipe.source_version === data.release && /^[a-f0-9]{64}$/.test(recipe.sha256), 'Typed recipe revision or release mismatch');
    prose(recipe.outcome); prose(recipe.custom_app_boundary);
    proseList(recipe.roles); proseList(recipe.prerequisites); proseList(recipe.configuration); proseList(recipe.limits);
    requireValue(recipe.tested_build === null || (typeof recipe.tested_build === 'string' && /^build fingerprint [a-f0-9]{64}$/.test(recipe.tested_build)), 'Invalid public tested-build fingerprint');
    requireValue(item.status !== 'tested', 'Whole-stream tested requires a sequence proof contract');
    requireValue(item.status === 'tested' || recipe.tested_build === null, 'Untested stream cannot name a whole-stream tested build');
    requireValue(Array.isArray(recipe.steps) && recipe.steps.length > 0 && recipe.steps.length <= 50, 'Invalid stream steps');
    const ordered = new Set();
    for (const step of recipe.steps) {
      shape(step, ['id', 'depends_on', 'action', 'capability_ids', 'api', 'kaizen_ui', 'expected_result', 'historical_observation']);
      requireValue(/^[a-z0-9-]+$/.test(step.id) && !ordered.has(step.id) && Array.isArray(step.depends_on) && step.depends_on.every(dep => ordered.has(dep)), 'Invalid stream step dependency');
      ordered.add(step.id);
      prose(step.action); prose(step.expected_result);
      requireValue(Array.isArray(step.capability_ids) && step.capability_ids.length > 0 && new Set(step.capability_ids).size === step.capability_ids.length, 'Invalid step capabilities');
      for (const cid of step.capability_ids) {
        requireValue(id.test(cid), 'Invalid step capability identifier');
        if (typed) requireValue(boundIds.has(cid), 'Step capability outside bound publication revision');
        else requireValue(!applies || published.has(recipe.source_version + ':' + cid), 'Step capability outside published source version');
        if (typed) expectedLinks.add(JSON.stringify([item.id, recipe.revision, recipe.sha256, step.id, cid]));
      }
      path(step.api); path(step.kaizen_ui);
      requireValue(step.kaizen_ui.status !== 'tested', 'Tested Kaizen UI path requires an operation proof contract');
      if (step.api.status === 'tested' || step.api.status === 'partial') {
        requireValue(typeof step.historical_observation === 'string' &&
          /\b\d+\.\d+\.\d+ local api component: passed\b/.test(step.historical_observation),
        'Tested or partial API path needs a scoped passing observation');
      }
      if (step.historical_observation !== null) prose(step.historical_observation);
    }
  }
  if (applies && data.streams.some(row => row.id === 'Analyst:VS2-5' && row.recipe)) {
    const bytes = readFileSync(new URL('../static/examples/connector-builder-import-test-generate.py', import.meta.url));
    requireValue(createHash('sha256').update(bytes).digest('hex') === data.exampleSha256, 'Public example differs from pinned private source');
  }
  if (typed) {
    const linked = new Set();
    for (const link of data.claimLinks) {
      shape(link, ['streamId', 'recipeRevision', 'recipeSha256', 'stepId', 'capabilityId', 'role', 'basis']);
      const key = JSON.stringify([link.streamId, link.recipeRevision, link.recipeSha256, link.stepId, link.capabilityId]);
      requireValue(expectedLinks.has(key) && !linked.has(key), 'Typed link is missing, duplicated or outside a reviewed step');
      linked.add(key);
      requireValue(['uses', 'verifies'].includes(link.role), 'Invalid typed link role');
      if (link.role === 'uses') requireValue(link.basis === null, 'Ingredient link cannot claim proof');
      else prose(link.basis);
    }
    requireValue(linked.size === expectedLinks.size, 'Typed recipe step links are incomplete');
  }
  assertPublicOutputSafe(JSON.stringify(data));
  if (applies && !typed) requireValue(createHash('sha256').update(JSON.stringify(data)).digest('hex') === reviewedStreamsSha256,
    'Stream projection differs from reviewed kit export');
  if (applies && typed && reviewedTypedSha256 !== null) requireValue(
    createHash('sha256').update(JSON.stringify(data)).digest('hex') === reviewedTypedSha256,
    'Typed stream projection differs from reviewed kit export');
  return applies && (!typed || reviewedTypedSha256 !== null) ? data : null;
}
