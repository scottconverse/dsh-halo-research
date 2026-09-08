import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerRoutes} from '../stack/halo-routing/worker-route.mjs';

function memoryLedger(seed=[]) {
 const rows=seed.map(row=>structuredClone(row));
 return {
  rows,
  values:()=>rows.map(row=>structuredClone(row)),
  async append(id,row){if(rows.some(existing=>existing._id===id))return false;rows.push({...structuredClone(row),_id:id,sequence:rows.length+1});return true;},
 };
}

const request={sessionId:'human-root',executionSessionId:'gate-stage',provider:'claude-cli',model:'sonnet',reasoningEffort:'high'};

test('worker staging persists a plan but defers resolution and returns the original route',async()=>{
 const ledger=memoryLedger();let calls=0;
 const routes=createWorkerRoutes({ledger,resolve:async()=>{calls++;throw Error('must remain deferred')}});
 const staged=await routes.stage(request);
 assert.equal(calls,0);
 assert.equal(staged.provider,request.provider);
 assert.equal(staged.model,request.model);
 assert.equal(staged.reasoningEffort,request.reasoningEffort);
 assert.equal(typeof staged.decisionId,'string');
 assert.match(staged.reason,/deferred/i);
 const plan=routes.lookup(request.executionSessionId);
 assert.equal(plan.reservationId,staged.decisionId);
 assert.deepEqual(plan.input,{sessionId:'human-root',role:'structured_write',provider:'claude-cli',model:'sonnet',reasoningEffort:'high'});
 assert.equal(ledger.rows.filter(row=>row.kind==='worker-route-plan').length,1);
});

test('dispatch binds exact child tools and human settings to the actual worker decision',async()=>{
 const ledger=memoryLedger();let received;
 const routes=createWorkerRoutes({ledger,resolve:async input=>{received=structuredClone(input);return {provider:'lmstudio',model:'local-worker',decisionId:'actual-decision',reason:'qualified local worker'};}});
 const staged=await routes.stage(request);const plan=routes.lookup(request.executionSessionId);
 await routes.bind(staged.decisionId,'worker-child');
 const tools=[{name:'write_file',parameters:{type:'object',required:['path']}}];
 const requirements={requiredCapabilities:['text','image'],requiredContextWindow:42000,requirementsKnown:true};
 const actual=await routes.dispatch(plan,{workerSessionId:'worker-child',executionTools:tools,requirements});
 assert.deepEqual(received,{sessionId:'human-root',role:'structured_write',provider:'claude-cli',model:'sonnet',reasoningEffort:'high',executionSessionId:'worker-child',executionTools:tools,...requirements});
 assert.equal(actual.provider,'lmstudio');
 assert.equal(actual.model,'local-worker');
 assert.equal(ledger.rows.some(row=>row.kind==='worker-route-child-link'&&row.reservationId===staged.decisionId&&row.workerSessionId==='worker-child'),true);
 assert.equal(ledger.rows.some(row=>row.kind==='worker-route-link'&&row.reservationId===staged.decisionId&&row.workerSessionId==='worker-child'&&row.actualDecisionId==='actual-decision'),true);
});

test('persisted plans are available by staging session after a cold recreation',async()=>{
 const ledger=memoryLedger();const first=createWorkerRoutes({ledger,resolve:async()=>null});
 const staged=await first.stage(request);
 const reopened=createWorkerRoutes({ledger,resolve:async()=>null});
 assert.equal(reopened.lookup(request.executionSessionId).reservationId,staged.decisionId);
});

for(const failure of ['false','throw'])test(`worker link ${failure} leaves a valid selected route intact`,async()=>{
 const ledger=memoryLedger();const append=ledger.append.bind(ledger);
 ledger.append=async(id,row)=>{if(row.kind==='worker-route-link'){if(failure==='throw')throw Error('disk unavailable');return false;}return append(id,row);};
 const routes=createWorkerRoutes({ledger,resolve:async()=>({provider:'lmstudio',model:'chosen',decisionId:'d'})});
 await routes.stage(request);let actual,error;
 try{actual=await routes.dispatch(routes.lookup(request.executionSessionId),{workerSessionId:'child',executionTools:[]})}catch(e){error=e}
 assert.equal(error,undefined,'optional evidence must not cause caller fallback');assert.equal(actual.model,'chosen');
});
