export function filterCapabilities(capabilities, query, status) {
  const needle = query.trim().toLowerCase();
  return capabilities.filter(cap => (status === 'all' || cap.status === status || status === 'verified' && ['prerelease-verified', 'release-stamped'].includes(cap.status) || status === 'failed' && cap.status === 'failed-or-mixed') &&
    [cap.id, cap.title, cap.summary, ...cap.conditions, ...cap.limits].filter(Boolean)
      .some(value => value.toLowerCase().includes(needle)));
}

export function countStatuses(capabilities) {
  const counts = {verified: 0, partial: 0, failed: 0, untested: 0};
  for (const cap of capabilities) counts[cap.status] = (counts[cap.status] ?? 0) + 1;
  return counts;
}

const byRevisionDesc = (a, b) => b.publicationRevision - a.publicationRevision;
const statusRank = {verified: 0, superseded: 1, 'failed-or-mixed': 2, 'not-yet-verified': 3};

// One row per capability in the latest pre-release evidence release, derived at
// render time and never stored. Accepted verification stays current unless a
// LATER result for the SAME version and the SAME contract failed. A result is
// applicable only when its observation targets the accepted version and its row
// is `scope: 'whole-capability'` or names a `scenario` the acceptance rests on.
// Published observation rows carry neither field today, so they are surfaced
// as non-applicable and never change status.
export function currentCapabilityView(publication) {
  const releases = publication.releases ?? [];
  const baseline = releases.filter(r => r.baselineKind === 'prerelease-evidence').sort(byRevisionDesc)[0];
  if (!baseline) return [];
  const older = releases.filter(r => r.publicationRevision < baseline.publicationRevision).sort(byRevisionDesc);
  const finished = o => Date.parse(o.evidenceWindow.latestFinishedAt);
  const observations = [...(publication.observations ?? [])].sort((a, b) => finished(a) - finished(b));

  return baseline.capabilities.map(cap => {
    const isAccepted = cap.status === 'prerelease-verified';
    const acceptedAt = !isAccepted ? null : cap.evidence.map(e => e.runFinishedAt)
      .reduce((a, b) => (a && Date.parse(a) >= Date.parse(b) ? a : b), null) ?? cap.assessment?.assessedAt ?? null;
    const scenarios = new Set(cap.evidence.map(e => e.scenario));
    const failing = new Set(); // contracts with an unresolved later applicable failure
    const history = isAccepted ? [{event: 'accepted', at: acceptedAt, source: baseline.id}] : [];
    const later = [];
    for (const observation of isAccepted ? observations : []) {
      const row = observation.capabilities.find(r => r.id === cap.id);
      if (!row || !(finished(observation) > Date.parse(acceptedAt))) continue;
      const contract = row.scope === 'whole-capability' ? 'whole-capability' : scenarios.has(row.scenario) ? row.scenario : null;
      const applicable = observation.target.version === baseline.version && contract !== null;
      const passes = (row.passedScenarios ?? 0) + (row.passedWithNotesScenarios ?? 0);
      const failures = row.failedScenarios ?? 0;
      later.push({
        observationId: observation.id, version: observation.target.version, environment: observation.target.environment,
        startedAt: observation.evidenceWindow.earliestStartedAt, finishedAt: observation.evidenceWindow.latestFinishedAt,
        passedScenarios: row.passedScenarios ?? 0, passedWithNotesScenarios: row.passedWithNotesScenarios ?? 0, failedScenarios: failures,
        applicable, contract,
      });
      if (!applicable || (!failures && !passes)) continue; // untested, skipped or out of contract: no effect
      const event = {at: observation.evidenceWindow.latestFinishedAt, source: observation.id, contract};
      if (failures) { failing.add(contract); history.push({event: 'failed', ...event}); continue; }
      // A whole-capability pass clears everything; a scenario pass clears only that scenario.
      if (contract === 'whole-capability') failing.clear(); else failing.delete(contract);
      history.push({event: 'passed', ...event});
    }
    const documentationGap = !cap.summary;
    return {
      id: cap.id, title: cap.title, summary: cap.summary, conditions: cap.conditions, limits: cap.limits,
      status: !isAccepted ? cap.status : failing.size ? 'superseded' : 'verified',
      acceptedAt,
      // Lineage is passed through by reference, never copied, re-versioned or re-labelled.
      lineage: {releaseId: baseline.id, version: baseline.version, verificationBasis: cap.verificationBasis,
        evidence: cap.evidence, assessment: cap.assessment, wholeClaim: cap.wholeClaim},
      releaseStatus: cap.releaseStatus,
      releaseCheckFailed: cap.releaseStatus === 'failed',
      documentationGap,
      // Pointer only: older text is historical and is never copied into the current row.
      olderDescriptionIn: documentationGap ? older.find(r => r.capabilities.some(c => c.id === cap.id && c.summary))?.id ?? null : null,
      laterNonApplicableFailure: later.some(l => !l.applicable && l.failedScenarios > 0),
      later, history,
    };
  }).sort((a, b) => statusRank[a.status] - statusRank[b.status]);
}

