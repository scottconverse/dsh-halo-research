import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const stock=createRequire(createRequire(import.meta.url).resolve('@deepseek-ai/dsh/package.json'));
const {interruptedTurnClosers}=await import(pathToFileURL(stock.resolve('@deepseek-ai/dsh-session')));
test('interrupted command error omits the source reference forbidden by the session validator',()=>{
  const events=[{type:'command/run',seq:0,time:1,data:{commandId:'interrupted-compact',name:'compact',args:'',source:{kind:'user'}}}];
  const closer=interruptedTurnClosers(events).find(e=>e.type==='command/done');
  assert.equal(closer.data.commandId,'interrupted-compact');
  assert.equal(closer.data.kind,'error');
  assert.equal(closer.data.sourceEventSeq,undefined);
  assert.equal(closer.seq,1);
  assert.equal(interruptedTurnClosers([...events,closer]).filter(e=>e.type==='command/done').length,0);
});
