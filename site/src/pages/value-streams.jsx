import React, {useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import StreamGraph from '../components/StreamGraph';
import RecipeDetail from '../components/RecipeDetail';
import {findStreams, linkedCapabilityIds, mappingSummary, streamInventory} from '../value-stream-map.mjs';
import '../css/value-streams.css';
import {salesKitPath} from '../sales-kit.mjs';

function CapabilityInventory({corpus, selection, onSelect}) {
  const [query, setQuery] = useState('');
  const [full, setFull] = useState(false);
  const mapped = new Set(corpus.recipes.flatMap(linkedCapabilityIds));
  const caps = corpus.capabilities.filter(cap => (full || cap.disposition === 'included') &&
    `${cap.id} ${cap.title}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="mapInventory" aria-labelledby="capability-inventory">
    <div className="mapSectionHeading"><div><p className="mapEyebrow">Independent building blocks</p><h2 id="capability-inventory">Capabilities & mapping gaps</h2></div>
      <span>{caps.length} definitions shown</span></div>
    <p>Ontology, Workroom and other product areas remain separate capabilities. Recipes can use multiple capabilities together. A missing connection means the relationship is not published here.</p>
    <div className="mapInventoryControls"><label>Find a capability<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or capability ID"/></label>
      <label className="mapCheckbox"><input type="checkbox" checked={full} onChange={event => setFull(event.target.checked)}/>Include excluded inventory definitions</label></div>
    <div className="mapCapabilityGrid">{caps.map(cap => <React.Fragment key={cap.id}><button type="button"
      className="mapCapabilityCard" aria-pressed={selection.capability === cap.id} onClick={() => onSelect({...selection, capability: cap.id})}>
      <small>{cap.id.split('.')[0]} · {cap.disposition}</small><strong>{cap.title}</strong><code>{cap.id}</code>
      <span>{mapped.has(cap.id) ? 'Reviewed recipe relationship linked' : 'No reviewed recipe link published'}</span>
    </button>{selection.capability === cap.id && <div className="mapInventoryDetail"><RecipeDetail capability={cap} corpus={corpus}/></div>}</React.Fragment>)}</div>
    {caps.length === 0 && <p role="status">No capabilities match this search.</p>}
  </section>;
}

function Dashboard({corpus}) {
  const streams = streamInventory(corpus);
  const counts = mappingSummary(corpus);
  const initial = streams.find(stream => stream.id === 'Operator:VS1') ?? streams[0];
  const [streamId, setStreamId] = useState(initial?.id);
  const [query, setQuery] = useState('');
  const [persona, setPersona] = useState('all');
  const [selection, setSelection] = useState({recipe: initial?.recipes[0]?.id, capability: null});
  const matches = findStreams(streams, query, persona, corpus);
  const stream = matches.find(row => row.id === streamId) ?? matches[0];
  const recipe = stream?.recipes.find(row => row.id === selection.recipe) ?? stream?.recipes[0];
  const effective = {...selection, recipe: recipe?.id};
  const capability = corpus.capabilities.find(row => row.id === selection.capability);
  function updateFilter(setFilter, value) {
    setFilter(value);
    setSelection(current => ({...current, capability:null}));
  }
  function chooseStream(id) {
    setStreamId(id);
    setSelection({recipe: streams.find(row => row.id === id).recipes[0].id, capability: null});
  }
  return <>
    <div className="mapStats" aria-label="Inventory snapshot counts">{[
      [counts.streams, 'value stream groups'], [counts.recipes, 'recipe definitions'],
      [corpus.capabilities.length, 'capability definitions'], [counts.unmapped, 'without a reviewed recipe link'],
    ].map(([count, label]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>
    <aside className="mapSnapshot"><strong>{corpus.release} · {corpus.headline}</strong>
      <p>{corpus.basis} <a href={salesKitPath(corpus.release) + '.md'}>Read this release’s scope and limits</a>.</p>
      <p>{corpus.recipeNote}</p>
    </aside>
    {streams.length > 0 && <div className="mapFilters"><label>Find a value stream<input type="search" value={query} onChange={event => updateFilter(setQuery, event.target.value)} placeholder="Search streams, recipes or linked capabilities"/></label>
      <label>Persona<select aria-label="Persona" value={persona} onChange={event => updateFilter(setPersona, event.target.value)}><option value="all">All personas</option>{Array.from(new Set(streams.map(row => row.persona))).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <label>Value stream<select aria-label="Value stream" value={stream?.id ?? ''} onChange={event => chooseStream(event.target.value)} disabled={!matches.length}>
        {!matches.length && <option value="">No matching streams</option>}{matches.map(row => <option key={row.id} value={row.id}>{row.persona} · {row.title}</option>)}
      </select></label></div>}
    {stream ? <section className="mapWorkspace" aria-labelledby="selected-stream">
      <div className="mapSectionHeading"><div><p className="mapEyebrow">{stream.id}</p><h2 id="selected-stream">{stream.title}</h2></div><span className="mapBadge">Whole-stream proof not established</span></div>
      <p className="mapReadingKey">Select a recipe to highlight its separate capability relationships. Lines show recorded relationships; highlighting indicates selection. Only authored recipe steps define order.</p>
      <div className="mapWorkspaceGrid"><div className="mapCanvas"><div className="mapColumnLabels"><span>Value stream</span><span>Recipes</span><span>Linked capabilities</span></div>
        <StreamGraph stream={stream} corpus={corpus} selection={effective} onSelect={setSelection}/>
        <p className="mapLegend"><span>━ Grouped by parent ID</span><span>┄ Reviewed capability relationship</span><span>● Selected relationship</span></p>
      </div><RecipeDetail recipe={recipe} capability={capability} corpus={corpus}/></div>
      <p className="mapBoundary">Stream groups follow stable source IDs. A stream title such as “Use Ontologies in Workroom” describes a use case; it does not combine Ontology and Workroom into one capability. Default infrastructure or a historical definition does not establish supported user workflows.</p>
    </section> : streams.length === 0 ? <div className="mapEmpty" role="status"><h2>No recipe mapping published for {corpus.release}</h2><p>This release’s capability data is available below. Recipe definitions and proof are not inherited from another version.</p></div> : <div className="mapEmpty" role="status"><h2>No matching value streams</h2><p>Try another name, capability ID or persona.</p><button type="button" onClick={() => {setQuery(''); setPersona('all');}}>Clear filters</button></div>}
    <CapabilityInventory corpus={corpus} selection={effective} onSelect={setSelection}/>
    <details className="mapSource"><summary>Source identity & reading rules</summary><ul>{corpus.sourceIdentity.map(item => <li key={item}>{item}</li>)}</ul><p>Source identities are not a new test date.</p><ul>{corpus.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul><p>Not mapped and not established do not mean unsupported. Counts describe this inventory and must not be added to verification totals.</p></details>
  </>;
}

export default function ValueStreams() {
  const {siteConfig} = useDocusaurusContext();
  const releases = siteConfig.customFields.dashboardReleases ?? [];
  const [version, setVersion] = useState(releases[0]?.release ?? '');
  const corpus = releases.find(row => row.release === version);
  return <Layout title="Value stream map" description="Explore value streams, recipes and distinct Kamiwaza capabilities, with scoped proof and mapping gaps kept visible.">
    <header className="mapHero"><div className="container"><p className="mapEyebrow">KAMIWAZA · CAPABILITY ATLAS</p><h1>From the job to the building blocks.</h1><p>Explore value streams, inspect recipes and see the capabilities behind each claim.</p></div></header>
    <main className="container mapMain"><nav className="kitTabs" aria-label="Explore capabilities"><Link to="/">About and evidence</Link><Link to="/value-streams/" aria-current="page">Value stream map</Link></nav>
      {releases.length > 0 && <label className="mapVersion">Release<select aria-label="Release" value={version} onChange={event => setVersion(event.target.value)}>{releases.map(row => <option key={row.release}>{row.release}</option>)}</select></label>}
      {corpus ? <Dashboard key={version} corpus={corpus}/> : <p>No release data is published yet. <Link to="/catalog/">Browse capability evidence</Link>.</p>}
    </main>
  </Layout>;
}
