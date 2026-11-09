import React from 'react';
import {cleanTitle, streamCapabilities} from '../value-stream-map.mjs';

const center = (index, count) => (index + 0.5) / count * 100;

export default function StreamGraph({stream, corpus, selection, onSelect}) {
  const caps = streamCapabilities(stream, corpus);
  const height = Math.max(320, stream.recipes.length * 168, caps.length * 168);
  const selectedRecipe = stream.recipes.find(recipe => recipe.id === selection.recipe);
  const active = new Set(selectedRecipe?.reviewedVerifies ?? []);
  return <div className="streamGraph" style={{'--map-height': `${height}px`}}>
    <svg className="streamEdges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {stream.recipes.map((recipe, index) => {
        const y = center(index, stream.recipes.length);
        return <g key={recipe.id} className={recipe.id === selection.recipe ? 'edgeSelected' : ''}>
          <path d={`M 27 50 C 32 50, 32 ${y}, 37 ${y}`}/>
          {recipe.reviewedVerifies.map(id => {
            const capY = center(caps.findIndex(cap => cap.id === id), caps.length);
            return <path className="claimEdge" key={id} d={`M 64 ${y} C 69 ${y}, 69 ${capY}, 74 ${capY}`}/>;
          })}
        </g>;
      })}
    </svg>
    <div className="streamColumn">
      <div className="streamHub"><small>{stream.persona} · Value stream</small><strong>{stream.title}</strong><span>Whole-stream proof not established</span></div>
    </div>
    <div className="streamColumn" style={{gridTemplateRows: `repeat(${stream.recipes.length}, 1fr)`}}>{stream.recipes.map(recipe =>
      <button type="button" key={recipe.id} title={recipe.title} className="streamNode recipeNode" aria-pressed={recipe.id === selection.recipe}
        onClick={() => onSelect({recipe: recipe.id, capability: null})}>
        <small>Recipe · revision {recipe.definitionRevision}</small><strong>{cleanTitle(recipe.title)}</strong>
        <span>{recipe.scopedSdkProof === 'established' ? 'Scoped SDK proof retained' : 'No scoped SDK proof recorded'}</span>
      </button>)}</div>
    <div className="streamColumn" style={{gridTemplateRows: `repeat(${Math.max(1, caps.length)}, 1fr)`}}>{caps.length ? caps.map(cap =>
      <button type="button" key={cap.id} title={cap.title} className={'streamNode capabilityNode' + (active.has(cap.id) ? ' connectedNode' : '')}
        aria-pressed={cap.id === selection.capability} onClick={() => onSelect({...selection, capability: cap.id})}>
        <small>{cap.id.split('.')[0]} · Capability</small><strong>{cap.title}</strong><code>{cap.id}</code>
      </button>) : <div className="streamGraphGap">No reviewed capability links in this snapshot.<br/>Capabilities are not inferred from the stream title.</div>}</div>
  </div>;
}
