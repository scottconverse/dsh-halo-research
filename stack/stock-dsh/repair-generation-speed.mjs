import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const root='C:/Users/scott/Desktop/Code/dsh-halo-research/stack/stock-dsh/node_modules/.pnpm';
const backup=process.env.HALO_SPEED_BACKUP_DIR || 'C:/Users/scott/Documents/Codex/2026-10-15/dsh-speed-reporting';
const desktop='C:/Users/scott/AppData/Local/Programs/DeepSeek Harness/resources/app.asar';
const packages=['dsh-session-stats','dsh-client-ui-chat','dsh-client-ui-trajectory'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function once(s,a,b){const count=s.split(a).length-1;if(count!==1)throw Error('Expected exactly one source match: '+a.slice(0,70)+'; got '+count);return s.replace(a,b);}
export function repair(name,s){
 if(s.includes('halo-measured-text-speed-v1'))return s;
 if(name==='dsh-session-stats'){
  s=once(s,'stateVersion: 1,','stateVersion: 2,');
  s=once(s,'if (outputTokens !== null) {','if (outputTokens !== null && event.time > firstToken && !event.data.message.content.some(block => block.type === "tool-call")) {');
 }else if(name==='dsh-client-ui-chat'){
  s=once(s,'outputTokens: usageOutputTokens(node.usage)','outputTokens: node.blocks.some(block => block.kind === "tool-call") ? null : usageOutputTokens(node.usage)');
  if(s.split('"{tps} tok/s"').length-1!==2)throw Error("Unexpected throughput locale count");
  s=s.replaceAll('"{tps} tok/s"','"{tps} tok/s (text)"');
 }else{
  s=once(s,'function throughput(metrics, t) {','function throughput(metrics, t) {\n\t\t\tif (metrics.hasToolCalls) return "Not measurable (tool-call delivery)";');
  s=once(s,'usageProvided: usage !== void 0,','hasToolCalls: node.blocks.some(block => block.kind === "tool-call"),\n\t\t\t\tusageProvided: usage !== void 0,');
 }
 return s+'\n// halo-measured-text-speed-v1: exclude tool-call delivery from inferred decode rate.\n';
}
function readAsar(){const b=fs.readFileSync(desktop);const header=JSON.parse(b.subarray(16,16+b.readUInt32LE(12)).toString());return{b,header,base:8+b.readUInt32LE(4)};}
function entry(h,p){return p.split('/').filter(Boolean).reduce((n,k)=>n.files[k],h);}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
const originals={};const files=[];
for(const name of process.argv.includes('--desktop-only')?[]:packages){const tail='node_modules/@deepseek-ai/'+name+'/lib/'+(name==='dsh-session-stats'?'index.js':'client.js');const matches=fs.readdirSync(root).filter(n=>n.startsWith('@deepseek-ai+')).map(n=>path.join(root,n,tail)).filter(p=>fs.existsSync(p));const unique=[...new Set(matches.map(p=>fs.realpathSync(p)))];if(!unique.length)throw Error('Missing Web '+name);for(const p of unique){const before=fs.readFileSync(p);originals[name]??=before.toString();const after=Buffer.from(repair(name,before.toString()));files.push({name,p,before,after});}}
const archive=process.argv.includes('--web-only')?null:readAsar();const entries=(archive?packages:[]).map(name=>{const p='dsh/node_modules/@deepseek-ai/'+name+'/lib/'+(name==='dsh-session-stats'?'index.js':'client.js');const e=entry(archive.header,p);const before=archive.b.subarray(archive.base+Number(e.offset),archive.base+Number(e.offset)+e.size);return{name,p,e,before,after:Buffer.from(repair(name,before.toString()))};});
for(const f of files){const p=path.join(backup,'web-'+f.name+'.original.js');if(!fs.existsSync(p))fs.writeFileSync(p,f.before);}
for(const f of entries){const p=path.join(backup,'desktop-'+f.name+'.original.js');if(!fs.existsSync(p))fs.writeFileSync(p,f.before);}
fs.writeFileSync(path.join(backup,'planned-files.json'),JSON.stringify([...files,...entries].map(({name,p,before,after})=>({name,p,original:sha(before),patched:sha(after)})),null,2));
if(!process.argv.includes('--apply')){console.log('Prepared exact-match repairs for '+files.length+' Web files and '+entries.length+' Desktop files; no runtime files changed.');process.exit(0);}
for(const f of files)fs.writeFileSync(f.p,f.after);
if(entries.some(f=>!f.before.equals(f.after))){
 const backupPath=path.join(backup,'app.asar.before-speed-repair');if(!fs.existsSync(backupPath))fs.copyFileSync(desktop,backupPath);
 const payload=archive.b.subarray(archive.base);let offset=payload.length;const parts=[payload];
 for(const f of entries){f.e.offset=String(offset);f.e.size=f.after.length;const blockSize=f.e.integrity?.blockSize??4194304;const blocks=[];for(let i=0;i<f.after.length;i+=blockSize)blocks.push(sha(f.after.subarray(i,i+blockSize)));f.e.integrity={algorithm:'SHA256',hash:sha(f.after),blockSize,blocks};parts.push(f.after);offset+=f.after.length;}
 const json=Buffer.from(JSON.stringify(archive.header));const headerSize=8+Math.ceil(json.length/4)*4;const h=Buffer.alloc(8+headerSize);h.writeUInt32LE(4,0);h.writeUInt32LE(headerSize,4);h.writeUInt32LE(headerSize-4,8);h.writeUInt32LE(json.length,12);json.copy(h,16);const temp=desktop+'.speed-repair-tmp';fs.writeFileSync(temp,Buffer.concat([h,...parts]));fs.renameSync(temp,desktop);
}
console.log('Applied scoped Web/Desktop speed reporting repair; original archive and files backed up.');

}
