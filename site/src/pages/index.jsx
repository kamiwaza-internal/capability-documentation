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
        <p>The Capability Kit records what each Kamiwaza release can do and whether it was tested. Download a release below to read it, or paste it into any AI assistant; each file explains how to read itself. A missing record means <strong>not established</strong>, never &ldquo;not supported&rdquo;.</p>
        <p><a href="#statuses">What the statuses mean</a> · <Link to="/catalog/">Full catalog</Link></p>
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
