import {prereleaseFixture} from './prerelease.mjs';
// Synthetic observations only. Never imported by the browser or copied to product data.
export function observationsFixture() {
  const publication = prereleaseFixture();
  publication.schema = 5;
  publication.observations = [{
    id: 'synthetic-local-observations-r1', basis: 'scoped-runtime-observations',
    sourceKitRevision: 'b'.repeat(40), sourceCommittedAt: '2026-10-08T22:42:10Z',
    packetGeneratedAt: '2026-10-08T22:33:38.749036Z', generatedAt: '2026-10-09T00:00:00Z',
    evidenceWindow: {earliestStartedAt: '2026-10-08T20:47:53.196714Z', latestFinishedAt: '2026-10-08T22:26:37.410352Z'},
    sdkExecutionWindow: {earliestStartedAt: '2026-10-08T20:39:26.779031Z', latestFinishedAt: '2026-10-08T22:31:52.172334Z'},
    target: {version: '1.3.2', environment: 'local', sourceRevision: 'c'.repeat(40), sourceBinding: 'observed-source-only', releaseBinding: 'not-established'},
    baselineId: publication.releases[0].id,
    counts: {catalog: 5, observedCapabilities: 3, successfulCapabilities: 2, capabilitiesWithFailures: 1,
      inIncludedBaseline: 2, outsideIncludedBaseline: 1, passedScenarios: 3, passedWithNotesScenarios: 1, failedScenarios: 1,
      sharedScenarioAssignments: 1, wholeCapabilityPromotions: 0, releaseVerified: 0},
    sharedScenarioMappings: [{outcome: 'passed', capabilityIds: ['synthetic.clean', 'synthetic.mixed']}],
    capabilities: [
      {id: 'synthetic.clean', inIncludedBaseline: true, baselineStatus: 'prerelease-verified', passedScenarios: 2, passedWithNotesScenarios: 1, failedScenarios: 1},
      {id: 'synthetic.mixed', inIncludedBaseline: true, baselineStatus: 'failed-or-mixed', passedScenarios: 1, passedWithNotesScenarios: 0, failedScenarios: 0},
      {id: 'workrooms.org-decommission', inIncludedBaseline: false, baselineStatus: null, passedScenarios: 1, passedWithNotesScenarios: 0, failedScenarios: 0},
    ],
  }];
  return publication;
}
