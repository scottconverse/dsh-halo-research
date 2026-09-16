// Operator startup only. Does not restrict tools, remove choices, or unload models.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// Retained legacy helper; the desktop launcher uses stock-dsh/Start-StockDSH.ps1.
export const CONTEXT_LENGTH = 131072;
export const PAIR = [
  { modelKey: 'halo/qwen3.6-35b-a3b', identifier: 'halo-brain-35b' },
  { modelKey: 'halo/qwen3-coder-30b-a3b-q4km', identifier: 'halo-coder-q4km' },
];
export async function waitForSettings(read,{attempts=90,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  for (let attempt=0;attempt<attempts;attempt++) {
    try { return await read(); } catch(error) {
      if (![404,503].includes(error.status) || attempt===attempts-1) throw error;
      await sleep(1000);
    }
  }
}
export function mergeCatalog(existing, inventory) {
  if (!Array.isArray(inventory) || !inventory.some(m=>m.type==='llm' && typeof m.key==='string' && m.key)) {
    throw Error('LM Studio inventory is empty or invalid; saved catalog retained.');
  }
  const result=structuredClone(existing || []);
  const ids=new Set(result.map(m=>m.id));
  for (const model of inventory) {
    if (model.type!=='llm' || typeof model.key!=='string' || !model.key || ids.has(model.key)) continue;
    const maximum=Number.isInteger(model.max_context_length)&&model.max_context_length>0 ? model.max_context_length : CONTEXT_LENGTH;
    // A catalog maximum is not a load setting. New entries use the existing Halo
    // 131,072-token operating declaration (or a smaller native maximum).
    result.push({id:model.key,name:`${model.display_name || model.key}${model.quantization?.name ? ' '+model.quantization.name : ''} [LM Studio discovered]`,contextWindow:Math.min(CONTEXT_LENGTH,maximum)});
    ids.add(model.key);
  }
  return result;
}

export function loadArguments(role) {
  // lms ls advertises @quant variants, but this installed CLI rejects them for
  // Hub aliases. Load the alias and verify its selected quant before and after.
  return ['load',role.modelKey,'--identifier',role.identifier,
    '--context-length',String(CONTEXT_LENGTH),'--parallel','1','--gpu','max','--no-speculative-draft-mtp','-y'];
}

function residentFor(models,role) {
  return models.find(m=>!m.deviceIdentifier && (m.modelKey===role.modelKey || m.modelKey===role.modelKey+'@q4_k_m' || m.identifier===role.identifier));
}
function assertEnvelope(model,role) {
  const correctKey=model && [role.modelKey,role.modelKey+'@q4_k_m'].includes(model.modelKey);
  if (!correctKey || model.contextLength!==CONTEXT_LENGTH || model.parallel!==1 || model.quantization?.name!=='Q4_K_M') {
    throw Error(`${role.modelKey}: loaded envelope is not verified Q4_K_M / ${CONTEXT_LENGTH} / parallel=1. No model was automatically unloaded; inspect lms ps --json.`);
  }
}

export async function synchronize(deps,{warm=false,selectBrain=false}={}) {
  const inventory=await deps.inventory();
  const description=await deps.describe();
  const provider=description.namespaces.find(n=>n.ns==='llm-pi-ai');
  if (!provider) throw Error('DSH llm-pi-ai settings namespace is unavailable.');
  const profile=provider.user?.providers?.lmstudio || provider.value?.providers?.lmstudio;
  if (!profile) throw Error('Existing LM Studio provider is missing; refusing to replace unrelated provider configuration.');
  const models=mergeCatalog(profile.models,inventory);
  const ops=[];
  if (JSON.stringify(profile.models)!==JSON.stringify(models)) ops.push({op:'set',path:['providers','lmstudio','models'],value:models});
  if (profile.displayName!=='LM Studio (local + LM Link)') ops.push({op:'set',path:['providers','lmstudio','displayName'],value:'LM Studio (local + LM Link)'});
  if (ops.length) await deps.mutate({ns:provider.ns,expectedRevision:provider.revision,ops});
  deps.log(`Picker refreshed: ${models.length} choices; existing entries and other providers preserved.`);
  if (selectBrain) {
    const selection=description.namespaces.find(n=>n.ns==='agent-default-model');
    if (!selection) throw Error('DSH default model namespace is unavailable.');
    await deps.mutate({ns:selection.ns,expectedRevision:selection.revision,ops:[
      {op:'set',path:['provider'],value:'lmstudio'},
      {op:'set',path:['model'],value:PAIR[0].modelKey},
      {op:'unset',path:['reasoningEffort']},
    ]});
    deps.log('New-session default: tuned 35B brain. Existing sessions were not modified.');
  }
  const loaded=[];
  if (warm) for (const role of PAIR) {
    const selected=inventory.find(m=>m.key===role.modelKey);
    if (selected?.quantization?.name!=='Q4_K_M') throw Error(`${role.modelKey}: selected alias quant is not Q4_K_M; no load requested.`);
    const current=residentFor(await deps.loaded(),role);
    if (current) {
      assertEnvelope(current,role);
      deps.log(`Already resident: ${role.modelKey}; no duplicate load.`);
    } else {
      deps.log(`Loading ${role.modelKey} at Q4_K_M / ${CONTEXT_LENGTH} / parallel=1...`);
      await deps.load(role);
      assertEnvelope(residentFor(await deps.loaded(),role),role);
      deps.log(`Ready: ${role.modelKey}`);
    }
    loaded.push(role.modelKey);
  }
  return {catalogCount:models.length,loaded,defaultSelected:selectBrain};
}

async function main() {
  const args=process.argv.slice(2);
  const portArg=args.indexOf('--port');
  const port=portArg<0 ? 3080 : Number(args[portArg+1]);
  if (!Number.isInteger(port)||port<1||port>65535) throw Error('Invalid DSH port.');
  const lms=path.join(os.homedir(),'.lmstudio','bin','lms.exe');
  const logDir=path.join(os.homedir(),'.dsh','logs');
  fs.mkdirSync(logDir,{recursive:true});
  const logPath=path.join(logDir,`halo-startup-${new Date().toISOString().replace(/[:.]/g,'-')}.log`);
  const log=message=>{const line=`${new Date().toISOString()} ${message}`;fs.appendFileSync(logPath,line+'\n');console.log(line);};
  const run=async argv=>{
    const result=await promisify(execFile)(lms,argv,{windowsHide:true,timeout:600000,maxBuffer:8*1024*1024});
    return result.stdout;
  };
  const json=async (url,options={})=>{
    const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw Object.assign(Error(`${url}: HTTP ${response.status}`),{status:response.status});
    return response.json();
  };
  const inventory=async()=> (await json('http://127.0.0.1:1234/api/v1/models',{
    headers:{Authorization:`Bearer ${process.env.LMSTUDIO_API_KEY || 'x'}`},
  })).models;
  const rpc=async (method,payload)=>{
    const response=await json(`http://127.0.0.1:${port}/api/${method}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'client-request',rpcId:randomUUID(),method,payload}),
    });
    if (!response.result?.ok) throw Error(`${method} rejected: ${JSON.stringify(response.result?.error || response.result)}`);
    return response.result.value;
  };
  try {
    log('Waiting for DSH settings plugin readiness (the HTML page can be ready first).');
    await waitForSettings(()=>rpc('settings.describe',{}));
    try { await inventory(); } catch {
      log('Local model API unavailable; requesting lms server start on port 1234.');
      await run(['server','start','--port','1234']);
    }
    const result=await synchronize({inventory,describe:()=>rpc('settings.describe',{}),mutate:body=>rpc('settings.mutate',body),
      loaded:async()=>JSON.parse(await run(['ps','--json'])),load:async role=>{await run(loadArguments(role));log(`CLI load returned for ${role.modelKey}; checking resident state.`);},log,
    },{warm:args.includes('--warm'),selectBrain:args.includes('--select-brain')});
    log(JSON.stringify(result));
  } catch(error) { log(`FAILED: ${error.message}`);throw error; }
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
