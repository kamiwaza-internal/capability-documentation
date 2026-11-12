// Group definitions by their stable persona/parent ID, never by a blended title.
export const parentId = id => id.split(':').slice(0, 2).join(':');
export const linkedCapabilityIds = recipe => recipe.capabilityIds ?? recipe.reviewedVerifies;
export const cleanTitle = title => title.replace(/^VS[\d.-]+:\s*/, '');
export const gapLabels = {
  'typed-definition-needed': 'Typed definition needed',
  'release-adaptation-needed': 'Release adaptation needed',
  'reviewed-verifies-needed': 'Reviewed capability links needed',
  'complete-ui-observation-needed': 'Complete UI observation needed',
};

export function streamInventory(corpus) {
  const groups = new Map();
  for (const recipe of corpus.recipes) {
    const id = parentId(recipe.id);
    if (!groups.has(id)) groups.set(id, {id, persona: id.split(':')[0], recipes: []});
    groups.get(id).recipes.push(recipe);
  }
  return [...groups.values()].map(stream => ({...stream,
    title: cleanTitle(stream.recipes.find(recipe => recipe.id === stream.id)?.title ?? stream.id),
  }));
}

export function findStreams(streams, query, persona, corpus) {
  const needle = query.trim().toLowerCase();
  const names = new Map(corpus.capabilities.map(cap => [cap.id, cap.title]));
  return streams.filter(stream => {
    if (persona !== 'all' && stream.persona !== persona) return false;
    const text = [stream.id, stream.title, ...stream.recipes.flatMap(recipe =>
      [recipe.title, recipe.id, ...linkedCapabilityIds(recipe).flatMap(id => [id, names.get(id)])])];
    return text.join(' ').toLowerCase().includes(needle);
  });
}

export function streamCapabilities(stream, corpus) {
  const ids = new Set(stream.recipes.flatMap(linkedCapabilityIds));
  return corpus.capabilities.filter(cap => ids.has(cap.id));
}

export function mappingSummary(corpus) {
  const known = new Set(corpus.capabilities.map(cap => cap.id));
  const mapped = new Set(corpus.recipes.flatMap(linkedCapabilityIds).filter(id => known.has(id)));
  return {streams: streamInventory(corpus).length, recipes: corpus.recipes.length,
    linked: mapped.size, unmapped: corpus.capabilities.filter(cap => !mapped.has(cap.id)).length};
}


export function recipeProof(recipe, corpus) {
  return corpus.establishedScopedProofs.find(proof => {
    if (proof.recipeId !== recipe?.id) return false;
    if (proof.recipeSha256 && proof.recipeSha256 !== recipe.definitionSha256) return false;
    if (proof.recipeRevision && proof.recipeRevision !== recipe.definitionRevision) return false;
    return true;
  });
}
