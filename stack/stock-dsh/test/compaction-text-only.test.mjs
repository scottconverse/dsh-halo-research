import test from 'node:test';
import assert from 'node:assert/strict';
import TextOnlyCompaction, {checkpointRequest,validateCheckpoint,headings} from '../compaction-text-only.mjs';
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
