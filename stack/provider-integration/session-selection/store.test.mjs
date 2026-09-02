import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import vm from 'node:vm';
import {readSelection,saveSelection} from './store.mjs';import {patchSelection} from './patch.mjs';
test('exact per-session selection persists independently of global default and rejects corrupt state',t=>{
 const previous=process.env.DSH_HOME,dir=fs.mkdtempSync(path.join(os.tmpdir(),'halo-picker-'));process.env.DSH_HOME=dir;
 t.after(()=>{if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;fs.rmSync(dir,{recursive:true,force:true});});
 assert.equal(readSelection('s1'),undefined);saveSelection('s1',{provider:'codex-cli',model:'gpt-5.6-terra',reasoningEffort:'high'});saveSelection('s2',{provider:'claude-cli',model:'sonnet'});
 assert.equal(readSelection('s1').reasoningEffort,'high');assert.equal(readSelection('s2').provider,'claude-cli');
 saveSelection('broken',{provider:4});assert.throws(()=>readSelection('broken'),/Invalid/);
});
test('actual compiled getter restores saved selection and setter commits before publishing',()=>{
 const source=fs.readFileSync(new URL('../dsh-tools/node_modules/.pnpm/@deepseek-ai+dsh-host-apipr_59108f441fb214ee94c40ab75c436a3b/node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js',import.meta.url),'utf8');
 const patched=patchSelection(source),start=patched.indexOf('function selectionFor(agent)'),end=patched.indexOf('\n\t/** Pre-publication',start);
 const saved=new Map(),sandbox={selections:new WeakMap(),readSelection:id=>saved.get(id),saveSelection:(id,v)=>saved.set(id,v),installModelSelection:()=>{},defaults:{defaultModelSelection:()=>({provider:'local',model:'default'})}};
 vm.createContext(sandbox);vm.runInContext(patched.slice(start,end)+'; this.getSelection=selectionFor;',sandbox);
 const agent=()=>({session:{id:'s',requestHeader:()=>undefined},ctx:{}});
 sandbox.getSelection(agent()).current={provider:'claude-cli',model:'sonnet'};
 assert.equal(sandbox.getSelection(agent()).current.model,'sonnet');assert.throws(()=>patchSelection(patched),/Unsupported/);
});
