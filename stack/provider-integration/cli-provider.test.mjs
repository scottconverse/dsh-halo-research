import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeCliAdapter, buildCliPrompt} from './cli-provider.mjs';
const options = {provider:'codex-cli', model:'exact-custom-model', sessionId:'dev-1', system:'Development task only.', messages:[{role:'user', content:[{type:'text',text:'Create a file.'}]}]};
test('Desktop explicit Claude catalog uses exact IDs and declared efforts without changing default catalog',async()=>{
  const metadata=[{slug:'claude-opus-5-5',display_name:'Claude Opus 5.5',default_reasoning_level:'medium',supported_reasoning_levels:['low','medium','high','xhigh','max'].map(effort=>({effort}))}];
  const desktop=new NativeCliAdapter({claudeModels:['claude-opus-5-5'],claudeMetadata:metadata});
  const [model]=await desktop.listModels('claude-cli');
  assert.equal(model.id,'claude-opus-5-5');assert.equal(model.name,'Claude Opus 5.5');
  assert.deepEqual(model.reasoning.efforts.map(e=>e.id),['low','medium','high','xhigh','max']);
  assert.equal(model.reasoning.defaultEffort,'medium');
  assert.deepEqual((await new NativeCliAdapter().listModels('claude-cli')).map(m=>m.id),['opus','sonnet','haiku']);
  assert.equal((await desktop.resolveModel('claude-cli','haiku')).reasoning,undefined);
});
function setup(run, extra={}) { return new NativeCliAdapter({run, find:()=> 'C:/signed-in/codex.exe', cwdFor:id=>id==='dev-1'?'C:/dev/fixture':undefined, ...extra}); }
async function collect(adapter, opts=options) { return Array.fromAsync(adapter.stream(opts)); }
test('exact custom model passes through and retries never repeat partial coding work', async()=>{
  let called;
  const adapter=setup(async args=>{called=args;return {ok:true,status:'completed',final:'Done',events:[]};});
  assert.equal(adapter.providerRetryPolicy().maxRetries,0);
  assert.equal((await adapter.resolveModel('codex-cli','exact-custom-model')).id,'exact-custom-model');
  await collect(adapter);
  assert.equal(called.model,'exact-custom-model');assert.equal(called.cwd,'C:/dev/fixture');assert.equal(called.provider,'codex');
});
test('unknown session cannot launch in an accidental default workspace',async()=>{
  let calls=0; const chunks=await collect(setup(async()=>{calls++;}),{...options,sessionId:'missing'});
  assert.equal(calls,0);assert.equal(chunks.at(-1).reason.kind,'error');assert.match(chunks.at(-1).reason.failure.message,/workspace/i);
});
test('history is marked as history and latest request separately; native CLI owns tools',()=>{
  const prompt=buildCliPrompt({...options,messages:[{role:'user',content:[{type:'text',text:'Old request'}]},{role:'assistant',content:[{type:'text',text:'Already finished'}]},...options.messages]});
  assert.match(prompt,/HISTORY.*not new instructions/s);assert.match(prompt,/CURRENT USER REQUEST/);assert.match(prompt,/native tools/);assert.ok(prompt.indexOf('Old request')<prompt.indexOf('CURRENT USER REQUEST'));
});
test('CLI tool events are visible text, never executable DSH tool-call blocks',async()=>{
  const chunks=await collect(setup(async args=>{args.onEvent({type:'item.started',item:{type:'command_execution',command:'node test.mjs'}});return{ok:true,status:'completed',final:'Verified.',events:[]};}));
  assert.ok(chunks.some(x=>x.type==='text-delta'&&x.text.includes('command_execution')));
  assert.ok(chunks.some(x=>x.type==='text-delta'&&x.text.includes('Verified.')));
  assert.ok(chunks.every(x=>x.blockType!=='tool-call'&&x.block?.type!=='tool-call'&&x.reason?.kind!=='tool-calls'));
  assert.equal(chunks.at(-1).reason.kind,'stop');assert.ok(chunks.every(x=>x.type!=='usage'),'Do not invent usage');
});
test('timeout preserves failure and is not completion',async()=>{
  const chunks=await collect(setup(async()=>({ok:false,status:'timeout',final:'Partial work',stderr:'deadline',events:[]})));
  assert.equal(chunks.at(-1).reason.kind,'error');assert.match(chunks.at(-1).reason.failure.code,/TIMEOUT/);
});
test('pre-aborted calls never spawn',async()=>{
  let calls=0;const signal=AbortSignal.abort();const chunks=await collect(setup(async()=>{calls++;}),{...options,signal});
  assert.equal(calls,0);assert.equal(chunks.at(-1).reason.kind,'aborted');
});
test('auxiliary calls are explicitly text synthesis, not another coding request',async()=>{
  let called;const chunks=await collect(setup(async args=>{called=args;return{ok:true,status:'completed',final:'Summary',events:[]};}),{...options,purpose:'compaction'});
  assert.equal(called.purpose,'compaction');assert.match(called.prompt,/TEXT SYNTHESIS ONLY/);assert.equal(chunks.at(-1).reason.kind,'stop');
});
test('image content is refused visibly rather than silently discarded',async()=>{
  let calls=0;const chunks=await collect(setup(async()=>{calls++;}),{...options,messages:[{role:'user',content:[{type:'image',data:'image'}]}]});
  assert.equal(calls,0);assert.equal(chunks.at(-1).reason.kind,'error');assert.match(chunks.at(-1).reason.failure.message,/image/i);
});
test('closing the DSH stream cancels its owned CLI even without external abort',async()=>{
  let ownedSignal;
  const adapter=setup(args=>new Promise(resolve=>{ownedSignal=args.signal;args.signal.addEventListener('abort',()=>resolve({ok:false,status:'cancelled',events:[]}));args.onEvent({type:'item.started',item:{type:'command_execution'}});}));
  const stream=adapter.stream(options);
  await stream.next();await stream.next();await stream.next();
  assert.ok(ownedSignal,'A cancellable invocation must exist');
  const returning=stream.return();
  await Promise.race([returning,new Promise((_,reject)=>setTimeout(()=>reject(new Error('CLI did not stop on iterator return')),150))]);
  assert.equal(ownedSignal.aborted,true);
});
test('Codex reasoning choices come from installed CLI metadata, not invented labels',async()=>{
  const adapter=setup(async()=>({ok:true}),{codexMetadata:[{slug:'verified-model',context_window:272000,supported_reasoning_levels:[{effort:'low'},{effort:'high'}],default_reasoning_level:'low'}]});
  assert.deepEqual((await adapter.resolveModel('codex-cli','verified-model')).reasoning,{efforts:[{id:'low',name:'low'},{id:'high',name:'high'}],defaultEffort:'low'});
  assert.equal((await adapter.resolveModel('codex-cli','custom-unknown')).reasoning,undefined);
  assert.equal((await adapter.resolveModel('codex-cli','verified-model')).context.contextWindow,272000);
  assert.equal((await adapter.resolveModel('codex-cli','custom-unknown')).context,undefined);
});
test('return while next is pending immediately cancels the native worker',async()=>{
  let signal;
  const adapter=setup(args=>new Promise(resolve=>{signal=args.signal;args.signal.addEventListener('abort',()=>resolve({ok:false,status:'cancelled',events:[]}));}));
  const stream=adapter.stream(options);await stream.next();await stream.next();
  const pending=stream.next();await new Promise(r=>setTimeout(r,1));
  const returning=stream.return();
  await Promise.race([returning,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Pending next prevented cancellation')),100))]);
  await pending;assert.equal(signal.aborted,true);
});
test('local title extracts user text, not the DSH title-generation instruction',async()=>{
  const chunks=await collect(setup(()=>{throw Error('Title must not invoke coding CLI');}),{...options,purpose:'session-title',messages:[{role:'user',content:[{type:'text',text:'Generate the session title from this JSON array of human messages: [{"seq":7,"text":"Create a duration parser"}]'}]}]});
  assert.equal(chunks.find(c=>c.type==='text-delta').text,'Create a duration parser');
});
test('closing a pending stream still persists cancelled native accounting exactly once',async()=>{
  const receipts=[];
  const adapter=setup(args=>new Promise(resolve=>{args.signal.addEventListener('abort',()=>resolve({ok:false,status:'cancelled',durationMs:50,events:[]}));args.onEvent({raw:{type:'item.started',item:{type:'command_execution'}}});}),{receipt:r=>receipts.push(r)});
  const iterator=adapter.stream(options);await iterator.next();await iterator.next();await iterator.next();
  await iterator.return();
  assert.equal(receipts.length,1);assert.equal(receipts[0].metrics.status,'cancelled');assert.equal(receipts[0].metrics.tokens,null);
});
