import test from 'node:test';
import assert from 'node:assert/strict';
import {checkModelStartup} from '../model-startup-preflight.mjs';
const selected={provider:'ollama-local',model:'qwen3.8:27b-q6_K'};
const providerConfig={baseURL:'http://127.0.0.1:11434/v1'};
const tags=[{name:selected.model}];
function network({lm=[],ollama=[],catalog=tags,failure}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method});
  if(failure&&url.includes(failure.port))throw Object.assign(new Error('fixture'),{cause:{code:failure.code}});
  return {ok:true,json:async()=>({models:url.endsWith('/tags')?catalog:url.includes(':1234')?lm:ollama})};
 };
 return {calls,fetchImpl};
}
test('Ollama startup reuses its selected resident or leaves loading to first inference',async()=>{
 for(const ollama of [[],[{name:selected.model}]]){
  const n=network({ollama});
  assert.equal((await checkModelStartup({selected,providerConfig,...n})).runtime,'ollama');
  assert.deepEqual(n.calls.map(c=>c.method),['GET','GET','GET']);
 }
});
test('loaded LM Studio blocks an Ollama route; loaded Ollama blocks LM Studio',async()=>{
 await assert.rejects(checkModelStartup({selected,providerConfig,...network({lm:[{type:'llm',key:'other',loaded_instances:[{id:'other'}]}]})}),/LM Studio model other is loaded/);
 await assert.rejects(checkModelStartup({selected:{provider:'lmstudio',model:'model'},providerConfig:{baseURL:'http://127.0.0.1:1234/v1'},...network({ollama:[{name:selected.model}]})}),/Ollama local model is loaded/);
});
test('missing selected model and competing Ollama residents fail without mutation',async()=>{
 await assert.rejects(checkModelStartup({selected,providerConfig,...network({catalog:[]})}),/not installed/);
 await assert.rejects(checkModelStartup({selected,providerConfig,...network({ollama:[{name:'other:local'}]})}),/Another Ollama/);
});
test('LM Studio startup rejects a different resident and accepts the exact serving identifier',async()=>{
 const route={selected:{provider:'lmstudio',model:'selected-alias'},providerConfig:{baseURL:'http://127.0.0.1:1234/v1'}};
 await assert.rejects(checkModelStartup({...route,...network({lm:[{type:'llm',key:'physical-model',loaded_instances:[{id:'other-alias'}]}]})}),/competing LM Studio model/);
 assert.equal((await checkModelStartup({...route,...network({lm:[{type:'llm',key:'physical-model',loaded_instances:[{id:'selected-alias'}]}]})})).runtime,'lmstudio');
});
test('cloud route verifies its catalog but does not require LM Studio',async()=>{
 const cloud={provider:'ollama',model:'deepseek-v4.1-flash:cloud'};
 const n=network({catalog:[{name:cloud.model,remote_model:'deepseek-v4.1-flash'}]});
 assert.equal((await checkModelStartup({selected:cloud,providerConfig,...n})).runtime,'ollama-cloud');
 assert.equal(n.calls.length,1);
});
test('refused peer connection means server off; timeouts and malformed inventory fail closed',async()=>{
 assert.equal((await checkModelStartup({selected,providerConfig,...network({failure:{port:':1234',code:'ECONNREFUSED'}})})).runtime,'ollama');
 await assert.rejects(checkModelStartup({selected,providerConfig,...network({failure:{port:':1234',code:'ETIMEDOUT'}})}),/Cannot verify/);
 await assert.rejects(checkModelStartup({selected,providerConfig,...network({lm:[{type:'llm',key:'unknown'}]})}),/Cannot verify/);
});
test('remote provider bypasses local services and model-level URLs take precedence',async()=>{
 const n=network();
 assert.equal((await checkModelStartup({selected,providerConfig:{baseURL:providerConfig.baseURL,models:[{id:selected.model,baseURL:'https://example.com/v1'}]},...n})).runtime,'external');
 assert.equal(n.calls.length,0);
});
