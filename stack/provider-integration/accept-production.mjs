// Bounded live production integration smoke, not a coding-quality benchmark.
import fs from 'node:fs';import path from 'node:path';import {randomUUID,createHash} from 'node:crypto';
const home=path.join(process.env.USERPROFILE,'.dsh'),out=path.join(import.meta.dirname,'evidence/production-acceptance.json');fs.mkdirSync(path.dirname(out),{recursive:true});
async function rpc(method,payload={}){const rpcId=randomUUID();const b=await(await fetch('http://127.0.0.1:3080/api/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId,method,payload}),signal:AbortSignal.timeout(30000)})).json();if(!b.result?.ok)throw Error(JSON.stringify(b.result?.error));return b.result.value;}
const before=JSON.parse(fs.readFileSync(path.join(home,'backups/native-provider-promotion-20260902/session-baseline.json'),'utf8'));
const current=(await rpc('session.list')).items,settings=await rpc('settings.describe'),saved=settings.namespaces.find(n=>n.ns==='agent-default-model').value;
const catalog=await rpc('llm.models');
const report={started:new Date().toISOString(),existingSessions:before.length,missingSessions:before.filter(s=>!current.some(c=>c.sessionId===s.sessionId)).map(s=>s.sessionId),catalog:catalog.groups.map(g=>({id:g.provider?.id??g.id,provider:g.provider,count:g.models?.length})),catalogFailures:catalog.failures,runs:[]};
const save=()=>fs.writeFileSync(out,JSON.stringify(report,null,2));save();
try{
for(const [provider,model] of [['claude-cli','sonnet'],['codex-cli','gpt-5.6-terra']]){
 const cwd=path.join(home,'native-cli/acceptance',`${provider}-${Date.now()}`);fs.mkdirSync(cwd,{recursive:true});
 const {sessionId}=await rpc('session.create',{cwd,agentPreset:'halo-orchestrator'});await rpc('session.selectModel',{sessionId,provider,model});
 const row={provider,model,sessionId,turns:[]};report.runs.push(row);save();
 for(const prompt of ['Production integration smoke only. Remember ORBIT-41973 for this conversation. Reply ACK. Do not run tools or modify files.','What exact nonce did I give you? Reply only with the nonce. No tools.']){
  await rpc('session.prompt',{sessionId,mode:'queue',content:[{type:'text',text:prompt}]});
  const until=Date.now()+120000;let found=false;
  while(Date.now()<until){const data=await(await fetch('http://127.0.0.1:3080/halo-dev/cli-metrics?sessionId='+sessionId)).json();if(data.runs.length>row.turns.length){row.turns.push(data.runs.at(-1));found=true;break;}await new Promise(r=>setTimeout(r,1000));}
  if(!found){await rpc('session.cancel',{sessionId});throw Error('Production smoke deadline');}save();
 }
 const dir=path.join(home,'native-cli/receipts'),records=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))).filter(r=>r.sessionId===sessionId&&r.purpose==='coding').sort((a,b)=>a.started.localeCompare(b.started));
 row.proof=records.map(r=>({continuity:r.continuity,final:r.result.final}));row.pass=records.length===2&&records.every(r=>r.result.ok)&&records[1].continuity.resumed&&records[1].result.final.includes('ORBIT-41973')&&records[0].result.threadId===records[1].result.threadId;save();console.log(JSON.stringify({provider,pass:row.pass}));
}
}finally{await rpc('settings.replace',{ns:'agent-default-model',section:saved});report.defaultRestored=saved;report.finished=new Date().toISOString();save();}
report.pass=report.missingSessions.length===0&&report.runs.length===2&&report.runs.every(r=>r.pass);save();console.log(JSON.stringify({pass:report.pass,existingSessions:report.existingSessions,missing:report.missingSessions.length}));if(!report.pass)process.exitCode=1;
