import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=fs.readFileSync(new URL('../mission-control.mjs',import.meta.url),'utf8');
function extract(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);let i=source.indexOf('{',start),depth=1;const begin=i;while(depth){i++;if(source[i]==='{')depth++;if(source[i]==='}')depth--;}return source.slice(start,i+1);}
const route=vm.runInNewContext('('+extract('describeRouteRuntime')+')');
test('Ollama route matches Ollama resident rather than identical LM Studio name',()=>{
 const r=route({provider:'ollama-local',model:'qwen',runtime:'ollama',localModelProvider:true},[{identifier:'qwen',provider:'lmstudio',originKind:'local'},{identifier:'qwen',provider:'ollama',originKind:'local'}]);
 assert.equal(r.exactResident,true);assert.equal(r.ambiguous,false);
});
test('LM Studio resident cannot satisfy missing Ollama route',()=>assert.equal(route({provider:'ollama-local',model:'qwen',runtime:'ollama'},[{identifier:'qwen',provider:'lmstudio',originKind:'local'}]).exactResident,false));
test('cloud route is not mislabeled local',()=>assert.equal(route({provider:'cloud',model:'qwen',localModelProvider:false},[]).residencyApplicable,false));
const parse=vm.runInNewContext('('+extract('parseGpuCounterOutput')+')');
test('CIM samples total dedicated and shared allocations across adapters',()=>{const r=parse('Dedicated Usage|one|10\nShared Usage|one|2\nDedicated Usage|two|20\nShared Usage|two|3');assert.equal(r.dedicatedBytes,30);assert.equal(r.sharedBytes,5);});
test('missing GPU values stay unavailable',()=>assert.throws(()=>parse('')));
const ollamaBody=source.slice(source.indexOf('async function ollamaResidents()'),source.indexOf('const gpuCache ='));
test('Ollama inventory error is explicit, never a healthy empty inventory',async()=>{const context={fetch:async()=>{throw Error('offline')},AbortSignal,Date,gb:x=>x,gib:x=>x};vm.createContext(context);vm.runInContext(ollamaBody+';this.read=ollamaResidents',context);const r=await context.read();assert.equal(r.ok,false);assert.equal(r.error,'offline');});
test('Ollama inventory preserves context and quantization',async()=>{const context={fetch:async()=>({ok:true,json:async()=>({models:[{name:'qwen',size:30,size_vram:29,context_length:131072,details:{quantization_level:'Q6_K'}}]})}),AbortSignal,Date,gb:x=>x,gib:x=>x};vm.createContext(context);vm.runInContext(ollamaBody+';this.read=ollamaResidents',context);const r=await context.read();assert.equal(r.ok,true);assert.equal(r.models[0].context,131072);assert.equal(r.models[0].quant,'Q6_K');});
const client=source.slice(source.indexOf('var statusPending=false'),source.indexOf('// Activate the initial tab'));
function browser(fetch){const nodes={stamp:{},'status-health':{hidden:true}};const c={fetch,AbortSignal,Date,document:{getElementById:id=>nodes[id]},currentTab:'system',renderStrip(){},applyLoaderLabels(){},renderSystem(){},lastStatus:null};vm.createContext(c);vm.runInContext(client,c);return {c,nodes};}
test('HTTP failure shows stale alert and next successful refresh clears it',async()=>{let fail=true;const {c,nodes}=browser(async()=>fail?{ok:false,status:503}:{ok:true,json:async()=>({time:new Date().toISOString(),services:{}})});await c.refreshStatus();assert.equal(nodes['status-health'].hidden,false);assert.match(nodes['status-health'].textContent,/503/);fail=false;await c.refreshStatus();assert.equal(nodes['status-health'].hidden,true);});
test('old backend timestamp does not look fresh',async()=>{const {c,nodes}=browser(async()=>({ok:true,json:async()=>({time:'2020-01-01T00:00:00Z',services:{}})}));await c.refreshStatus();assert.match(nodes['status-health'].textContent,/stale status/);});
