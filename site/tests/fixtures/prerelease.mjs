// Synthetic pre-release evidence. Never copy these fake records into production input.
const build = 'develop@' + 'a'.repeat(12);
const record = (scenario, outcome) => ({scenario, build, outcome,
  runFinishedAt: '2026-09-30T16:27:15Z', ingestedAt: '2026-09-30T19:51:14Z', recordSha256: 'd'.repeat(64)});
const undeclared = {title: null, summary: null, conditions: [], limits: [], declaration: null};

export const prereleaseFixture = () => ({schema: 2, releases: [{
  id: 'synthetic-prerelease-r3', version: '1.3.0', channel: 'development', approval: {status: 'pending', approvedBy: null, approvedAt: null},
  build: '1.3.0; project pre-release baseline: historical development-build scenarios and local-contract assessments; not a released 1.3.0 artifact; release unverified', sourceRevision: 'a'.repeat(40), publicationRevision: 3,
  publishedAt: null, publicationState: 'draft', generatedAt: '2026-10-08T16:50:00Z',
  reviewReference: null,
  baselineKind: 'prerelease-evidence', releaseBinding: 'not-established', omittedCapabilities: ['omitted.one'],
  deferredCapabilities: ['synthetic.gap'], sourceCommittedAt: '2026-10-08T00:40:22Z', testedBuilds: [build],
  evidenceWindow: {earliestRunFinishedAt: '2026-09-30T16:27:15Z', latestRunFinishedAt: '2026-09-30T16:27:15Z'},
  assessmentWindow: {earliestAssessedAt: '2026-10-06T09:31:27Z', latestAssessedAt: '2026-10-06T09:31:27Z'},
  counts: {included: 4, prereleaseVerified: 2, scenarioVerified: 1, developerAssessed: 1, failedOrMixed: 1, notYetVerified: 1, releaseVerified: 0, releaseFailed: 1},
  capabilities: [
    {id: 'synthetic.clean', title: 'Synthetic clean', distribution: 'public', summary: 'read', conditions: ['auth'], limits: ['no writes'],
      status: 'prerelease-verified', wholeClaim: false, releaseStatus: 'failed', verificationBasis: 'historical-scenario', assessment: null, evidence: [record('synthetic-read', 'passed_with_notes')],
      declaration: {documentSha256: 'b'.repeat(64), basis: 'curated-source-review', scope: 'Source only', mechanicalValidation: 'Members not extracted',
        citations: [{repo: 'example', path: 'api.py', symbol: 'route', kind: 'route-table', closed: false, read_at: 'c'.repeat(40)}]}},
    {id: 'synthetic.mixed', ...undeclared, distribution: 'public', status: 'failed-or-mixed', wholeClaim: false, releaseStatus: 'not-stamped', verificationBasis: 'historical-scenario', assessment: null,
      evidence: [record('synthetic-deploy', 'passed'), record('synthetic-infer', 'failed')]},
    {id: 'synthetic.gap', ...undeclared, distribution: 'public', status: 'not-yet-verified', wholeClaim: false, releaseStatus: 'not-stamped', verificationBasis: 'none', assessment: null, evidence: []},
    {id: 'synthetic.assessed', ...undeclared, distribution: 'public', status: 'prerelease-verified', wholeClaim: false,
      releaseStatus: 'not-stamped', verificationBasis: 'developer-assessment', evidence: [],
      assessment: {
        basis: 'developer-assessment', assessedAt: '2026-10-06T09:31:27Z',
        ingestedAt: null, observedSourceRevision: 'e'.repeat(40), sourceBinding: 'observed-source-only',
        scope: 'Accepted local-contract developer assessment; no live scenario execution.',
        assumptions: ['Local tests use synthetic fixtures.', 'Deployed behavior is assumed.', 'Source has no image binding.'],
        limits: ['No live runtime pass, cross-build equivalence, release verification or human release approval is claimed.',
          'Authentication and persistence were substituted.', 'No production integration was exercised.'],
      }},
  ],
}]});
