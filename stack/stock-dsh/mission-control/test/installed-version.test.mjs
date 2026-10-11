import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../mission-control.mjs',import.meta.url),'utf8');
const snippet=source.slice(source.indexOf('let lmVersionCache ='),source.indexOf('// ─────────────────────────── LM Link'));
test('installed executable version takes precedence over stale migration metadata and caches by mtime',async()=>{
 let calls=0;
 const c={fs:{existsSync:()=>true,statSync:()=>({mtimeMs:1})},path,process:{env:{ProgramFiles:'C:/Program Files'}},HOME:'C:/Users/test',safeExecFile:async()=>{calls++;return {stdout:'0.4.21.0\n'};}};
 vm.createContext(c);vm.runInContext(snippet+';this.read=lmStudioAppVersion',c);
 assert.equal(await c.read(),'0.4.21.0 (installed executable)');
 assert.equal(await c.read(),'0.4.21.0 (installed executable)');assert.equal(calls,1);
});
test('missing executable stays unavailable rather than using unrelated historical version',async()=>{
 const c={fs:{existsSync:()=>false},path,process:{env:{}},HOME:'C:/Users/test'};
 vm.createContext(c);vm.runInContext(snippet+';this.read=lmStudioAppVersion',c);assert.equal(await c.read(),null);
});
test('live Windows executable version probe', {skip:!process.env.HALO_LIVE_VERSION_TEST}, async()=>{
 const run=promisify(execFile);
 const c={fs,path,process,HOME:process.env.USERPROFILE,safeExecFile:(_name,args,opts)=>run('C:/Program Files/PowerShell/7/pwsh.exe',args,opts)};
 vm.createContext(c);vm.runInContext(snippet+';this.read=lmStudioAppVersion',c);
 const version=await c.read();assert.match(version,/^\d+\.\d+\.\d+.*\(installed executable\)$/);console.log('Verified LM Studio:',version);
});
