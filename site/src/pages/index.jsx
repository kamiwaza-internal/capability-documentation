import React, {useState} from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import publication from '../../data/publication.json';
import {filterCapabilities, countStatuses} from '../catalog.mjs';

function TextList({title, items}) {
  return <><h4>{title}</h4>{items.length ? <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>None specified in this publication.</p>}</>;
}

const prereleaseLabels = {
  'prerelease-verified': 'Project pre-release verified · not release verified',
  'failed-or-mixed': 'Failed or mixed',
  'not-yet-verified': 'Not yet verified',
};
const outcomeLabels = {passed: 'passed', passed_with_notes: 'passed with notes', failed: 'failed'};

// Distinct execution, assessment, ingestion, draft, publication and site-build dates.
function PrereleaseSummary({release}) {
  const {counts, evidenceWindow} = release;
  const gaps = release.capabilities.filter(cap => cap.status !== 'prerelease-verified');
  return <>
    <p>Project pre-release baseline scored by the capability kit: historical scenario evidence from development builds plus accepted local-contract developer assessments. The combined count does not mean live runtime passes. It is not release verification, not whole-capability certification and not release approval. Binding to a shipped {release.version} release is not established. {release.omittedCapabilities.length} other kit capabilities are outside this scope; their status is not inferred.</p>
    <dl className="dateAxes">
      <dt>Test runs finished</dt><dd><time dateTime={evidenceWindow.earliestRunFinishedAt}>{evidenceWindow.earliestRunFinishedAt}</time> to <time dateTime={evidenceWindow.latestRunFinishedAt}>{evidenceWindow.latestRunFinishedAt}</time>. Each record below carries its own run date.</dd>
      <dt>Evidence ingested</dt><dd>Each record shows when it entered the kit. Kit revision committed <time dateTime={release.sourceCommittedAt}>{release.sourceCommittedAt}</time>.</dd>
      <dt>Developer assessments</dt><dd><time dateTime={release.assessmentWindow.earliestAssessedAt}>{release.assessmentWindow.earliestAssessedAt}</time> to <time dateTime={release.assessmentWindow.latestAssessedAt}>{release.assessmentWindow.latestAssessedAt}</time>. Local contracts; no live scenario execution.</dd>
      <dt>Draft generated</dt><dd><time dateTime={release.generatedAt}>{release.generatedAt}</time>. Draft preparation, not publication or a test date.</dd>
      <dt>Publication review opened</dt><dd>{release.publishedAt ? <><time dateTime={release.publishedAt}>{release.publishedAt}</time>. When the publication review PR was opened, not the site deployment time.</> : 'Pending; no publication timestamp recorded.'}</dd>
      <dt>Tested builds</dt><dd>{release.testedBuilds.map(build => <code key={build}>{build} </code>)}</dd>
    </dl>
    <p><strong>{counts.prereleaseVerified} of {counts.included} project pre-release verified</strong> ({counts.scenarioVerified} historical scenario-backed; {counts.developerAssessed} local-contract developer-assessed) · {counts.failedOrMixed} failed or mixed · {counts.notYetVerified} not yet verified · <strong>{counts.releaseVerified} of {counts.included} release verified</strong> · {counts.releaseFailed} release check failed. Counts cover the full snapshot, not search results.</p>
    <details className="gaps"><summary>Historical baseline gaps: {counts.failedOrMixed} failed or mixed, {counts.notYetVerified} not yet verified</summary>
      <p>A gap means no clean pre-release evidence is published here. It does not mean unsupported.</p>
      <p>Deferred capabilities (included in the unverified count): {release.deferredCapabilities.map(cid => <code key={cid}>{cid} </code>)}</p>
      <ul>{gaps.map(cap => <li key={cap.id}><a href={'#' + release.id + '--' + cap.id}><code>{cap.id}</code></a> · {prereleaseLabels[cap.status]}</li>)}</ul>
    </details>
  </>;
}

