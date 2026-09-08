import {enqueueAcceptanceRequest as run} from './acceptance-client.mjs';
import {ANALYSIS_FIXTURE,BENCHMARK_FIXTURE,STRUCTURED_WRITE_FIXTURE,createStructuredWriteFixture} from '../halo-routing/qualification.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url)),home=path.join(root,'home');
const mode=process.argv[2]??'local';
const routes={local:['lmstudio','halo/qwen3-coder-30b-a3b-q4km'],claude:['claude-cli','sonnet'],codex:['codex-cli','gpt-5.6-sol']};
const records=[];
async function request(input){const r=await run(input);records.push(r);console.log(JSON.stringify({id:r.requestId,status:r.status,ms:r.durationMs,text:r.finalText?.slice(0,1000),qualification:r.qualificationRecords,recommended:r.recommendation?.recommendedCandidateId,error:r.error}));return r;}
try {
 if(mode==='recommend'){await request({action:'recommend',workload:{role:process.argv[3]??'analysis',requiredTier:'economy'}});}
 else if(mode==='gate'||mode.startsWith('write-')){
  const cwd=path.join(home,'acceptance','fixtures','structured-'+Date.now());await mkdir(cwd,{recursive:true});await createStructuredWriteFixture(cwd);
  const [provider,model]=routes[mode==='gate'?'local':mode.slice(6)];
  await request({action:mode==='gate'?'verified-coder':'root-turn',cwd,provider,model,prompt:STRUCTURED_WRITE_FIXTURE.prompt,qualification:{role:'structured_write'},timeoutMs:180000,...(mode==='gate'?{toolArguments:{description:'Unmodified DevHarmonics structured-write qualification',prompt:STRUCTURED_WRITE_FIXTURE.prompt,editable_paths:['add.py'],protected_paths:['test_add.py'],verify_executable:'python',verify_args:['test_add.py']}}:{})});
 } else {
  const [provider,model]=routes[mode==='child'?'local':mode];
  for(const f of [ANALYSIS_FIXTURE,BENCHMARK_FIXTURE])await request({action:mode==='child'?'subagent':'root-turn',cwd:home,provider,model,prompt:f.prompt,qualification:{role:f.role},timeoutMs:180000});
 }
}finally{await mkdir(path.join(root,'evidence','reuse'),{recursive:true});await writeFile(path.join(root,'evidence','reuse',`${mode}-${Date.now()}.json`),JSON.stringify({timestamp:new Date().toISOString(),mode,records},null,2)+'\n');}
if(records.some(r=>r.status!=='completed'||r.qualificationRecords?.some(q=>!q.passed)))process.exitCode=1;
