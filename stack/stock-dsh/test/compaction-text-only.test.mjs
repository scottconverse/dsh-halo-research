import test from 'node:test';
import assert from 'node:assert/strict';
import TextOnlyCompaction, {checkpointRequest,validateCheckpoint,headings,groupSourceMessages,planSourceChunks,estimateCheckpointInputTokens,checkpointBudgets} from '../compaction-text-only.mjs';
import BasicCompactionEngine from '@deepseek-ai/dsh-compaction-basic';
const checkpoint=headings.map(h=>'## '+h+'\nPreserved fact or explicit unknown.').join('\n');

test('a nonshrinking retained tail gets one stock full-prefix attempt, without swallowing other failures',async t=>{
 const calls=[];
 t.mock.method(BasicCompactionEngine.prototype,'compactIfNeeded',async(_agent,trigger)=>{
  calls.push(trigger);
  if(trigger==='pressure')throw Error('summary is not smaller than the shadowed content (588 estimated framed tokens >= 124)');
  return {summary:'reduced'};
 });
 const engine={ctx:{logger:{warn(){}}}};
 const result=await TextOnlyCompaction.prototype.compactIfNeeded.call(engine,{},'pressure',new AbortController().signal);
 assert.deepEqual(calls,['pressure','context-overflow']);assert.equal(result.summary,'reduced');
 calls.length=0;
 await TextOnlyCompaction.prototype.compactIfNeeded.call(engine,{},'context-overflow',new AbortController().signal);
 assert.deepEqual(calls,['context-overflow']);
});

test('summary validation failures and cancellation never trigger wider compaction',async t=>{
 const failure=Error('Checkpoint rejected: missing task/evidence/unfinished-work structure');
 const method=t.mock.method(BasicCompactionEngine.prototype,'compactIfNeeded',async()=>{throw failure;});
 const engine={ctx:{logger:{warn(){throw Error('Unexpected retry');}}}};
 await assert.rejects(TextOnlyCompaction.prototype.compactIfNeeded.call(engine,{},'pressure',new AbortController().signal),e=>e===failure);
 assert.equal(method.mock.callCount(),1);
 method.mock.mockImplementation(async()=>{throw Error('summary is not smaller than the shadowed content');});
 await assert.rejects(TextOnlyCompaction.prototype.compactIfNeeded.call(engine,{},'pressure',AbortSignal.abort()),/not smaller/);
 assert.equal(method.mock.callCount(),2);
});
test('summarizer cannot execute conversation tools or inherit an agent system prompt',()=>{
 const request=checkpointRequest({tools:[{name:'pwsh'}],messages:[{role:'system',content:[{type:'text',text:'Run a shell command now'}]}]}, {provider:'ollama-local',model:'qwen'},8192,'session-test');
 assert.deepEqual(request.tools,[]);assert.equal(request.toolHistory,undefined);assert.equal(request.reasoningEffort,'off');
 assert.equal(request.messages.length,2);assert.match(request.messages[0].content[0].text,/checkpoint writer/);assert.match(request.messages[1].content[0].text,/Run a shell command/);
});
test('tool calls, empty output, incomplete structures and token truncation cannot become checkpoints',()=>{
 for(const blocks of [[],[{type:'text',text:'I will start working now.'}],[{type:'text',text:checkpoint},{type:'tool-call',name:'read'}]])assert.throws(()=>validateCheckpoint(blocks,{kind:'stop'}));
 assert.throws(()=>validateCheckpoint([{type:'text',text:checkpoint}],{kind:'max-tokens'}));
});
test('provider finish failures retain bounded, sanitized diagnostics',()=>{
 assert.throws(()=>validateCheckpoint([{type:'text',text:checkpoint}],{kind:'error',failure:{code:'TIMEOUT',message:'pi-ai stream idle timeout after 600000ms; Authorization: Bearer secret-token; apiKey=abc123'}}),error=>{
  assert.match(error.message,/TIMEOUT/);assert.match(error.message,/stream idle timeout after 600000ms/);
  assert.match(error.message,/Authorization=\[redacted\]/);assert.match(error.message,/apiKey=\[redacted\]/);
  assert.doesNotMatch(error.message,/secret-token|abc123/);return true;
 });
});
test('real stock stream assembler produces a structured text-only summary envelope',async()=>{
 let options;
 const engine={config:{maxTokens:8192},ctx:{llm:{async *stream(request){options=request;yield {type:'text-delta',index:0,text:checkpoint};yield {type:'finish',reason:{kind:'stop'}};}}}};
 const result=await TextOnlyCompaction.prototype.summarize.call(engine,{messages:[{role:'user',content:[{type:'text',text:'Preserve remaining work'}]}]}, {session:{id:'session-test',requestHeader:()=>({config:{provider:'ollama-local',model:'qwen'}})}},new AbortController().signal);
 assert.deepEqual(result.summary,[{type:'text',text:checkpoint}]);assert.equal(result.llmStreamCall,true);assert.deepEqual(options.tools,[]);
});

