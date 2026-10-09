export function filterCapabilities(capabilities, query, status) {
  const needle = query.trim().toLowerCase();
  return capabilities.filter(cap => (status === 'all' || cap.status === status || status === 'verified' && ['prerelease-verified', 'release-stamped'].includes(cap.status) || status === 'failed' && cap.status === 'failed-or-mixed') &&
    [cap.id, cap.title, cap.summary, ...cap.conditions, ...cap.limits].filter(Boolean)
      .some(value => value.toLowerCase().includes(needle)));
}

export function countStatuses(capabilities) {
  const counts = {verified: 0, partial: 0, failed: 0, untested: 0};
  for (const cap of capabilities) counts[cap.status]++;
  return counts;
}

const accepted = new Set(['verified', 'prerelease-verified', 'release-stamped']);
const timeKey = value => value?.replace(/(?:\.(\d+))?Z$/, (_, fraction = '') => '.' + fraction.padEnd(6, '0') + 'Z') ?? '';
const releaseRef = ref => ref.replace(/^refs\/tags\//, '');
const compareTime = (a, b) => timeKey(a).localeCompare(timeKey(b));
const latest = values => values.filter(Boolean).sort(compareTime).at(-1) ?? null;
const evidenceTime = cap => latest([cap.assessment?.assessedAt, ...cap.evidence.map(record => record.runFinishedAt)]);

// A presentation projection: immutable upstream verdicts and original receipts stay intact.
export function primaryCapabilities(publication) {
  const byId = new Map();
  for (const release of publication.releases) for (const cap of release.capabilities) {
    const key = release.version + ':' + cap.id;
    const rows = byId.get(key) ?? [];
    rows.push({release, cap, at: evidenceTime(cap), qualified: false}); byId.set(key, rows);
  }
  for (const release of publication.releases.filter(row => row.baselineKind === 'prerelease-evidence')) {
    for (const id of release.omittedCapabilities) {
      const key = release.version + ':' + id;
      if (!byId.has(key)) byId.set(key, [{release, cap: {id, status: 'untested', title: null, summary: null, conditions: [], limits: [], wholeClaim: false, evidence: [], declaration: null}, at: null, qualified: false, omitted: true}]);
    }
  }
  for (const release of publication.releaseStamps ?? []) for (const cap of release.capabilities) {
    if (cap.disposition !== 'included') continue;
    const key = release.version + ':' + cap.id;
    const rows = byId.get(key) ?? [];
    rows.push({release, cap: {...cap, evidence: []}, at: cap.stamp?.finishedAt ?? latest(cap.failures.map(failure => failure.finishedAt)), qualified: true}); byId.set(key, rows);
  }
  const current = [];
  for (const rows of byId.values()) {
    // Release-bound stamps outrank pre-release records; newer missing evidence never erases acceptance.
    const rank = row => row.cap.status === 'verified' && row.cap.wholeClaim ? 3 : row.cap.status === 'release-stamped' ? 2 : row.cap.status === 'prerelease-verified' ? 1 : 0;
    const ordered = [...rows].sort((a, b) => (a.release.publicationRevision - b.release.publicationRevision) || a.release.id.localeCompare(b.release.id));
    const verified = rows.filter(row => accepted.has(row.cap.status)).sort((a, b) => rank(a) - rank(b) || compareTime(a.at, b.at) || a.release.id.localeCompare(b.release.id));
    const selected = verified.at(-1) ?? ordered.filter(row => ['failed', 'failed-or-mixed', 'partial'].includes(row.cap.status)).at(-1) ?? ordered.at(-1);
    let status = selected.cap.status;
    const failures = [];
    // Only the qualified manifest, exact source and identical scope establish test applicability.
    // Development labels and aggregate observations cannot prove the same environment/claim.
    const applies = row => selected.qualified && row.qualified && row.release.manifestId === selected.release.manifestId &&
      releaseRef(row.release.source.ref) === releaseRef(selected.release.source.ref) && row.release.source.sourceRevision === selected.release.source.sourceRevision && row.cap.scope === selected.cap.scope &&
      JSON.stringify([...row.cap.assumptions].sort()) === JSON.stringify([...selected.cap.assumptions].sort()) &&
      JSON.stringify([...row.cap.limits].sort()) === JSON.stringify([...selected.cap.limits].sort());
    if (selected.qualified && accepted.has(status)) {
      const events = rows.filter(applies).flatMap(row => [
        ...(row.cap.stamp ? [{at: row.cap.stamp.finishedAt, failed: false, snapshotId: row.release.id}] : []),
        ...row.cap.failures.filter(failure => failure.resolvedByStampId === null).map(failure => ({at: failure.finishedAt, failed: true, snapshotId: row.release.id})),
      ]).filter(event => compareTime(event.at, selected.at) > 0).sort((a, b) => compareTime(a.at, b.at) || Number(a.failed) - Number(b.failed));
      if (events.at(-1)?.failed) status = 'failed';
    }
    for (const row of ordered) {
      if (row.cap.releaseStatus === 'failed') failures.push({snapshotId: row.release.id, at: null, applicable: false, axis: 'release', reason: 'Retained release failure; public chronology is not established.'});
      for (const record of row.cap.evidence.filter(record => record.outcome === 'failed')) {
        if (!selected.at || compareTime(record.runFinishedAt, selected.at) > 0) failures.push({snapshotId: row.release.id, at: record.runFinishedAt ?? null, applicable: false, axis: 'scenario', reason: 'Failure retained; matching environment and claim applicability are not established.'});
      }
      if (row.qualified) for (const failure of row.cap.failures.filter(f => f.resolvedByStampId === null)) {
        failures.push({snapshotId: row.release.id, at: failure.finishedAt, applicable: applies(row), supersedes: applies(row) && compareTime(failure.finishedAt, selected.at) > 0, ambiguous: applies(row) && compareTime(failure.finishedAt, selected.at) === 0, superseded: applies(row) && compareTime(failure.finishedAt, selected.at) < 0, axis: 'release', reason: applies(row) ? 'Same qualified environment and bounded claim scope.' : 'Release failure has no matching environment and claim binding to the retained verification.'});
      }
    }
    const descriptionRow = selected.cap.declaration && selected.cap.summary ? selected : [...ordered].reverse().find(row => row.cap.declaration && row.cap.summary);
    const description = descriptionRow ? {capability: descriptionRow.cap, snapshotId: descriptionRow.release.id, historical: descriptionRow !== selected} : null;
    const baseline = publication.releases.filter(release => release.version === selected.release.version && release.baselineKind === 'prerelease-evidence').sort((a, b) => a.publicationRevision - b.publicationRevision).at(-1);
    const includedInBaseline = baseline ? baseline.capabilities.some(cap => cap.id === selected.cap.id) : null;
    const deferred = baseline?.deferredCapabilities.includes(selected.cap.id) ?? false;
    current.push({...selected.cap, title: description?.capability.title ?? selected.cap.id, summary: description?.capability.summary ?? null,
      conditions: description?.capability.conditions ?? [], limits: description?.capability.limits ?? [], status,
      includedInBaseline, deferred, omitted: selected.omitted ?? false,
      version: selected.release.version, snapshotId: selected.release.id, verifiedAt: selected.at,
      retainedStatus: selected.cap.status, retainedCapability: selected.cap, description, failures,
      history: ordered.map(row => ({snapshotId: row.release.id, status: row.cap.status, at: row.at, scope: row.omitted ? 'Explicit omitted ID; no capability evidence record published.' : row.cap.scope ?? row.cap.assessment?.scope ?? (row.cap.wholeClaim ? 'Whole-claim assessment' : row.cap.evidence.map(record => record.scenario ?? record.summary).join('; ') || 'Source declaration only')})),
    });
  }
  return current.sort((a, b) => b.version.localeCompare(a.version, undefined, {numeric: true}) || Number(accepted.has(b.status)) - Number(accepted.has(a.status)) || a.id.localeCompare(b.id));
}