export function summarizeCurrentView(rows) {
  const count = test => rows.filter(test).length;
  const wasAccepted = row => row.acceptedAt !== null;
  return {
    capabilities: rows.length,
    verified: count(r => r.status === 'verified'),
    scenarioBacked: count(r => r.status === 'verified' && r.lineage.verificationBasis === 'historical-scenario'),
    developerAssessed: count(r => r.status === 'verified' && r.lineage.verificationBasis === 'developer-assessment'),
    superseded: count(r => r.status === 'superseded'),
    laterNonApplicableFailure: count(r => wasAccepted(r) && r.laterNonApplicableFailure),
    documentationGap: count(r => wasAccepted(r) && r.documentationGap),
    failedOrMixed: count(r => r.status === 'failed-or-mixed'),
    notYetVerified: count(r => r.status === 'not-yet-verified'),
    releaseVerified: count(r => r.releaseStatus === 'verified'),
    releaseCheckFailed: count(r => r.releaseCheckFailed),
  };
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
      const rows = byId.get(key) ?? [];
      rows.push({release, cap: {id, status: 'untested', title: null, summary: null, conditions: [], limits: [], wholeClaim: false, evidence: [], declaration: null}, at: null, qualified: false, omitted: true});
      byId.set(key, rows);
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
    const hasDescription = row => typeof row.cap.title === 'string' && row.cap.title.trim() && typeof row.cap.summary === 'string' && row.cap.summary.trim() && (row.cap.declaration || !row.release.baselineKind);
    const descriptionRow = hasDescription(selected) ? selected : [...ordered].reverse().find(hasDescription);
    const description = descriptionRow ? {capability: descriptionRow.cap, snapshotId: descriptionRow.release.id, historical: descriptionRow !== selected, basis: descriptionRow.cap.declaration ? 'curated-source-declaration' : 'public-snapshot-prose'} : null;
    const baseline = publication.releases.filter(release => release.version === selected.release.version && release.baselineKind === 'prerelease-evidence').sort((a, b) => a.publicationRevision - b.publicationRevision).at(-1);
    const includedInBaseline = baseline ? baseline.capabilities.some(cap => cap.id === selected.cap.id) : null;
    const deferred = baseline?.deferredCapabilities.includes(selected.cap.id) ?? false;
    current.push({...selected.cap, title: description?.capability.title ?? selected.cap.id, summary: description?.capability.summary ?? null,
      conditions: description?.capability.conditions ?? [], limits: description?.capability.limits ?? [], status,
      includedInBaseline, deferred, omitted: ordered.at(-1).omitted ?? false,
      omissionSnapshotId: ordered.at(-1).omitted ? ordered.at(-1).release.id : null,
      version: selected.release.version, snapshotId: selected.release.id, verifiedAt: selected.at,
      retainedStatus: selected.cap.status, retainedCapability: selected.cap, description, failures,
      history: ordered.map(row => ({snapshotId: row.release.id, status: row.cap.status, at: row.at, omitted: row.omitted ?? false, scope: row.omitted ? 'Explicit omitted ID; no capability evidence record published.' : row.cap.scope ?? row.cap.assessment?.scope ?? (row.cap.wholeClaim ? 'Whole-claim assessment' : row.cap.evidence.map(record => record.scenario ?? record.summary).join('; ') || 'Source declaration only')})),
    });
  }
  return current.sort((a, b) => b.version.localeCompare(a.version, undefined, {numeric: true}) || Number(accepted.has(b.status)) - Number(accepted.has(a.status)) || a.id.localeCompare(b.id));
}
