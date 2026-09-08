// Short production acceptance; no qualification requests or changes to user sessions.
import {enqueueAcceptanceRequest as run} from '../halo-router-dev/acceptance-client.mjs';
import {createStructuredWriteFixture,STRUCTURED_WRITE_FIXTURE} from '../halo-routing/qualification.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const home='C:/Users/scott/.dsh';
const mode=process.argv[2]??'root-auto';
const evidence=new URL('./evidence/',import.meta.url);await mkdir(evidence,{recursive:true});
let input;
if(mode==='gate'){
 const cwd=home+'/acceptance/fixtures/production-'+Date.now();await mkdir(cwd,{recursive:true});await createStructuredWriteFixture(cwd);
 input={action:'verified-coder',provider:'lmstudio',model:'halo/qwen3-coder-30b-a3b-q4km',cwd,prompt:STRUCTURED_WRITE_FIXTURE.prompt,routingSettings:{mode:'automatic',worker:null},toolArguments:{description:'Production router worker acceptance',prompt:STRUCTURED_WRITE_FIXTURE.prompt,editable_paths:['add.py'],protected_paths:['test_add.py'],verify_executable:'python',verify_args:['test_add.py']}};
}else input={action:'root-turn',provider:'claude-cli',model:'sonnet',cwd:home,prompt:'Reply with exactly HALO-PRODUCTION-ROUTER-OK and nothing else. Do not use tools.',routingSettings:{mode:mode==='root-manual'?'manual':'automatic',planner:null}};
const result=await run({...input,timeoutMs:180000},{home});
await writeFile(new URL(`${mode}-${Date.now()}.json`,evidence),JSON.stringify(result,null,2)+'\n');
assert.equal(result.status,'completed',JSON.stringify(result.error));
const observations=result.routing.records.filter(r=>r.kind==='observation');
assert.ok(observations.some(o=>o.actual.provider===(mode==='root-manual'?'claude-cli':'lmstudio')),'Unexpected executed provider');
if(mode==='gate')assert.ok(result.routing.records.some(r=>r.kind==='outcome'&&r.result==='pass'),'Independent gate PASS missing');
else assert.ok(result.finalText.includes('HALO-PRODUCTION-ROUTER-OK'));
console.log(JSON.stringify({pass:true,mode,requestId:result.requestId,sessionId:result.parentSessionId,durationMs:result.durationMs,actual:observations.map(o=>o.actual),gate:result.routing.records.filter(r=>r.kind==='outcome').map(r=>r.result)}));
