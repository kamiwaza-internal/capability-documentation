import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';

export function preserveHistory(previous, current) {
  for (const prior of previous.releases) {
    const next = current.releases.find(r => r.id === prior.id);
    if (!isDeepStrictEqual(prior, next) || previous.schema !== current.schema) {
      throw new Error('Published revision cannot be changed or removed: ' + prior.id);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.PUBLICATION_BASE_SHA;
  if (!/^[a-f0-9]{40}$/.test(base || '')) throw new Error('Missing immutable base SHA');
  const previous = JSON.parse(execFileSync('git', ['show', base + ':site/data/publication.json'], {encoding: 'utf8'}));
  preserveHistory(previous, JSON.parse(readFileSync('data/publication.json', 'utf8')));
}
