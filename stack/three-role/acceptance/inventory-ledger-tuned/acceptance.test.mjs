import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {emptyState,applyBatch,report} from './ledger.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const event=(id,sku,kind,quantity)=>({id,sku,kind,quantity});
const seed=()=>({version:1,events:[event('r1','WIDGET','receive',10)]});
test('valid receive and exact depletion, immutable input and detached output',()=>{
  const state=seed(),batch=[event('s1','WIDGET','ship',10)],before=JSON.stringify([state,batch]);
  const next=applyBatch(state,batch);
  assert.equal(JSON.stringify([state,batch]),before);
  assert.deepEqual(report(next),{balances:[{sku:'WIDGET',quantity:0}],eventCount:2});
  next.events[0].quantity=99; next.events[1].quantity=1;
  assert.equal(state.events[0].quantity,10); assert.equal(batch[0].quantity,10);
});
test('failed batch rolls back its valid prefix',()=>{
  const state=seed(),before=JSON.stringify(state);
  assert.throws(()=>applyBatch(state,[event('r2','WIDGET','receive',2),event('s2','WIDGET','ship',13)]));
  assert.equal(JSON.stringify(state),before);
});
test('same-ID replay ignores key order; conflicts are transactional',()=>{
  const state=seed(); const reordered={quantity:10,kind:'receive',sku:'WIDGET',id:'r1'};
  assert.deepEqual(report(applyBatch(state,[reordered,reordered])),report(state));
  const before=JSON.stringify(state);
  assert.throws(()=>applyBatch(state,[event('r2','OTHER','receive',1),event('r1','WIDGET','receive',11)]));
  assert.equal(JSON.stringify(state),before);
});
test('strict event shape and scalar validation',()=>{
  const invalid=[null,[],{},event('','WIDGET','receive',1),event('a b','WIDGET','receive',1),event('x'.repeat(65),'WIDGET','receive',1),event('x','lower','receive',1),event('x','A'.repeat(33),'receive',1),event('x','A','other',1),event('x','A','receive',0),event('x','A','receive',1.5),event('x','A','receive','1'),{...event('x','A','receive',1),extra:true}];
  for(const e of invalid) assert.throws(()=>applyBatch(emptyState(),[e]),JSON.stringify(e));
  for(const batch of [null,{},'x']) assert.throws(()=>applyBatch(emptyState(),batch));
});
test('safe integer accumulation and overdraft checks',()=>{
  const state={version:1,events:[event('big','A','receive',Number.MAX_SAFE_INTEGER)]};
  assert.throws(()=>applyBatch(state,[event('extra','A','receive',1)]));
  assert.throws(()=>applyBatch(emptyState(),[event('ship','A','ship',1)]));
});
test('stored history is validated before apply or report',()=>{
  const bad=[null,{version:2,events:[]},{version:1,events:'bad'},{version:1,events:[event('x','A','ship',1)]},{version:1,events:[event('x','A','receive',1),event('x','A','receive',1)]},{version:1,events:[event('x','A','receive',1),event('x','A','receive',2)]},{version:1,events:[{...event('x','A','receive',1),extra:1}]}];
  for(const state of bad){assert.throws(()=>report(state));assert.throws(()=>applyBatch(state,[]));}
});
test('report is deterministic, sorted, retains zero and is read-only',()=>{
  const state={version:1,events:[event('z','Z','receive',1),event('a','A','receive',2),event('a2','A','ship',2),event('u','_','receive',3)]};
  const before=JSON.stringify(state);
  assert.deepEqual(report(state),{balances:[{sku:'A',quantity:0},{sku:'Z',quantity:1},{sku:'_',quantity:3}],eventCount:4});
  assert.equal(JSON.stringify(state),before); assert.equal(JSON.stringify(report(state)),JSON.stringify(report(state)));
});
function fixture(fn){const dir=mkdtempSync(join(tmpdir(),'triad ledger '));try{fn(dir)}finally{rmSync(dir,{recursive:true,force:true})}}
const cli=(...args)=>spawnSync(process.execPath,[join(here,'cli.mjs'),...args],{encoding:'utf8',timeout:10000});
function fail(result){assert.notEqual(result.status,0);assert.equal(result.stdout,'');assert.equal(typeof JSON.parse(result.stderr).error,'string');}
test('CLI persists and replays across processes with spaces in paths',()=>fixture(dir=>{
  const state=join(dir,'state file.json'),batch=join(dir,'batch file.json');
  writeFileSync(batch,JSON.stringify([event('r1','B','receive',4),event('s1','B','ship',1)]));
  let r=cli('apply',state,batch);assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{balances:[{sku:'B',quantity:3}],eventCount:2});
  const saved=readFileSync(state,'utf8');r=cli('apply',state,batch);assert.equal(r.status,0,r.stderr);assert.equal(readFileSync(state,'utf8'),saved);
  r=cli('report',state);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).eventCount,2);assert.equal(readFileSync(state,'utf8'),saved);
  assert.deepEqual(readdirSync(dir).sort(),['batch file.json','state file.json']);
}));
test('CLI invalid apply and corrupt ledger preserve bytes and leave no temp',()=>fixture(dir=>{
  const state=join(dir,'state.json'),batch=join(dir,'batch.json');writeFileSync(state,JSON.stringify(seed()));const saved=readFileSync(state,'utf8');
  writeFileSync(batch,JSON.stringify([event('r2','WIDGET','receive',2),event('s2','WIDGET','ship',99)]));fail(cli('apply',state,batch));assert.equal(readFileSync(state,'utf8'),saved);
  writeFileSync(state,'{broken');writeFileSync(batch,'[]');fail(cli('apply',state,batch));assert.equal(readFileSync(state,'utf8'),'{broken');fail(cli('report',state));
  assert.deepEqual(readdirSync(dir).sort(),['batch.json','state.json']);
}));
test('CLI usage and malformed input errors are structured and side-effect-free',()=>fixture(dir=>{
  const state=join(dir,'state.json'),batch=join(dir,'batch.json');writeFileSync(state,JSON.stringify(seed()));const saved=readFileSync(state,'utf8');writeFileSync(batch,'{bad');
  for(const args of [[],['nonsense',state],['report',state,'extra'],['apply',state],['apply',state,batch],['apply',state,batch,'extra']]) fail(cli(...args));
  assert.equal(readFileSync(state,'utf8'),saved);
}));
test('missing state report is empty and does not create the file',()=>fixture(dir=>{
  const r=cli('report',join(dir,'missing.json'));assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{balances:[],eventCount:0});assert.deepEqual(readdirSync(dir),[]);
}));
