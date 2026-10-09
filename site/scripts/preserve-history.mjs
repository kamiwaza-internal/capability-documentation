import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Key order matters: bundles are emitted with JSON.stringify, so a reorder changes the published bytes.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function preserveHistory(previous, current) {
  for (const prior of previous.releases) {
    const next = current.releases.find(r => r.id === prior.id);
    if (!same(prior, next) || previous.schema !== current.schema && !([2, 5].includes(previous.schema) && current.schema === (previous.schema === 2 ? 5 : 6))) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.PUBLICATION_BASE_SHA;
  if (!/^[a-f0-9]{40}$/.test(base || '')) throw new Error('Missing immutable base SHA');
  const previous = JSON.parse(execFileSync('git', ['show', base + ':site/data/publication.json'], {encoding: 'utf8'}));
  preserveHistory(previous, JSON.parse(readFileSync('data/publication.json', 'utf8')));
}
