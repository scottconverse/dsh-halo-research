import test from 'node:test';
import assert from 'node:assert/strict';
import { tunePayload, wrapAdapter } from './qwen27-sampling.mjs';
const model = { provider: 'lmstudio-library', id: 'halo/qwen3.8-27b-q4km', baseUrl: 'http://127.0.0.1:1234/v1' };
test('Off and thinking payloads retain tools, limits, and truthful effort', () => {
  const original = { reasoning_effort: 'none', max_tokens: 16384, tools: [{ name: 'read' }] };
  const off = tunePayload(original, model);
  assert.equal(off.temperature, .7); assert.equal(off.top_p, .8); assert.equal(off.presence_penalty, 1.5);
  assert.equal(off.reasoning_effort, 'none'); assert.equal(off.max_tokens, 16384); assert.equal(off.tools, original.tools);
  assert.equal(original.temperature, undefined);
  for (const effort of [undefined, 'low', 'medium', 'xhigh']) {
    const thinking = tunePayload({reasoning_effort: effort}, model);
    assert.equal(thinking.temperature, 1); assert.equal(thinking.top_p, .95); assert.equal(thinking.presence_penalty, 0);
    assert.equal(thinking.reasoning_effort, effort);
  }
});
test('other endpoints, routes and models pass through unchanged', () => {
  const body = {reasoning_effort: 'none'};
  for (const changed of [{baseUrl:'https://example.com/v1'}, {provider:'ollama'}, {id:'halo/qwen3.6-35b-a3b'}])
    assert.equal(tunePayload(body, {...model,...changed}), body);
});
test('adapter bridge uses per-call snapshot, composes hook, and restores on disposal', async () => {
  const seen = [];
  const snapshot = {models: {async streamSimple(m,c,o) {return o.onPayload({reasoning_effort: c},m);}}};
  const adapter = { streamWithSnapshot(o,s) {return s.models.streamSimple(model,o.effort,{onPayload: p=>({...p,max_tokens:16384})});} };
  const original = adapter.streamWithSnapshot;
  const undo = wrapAdapter(adapter, fields=>seen.push(fields));
  const [off,medium] = await Promise.all(['none','medium'].map(effort=>adapter.streamWithSnapshot({provider:model.provider,model:model.id,effort},snapshot)));
  assert.equal(off.temperature,.7); assert.equal(medium.temperature,1); assert.equal(off.max_tokens,16384);
  assert.equal(seen.length,2); assert.equal(Object.hasOwn(snapshot.models,'onPayload'),false);
  undo(); assert.equal(adapter.streamWithSnapshot,original);
});
