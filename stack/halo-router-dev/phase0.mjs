import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const req=createRequire(import.meta.url);
const dshReq=createRequire(req.resolve('@deepseek-ai/dsh/package.json'));
const agentReq=createRequire(dshReq.resolve('@deepseek-ai/dsh-agent'));
const {Context}=await import(pathToFileURL(agentReq.resolve('@deepseek-ai/cordis')));
const {installModelSelection}=await import(pathToFileURL(dshReq.resolve('@deepseek-ai/dsh-agent')));
const records=[];
for(const pin of [false,true])for(const observerFirst of [false,true]){
 const ctx=new Context();const selection={current:pin?{provider:'test',model:'explicit'}:undefined,assembled:undefined};
 let observed;let delegated=0;
 const observe=()=>ctx.on('agent/request',async(_p,next)=>{const result=await next();observed=result;return result;});
 if(observerFirst)observe();const dispose=installModelSelection(ctx,selection);if(!observerFirst)observe();
 await ctx.waterfall('system-prompt/assemble',{}, {},()=>Promise.resolve({variables:{}}));
 const result=await ctx.waterfall('agent/request',{agent:{},turn:0,step:0,signal:new AbortController().signal},()=>{delegated++;return Promise.resolve({provider:'test',model:'default'});});
 assert.equal(result.model,pin?'explicit':'default');assert.equal(delegated,1);
 records.push({pin,observerFirst,observed:observed.model,actual:result.model,delegated});dispose();
}
// Prove error isolation without swallowing/repeating downstream work.
const ctx=new Context();let calls=0;let telemetryFailures=0;
ctx.on('agent/request',async(_p,next)=>{const config=await next();try{throw Error('observer failure');}catch{telemetryFailures++;}return config;});
const resolved=await ctx.waterfall('agent/request',{},()=>{calls++;return Promise.resolve({provider:'test',model:'kept'});});assert.equal(resolved.model,'kept');assert.equal(calls,1);
await assert.rejects(ctx.waterfall('agent/request',{},()=>{calls++;return Promise.reject(Error('downstream failure'));}),/downstream failure/);assert.equal(calls,2);assert.equal(telemetryFailures,1);
const output={at:new Date().toISOString(),dsh:dshReq.resolve('@deepseek-ai/dsh-agent'),cordis:agentReq.resolve('@deepseek-ai/cordis'),records,downstreamCalledOnce:true,observerFailureIsolated:true,downstreamFailurePreserved:true};
await mkdir(new URL('./evidence/',import.meta.url),{recursive:true});await writeFile(new URL('./evidence/phase0-waterfall.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
