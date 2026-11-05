import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDesktop} from './install.mjs';
test('Desktop extraction handles rc5 NSIS inner payload and previous direct payload without execution',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dsh extraction '));
 try {
  for(const wrapped of [false,true]) {
   const target=path.join(root,wrapped?'wrapped':'direct');let calls=0;
   const extract=(archive,directory)=>{
    fs.mkdirSync(directory,{recursive:true});calls++;
    if(wrapped&&calls===1) {fs.mkdirSync(path.join(directory,'$PLUGINSDIR'));fs.writeFileSync(path.join(directory,'$PLUGINSDIR/app-64.7z'),'fixture');}
    else fs.writeFileSync(path.join(directory,'DeepSeek Harness.exe'),'fixture');
   };
   const exe=extractDesktop('fixture.exe',target,extract);
   assert.equal(fs.readFileSync(exe,'utf8'),'fixture');assert.equal(calls,wrapped?2:1);
  }
  assert.throws(()=>extractDesktop('fixture.exe',path.join(root,'empty'),(_,dir)=>fs.mkdirSync(dir,{recursive:true})),/executable missing/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
