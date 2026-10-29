import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readlink } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
const run = promisify(execFile);

// Local content identity only; never return file contents or execute Git hooks.
export async function projectFingerprint(cwd) {
  const options={windowsHide:true,timeout:10000,maxBuffer:4*1024*1024,
    env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}};
  const args=['-c','core.fsmonitor=false','-c','core.hooksPath=','-C',cwd];
  const files=(await run('git',[...args,'ls-files','--cached','--others','--exclude-standard','-z'],options)).stdout.split('\0').filter(Boolean);
  const head=(await run('git',[...args,'rev-parse','--verify','HEAD'],options)).stdout.trim();
  const status=(await run('git',[...args,'status','--porcelain=v1','--untracked-files=all','--ignore-submodules=none'],options)).stdout;
  const hash=createHash('sha256').update(head+'\0'+status+'\0');
  for(const name of [...new Set(files)].sort()) {
    const file=resolve(cwd,name),rel=relative(resolve(cwd),file);
    if(isAbsolute(rel)||rel==='..'||rel.startsWith('../')||rel.startsWith('..\\')) throw Error('Git path outside project');
    hash.update(name+'\0');
    let stat;try{stat=await lstat(file);}catch(e){if(e.code==='ENOENT'){hash.update('deleted\0');continue;}throw e;}
    if(stat.isSymbolicLink()){hash.update('link:'+await readlink(file));continue;}
    if(!stat.isFile()){hash.update('non-file\0');continue;}
    hash.update(String(stat.mode)+'\0');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    const after=await lstat(file);
    if(stat.size!==after.size||stat.mtimeMs!==after.mtimeMs||stat.ctimeMs!==after.ctimeMs) throw Error('Project changed during fingerprint');
    hash.update('\0');
  }
  return hash.digest('hex');
}
