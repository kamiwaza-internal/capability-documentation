import React from 'react';
import {gapLabels, linkedCapabilityIds, recipeProof} from '../value-stream-map.mjs';

export default function RecipeDetail({recipe, capability, corpus}) {
  const proof = recipeProof(recipe, corpus);
  return <aside className="mapDetail" aria-label={capability ? `Capability details: ${capability.id}` : `Recipe details: ${recipe?.id ?? "selection"}`}>
    <p className="mapEyebrow">{capability ? 'Capability detail' : 'Recipe detail'}</p>
    <h3>{capability?.title ?? recipe?.title ?? 'Select a recipe'}</h3>
    {capability ? <>
      <code>{capability.id}</code>
      <dl><dt>Inventory scope</dt><dd>{capability.disposition}</dd>{(capability.details ?? []).map(item => <React.Fragment key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></React.Fragment>)}</dl>
      {capability.conditions?.length > 0 && <><h4>Conditions & assumptions</h4><ul>{capability.conditions.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
      {capability.limits?.length > 0 && <><h4>Limits</h4><ul>{capability.limits.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
      <p>This capability retains its own identity and evidence scope wherever it is used. Connections do not grant additional verification.</p>
    </> : recipe && <>
      <code>{recipe.id}</code>
      <dl><dt>Definition</dt><dd>Revision {recipe.definitionRevision} · {recipe.orderedStepCount} authored steps</dd>
        <dt>Definition source version</dt><dd>{recipe.sourceVersion}</dd>
        <dt>Scoped journey</dt><dd>{proof ? 'Established in this source snapshot' : 'No established proof in this source snapshot'}</dd>
        <dt>Complete UI journey</dt><dd>Not established</dd><dt>Recipe release membership</dt><dd>Not established</dd></dl>
      <p>{proof ? 'Retained proof covers only its recorded scopes and build. The reviewed claims below keep their independent capability verdicts; they do not certify the parent stream.' : 'A recipe definition records a plan. It does not establish a passing run.'}</p>
      <h4>Reviewed capability claims</h4>
      {recipe.reviewedVerifies.length ? <ul>{recipe.reviewedVerifies.map(id => <li key={id}><code>{id}</code></li>)}</ul> : <p>No reviewed claims published for this recipe.</p>}
      {recipe.reviewedVerifies.length > 0 && !proof && <p>These reviewed links have no established scoped SDK proof here.</p>}
      {recipe.capabilityIds && <><h4>Capability ingredients</h4><ul>{linkedCapabilityIds(recipe).map(id => <li key={id}><code>{id}</code> · ingredient only</li>)}</ul></>}
      {recipe.limits?.length > 0 && <><h4>Recipe limits</h4><ul>{recipe.limits.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
      <h4>Recorded gaps</h4><ul>{recipe.gaps.map(gap => <li key={gap}>{gapLabels[gap]}</li>)}</ul>
      <p>{recipe.capabilityIds ? 'Ingredient links come from this release’s reviewed recipe publication. A definition does not establish execution.' : 'Step instructions and ingredient links are not published in this inventory snapshot.'}</p>
    </>}
  </aside>;
}
