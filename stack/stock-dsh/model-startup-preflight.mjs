import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {parseSelectedRoute,readProviderEnvelope} from './launcher-model-route.mjs';

// Inventory only. Never starts a server, pulls a model, or sends inference.
export async function checkModelStartup({selected,providerConfig,fetchImpl=fetch,allowMissingGufo=false}) {
  const row=providerConfig?.models?.find(m=>m.id===selected.model);
  let endpoint;
  try {endpoint=new URL(row?.baseURL??providerConfig?.baseURL);}catch{}
  const local=endpoint?.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname);
  const runtime=local && endpoint.port==='1234'?'lmstudio':local && endpoint.port==='11434'?'ollama':local && endpoint.port==='8080'?'gufo':null;
  if(!runtime) return {runtime:'external',message:'External route: local residency unchanged.'};
  async function inventory(url,optional=false){
    let response;
    try {response=await fetchImpl(url,{method:'GET',signal:AbortSignal.timeout(10000)});}
    catch(error){
      if(optional && (error.code==='ECONNREFUSED'||error.cause?.code==='ECONNREFUSED')) return [];
      throw new Error(`Cannot verify model residency at ${new URL(url).origin}; startup refused without changing models.`);
    }
    if(!response.ok) throw new Error(`Model inventory at ${new URL(url).origin} returned HTTP${response.status}.`);
    const body=await response.json();
    if(new URL(url).pathname==='/v1/models' && Array.isArray(body.data)) return body.data;
    if(!Array.isArray(body.models)) throw new Error(`Invalid model inventory at ${new URL(url).origin}.`);
    return body.models;
  }
  const selectedOrigin=endpoint.origin;
  if(runtime==='gufo'){
    const ollama=await inventory('http://127.0.0.1:11434/api/ps',true);
    if(ollama.some(m=>!String(m.name??m.model??'').endsWith(':cloud')))throw new Error('An Ollama local model is resident; Gufo startup refused without unloading anything.');
    const lm=await inventory('http://127.0.0.1:1234/api/v1/models',true);
    for(const m of lm){if(!['llm','vlm'].includes(m.type))continue;if(!Array.isArray(m.loaded_instances))throw new Error('Cannot verify LM Studio residency; Gufo startup refused.');if(m.loaded_instances.length)throw new Error('An LM Studio model is resident; Gufo startup refused without unloading anything.');}
    const models=await inventory(endpoint.origin+'/v1/models',allowMissingGufo);
    if(models.length && !models.some(m=>m.id===selected.model))throw new Error('Gufo serves a different model; no server was replaced.');
    if(!models.length&&!allowMissingGufo)throw new Error('Start Gufo with Start-Gufo.ps1 before selecting this local route.');
    return {runtime,available:models.length>0,message:models.length?'Gufo selected model is available; no competing local model is resident.':'No competing local model is resident; Gufo may start.'};
  }
  if(runtime==='ollama'){
    const tags=await inventory(`${selectedOrigin}/api/tags`);
    const model=tags.find(m=>m.name===selected.model||m.model===selected.model);
    if(!model)throw new Error(`Selected Ollama model ${selected.model} is not installed; no model was downloaded or loaded.`);
    if(model.remote_model || selected.model.endsWith(':cloud')) return {runtime:'ollama-cloud',message:'Selected Ollama cloud route is available in the catalog; local residency unchanged.'};
    if((await inventory('http://127.0.0.1:8080/v1/models',true)).length)throw new Error('Gufo is resident; refusing a competing Ollama local route. Stop Gufo first.');
    const peers=await inventory('http://127.0.0.1:1234/api/v1/models',true);
    for(const peer of peers){
      if(['llm','vlm'].includes(peer.type) && !Array.isArray(peer.loaded_instances)) throw new Error('Cannot verify LM Studio loaded instances; startup refused.');
      if(['llm','vlm'].includes(peer.type) && peer.loaded_instances.length) throw new Error(`LM Studio model ${peer.key} is loaded; refusing a competing Ollama local route. No models were unloaded.`);
    }
    const residents=await inventory(`${selectedOrigin}/api/ps`);
    const other=residents.filter(m=>!String(m.name??m.model??'').endsWith(':cloud')&&m.name!==selected.model&&m.model!==selected.model);
    if(other.length) throw new Error('Another Ollama local model is loaded; startup refused without loading or unloading models.');
    return {runtime,message:'Selected Ollama model is installed; no competing local model is resident. Ollama loads the saved model on first inference.'};
  }
  if((await inventory('http://127.0.0.1:8080/v1/models',true)).length)throw new Error('Gufo is resident; refusing a competing LM Studio route. Stop Gufo first.');
  const peers=await inventory('http://127.0.0.1:11434/api/ps',true);
  if(peers.some(m=>!String(m.name??m.model??'').endsWith(':cloud'))) throw new Error('An Ollama local model is loaded; refusing a competing LM Studio route. No models were unloaded.');
  const localModels=await inventory(`${selectedOrigin}/api/v1/models`);
  const loaded=[];
  for(const model of localModels){
    if(!['llm','vlm'].includes(model.type))continue;
    if(!Array.isArray(model.loaded_instances))throw new Error('Cannot verify LM Studio loaded instances; startup refused.');
    for(const instance of model.loaded_instances)loaded.push({key:model.key,id:instance.id});
  }
  if(loaded.length>1 || loaded.some(m=>m.key!==selected.model&&m.id!==selected.model)) throw new Error('A competing LM Studio model is loaded; startup refused without loading or unloading models.');
  return {runtime,message:'No competing local model is resident; LM Studio selected-model capacity validation follows.'};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv[2]==='--gufo-start'){
      console.log(JSON.stringify(await checkModelStartup({selected:{provider:'gufo',model:process.argv[3]||'halo-gufo-qwen38-27b-q6'},providerConfig:{baseURL:'http://127.0.0.1:8080/v1'},allowMissingGufo:true})));
    }else{
    if(process.argv[2]!=='--settings-file'||!process.argv[3])throw new Error('Expected --settings-file <profile>');
    const text=fs.readFileSync(process.argv[3],'utf8'),selected=parseSelectedRoute(text);
    console.log(JSON.stringify(await checkModelStartup({selected,providerConfig:readProviderEnvelope(text,selected.provider)})));
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
