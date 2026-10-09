import React, {useState} from 'react';
import {currentCapabilityView, filterCapabilities, joinLocalStamps, summarizeCurrentView} from './catalog.mjs';

const statusLabels = {
  verified: 'Pre-release verified · not release verified',
  superseded: 'Superseded by a later applicable failure',
  'failed-or-mixed': 'Failed or mixed',
  'not-yet-verified': 'Not yet verified',
};
const basisLabels = {
  'historical-scenario': 'historical scenario',
  'developer-assessment': 'local-contract developer-assessed · no live runtime pass',
};
const Time = ({value}) => <time dateTime={value}>{value}</time>;

// Derived at render from the published records; nothing here is stored or re-scored.
export default function CurrentView({publication, localStamps}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [stampedOnly, setStampedOnly] = useState(false);
  const base = currentCapabilityView(publication);
  if (base.length === 0) return null;
  // Additive: the join attaches a badge and never changes a row's status.
  const local = localStamps ? joinLocalStamps(base, localStamps) : null;
  const rows = local ? local.rows : base;
  const stampLabel = local && `Local ${localStamps.targetVersion} scoped stamp`;
  const c = summarizeCurrentView(rows);
  const {releaseId, version} = rows[0].lineage;
  const targets = [...new Set(rows.flatMap(row => row.later.filter(l => !l.applicable && l.failedScenarios > 0).map(l => `${l.environment} ${l.version}`)))];
  const shown = filterCapabilities(rows, query, status).filter(row => !stampedOnly || row.localStamp);
  return <section className="release" id="current-capability-status">
    <h2>Current capability status</h2>
    <p>Derived on this page from the published records below; nothing here is stored or re-scored. An accepted pre-release verification stays current unless a later failed test on the same version and the same contract supersedes it. Untested, skipped or absent later results and missing descriptive text never remove it. Accepted in <a href={'#' + releaseId}><code>{releaseId}</code></a> for {version} pre-release builds; this is not release verification and binding to a shipped {version} release is not established.</p>
    <p><strong>{c.verified} accepted pre-release verifications retained</strong> ({c.scenarioBacked} historical scenario-backed; {c.developerAssessed} local-contract developer-assessed, no live runtime pass) · {c.superseded} superseded by a later applicable failure · {c.laterNonApplicableFailure} with a later scoped failure{targets.length ? ' on ' + targets.join(', ') : ''} whose applicability to the accepted contract is not established · {c.documentationGap} with a documentation gap · {c.failedOrMixed} failed or mixed · {c.notYetVerified} not yet verified · <strong>{c.releaseVerified} of {c.capabilities} release verified</strong> · {c.releaseCheckFailed} release check failed. Counts cover all {c.capabilities} capabilities, not search results.{local && <> <strong>{local.stampedVerified} of the {c.verified} accepted pre-release verified capabilities carry a {stampLabel.toLowerCase()}</strong> ({local.stamped} of all {c.capabilities} rows).</>}</p>
    {local && <>
      <p>A local scoped stamp records that every latest scoped scenario run for that capability in one local {localStamps.targetVersion} run, <Time value={localStamps.runWindow.earliestStartedAt}/> to <Time value={localStamps.runWindow.latestFinishedAt}/>, passed or passed with notes. It is not a release stamp, not release verification and not sign-off. It covers only the listed scenarios on the build that run recorded (core source <code>{localStamps.coreSource.ref}@{localStamps.coreSource.commit}</code>), and it never changes a status shown here. Derived in <a href={localStamps.source.kitPullRequest}>the capability kit pull request</a>; <a href="/local-stamps.json">machine-readable local stamps</a>.</p>
      {local.stampedOutside.length + local.notStampedOutside.length > 0 && <p>{local.stampedOutside.length} stamped, outside the {c.capabilities} included capabilities: {local.stampedOutside.map(id => <code key={id}>{id} </code>)}{local.notStampedOutside.length > 0 && <>· {local.notStampedOutside.length} with a failed latest scenario and no stamp, also outside: {local.notStampedOutside.map(id => <code key={id}>{id} </code>)}</>}</p>}
    </>}
    <div className="catalogFilters">
      <label>Search current status <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>Current status <select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="all">All statuses</option>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {local && <label><input type="checkbox" checked={stampedOnly} onChange={event => setStampedOnly(event.target.checked)} /> Has {stampLabel.toLowerCase()}</label>}
    </div>
    {shown.length === 0 && <p role="status">No matching capabilities. This does not mean unsupported.</p>}
    <table>
      <caption>Current status per capability, verified first</caption>
      <thead><tr><th scope="col">Capability</th><th scope="col">Status</th><th scope="col">Basis</th><th scope="col">Accepted · scope</th><th scope="col">Flags</th></tr></thead>
      <tbody>{shown.map(row => {
        const builds = [...new Set(row.lineage.evidence.map(e => e.build))];
        return <tr key={row.id}>
          <th scope="row"><a href={'#' + row.lineage.releaseId + '--' + row.id}><code>{row.id}</code></a><br/>{row.title ?? 'No curated title or description published in this revision'}</th>
          <td>{statusLabels[row.status]}</td>
          <td>{basisLabels[row.lineage.verificationBasis] ?? 'none'}</td>
          <td>{row.acceptedAt === null ? 'No accepted verification' : <>
            <Time value={row.acceptedAt}/> · {row.lineage.version} pre-release · {builds.length
              ? builds.map(build => <code key={build}>{build} </code>)
              : <>observed source <code>{row.lineage.assessment?.observedSourceRevision}</code> (source only; no tested build)</>}
            {row.history.length > 1 && <><br/>History: {row.history.map((h, i) => <React.Fragment key={i}>{i ? ' → ' : ''}{h.event} <Time value={h.at}/> (<code>{h.source}</code>)</React.Fragment>)}</>}
          </>}</td>
          <td><ul>
            {row.localStamp && <li><span className="status">{stampLabel}</span> {row.localStamp.scenarios} {row.localStamp.scenarios === 1 ? 'scenario' : 'scenarios'} · run <Time value={row.localStamp.runDate}/>. Not a release stamp; status unchanged.</li>}
            {row.localNotStamped && !row.laterNonApplicableFailure && <li>No {stampLabel.toLowerCase()}: a latest scoped scenario failed in that run. Status unchanged.</li>}
            {row.later.filter(l => !l.applicable && l.failedScenarios > 0).map(l => <li key={l.observationId}>Later scoped failure on {l.environment} {l.version}, <Time value={l.startedAt}/> to <Time value={l.finishedAt}/>: {l.passedScenarios} passed · {l.passedWithNotesScenarios} with notes · {l.failedScenarios} failed. Applicability to the accepted contract not established; status unchanged.</li>)}
            {row.releaseCheckFailed && <li>Release check failed</li>}
            {row.documentationGap && <li>Documentation gap: no description published in this revision{row.olderDescriptionIn && <> (<a href={'#' + row.olderDescriptionIn + '--' + row.id}>historical description in <code>{row.olderDescriptionIn}</code></a>)</>}. This does not mean unsupported.</li>}
          </ul></td>
        </tr>;
      })}</tbody>
    </table>
  </section>;
}
