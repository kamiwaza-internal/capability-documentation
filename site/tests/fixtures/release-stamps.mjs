import {observationsFixture} from './observations.mjs';
import {releaseSnapshotDigest} from '../../scripts/publication.mjs';
// Synthetic contract only. No production source, execution, person or approval.
export function releaseStampsFixture() {
  const publication = observationsFixture();
  publication.schema = 6;
  const source = {ref: 'v1.3.2', sourceRevision: 'a'.repeat(40)};
  const row = (id, disposition = 'included', status = 'not-stamped') => ({
    id, distribution: 'public', disposition, status, wholeClaim: false,
    scope: 'Synthetic bounded scenario scope.', assumptions: ['Synthetic existing fixture.'],
    limits: ['No whole-capability promotion.'], stamp: null, failures: [],
  });
  const stamped = row('synthetic.stamped', 'included', 'release-stamped');
  stamped.stamp = {id: 'b'.repeat(64), basis: 'fresh-release-replay', targetRelease: '1.3.2',
    capability: stamped.id, manifestId: 'c'.repeat(64), releaseSource: {...source}, finishedAt: '2026-10-01T11:00:00.000002Z'};
  stamped.failures = [{finishedAt: '2026-09-30T11:00:00Z', summary: 'Synthetic historical failure retained.', resolvedByStampId: stamped.stamp.id}];
  const failed = row('synthetic.failed', 'included', 'failed');
  failed.failures = [{finishedAt: '2026-10-01T11:00:00Z', summary: 'Synthetic current failure.', resolvedByStampId: null}];
  const snapshot = {
    id: 'synthetic-132-release-r1', version: '1.3.2', basis: 'canonical-release-replay',
    source, manifestId: 'c'.repeat(64), images: [{component: 'core', digest: 'sha256:' + 'd'.repeat(64)}, {component: 'frontend', digest: 'sha256:' + 'e'.repeat(64)}],
    evidenceWindow: {earliestStartedAt: '2026-10-01T10:00:00Z', latestFinishedAt: '2026-10-01T11:00:00.000002Z'},
    generatedAt: '2026-10-01T12:00:00Z', publicationRevision: 1, publishedAt: '2026-10-01T12:30:00Z',
    reviewReference: 'https://github.com/kamiwaza-internal/capability-documentation/pull/999',
    capabilities: [stamped, failed, row('synthetic.unexecuted'), row('synthetic.excluded', 'excluded'), row('synthetic.deferred', 'deferred'), row('synthetic.other-owner', 'other-owner')],
    counts: {catalog: 6, included: 3, excluded: 1, deferred: 1, otherOwner: 1, releaseStamped: 1, failed: 1, notStamped: 1, wholeCapabilityPromotions: 0},
    approval: {status: 'approved', scope: 'full-inventory', approvedBy: 'Synthetic release reviewer', approvedAt: '2026-10-01T12:15:00Z', snapshotSha256: null},
  };
  snapshot.approval.snapshotSha256 = releaseSnapshotDigest(snapshot);
  publication.releaseStamps = [snapshot];
  return publication;
}
