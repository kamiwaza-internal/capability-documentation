import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {prepareBundle} from '../../mcp/bundle.mjs';
import {dockerArgs} from '../../mcp/integration.mjs';
import {fixture} from './fixtures/mcp.mjs';

test('MCP-LIVE-1 pinned upstream indexes and retrieves synthetic content with no network', async () => {
  const root=mkdtempSync(join(tmpdir(),'capability-mcp-smoke-'));
  const dir=join(root,'bundle'); const bundle=prepareBundle(fixture(),'synthetic-r1',dir);
  const run = (operation, extra=[]) => {
    const result=spawnSync('docker',[...dockerArgs(dir,bundle,operation),...extra],
      {encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
    assert.equal(result.status,0,result.stdout+result.stderr);
    return result.stdout;
  };
  console.log(`Synthetic scratch bundle: ${dir}`);
  run('index');
  const listing=run('list'); assert.ok(listing.includes(bundle.library),listing);
  const result=run('search',['Velvet otters','--version',bundle.version,'--output','json']);
  assert.ok(result.includes('amber'),result);
  const child=spawn('docker',dockerArgs(dir,bundle,'serve'),{stdio:['pipe','pipe','pipe']});
  let buffer=''; let seq=0; const pending=new Map();
  child.stderr.on('data',data => process.stderr.write(data));
  child.stdout.on('data',data => {
    buffer+=data;
    while (buffer.includes('\n')) {
      const boundary=buffer.indexOf('\n'); const line=buffer.slice(0,boundary); buffer=buffer.slice(boundary+1);
      if (!line.trim()) continue;
      const message=JSON.parse(line); const wait=pending.get(message.id);
      if (wait) { clearTimeout(wait.timer); pending.delete(message.id); wait.resolve(message); }
    }
  });
  const request=(method,params) => new Promise((resolve,reject) => {
    const id=++seq; const timer=setTimeout(() => reject(new Error(`MCP timeout: ${method}`)),30000);
    pending.set(id,{resolve,timer}); child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
  });
  try {
    const init=await request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'synthetic-smoke',version:'1'}});
    assert.ok(init.result,JSON.stringify(init));
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    const inventory=await request('tools/list',{});
    const names=inventory.result.tools.map(tool=>tool.name);
    console.log('Reader tools: '+names.join(', '));
    const search=await request('tools/call',{name:'search_docs',arguments:{library:bundle.library,version:bundle.version,query:'Velvet otters'}});
    assert.ok(!search.error && !search.result?.isError,JSON.stringify(search));
    assert.ok(JSON.stringify(search).includes('amber'),JSON.stringify(search));
    for (const expected of ['partial', 'No product evidence', 'synthetic-r1']) {
      assert.ok(JSON.stringify(search).includes(expected),JSON.stringify(search));
    }
    const absent=await request('tools/call',{name:'search_docs',arguments:{library:'not-an-indexed-snapshot',query:'Velvet otters'}});
    assert.ok(!JSON.stringify(absent).includes('amber'),JSON.stringify(absent));
    for (const name of ['scrape_docs','remove_docs','refresh_docs']) assert.ok(!names.includes(name));
    const write=await request('tools/call',{name:'scrape_docs',arguments:{library:'forbidden',url:'https://example.com'}});
    assert.ok(write.error || write.result?.isError,JSON.stringify(write));
    if (names.includes('fetch_url')) {
      for (const url of ['https://example.com','file:///etc/passwd']) {
        const fetched=await request('tools/call',{name:'fetch_url',arguments:{url}});
        assert.ok(fetched.error || fetched.result?.isError,JSON.stringify(fetched));
      }
    }
  } finally {
    for (const wait of pending.values()) clearTimeout(wait.timer);
    child.stdin.end(); child.kill('SIGTERM');
  }
  console.log('Upstream index and search passed; no product capability evidence was generated.');
});
