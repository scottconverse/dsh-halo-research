import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {initializeKnowledge} from './install.mjs';
const stack=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('new library renders both skill paths and refuses existing notes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"dsh knowledge 'space "));
 try {
  const result=initializeKnowledge(root);assert.equal(result.files,11);
  for(const name of ['knowledge-ingest','knowledge-query']) {
   const text=fs.readFileSync(path.join(result.skills,name,'SKILL.md'),'utf8');
   assert(!text.includes('C:/Users/scott/Documents/DSH Knowledge Library'));
   assert(!text.includes('C:\\Users\\scott\\Documents\\DSH Knowledge Library'));
   assert(text.includes(result.library.replaceAll('\\','/')));
  }
  fs.writeFileSync(path.join(result.library,'keep'),'original');
  assert.throws(()=>initializeKnowledge(root),/refusing/);
  assert.equal(fs.readFileSync(path.join(result.library,'keep'),'utf8'),'original');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('cloud bundle includes only public skill templates and initializer',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'dsh cloud bundle '));
 try{
  const output=path.join(parent,'bundle');
  const result=spawnSync(process.execPath,[path.join(stack,'portable-cloud/build.mjs'),'--output',output],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
  const bundle=JSON.parse(fs.readFileSync(path.join(output,'bundle.json')));
  assert.equal(bundle.runtimeVersion,'0.2.1-rc.5');
  for(const name of ['knowledge-ingest','knowledge-query']) assert(bundle.files.some(r=>r.path===`stack/stock-dsh/skills/${name}/SKILL.md`));
  assert(bundle.files.some(r=>r.path==='stack/shared-knowledge/install.mjs'));
  assert(!bundle.files.some(r=>/storages|sessions|credentials|node_modules/.test(r.path)));
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
