import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {NativeContinuity} from './native-continuity.mjs';
const id='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const user=text=>({role:'user',content:[{type:'text',text}]});
const assistant=text=>({role:'assistant',content:[{type:'text',text}]});
const options={provider:'codex-cli',model:'gpt-test',sessionId:'test-session',system:'scope',messages:[user('Remember BLUE-713')]};
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'halo-continuity-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {dir,store:new NativeContinuity(dir)};}
function completed(store,plan,text='Remembered'){store.finish(plan,{ok:true,status:'completed',threadId:id},text);}
test('successful next turn resumes exact native thread with only new request, including after restart',t=>{
 const {dir,store}=fixture(t);const first=store.plan(options,'C:/fixture','BOOTSTRAP');completed(store,first);
 const next=new NativeContinuity(dir).plan({...options,messages:[...options.messages,assistant('Remembered'),user('What was it?')]},'C:/fixture','FULL HISTORY');
 assert.equal(next.resumeId,id);assert.match(next.prompt,/What was it/);assert.ok(!next.prompt.includes('BLUE-713'));
});
test('provider, model, workspace, branch and edited history do not inherit a future native thread',t=>{
 for(const change of [{provider:'claude-cli'},{model:'other'},{sessionId:'fork'},{messages:[user('Changed request')]},{cwd:'C:/different'}]){
   const {store}=fixture(t);completed(store,store.plan(options,'C:/fixture','boot'));
   const p=store.plan({...options,messages:[...options.messages,assistant('Remembered'),user('Continue')],...change},change.cwd??'C:/fixture','new');assert.equal(p.resumeId,undefined);store.finish(p,{ok:false,status:'cancelled'},'');
 }
});
test('failed native work is not automatically retried and does not become a ready checkpoint',t=>{
 const {store}=fixture(t);const p=store.plan(options,'C:/fixture','boot');store.finish(p,{ok:false,status:'timeout',threadId:id},'Partial');
 const next=store.plan(options,'C:/fixture','new');assert.equal(next.resumeId,undefined);store.finish(next,{ok:false},'');
 assert.throws(()=>store.checkpoint({...options,purpose:'compaction'},'C:/fixture'),/completed|ready|thread/i);
});
test('DSH checkpoint preserves an exact archive and resumes native context without replay',t=>{
 const {dir,store}=fixture(t);completed(store,store.plan(options,'C:/fixture','boot'));
 const checkpoint=store.checkpoint({...options,purpose:'compaction',messages:[...options.messages,user('Summarize now')]},'C:/fixture');
 assert.match(checkpoint,/HALO_NATIVE_CHECKPOINT:/);assert.match(checkpoint,/archive/i);
 const reminder={...user('Catalog changed'),source:{kind:'plugin'}};
 const resumed=new NativeContinuity(dir).plan({...options,messages:[user(checkpoint),user('Recall the code'),reminder]},'C:/fixture','old');
 assert.equal(resumed.resumeId,id);assert.match(resumed.prompt,/Recall the code/);assert.ok(!resumed.prompt.includes('Summarize now'));
});
test('concurrent turns in the same DSH session cannot share a native thread',t=>{
 const {store}=fixture(t);const p=store.plan(options,'C:/fixture','boot');assert.throws(()=>store.plan(options,'C:/fixture','boot'),/active|running/i);store.finish(p,{ok:false},'');
});
test('checkpoint does not discard repeated user wording or multiple newly queued messages',t=>{
 const {store}=fixture(t),old={...user('continue'),id:'old'};
 completed(store,store.plan({...options,messages:[old]},'C:/fixture','boot'));
 const summary=store.checkpoint({...options,messages:[old,user('summarize')]},'C:/fixture');
 const p=store.plan({...options,messages:[user(summary),old,{...user('continue'),id:'new'},user('and verify')]},'C:/fixture','boot');
 assert.equal(p.resumeId,id);assert.match(p.prompt,/continue/);assert.match(p.prompt,/and verify/);
});
