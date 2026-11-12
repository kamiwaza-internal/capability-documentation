import React from 'react';

export default function NativeEvidence({cap}) {
  const assessment = cap?.assessment;
  return <>
    {assessment?.basis === 'agent-verification' && <section><h4>Scoped agent observation</h4>
      <p>{assessment.verdict} · {assessment.testedVersion} · observed {assessment.assessedAt}</p>
      <p>{assessment.scope}</p><p>Observed source revision: {assessment.observedSourceRevision ?? 'not established'}. No released-build binding is claimed.</p>
      <ul>{assessment.operations.map((item, index) => <li key={index}>{item.operation}: {item.status}</li>)}</ul>
      <ul>{assessment.limits.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </section>}
    {cap?.carry && <section><h4>Native prerelease carry</h4><p>Original cycle: {cap.carry.sourceRelease}. No fresh execution is claimed.</p>
      <ul>{[...cap.carry.assumptions, ...cap.carry.limits].map((item, index) => <li key={index}>{item}</li>)}</ul>
    </section>}
  </>;
}

export function NativeCounts({rows}) {
  const count = basis => rows.filter(row => row.status === 'verified' && row.lineage.verificationBasis === basis).length;
  const agents = count('agent-verification'), carried = count('historical-carry');
  return <>{agents > 0 && <>; {agents} scoped agent observations</>}{carried > 0 && <>; {carried} native carry, no fresh execution</>}</>;
}