// New run counts are observations, never canonical capability promotions.
function ScopedObservations({observation}) {
  const {counts: c, evidenceWindow: window, target} = observation;
  const reconciled = observation.capabilities.filter(row => row.baselineStatus === 'failed-or-mixed' && row.failedScenarios === 0);
  return <section className="release" id={observation.id}>
    <h2>Latest scoped observations · local {target.version}</h2>
    <aside className="evidenceNotice"><strong>Separate from the historical baseline.</strong> This run grants no whole-capability promotion and no release verification. Do not add these counts to the 50/88 project baseline; the catalogs and evidence scopes differ.</aside>
    <p>Local {target.version} test target. {target.sourceRevision ? <>Observed source <code>{target.sourceRevision}</code> (source metadata only; no running-byte or released-artifact attestation).</> : 'Target source binding is not established.'} Binding to a shipped release is not established.</p>
    <dl className="dateAxes">
      <dt>Original retained scenario-attempt window (UTC)</dt><dd><time dateTime={window.earliestStartedAt}>{window.earliestStartedAt}</time> to <time dateTime={window.latestFinishedAt}>{window.latestFinishedAt}</time></dd>
      <dt>Evidence source</dt><dd>Kit commit <code>{observation.sourceKitRevision}</code>, committed <time dateTime={observation.sourceCommittedAt}>{observation.sourceCommittedAt}</time>.</dd>
      <dt>Broader SDK execution phase (UTC)</dt><dd><time dateTime={observation.sdkExecutionWindow.earliestStartedAt}>{observation.sdkExecutionWindow.earliestStartedAt}</time> to <time dateTime={observation.sdkExecutionWindow.latestFinishedAt}>{observation.sdkExecutionWindow.latestFinishedAt}</time>. Phase boundaries are not individual scenario execution dates.</dd>
      <dt>Source run summary prepared (UTC)</dt><dd><time dateTime={observation.packetGeneratedAt}>{observation.packetGeneratedAt}</time>. Original summary preparation, not a new execution.</dd>
      <dt>Public summary prepared (UTC)</dt><dd><time dateTime={observation.generatedAt}>{observation.generatedAt}</time>. Preparation is not a new test or live acceptance.</dd>
    </dl>
    <p><strong>{c.observedCapabilities} of {c.catalog} capabilities have scoped runtime observations</strong>: {c.successfulCapabilities} with successful scoped scenarios and no failed scenario in this run; {c.capabilitiesWithFailures} with failed scenarios. {c.catalog - c.observedCapabilities} have no scoped runtime observations in this run. These are capability observations, not whole-capability passes.</p>
    <p><strong>Distinct scenarios:</strong> {c.passedScenarios} passed · {c.passedWithNotesScenarios} passed with notes · {c.failedScenarios} failed. These are not new baseline credits. Global totals are deduplicated; {c.sharedScenarioAssignments} additional scenario-to-capability assignment(s) overlap across rows.</p>
    <p>{c.inIncludedBaseline} observed capabilities are within the historical 88-capability included catalog; {c.outsideIncludedBaseline} are outside it. Neither denominator is substituted for the other.</p>
    {reconciled.length > 0 && <p>New successful scoped observations for {reconciled.map((row, i) => <React.Fragment key={row.id}>{i ? ', ' : ''}<code>{row.id}</code></React.Fragment>)} coexist with their historical failed or mixed baseline records. Those historical records remain unchanged; scoped success does not establish a whole-capability pass.</p>}
    <p><a href={'/observations/' + observation.id + '/bundle.json'}>Download sanitized observations (JSON)</a> · <a href="/observations/index.json">Observations index</a></p>
    <details className="gaps"><summary>All {c.observedCapabilities} observed capabilities and scoped outcomes</summary>
      <p>Rows count distinct scenarios attributed to each capability. A scenario can belong to multiple capabilities; row totals overlap and must not be added as distinct scenarios. Historical baseline labels describe the earlier snapshot.</p>
      <table><thead><tr><th>Capability</th><th>Catalog scope</th><th>Scoped outcome</th><th>Passed</th><th>With notes</th><th>Failed</th><th>Historical baseline</th></tr></thead>
      <tbody>{observation.capabilities.map(row => <tr key={row.id}><td><code>{row.id}</code></td><td>{row.inIncludedBaseline ? 'Included in 88' : 'Outside included 88'}</td><td>{row.failedScenarios ? 'Has failed scenarios' : 'Successful scoped observations'}</td><td>{row.passedScenarios}</td><td>{row.passedWithNotesScenarios}</td><td>{row.failedScenarios}</td><td>{row.baselineStatus ? prereleaseLabels[row.baselineStatus] : 'Outside historical included scope'}</td></tr>)}</tbody></table>
    </details>
  </section>;
}

