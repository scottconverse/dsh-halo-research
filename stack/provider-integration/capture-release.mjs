// Read-only production inspection plus local evidence/backup-copy rehearsal.
// Does not start services, change settings, or request inference.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import YAML from './tools/node_modules/yaml/dist/index.js';
const stack=path.resolve(import.meta.dirname,'..'),live=path.join(os.homedir(),'.dsh');
const backup=path.join(live,'backups/native-provider-promotion-20260902');
const out=path.join(import.meta.dirname,'evidence');fs.mkdirSync(out,{recursive:true});
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
async function rpc(method){const r=await fetch('http://127.0.0.1:3080/api/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:randomUUID(),method,payload:{}}),signal:AbortSignal.timeout(10000)});const body=await r.json();assert.equal(body.result?.ok,true,method);return body.result.value;}
const report={captured:new Date().toISOString(),health:[],checks:{},hashes:[]};
for(const url of ['http://127.0.0.1:3080','http://127.0.0.1:3090/api/status','http://127.0.0.1:1234/v1/models','http://127.0.0.1:20130/api/settings/require-login']){const r=await fetch(url,{signal:AbortSignal.timeout(10000)});report.health.push({url,status:r.status});assert.equal(r.status,200,url);}
const sessions=(await rpc('session.list')).items,baseline=read(path.join(backup,'session-baseline.json'));
report.sessions={before:baseline.length,current:sessions.length,missing:baseline.filter(s=>!sessions.some(c=>c.sessionId===s.sessionId)).map(s=>s.sessionId),running:sessions.filter(s=>s.running).length};
assert.equal(report.sessions.missing.length,0);
const settings=await rpc('settings.describe');report.default=settings.namespaces.find(n=>n.ns==='agent-default-model').value;
assert.equal(report.default.provider,'lmstudio');assert.equal(report.default.model,'halo/qwen3.6-35b-a3b');
const catalog=await rpc('llm.models');report.catalog=catalog.groups.map(g=>({id:g.provider?.id??g.id,count:g.models?.length}));report.catalogFailures=catalog.failures;assert.equal(catalog.failures?.length??0,0);
const beforeSettings=YAML.parse(fs.readFileSync(path.join(backup,'settings.yaml'),'utf8'));
const nowSettings=YAML.parse(fs.readFileSync(path.join(live,'settings.yaml'),'utf8'));
const withoutRouter=structuredClone(nowSettings);delete withoutRouter['llm-pi-ai'].providers.omniroute;
assert.deepEqual(withoutRouter,beforeSettings);report.checks.settingsAdditiveOnly=true;
const originalPatch=YAML.parse(fs.readFileSync(path.join(backup,'profiles/web/cordis.patch.yml'),'utf8'));
const patch=YAML.parse(fs.readFileSync(path.join(live,'profiles/web/cordis.patch.yml'),'utf8'));
assert.equal(patch.length,originalPatch.length+1);assert.deepEqual(patch.slice(0,-1),originalPatch);report.checks.originalProfileRetained=true;
for(const [canonical,installed] of [['halo-settings.yaml','settings.yaml'],['web-profile.package.json','profiles/web/package.json'],['web-cockpit.patch.yml','profiles/web/cordis.patch.yml'],['mission-control/mission-control.mjs','mission-control/mission-control.mjs']]){assert.equal(hash(path.join(stack,canonical)),hash(path.join(live,installed)),canonical);report.hashes.push({file:canonical,sha256:hash(path.join(stack,canonical)),matchesInstalled:true});}
for(const file of ['cli-provider.mjs','cli-runtime.mjs','cli-metrics.mjs','native-continuity.mjs','Start-Provider.ps1'])report.hashes.push({file:'provider-integration/'+file,sha256:hash(path.join(import.meta.dirname,file))});
for(const file of fs.readdirSync(path.join(stack,'packages')).filter(f=>/halo-(dev-search\.4|native-metrics\.2|selection\.3)\.tgz$/.test(f)))report.hashes.push({file:'packages/'+file,sha256:hash(path.join(stack,'packages',file))});
report.runtime={node:path.join(live,'provider-runtime/node.exe'),nodeSha256:hash(path.join(live,'provider-runtime/node.exe')),omniroute:read(path.join(import.meta.dirname,'tools/node_modules/omniroute/package.json')).version};
// Backup integrity plus separate scratch copies; never restores live targets.
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'halo-rollback-proof-'));
const rows=read(path.join(backup,'rollback-manifest.json')).map((row,i)=>{assert.equal(hash(row.backup),row.sha256);const copy=path.join(scratch,String(i));fs.copyFileSync(row.backup,copy);assert.equal(hash(copy),row.sha256);return{target:row.target,backup:row.backup,sha256:row.sha256,copyVerified:true};});
fs.writeFileSync(path.join(out,'recovery-check.json'),JSON.stringify({captured:new Date().toISOString(),scratch,rows,liveRollbackPerformed:false,pass:true},null,2)+'\n');
report.pass=true;fs.writeFileSync(path.join(out,'release-state.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
