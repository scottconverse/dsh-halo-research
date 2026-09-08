// Bounded DEV transport/observation test. Not autonomous-task or quality evidence.
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3085';
export async function rpc(method,payload={}){const response=await fetch(base+'/api/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:randomUUID(),method,payload}),signal:AbortSignal.timeout(20000)});const body=await response.json();if(!body.result?.ok)throw Error(method+': '+JSON.stringify(body.result?.error??body));return body.result.value;}
const cwd=path.resolve('home','workspaces','HALO ROUTER DEV');await mkdir(cwd,{recursive:true});
const catalog=await rpc('llm.models');
const provider=process.argv[2]??'lmstudio';const model=process.argv[3]??'halo/qwen3-coder-30b-a3b-q4km';
const report={started:new Date().toISOString(),kind:'controlled-integration-smoke-not-quality-benchmark',provider,model,catalog:catalog.groups.map(g=>({provider:g.provider?.id??g.id,models:g.models?.length})),failures:catalog.failures};
const file=path.resolve('evidence',`live-${provider}-${Date.now()}.json`);const save=()=>writeFile(file,JSON.stringify(report,null,2)+'\n');
const {sessionId}=await rpc('session.create',{cwd,agentPreset:'halo-orchestrator'});report.sessionId=sessionId;await save();
await rpc('session.rename',{sessionId,title:'HALO ROUTER DEV — '+provider+' integration check'});
await rpc('session.selectModel',{sessionId,provider,model});
const prompt='This is a transport integration check, not a coding task. Reply exactly HALO-ROUTER-OK. Do not use tools or modify files.';
report.prompt=prompt;await rpc('session.prompt',{sessionId,mode:'queue',content:[{type:'text',text:prompt}]});
console.log(JSON.stringify({started:report.started,sessionId,provider,model,evidence:file}));
let finished=false;
try{
 for(let i=0;i<120;i++){
  const history=await rpc('session.history',{sessionId,maxMessages:10});
  report.history=history;
  try{const rows=JSON.parse(await readFile('home/halo-routing/records.json','utf8'));const own=rows.filter(r=>r.sessionId===sessionId);const ids=new Set(own.map(r=>r.observationId));report.records=rows.filter(r=>ids.has(r.observationId));const refs=new Set(report.records.map(r=>r.evaluationId).filter(Boolean));report.evaluations=rows.filter(r=>r.kind==='evaluation'&&refs.has(r.evaluationId));finished=report.records.some(r=>r.kind==='measurement');}catch{}
  if(finished)break;await new Promise(r=>setTimeout(r,1000));
 }
 if(!finished){await rpc('session.cancel',{sessionId});throw Error('DEV smoke deadline; session cancelled');}
 report.picker=await rpc('session.models',{sessionId});
 report.pass=report.records.some(r=>r.kind==='observation'&&r.actual.provider===provider&&r.actual.model===model&&r.selectionSource==='explicit')&&JSON.stringify(report.history).includes('HALO-ROUTER-OK');
 report.finished=new Date().toISOString();await save();console.log(JSON.stringify({pass:report.pass,evidence:file,recordKinds:report.records.map(r=>r.kind)}));assert.equal(report.pass,true);
}catch(error){report.error=String(error);report.finished=new Date().toISOString();await save();throw error;}
