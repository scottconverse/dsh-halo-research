import {readFile,writeFile,mkdir,realpath,rename} from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {openLedger} from './ledger.mjs';
import {createRouting,stableId} from './core.mjs';
import {deriveProfile} from './profile.mjs';
import {census,localRuntime,enrichLocal,residentOrigins} from './catalog.mjs';
import {executionCandidates} from './execution-candidates.mjs';
import {createControl} from './control.mjs';
import {originalRoute,applyRoute,requestRequirements} from './request-route.mjs';
import {createWorkerRoutes} from './worker-route.mjs';
import {toDonorCandidate,currentQualification} from '../halo-policy-deterministic/donor-adapter.mjs';
import {readNativeQualificationResult} from './native-qualification.mjs';
import {buildQualificationReceipt,ANALYSIS_FIXTURE,BENCHMARK_FIXTURE,STRUCTURED_WRITE_FIXTURE,verifyStructuredWriteFixture} from './qualification.mjs';
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
 const sessions=new Map();const steps=new Map();const pins=new Map();const attempts=new Map();const latest=new Map();const active=new Map();const qualificationTests=new Map();const qualificationText=new Map();const observedLatency=[];let workChain=Promise.resolve();let exportChain=Promise.resolve();
 for(const row of ledger.values())if(row.kind==='observation'){const key=stableId(row.sessionId,row.turnId,row.step);attempts.set(key,Math.max(attempts.get(key)??0,(row.attempt??0)+1));}
 const routing=createRouting({ledger,candidates:workload=>executionCandidates(catalog.candidates,ledger.values(),runtime,Object.hasOwn(workload??{},'executionTools')?{tools:workload.executionTools}:{}),qualifications:()=>ledger.values().filter(r=>r.kind==='qualification'),emit:(event,payload)=>{try{ctx.emit(event,payload);}catch{}},validateOutcome:async o=>{
  try{const resolved=await realpath(o.receiptPath);const rel=path.relative(await realpath(gateRoot),resolved);if(rel.startsWith('..')||path.isAbsolute(rel)||path.basename(resolved)!=='verdict.json')return false;
   const bytes=await readFile(resolved);const audit=JSON.parse(bytes);return stableId(bytes.toString('utf8'))===o.receiptId&&audit.rounds?.some(r=>r.round===o.round&&((o.result==='pass'&&r.state==='VERIFIED')||(o.result==='fail'&&r.state!=='VERIFIED')));
  }catch{return false;}
 }});
 const controlsFile=path.join(output,'controls.json');
 const currentCandidates=input=>executionCandidates(catalog.candidates,ledger.values(),runtime,Object.hasOwn(input??{},'executionTools')?{tools:input.executionTools}:{});
 const readPin=async id=>{if(!id)return null;await scanPin(id);return pins.get(id)??null;};
 const control=await createControl({
  read:async()=>{try{return JSON.parse(await readFile(controlsFile,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}},
  write:async state=>{const temp=controlsFile+'.tmp';await writeFile(temp,JSON.stringify(state,null,2)+'\n');await rename(temp,controlsFile);},
  candidates:currentCandidates,recommend:routing.api.recommend,readPin,
  record:row=>ledger.append(row.decisionId,row),recent:ledger.values().filter(r=>r.kind==='route-decision'),
 });
 function status({sessionId}={}){
  const qs=ledger.values().filter(r=>r.kind==='qualification');
  const candidates=currentCandidates().map(c=>{
   let qualification={analysis:'unknown',structured_write:'unknown'};
   if(c.executionFingerprint)for(const role of Object.keys(qualification)){const donor=toDonorCandidate(c,role);if(currentQualification(donor,qs,role)&&(role!=='structured_write'||currentQualification(donor,qs,'benchmark')))qualification[role]='pass';}
   return {candidateId:c.candidateId,provider:c.provider,model:c.model,label:c.name??c.model,locality:c.locality,catalogState:c.catalogState,qualification};
  });
  return {...control.status(sessionId),candidates,policies:routing.api.listPolicies(),updatedAt:new Date().toISOString()};
 }
 const workerRoutes=createWorkerRoutes({ledger,resolve:control.resolve});
 Object.assign(routing.api,{status,configure:async payload=>{await control.configure(payload);return status(payload);},resolve:async input=>{try{return await(input.role==='structured_write'&&input.executionSessionId?workerRoutes.stage(input):control.resolve(input));}catch(error){control.assertAllowed(input);throw error;}},bindWorkerDecision:workerRoutes.bind});
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
 ctx.on('halo-routing/qualification-start',payload=>{
  const fixture={analysis:ANALYSIS_FIXTURE,benchmark:BENCHMARK_FIXTURE,structured_write:STRUCTURED_WRITE_FIXTURE}[payload.role];
  if(fixture&&payload.prompt===fixture.prompt){qualificationTests.set(payload.sessionId,{role:payload.role,promptHash:stableId(payload.prompt),cwd:payload.verificationCwd??payload.cwd,startedAt:new Date().toISOString()});qualificationText.set(payload.sessionId,'');}
 },{global:true});
 ctx.on('halo-routing/qualification-result',payload=>{queue(async()=>{
  const run=qualificationTests.get(payload.sessionId),observation=latest.get(payload.sessionId);
  if(payload.completed!==true){qualificationTests.delete(payload.sessionId);qualificationText.delete(payload.sessionId);return;}
  if(!run||!observation)return;
  const measurement=ledger.get(stableId('measurement',observation.observationId));
  const profile=measurement?.executionProfileObservation;
  if(profile?.phase!=='post-terminal')return;
  const base=catalog.candidates.find(c=>c.provider===observation.actual.provider&&c.model===observation.actual.model);if(!base)return;
  let finalText=qualificationText.get(payload.sessionId)??'';let nativeEvidence=null;
  if(['claude-cli','codex-cli'].includes(base.provider)){
   const native=await readNativeQualificationResult(devHome,{sessionId:payload.sessionId,provider:base.provider,model:base.model,notBefore:run.startedAt});
   if(!native)throw Error('Native qualification receipt missing');
   finalText=native.ok?native.final:'';
   nativeEvidence={ok:native.ok,receiptPath:native.receiptPath,receiptHash:native.receiptHash,finishedAt:native.finishedAt,source:'native-adapter-result.final'};
  }
  let fixtureVerification=null;
  if(run.role==='structured_write'){
   const resolved=await realpath(run.cwd);const relative=path.relative(await realpath(devHome),resolved);
   if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Qualification fixture is outside DEV');
   const original=STRUCTURED_WRITE_FIXTURE.files['test_add.py'];
   const intact=(await readFile(path.join(resolved,'test_add.py'),'utf8'))===original;
   fixtureVerification=intact?verifyStructuredWriteFixture(resolved):{passed:false,diffNonEmpty:false,checkPassed:false,detail:'Protected donor fixture changed'};
  }
  const record=buildQualificationReceipt({candidate:{...base,executionFingerprint:profile.fingerprint,runtimeVersion:'DSH/0.1.1-rc.2'},role:run.role,finalText,fixtureVerification,finishedAt:measurement.timestamp,hostReceipt:{producer:'dsh-host',observationId:observation.observationId,executionPhase:'post-terminal',executionFingerprint:profile.fingerprint,verifier:{kind:'independent-code',version:'DevHarmonics/ee369b4/qualify',receiptId:stableId(observation.observationId,run.promptHash,finalText,fixtureVerification)}}});
  await ledger.append(stableId('qualification',record.observationId,record.role),{...record,fixtureVerification,nativeEvidence});
  qualificationTests.delete(payload.sessionId);qualificationText.delete(payload.sessionId);await exportRecords();
 });},{global:true});
 async function scanPin(sessionId){try{const p=path.join(devHome,'model-selections',stableIdFromString(sessionId)+'.json');const row=JSON.parse(await readFile(p,'utf8'));pins.set(sessionId,row);}catch(e){if(e.code==='ENOENT')pins.set(sessionId,null);}}
 const assembledTools=new Map();
 ctx.on('system-prompt/assemble',async(assembly,context,next)=>{
  const result=await next();
  if(context.agent?.session?.id)assembledTools.set(context.agent.session.id,result.tools);
  return result;
 },{global:true,prepend:true});
 ctx.on('agent/request',async(payload,next)=>{
  // next belongs to DSH. Never catch it or call it twice.
  const resolved=await next();const start=performance.now();let selected=resolved;
  try{const id=payload.agent.session.id;sessions.set(id,payload.agent.session);steps.set(id,{turnId:payload.turn,step:payload.step});
   const workerPlan=workerRoutes.lookup(payload.agent.session.header?.parentSession);
   if(workerPlan){
    const route=await workerRoutes.dispatch(workerPlan,{workerSessionId:id,executionTools:assembledTools.get(id),requirements:requestRequirements(payload.agent.session,ctx.get('tokenMeter'),resolved.maxTokens)});
    selected=applyRoute(resolved,route);
   }else if(!payload.agent.session.header?.parentSession&&!qualificationTests.has(id)){
    const pin=await readPin(id);const original=originalRoute(resolved,pin??payload.agent.options);
    const route=await control.resolve({sessionId:id,role:'analysis',...original,executionTools:assembledTools.get(id),...requestRequirements(payload.agent.session,ctx.get('tokenMeter'),resolved.maxTokens)});
    selected=applyRoute(resolved,route);
   }else queue(()=>scanPin(id));
  }catch(error){if(error.code==='HALO_LOCAL_ONLY')throw error;const plan=workerRoutes.lookup(payload.agent.session.header?.parentSession);control.assertAllowed({sessionId:plan?.input.sessionId??payload.agent.session.id,provider:resolved.provider,model:resolved.model});routing.stats.observerErrors++;}
  observedLatency.push(performance.now()-start);if(observedLatency.length>1000)observedLatency.shift();return selected;
 },{global:true,prepend:true});
 ctx.on('session/event',(session,event)=>{try{
  sessions.set(session.id,session);if(event.type==='step/start')steps.set(session.id,{turnId:event.data.turn,step:event.data.step});
  if(event.type==='assistant/chunk'){
   const call=active.get(session.id);if(!call||call.turnId!==event.data.turn||call.step!==event.data.step)return;
   const chunk=event.data.chunk;
   if(chunk.type==='text-delta'&&qualificationTests.has(session.id))qualificationText.set(session.id,(qualificationText.get(session.id)??'')+(chunk.text??''));
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
   const workload={role:qualificationTests.get(id)?.role??(session?.header.parentSession?'structured_write':'analysis'),requiredTier:config.requiredTier??'economy',taskKind:'caller-role',requiredCapabilities:['text']};
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
function exportRecords(){const task=exportChain.then(async()=>{await ledger.flush();const values=ledger.values();if(values.length!==exportedCount){await writeFile(path.join(output,'records.json'),JSON.stringify(values,null,2)+'\n');exportedCount=values.length;}const sorted=[...observedLatency].sort((a,b)=>a-b);await writeFile(path.join(output,'status.json'),JSON.stringify({updatedAt:new Date().toISOString(),mode:control.status().settings.mode,authority:'operator-controlled',records:values.length,policies:routing.api.listPolicies(),queueDropped:dropped,storage:ledger.stats,errors:routing.stats,listenerP95Ms:sorted[Math.floor(sorted.length*.95)]??0,listenerMaxMs:sorted.at(-1)??0},null,2)+'\n');});exportChain=task.catch(()=>{});return task;}
 const exportTimer=setInterval(()=>exportRecords().catch(()=>{}),5000);exportTimer.unref();
 ctx.effect(()=>async()=>{closed=true;clearInterval(refreshTimer);clearInterval(exportTimer);await workChain;await exportRecords();await ledger.close();});
}
function stableIdFromString(s){ // Matches Halo's existing session-selection store key.
 return createStringHash(s);
}
import {createHash} from 'node:crypto';
function createStringHash(s){return createHash('sha256').update(s).digest('hex');}
function cleanUsage(usage){return Object.fromEntries(Object.entries(usage??{}).filter(([key,value])=>/token|cache|input|output|reasoning/i.test(key)&&typeof value==='number'&&Number.isFinite(value)));}
