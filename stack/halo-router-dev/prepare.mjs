import {readFile,writeFile,mkdir,readdir,stat,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../..');
const prod=path.join(process.env.USERPROFILE,'.dsh');
const home=path.join(here,'home');
const sha=b=>createHash('sha256').update(b).digest('hex');
async function files(dir){let out=[];try{for(const d of await readdir(dir,{withFileTypes:true})){if(d.name==='node_modules'||d.name==='.git')continue;const p=path.join(dir,d.name);if(d.isDirectory())out.push(...await files(p));else if(d.isFile())out.push(p);}}catch(e){if(e.code!=='ENOENT')throw e;}return out;}
const report=path.join(here,'evidence','production-baseline.json');
if(process.argv.includes('--verify')){
 const baseline=JSON.parse(await readFile(report,'utf8'));let changed=[];
 for(const row of baseline.files){try{if(sha(await readFile(row.path))!==row.sha256)changed.push(row.path);}catch{changed.push(row.path);}}
 console.log(JSON.stringify({checked:baseline.files.length,changed}));if(changed.length)process.exitCode=1;
}else{
 await mkdir(path.dirname(report),{recursive:true});
 try{await stat(report);throw new Error('Baseline exists; use --verify, never silently replace it');}catch(e){if(e.code!=='ENOENT')throw e;}
 const selected=[...await files(path.join(prod,'profiles','web')),...await files(path.join(prod,'.agent-presets')),...await files(path.join(repo,'stack','halo-orchestrator')),...await files(path.join(repo,'stack','halo-verified-coder')),...await files(path.join(repo,'stack','provider-integration')),...await files(path.join(process.env.USERPROFILE,'.lmstudio','hub','models','halo'))];
 for(const p of [path.join(prod,'settings.yaml'),path.join(repo,'stack','Run-HaloCockpit.ps1')])try{await stat(p);selected.push(p);}catch{}
 const rows=[];for(const p of [...new Set(selected)].sort())rows.push({path:p,sha256:sha(await readFile(p))});
 await writeFile(report,JSON.stringify({createdAt:new Date().toISOString(),repo,head:execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),initialStatus:execFileSync('git',['-C',repo,'status','--short'],{encoding:'utf8'}),files:rows},null,2)+'\n');
 await mkdir(path.join(home,'profiles','web'),{recursive:true});
 for(const name of ['package.json','cordis.yml','cordis.patch.yml','pnpm-lock.yaml','pnpm-workspace.yaml'])await copyFile(path.join(prod,'profiles','web',name),path.join(home,'profiles','web',name));
 await copyFile(path.join(prod,'settings.yaml'),path.join(home,'settings.yaml'));
 for(const src of await files(path.join(prod,'.agent-presets'))){const dest=path.join(home,'.agent-presets',path.relative(path.join(prod,'.agent-presets'),src));await mkdir(path.dirname(dest),{recursive:true});await copyFile(src,dest);}
 await mkdir(path.join(here,'workspaces'),{recursive:true});
 console.log(JSON.stringify({baselineFiles:rows.length,home,configCopied:true}));
}
