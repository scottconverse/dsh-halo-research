import {randomUUID} from 'node:crypto';
import {stableId} from './core.mjs';

function nonempty(value,field){if(typeof value!=='string'||!value.trim())throw Error(`${field} must be a nonempty string`);return value;}
function copy(value){return structuredClone(value);}

/**
 * Durable handoff between gate staging and the worker's first real request.
 * Selection is deliberately deferred until DSH has assembled that child's tools.
 */
export function createWorkerRoutes({ledger,resolve}={}){
 if(!ledger||typeof ledger.values!=='function'||typeof ledger.append!=='function')throw Error('worker routes require an append-only ledger');
 if(typeof resolve!=='function')throw Error('worker routes require the routing resolver');
 const byReservation=new Map(),byStagingSession=new Map();
 for(const row of ledger.values())if(row?.kind==='worker-route-plan'&&typeof row.reservationId==='string'&&typeof row.stagingSessionId==='string'){
  byReservation.set(row.reservationId,row);
  const previous=byStagingSession.get(row.stagingSessionId);
  if(!previous||(row.sequence??0)>(previous.sequence??0))byStagingSession.set(row.stagingSessionId,row);
 }
 async function append(id,row){if(!await ledger.append(id,row))throw Error(`worker route evidence was not appended: ${row.kind}`);}
 async function stage(input={}){
  nonempty(input.sessionId,'sessionId');nonempty(input.executionSessionId,'executionSessionId');nonempty(input.provider,'provider');nonempty(input.model,'model');
  if(input.reasoningEffort!==undefined)nonempty(input.reasoningEffort,'reasoningEffort');
  const reservationId=randomUUID();
  const routeInput={sessionId:input.sessionId,role:'structured_write',provider:input.provider,model:input.model,...input.reasoningEffort===undefined?{}:{reasoningEffort:input.reasoningEffort}};
  const plan={kind:'worker-route-plan',reservationId,timestamp:new Date().toISOString(),stagingSessionId:input.executionSessionId,input:routeInput};
  await append(reservationId,plan);byReservation.set(reservationId,plan);byStagingSession.set(plan.stagingSessionId,plan);
  return {provider:input.provider,model:input.model,...input.reasoningEffort===undefined?{}:{reasoningEffort:input.reasoningEffort},decisionId:reservationId,reason:'Worker routing deferred until the child\'s exact tools are assembled.'};
 }
 function lookup(stagingSessionId){return copy(byStagingSession.get(stagingSessionId)??null);}
 async function bind(reservationId,workerSessionId){
  nonempty(reservationId,'reservationId');nonempty(workerSessionId,'workerSessionId');if(!byReservation.has(reservationId))throw Error('Unknown worker route reservation');
  const row={kind:'worker-route-child-link',reservationId,workerSessionId,timestamp:new Date().toISOString()};
  await append(stableId('worker-route-child-link',reservationId,workerSessionId),row);return copy(row);
 }
 async function dispatch(plan,{workerSessionId,executionTools,requirements={}}={}){
  const reservationId=nonempty(plan?.reservationId,'plan.reservationId');nonempty(workerSessionId,'workerSessionId');
  const current=byReservation.get(reservationId);if(!current)throw Error('Unknown worker route reservation');
  if(!Array.isArray(executionTools))throw Error('worker dispatch requires exact assembled executionTools');
  const route=await resolve({...copy(current.input),...copy(requirements),executionSessionId:workerSessionId,executionTools:copy(executionTools)});
  nonempty(route?.decisionId,'route.decisionId');
  const link={kind:'worker-route-link',reservationId,workerSessionId,actualDecisionId:route.decisionId,timestamp:new Date().toISOString()};
  // Correlation storage is diagnostic once selection has succeeded. It must
  // neither delay dispatch nor make the caller silently use a different model.
  Promise.resolve().then(()=>append(stableId('worker-route-link',reservationId,workerSessionId,route.decisionId),link)).catch(()=>{});
  return route;
 }
 return {stage,lookup,dispatch,bind};
}
