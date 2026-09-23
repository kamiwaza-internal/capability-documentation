import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {prepareBundle} from './bundle.mjs';
import {indexBundle,readerArgs} from './runner.mjs';

const [operation,first,second,...extra]=process.argv.slice(2);
if (process.platform !== 'linux' || extra.length || !first ||
    !['prepare','index','serve'].includes(operation) || (operation === 'prepare' ? !second : second)) {
  throw new Error('Linux + Docker required. Usage: node mcp/cli.mjs prepare SNAPSHOT_ID NEW_DIRECTORY | index DIRECTORY | serve DIRECTORY');
}
const publication=JSON.parse(readFileSync(new URL('../site/data/publication.json',import.meta.url),'utf8'));
if (operation === 'prepare') {
  const bundle=prepareBundle(publication,first,resolve(second));
  console.log(JSON.stringify({snapshotId:bundle.snapshotId,library:bundle.library,directory:resolve(second)}));
} else if (operation === 'index') {
  indexBundle(publication,resolve(first),args => spawnSync('docker',args,{stdio:'inherit',timeout:300000}));
} else {
  const result=spawnSync('docker',readerArgs(publication,resolve(first)),{stdio:'inherit'});
  if (result.error) throw result.error;
  process.exitCode=result.status ?? 1;
}
