import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {patchNativeTiming} from './patch.mjs';
const source=readFileSync(new URL('../dsh-tools/node_modules/.pnpm/@deepseek-ai+dsh-client-ui-_3b52d06bbf0151d0a78c1aebb65025e1/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',import.meta.url),'utf8');
function reading(bundle){const start=bundle.indexOf('function assistantStepReading(node) {'),end=bundle.indexOf('\n\t\t/**',start);return vm.runInNewContext(`(function(){function usageOutputTokens(u){return u?.outputTokens??null}; ${bundle.slice(start,end)};return assistantStepReading;})()`);}
test('actual compiled native per-message timing is unavailable while local timing is preserved',()=>{
  const fn=reading(patchNativeTiming(source));const node={timing:{stepStartTime:10,firstTokenTime:11,completedTime:110},usage:{outputTokens:20}};
  assert.equal(fn({...node,requestConfig:{provider:'codex-cli'}}).ttftMs,null);
  assert.equal(fn({...node,requestConfig:{provider:'claude-cli'}}).decodeMs,null);
  assert.equal(fn({...node,requestConfig:{provider:'lmstudio'}}).ttftMs,1);
  assert.equal(fn({...node,requestConfig:{provider:'lmstudio'}}).decodeMs,99);
});
test('unsupported or already-patched upstream bundle fails loudly',()=>{
  assert.throws(()=>patchNativeTiming('changed upstream'));
  assert.throws(()=>patchNativeTiming(patchNativeTiming(source)));
});
test('actual final-node builder uses durable provider identity, not the picker or optional requestConfig',()=>{
  const b=patchNativeTiming(source);const start=b.indexOf('function finalNode(state, context) {'),end=b.indexOf('\n\t\tfunction fallbackState',start);
  const make=vm.runInNewContext(`(function(){const _deepseek_ai_dsh_client_runtime_client={toAssistantBlocks:x=>x};${b.slice(start,end)};return finalNode;})()`);
  const build=provider=>make({turn:1,step:1,firstTokenTime:11,final:{event:{type:'assistant/message',seq:4,time:100,data:{message:{id:'m',source:{kind:'model',provider,model:'test'},content:[]}}}}},{start:{event:{time:10}}});
  assert.equal(build('codex-cli').timing.firstTokenTime,null);assert.equal(build('claude-cli').timing.firstTokenTime,null);assert.equal(build('lmstudio').timing.firstTokenTime,11);
});
