import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import publication from '../../data/publication.json';
import releaseStamps from '../../data/release-stamps-1.3.2.json';
import {CHANGE_NOTE, changesSince, evidenceVersions, shortList, STATUS_KEY} from '../evidence.mjs';

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
  const versions = evidenceVersions(publication, releaseStamps);
  const kinds = Array.from(new Set(versions.map(entry => entry.kind)));
  return <Layout description="What each Kamiwaza release can do, with the evidence behind it, as one download per release.">
    <header className="kitHero"><div className="container">
      <p className="eyebrow">KAMIWAZA SALES DEV KIT</p>
      <h1>What each Kamiwaza release can do, and the evidence behind it</h1>
    </div></header>
    <main className="container kitMain">
      <section aria-labelledby="about">
        <h2 id="about">About</h2>
        <p>The Sales Dev Kit records what each Kamiwaza release can do and whether it was tested. Each release below has a short summary for people and a zip for AI assistants. Every record is in the <Link to="/catalog/">full catalog</Link>.</p>
      </section>

      <section aria-labelledby="verifications">
        <h2 id="verifications">Verifications</h2>
        {versions.length === 0 ? <p>No releases are published yet. No verification is implied.</p> :
          <ul className="releaseList">{versions.map(entry => <li key={entry.version} className="releaseRow">
            <div className="releaseText">
              <span className="releaseVersion">{entry.version}</span>
              <span className="releaseHeadline">{entry.headline}</span>
              <span className="releaseBasis">{entry.basis}</span>
              <Changes entry={entry} />
            </div>
            <div className="releaseFiles">
              <nav className="fileGroup" aria-label={'For AI, ' + entry.version}>
                <span className="fileGroupLabel">For AI</span>
                <a href={entry.path + '.zip'} title="Detailed records an AI assistant can read and cite" download>Zip</a>
              </nav>
              <nav className="fileGroup" aria-label={'For people, ' + entry.version}>
                <span className="fileGroupLabel">For people</span>
                <a href={entry.summaryPath + '.pdf'} title="Features at a glance" download>PDF</a>
                <a href={entry.summaryPath + '.md'} title="Features at a glance" download>MD</a>
              </nav>
            </div>
          </li>)}</ul>}
        <p className="machineLinks">For tools: <a href="/evidence/index.json">evidence/index.json</a> · <a href="/releases/index.json">releases/index.json</a> · <a href="/llms.txt">llms.txt</a>. The zip holds the detailed digest and the JSON records it was derived from.</p>
      </section>

      <section aria-labelledby="ask">
        <h2 id="ask">Ask about capabilities</h2>
        <p><strong>Beta:</strong> this is a beta test of how to work with the kit.</p>
        <p>Ask <a href="https://kamiwaza-workspace.slack.com/team/U092VSNNSKZ">@capability_bot</a> in Slack.</p>
        <p>Or, in Claude Code, add the plugin:</p>
        <pre><code>{'claude plugin marketplace add kamiwaza-internal/capability-documentation\nclaude plugin install capability-grounding@kamiwaza-capabilities'}</code></pre>
        <p>Then ask a question, or paste in an RFP:</p>
        <pre><code>/capability-grounding:capability-grounding Can Kamiwaza deploy and manage MCP tool servers for our agents?</code></pre>
      </section>

      <section aria-labelledby="faqs">
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
          <p>No. It means <strong>not established</strong>: the evidence cannot back the claim for that release. Only an explicit exclusion means &ldquo;not supported&rdquo;.</p>
        </details>
        <details className="faq">
          <summary>How do I ask an AI assistant about a release?</summary>
          <p>Attach that release&rsquo;s zip to a new chat and ask. It starts with its own reading rules, so no skill or plugin is needed.</p>
        </details>
      </section>
    </main>
  </Layout>;
}
