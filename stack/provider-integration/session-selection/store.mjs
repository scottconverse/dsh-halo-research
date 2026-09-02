import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
function file(sessionId){
 const home=process.env.DSH_HOME||path.join(process.env.USERPROFILE,'.dsh');
 return path.join(home,'model-selections',createHash('sha256').update(sessionId).digest('hex')+'.json');
}
export function readSelection(sessionId){
 const target=file(sessionId);if(!fs.existsSync(target))return undefined;
 const value=JSON.parse(fs.readFileSync(target,'utf8'));
 if(!value||typeof value.provider!=='string'||typeof value.model!=='string'||!value.provider||!value.model||value.reasoningEffort!==undefined&&typeof value.reasoningEffort!=='string')throw Error('Invalid saved session model selection. Preserve the file and recover it.');
 return value;
}
export function saveSelection(sessionId,value){
 const target=file(sessionId);fs.mkdirSync(path.dirname(target),{recursive:true});
 const temp=target+'.'+randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(value));fs.renameSync(temp,target);
}
