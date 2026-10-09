// Consumer validation for the local scoped stamp projection. Separate from publication.json:
// these are not release stamps and never feed a release verdict.
import {stampsApply} from '../src/catalog.mjs';

const hex64 = /^[a-f0-9]{64}$/;
export const id = /^[a-z0-9][a-z0-9.-]{0,119}$/;
const scenarioId = /^[A-Za-z0-9][A-Za-z0-9/+._-]{0,159}$/;
const instantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
export function requireValue(ok, message) { if (!ok) throw new Error(message); }
export function shape(value, keys) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Expected object');
  requireValue(Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k)), 'Unexpected or missing fields');
}
export function text(value) { requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= 2000, 'Invalid text'); }
export function instant(value) { requireValue(typeof value === 'string' && instantPattern.test(value) && Number.isFinite(Date.parse(value)), 'Invalid timestamp'); return Date.parse(value); }
export function list(value, max) { requireValue(Array.isArray(value) && value.length <= max, 'Invalid list'); return value; }
export function unique(values) { requireValue(new Set(values).size === values.length, 'Duplicate identifiers'); }
export function count(value) { requireValue(Number.isInteger(value) && value >= 0, 'Invalid count'); }

export const kitPullRequestPattern = /^https:\/\/github\.com\/kamiwaza-internal\/capability-kit\/pull\/\d+$/;

// The file's own checks always run. `publication` is optional. When given and it holds the
// baseline release and observation this projection names, a published observation of the same
// run must agree: no capability with a failed scenario there may carry a stamp here.
// Returns the data, or null when the projection does not apply to the given publication.
export function validateLocalStamps(data, publication) {
  shape(data, ['schema', 'kind', 'releaseVerified', 'notAReleaseStamp', 'targetVersion', 'environment', 'baselineReleaseId', 'observationId', 'runWindow', 'source', 'coreSource', 'limits', 'counts', 'stamps', 'notStampedFailed']);
  requireValue([data.baselineReleaseId, data.observationId].every(value => typeof value === 'string' && id.test(value)), 'Local stamps must name the baseline release and observation they were projected against');
  requireValue(data.schema === 'local-stamp-projection.v1' && data.kind === 'local-scoped-verification', 'Unsupported local stamp projection');
  requireValue(data.releaseVerified === false && data.notAReleaseStamp === true, 'Local stamps are never release stamps or release verification');
  requireValue(typeof data.targetVersion === 'string' && /^\d+\.\d+\.\d+$/.test(data.targetVersion), 'Missing target version');
  requireValue(data.environment === 'local', 'Local stamps require the local environment label');
  shape(data.runWindow, ['earliestStartedAt', 'latestFinishedAt']);
  const windowStart = instant(data.runWindow.earliestStartedAt), windowEnd = instant(data.runWindow.latestFinishedAt);
  requireValue(windowStart <= windowEnd && windowEnd <= Date.now(), 'Invalid run window');

  shape(data.source, ['kitRepository', 'kitCommit', 'kitPullRequest', 'stampSetPath', 'packetPath', 'stampSetSha256']);
  requireValue(data.source.kitRepository === 'kamiwaza-internal/capability-kit', 'Unexpected kit repository');
  requireValue(/^[a-f0-9]{40}$/.test(data.source.kitCommit), 'Kit source must pin a commit');
  requireValue(typeof data.source.kitPullRequest === 'string' && kitPullRequestPattern.test(data.source.kitPullRequest), 'Invalid kit pull request');
  for (const path of [data.source.stampSetPath, data.source.packetPath]) {
    requireValue(typeof path === 'string' && /^reports\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)?$/.test(path), 'Invalid kit report path');
  }
  requireValue(hex64.test(data.source.stampSetSha256), 'Invalid stamp set hash');
  shape(data.coreSource, ['ref', 'commit']);
  requireValue(typeof data.coreSource.ref === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/.test(data.coreSource.ref) && /^[a-f0-9]{40}$/.test(data.coreSource.commit), 'Invalid core source');
  list(data.limits, 20).forEach(text);
  requireValue(data.limits.length > 0, 'Limits are required');

  const stamped = list(data.stamps, 1000).map(stamp => {
    shape(stamp, ['capability', 'stampSha256', 'scenarios']);
    requireValue(typeof stamp.capability === 'string' && id.test(stamp.capability), 'Invalid capability identifier');
    requireValue(hex64.test(stamp.stampSha256), 'Invalid stamp hash');
    requireValue(list(stamp.scenarios, 100).length > 0, 'A stamp needs at least one scenario');
    for (const scenario of stamp.scenarios) {
      shape(scenario, ['scenarioId', 'lane', 'status', 'startedAt', 'finishedAt', 'recordSha256']);
      requireValue(typeof scenario.scenarioId === 'string' && scenarioId.test(scenario.scenarioId), 'Invalid scenario identifier');
      requireValue(typeof scenario.lane === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(scenario.lane), 'Invalid lane');
      requireValue(['passed', 'passed_with_notes'].includes(scenario.status), 'A stamp cannot contain a scenario that did not pass');
      const started = instant(scenario.startedAt), finished = instant(scenario.finishedAt);
      requireValue(started <= finished && finished <= windowEnd, 'Scenario dates outside the run window');
      requireValue(hex64.test(scenario.recordSha256), 'Invalid record hash');
    }
    unique(stamp.scenarios.map(s => s.lane + ' ' + s.scenarioId));
    return stamp.capability;
  });
  const failed = list(data.notStampedFailed, 1000).map(entry => {
    shape(entry, ['capability', 'failedScenarios']);
    requireValue(typeof entry.capability === 'string' && id.test(entry.capability), 'Invalid capability identifier');
    requireValue(list(entry.failedScenarios, 100).length > 0 && entry.failedScenarios.every(s => typeof s === 'string' && scenarioId.test(s)), 'Invalid failed scenario list');
    unique(entry.failedScenarios);
    return entry.capability;
  });
  unique([...stamped, ...failed]); // unique ids, and never both stamped and not stamped

  shape(data.counts, ['capabilitiesInPacket', 'capabilitiesWithoutFreshRecord', 'stamps', 'notStampedFailed', 'stampedScenarioEntries']);
  Object.values(data.counts).forEach(count);
  requireValue(data.counts.stamps === stamped.length && data.counts.notStampedFailed === failed.length &&
    data.counts.stampedScenarioEntries === data.stamps.reduce((n, s) => n + s.scenarios.length, 0) &&
    data.counts.capabilitiesInPacket === stamped.length + failed.length + data.counts.capabilitiesWithoutFreshRecord, 'Counts do not reconcile');

  // Private workspace paths, image digests, registry hosts and any URL other than the kit pull request stay out.
  const body = JSON.stringify({...data, source: {...data.source, kitPullRequest: ''}});
  requireValue(!/work\/|sha256:|@sha256|ghcr\.io|https?:|\.patch\b|\/(?:home|Users|tmp|etc|var)\//i.test(body), 'Private content forbidden in local stamp projection');

  if (!publication) return data;
  if (!stampsApply(data, publication)) return null;
  for (const observation of publication.observations) {
    if (observation.target?.version !== data.targetVersion || observation.evidenceWindow?.latestFinishedAt !== data.runWindow.latestFinishedAt) continue;
    for (const row of observation.capabilities) {
      if (row.failedScenarios > 0) requireValue(failed.includes(row.id), 'Published failure missing from notStampedFailed: ' + row.id);
    }
  }
  return data;
}