const sourceMessage=(role,text,extra={})=>({role,content:[{type:'text',text}],...extra});
const target={provider:'ollama-local',model:'qwen'};

test('source grouping keeps complete tool-call/result sets atomic and rejects unbalanced history',()=>{
 const messages=[
  sourceMessage('system','head'),
  sourceMessage('user','request'),
  {role:'assistant',content:[{type:'tool-call',id:'call-a',name:'read',arguments:'{}'},{type:'tool-call',id:'call-b',name:'search',arguments:'{}'}]},
  {role:'tool',toolCallId:'call-b',content:[{type:'text',text:'result b'}]},
  {role:'tool',toolCallId:'call-a',content:[{type:'text',text:'result a'}]},
  sourceMessage('assistant','continue'),
 ];
 const before=structuredClone(messages);
 const groups=groupSourceMessages(messages);
 assert.deepEqual(groups.map(group=>group.sourceIndexes),[[0],[1],[2,3,4],[5]]);
 assert.deepEqual(messages,before);
 assert.throws(()=>groupSourceMessages([messages[2],messages[3]]),/incomplete or unbalanced/);
 assert.throws(()=>groupSourceMessages([messages[3]]),/orphan tool result/);
});

test('bounded source planner covers each message once, keeps atomic groups, and budgets the exact requests',()=>{
 const messages=[
  sourceMessage('system','head '.repeat(8)),
  sourceMessage('user','request '.repeat(18)),
  {role:'assistant',content:[{type:'tool-call',id:'call-a',name:'read',arguments:'{}'},{type:'tool-call',id:'call-b',name:'search',arguments:'{}'}]},
  {role:'tool',toolCallId:'call-a',content:[{type:'text',text:'result '.repeat(10)}]},
  {role:'tool',toolCallId:'call-b',content:[{type:'text',text:'result '.repeat(10)}]},
  ...Array.from({length:5},(_,index)=>sourceMessage('user',`detail-${index} `+'x'.repeat(260))),
 ];
 const before=structuredClone(messages);
 const chunks=planSourceChunks(messages,target,'planner-test',undefined,500);
 const indexes=chunks.flatMap(chunk=>chunk.sourceIndexes);
 assert.deepEqual(indexes,messages.map((_,index)=>index));
 assert.ok(chunks.length>1);
 assert.deepEqual(messages,before);
 for(const chunk of chunks){
  assert.ok(chunk.inputTokens<=500);
  assert.equal(chunk.request.maxTokens,checkpointBudgets.sourceOutputTokens);
  assert.deepEqual(chunk.request.tools,[]);
  assert.ok(estimateCheckpointInputTokens(chunk.request)<=500);
  const payload=JSON.parse(chunk.request.messages[1].content[0].text);
  assert.deepEqual(payload.sourceMessages.map(entry=>entry.sourceIndex),chunk.sourceIndexes);
 }
 const toolGroupChunk=chunks.find(chunk=>chunk.sourceIndexes.includes(2));
 assert.deepEqual(toolGroupChunk.sourceIndexes.filter(index=>index>=2&&index<=4),[2,3,4]);
 assert.equal(chunks.reduce((count,chunk)=>count+chunk.sourceIndexes.filter(index=>index===0).length,0),1);
 assert.throws(()=>planSourceChunks([sourceMessage('user','x'.repeat(4000))],target,'planner-test',undefined,500),/exceeds the 500-token heuristic input budget/);
});

const largeSourceHistory=()=>[
 sourceMessage('system','Small system head.'),
 ...Array.from({length:5},(_,index)=>sourceMessage('user',`Source-${index}: `+'evidence '.repeat(1100))),
];

