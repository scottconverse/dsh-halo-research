// Native invocation totals are NOT a DSH context-occupancy sample.
const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
const ms=n=>Number.isFinite(n)&&n>=0?n:null;
export function mapCliMetrics(record) {
  const result=record.result??{}, events=result.events??[];
  const claude=record.provider==='claude-cli';
  const terminal=events.findLast(e=>(e.raw??e).type===(claude?'result':'turn.completed'));
  let usage=(terminal?.raw??terminal)?.usage;
  if(record.continuity?.resumeId&&result.threadId&&record.continuity.resumeId!==result.threadId)usage=undefined;
  if(!claude&&record.continuity?.resumed&&usage){
    const baseline=record.continuity.priorUsage;
    usage=baseline?Object.fromEntries(Object.entries(usage).map(([k,v])=>[k,baseline[k]===undefined?undefined:v-baseline[k]])):undefined;
  }
  let tokens=null;
  if(usage) {
    const input=count(usage.input_tokens),output=count(usage.output_tokens);
    const cacheRead=count(claude?usage.cache_read_input_tokens:usage.cached_input_tokens);
    const cacheWrite=count(claude?usage.cache_creation_input_tokens:usage.cache_write_input_tokens);
    const reasoning=count(usage.reasoning_output_tokens);
    const optional=[claude?'cache_read_input_tokens':'cached_input_tokens',claude?'cache_creation_input_tokens':'cache_write_input_tokens','reasoning_output_tokens'];
    const valid=optional.every(k=>usage[k]===undefined||count(usage[k])!==null);
    if(input!==null&&output!==null&&valid&&(reasoning===null||reasoning<=output)&&
      (claude?(cacheRead!==null&&cacheWrite!==null):(cacheRead===null||cacheRead<=input))) {
      const total=claude?input+cacheRead+cacheWrite:input;
      if(count(total)!==null)tokens={input:total,uncachedInput:claude?input:cacheRead===null?null:input-cacheRead,cacheRead,cacheWrite,output,reasoning};
    }
  }
  const first=events.find(e=>{
    const raw=e.raw??e;
    return raw.type==='assistant'&&raw.message?.content?.some(b=>b.type==='text'&&b.text?.length)
      ||raw.type==='item.completed'&&raw.item?.type==='agent_message'&&raw.item.text?.length;
  });
  const fallback=ms(Date.parse(record.finished)-Date.parse(record.started));
  return {version:1,provider:record.provider,model:record.model,status:result.status??'failed',
    started:record.started,finished:record.finished,wallMs:ms(result.durationMs)??fallback,
    timingSource:ms(result.durationMs)!==null?'monotonic-process':'receipt-wall-clock',
    firstModelMessageMs:ms(first?.elapsedMs),ttftMs:null,decodeTokensPerSecond:null,
    tokens,usageCoverage:tokens?(result.ok?'terminal-aggregate':'reported-before-failure'):'unreported'};
}
export function metricsForSession(records,sessionId) {
  const runs=[];
  for(const [id,r] of records)if(r.sessionId===sessionId&&r.purpose==='coding')runs.push({id,...mapCliMetrics(r)});
  runs.sort((a,b)=>String(a.started).localeCompare(String(b.started))||a.id.localeCompare(b.id));
  return {version:1,scope:'native-invocations-only',runs};
}

/** Read-only same-origin route; returns no raw CLI output, cwd, prompt, or credential. */
export function metricsHandler(records) {
  return (req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    if(req.method!=='GET')return send(405,{error:'GET required'});
    if(req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'Same-origin request required'});
    if(req.headers.origin)try{if(new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'Same-origin request required'});}catch{return send(403,{error:'Invalid origin'});}
    const id=new URL(req.url,'http://localhost').searchParams.get('sessionId');
    if(!id||id.length>200)return send(400,{error:'sessionId required'});
    return send(200,metricsForSession(records,id));
  };
}
