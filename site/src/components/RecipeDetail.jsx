import React from 'react';
import {gapLabels} from '../value-stream-map.mjs';

export default function RecipeDetail({recipe, capability, corpus}) {
  const proof = corpus.establishedScopedProofs.find(row => row.recipeId === recipe?.id);
  return <aside className="mapDetail" aria-label={capability ? `Capability details: ${capability.id}` : `Recipe details: ${recipe?.id ?? "selection"}`}>
    <p className="mapEyebrow">{capability ? 'Capability detail' : 'Recipe detail'}</p>
    <h3>{capability?.title ?? recipe?.title ?? 'Select a recipe'}</h3>
    {capability ? <>
      <code>{capability.id}</code>
      <dl><dt>Inventory scope</dt><dd>{capability.disposition}</dd><dt>Source declaration</dt><dd>{capability.sourceDeclaration}</dd>
        <dt>Snapshot prerelease status</dt><dd>{capability.prereleaseStatus}</dd></dl>
      <p>This capability retains its own identity and evidence scope wherever it is used. Connections do not grant additional verification.</p>
    </> : recipe && <>
      <code>{recipe.id}</code>
      <dl><dt>Definition</dt><dd>Revision {recipe.definitionRevision} · {recipe.orderedStepCount} authored steps</dd>
        <dt>Definition source version</dt><dd>{recipe.sourceVersion}</dd>
        <dt>Scoped SDK journey</dt><dd>{proof ? 'Established in this source snapshot' : 'No established proof in this source snapshot'}</dd>
        <dt>Complete UI journey</dt><dd>Not established</dd><dt>Recipe release membership</dt><dd>Not established</dd></dl>
      <p>{proof ? 'The retained SDK proof covers only the credited capability IDs below. It does not prove every operation or the parent value stream.' : 'A recipe definition records a plan. It does not establish a passing run.'}</p>
      <h4>Reviewed capability claims</h4>
      {recipe.reviewedVerifies.length ? <ul>{recipe.reviewedVerifies.map(id => <li key={id}><code>{id}</code></li>)}</ul> : <p>No reviewed claims published for this recipe.</p>}
      {recipe.reviewedVerifies.length > 0 && !proof && <p>These reviewed links have no established scoped SDK proof here.</p>}
      <h4>Recorded gaps</h4><ul>{recipe.gaps.map(gap => <li key={gap}>{gapLabels[gap]}</li>)}</ul>
      <p>Step instructions and ingredient links are not published in this inventory snapshot.</p>
    </>}
  </aside>;
}
