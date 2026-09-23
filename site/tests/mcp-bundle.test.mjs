import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareBundle, verifyBundle} from '../../mcp/bundle.mjs';

const publication = {schema:1, releases:[{
  id:'synthetic-r1', version:'0.0.0', channel:'development', build:'0.0.0',
  sourceRevision:'a'.repeat(40), publicationRevision:1, publishedAt:'2026-09-22T00:00:00Z',
  reviewReference:'https://github.com/kamiwaza-internal/capability-documentation/pull/1',
  capabilities:[{id:'synthetic.one', title:'Synthetic', distribution:'public', summary:'Not product evidence',
    conditions:[],limits:['Synthetic only'],status:'untested',wholeClaim:false,evidence:[]}],
}]};
const target = () => join(mkdtempSync(join(tmpdir(),'mcp-unit-')), 'bundle');
test('MCP-6 prepared bundle matches selected publication and refuses overwrite', () => {
  const dir=target(); prepareBundle(publication,'synthetic-r1',dir);
  assert.equal(verifyBundle(publication,dir).snapshotId,'synthetic-r1');
  assert.throws(() => prepareBundle(publication,'synthetic-r1',dir));
});
test('MCP-7 changed documents and policy files fail verification', () => {
  for (const path of ['documents/synthetic.one.txt','reader.json','indexer.json']) {
    const dir=target(); prepareBundle(publication,'synthetic-r1',dir);
    writeFileSync(join(dir,path),'tampered');
    assert.throws(() => verifyBundle(publication,dir), /mismatch/);
  }
});
test('MCP-8 extra input and withdrawn publication fail closed', () => {
  const dir=target(); prepareBundle(publication,'synthetic-r1',dir);
  assert.throws(() => verifyBundle({schema:1,releases:[]},dir), /not found/);
  writeFileSync(join(dir,'documents','private.txt'),'must not index');
  assert.throws(() => verifyBundle(publication,dir), /mismatch/);
});
