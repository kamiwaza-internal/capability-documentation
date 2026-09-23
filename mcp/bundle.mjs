import {mkdirSync, writeFileSync, readFileSync, readdirSync, lstatSync, realpathSync} from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {makeBundle, runtimeConfig, IMAGE} from './integration.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
function check(ok) { if (!ok) throw new Error('Prepared bundle mismatch; rebuild into a new directory'); }
function regular(path) { check(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink()); }

export function prepareBundle(publication, snapshotId, directory) {
  const bundle = makeBundle(publication, snapshotId);
  if (realpathSync(dirname(resolve(directory))) !== dirname(resolve(directory))) {
    throw new Error('Use the real absolute parent path, not a symlinked parent');
  }
  mkdirSync(directory, {mode: 0o700}); // Existing targets fail rather than overwrite.
  mkdirSync(join(directory, 'documents'), {mode: 0o700});
  mkdirSync(join(directory, 'data'), {mode: 0o700});
  for (const [name, content] of Object.entries(bundle.documents)) {
    writeFileSync(join(directory, 'documents', name), content, {flag:'wx', mode:0o600});
  }
  for (const [name, content] of Object.entries({
    'manifest.json': {snapshotId, digest:bundle.digest, image:IMAGE},
    'reader.json': runtimeConfig(true), 'indexer.json': runtimeConfig(false),
  })) writeFileSync(join(directory, name), json(content), {flag:'wx',mode:0o600});
  return bundle;
}

export function verifyBundle(publication, directory) {
  check(realpathSync(directory) === resolve(directory));
  for (const folder of ['documents','data']) check(lstatSync(join(directory,folder)).isDirectory() && !lstatSync(join(directory,folder)).isSymbolicLink());
  regular(join(directory,'manifest.json'));
  const manifest=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));
  const bundle=makeBundle(publication,manifest.snapshotId);
  check(manifest.digest === bundle.digest && manifest.image === IMAGE);
  check(JSON.stringify(readdirSync(join(directory,'documents')).sort()) === JSON.stringify(Object.keys(bundle.documents).sort()));
  for (const [name, content] of Object.entries(bundle.documents)) {
    const path=join(directory,'documents',name); regular(path);
    check(readFileSync(path,'utf8') === content);
  }
  for (const [name, reader] of [['reader.json',true],['indexer.json',false]]) {
    const path=join(directory,name); regular(path);
    check(readFileSync(path,'utf8') === json(runtimeConfig(reader)));
  }
  return bundle;
}
