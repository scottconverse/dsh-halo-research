import test from 'node:test';
import assert from 'node:assert/strict';
import { PAIR, mergeCatalog, loadArguments, synchronize, waitForSettings } from '../halo-startup.mjs';

const inventory = [
  ...PAIR.map(p => ({type:'llm',key:p.modelKey,display_name:p.identifier,max_context_length:32768,quantization:{name:'Q4_K_M'}})),
  {type:'llm',key:'remote/new-model',display_name:'Remote new model',max_context_length:65536},
  {type:'llm',key:'local/new-quant@q6_k',display_name:'New quant',max_context_length:8192},
  {type:'embedding',key:'embed'},
];
test('startup waits for plugin routes after HTML readiness',async()=>{
  let calls=0;const sleeps=[];
  const value=await waitForSettings(async()=>{if(++calls<3)throw Object.assign(Error('not ready'),{status:404}); return {namespaces:[]};},{sleep:async ms=>sleeps.push(ms)});
  assert.deepEqual(value,{namespaces:[]});assert.equal(calls,3);assert.equal(sleeps.length,2);
});
test('readiness is bounded and does not retry authorization errors',async()=>{
  let calls=0;
  await assert.rejects(waitForSettings(async()=>{calls++;throw Object.assign(Error('not ready'),{status:404});},{attempts:3,sleep:async()=>{}}),/not ready/);
  assert.equal(calls,3); calls=0;
  await assert.rejects(waitForSettings(async()=>{calls++;throw Object.assign(Error('auth'),{status:401});},{sleep:async()=>{}}),/auth/);
  assert.equal(calls,1);
});
function fixture() {
  const mutations=[], loads=[];
  let resident=[];
  const namespaces=[
    {ns:'llm-pi-ai',revision:7,user:{providers:{lmstudio:{models:[{id:'custom/kept',contextWindow:16000}]}}}},
    {ns:'agent-default-model',revision:9,value:{provider:'lmstudio',model:'custom/kept'}},
  ];
  return {mutations,loads, deps:{
    inventory:async()=>inventory,
    describe:async()=>({namespaces}),
    mutate:async body=>{mutations.push(body);},
    loaded:async()=>resident,
    load:async p=>{loads.push(p);resident.push({modelKey:p.modelKey,identifier:p.identifier,contextLength:32768,parallel:1,quantization:{name:'Q4_K_M'}});},
    log:()=>{},
  }};
}
test('catalog adds remote and newly downloaded LLMs, not embedding models',()=>{
  const result=mergeCatalog([],inventory);
  assert.ok(result.some(m=>m.id==='remote/new-model'));
  assert.ok(result.some(m=>m.id==='local/new-quant@q6_k'));
  assert.ok(!result.some(m=>m.id==='embed'));
});
test('catalog preserves all custom configuration and never mutates its inputs',()=>{
  const original=[{id:PAIR[0].modelKey,name:'My tuned brain',contextWindow:32768,compat:{foo:true}},{id:'offline/peer',contextWindow:4096}];
  const before=JSON.stringify(original);
  const result=mergeCatalog(original,inventory);
  assert.equal(JSON.stringify(original),before);
  assert.deepEqual(result[0],original[0]);
  assert.ok(result.some(m=>m.id==='offline/peer'));
  assert.equal(result.filter(m=>m.id===PAIR[0].modelKey).length,1);
});
test('new metadata does not mistake advertised maximum for loaded context',()=>{
  const result=mergeCatalog([],inventory);
  assert.ok(result.find(m=>m.id==='remote/new-model'),'discovered remote model must exist');
  assert.equal(result.find(m=>m.id==='remote/new-model').contextWindow,32768);
  assert.equal(result.find(m=>m.id==='local/new-quant@q6_k').contextWindow,8192);
});
test('malformed or empty discovery cannot erase a saved catalog',()=>{
  assert.throws(()=>mergeCatalog([],{}),/inventory/i);
  assert.throws(()=>mergeCatalog([],[]),/inventory/i);
});
test('load uses CLI-compatible alias and retains measured envelope, not picker restrictions',()=>{
  const args=loadArguments(PAIR[1]);
  assert.equal(args[1],PAIR[1].modelKey);
  assert.deepEqual(args.slice(args.indexOf('--parallel'),args.indexOf('--parallel')+2),['--parallel','1']);
  assert.ok(args.includes('32768'));
  assert.ok(args.includes('--no-speculative-draft-mtp'));
  assert.ok(!args.includes('--unload'));
});
test('refresh-only uses revision-checked path edits and never loads or changes selection',async()=>{
  const f=fixture(); await synchronize(f.deps,{});
  assert.equal(f.loads.length,0);
  assert.equal(f.mutations.length,1);
  assert.equal(f.mutations[0].expectedRevision,7);
  assert.equal(f.mutations[0].ns,'llm-pi-ai');
  assert.ok(f.mutations[0].ops.every(op=>op.path[0]==='providers'&&op.path[1]==='lmstudio'));
});
test('cold startup selects tuned brain and loads both models sequentially',async()=>{
  const f=fixture(); await synchronize(f.deps,{warm:true,selectBrain:true});
  assert.deepEqual(f.loads,PAIR);
  const selection=f.mutations.find(m=>m.ns==='agent-default-model');
  assert.equal(selection.expectedRevision,9);
  assert.ok(selection.ops.some(op=>op.path[0]==='model'&&op.value===PAIR[0].modelKey));
});
test('already loaded tuned pair is not loaded again',async()=>{
  const f=fixture(); await synchronize(f.deps,{warm:true}); f.loads.length=0;
  await synchronize(f.deps,{warm:true}); assert.equal(f.loads.length,0);
});
test('wrong resident configuration is reported without silently unloading it',async()=>{
  const f=fixture(); f.deps.loaded=async()=>[{modelKey:PAIR[0].modelKey,contextLength:32768,parallel:4,quantization:{name:'Q4_K_M'}}];
  await assert.rejects(synchronize(f.deps,{warm:true}),/parallel|envelope/i);
  assert.equal(f.loads.length,0);
});
test('API failure makes no settings writes or model requests',async()=>{
  const f=fixture(); f.deps.inventory=async()=>{throw Error('offline');};
  await assert.rejects(synchronize(f.deps,{warm:true}),/offline/);
  assert.equal(f.mutations.length,0);assert.equal(f.loads.length,0);
});
test('stale settings revision prevents model loading and default overwrite',async()=>{
  const f=fixture(); f.deps.mutate=async()=>{throw Error('revision conflict');};
  await assert.rejects(synchronize(f.deps,{warm:true,selectBrain:true}),/revision/);
  assert.equal(f.loads.length,0);
});
test('load failure stops the second load and propagates error',async()=>{
  const f=fixture();f.deps.load=async p=>{f.loads.push(p);throw Error('allocation failed');};
  await assert.rejects(synchronize(f.deps,{warm:true}),/allocation/);
  assert.equal(f.loads.length,1);
});
test('changed alias quant fails before loading any model',async()=>{
  const f=fixture(); f.deps.inventory=async()=>inventory.map(m=>({...m,quantization:{name:'Q6_K'}}));
  await assert.rejects(synchronize(f.deps,{warm:true}),/selected alias quant/);
  assert.equal(f.loads.length,0);
});
test('successful CLI exit without a resident model is not success',async()=>{
  const f=fixture(); f.deps.load=async p=>{f.loads.push(p);};
  await assert.rejects(synchronize(f.deps,{warm:true}),/not verified/);
  assert.equal(f.loads.length,1);
});
test('another model using the reserved identifier is not accepted as the tuned model',async()=>{
  const f=fixture();f.deps.loaded=async()=>[{modelKey:'other/model',identifier:PAIR[0].identifier,contextLength:32768,parallel:1,quantization:{name:'Q4_K_M'}}];
  await assert.rejects(synchronize(f.deps,{warm:true}),/not verified/);
  assert.equal(f.loads.length,0);
});
