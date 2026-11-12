import {evidenceVersions} from './evidence.mjs';
import {dashboardCapabilities} from './dashboard-capabilities.mjs';

function sidecarRecipes(streams, version) {
  if (!streams) return [];
  return streams.streams.filter(stream => stream.recipe?.source_version === version).map(stream => {
    const recipe = stream.recipe;
    const claims = (streams.claimLinks ?? []).filter(link => link.streamId === stream.id && link.role === 'verifies');
    return {id: stream.id, title: stream.title, definitionRevision: recipe.revision,
      orderedStepCount: recipe.steps.length, sourceVersion: recipe.source_version,
      capabilityIds: Array.from(new Set(recipe.steps.flatMap(step => step.capability_ids))),
      reviewedVerifies: Array.from(new Set(claims.map(link => link.capabilityId))),
      scopedSdkProof: 'none', gaps: [], limits: recipe.limits};
  });
}

function currentRecipeProofs(release) {
  return release.capabilities.filter(cap => {
    if (cap.verificationBasis !== 'value-stream') return false;
    if (cap.status !== 'prerelease-verified') return false;
    if (cap.proof?.state !== 'established') return false;
    const recipe = release.recipeInventory.find(row => row.id === cap.proof.recipeId);
    return recipe?.reviewedVerifies.includes(cap.id);
  }).map(cap => ({recipeId:cap.proof.recipeId, recipeSha256:cap.proof.recipeSha256,
    recipeRevision:cap.proof.recipeRevision, creditedCapabilityIds:[cap.id]}));
}

function recipeInventory(entry, streams, publication) {
  const release = entry.work?.fresh?.release ?? entry.releaseIds.map(id => publication.releases.find(row => row.id === id)).find(row => row.recipeInventory);
  if (release?.recipeInventory) return {recipes: release.recipeInventory,
    establishedScopedProofs: currentRecipeProofs(release),
    recipeNote: 'Authored recipe inventory from the pinned Kit revision. Recipe release membership is not established; capability and recipe proof stay separate.'};
  const catalog = (entry.originalCorpus ?? entry.corpus)?.catalog;
  if (catalog) return {recipes: catalog.recipes, establishedScopedProofs: catalog.establishedScopedProofs,
    recipeNote: `Recipe definitions and scoped SDK proof are from the retained ${catalog.release} inventory snapshot; recipe release membership is not established.`};
  return {recipes: sidecarRecipes(streams, entry.version), establishedScopedProofs: [],
    recipeNote: 'Only recipe definitions bound to this release’s reviewed publication are shown. Ingredient links do not establish proof.'};
}

function sourceIdentity(entry, sources) {
  const catalog = (entry.originalCorpus ?? entry.corpus)?.catalog;
  if (catalog) return [`Kit revision ${catalog.pins.kitMergeCommit}`, `Core revision ${catalog.pins.productCoreCommit}`];
  if (entry.work) return [`Prior evidence version ${entry.work.originalVersion}`, `Work source ${entry.work.sourceBranch}`, ...(entry.work.fresh ? [`Current Kit revision ${entry.work.fresh.release.sourceRevision}`] : [])];
  if (entry.kind === 'release-stamps') return [`Stamp target ${sources.releaseStamps.releaseTag}`, `Prerelease baseline ${sources.releaseStamps.baselineReleaseId}`];
  if (entry.replay) return [`Replay ${entry.replay.id}`, `Core revision ${entry.replay.source.sourceRevision}`];
  return entry.releaseIds.map(id => sources.publication.releases.find(row => row.id === id))
    .map(row => `Publication ${row.id}; source ${row.sourceRevision ?? row.build}`);
}

// Use the same discovery and version ordering as the homepage and download builder.
// Adding reviewed release data through any existing intake needs no dashboard registration.
export function dashboardReleases(sources) {
  const entries = evidenceVersions(sources.publication, sources.releaseStamps, sources.corpora,
    sources.currentVerification, sources.releaseWork);
  return entries.map(entry => ({release: entry.version, kind: entry.kind, headline: entry.headline,
    basis: entry.basis, sourceIdentity: sourceIdentity(entry, sources),
    capabilities: dashboardCapabilities(entry, sources), ...recipeInventory(entry, sources.streams, sources.publication),
    gaps: (entry.originalCorpus ?? entry.corpus)?.catalog.gaps ?? [],
  }));
}
