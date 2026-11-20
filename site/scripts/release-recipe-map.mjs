import {assertPublicOutputSafe, unsafePublicText} from './public-output-privacy.mjs';
import {id, list, requireValue, shape, text, unique} from './local-stamps.mjs';

const streamId = /^(Analyst|Operator|SysAdmin):[A-Za-z0-9-]+$/;
const scenarioId = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,239}$/;
const title = value => {
  text(value);
  requireValue(!unsafePublicText(value), 'Unsafe recipe map title');
};

function validateRecipe(recipe, stream, included) {
  shape(recipe, ['id', 'title', 'definitionRevision', 'definitionSha256', 'sourceCommit', 'steps']);
  requireValue(recipe.id.startsWith(stream.id + ':') && /^[A-Za-z0-9:-]+$/.test(recipe.id), 'Invalid release recipe ID');
  requireValue(Number.isSafeInteger(recipe.definitionRevision) && recipe.definitionRevision > 0 &&
    /^[a-f0-9]{64}$/.test(recipe.definitionSha256) && /^[a-f0-9]{40}$/.test(recipe.sourceCommit), 'Unpinned recipe definition');
  title(recipe.title);
  list(recipe.steps, 50);
  requireValue(recipe.steps.length > 0, 'Empty release recipe');
  unique(recipe.steps.map(step => step.id));
  for (const step of recipe.steps) {
    shape(step, ['id', 'links', 'scenarios']);
    requireValue(/^[a-z0-9-]+$/.test(step.id), 'Invalid recipe step ID');
    list(step.links, 100);
    for (const link of step.links) {
      shape(link, ['capabilityId', 'role']);
      requireValue(included.has(link.capabilityId) && ['uses', 'verifies'].includes(link.role), 'Invalid capability link');
    }
    unique(step.links.map(link => link.capabilityId));
    list(step.scenarios, 100);
    requireValue(step.scenarios.every(value => scenarioId.test(value) && !unsafePublicText(value)), 'Invalid scenario identifier');
    unique(step.scenarios);
  }
}

export function validateReleaseRecipeMap(map, publication) {
  shape(map, ['schema', 'release', 'snapshot', 'coreRevision', 'sourceStreamCount', 'streams']);
  requireValue(map.schema === 'public-release-recipe-map.v1' &&
    /^\d+\.\d+\.\d+$/.test(map.release) && id.test(map.snapshot) && /^[a-f0-9]{40}$/.test(map.coreRevision),
    'Invalid release recipe map binding');
  const releases = (publication.releaseStamps ?? []).filter(row => row.version === map.release);
  if (!releases.length) return null;
  const bound = releases.find(row => row.id === map.snapshot);
  requireValue(bound?.source.ref === 'v' + map.release && bound.source.sourceRevision === map.coreRevision,
    'Recipe map must bind to the published release');
  const latest = releases.reduce((a, b) => a.publicationRevision > b.publicationRevision ? a : b);
  requireValue(latest.source.sourceRevision === map.coreRevision, 'Recipe map does not match current released Core');
  const included = new Set(bound.capabilities.filter(row => row.disposition === 'included').map(row => row.id));
  list(map.streams, 100);
  requireValue(map.streams.length > 0 && Number.isSafeInteger(map.sourceStreamCount) &&
    map.sourceStreamCount >= map.streams.length, 'Invalid mapped stream inventory count');
  for (const stream of map.streams) {
    shape(stream, ['id', 'title', 'recipes']);
    requireValue(streamId.test(stream.id), 'Invalid parent value stream ID');
    title(stream.title);
    list(stream.recipes, 100);
    requireValue(stream.recipes.length > 0, 'Empty mapped value stream');
    for (const recipe of stream.recipes) validateRecipe(recipe, stream, included);
  }
  unique(map.streams.map(stream => stream.id));
  unique(map.streams.flatMap(stream => stream.recipes.map(recipe => recipe.id)));
  const definitions = new Map(map.streams.flatMap(stream => stream.recipes.map(recipe => [recipe.id, recipe])));
  for (const replay of releases.filter(row => row.valueStreamVerification)) {
    const result = replay.valueStreamVerification;
    const completed = new Set(replay.recipeVerifications.map(row => row.id));
    requireValue(result.counts.parents === map.sourceStreamCount, 'Value-stream totals do not match the mapped inventory');
    for (const row of result.passed) {
      const stream = map.streams.find(stream => stream.id === row.id && stream.title === row.title);
      requireValue(stream?.recipes.every(recipe => completed.has(recipe.id)), 'Passing stream needs its mapped recipe verdicts');
    }
  }
  for (const verdict of releases.flatMap(row => row.recipeVerifications ?? [])) {
    const definition = definitions.get(verdict.id);
    requireValue(definition?.definitionRevision === verdict.revision &&
      definition.definitionSha256 === verdict.recipeSha256, 'Full recipe verdict does not match the mapped definition');
  }
  assertPublicOutputSafe(JSON.stringify(map));
  return map;
}

export function releaseMapRecipes(map, replay) {
  const verifications = new Map((replay?.recipeVerifications ?? []).map(row => [row.id, row]));
  return map.streams.flatMap(stream => stream.recipes.map(recipe => {
    const links = recipe.steps.flatMap(step => step.links);
    const verdict = verifications.get(recipe.id);
    const releaseVerification = verdict?.revision === recipe.definitionRevision && verdict.recipeSha256 === recipe.definitionSha256
      ? {...verdict, snapshotId: replay.id} : null;
    return {...recipe, parentTitle: stream.title, releaseVerification,
      orderedStepCount: recipe.steps.length, sourceVersion: map.release,
      capabilityIds: [...new Set(links.map(link => link.capabilityId))],
      reviewedVerifies: [...new Set(links.filter(link => link.role === 'verifies').map(link => link.capabilityId))],
      gaps: [],
    };
  }));
}
