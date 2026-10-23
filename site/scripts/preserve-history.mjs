import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {loadCurrentVerification} from './current-verification.mjs';

// Key order matters: bundles are emitted with JSON.stringify, so a reorder changes the published bytes.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function preserveHistory(previous, current) {
  for (const prior of previous.releases) {
    const next = current.releases.find(r => r.id === prior.id);
    if (!same(prior, next) || previous.schema !== current.schema && !([2, 5, 6].includes(previous.schema) && current.schema === (previous.schema === 2 ? 5 : previous.schema === 5 ? 6 : 8))) {
      throw new Error('Published revision cannot be changed or removed: ' + prior.id);
    }
  }
  for (const prior of previous.observations ?? []) {
    if (!same(prior, (current.observations ?? []).find(value => value.id === prior.id))) {
      throw new Error('Published observations cannot be changed or removed: ' + prior.id);
    }
  }
  for (const prior of previous.releaseStamps ?? []) {
    if (!same(prior, (current.releaseStamps ?? []).find(value => value.id === prior.id))) {
      throw new Error('Published release stamps cannot be changed or removed: ' + prior.id);
    }
  }
}

// Compare with the immutable base binding, not a predecessor chosen by the new snapshot.
export function preserveVerificationHistory(root, previous, current) {
  for (const prior of previous.corpora.filter(corpus => corpus.currentVerification)) {
    const matches = current.corpora.filter(corpus => corpus.version === prior.version);
    assert.equal(matches.length, 1, 'Current verification release cannot be removed or duplicated: ' + prior.version);
    assert.ok(matches[0].currentVerification, 'Current verification binding cannot be removed: ' + prior.version);
    // Loading the old binding from the current tree also verifies its original bytes still exist.
    const before = loadCurrentVerification(root, prior.currentVerification);
    const after = loadCurrentVerification(root, matches[0].currentVerification);
    assert.equal(before.version, prior.version);
    assert.equal(after.version, prior.version, 'Current verification release cannot change');
    for (const row of before.capabilities) {
      const next = after.capabilities.find(candidate => candidate.id === row.id);
      assert.ok(next, 'Prior capability cannot be removed: ' + row.id);
      if (row.status === 'accepted-scoped-release' && next.status !== row.status) assert.ok(
        typeof next.gap === 'string' && next.gap.trim(),
        'A current negative outcome must explain its gap: ' + row.id);
    }
    for (const row of before.historicalPrerelease) assert.deepEqual(
      after.historicalPrerelease.find(candidate => candidate.id === row.id), row,
      'Historical prerelease evidence cannot be changed or removed: ' + row.id);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.PUBLICATION_BASE_SHA;
  if (!/^[a-f0-9]{40}$/.test(base || '')) throw new Error('Missing immutable base SHA');
  const previous = JSON.parse(execFileSync('git', ['show', base + ':site/data/publication.json'], {encoding: 'utf8'}));
  preserveHistory(previous, JSON.parse(readFileSync('data/publication.json', 'utf8')));
  const previousCorpora = JSON.parse(execFileSync('git', ['show', base + ':site/data/release-corpora.json'], {encoding: 'utf8'}));
  preserveVerificationHistory('..', previousCorpora, JSON.parse(readFileSync('data/release-corpora.json', 'utf8')));
}
