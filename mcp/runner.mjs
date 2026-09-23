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
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Indexing failed; not marking ready. Prepare a new directory before retrying.');
  const listing=run(dockerArgs(directory,bundle,'list'), {capture:true});
  if (listing.error) throw listing.error;
  if (listing.status !== 0) throw new Error('Index inventory failed; not marking ready');
  const libraries=JSON.parse(listing.stdout);
  const version=libraries.find(item => item.name === bundle.library)?.versions.find(item => item.version === bundle.version);
  if (libraries.length !== 1 || version?.status !== 'completed' || version?.uniqueUrlCount !== Object.keys(bundle.documents).length) {
    throw new Error('Incomplete index; not marking ready. Prepare a new directory before retrying.');
  }
  writeFileSync(ready,JSON.stringify({digest:bundle.digest}),{flag:'wx',mode:0o600});
  return bundle;
}

export function readerArgs(publication,directory) {
  const bundle=verifyBundle(publication,directory);
  const path=join(directory,'ready.json');
  if (!existsSync(path) || !lstatSync(path).isFile() || JSON.parse(readFileSync(path,'utf8')).digest !== bundle.digest) {
    throw new Error('Index is not ready for this snapshot');
  }
  return dockerArgs(directory,bundle,'serve');
}
