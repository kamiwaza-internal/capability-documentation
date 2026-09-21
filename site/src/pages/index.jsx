import React, {useState} from 'react';
import Layout from '@theme/Layout';
import publication from '../../data/publication.json';
import {filterCapabilities, countStatuses} from '../catalog.mjs';

function TextList({title, items}) {
  return <><h4>{title}</h4>{items.length ? <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>None specified in this publication.</p>}</>;
}

export default function Catalog() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  return <Layout title="Release catalog" description="Reviewed Kamiwaza capabilities, conditions and exact-build verification status.">
    <header className="catalogHero"><div className="container">
      <p className="eyebrow">THE KAMIWAZA CAPABILITY CATALOG</p>
      <h1>Know what your release can do.</h1>
      <p>Capabilities, conditions, and evidence—kept together, release by release.</p>
    </div></header>
    <main className="container catalogMain">
      <aside className="evidenceNotice"><strong>Evidence, not assumptions.</strong> A documented feature is not automatically verified. Partial coverage and development builds are labeled explicitly. Absence does not mean unsupported.</aside>
      <h2>Published releases</h2>
      {publication.releases.length === 0 ? <section className="emptyCatalog">
        <h3>No approved releases published yet</h3>
        <p>This catalog is being prepared. Release pages will appear after their content and evidence summaries pass publication review.</p>
        <p>No verification counts or release claims are implied by this empty catalog.</p>
      </section> : <>
        <div className="catalogFilters">
          <label>Search capabilities <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label>Evidence status <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {['verified', 'partial', 'failed', 'untested'].map(value => <option key={value} value={value}>{value}</option>)}
          </select></label>
        </div>
        <nav aria-label="Published releases"><ul>{publication.releases.map(release => <li key={release.id}><a href={'#' + release.id}>{release.version} · {release.channel} · revision {release.publicationRevision}</a></li>)}</ul></nav>
        {publication.releases.map(release => <section className="release" id={release.id} key={release.id}>
          <h2>{release.version} <span className="status">{release.channel}</span></h2>
          <p>Publication revision {release.publicationRevision} · <time dateTime={release.publishedAt}>{release.publishedAt}</time></p>
          <p>Tested build: <code>{release.build}</code></p>
          <p>Source revision: <code>{release.sourceRevision}</code> · <a href={release.reviewReference}>Publication review</a></p>
          <p>{release.capabilities.length} capabilities in this public snapshot. This is not a complete platform inventory.</p>
          <p>{Object.entries(countStatuses(release.capabilities)).map(([label, count]) => `${count} ${label}`).join(' · ')}. Counts cover the full snapshot, not search results.</p>
          {filterCapabilities(release.capabilities, query, status).length === 0 && <p role="status">No matching capabilities in this snapshot. This does not mean unsupported.</p>}
          {filterCapabilities(release.capabilities, query, status).map(cap => <article className="capability" id={release.id + '--' + cap.id} key={cap.id}>
            <h3>{cap.title} <span className="status">{cap.status}</span></h3>
            <p><code>{cap.id}</code></p><p>{cap.summary}</p>
            <TextList title="Prerequisites" items={cap.conditions}/>
            <TextList title="Conditions and limits" items={cap.limits}/>
            <h4>Evidence summary</h4>
            {cap.evidence.length ? <ul>{cap.evidence.map((e, i) => <li key={i}><strong>{e.outcome}</strong> — {e.summary}</li>)}</ul> : <p>No evidence in this snapshot.</p>}
            {!cap.wholeClaim && <p>Whole-claim verification is not established.</p>}
          </article>)}
        </section>)}
      </>}
    </main>
  </Layout>;
}
