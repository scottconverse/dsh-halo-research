import test from 'node:test';
import assert from 'node:assert/strict';
import {createControl} from '../stack/halo-routing/control.mjs';
const catalog=[{candidateId:'local/a',provider:'local',model:'a',locality:'local',catalogState:'registered'}, {candidateId:'cloud/b',provider:'cloud',model:'b',locality:'remote',catalogState:'registered'}];
const input={sessionId:'s',role:'analysis',provider:'cloud',model:'b'};
async function setup(extra={}) {let saved;const decisions=[];const control=await createControl({read:async()=>saved,write:async v=>{saved=v},candidates:()=>catalog,recommend:async()=>({recommendedCandidateId:'local/a',evaluations:[],explanation:'qualified local candidate'}),record:async d=>decisions.push(d),...extra});return {control,decisions};}
test('automatic mode changes actual route and emits a human readable decision',async()=>{const{control,decisions}=await setup();await control.configure({sessionId:'s',settings:{mode:'automatic'}});const result=await control.resolve(input);assert.equal(result.provider,'local');assert.equal(result.model,'a');assert.equal(decisions.at(-1).status,'selected');assert.ok(result.reason);});
test('manual preserves route; per-session controls do not affect other sessions',async()=>{const{control}=await setup();await control.configure({sessionId:'s',settings:{mode:'automatic'}});assert.equal((await control.resolve({...input,sessionId:'other'})).provider,'cloud');await control.configure({sessionId:'s',settings:{mode:'manual'}});assert.equal((await control.resolve(input)).provider,'cloud');});
test('operator worker override uses full catalog without claiming qualification',async()=>{const{control,decisions}=await setup();await control.configure({sessionId:'s',settings:{mode:'automatic',worker:'cloud/b'}});const r=await control.resolve({...input,role:'structured_write',provider:'local',model:'a'});assert.equal(r.provider,'cloud');assert.equal(decisions.at(-1).status,'override');assert.match(r.reason,/operator/i);});
test('a changed ordinary picker pin overrides automatic routing',async()=>{let pin={provider:'cloud',model:'b'};const{control}=await setup({readPin:async()=>pin});await control.configure({sessionId:'s',settings:{mode:'automatic'}});assert.equal((await control.resolve(input)).provider,'local');pin={provider:'cloud',model:'another'};assert.equal((await control.resolve(input)).provider,'cloud');assert.equal(control.status('s').settings.mode,'manual');});
test('no qualified candidate falls back visibly, while local-only never leaks to cloud',async()=>{const{control}=await setup({recommend:async()=>null});await control.configure({sessionId:'s',settings:{mode:'automatic'}});assert.match((await control.resolve(input)).reason,/no qualified/i);await control.configure({sessionId:'s',settings:{scope:'local-only'}});await assert.rejects(()=>control.resolve(input),/local-only/i);});
test('local-only requests candidate filtering from the existing donor rather than selecting a remote route',async()=>{let seen;const{control}=await setup({recommend:async w=>{seen=w;return {recommendedCandidateId:'local/a'}}});await control.configure({sessionId:'s',settings:{mode:'automatic',scope:'local-only'}});assert.equal((await control.resolve(input)).provider,'local');assert.equal(seen.localOnly,true);});
test('automatic routing forwards the exact current tools to candidate projection',async()=>{let seen;const tools=[{name:'write',parameters:{type:'object'}}];const{control}=await setup({recommend:async w=>{seen=w;return {recommendedCandidateId:'local/a'}}});await control.configure({sessionId:'s',settings:{mode:'automatic'}});await control.resolve({...input,executionTools:tools});assert.deepEqual(seen.executionTools,tools);});
test('local-only cannot leak a remote manual selection',async()=>{const{control}=await setup();await control.configure({sessionId:'s',settings:{mode:'manual',scope:'local-only'}});await assert.rejects(()=>control.resolve(input),error=>error?.code==='HALO_LOCAL_ONLY');});
test('a picker pin cancels inherited default Auto persistently for that session',async()=>{let pin={provider:'cloud',model:'b'};const{control}=await setup({readPin:async()=>pin});await control.configure({settings:{mode:'automatic'}});assert.equal((await control.resolve(input)).provider,'cloud');assert.equal(control.status('s').settings.mode,'manual');pin=null;assert.equal((await control.resolve(input)).provider,'cloud');assert.equal(control.status('s').settings.mode,'manual');});
test('configuration rejects invalid and nonexistent routes; persist failure leaves previous state intact',async()=>{const{control}=await setup({write:async()=>{throw Error('disk full')}});await assert.rejects(()=>control.configure({settings:{mode:'bogus'}}),/mode/);await assert.rejects(()=>control.configure({settings:{planner:'missing'}}),/catalog/);await assert.rejects(()=>control.configure({settings:{mode:'automatic'}}),/disk full/);assert.equal(control.status().settings.mode,'manual');});
test('persisted defaults and session settings survive restart',async()=>{let saved;const opts={read:async()=>saved,write:async v=>{saved=v},candidates:()=>catalog};const a=await createControl(opts);await a.configure({settings:{mode:'automatic'}});await a.configure({sessionId:'s',settings:{mode:'manual'}});const b=await createControl(opts);assert.equal(b.status().settings.mode,'automatic');assert.equal(b.status('s').settings.mode,'manual');});

test('request image and context requirements reach the policy unchanged',async()=>{
 let seen;const {control}=await setup({recommend:async w=>{seen=w;return null;}});
 await control.configure({settings:{mode:'automatic'}});
 await control.resolve({...input,requiredCapabilities:['text','image'],requiredContextWindow:48000});
 assert.deepEqual(seen.requiredCapabilities,['text','image']);assert.equal(seen.requiredContextWindow,48000);
});
test('automatic selection cannot downgrade an image request to unknown or text-only capability',async()=>{
 const {control}=await setup();await control.configure({settings:{mode:'automatic'}});
 const actual=await control.resolve({...input,requiredCapabilities:['text','image']});
 assert.equal(actual.provider,'cloud');assert.match(actual.reason,/requirement|capabilit/i);
});
test('unknown request content preserves the DSH route instead of guessing text-only',async()=>{
 const {control}=await setup();await control.configure({settings:{mode:'automatic'}});
 assert.equal((await control.resolve({...input,requirementsKnown:false})).provider,'cloud');
});
test('synchronous decision evidence failure cannot change the selected route',async()=>{
 const {control}=await setup({record(){throw Error('disk unavailable')}});await control.configure({settings:{mode:'automatic'}});
 let actual,error;try{actual=await control.resolve(input)}catch(e){error=e}
 assert.equal(error,undefined);assert.equal(actual.provider,'local');
});

test('automatic selection checks context capacity and retains a fitting candidate',async()=>{
 for(const contextWindow of [undefined,32000,64000]){
  const {control}=await setup({candidates:()=>catalog.map(c=>({...c,contextWindow}))});
  await control.configure({settings:{mode:'automatic'}});
  assert.equal((await control.resolve({...input,requiredContextWindow:48000})).provider,contextWindow===64000?'local':'cloud');
 }
});

test('observed loaded context is not inflated by a larger catalog declaration',async()=>{
 const {control}=await setup({candidates:()=>catalog.map(c=>({...c,contextWindow:262144,executionProfile:{actual:{contextWindow:{state:'observed',value:32768}}}}))});
 await control.configure({settings:{mode:'automatic'}});
 assert.equal((await control.resolve({...input,requiredContextWindow:48000})).provider,'cloud');
});
