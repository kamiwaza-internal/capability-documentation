import React, {useState} from 'react';
import {currentCapabilityView, filterCapabilities, joinLocalStamps, joinReleaseStamps, stampStatus, stampsApply, summarizeCurrentView} from './catalog.mjs';

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
export default function CurrentView({publication, localStamps, releaseStamps}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [stampedOnly, setStampedOnly] = useState(false);
  const [releaseOnly, setReleaseOnly] = useState(false);
  const [contractOnly, setContractOnly] = useState(false);
  const base = currentCapabilityView(publication);
  if (base.length === 0) return null;
  // Additive: the join attaches a badge and never changes a row's status.
  // Stamps projected against other published records do not apply to this publication.
  const local = stampsApply(localStamps, publication) ? joinLocalStamps(base, localStamps) : null;
  const release = stampsApply(releaseStamps, publication) ? joinReleaseStamps(local ? local.rows : base, releaseStamps) : null;
  const rows = release ? release.rows : local ? local.rows : base;
  const tag = releaseStamps?.releaseTag;
  // Presentation order only: with stamps, release stamped first, then source-contract, then the
  // rest; each group keeps the existing order. Without stamps, one unlabelled group as before.
  const groups = release ? [
    [`Release stamped for ${tag}`, row => row.releaseStamp],
    [`Source-contract verified for ${tag}`, row => !row.releaseStamp && row.sourceContractStamp],
    [`Not stamped for ${tag}`, row => !row.releaseStamp && !row.sourceContractStamp],
  ] : [[null, () => true]];
  const size = index => rows.filter(groups[index][1]).length;
  const stampLabel = local && `Local ${localStamps.targetVersion} scoped stamp`;
  const c = summarizeCurrentView(rows);
  const {releaseId, version} = rows[0].lineage;
  const targets = [...new Set(rows.flatMap(row => row.later.filter(l => !l.applicable && l.failedScenarios > 0).map(l => `${l.environment} ${l.version}`)))];
  const shown = filterCapabilities(rows, query, status).filter(row => (!stampedOnly || row.localStamp) && (!releaseOnly || row.releaseStamp) && (!contractOnly || row.sourceContractStamp));
  return <section className="release" id="current-capability-status">
    <h2>Current capability status</h2>
    {release && <>
      <p className="stampHeadline"><strong>{`${size(0) + size(1)} of ${rows.length} capabilities stamped for ${tag}`}</strong>: {`${size(0)} release stamped (live run on the ${tag} build) · ${size(1)} source-contract verified (tests on ${tag} source, not runtime evidence) · ${size(2)} not stamped`}</p>
      <p><strong>Not human release sign-off.</strong> A stamp covers the capability's registered test scenarios, not every operation. The build's source commit (core source <code>{releaseStamps.coreSource.ref}@{releaseStamps.coreSource.commit}</code>) is {releaseStamps.sourceCommitBasis} from a CI image-digest match, and the run was on a {releaseStamps.environment} cluster. A release stamp is the capability kit's seal, derived from a fresh passing run of the capability's registered test on the captured {tag} build. A source-contract stamp records that the capability's contract tests passed on exported {tag} source with mocks or fixtures; it is never a release stamp. Derived in <a href={releaseStamps.source.kitPullRequest}>the capability kit pull request</a>; <a href={'/release-stamps-' + releaseStamps.targetRelease + '.json'}>machine-readable {tag} stamps</a>.</p>
      {release.releaseStampedOutside.length + release.sourceContractOutside.length > 0 && <p>Stamped for {tag}, outside the {c.capabilities} included capabilities: {[...release.releaseStampedOutside, ...release.sourceContractOutside].map(id => <code key={id}>{id} </code>)}</p>}
      <h3>Earlier: {version} pre-release baseline</h3>
    </>}
    <p>Derived on this page from the published records below; nothing here is stored or re-scored. An accepted pre-release verification stays current unless a later failed test on the same version and the same contract supersedes it. Untested, skipped or absent later results and missing descriptive text never remove it. Accepted in <a href={'#' + releaseId}><code>{releaseId}</code></a> for {version} pre-release builds; this is not release verification and binding to a shipped {version} release is not established.</p>
    <p><strong>{c.verified} accepted pre-release verifications retained</strong> ({c.scenarioBacked} historical scenario-backed; {c.developerAssessed} local-contract developer-assessed, no live runtime pass) · {c.superseded} superseded by a later applicable failure · {c.laterNonApplicableFailure} with a later scoped failure{targets.length ? ' on ' + targets.join(', ') : ''} whose applicability to the accepted contract is not established · {c.documentationGap} of the accepted verifications with a documentation gap · {c.failedOrMixed} failed or mixed · {c.notYetVerified} not yet verified · <strong>{c.releaseVerified} of {c.capabilities} release verified</strong> · {c.releaseCheckFailed} release check failed. Counts cover all {c.capabilities} capabilities, not search results.{local && <> <strong>{local.stampedVerified} of the {c.verified} accepted pre-release verified capabilities carry a {stampLabel.toLowerCase()}</strong> ({local.stamped} of all {c.capabilities} rows).</>}</p>
    {release && <p>Of the {tag} stamps: {release.releaseStamped} release stamped ({release.releaseStampedVerified} of the {c.verified} accepted pre-release verified; {release.releaseStampedNotPreviouslyVerified.length} not previously verified{release.releaseStampedNotPreviouslyVerified.length > 0 && <>: {release.releaseStampedNotPreviouslyVerified.map(id => <code key={id}>{id} </code>)}</>}) · {release.sourceContract} source-contract verified ({release.sourceContractVerified} of the {c.verified} accepted pre-release verified). No capability carries both.<br/>
      The "{c.releaseVerified} of {c.capabilities} release verified" figure above is the release-check field of the historical {version} pre-release snapshot; it is left as published and the {tag} stamps do not rewrite it or any {version} status.</p>}
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
      {release && <label><input type="checkbox" checked={releaseOnly} onChange={event => setReleaseOnly(event.target.checked)} /> Release stamped ({tag})</label>}
      {release && <label><input type="checkbox" checked={contractOnly} onChange={event => setContractOnly(event.target.checked)} /> Source-contract verified ({tag})</label>}
    </div>
    {shown.length === 0 && <p role="status">No matching capabilities. This does not mean unsupported.</p>}
    <table>
      <caption>{release ? `Current status per capability, ${tag} stamps first` : 'Current status per capability, verified first'}</caption>
      <thead><tr><th scope="col">Capability</th><th scope="col">Status</th><th scope="col">Basis</th><th scope="col">Accepted · scope</th><th scope="col">Flags</th></tr></thead>
      {groups.map(([label, inGroup], index) => {
        const visible = shown.filter(inGroup);
        return (!label || visible.length > 0) && <tbody key={index}>
        {label && <tr><th colSpan={5} scope="colgroup">{`${label} (${size(index)})`}{visible.length < size(index) && ` · ${visible.length} shown`}</th></tr>}
        {visible.map(row => {
        const builds = [...new Set(row.lineage.evidence.map(e => e.build))];
        return <tr key={row.id}>
          <th scope="row"><a href={'#current--' + row.lineage.version + '--' + row.id}><code>{row.id}</code></a><br/>{row.title ?? 'No curated title or description published in this revision'}</th>
          <td>{!release ? statusLabels[row.status] : stampStatus(row, tag) ? <>
            <span className="status">{stampStatus(row, tag)}</span>{row.releaseStamp && <> {row.releaseStamp.lane.toUpperCase()} lane · {row.releaseStamp.scenarios} {row.releaseStamp.scenarios === 1 ? 'scenario' : 'scenarios'}</>}
            <br/>{version} pre-release: {statusLabels[row.status]}
          </> : <>{statusLabels[row.status]}<br/>No {tag} stamp</>}</td>
          <td>{basisLabels[row.lineage.verificationBasis] ?? 'none'}</td>
          <td>{row.acceptedAt === null ? 'No accepted verification' : <>
            <Time value={row.acceptedAt}/> · {row.lineage.version} pre-release · {builds.length
              ? builds.map(build => <code key={build}>{build} </code>)
              : <>observed source <code>{row.lineage.assessment?.observedSourceRevision}</code> (source only; no tested build)</>}
            {row.history.length > 1 && <><br/>History: {row.history.map((h, i) => <React.Fragment key={i}>{i ? ' → ' : ''}{h.event} <Time value={h.at}/> (<code>{h.source}</code>)</React.Fragment>)}</>}
          </>}</td>
          <td><ul>
            {row.releaseStamp && <li>{tag} release stamp run finished <Time value={row.releaseStamp.finishedAt}/>. Not human release sign-off; {version} pre-release status unchanged.</li>}
            {row.sourceContractStamp && <li>{tag} source-contract stamp: {row.sourceContractStamp.passed} tests passed in {row.sourceContractStamp.kits} {row.sourceContractStamp.kits === 1 ? 'contract kit' : 'contract kits'} on source with mocks. Not runtime evidence, not a release stamp; {version} pre-release status unchanged.</li>}
            {row.localStamp && <li><span className="status">{stampLabel}</span> {row.localStamp.scenarios} {row.localStamp.scenarios === 1 ? 'scenario' : 'scenarios'} · run <Time value={row.localStamp.runDate}/>. Not a release stamp; status unchanged.</li>}
            {row.localNotStamped && !row.laterNonApplicableFailure && <li>No {stampLabel.toLowerCase()}: a latest scoped scenario failed in that run. Status unchanged.</li>}
            {row.later.filter(l => !l.applicable && l.failedScenarios > 0).map(l => <li key={l.observationId}>{row.releaseStamp && Date.parse(l.finishedAt) < Date.parse(row.releaseStamp.finishedAt) ? `Older scoped failure, from the ${l.finishedAt.slice(0, 10)} run on ${l.environment} ${l.version}, before the ${tag} release stamp above` : `Later scoped failure on ${l.environment} ${l.version}`}, <Time value={l.startedAt}/> to <Time value={l.finishedAt}/>: {l.passedScenarios} passed · {l.passedWithNotesScenarios} with notes · {l.failedScenarios} failed. Applicability to the accepted contract not established; status unchanged.</li>)}
            {row.releaseCheckFailed && <li>Release check failed</li>}
            {row.documentationGap && <li>Documentation gap: no description published in this revision{row.olderDescriptionIn && <> (<a href={'#' + row.olderDescriptionIn + '--' + row.id}>historical description in <code>{row.olderDescriptionIn}</code></a>)</>}. This does not mean unsupported.</li>}
          </ul></td>
        </tr>;
        })}</tbody>;
      })}
    </table>
  </section>;
}
