import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {repair} from './workspace-path-patch.mjs';
export function webQueryFiles(root=path.dirname(fileURLToPath(import.meta.url))) {
 const req=createRequire(fs.realpathSync(path.join(root,'node_modules/@deepseek-ai/dsh/package.json')));
 return ['dsh-session-query','dsh-session-query-sqlite','dsh-tool-session-query'].map(name=>({name,file:req.resolve('@deepseek-ai/'+name)}));
}
export function patchWeb({root,backup,apply=false}={}) {
 const files=webQueryFiles(root).map(x=>{const before=fs.readFileSync(x.file,'utf8');return {...x,before,after:repair(x.name,before)};});
 const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
 const planned=files.map(x=>({name:x.name,file:x.file,before:sha(x.before),after:sha(x.after),changed:x.before!==x.after}));
 if(apply){if(!backup)throw Error('A recovery backup directory is required');fs.mkdirSync(backup,{recursive:true});for(const x of files.filter(x=>x.before!==x.after)){const saved=path.join(backup,x.name+'.original.js');if(fs.existsSync(saved)&&fs.readFileSync(saved,'utf8')!==x.before)throw Error('Existing backup differs: '+saved);if(!fs.existsSync(saved))fs.writeFileSync(saved,x.before);}fs.writeFileSync(path.join(backup,'planned.json'),JSON.stringify(planned,null,2));for(const x of files.filter(x=>x.before!==x.after))fs.writeFileSync(x.file,x.after);}
 return planned;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){console.log(JSON.stringify(patchWeb({apply:process.argv.includes('--apply'),backup:process.env.HALO_WEB_WORKSPACE_BACKUP}),null,2));}
