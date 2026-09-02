import test from 'node:test';
import assert from 'node:assert/strict';
import {mapCliMetrics, metricsForSession,metricsHandler} from './cli-metrics.mjs';
const record=(provider,raw,extras={})=>({provider,model:'fixture',sessionId:'s',purpose:'coding',started:'2026-09-02T12:00:00Z',finished:'2026-09-02T12:00:10Z',result:{ok:true,status:'completed',events:[{raw}],...extras}});

test('Codex input includes cache; reasoning is a subset of output, not extra tokens',()=>{
  const m=mapCliMetrics(record('codex-cli',{type:'turn.completed',usage:{input_tokens:111829,cached_input_tokens:80128,output_tokens:1008,reasoning_output_tokens:49}}));
  assert.deepEqual(m.tokens,{input:111829,uncachedInput:31701,cacheRead:80128,cacheWrite:null,output:1008,reasoning:49});
  assert.equal(m.wallMs,10000); assert.equal(m.firstModelMessageMs,null);
  assert.equal(m.ttftMs,null); assert.equal(m.decodeTokensPerSecond,null);
});
test('resumed Codex counters subtract the persisted cumulative baseline; resets are unknown',()=>{
 const r=record('codex-cli',{type:'turn.completed',usage:{input_tokens:55658,cached_input_tokens:27392,output_tokens:39,reasoning_output_tokens:15}});
 r.continuity={resumed:true,priorUsage:{input_tokens:27908,cached_input_tokens:0,output_tokens:29,reasoning_output_tokens:15}};
 assert.equal(mapCliMetrics(r).tokens.input,27750);assert.equal(mapCliMetrics(r).tokens.output,10);
 r.continuity.priorUsage.input_tokens=60000;assert.equal(mapCliMetrics(r).tokens,null);
});
test('Claude sums only terminal input categories, never helper modelUsage or assistant usage',()=>{
  const m=mapCliMetrics(record('claude-cli',{type:'result',subtype:'success',usage:{input_tokens:10,cache_creation_input_tokens:21299,cache_read_input_tokens:222872,output_tokens:2699},modelUsage:{helper:{inputTokens:999999}}}));
  assert.equal(m.tokens.input,244181);assert.equal(m.tokens.uncachedInput,10);assert.equal(m.tokens.output,2699);
});
test('missing terminal usage and failed runs are unknown, not zero',()=>{
  const m=mapCliMetrics(record('codex-cli',{type:'turn.failed'},{ok:false,status:'timeout'}));
  assert.equal(m.tokens,null);assert.equal(m.usageCoverage,'unreported');assert.equal(m.status,'timeout');
});
test('reported zero is preserved, missing optional counters remain unknown',()=>{
  const m=mapCliMetrics(record('codex-cli',{type:'turn.completed',usage:{input_tokens:0,output_tokens:0}}));
  assert.equal(m.tokens.input,0);assert.equal(m.tokens.cacheRead,null);assert.equal(m.tokens.uncachedInput,null);
});
test('invalid and impossible counters do not become believable totals',()=>{
  for(const usage of [{input_tokens:-1,output_tokens:5},{input_tokens:10,output_tokens:NaN},{input_tokens:10,cached_input_tokens:11,output_tokens:2},{input_tokens:10,output_tokens:2,reasoning_output_tokens:3}]){
    assert.equal(mapCliMetrics(record('codex-cli',{type:'turn.completed',usage})).tokens,null);
  }
});
test('duplicate terminals are not summed and failed processes mark available usage partial',()=>{
  const r=record('codex-cli',{type:'turn.completed',usage:{input_tokens:20,output_tokens:3}},{ok:false,status:'failed'});
  r.result.events.push(r.result.events[0]);const m=mapCliMetrics(r);
  assert.equal(m.tokens.input,20);assert.equal(m.usageCoverage,'reported-before-failure');
});
test('monotonic runtime is preferred; banner and activity do not count as first model message',()=>{
  const r=record('codex-cli',{type:'turn.completed',usage:{input_tokens:10,output_tokens:2}},{durationMs:1500});
  r.result.events.unshift({elapsedMs:2,raw:{type:'item.started',item:{type:'command_execution'}}},{elapsedMs:1200,raw:{type:'item.completed',item:{type:'agent_message',text:'Answer'}}});
  const m=mapCliMetrics(r);assert.equal(m.wallMs,1500);assert.equal(m.firstModelMessageMs,1200);assert.equal(m.ttftMs,null);
});
test('session index excludes auxiliaries and exposes only structured counters, not raw prompts/results',()=>{
  const r=record('claude-cli',{type:'result',usage:{input_tokens:1,cache_creation_input_tokens:0,cache_read_input_tokens:0,output_tokens:2}});
  r.result.final='SECRET fixture';const rows=new Map([['a',r],['b',{...r,sessionId:'other'}],['c',{...r,purpose:'compaction'}]]);
  const view=metricsForSession(rows,'s');assert.equal(view.runs.length,1);assert.ok(!JSON.stringify(view).includes('SECRET'));
  assert.equal(metricsForSession(rows,'missing').runs.length,0);
});
test('metrics endpoint is read-only, origin checked and contains no raw native output',()=>{
  const handler=metricsHandler(new Map());
  for(const [method,url,headers,status] of [['POST','/',{},405],['GET','/',{},400],['GET','/?sessionId=s',{'sec-fetch-site':'cross-site'},403],['GET','/?sessionId=s',{host:'localhost:3180',origin:'https://evil.example'},403],['GET','/?sessionId=s',{},200]]){
    let actual,body;handler({method,url,headers},{writeHead:s=>actual=s,end:s=>body=s});assert.equal(actual,status);assert.doesNotThrow(()=>JSON.parse(body));
  }
});