export default function Catalog() {
  const {siteConfig} = useDocusaurusContext();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  return <Layout title="Release catalog" description="Reviewed Kamiwaza capabilities, conditions and exact-build verification status.">
    <header className="catalogHero"><div className="container">
      <p className="eyebrow">THE KAMIWAZA CAPABILITY CATALOG</p>
      <h1>Kamiwaza capability records</h1>
      <p>Source declarations, scenario evidence and developer assessments, by version.</p>
    </div></header>
    <main className="container catalogMain">
      <aside className="evidenceNotice"><strong>Evidence basis is explicit.</strong> A documented feature is not automatically verified. Partial coverage and development builds are labeled explicitly. Absence does not mean unsupported.</aside>
      {(publication.observations ?? []).map(observation => <ScopedObservations key={observation.id} observation={observation}/>)}
      <h2>Accepted historical pre-release baseline and source snapshots</h2>
      <p><a href="/releases/index.json">Machine-readable release index</a></p>
      <p>Site build: {siteConfig.customFields.buildRevision ? <>commit <code>{siteConfig.customFields.buildRevision}</code></> : 'revision not recorded (local build)'}. Site built <time dateTime={siteConfig.customFields.builtAt}>{siteConfig.customFields.builtAt}</time>. A site build or deployment is not a test run or a publication.</p>
      {publication.releases.length === 0 ? <section className="emptyCatalog">
        <h3>No approved releases published yet</h3>
        <p>This catalog is being prepared. Release pages will appear after their content and evidence summaries pass publication review.</p>
        <p>No verification counts or release claims are implied by this empty catalog.</p>
      </section> : <>
        <div className="catalogFilters">
          <label>Search capabilities <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label>Evidence status <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {['verified', 'partial', 'failed', 'untested', ...Object.keys(prereleaseLabels)].map(value => <option key={value} value={value}>{value}</option>)}
          </select></label>
        </div>
        <nav aria-label="Published releases"><ul>{publication.releases.map(release => <li key={release.id}><a href={'#' + release.id}>{release.version} · {release.channel} · {release.approval.status} · revision {release.publicationRevision}</a></li>)}</ul></nav>
        {publication.releases.map(release => <section className="release" id={release.id} key={release.id}>
          <h2>{release.version} <span className="status">{release.channel}</span> <span className="status">{release.approval.status}</span></h2>
          {release.approval.status === 'pending' ? <aside className="evidenceNotice"><strong>Pending release-manager sign-off.</strong> Human release approval is pending. This snapshot is not a release commitment.</aside> : null}
          <p>Publication revision {release.publicationRevision} · {release.publishedAt ? <><time dateTime={release.publishedAt}>{release.publishedAt}</time> (publication metadata, not a test date)</> : 'Draft candidate; publication pending'}</p>
          <p>{release.baselineKind === 'prerelease-evidence' ? 'Project pre-release baseline (historical scenarios and local contracts)' : release.baselineKind ? 'Source baseline (not a tested build)' : 'Tested build'}: <code>{release.build}</code></p>
          <p><a href={'/releases/' + release.id + '/bundle.json'}>Download evidence bundle (JSON)</a> · <a href={'/releases/' + release.id + '/bundle.md'}>Plain-text bundle</a></p>
          {release.baselineKind === 'source-declaration' && <p>Tier 1: declared in the cited development sources. Binding to a shipped 1.3.0 release is not established. Tier 2: runtime verification pending. {release.omittedCapabilities.length} other kit capabilities are not included; their status is not inferred.</p>}
          <p>{release.baselineKind ? 'Kit revision' : 'Source revision'}: <code>{release.sourceRevision}</code> · {release.reviewReference ? <a href={release.reviewReference}>Publication review</a> : 'Publication review pending'}</p>
          <p>{release.capabilities.length} capabilities in this public snapshot. This is not a complete platform inventory.</p>
          {release.baselineKind === 'prerelease-evidence' ? <PrereleaseSummary release={release}/> :
            <p>{Object.entries(countStatuses(release.capabilities)).map(([label, count]) => `${count} ${label}`).join(' · ')}. Counts cover the full snapshot, not search results.</p>}
          {filterCapabilities(release.capabilities, query, status).length === 0 && <p role="status">No matching capabilities in this snapshot. This does not mean unsupported.</p>}
          {filterCapabilities(release.capabilities, query, status).map(cap => <article className="capability" id={release.id + '--' + cap.id} key={cap.id}>
            <h3>{cap.title ?? cap.id} <span className="status">{cap.verificationBasis === 'developer-assessment' ? 'Local-contract developer-assessed · no live runtime pass' : prereleaseLabels[cap.status] ?? (cap.declaration ? 'Tier 1 declared · runtime untested' : cap.status)}</span>{cap.releaseStatus === 'failed' && <> <span className="status">Release check failed</span></>}</h3>
            <p><code>{cap.id}</code></p>
            {cap.summary === null ? <p>No curated declaration text is published for this capability in this revision. This does not mean unsupported.</p> : <>
              <p>{cap.summary}</p>
              <TextList title="Prerequisites" items={cap.conditions}/>
              <TextList title="Conditions and limits" items={cap.limits}/>
            </>}
            {cap.declaration && <section><h4>Tier 1 declaration evidence</h4>
              <p>{cap.declaration.scope}</p><p>{cap.declaration.mechanicalValidation}</p>
              <p>Kit document SHA-256: <code>{cap.declaration.documentSha256}</code></p>
              <ul>{cap.declaration.citations.map((c, i) => <li key={i}><code>{c.repo}/{c.path}</code> · {c.symbol} · revision <code>{c.read_at}</code> · {c.closed ? 'closed declaration' : 'open declaration'}</li>)}</ul>
            </section>}
            {cap.assessment && <section><h4>Developer assessment basis</h4>
              <p>{cap.assessment.scope}</p>
              <p>Assessed <time dateTime={cap.assessment.assessedAt}>{cap.assessment.assessedAt}</time> · {cap.assessment.ingestedAt ? <>ingested <time dateTime={cap.assessment.ingestedAt}>{cap.assessment.ingestedAt}</time></> : 'Kit ingestion timestamp not established.'}</p>
              <p>Observed source revision <code>{cap.assessment.observedSourceRevision}</code> (source only; no tested-build binding).</p>
              <TextList title="Assessment assumptions" items={cap.assessment.assumptions}/>
              <TextList title="Assessment limits" items={cap.assessment.limits}/>
            </section>}
            <h4>Evidence summary</h4>
            {cap.evidence.length ? <ul>{cap.evidence.map((e, i) => <li key={i}><strong>{e.scenario ? outcomeLabels[e.outcome] : e.outcome}</strong> — {e.scenario ? <><code>{e.scenario}</code> on <code>{e.build}</code> · test run finished <time dateTime={e.runFinishedAt}>{e.runFinishedAt}</time> · ingested <time dateTime={e.ingestedAt}>{e.ingestedAt}</time></> : e.summary}</li>)}</ul> : <p>{cap.assessment ? 'No scenario runtime evidence in this snapshot; basis is the developer assessment above.' : 'No evidence in this snapshot.'}</p>}
            {!cap.wholeClaim && <p>Whole-claim verification is not established.</p>}
          </article>)}
        </section>)}
      </>}
    </main>
  </Layout>;
}
