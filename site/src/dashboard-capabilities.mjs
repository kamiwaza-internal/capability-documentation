import {activeCapabilities, currentCapabilityView, joinReleaseStamps} from './catalog.mjs';
import {prereleaseHistoryText, releaseWorkView, verificationLabel} from './verification-guide.mjs';

const labels = {
  verified: 'Prerelease verified', superseded: 'Prerelease verification superseded',
  'prerelease-verified': 'Prerelease verified', 'failed-or-mixed': 'Failed or mixed',
  'not-yet-verified': 'Not yet verified', untested: 'Not tested', partial: 'Partially verified', failed: 'Failed',
};
const detail = (label, value) => ({label, value: String(value ?? 'Not established')});
const common = row => ({id: row.id, title: row.title || row.id,
  disposition: row.disposition ?? 'included', conditions: row.conditions ?? [], limits: row.limits ?? []});

function publicationRows(entry, publication) {
  if (entry.kind === 'prerelease-evidence') return currentCapabilityView(publication, entry.version);
  const releases = entry.releaseIds.map(id => publication.releases.find(row => row.id === id));
  return releases[0].capabilities;
}

function publishedCapabilities(entry, publication) {
  const records = publication.releases.filter(row => row.version === entry.version);
  return publicationRows(entry, publication).map(row => {
    const title = row.title || records.flatMap(record => record.capabilities).find(cap => cap.id === row.id && cap.title)?.title;
    const declaration = records.some(record => record.capabilities.some(cap => cap.id === row.id && cap.declaration));
    const observation = row.lineage?.assessment;
    const proof = row.lineage?.proof;
    return {...common({...row, title}),
      conditions:[...row.conditions, ...(observation?.assumptions ?? [])],
      limits:[...row.limits, ...(observation?.limits ?? []), ...(proof?.limits ?? [])], details: [
      detail('Evidence status', entry.kind === 'tested' ? row.status : labels[row.status] ?? row.status),
      detail('Source declaration', declaration ? 'Declared in this version’s source records' : 'Not established'),
      detail('Evidence version', entry.version), detail('Verification basis', row.lineage?.verificationBasis),
      detail('Observed scope', observation?.scope ?? proof?.scope), detail('Actual tested version', observation?.testedVersion),
      detail('Original carry cycle', row.lineage?.carry?.sourceRelease),
    ]};
  });
}

function stampedCapabilities(entry, sources) {
  const baseline = sources.publication.releases.find(row => row.id === sources.releaseStamps.baselineReleaseId);
  const rows = activeCapabilities(currentCapabilityView(sources.publication, baseline.version, baseline.id));
  return joinReleaseStamps(rows, sources.releaseStamps).rows.map(row => ({...common(row),
    limits: [...row.limits, ...(row.releaseStamp?.limits ?? [])], details: [
      detail('Release evidence', row.releaseStamp ? 'Scoped release stamp' : 'No scoped release stamp'),
      detail('Source-contract evidence', row.sourceContractStamp ? 'Source-contract verified; not runtime evidence' : 'Not established'),
      detail('Prerelease baseline version', baseline.version),
      detail('Prerelease baseline status', labels[row.status] ?? row.status),
      detail('Stamped scope', row.releaseStamp?.scope), detail('Stamp finished', row.releaseStamp?.finishedAt),
    ]}));
}

function replayCapabilities(entry) {
  const titles = new Map((entry.originalCorpus?.catalog.capabilities ?? []).map(row => [row.id, row.title]));
  return entry.replay.capabilities.map(row => ({...common({...row, title: titles.get(row.id)}),
    conditions: row.assumptions, details: [detail('Scoped release replay status', row.status),
      detail('Replay scope', row.scope), detail('Human release approval', entry.replay.approval.status),
      detail('Replay publication', entry.replay.id), detail('Stamp finished', row.stamp?.finishedAt),
      ...(row.failures ?? []).map((failure, index) => detail(`Retained failure ${index + 1}`,
        `${failure.finishedAt}: ${failure.summary}; ${failure.resolvedByStampId ? 'resolved by stamp ' + failure.resolvedByStampId : 'no resolution recorded'}`))],
  }));
}

function workCapabilities(entry) {
  return releaseWorkView(entry.work).capabilities.map(row => ({...common(row),
    conditions: row.assumptions ?? [], limits: [...(row.limits ?? []), ...(row.freshAssessment?.limits ?? [])], details: [
      detail('Target qualification', verificationLabel(row)), detail('Prerelease history', prereleaseHistoryText(row)),
      detail('Original evidence version', row.originalVersion), detail('Original observation', row.finishedAt),
      detail('Current scoped assessment', row.freshAssessment?.scope), detail('Current target blocker', row.withheldReason),
      detail('Evidence gap', row.gap),
      ...(row.nativeEvidence ? [detail('Native basis', row.nativeEvidence.verificationBasis), detail('Native scope', row.nativeEvidence.assessment?.scope ?? row.nativeEvidence.proof?.scope)] : []),
    ]}));
}

function corpusCapabilities(entry) {
  const current = entry.corpus.currentVerification;
  return entry.corpus.catalog.capabilities.map(row => {
    const observation = current?.capabilities.find(cap => cap.id === row.id);
    return {...common(row), conditions: observation?.assumptions ?? [], limits: observation?.limits ?? [], details: [
      detail('Source declaration', row.sourceDeclaration), detail('Snapshot prerelease status', row.prereleaseStatus),
      ...(current ? [detail('Current scoped evidence', observation?.status ?? 'Outside current verification scope'),
        detail('Current scope note', observation?.scopeNote), detail('Observation finished', observation?.finishedAt),
        detail('Observed Core revision', observation?.sourceCommit), detail('Evidence gap', observation?.gap)] : []),
    ]};
  });
}

export function dashboardCapabilities(entry, sources) {
  if (entry.kind === 'release-work') return workCapabilities(entry);
  if (entry.kind === 'release-replay') return replayCapabilities(entry);
  if (entry.kind === 'release-stamps') return stampedCapabilities(entry, sources);
  if (entry.kind === 'release-corpus') return corpusCapabilities(entry);
  return publishedCapabilities(entry, sources.publication);
}
