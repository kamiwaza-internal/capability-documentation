import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {publicationDigest} from './sales-guidance.mjs';
import {id, requireValue, shape, text} from './local-stamps.mjs';
import {assertPublicOutputSafe, unsafePublicText} from './public-output-privacy.mjs';

const pathStatus = new Set(['untested', 'partial', 'tested', 'inapplicable']);
const streamStatus = new Set(['unmapped', ...pathStatus]);
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
  shape(data, ['schema', 'publicationSha256', 'source', 'exampleSha256', 'inventoryCount', 'historicalMappingCount', 'streams']);
  requireValue(data.schema === 'public-value-stream-recipes.v1', 'Unsupported stream recipes');
  requireValue(typeof data.publicationSha256 === 'string' && /^[a-f0-9]{64}$/.test(data.publicationSha256), 'Invalid stream publication hash');
  const applies = data.publicationSha256 === publicationDigest(publication);
  shape(data.source, ['sourceKind', 'kitCommit']);
  requireValue(data.source.sourceKind === 'reviewed-private-kit' && /^[a-f0-9]{40}$/.test(data.source.kitCommit), 'Unpinned stream source');
  requireValue(Number.isInteger(data.inventoryCount) && data.inventoryCount > 0 && Number.isInteger(data.historicalMappingCount) && data.historicalMappingCount >= 0, 'Invalid stream migration totals');
  requireValue(data.exampleSha256 === null || (typeof data.exampleSha256 === 'string' && /^[a-f0-9]{64}$/.test(data.exampleSha256)), 'Invalid example digest');
  requireValue(Array.isArray(data.streams) && data.streams.length === data.inventoryCount, 'Incomplete stream inventory');
  const seen = new Set();
  const published = new Set(publication.releases.filter(r => r.publicationState !== 'draft').flatMap(r => r.capabilities.map(c => `${r.version}:${c.id}`)));
  for (const item of data.streams) {
    shape(item, ['id', 'title', 'status', 'recipe']);
    prose(item.id); prose(item.title);
    requireValue(!seen.has(item.id) && streamStatus.has(item.status), 'Duplicate or invalid stream');
    seen.add(item.id);
    if (item.recipe === null) {
      requireValue(item.status === 'unmapped' || item.status === 'untested', 'Invalid missing stream recipe');
      continue;
    }
    shape(item.recipe, ['revision', 'outcome', 'source_version', 'tested_build', 'roles', 'prerequisites', 'configuration', 'custom_app_boundary', 'limits', 'steps']);
    const recipe = item.recipe;
    requireValue(item.status !== 'unmapped', 'A mapped recipe cannot be unmapped');
    requireValue(Number.isInteger(recipe.revision) && recipe.revision > 0 && /^\d+\.\d+\.\d+$/.test(recipe.source_version), 'Invalid stream revision or version');
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
      for (const cid of step.capability_ids) requireValue(id.test(cid) && (!applies || published.has(`${recipe.source_version}:${cid}`)), 'Step capability outside published source version');
      path(step.api); path(step.kaizen_ui);
      if (step.historical_observation !== null) prose(step.historical_observation);
    }
  }
  if (applies && data.streams.some(row => row.id === 'Analyst:VS2-5' && row.recipe)) {
    const bytes = readFileSync(new URL('../static/examples/connector-builder-import-test-generate.py', import.meta.url));
    requireValue(createHash('sha256').update(bytes).digest('hex') === data.exampleSha256, 'Public example differs from pinned private source');
  }
  assertPublicOutputSafe(JSON.stringify(data));
  return applies ? data : null;
}
