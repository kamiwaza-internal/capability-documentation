import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import publication from '../../data/publication.json';
import releaseStamps from '../../data/release-stamps-1.3.2.json';
import releaseCorpora from '../../data/release-corpora.json';
import {CHANGE_NOTE, changesSince, evidenceVersions, shortList, STATUS_KEY} from '../evidence.mjs';
import {salesKitPath} from '../sales-kit.mjs';

function Changes({entry}) {
  const changes = changesSince(entry, publication, releaseStamps);
  if (!changes) return null;
  return <details className="releaseChanges">
    <summary>What changed since {changes.since}</summary>
    <p>{CHANGE_NOTE}</p>
    <dl>{changes.lists.map(([label, names]) => <React.Fragment key={label}><dt>{label}: {names.length}</dt>{names.length > 0 && <dd>{shortList(names)}</dd>}</React.Fragment>)}</dl>
  </details>;
}

export default function Home() {
  const versions = evidenceVersions(publication, releaseStamps, releaseCorpora.corpora);
  const kinds = Array.from(new Set(versions.map(entry => entry.kind)));
  const currentReplays = (publication.releaseStamps ?? []).filter(snapshot =>
    !publication.releaseStamps.some(other => other.version === snapshot.version && other.publicationRevision > snapshot.publicationRevision));
  return <Layout description="What each Kamiwaza release can do, with the evidence behind it, as one download per release.">
    <header className="kitHero"><div className="container">
      <p className="eyebrow">KAMIWAZA SALES DEV KIT</p>
      <h1>What each Kamiwaza release can do, and the evidence behind it</h1>
    </div></header>
    <main className="container kitMain">
      <section aria-labelledby="about" className="panel panelTint">
        <h2 id="about">About</h2>
        <p>The Sales Dev Kit records published evidence, conditions and gaps for each version. Download the PDF, Markdown or ZIP to read or share it. Published release records are in the <Link to="/catalog/">full catalog</Link>; review-candidate corpora retain their source and approval limits in the download.</p>
      </section>

      {(publication.releaseStamps ?? []).length > 0 && <section aria-labelledby="release-replays">
        <h2 id="release-replays">Release build verification</h2>
        <ul className="releaseList">{currentReplays.sort((a, b) => b.version.localeCompare(a.version, undefined, {numeric: true})).map(snapshot => <li key={snapshot.id} className="releaseRow">
          <div className="releaseText">
            <span className="releaseVersion">{snapshot.version}</span>
            <span className="releaseHeadline">{snapshot.counts.releaseStamped} of {snapshot.counts.included} included capabilities release stamped · {snapshot.counts.failed} failed · {snapshot.counts.notStamped} not stamped</span>
            <span className="releaseBasis">Fresh scoped replay on the named release build. Each stamp covers only its stated scenarios. {snapshot.counts.catalog} inventory definitions retained; {snapshot.counts.excluded} excluded. Human release sign-off: {snapshot.approval.status}.</span>
          </div>
          <div className="releaseFiles">
            <Link to={'/catalog/#' + snapshot.id}>Scope and failures</Link>
            <a href={'/release-stamps/' + snapshot.id + '/bundle.json'} download>Evidence JSON</a>
          </div>
        </li>)}</ul>
      </section>}

      <section aria-labelledby="releases">
        <h2 id="releases">Releases</h2>
        {versions.length === 0 ? <p>No releases are published yet. No verification is implied.</p> :
          <ul className="releaseList">{versions.map(entry => <li key={entry.version} className="releaseRow">
            <div className="releaseText">
              <span className="releaseVersion">{entry.version}</span>
              <span className="releaseHeadline">{entry.headline}</span>
              <span className="releaseBasis">{entry.basis}</span>
              <Changes entry={entry} />
            </div>
            <div className="releaseFiles">
              <nav className="fileGroup" aria-label={'Complete Sales Dev Kit, ' + entry.version}>
                <span className="fileGroupLabel">Complete Sales Dev Kit</span>
                <a href={salesKitPath(entry.version) + '.pdf'} download>PDF</a>
                <a href={salesKitPath(entry.version) + '.md'} download>MD</a>
              </nav>
              <nav className="fileGroup" aria-label={'Everything, ' + entry.version}>
                <span className="fileGroupLabel">Everything</span>
                <a href={entry.path + '.zip'} title="All readable documents and machine-readable source records, in labeled folders" download>Zip</a>
              </nav>
              <nav className="fileGroup" aria-label={'For people, ' + entry.version}>
                <span className="fileGroupLabel">For people</span>
                <a href={entry.summaryPath + '.pdf'} title="Features at a glance" download>PDF</a>
                <a href={entry.summaryPath + '.md'} title="Features at a glance" download>MD</a>
              </nav>
            </div>
          </li>)}</ul>}
        <p className="machineLinks">Each ZIP includes all documents in a human-readable folder and source JSON in a machine-readable folder, with a README and checksums. Reviewed value-stream recipes are included as JSON when available, with untested paths and gaps explicit. For tools: <a href="/evidence/index.json">evidence/index.json</a> · <a href="/releases/index.json">releases/index.json</a> · <a href="/llms.txt">llms.txt</a>.</p>
      </section>

      <section aria-labelledby="instructions" className="panel panelTint">
        <h2 id="instructions">Instructions</h2>
        <p><span className="betaBadge">Beta</span> To ask what Kamiwaza can do, choose the release version, download its ZIP from <a href="#releases">Releases</a>, attach it to a new chat with any AI assistant and ask. No skill or plugin is needed. The ZIP includes the PDF and Markdown kit, source records and <code>AGENTS.md</code> reading instructions. If your assistant cannot open a ZIP, attach <code>AGENTS.md</code>, <code>README.md</code> and the evidence documents and source records that <code>README.md</code> lists. Keep each status, condition and limit with any answer you share.</p>
        <details className="faq">
          <summary><span className="betaBadge">Dev only</span> Claude Code plugin</summary>
          <p>Add the plugin:</p>
          <pre><code>{'claude plugin marketplace add kamiwaza-internal/capability-documentation\nclaude plugin install capability-grounding@kamiwaza-capabilities'}</code></pre>
          <p>Then ask a question, or paste in an RFP:</p>
          <pre><code>/capability-grounding:capability-grounding Can Kamiwaza deploy and manage MCP tool servers for our agents?</code></pre>
        </details>
      </section>

      <section aria-labelledby="faqs" className="panel">
        <h2 id="faqs">FAQs</h2>
        <details className="faq">
          <summary>What do the statuses mean?</summary>
          <dl className="statusKey">{kinds.flatMap(kind => STATUS_KEY[kind]).map(([label, meaning]) => <React.Fragment key={label}><dt>{label}</dt><dd>{meaning}</dd></React.Fragment>)}</dl>
        </details>
        <details className="faq">
          <summary>What counts as a capability?</summary>
          <p>A capability is one thing the platform does that a customer could ask about and that could be claimed or denied on its own, such as &ldquo;can we download models?&rdquo; as distinct from &ldquo;can we control where they run?&rdquo;. Two things are separate capabilities when one could be true while the other is false. Steps of a single flow, internal mechanisms and particular configurations are recorded inside a capability, not as capabilities of their own.</p>
        </details>
        <details className="faq">
          <summary>Does a missing capability mean Kamiwaza can&rsquo;t do it?</summary>
          <p>No. It means <strong>not established</strong>: the evidence cannot back the claim for that release. Only a source record explicitly ruling out the requested behavior establishes &ldquo;not supported&rdquo;. Inventory exclusion means outside this publication.</p>
        </details>
        <details className="faq">
          <summary>What are recipes and value streams?</summary>
          <p>A <strong>value stream</strong> is an end-to-end job a customer persona does with Kamiwaza, such as an analyst taking in a mission and managing its projects, written as ordered steps from start to outcome. A <strong>recipe</strong> is the reviewed, step-by-step definition of one value stream that can be run against a named build. A complete recorded run can establish a <strong>scoped proof</strong> when its reviewed checks pass and the published verdict accepts it. That proof covers only the named operations, modality and build; linked building blocks do not automatically receive capability credit. A recipe on its own is a plan, not a result. Prerelease proof, release verification and human release approval remain separate.</p>
        </details>
        <details className="faq">
          <summary>How do I ask an AI assistant about a release?</summary>
          <p>Attach that release&rsquo;s Sales Dev Kit to a new chat and ask. It includes published evidence, conditions, limits and known gaps. The ZIP also includes AGENTS.md for consistent answers and README.md listing its evidence documents and source records. The statuses are scoped to the named version.</p>
        </details>
      </section>
    </main>
  </Layout>;
}
