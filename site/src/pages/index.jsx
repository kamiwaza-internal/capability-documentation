import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import publication from '../../data/publication.json';
import releaseStamps from '../../data/release-stamps-1.3.2.json';
import {evidenceVersions, STATUS_KEY} from '../evidence.mjs';

const formats = [['zip', 'Zip', 'Readable digest, PDF and the JSON records'], ['md', 'MD', 'Readable digest, plain text'], ['pdf', 'PDF', 'Readable digest, for print']];

export default function Home() {
  const versions = evidenceVersions(publication, releaseStamps);
  const kinds = Array.from(new Set(versions.map(entry => entry.kind)));
  return <Layout title="Capability Kit" description="What each Kamiwaza release can do, with the evidence behind it, as one download per release.">
    <header className="kitHero"><div className="container">
      <p className="eyebrow">KAMIWAZA CAPABILITY KIT</p>
      <h1>What each Kamiwaza release can do, and the evidence behind it</h1>
    </div></header>
    <main className="container kitMain">
      <section aria-labelledby="about">
        <h2 id="about">About</h2>
        <p>The Capability Kit writes down what the Kamiwaza platform does, one capability at a time, and tests it against each release. Every claim says whether it is only documented or also verified, on which build, and under what conditions.</p>
        <p>Documented is not the same as verified, and a missing record is not a &ldquo;no&rdquo;: <strong>not established</strong> means the evidence cannot back the claim for that release, never that the platform cannot do it. <a href="#statuses">What the statuses mean</a>.</p>
        <h3>Using the evidence</h3>
        <ul>
          <li><strong>Read or share it.</strong> Download a release&rsquo;s bundle below. The PDF and Markdown are the same readable digest.</li>
          <li><strong>Ask any AI assistant.</strong> Paste or attach the Markdown, PDF or zip into a new chat. Each bundle starts with its own reading rules, so no skill or plugin is needed.</li>
          <li><strong>Get cited answers and RFP checks.</strong> In Claude Code, install the <code>capability-grounding</code> skill: <code>claude plugin marketplace add kamiwaza-internal/capability-documentation</code>, then <code>claude plugin install capability-grounding@kamiwaza-capabilities</code>.</li>
          <li><strong>Read every record.</strong> The <Link to="/catalog/">full catalog</Link> shows each capability&rsquo;s complete evidence.</li>
        </ul>
      </section>

      <section aria-labelledby="verifications">
        <h2 id="verifications">Verifications</h2>
        {versions.length === 0 ? <p>No releases are published yet. No verification is implied.</p> :
          <ul className="releaseList">{versions.map(entry => <li key={entry.version} className="releaseRow">
            <div className="releaseText">
              <span className="releaseVersion">{entry.version}</span>
              <span className="releaseHeadline">{entry.headline}</span>
              <span className="releaseBasis">{entry.basis}</span>
            </div>
            <nav className="releaseFiles" aria-label={'Evidence bundle for ' + entry.version}>
              {formats.map(([ext, label, title]) => <a key={ext} href={entry.path + '.' + ext} title={title} download>{label}</a>)}
            </nav>
          </li>)}</ul>}
        <p className="machineLinks">For tools: <a href="/evidence/index.json">evidence/index.json</a> · <a href="/releases/index.json">releases/index.json</a> · <a href="/llms.txt">llms.txt</a>. Each zip also holds the JSON records its digest was derived from.</p>
      </section>

      <section aria-labelledby="statuses">
        <h2 id="statuses">What the statuses mean</h2>
        <dl className="statusKey">{kinds.flatMap(kind => STATUS_KEY[kind]).map(([label, meaning]) => <React.Fragment key={label}><dt>{label}</dt><dd>{meaning}</dd></React.Fragment>)}</dl>
      </section>
    </main>
  </Layout>;
}
