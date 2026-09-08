import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
async function rpc(method,payload={}){
 const response=await fetch('http://127.0.0.1:3085/api/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:randomUUID(),method,payload}),signal:AbortSignal.timeout(20000)});
 const body=await response.json();assert.equal(body.result?.ok,true,JSON.stringify(body.result?.error));return body.result.value;
}
const stage=process.argv[2];assert.ok(['before','unmounted','remounted'].includes(stage));
const rows=JSON.parse(await readFile('home/halo-routing/records.json','utf8'));
const ids=rows.filter(r=>r.kind==='observation').map(r=>r.observationId).sort();
const sessionId=rows.find(r=>r.kind==='observation').sessionId;
const history=await rpc('session.history',{sessionId,maxMessages:10});
const models=await rpc('llm.models');
const count=models.groups.reduce((n,g)=>n+g.models.length,0);
const proof={stage,at:new Date().toISOString(),observationIds:ids,sessionId,historyHasResponse:JSON.stringify(history).includes('HALO-ROUTER-OK'),pickerCount:count};
if(stage!=='before'){
 const before=JSON.parse(await readFile('evidence/restart-before.json','utf8'));
 assert.deepEqual(ids,before.observationIds);assert.equal(count,before.pickerCount);assert.equal(proof.historyHasResponse,true);
}
proof.pass=true;await writeFile('evidence/restart-'+stage+'.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
