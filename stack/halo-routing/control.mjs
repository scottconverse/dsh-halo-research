import {randomUUID} from 'node:crypto';
// Human routing controls. The donor policy remains the selection algorithm.
const DEFAULTS={mode:'manual',scope:'local-first',planner:null,worker:null};
const pinKey=p=>JSON.stringify(p??null);
export async function createControl({read=async()=>null,write=async()=>{},candidates=()=>[],recommend=async()=>null,record=async()=>{},readPin=async()=>null,recent=[]}={}) {
 let state=await read()??{version:1,defaults:{...DEFAULTS},sessions:{}};
 if(state.version!==1||!state.defaults||!state.sessions)throw Error('Unsupported routing settings; preserve the file and restore its documented version.');
 let chain=Promise.resolve();const decisions=recent.slice(-100);
 const settingsFor=id=>({...DEFAULTS,...state.defaults,...(id?state.sessions[id]?.settings:{})});
 function status(sessionId){return {version:'0.3.0',settings:settingsFor(sessionId),defaults:{...state.defaults},sessionId:sessionId??null,sessionSpecific:!!state.sessions[sessionId],recent:decisions.filter(d=>!sessionId||d.sessionId===sessionId).slice(-30).reverse()};}
 function assertAllowed(input){if(settingsFor(input.sessionId).scope==='local-only'&&candidates().find(c=>c.provider===input.provider&&c.model===input.model)?.locality!=='local'){const error=Error('Local-only routing cannot use this remote or unresolved route. Choose a local model or switch to Local first.');error.code='HALO_LOCAL_ONLY';throw error;}}
 async function configure({sessionId,settings}) {
  if(sessionId!==undefined&&(typeof sessionId!=='string'||!sessionId||sessionId.length>256))throw Error('Invalid session id');
  if(!settings||typeof settings!=='object'||Array.isArray(settings))throw Error('Routing settings must be an object');
  for(const key of Object.keys(settings))if(!(key in DEFAULTS))throw Error(`Unknown setting: ${key}`);
  if(settings.mode!==undefined&&!['manual','automatic'].includes(settings.mode))throw Error('mode must be manual or automatic');
  if(settings.scope!==undefined&&!['local-first','local-only'].includes(settings.scope))throw Error('scope must be local-first or local-only');
  for(const key of ['planner','worker'])if(settings[key]!==undefined&&settings[key]!==null&&!candidates().some(c=>c.candidateId===settings[key]))throw Error(`${key} must be a current catalog route or automatic`);
  const task=chain.then(async()=>{
   const next=structuredClone(state);
   if(sessionId){const old=next.sessions[sessionId]??{settings:{}};next.sessions[sessionId]={...old,settings:{...old.settings,...settings},...(settings.mode==='automatic'?{acceptedPin:pinKey(await readPin(sessionId))}:{})};}
   else next.defaults={...DEFAULTS,...next.defaults,...settings};
   const effective={...DEFAULTS,...next.defaults,...next.sessions[sessionId]?.settings};
   if(effective.scope==='local-only')for(const key of ['planner','worker'])if(effective[key]&&candidates().find(c=>c.candidateId===effective[key])?.locality!=='local')throw Error(`Local-only mode requires a confirmed local ${key} override`);
   await write(next);state=next;return status(sessionId);
  });chain=task.catch(()=>{});return task;
 }
 async function resolve(input){
  const available=candidates(input);
  const {sessionId,role='analysis'}=input;let settings=settingsFor(sessionId);
  const original={provider:input.provider,model:input.model,...input.reasoningEffort===undefined?{}:{reasoningEffort:input.reasoningEffort}};
  const currentPin=await readPin(sessionId);const accepted=state.sessions[sessionId]?.acceptedPin;
  // The native picker remains authoritative. Enabling Auto explicitly accepts an
  // existing pin; a subsequent picker change immediately cancels root Auto.
  if(role!=='structured_write'&&currentPin&&pinKey(currentPin)!==accepted){
   const autoWasEffective=settings.mode==='automatic';
   settings={...settings,mode:'manual'};
   if(autoWasEffective)await configure({sessionId,settings:{mode:'manual'}});
  }
  let target=original,reason='Manual selection: DSH keeps your selected model.',statusCode='manual',evaluation=null;
  if(settings.mode==='automatic'){
   const override=settings[role==='structured_write'?'worker':'planner'];
   let selected;
   if(override){selected=available.find(c=>c.candidateId===override);if(!selected)throw Error('The operator-selected route is no longer in the catalog. Choose another model in Router.');statusCode='override';reason='Operator-selected role override; qualification is not implied.';}
   else {
    evaluation=await recommend({role,requiredTier:input.requiredTier??'economy',requiredCapabilities:['text'],localOnly:settings.scope==='local-only',...(input.requiredContextWindow?{requiredContextWindow:input.requiredContextWindow}:{}),...Object.prototype.hasOwnProperty.call(input,'executionTools')?{executionTools:input.executionTools}:{}});
    selected=available.find(c=>c.candidateId===evaluation?.recommendedCandidateId);
    if(selected){statusCode='selected';reason=(evaluation.evaluations?.find(e=>e.candidateId===selected.candidateId)?.reasons??[]).filter(r=>r.kind==='support').map(r=>r.message).join(' ')||'Selected by the qualified local-first donor policy.';}
    else {statusCode='fallback';reason='No qualified candidate is currently available for this role. Keeping the DSH-selected model; no qualification is implied.';}
   }
   if(selected){const effort=selected.executionProfile?.reasoningMode;target={provider:selected.provider,model:selected.model,...effort?.state==='observed'?{reasoningEffort:effort.value}:{}};}
  }
  if(settings.scope==='local-only'&&available.find(c=>c.provider===target.provider&&c.model===target.model)?.locality!=='local'){
   const error=new Error('Local-only routing found no eligible local model. Choose a local override or switch Router to Local first.');error.code='HALO_LOCAL_ONLY';throw error;
  }
  const decision={kind:'route-decision',decisionId:randomUUID(),timestamp:new Date().toISOString(),sessionId,...input.executionSessionId?{workerSessionId:input.executionSessionId}:{},role,mode:settings.mode,scope:settings.scope,status:statusCode,from:original,to:target,reason,policyId:evaluation?.policyId??null,executionFingerprint:available.find(c=>c.provider===target.provider&&c.model===target.model)?.executionFingerprint??null};
  decisions.push(decision);if(decisions.length>100)decisions.shift();
  // Evidence failure must not prevent a route or retry a generation.
  Promise.resolve(record(decision)).catch(()=>{});
  return {...target,decisionId:decision.decisionId,reason};
 }
 return {configure,status,resolve,assertAllowed,bindWorkerDecision(decisionId,workerSessionId){const d=decisions.find(d=>d.decisionId===decisionId);if(d)d.workerSessionId=workerSessionId;}};
}
