import {existsSync,readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {verifyBundle} from './bundle.mjs';
import {dockerArgs} from './integration.mjs';

export function indexBundle(publication,directory,run) {
  const bundle=verifyBundle(publication,directory);
  const ready=join(directory,'ready.json');
  if (existsSync(ready)) throw new Error('Bundle already indexed; prepare a new directory');
  if (readdirSync(join(directory,'data')).length) throw new Error('Index data is not empty; prepare a new directory');
  const result=run(dockerArgs(directory,bundle,'index'));
  if (result.status !== 0) throw new Error('Indexing failed; not marking ready. Prepare a new directory before retrying.');
  writeFileSync(ready,JSON.stringify({digest:bundle.digest}),{flag:'wx',mode:0o600});
  return bundle;
}

export function readerArgs(publication,directory) {
  const bundle=verifyBundle(publication,directory);
  const path=join(directory,'ready.json');
  if (!lstatSync(path).isFile() || JSON.parse(readFileSync(path,'utf8')).digest !== bundle.digest) {
    throw new Error('Index is not ready for this snapshot');
  }
  return dockerArgs(directory,bundle,'serve');
}
