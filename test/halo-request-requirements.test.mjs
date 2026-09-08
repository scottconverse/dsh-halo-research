import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestRequirements} from '../stack/halo-routing/request-route.mjs';
test('uses current DSH projection including images nested in tool results',()=>{
 const session={deriveMessages:()=>[{content:[{type:'text',text:'inspect'},{type:'tool-result',content:[{type:'image',attachment:{id:'opaque'}}]}]}]};
 const requirements=requestRequirements(session,{measure:s=>{assert.equal(s,session);return {totalTokens:21000}}},8192);
 assert.deepEqual(requirements,{requiredCapabilities:['text','image'],requirementsKnown:true,requiredContextWindow:29192});
});
test('missing projection and unrecognized future blocks do not become text-only certainty',()=>{
 assert.equal(requestRequirements({}).requirementsKnown,false);
 assert.equal(requestRequirements({deriveMessages:()=>[{content:[{type:'future-media'}]}]}).requirementsKnown,false);
});
test('known plain text works without meter and no content is returned to the policy',()=>{
 const requirements=requestRequirements({deriveMessages:()=>[{content:[{type:'text',text:'private data'}]}]});
 assert.deepEqual(requirements,{requiredCapabilities:['text'],requirementsKnown:true});
 assert.equal(JSON.stringify(requirements).includes('private data'),false);
});
test('broken meter does not lose known image requirements',()=>{
 const requirements=requestRequirements({deriveMessages:()=>[{content:[{type:'image'}]}]},{measure(){throw Error('offline')}});
 assert.deepEqual(requirements.requiredCapabilities,['text','image']);
});