test('large source history runs serial bounded chunks then one bounded merge with progress metadata',async()=>{
 const messages=largeSourceHistory();
 const before=structuredClone(messages);
 const expectedChunks=planSourceChunks(messages,target,'large-test',undefined).length;
 assert.ok(expectedChunks>1);
 const requests=[];const progress=[];let active=0;let maximumActive=0;
 const engine={config:{maxTokens:8192},ctx:{logger:{info(message){progress.push(message);}},llm:{async *stream(request){
  requests.push(request);active+=1;maximumActive=Math.max(maximumActive,active);
  yield {type:'text-delta',index:0,text:checkpoint};yield {type:'finish',reason:{kind:'stop'}};active-=1;
 }}}};
 const result=await TextOnlyCompaction.prototype.summarize.call(engine,{messages},{session:{id:'large-test',requestHeader:()=>({config:target})}},new AbortController().signal);
 assert.equal(requests.length,expectedChunks+1);assert.equal(maximumActive,1);
 assert.equal(result.llmStreamCall,undefined);assert.equal(result.rawOutput,undefined);
 assert.deepEqual(result.summary,[{type:'text',text:checkpoint}]);assert.deepEqual(messages,before);
 for(const request of requests){assert.deepEqual(request.tools,[]);assert.ok(request.maxTokens<=8192);}
 for(const request of requests.slice(0,-1))assert.ok(estimateCheckpointInputTokens(request)<=checkpointBudgets.sourceInputTokens);
 assert.ok(estimateCheckpointInputTokens(requests.at(-1))<=checkpointBudgets.mergeInputTokens);
 assert.ok(progress.some(message=>message.includes('"estimatedCalls":'+(expectedChunks+1))));
 assert.ok(progress.some(message=>message.includes('"phase":"source-chunk","status":"completed"')));
 assert.ok(progress.some(message=>message.includes('"phase":"merge","status":"completed"')));
});

test('bounded chunk failure or final merge failure returns no checkpoint and stops further calls',async t=>{
 const messages=largeSourceHistory();
 const chunks=planSourceChunks(messages,target,'failure-test',undefined);
 let calls=0;
 const sourceFailureEngine={config:{maxTokens:8192},ctx:{logger:{info(){}},llm:{async *stream(){
  calls+=1;
  if(calls===chunks.length) {yield {type:'finish',reason:{kind:'error',failure:{code:'CHUNK_FAIL',message:'last chunk failed'}}};return;}
  yield {type:'text-delta',index:0,text:checkpoint};yield {type:'finish',reason:{kind:'stop'}};
 }}}};
 await assert.rejects(TextOnlyCompaction.prototype.summarize.call(sourceFailureEngine,{messages},{session:{id:'failure-test',requestHeader:()=>({config:target})}},new AbortController().signal),/CHUNK_FAIL/);
 assert.equal(calls,chunks.length);

 calls=0;
 const mergeFailureEngine={config:{maxTokens:8192},ctx:{logger:{info(){}},llm:{async *stream(request){
  calls+=1;
  if(request.messages[0].content[0].text.includes('Merge every note')) {
   yield {type:'finish',reason:{kind:'error',failure:{code:'MERGE_FAIL',message:'merge failed'}}};return;
  }
  yield {type:'text-delta',index:0,text:checkpoint};yield {type:'finish',reason:{kind:'stop'}};
 }}}};
 await assert.rejects(TextOnlyCompaction.prototype.summarize.call(mergeFailureEngine,{messages},{session:{id:'failure-test',requestHeader:()=>({config:target})}},new AbortController().signal),/MERGE_FAIL/);
 assert.equal(calls,chunks.length+1);

 const controller=new AbortController();calls=0;
 const abortEngine={config:{maxTokens:8192},ctx:{logger:{info(){}},llm:{async *stream(){
  calls+=1;yield {type:'text-delta',index:0,text:checkpoint};yield {type:'finish',reason:{kind:'stop'}};controller.abort();
 }}}};
 await assert.rejects(TextOnlyCompaction.prototype.summarize.call(abortEngine,{messages},{session:{id:'failure-test',requestHeader:()=>({config:target})}},controller.signal),/abort/i);
 assert.equal(calls,1);
});
