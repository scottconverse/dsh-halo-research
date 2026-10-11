import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {parseSelectedRoute,readProviderEnvelope} from './launcher-model-route.mjs';

// Inventory only. Never starts a server, pulls a model, or sends inference.
export async function checkModelStartup({selected,providerConfig,fetchImpl=fetch}) {
  const row=providerConfig?.models?.find(m=>m.id===selected.model);
  let endpoint;
  try {endpoint=new URL(row?.baseURL??providerConfig?.baseURL);}catch{}
  const local=endpoint?.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname);
  const runtime=local && endpoint.port==='1234'?'lmstudio':local && endpoint.port==='11434'?'ollama':null;
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
    if(!Array.isArray(body.models)) throw new Error(`Invalid model inventory at ${new URL(url).origin}.`);
    return body.models;
  }
  const selectedOrigin=endpoint.origin;
  if(runtime==='ollama'){
    const tags=await inventory(`${selectedOrigin}/api/tags`);
    const model=tags.find(m=>m.name===selected.model||m.model===selected.model);
    if(!model)throw new Error(`Selected Ollama model ${selected.model} is not installed; no model was downloaded or loaded.`);
    if(model.remote_model || selected.model.endsWith(':cloud')) return {runtime:'ollama-cloud',message:'Selected Ollama cloud route is available in the catalog; local residency unchanged.'};
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
    if(process.argv[2]!=='--settings-file'||!process.argv[3])throw new Error('Expected --settings-file <profile>');
    const text=fs.readFileSync(process.argv[3],'utf8'),selected=parseSelectedRoute(text);
    console.log(JSON.stringify(await checkModelStartup({selected,providerConfig:readProviderEnvelope(text,selected.provider)})));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
