import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRouting,stableId} from '../stack/halo-routing/core.mjs';
function harness(validateOutcome=async()=>false){const rows=new Map();const ledger={get:id=>rows.get(id),append:async(id,r)=>{if(rows.has(id))return false;rows.set(id,r);return true;}};return {...createRouting({ledger,validateOutcome,policyTimeoutMs:20,candidates:()=>[{candidateId:'cloud/one'}]}),rows};}
test('forwards existing qualification records intact to the donor policy',async()=>{
 const qualification={candidateId:'cloud/one',role:'analysis',fingerprint:'exact',passed:true,finishedAt:'2026-09-08T00:00:00Z'};
 const ledger={get:()=>undefined,append:async()=>true,values:()=>[]};
 const routing=createRouting({ledger,qualifications:()=>[qualification]});let received;
 routing.api.registerPolicy({id:'donor',recommend:input=>{received=input;return {};}});
 await routing.api.recommend({role:'analysis',requiredTier:'standard'});
 assert.deepEqual(received.qualifications,[qualification]);
});
test('no policy, disposed policy and broken policy all defer; no routing authority',async()=>{const h=harness();assert.equal(await h.api.recommend({}),null);const dispose=h.api.registerPolicy({id:'p',version:'1',recommend:()=>({candidateId:'cloud/one',authority:'switch'})});assert.equal((await h.api.recommend({})).authority,'none');dispose();assert.equal(await h.api.recommend({}),null);h.api.registerPolicy({id:'bad',recommend:()=>{throw Error('bad')}});assert.equal(await h.api.recommend({}),null);assert.equal(h.stats.policyErrors,1);});
test('a pending policy is time bounded and cannot receive prompt contents',async()=>{const h=harness();let received;h.api.registerPolicy({id:'p',recommend:input=>{received=input;return new Promise(()=>{});}});const start=Date.now();assert.equal(await h.api.recommend({role:'planner',prompt:'SECRET',messages:['SECRET']}),null);assert.ok(Date.now()-start<200);assert.deepEqual(received.workload,{role:'planner'});});
test('outcomes require measured profile and independently validated exact binding',async()=>{
 const h=harness(async o=>o.receiptId==='trusted');
 await h.api.observe({observationId:'o',executionProfile:{fingerprint:'dispatch'},workload:{role:'worker'}});
 const outcome={observationId:'o',executionFingerprint:'measured',receiptId:'trusted',result:'pass'};
 assert.equal(await h.api.recordOutcome({...outcome,executionFingerprint:'dispatch'}),false);
 await h.recordMeasurement('o',{executionProfileObservation:{phase:'post-terminal',fingerprint:'measured'}});
 assert.equal(await h.api.recordOutcome({...outcome,receiptId:'untrusted'}),false);
 assert.equal(await h.api.recordOutcome({...outcome,executionFingerprint:'dispatch'}),false);
 assert.equal(await h.api.recordOutcome(outcome),true);
 assert.equal([...h.rows.values()].at(-1).qualificationState,'unknown');
 assert.equal(await h.api.recordOutcome(outcome),false);
});
test('verifier crash is not a pass',async()=>{
 const h=harness(()=>{throw Error('verifier died');});
 await h.api.observe({observationId:'o',executionProfile:{fingerprint:'fp'}});
 await h.recordMeasurement('o',{executionProfileObservation:{phase:'post-terminal',fingerprint:'fp'}});
 assert.equal(await h.api.recordOutcome({observationId:'o',executionFingerprint:'fp',result:'pass'}),false);
 assert.equal(h.stats.observerErrors,1);
});
test('recommendation and measurement dedup leave immutable observation',async()=>{
 const h=harness();await h.api.observe({observationId:'o',executionProfile:{fingerprint:'fp'}});
 const rec={policyId:'p',policyVersion:'1',policyConfigDigest:'c',authority:'switch',kind:'wrong',recommendationId:'wrong'};
 assert.equal(await h.recordRecommendation('o',rec),true);
 assert.equal(await h.recordRecommendation('o',rec),false);
 assert.equal(await h.recordMeasurement('o',{elapsedMs:10}),true);
 assert.equal(await h.recordMeasurement('o',{elapsedMs:20}),false);
 assert.equal(h.rows.get('o').measurement,null);assert.equal(h.rows.size,4);
 const recommendation=[...h.rows.values()].find(r=>r.kind==='recommendation');
 assert.equal(recommendation.authority,'none');assert.notEqual(recommendation.recommendationId,'wrong');
 await h.api.observe({observationId:'second'});await h.recordRecommendation('second',rec);
 assert.equal([...h.rows.values()].filter(r=>r.kind==='evaluation').length,1);
});
