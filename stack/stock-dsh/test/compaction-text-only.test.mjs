import test from 'node:test';
import assert from 'node:assert/strict';
import TextOnlyCompaction, {checkpointRequest,validateCheckpoint,headings} from '../compaction-text-only.mjs';
import BasicCompactionEngine from '@deepseek-ai/dsh-compaction-basic';
const checkpoint=headings.map(h=>'## '+h+'\nPreserved fact or explicit unknown.').join('\n');

function pressureEngine({ oversized = true, remaining = 25, pendingTool = false } = {}) {
 const events = [{seq:0,type:'system/message'}, {seq:1,type:'user/message'},
  {seq:2,type:'assistant/message',data:{message:{content: pendingTool ? [{type:'tool-call',id:'pending'}] : [{type:'text',text:'large response'}]}}}];
 const engine=Object.create(TextOnlyCompaction.prototype);
 let reduced=false;const calls=[];
 engine.config={thresholdRatio:.01,headroomTokens:0,modelPolicies:[]};
 engine.ctx={logger:{warn(){}},llm:{async resolveModelInfo(){return {context:{contextWindow:10000}};}},
  tokenMeter:{measure(){return {totalTokens:reduced?remaining:150,nodes:[{seq:0,tokens:10},{seq:1,tokens:20},{seq:2,tokens:oversized?120:30}]};}}};
 const agent={session:{surface:{nodes:[0,1,2],replaceGeneration:0},eventAt:seq=>events[seq],requestHeader:()=>({config:{provider:'ollama',model:'deepseek-v4.1-flash:1017-cloud',maxTokens:1000}})}};
 engine.compactRegion=async(start,end)=>{calls.push([start,end]);reduced=true;return {summary:'reduced'};};
 return {engine,agent,calls};
}

test('oversized recent response is included once, with system head preserved',async t=>{
 const stock=t.mock.method(BasicCompactionEngine.prototype,'compactIfNeeded',async()=>{throw Error('Stock must not keep this oversized tail');});
 const {engine,agent,calls}=pressureEngine();
 assert.equal((await engine.compactIfNeeded(agent,'pressure',new AbortController().signal)).summary,'reduced');
 assert.deepEqual(calls,[[1,2]]);assert.equal(stock.mock.callCount(),0);
});

test('ordinary pressure and overflow retain stock behavior; only shrink failure widens once',async t=>{
 const stock=t.mock.method(BasicCompactionEngine.prototype,'compactIfNeeded',async()=>({summary:'stock'}));
 const {engine,agent,calls}=pressureEngine({oversized:false});
 assert.equal((await engine.compactIfNeeded(agent,'pressure',new AbortController().signal)).summary,'stock');
 await engine.compactIfNeeded(agent,'context-overflow',new AbortController().signal);
 assert.equal(stock.mock.callCount(),2);assert.deepEqual(calls,[]);
 stock.mock.mockImplementation(async()=>{throw Error('summary is not smaller than the shadowed content');});
 await engine.compactIfNeeded(agent,'pressure',new AbortController().signal);
 assert.deepEqual(calls,[[1,2]]);
});

test('recovery cannot claim success while still above threshold',async()=>{
 const {engine,agent,calls}=pressureEngine({remaining:100});
 await assert.rejects(engine.compactIfNeeded(agent,'pressure',new AbortController().signal),/still above threshold/);
 assert.deepEqual(calls,[[1,2]]);
});

test('unanswered tools, cancellation and unrelated failures are never bypassed',async t=>{
 const {engine,agent,calls}=pressureEngine({pendingTool:true});
 await assert.rejects(engine.compactIfNeeded(agent,'pressure',new AbortController().signal),/tool-balanced/);
 assert.deepEqual(calls,[]);
 await assert.rejects(engine.compactIfNeeded(agent,'pressure',AbortSignal.abort()),e=>e.name==='AbortError');
 const plain=pressureEngine({oversized:false});const failure=Error('Checkpoint rejected: missing task/evidence/unfinished-work structure');
 t.mock.method(BasicCompactionEngine.prototype,'compactIfNeeded',async()=>{throw failure;});
 await assert.rejects(plain.engine.compactIfNeeded(plain.agent,'pressure',new AbortController().signal),e=>e===failure);
 assert.deepEqual(plain.calls,[]);
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
