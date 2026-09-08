// Reproducible scoped acceptance evidence and Research-folder recovery copies.
import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(root,'../..');
const home='C:/Users/scott/.dsh',research='C:/Users/scott/Desktop/Halo Stack Research';
const recovery=path.join(research,'Current Halo Configuration'),bundle=path.join(recovery,'halo-router-production-0.3.0');
const evidence=path.join(root,'evidence');await mkdir(evidence,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const run=args=>execFileSync(process.execPath,args,{cwd:repo,encoding:'utf8',maxBuffer:20*1024*1024});
await writeFile(path.join(evidence,'focused-tests.txt'),run(['--test','test/*.test.mjs','stack/halo-routing/test/*.test.mjs','stack/halo-policy-deterministic/test/*.test.mjs','stack/halo-policy-deterministic/vendor/devharmonics/test/fleet.test.mjs','stack/halo-policy-deterministic/vendor/codex-factory/test/factory-fleet.test.mjs']));
await writeFile(path.join(evidence,'gate-tests.txt'),run(['--test','stack/halo-verified-coder-dev/test/*.test.mjs','stack/halo-verified-coder/test/*.test.mjs']));
await writeFile(path.join(evidence,'protocol-tests.txt'),run(['stack/halo-router-dev/acceptance-client.mjs','--self-test']));
await writeFile(path.join(evidence,'deployment-check.json'),run(['stack/halo-router-production/promote.mjs','check']));
await writeFile(path.join(evidence,'lms-ps.json'),execFileSync('C:/Users/scott/.lmstudio/bin/lms.exe',['ps','--json'],{encoding:'utf8'}));
const configFiles=['cordis.patch.yml','profiles/web/package.json','profiles/web/cordis.patch.yml','profiles/web/pnpm-lock.yaml','.agent-presets/halo-orchestrator/agent.cordis.yml','halo-routing/controls.json','halo-routing/import-provenance.json'];
for(const relative of configFiles){const dest=path.join(root,'installed-configuration',relative);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(home,relative),dest);}
for(const name of ['status.json','controls.json','import-provenance.json'])await copyFile(path.join(home,'halo-routing',name),path.join(evidence,name));
const records=await readFile(path.join(home,'halo-routing/records.json'));
await writeFile(path.join(evidence,'records.json.gz'),gzipSync(records));
await writeFile(path.join(evidence,'records-meta.json'),JSON.stringify({at:new Date().toISOString(),sha256:hash(records),bytes:records.length,records:JSON.parse(records).length},null,2));
for(const name of ['halo-cockpit-20260908-093820.stderr.log','halo-cockpit-20260908-093852.stderr.log','halo-cockpit-20260908-093943.stderr.log','halo-cockpit-20260908-093943.stdout.log'])await copyFile(path.join(home,'logs',name),path.join(evidence,name+'.txt'));
async function files(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){if(['node_modules','.git','__pycache__'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await files(p));else out.push(p);}return out;}
const manifest=[];
async function copy(source,relative){const dest=path.join(bundle,relative);await mkdir(path.dirname(dest),{recursive:true});await copyFile(source,dest);const sha=hash(await readFile(source));if(hash(await readFile(dest))!==sha)throw Error('Copy mismatch '+dest);manifest.push(`${sha}  ${relative}`);}
for(const f of await files(root))await copy(f,path.relative(repo,f));
for(const relative of configFiles)await copy(path.join(home,relative),path.join('production-home',relative));
for(const name of ['Launch-Halo.ps1','Run-HaloCockpit.ps1'])await copy(path.join(repo,'stack',name),path.join('stack',name));
for(const name of ['HALO-CURRENT-CONFIGURATION.md','HALO-STACK-GUIDE.md','HALO-ROUTER-PRODUCTION-2026-09-08.md']){
 const source=path.join(repo,'stack',name);await copy(source,path.join('stack',name));await copyFile(source,path.join(research,name));await copyFile(source,path.join(recovery,name));
}
await writeFile(path.join(bundle,'MANIFEST-SHA256.txt'),manifest.sort().join('\n')+'\n');
const parent=path.join(recovery,'MANIFEST-SHA256.txt'),replace=new Map();
for(const f of await files(bundle))replace.set(path.relative(recovery,f),hash(await readFile(f)));
for(const name of ['HALO-CURRENT-CONFIGURATION.md','HALO-STACK-GUIDE.md','HALO-ROUTER-PRODUCTION-2026-09-08.md'])replace.set(name,hash(await readFile(path.join(recovery,name))));
const old=(await readFile(parent,'utf8')).split(/\r?\n/).filter(line=>{const m=/^[a-fA-F0-9]{64}\s+(.+)$/.exec(line);return line&&(!m||!replace.has(m[1]));});
await writeFile(parent,old.join('\n')+'\n# Production promotion '+new Date().toISOString()+'\n'+[...replace].map(([p,h])=>h+'  '+p).join('\n')+'\n');
console.log(JSON.stringify({bundle,verifiedCopies:manifest.length,at:new Date().toISOString()}));
