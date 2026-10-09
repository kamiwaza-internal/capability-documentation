// Consumer validation only. Verdict computation and publication approval stay upstream.
const sha = /^[a-f0-9]{40}$/;
const id = /^[a-z0-9][a-z0-9.-]{0,119}$/;
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function shape(value, keys) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Expected object');
  requireValue(Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k)), 'Unexpected or missing fields');
}
function text(value) {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= 8000, 'Invalid text');
  requireValue(!/value[- ]streams?|\bVS-\d+\b/i.test(value), 'Internal planning reference is forbidden');
}
function strings(values) {
  requireValue(Array.isArray(values) && values.length <= 100, 'Invalid text list');
  values.forEach(text);
}
function unique(values) { requireValue(new Set(values).size === values.length, 'Duplicate identifiers'); }
function evidence(record, build) {
  shape(record, ['build', 'outcome', 'summary']);
  requireValue(record.build === build, 'Evidence build mismatch');
  requireValue(['passed', 'passed_with_notes', 'failed', 'skipped'].includes(record.outcome), 'Invalid evidence outcome');
  text(record.summary);
}
function capability(cap, build, sourceOnly) {
  const keys = ['id', 'title', 'distribution', 'summary', 'conditions', 'limits', 'status', 'wholeClaim', 'evidence'];
  shape(cap, sourceOnly ? [...keys, 'declaration'] : keys);
  if (sourceOnly) {
    requireValue(cap.status === 'untested' && cap.wholeClaim === false && cap.evidence.length === 0, 'Source baseline cannot claim runtime credit');
    declaration(cap.declaration);
  }
  requireValue(typeof cap.id === 'string' && id.test(cap.id), 'Invalid capability identifier');
  text(cap.id);
  requireValue(cap.distribution === 'public', 'Only approved public projections can be rendered');
  [cap.title, cap.summary].forEach(text);
  strings(cap.conditions); strings(cap.limits);
  requireValue(['verified', 'partial', 'failed', 'untested'].includes(cap.status), 'Invalid upstream verdict');
  requireValue(typeof cap.wholeClaim === 'boolean', 'Missing whole-claim assessment');
  requireValue(Array.isArray(cap.evidence) && cap.evidence.length <= 100, 'Invalid evidence list');
  cap.evidence.forEach(record => evidence(record, build));
  if (cap.status === 'verified') {
    requireValue(cap.wholeClaim && cap.evidence.length > 0 && cap.evidence.every(e => e.outcome === 'passed'), 'Verified requires whole-claim clean evidence');
  }
}
function declaration(value) {
  shape(value, ['documentSha256', 'citations', 'basis', 'scope', 'mechanicalValidation']);
  requireValue(/^[a-f0-9]{64}$/.test(value.documentSha256), 'Invalid document hash');
  requireValue(value.basis === 'curated-source-review', 'Unsupported declaration basis');
  text(value.scope); text(value.mechanicalValidation);
  requireValue(Array.isArray(value.citations) && value.citations.length > 0, 'Missing declaration citations');
  for (const c of value.citations) {
    shape(c, ['repo', 'path', 'symbol', 'kind', 'closed', 'read_at']);
    [c.repo, c.path, c.symbol, c.kind].forEach(text);
    requireValue(sha.test(c.read_at), 'Declaration must pin source revision');
    requireValue(typeof c.closed === 'boolean', 'Declaration closure required');
  }
}
// Pre-release runtime evidence (schema 2 container, labelled schema 3 in its own bundle):
// the kit's lifecycle verdict from scenario records on development builds. It is a
// separate axis from release verification (`releaseStatus`) and human approval, and
// never carries whole-capability credit.
const devBuild = /^(develop|development-branch)@[a-f0-9]{7,40}$/;
function instant(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace('Z', '.000Z'), 'Invalid evidence timestamp');
  requireValue(Date.parse(value) <= Date.now(), 'Future evidence timestamp');
}
function prereleaseEvidence(record, release) {
  shape(record, ['scenario', 'build', 'outcome', 'runFinishedAt', 'ingestedAt', 'recordSha256']);
  requireValue(typeof record.scenario === 'string' && /^[A-Za-z0-9][A-Za-z0-9/+._-]{0,159}$/.test(record.scenario), 'Invalid scenario identifier');
  text(record.scenario);
  requireValue(typeof record.build === 'string' && devBuild.test(record.build) && release.testedBuilds.includes(record.build), 'Evidence build mismatch');
  requireValue(['passed', 'passed_with_notes', 'failed'].includes(record.outcome), 'Invalid evidence outcome');
  instant(record.runFinishedAt); instant(record.ingestedAt);
  // Run, then ingestion into the kit, then the published kit revision. A record cannot be newer than its corpus.
  requireValue(record.runFinishedAt <= record.ingestedAt && record.ingestedAt <= release.sourceCommittedAt, 'Evidence dates out of order');
  requireValue(typeof record.recordSha256 === 'string' && /^[a-f0-9]{64}$/.test(record.recordSha256), 'Invalid record hash');
}
function developerAssessment(value, release) {
  shape(value, ['basis', 'assessedAt', 'ingestedAt', 'observedSourceRevision', 'sourceBinding', 'scope', 'assumptions', 'limits']);
  requireValue(value.basis === 'developer-assessment' && value.sourceBinding === 'observed-source-only', 'Invalid assessment basis or source binding');
  requireValue(sha.test(value.observedSourceRevision), 'Assessment requires observed source revision');
  instant(value.assessedAt);
  requireValue(value.assessedAt <= release.generatedAt, 'Assessment postdates draft');
  if (value.ingestedAt !== null) {
    instant(value.ingestedAt);
    requireValue(value.assessedAt <= value.ingestedAt && value.ingestedAt <= release.generatedAt, 'Assessment ingestion dates out of order');
  }
  text(value.scope); strings(value.assumptions); strings(value.limits);
  requireValue(value.scope === 'Accepted local-contract developer assessment; no live scenario execution.' && value.assumptions.length >= 3 && value.limits.length >= 3, 'Missing assessment scope and limitations');
  requireValue(value.limits[0] === 'No live runtime pass, cross-build equivalence, release verification or human release approval is claimed.', 'Assessment must disclaim runtime and release credit');
  // This new surface carries curated public prose, never private packet prose.
  for (const item of [value.scope, ...value.assumptions, ...value.limits]) {
    requireValue(!/https?:|\/(?:home|tmp|etc|var)\/|PRIVATE|CANARY|KAMIWAZA_|\.env\b|Bearer\s|password|token=|localhost|\b\d{1,3}(?:\.\d{1,3}){3}\b/i.test(item), 'Private assessment content forbidden');
  }
}
function prereleaseCapability(cap, release) {
  shape(cap, ['id', 'title', 'distribution', 'summary', 'conditions', 'limits', 'status', 'wholeClaim', 'evidence', 'declaration', 'releaseStatus', 'verificationBasis', 'assessment']);
  requireValue(typeof cap.id === 'string' && id.test(cap.id), 'Invalid capability identifier');
  text(cap.id);
  requireValue(cap.distribution === 'public', 'Only approved public projections can be rendered');
  if (cap.declaration === null) {
    requireValue(cap.title === null && cap.summary === null && Array.isArray(cap.conditions) && cap.conditions.length === 0 && Array.isArray(cap.limits) && cap.limits.length === 0, 'Text requires a curated declaration');
  } else {
    declaration(cap.declaration); [cap.title, cap.summary].forEach(text); strings(cap.conditions); strings(cap.limits);
    const structural = JSON.stringify([cap.title, cap.summary, cap.conditions, cap.limits, cap.declaration]);
    requireValue(!/https?:\/\/|\/(?:home|tmp|etc|var)\/|PRIVATE|CANARY|\.env\b|localhost|[A-Z][A-Z0-9]+_[A-Z0-9_]+|\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(structural), 'Private declaration content forbidden');
  }
  requireValue(['prerelease-verified', 'failed-or-mixed', 'not-yet-verified'].includes(cap.status), 'Invalid pre-release verdict');
  requireValue(cap.wholeClaim === false, 'Pre-release evidence cannot claim whole-capability credit');
  requireValue(['not-stamped', 'failed'].includes(cap.releaseStatus), 'Release verification requires an established release binding');
  requireValue(Array.isArray(cap.evidence) && cap.evidence.length <= 100, 'Invalid evidence list');
  cap.evidence.forEach(record => prereleaseEvidence(record, release));
  unique(cap.evidence.map(record => record.scenario));
  requireValue(['historical-scenario', 'developer-assessment', 'none'].includes(cap.verificationBasis), 'Invalid verification basis');
  if (cap.verificationBasis === 'developer-assessment') {
    requireValue(cap.status === 'prerelease-verified' && cap.evidence.length === 0 && cap.assessment !== null && cap.releaseStatus === 'not-stamped', 'Assessment cannot supply runtime or release evidence');
    developerAssessment(cap.assessment, release);
  } else {
    requireValue(cap.assessment === null && (cap.verificationBasis === 'historical-scenario' ? cap.evidence.length > 0 : cap.evidence.length === 0), 'Contradictory verification basis');
  }
  const failed = cap.evidence.filter(record => record.outcome === 'failed').length;
  if (cap.status === 'prerelease-verified' && cap.verificationBasis !== 'developer-assessment') requireValue(cap.evidence.length > 0 && failed === 0, 'Pre-release verified requires clean scenario evidence');
  if (cap.status === 'failed-or-mixed') requireValue(failed > 0, 'Failed or mixed requires a failing record');
  if (cap.status === 'not-yet-verified') requireValue(cap.evidence.length === 0, 'Unverified capability cannot carry evidence');
}
function prereleaseRelease(value) {
  requireValue(value.channel === 'development' && value.releaseBinding === 'not-established' && value.approval.status === 'pending', 'Pre-release evidence cannot claim a release binding or approval');
  requireValue(value.build === value.version + '; project pre-release baseline: historical development-build scenarios and local-contract assessments; not a released ' + value.version + ' artifact; release unverified', 'Project baseline cannot invent an aggregate tested build');
  strings(value.omittedCapabilities); unique(value.omittedCapabilities);
  requireValue(value.omittedCapabilities.every(x => id.test(x) && !value.capabilities.some(c => c.id === x)), 'Invalid omitted capability');
  instant(value.sourceCommittedAt);
  requireValue(value.sourceCommittedAt <= value.generatedAt, 'Draft cannot predate its evidence corpus');
  requireValue(Array.isArray(value.testedBuilds) && value.testedBuilds.length > 0 && value.testedBuilds.length <= 500 && value.testedBuilds.every(b => typeof b === 'string' && devBuild.test(b)), 'Invalid tested builds');
  unique(value.testedBuilds);
  value.capabilities.forEach(cap => prereleaseCapability(cap, value));
  strings(value.deferredCapabilities); unique(value.deferredCapabilities);
  requireValue(value.deferredCapabilities.every(cid => value.capabilities.some(c => c.id === cid && c.status === 'not-yet-verified')), 'Deferred capability must remain an included unverified gap');
  const records = value.capabilities.flatMap(cap => cap.evidence);
  requireValue(value.testedBuilds.every(b => records.some(record => record.build === b)), 'Tested build has no evidence');
  // The window is derived, never authored: an old run cannot be presented as a newer one.
  const runs = records.map(record => record.runFinishedAt).sort();
  shape(value.evidenceWindow, ['earliestRunFinishedAt', 'latestRunFinishedAt']);
  requireValue(runs.length > 0 && value.evidenceWindow.earliestRunFinishedAt === runs[0] && value.evidenceWindow.latestRunFinishedAt === runs.at(-1), 'Evidence window must match the recorded runs');
  const assessments = value.capabilities.filter(cap => cap.assessment).map(cap => cap.assessment.assessedAt).sort();
  shape(value.assessmentWindow, ['earliestAssessedAt', 'latestAssessedAt']);
  requireValue(assessments.length > 0 && value.assessmentWindow.earliestAssessedAt === assessments[0] && value.assessmentWindow.latestAssessedAt === assessments.at(-1), 'Assessment window must match accepted assessments');
  const count = status => value.capabilities.filter(cap => cap.status === status).length;
  shape(value.counts, ['included', 'prereleaseVerified', 'scenarioVerified', 'developerAssessed', 'failedOrMixed', 'notYetVerified', 'releaseVerified', 'releaseFailed']);
  requireValue(value.counts.included === value.capabilities.length && value.counts.prereleaseVerified === count('prerelease-verified') &&
    value.counts.scenarioVerified === value.capabilities.filter(c => c.status === 'prerelease-verified' && c.verificationBasis === 'historical-scenario').length &&
    value.counts.developerAssessed === value.capabilities.filter(c => c.verificationBasis === 'developer-assessment').length &&
    value.counts.prereleaseVerified === value.counts.scenarioVerified + value.counts.developerAssessed &&
    value.counts.failedOrMixed === count('failed-or-mixed') && value.counts.notYetVerified === count('not-yet-verified') &&
    value.counts.releaseVerified === 0 && value.counts.releaseFailed === value.capabilities.filter(cap => cap.releaseStatus === 'failed').length, 'Counts must match the published capabilities');
}
function approval(value) {
  shape(value, ['status', 'approvedBy', 'approvedAt']);
  requireValue(['pending', 'approved'].includes(value.status), 'Invalid release approval status');
  if (value.status === 'approved') {
    text(value.approvedBy);
    requireValue(typeof value.approvedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value.approvedAt) && Number.isFinite(Date.parse(value.approvedAt)), 'Approved release requires an approval timestamp');
  } else {
    requireValue(value.approvedBy === null && value.approvedAt === null, 'A pending release cannot name an approver');
  }
}
function release(value, schema) {
  const keys = ['id', 'version', 'channel', 'approval', 'build', 'sourceRevision', 'publicationRevision', 'publishedAt', 'reviewReference', 'capabilities'];
  const prerelease = schema >= 2 && value?.baselineKind === 'prerelease-evidence';
  requireValue(prerelease || schema < 3, 'Schema 3 carries pre-release evidence only');
  const sourceOnly = schema === 2 && !prerelease;
  const baseline = [...keys, 'baselineKind', 'releaseBinding', 'omittedCapabilities'];
  shape(value, prerelease ? [...baseline, 'sourceCommittedAt', 'testedBuilds', 'evidenceWindow', 'counts', 'publicationState', 'generatedAt', 'assessmentWindow', 'deferredCapabilities'] : sourceOnly ? baseline : keys);
  if (sourceOnly) {
    requireValue(value.baselineKind === 'source-declaration' && value.channel === 'development' && value.releaseBinding === 'not-established', 'Source baseline cannot claim released-build binding');
    strings(value.omittedCapabilities); unique(value.omittedCapabilities);
    requireValue(value.omittedCapabilities.every(x => id.test(x) && !value.capabilities.some(c => c.id === x)), 'Invalid omitted capability');
  }
  requireValue(typeof value.id === 'string' && id.test(value.id), 'Invalid release identifier');
  text(value.id);
  requireValue(typeof value.version === 'string' && /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(value.version), 'Invalid version');
  requireValue(['development', 'released'].includes(value.channel), 'Invalid release channel');
  approval(value.approval);
  text(value.build);
  requireValue(value.build === value.version || value.build.startsWith(value.version + '; '), 'Build must identify the selected version');
  requireValue(typeof value.sourceRevision === 'string' && sha.test(value.sourceRevision), 'Source must be a full commit');
  requireValue(Number.isSafeInteger(value.publicationRevision) && value.publicationRevision > 0, 'Invalid publication revision');
  if (prerelease) {
    instant(value.generatedAt);
    requireValue(['draft', 'published'].includes(value.publicationState), 'Invalid publication state');
    if (value.publicationState === 'draft') {
      requireValue(value.publishedAt === null && value.reviewReference === null, 'Draft cannot invent publication or review identity');
    } else {
      instant(value.publishedAt);
      requireValue(value.generatedAt <= value.publishedAt, 'Publication predates generation');
      requireValue(typeof value.reviewReference === 'string' && /^https:\/\/github\.com\/kamiwaza-internal\/capability-documentation\/pull\/[1-9]\d*$/.test(value.reviewReference), 'Public review PR reference required');
    }
  } else {
    instant(value.publishedAt);
    requireValue(typeof value.reviewReference === 'string' && /^https:\/\/github\.com\/kamiwaza-internal\/capability-documentation\/pull\/[1-9]\d*$/.test(value.reviewReference), 'Public review PR reference required');
  }
  requireValue(Array.isArray(value.capabilities) && value.capabilities.length > 0 && value.capabilities.length <= 2000, 'Release must contain approved capabilities');
  if (prerelease) prereleaseRelease(value);
  else value.capabilities.forEach(cap => capability(cap, value.build, sourceOnly));
  unique(value.capabilities.map(cap => cap.id));
}
export function validatePublication(input) {
  shape(input, ['schema', 'releases']);
  requireValue([1, 2, 3, 4].includes(input.schema), 'Unsupported publication schema');
  requireValue(Array.isArray(input.releases) && input.releases.length <= 500, 'Invalid releases list');
  input.releases.forEach(value => release(value, input.schema));
  unique(input.releases.map(r => r.id));
  return input;
}
