export function filterCapabilities(capabilities, query, status) {
  const needle = query.trim().toLowerCase();
  return capabilities.filter(cap => (status === 'all' || cap.status === status) &&
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
    const accepted = cap.status === 'prerelease-verified';
    const acceptedAt = !accepted ? null : cap.evidence.map(e => e.runFinishedAt)
      .reduce((a, b) => (a && Date.parse(a) >= Date.parse(b) ? a : b), null) ?? cap.assessment?.assessedAt ?? null;
    const scenarios = new Set(cap.evidence.map(e => e.scenario));
    const failing = new Set(); // contracts with an unresolved later applicable failure
    const history = accepted ? [{event: 'accepted', at: acceptedAt, source: baseline.id}] : [];
    const later = [];
    for (const observation of accepted ? observations : []) {
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
      status: !accepted ? cap.status : failing.size ? 'superseded' : 'verified',
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
  const accepted = row => row.acceptedAt !== null;
  return {
    capabilities: rows.length,
    verified: count(r => r.status === 'verified'),
    scenarioBacked: count(r => r.status === 'verified' && r.lineage.verificationBasis === 'historical-scenario'),
    developerAssessed: count(r => r.status === 'verified' && r.lineage.verificationBasis === 'developer-assessment'),
    superseded: count(r => r.status === 'superseded'),
    laterNonApplicableFailure: count(r => accepted(r) && r.laterNonApplicableFailure),
    documentationGap: count(r => accepted(r) && r.documentationGap),
    failedOrMixed: count(r => r.status === 'failed-or-mixed'),
    notYetVerified: count(r => r.status === 'not-yet-verified'),
    releaseVerified: count(r => r.releaseStatus === 'verified'),
    releaseCheckFailed: count(r => r.releaseCheckFailed),
  };
}

// Additive join of the local scoped stamp projection onto the current rows. It never
// changes a row's status, lineage or flags; it only attaches the stamp summary.
// Stamps and failures for capabilities outside the rows are returned, never dropped.
export function joinLocalStamps(rows, localStamps) {
  const stamps = new Map(localStamps.stamps.map(stamp => [stamp.capability, stamp]));
  const failed = new Set(localStamps.notStampedFailed.map(entry => entry.capability));
  const inView = new Set(rows.map(row => row.id));
  const joined = rows.map(row => {
    const stamp = stamps.get(row.id);
    return {...row,
      localStamp: stamp ? {scenarios: stamp.scenarios.length, runDate: stamp.scenarios.map(s => s.finishedAt).sort().at(-1).slice(0, 10)} : null,
      localNotStamped: failed.has(row.id)};
  });
  const outside = ids => [...ids].filter(id => !inView.has(id)).sort();
  return {
    rows: joined,
    stamped: joined.filter(row => row.localStamp).length,
    stampedVerified: joined.filter(row => row.localStamp && row.status === 'verified').length,
    stampedOutside: outside(stamps.keys()),
    notStampedOutside: outside(failed),
  };
}
