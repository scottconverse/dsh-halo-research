// Bounded, sequential OpenAI-compatible probe. Does not load/unload models.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const [arm, output] = process.argv.slice(2);
if (!['0.5','0.2'].includes(arm) || !output) throw Error('Usage: node q4-mtp-probe.mjs 0.5|0.2 output.json');
const model = 'halo/qwen3.8-27b-q4km';
const prompt = `Return JSON only with a single key "code" containing JavaScript function mergeRanges(ranges).
Each input is an array [start,end] of safe integers representing a half-open interval. Ignore empty intervals. Reject malformed/reversed intervals by throwing TypeError. Return intervals sorted by start, merging overlaps transitively but NOT intervals that merely touch. Never mutate the input. Do not use external libraries. Include only the function in code, no tests or prose.`;
function check(code) {
  const cases = [
    [[], []], [[[1,1]], []], [[[2,3],[1,2]],[[1,2],[2,3]]],
    [[[5,9],[1,4],[3,6]], [[1,9]]], [[[1,9],[2,3],[1,9]],[[1,9]]],
    [[[-5,-1],[-3,2],[4,5]], [[-5,2],[4,5]]],
  ];
  for (const [input, expected] of cases) {
    const ctx=vm.createContext({input:structuredClone(input)});
    const actual=vm.runInContext(`${code}; mergeRanges(input)`,ctx,{timeout:1000});
    assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);
    assert.deepEqual(ctx.input,input);
  }
  for (const bad of [[[2,1]],[[1]],[[1,2,3]],[[1,'2']],[[1.5,2]],[[0,Infinity]]]) {
    const ctx=vm.createContext({input:bad});
    assert.throws(()=>vm.runInContext(`${code}; mergeRanges(input)`,ctx,{timeout:1000}),e=>e.name==='TypeError');
  }
  return 12;
}
async function run(seed,warmup=false) {
  const request={model,messages:[{role:'user',content:warmup?'Reply with the word READY.':prompt}],stream:true,stream_options:{include_usage:true},reasoning_effort:'none',temperature:.7,top_p:.8,top_k:20,min_p:0,presence_penalty:1.5,repeat_penalty:1,max_tokens:warmup?32:768,seed};
  const start=performance.now();let first,last,text='',reasoning='',usage,finish;
  const res=await fetch('http://127.0.0.1:1234/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(180000)});
  if(!res.ok)throw Error(`HTTP ${res.status}: ${await res.text()}`);
  let buffer='';
  for await (const chunk of res.body) {
    buffer+=Buffer.from(chunk).toString('utf8');
    const lines=buffer.split('\n');buffer=lines.pop();
    for(const line of lines){
      if(!line.startsWith('data: ')||line==='data: [DONE]')continue;
      const event=JSON.parse(line.slice(6));const c=event.choices?.[0],d=c?.delta;
      if(d?.content||d?.reasoning_content){first??=performance.now();last=performance.now();}
      text+=d?.content??'';reasoning+=d?.reasoning_content??'';
      usage=event.usage??usage;finish=c?.finish_reason??finish;
    }
  }
  const elapsed=(performance.now()-start)/1000;
  let tests=0,error=null;
  if(!warmup)try { const json=JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));tests=check(json.code); }catch(e){error=String(e);}
  return {arm,seed,warmup,elapsed,ttft:(first-start)/1000,streamSpan:(last-first)/1000,usage,finish,reasoningChars:reasoning.length,tests,error,text};
}
const rows=[];
for(const [seed,warmup] of [[41,true],[42,false],[43,false],[44,false]]){
 const row=await run(seed,warmup);rows.push(row);fs.writeFileSync(output,JSON.stringify({model,prompt,rows},null,2));
 console.log(JSON.stringify({...row,text:undefined}));
}
