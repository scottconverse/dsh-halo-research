import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function workspaceKey(value, platform = process.platform) {
  // Only fully qualified Windows paths: never resolve a relative path or fold case.
  if (platform !== 'win32' || typeof value !== 'string' || !(/^[a-zA-Z]:[\\/]/.test(value) || /^[\\/]{2}[^\\/]/.test(value))) return value;
  const normalized = path.win32.normalize(value);
  const root = path.win32.parse(normalized).root;
  return normalized.length > root.length ? normalized.replace(/[\\/]+$/, '') : normalized;
}
const helper = '\n// halo-workspace-path-v1: lexical Windows workspace identity; stored headers stay untouched.\nimport {win32 as haloWindowsPath} from "node:path";\n'+workspaceKey.toString().replaceAll('path.win32','haloWindowsPath')+'\n';
function once(s, old, replacement) {
  if (s.split(old).length !== 2) throw Error('Unexpected source seam: '+old.slice(0,100));
  return s.replace(old,replacement);
}
export function repair(name,s) {
  if (s.includes('// halo-workspace-path-v1:')) return s;
  if(name==='dsh-tool-session-query') {
    s=once(s,'if (header.id === caller.id) return header.cwd === caller.header.cwd;','if (header.id === caller.id) return workspaceKey(header.cwd) === workspaceKey(caller.header.cwd);');
    s=once(s,'return caller.header.cwd !== void 0 && header.cwd === caller.header.cwd;','return caller.header.cwd !== void 0 && workspaceKey(header.cwd) === workspaceKey(caller.header.cwd);');
  } else if(name==='dsh-session-query') {
    s=once(s,'case "cwd": return (record) => filter.values.includes(record.header.cwd ?? null);','case "cwd": return (record) => filter.values.some(value => workspaceKey(value) === workspaceKey(record.header.cwd ?? null));');
  } else if(name==='dsh-session-query-sqlite') {
    s=once(s,'const db = new DatabaseSync(actual);','const db = new DatabaseSync(actual);\n\tdb.function("halo_workspace_key", { deterministic: true }, value => workspaceKey(value));');
    s=once(s,'addNullableList(clauses, params, "cwd", filter.values);','addNullableList(clauses, params, "halo_workspace_key(cwd)", filter.values.map(value => workspaceKey(value)));');
  } else throw Error('Unsupported package '+name);
  return helper+s;
}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function readArchive(file) {
 const b=fs.readFileSync(file),header=JSON.parse(b.subarray(16,16+b.readUInt32LE(12)).toString());return {b,header,base:8+b.readUInt32LE(4)};
}
export function archiveEntry(a,p) {return p.split('/').reduce((n,k)=>n.files[k],a.header);}
export function archiveSource(a,p) {const e=archiveEntry(a,p);return a.b.subarray(a.base+Number(e.offset),a.base+Number(e.offset)+e.size).toString();}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 const archiveFile=process.env.HALO_DESKTOP_ARCHIVE || 'C:/Users/scott/AppData/Local/Programs/DeepSeek Harness/resources/app.asar';
 const profile=process.env.HALO_DESKTOP_PROFILE || 'C:/Users/scott/Documents/Codex/2026-09-25/dsh-desktop-eval/home/profiles/desktop';
 const backup=process.env.HALO_WORKSPACE_BACKUP || 'C:/Users/scott/Documents/Codex/2026-10-20/workspace-path-fix/backups';
 const a=readArchive(archiveFile),names=['dsh-session-query','dsh-session-query-sqlite','dsh-tool-session-query'];
 const entries=names.map(name=>{const p='dsh/node_modules/@deepseek-ai/'+name+'/lib/index.js',before=archiveSource(a,p);return {p,e:archiveEntry(a,p),before,after:repair(name,before)};});
 const tool=profile+'/node_modules/@deepseek-ai/dsh-tool-session-query/lib/index.js';const before=fs.readFileSync(tool,'utf8'),after=repair('dsh-tool-session-query',before);
 fs.mkdirSync(backup,{recursive:true});
 const planned=[...entries.map(x=>({file:archiveFile+'!/'+x.p,before:sha(x.before),after:sha(x.after)})),{file:tool,before:sha(before),after:sha(after)}];
 fs.writeFileSync(backup+'/planned.json',JSON.stringify(planned,null,2));
 if(!process.argv.includes('--apply')) {console.log('Prepared '+planned.length+' exact-match repairs; no deployment changes.');process.exit(0);}
 if(before!==after){const b=backup+'/tool.original.js';if(!fs.existsSync(b))fs.writeFileSync(b,before);fs.writeFileSync(tool,after);}
 if(entries.some(x=>x.before!==x.after)) {
  if(!fs.existsSync(backup+'/app.asar.original'))fs.copyFileSync(archiveFile,backup+'/app.asar.original');
  let offset=a.b.length-a.base;const parts=[a.b.subarray(a.base)];
  for(const x of entries){const b=Buffer.from(x.after);x.e.offset=String(offset);x.e.size=b.length;const blockSize=x.e.integrity?.blockSize??4194304;const blocks=[];for(let i=0;i<b.length;i+=blockSize)blocks.push(sha(b.subarray(i,i+blockSize)));x.e.integrity={algorithm:'SHA256',hash:sha(b),blockSize,blocks};parts.push(b);offset+=b.length;}
  const json=Buffer.from(JSON.stringify(a.header)),headerSize=8+Math.ceil(json.length/4)*4,h=Buffer.alloc(8+headerSize);h.writeUInt32LE(4,0);h.writeUInt32LE(headerSize,4);h.writeUInt32LE(headerSize-4,8);h.writeUInt32LE(json.length,12);json.copy(h,16);
  const temp=archiveFile+'.workspace-tmp';fs.writeFileSync(temp,Buffer.concat([h,...parts]));fs.renameSync(temp,archiveFile);
 }
 console.log('Applied Desktop workspace comparison repair; configuration and stored history unchanged.');
}
