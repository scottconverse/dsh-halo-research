import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {openLedger} from './ledger.mjs';
import {createRouting,stableId} from './core.mjs';
import {deriveProfile} from './profile.mjs';
import {census,localRuntime,enrichLocal,residentOrigins} from './catalog.mjs';
export const name='dsh-halo-routing';
export const inject=['llm','storage','storage.backend.json'];
/** DEV-only observation. Session events supply correlation; stream supplies final dispatch. */
export async function apply(ctx,config={}){
 const devHome=process.env.DSH_HOME;
 if(!devHome||!config.home||path.resolve(devHome)!==path.resolve(config.home))throw Error('Halo router requires its explicit development DSH_HOME');
 const output=path.join(devHome,'halo-routing');await mkdir(output,{recursive:true});
 const gateRoot=path.resolve(config.gateRoot??path.join(devHome,'gate-runs'));
 let ledger;try{ledger=await openLedger(ctx.storage,{queueLimit:config.queueLimit??256});}catch{ledger={stats:{errors:1},append:async()=>false,get:()=>undefined,values:()=>[],flush:async()=>{},close:async()=>{}};}
 let catalog={candidates:[],nativeProviders:[]};let runtime=new Map();let closed=false;let queued=0;let dropped=0;
 let exportedCount=-1;
 const sessions=new Map();const steps=new Map();const pins=new Map();const attempts=new Map();const latest=new Map();const active=new Map();const observedLatency=[];let workChain=Promise.resolve();let exportChain=Promise.resolve();
 for(const row of ledger.values())if(row.kind==='observation'){const key=stableId(row.sessionId,row.turnId,row.step);attempts.set(key,Math.max(attempts.get(key)??0,(row.attempt??0)+1));}
 const routing=createRouting({ledger,candidates:()=>catalog.candidates,emit:(event,payload)=>{try{ctx.emit(event,payload);}catch{}},validateOutcome:async o=>{
  try{const resolved=await realpath(o.receiptPath);const rel=path.relative(await realpath(gateRoot),resolved);if(rel.startsWith('..')||path.isAbsolute(rel)||path.basename(resolved)!=='verdict.json')return false;
   const bytes=await readFile(resolved);const audit=JSON.parse(bytes);return stableId(bytes.toString('utf8'))===o.receiptId&&audit.rounds?.some(r=>r.round===o.round&&((o.result==='pass'&&r.state==='VERIFIED')||(o.result==='fail'&&r.state!=='VERIFIED')));
  }catch{return false;}
 }});
 ctx.provide('haloRouting',routing.api);
 const queue=(work)=>{if(closed||queued>=(config.queueLimit??256)){dropped++;return;}queued++;workChain=workChain.then(()=>new Promise(resolve=>setImmediate(resolve))).then(work).catch(()=>{routing.stats.observerErrors++;}).finally(()=>{queued--;});};
 async function refresh(){
  if(closed)return;
  try{const next=await census(ctx.llm,ctx.get('subagents'));if(!closed)catalog=next;}catch{}
  try{const data=await localRuntime(config.lmstudioUrl);if(!closed)runtime=enrichLocal(data);}catch{runtime=new Map();}
  try{const origins=await residentOrigins();for(const candidate of catalog.candidates){const origin=candidate.provider==='lmstudio'?origins.get(candidate.model):null;if(origin)Object.assign(candidate,{locality:origin.locality,localitySource:origin.source,localityObservedAt:origin.observedAt});}}catch{}
  if(!closed)await writeFile(path.join(output,'candidate-reconciliation.json'),JSON.stringify(catalog,null,2)+'\n');
 }
 await refresh();
 const refreshTimer=setInterval(()=>refresh().catch(()=>{}),config.refreshMs??60000);refreshTimer.unref();
 async function scanPin(sessionId){try{const p=path.join(devHome,'model-selections',stableIdFromString(sessionId)+'.json');const row=JSON.parse(await readFile(p,'utf8'));pins.set(sessionId,row);}catch(e){if(e.code==='ENOENT')pins.set(sessionId,null);}}
 ctx.on('agent/request',async(payload,next)=>{
  // next belongs to DSH. Never catch it or call it twice.
  const resolved=await next();const start=performance.now();
  try{const id=payload.agent.session.id;sessions.set(id,payload.agent.session);steps.set(id,{turnId:payload.turn,step:payload.step});queue(()=>scanPin(id));}catch{routing.stats.observerErrors++;}
  observedLatency.push(performance.now()-start);if(observedLatency.length>1000)observedLatency.shift();return resolved;
 },{global:true,prepend:true});
 ctx.on('session/event',(session,event)=>{try{
  sessions.set(session.id,session);if(event.type==='step/start')steps.set(session.id,{turnId:event.data.turn,step:event.data.step});
  if(event.type==='assistant/chunk'){
   const call=active.get(session.id);if(!call||call.turnId!==event.data.turn||call.step!==event.data.step)return;
   const chunk=event.data.chunk;
   if(chunk.type==='usage')call.usage=cleanUsage(chunk.usage);
   if(['text-delta','reasoning-delta','tool-call-delta'].includes(chunk.type)&&call.firstChunkMs===null)call.firstChunkMs=performance.now()-call.started;
   if(chunk.type==='finish'){
    active.delete(session.id);const measurement={elapsedMs:performance.now()-call.started,firstChunkMs:call.firstChunkMs,usage:call.usage??null,finish:typeof chunk.reason==='string'?chunk.reason:chunk.reason?.kind??'unknown',timestamp:new Date().toISOString(),source:'committed-session-chunks'};
    queue(async()=>{
     let profile=deriveProfile(call.candidate,{});let state='provider-declared';
     if(call.candidate.provider==='lmstudio'){
      try{const live=enrichLocal(await localRuntime(config.lmstudioUrl)).get(call.candidate.model);if(live){profile=deriveProfile(call.candidate,live);state=live.contextWindow?'completion-snapshot':'instance-unresolved';}else state='instance-unresolved';}catch{state='unavailable';}
     }
     measurement.executionProfileObservation={phase:'post-terminal',state,observedAt:new Date().toISOString(),profile,fingerprint:profile.fingerprint,attestsInFlightConfiguration:false};
     await routing.recordMeasurement(call.observationId,measurement);
     const row=latest.get(session.id);if(row?.observationId===call.observationId)row.outcomeFingerprint=profile.fingerprint;
    });
   }
  }
 }catch{routing.stats.observerErrors++;}},{global:true});
 ctx.on('llm/stream',(options,next)=>{
  const stream=next();if(options.purpose||!options.sessionId)return stream;
  const start=performance.now();
  try{
   const id=options.sessionId;const session=sessions.get(id);const step=steps.get(id)??{turnId:null,step:null};
   const attemptKey=stableId(id,step.turnId,step.step);const attempt=attempts.get(attemptKey)??0;attempts.set(attemptKey,attempt+1);
   const observationId=stableId(id,step.turnId,step.step,attempt);
   const match=catalog.candidates.find(c=>c.provider===options.provider&&c.model===options.model)??{candidateId:options.provider+'/'+options.model,provider:options.provider,model:options.model,executionClass:'unknown',qualificationState:'unknown'};
   const candidate={...match,reasoningMode:options.reasoningEffort,tools:options.tools};
   const enrichment=options.provider==='lmstudio'?(runtime.get(options.model)??{}):{};
   active.set(id,{observationId,...step,candidate,started:start,firstChunkMs:null});
   const workload={role:session?.header.parentSession?'worker':'planner',taskKind:'unspecified',requiredCapabilities:['text']};
   const timestamp=new Date().toISOString();const parentSessionId=session?.header.parentSession;
   // All hashing, evidence IO and policy work happens after dispatch returns.
   queue(async()=>{
    await scanPin(id);const pin=pins.get(id);
    const profile=deriveProfile(candidate,enrichment);
    const row={observationId,sessionId:id,...step,attempt,timestamp,parentSessionId,selectionSource:pin?'explicit':parentSessionId?'delegated':pin===null?'default-or-resumed':'unknown',requested:pin??null,actual:{provider:options.provider,model:options.model,reasoningEffort:options.reasoningEffort??null,identitySource:'dsh-final-dispatch',providerResolvedModel:'unobserved'},executionProfile:profile,profileObservation:{phase:'dispatch-snapshot',catalogAsOf:catalog.capturedAt??null,attestsInFlightConfiguration:false},workload};
    await routing.api.observe(row);latest.set(id,row);const recommendation=await routing.api.recommend(workload);await routing.recordRecommendation(observationId,recommendation);
    await exportRecords();
   });
  }catch{routing.stats.observerErrors++;}
  observedLatency.push(performance.now()-start);if(observedLatency.length>1000)observedLatency.shift();return stream;
 },{global:true});
 ctx.on('halo-routing/verifier-outcome',payload=>{queue(async()=>{
  // DEV verified-coder sends the exact child ids and gate round, never model-authored text.
  const audit=JSON.parse(await readFile(payload.receiptPath,'utf8'));const bytes=await readFile(payload.receiptPath,'utf8');
  for(const binding of payload.bindings){const observed=latest.get(binding.sessionId);const round=audit.rounds?.find(r=>r.round===binding.round);if(!observed||!round)continue;
   if(!observed.outcomeFingerprint)continue;
   await routing.api.recordOutcome({observationId:observed.observationId,executionFingerprint:observed.outcomeFingerprint,receiptId:stableId(bytes),receiptPath:payload.receiptPath,round:binding.round,role:'worker',verifierVersion:'halo-verified-coder/378d95b',result:round.state==='VERIFIED'?'pass':'fail',timestamp:new Date().toISOString()});
  }await exportRecords();
 });},{global:true});
 function exportRecords(){const task=exportChain.then(async()=>{await ledger.flush();const values=ledger.values();if(values.length!==exportedCount){await writeFile(path.join(output,'records.json'),JSON.stringify(values,null,2)+'\n');exportedCount=values.length;}const sorted=[...observedLatency].sort((a,b)=>a-b);await writeFile(path.join(output,'status.json'),JSON.stringify({updatedAt:new Date().toISOString(),mode:'shadow',authority:'none',records:values.length,policies:routing.api.listPolicies(),queueDropped:dropped,storage:ledger.stats,errors:routing.stats,listenerP95Ms:sorted[Math.floor(sorted.length*.95)]??0,listenerMaxMs:sorted.at(-1)??0},null,2)+'\n');});exportChain=task.catch(()=>{});return task;}
 const exportTimer=setInterval(()=>exportRecords().catch(()=>{}),5000);exportTimer.unref();
 ctx.effect(()=>async()=>{closed=true;clearInterval(refreshTimer);clearInterval(exportTimer);await workChain;await exportRecords();await ledger.close();});
}
function stableIdFromString(s){ // Matches Halo's existing session-selection store key.
 return createStringHash(s);
}
import {createHash} from 'node:crypto';
function createStringHash(s){return createHash('sha256').update(s).digest('hex');}
function cleanUsage(usage){return Object.fromEntries(Object.entries(usage??{}).filter(([key,value])=>/token|cache|input|output|reasoning/i.test(key)&&typeof value==='number'&&Number.isFinite(value)));}
