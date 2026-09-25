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
function release(value, sourceOnly) {
  const keys = ['id', 'version', 'channel', 'build', 'sourceRevision', 'publicationRevision', 'publishedAt', 'reviewReference', 'capabilities'];
  shape(value, sourceOnly ? [...keys, 'baselineKind', 'releaseBinding', 'omittedCapabilities'] : keys);
  if (sourceOnly) {
    requireValue(value.baselineKind === 'source-declaration' && value.channel === 'development' && value.releaseBinding === 'not-established', 'Source baseline cannot claim released-build binding');
    strings(value.omittedCapabilities); unique(value.omittedCapabilities);
    requireValue(value.omittedCapabilities.every(x => id.test(x) && !value.capabilities.some(c => c.id === x)), 'Invalid omitted capability');
  }
  requireValue(typeof value.id === 'string' && id.test(value.id), 'Invalid release identifier');
  text(value.id);
  requireValue(typeof value.version === 'string' && /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(value.version), 'Invalid version');
  requireValue(['development', 'released'].includes(value.channel), 'Invalid release channel');
  text(value.build);
  requireValue(value.build === value.version || value.build.startsWith(value.version + '; '), 'Build must identify the selected version');
  requireValue(typeof value.sourceRevision === 'string' && sha.test(value.sourceRevision), 'Source must be a full commit');
  requireValue(Number.isSafeInteger(value.publicationRevision) && value.publicationRevision > 0, 'Invalid publication revision');
  requireValue(typeof value.publishedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value.publishedAt) && Number.isFinite(Date.parse(value.publishedAt)), 'Invalid publication timestamp');
  requireValue(new Date(value.publishedAt).toISOString() === value.publishedAt.replace('Z', '.000Z'), 'Invalid publication calendar date');
  requireValue(typeof value.reviewReference === 'string' && /^https:\/\/github\.com\/kamiwaza-internal\/capability-documentation\/pull\/[1-9]\d*$/.test(value.reviewReference), 'Public review PR reference required');
  requireValue(Array.isArray(value.capabilities) && value.capabilities.length > 0 && value.capabilities.length <= 2000, 'Release must contain approved capabilities');
  value.capabilities.forEach(cap => capability(cap, value.build, sourceOnly));
  unique(value.capabilities.map(cap => cap.id));
}
export function validatePublication(input) {
  shape(input, ['schema', 'releases']);
  requireValue([1, 2].includes(input.schema), 'Unsupported publication schema');
  requireValue(Array.isArray(input.releases) && input.releases.length <= 500, 'Invalid releases list');
  input.releases.forEach(value => release(value, input.schema === 2));
  unique(input.releases.map(r => r.id));
  return input;
}
