import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {executionCandidates} from '../halo-routing/execution-candidates.mjs';
import {enrichLocal,localRuntime} from '../halo-routing/catalog.mjs';
import {recommend} from '../halo-policy-deterministic/index.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),directory=path.join(root,'evidence/reuse');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const stage=process.argv[2]??'before';assert.ok(['before','after'].includes(stage));
const exports=[];for(const f of await readdir(directory))if(/^(local|claude|codex|gate|write-claude|write-codex)-\d+\.json$/.test(f))exports.push(await json(path.join(directory,f)));
const modes=['local','claude','codex','gate','write-claude','write-codex'];let qualifications=0;const runs=[];
for(const mode of modes){const group=exports.filter(e=>e.mode===mode).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)).at(-1);assert.ok(group,mode);
 for(const receipt of group.records){assert.equal(receipt.status,'completed');assert.ok(receipt.qualificationRecords.length);
  for(const q of receipt.qualificationRecords){assert.equal(q.passed,true,`${mode}/${q.role}`);assert.ok(q.executionFingerprint);qualifications++;}
  const expected=mode.includes('claude')?'claude-cli':mode.includes('codex')?'codex-cli':'lmstudio';
  const expectedModel=expected==='claude-cli'?'sonnet':expected==='codex-cli'?'gpt-5.6-sol':'halo/qwen3-coder-30b-a3b-q4km';
  for(const r of receipt.routing.records.filter(r=>r.kind==='observation')){assert.equal(r.actual.provider,expected,'router must not alter actual provider');assert.equal(r.actual.model,expectedModel,'router must not alter actual model');}
  if(mode==='gate'){assert.ok(receipt.routing.records.some(r=>r.kind==='outcome'&&r.result==='pass'));assert.match(receipt.finalText,/HALO VERIFIED CODER: PASS/);}
  runs.push({mode,requestId:receipt.requestId,durationMs:receipt.durationMs,qualifications:receipt.qualificationRecords.map(q=>({role:q.role,passed:q.passed,executionFingerprint:q.executionFingerprint}))});
 }}
assert.equal(qualifications,9);
const rows=await json(path.join(root,'home/halo-routing/records.json'));
const census=await json(path.join(root,'home/halo-routing/candidate-reconciliation.json'));
const candidates=executionCandidates(census.candidates,rows,enrichLocal(await localRuntime()));
const decisions={};for(const role of ['analysis','structured_write']){const r=recommend({workload:{role,requiredTier:'economy'},candidates,qualifications:rows.filter(r=>r.kind==='qualification')});assert.equal(r.recommendedCandidateId,'lmstudio/halo/qwen3-coder-30b-a3b-q4km');decisions[role]=r.recommendedCandidateId;}
const qualificationHash=createHash('sha256').update(JSON.stringify(rows.filter(r=>r.kind==='qualification'))).digest('hex');
const response=await fetch('http://127.0.0.1:3085/api/llm.models',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:randomUUID(),method:'llm.models',payload:{}})});
const body=await response.json();assert.equal(body.result?.ok,true);const pickerCount=body.result.value.groups.reduce((n,g)=>n+g.models.length,0);
const report={at:new Date().toISOString(),stage,pass:true,qualifications,runs,decisions,qualificationHash,pickerCount};
if(stage==='after'){const before=await json(path.join(directory,'validated-before.json'));assert.equal(qualificationHash,before.qualificationHash);assert.equal(pickerCount,before.pickerCount);assert.deepEqual(decisions,before.decisions);}
await writeFile(path.join(directory,`validated-${stage}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,stage,qualifications,decisions,pickerCount,qualificationHash}));
