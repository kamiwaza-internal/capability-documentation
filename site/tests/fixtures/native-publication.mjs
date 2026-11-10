export function nativePublication() {
  const version = '1.4.0';
  const make = (id, basis) => ({id, title:null, summary:null, conditions:[], limits:[], declaration:null,
    distribution:'public', status:basis === 'none' ? 'not-yet-verified' : 'prerelease-verified',
    verificationBasis:basis, assessment:null, proof:null, carry:null, wholeClaim:false, releaseStatus:'not-stamped', evidence:[]});
  const caps = ['historical-scenario','developer-assessment','agent-verification','historical-carry','value-stream','none']
    .map((basis, i) => make('synthetic.cap-' + i, basis));
  caps[0].evidence = [{scenario:'SYNTHETIC/01', build:'develop@' + 'a'.repeat(40), outcome:'passed',
    runFinishedAt:'2020-01-01T00:00:00Z', ingestedAt:'2020-01-02T00:00:00Z', recordSha256:'b'.repeat(64)}];
  caps[1].assessment = {basis:'developer-assessment', verdict:'verified', assessedAt:'2020-01-02T00:00:00Z', ingestedAt:null,
    observedSourceRevision:null, sourceBinding:'not-established',
    scope:'Accepted local-contract developer assessment; no live scenario execution.',
    assumptions:['Synthetic dependencies','Synthetic fixtures','No observed source binding'],
    limits:['No live runtime pass, cross-build equivalence, release verification or human release approval is claimed.',
      'Synthetic observation only.','No live deployment.']};
  caps[2].assessment = {basis:'agent-verification', verdict:'verified', assessedAt:'2020-01-02T00:00:00Z', ingestedAt:null,
    observedSourceRevision:null, sourceBinding:'scoped-agent-observation', targetRelease:version,
    testedVersion:'Synthetic build', scope:'Create a fixture', operations:[{operation:'create a fixture',status:'passed'}],
    limits:['Synthetic observation only.']};
  caps[3].carry = {sourceRelease:'1.3.5', assumptions:['The original contract remains applicable.'], limits:['No fresh execution.']};
  caps[4].proof = {state:'established', proofSha256:'c'.repeat(64), recipeId:'Operator:VS1:synthetic', recipeRevision:1,
    recipeSha256:'d'.repeat(64), buildFingerprint:'e'.repeat(64), observedAt:'2020-01-02T00:00:00Z',
    scope:'One synthetic recipe claim', limits:['Not every operation.']};
  return {schema:9, releases:[{id:version + '-prerelease-r10', version, publicationRevision:10, channel:'development',
    approval:{status:'pending',approvedBy:null,approvedAt:null},
    build:version + '; native prerelease evidence; original observation builds retained; not release verification',
    sourceRevision:'a'.repeat(40), sourceCommittedAt:'2020-01-03T00:00:00Z', generatedAt:'2020-01-04T00:00:00Z',
    publishedAt:null, reviewReference:null, publicationState:'draft', baselineKind:'prerelease-evidence',
    releaseBinding:'not-established', omittedCapabilities:[], deferredCapabilities:[], capabilities:caps,
    counts:{included:6,prereleaseVerified:5,scenarioVerified:1,developerAssessed:1,agentVerified:1,carriedVerified:1,
      scopedProofVerified:1,failedOrMixed:0,notYetVerified:1,releaseVerified:0,releaseFailed:0},
    testedBuilds:['develop@' + 'a'.repeat(40)], evidenceWindow:{earliestRunFinishedAt:'2020-01-01T00:00:00Z',latestRunFinishedAt:'2020-01-01T00:00:00Z'},
    assessmentWindow:{earliestAssessedAt:'2020-01-02T00:00:00Z',latestAssessedAt:'2020-01-02T00:00:00Z'},
    proofWindow:{earliestObservedAt:'2020-01-02T00:00:00Z',latestObservedAt:'2020-01-02T00:00:00Z'},
    recipeInventory:[{id:'Operator:VS1:synthetic', title:'Synthetic recipe', definitionRevision:1, sourceVersion:version,
      orderedStepCount:1, definitionSha256:'d'.repeat(64), capabilityIds:['synthetic.cap-4'],reviewedVerifies:['synthetic.cap-4'],scopedSdkProof:'none',gaps:[]}],
  }]};
}
