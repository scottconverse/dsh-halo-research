import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deriveProfile} from '../stack/halo-routing/profile.mjs';
// The module is introduced with its smallest interface, then assertions drive behavior.
import {executionCandidates} from '../stack/halo-routing/execution-candidates.mjs';
test('current runtime and exact observed tool/reasoning profile feed donor identity',()=>{
 const candidate={candidateId:'lmstudio/a',provider:'lmstudio',model:'a',executionClass:'lmstudio',contextWindow:32768};
 const live={contextWindow:32768,parallelSlots:1,quantization:'Q4_K_M'};
 const profile=deriveProfile({...candidate,reasoningMode:'off',tools:[{name:'read',parameters:{type:'object'}}]},live);
 const rows=[{kind:'measurement',sequence:0},{kind:'measurement',sequence:1,executionProfileObservation:{phase:'post-terminal',profile}}];
 const before=executionCandidates([candidate],rows,new Map([['a',live]]));
 assert.equal(before[0].executionFingerprint,profile.fingerprint);
 const changed=executionCandidates([candidate],rows,new Map([['a',{...live,parallelSlots:2}]]));
 assert.notEqual(changed[0].executionFingerprint,profile.fingerprint);
 assert.equal(executionCandidates([candidate],[],new Map())[0].executionFingerprint,undefined);
});
test('an active request projects the exact current tool schema instead of the historical schema',()=>{
 const candidate={candidateId:'lmstudio/a',provider:'lmstudio',model:'a',executionClass:'lmstudio',contextWindow:32768};
 const live={contextWindow:32768,parallelSlots:1,quantization:'Q4_K_M'};
 const historicalTools=[{name:'read',parameters:{type:'object'}}];
 const currentTools=[{name:'write',parameters:{type:'object',required:['path']}}];
 const historical=deriveProfile({...candidate,reasoningMode:'off',tools:historicalTools},live);
 const rows=[{kind:'measurement',sequence:1,executionProfileObservation:{phase:'post-terminal',profile:historical}}];
 const projected=executionCandidates([candidate],rows,new Map([['a',live]]),{tools:currentTools})[0];
 const expected=deriveProfile({...candidate,reasoningMode:'off',tools:currentTools},live);
 assert.equal(projected.executionFingerprint,expected.fingerprint);
 assert.notEqual(projected.executionFingerprint,historical.fingerprint);
});
