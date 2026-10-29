import test from 'node:test';
import assert from 'node:assert/strict';
import { installNoProgressGuard } from './no-progress-guard.mjs';

function fixture() {
  const handlers = new Map();
  const goal = { id: 'same-goal', revision: 5, phase: 'active', activation: 'armed', roundsStarted: 20, maxGoalRounds: 512 };
  const coordinator = { id: 'coordinator', inbox: { nextStep: [], nextTurn: [] } };
  const emit = (name, ...args) => Promise.all((handlers.get(name) ?? []).map(fn => fn(...args)));
  const ctx = { goals: { get: () => goal }, on(name, fn) {
    const list = handlers.get(name) ?? []; list.push(fn); handlers.set(name, list);
    return () => handlers.set(name, (handlers.get(name) ?? []).filter(x => x !== fn));
  } };
  const dispose = installNoProgressGuard(ctx, id => ['coordinator', 'coder'].includes(id) ? { role: id, projectId: 'p' } : undefined);
  async function begin(turn, { tools = false, human = false } = {}) {
    await emit('session/event', { id: coordinator.id }, { type: 'turn/start', data: { turn } });
    await emit('session/event', { id: coordinator.id }, { type: 'user/message', data: { source: human ? { kind: 'human' } : { kind: 'goal', round: turn } } });
    if (tools) await emit('session/event', { id: coordinator.id }, { type: 'tool/call', data: { turn, name: typeof tools === 'string' ? tools : 'triad_control' } });
    const abort = new AbortController();
    return { stop: () => emit('agent/turn-stopping', { agent: coordinator, turn, signal: abort.signal }), abort };
  }
  return { goal, coordinator, emit, begin, dispose };
}
async function waiting(f) {
  await (await f.begin(1)).stop();
  const second = await f.begin(2);
  let finished = false;
  const result = second.stop().then(() => { finished = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false, 'second empty automatic turn must wait without another model request');
  return { result, abort: second.abort };
}
test('normal queued input releases wait; goal and inbox preserved', async () => {
  const f = fixture(); const before = structuredClone(f.goal); const w = await waiting(f);
  const message = { id: 'human-1', source: { kind: 'human' } };
  f.coordinator.inbox.nextTurn.push(message);
  await f.emit('agent/inbox/inserted', { agent: f.coordinator, message });
  await w.result; assert.deepEqual(f.goal, before); assert.deepEqual(f.coordinator.inbox.nextTurn, [message]); f.dispose();
});
test('worker terminal event releases wait in same project', async () => {
  const f = fixture(); const w = await waiting(f);
  await f.emit('session/event', { id: 'coder' }, { type: 'turn/end', data: { reason: { kind: 'completed' } } });
  await w.result; f.dispose();
});
test('abort and disposal release waits without goal mutation', async () => {
  for (const mode of ['abort', 'dispose']) {
    const f = fixture(); const before = structuredClone(f.goal); const w = await waiting(f);
    if (mode === 'abort') w.abort.abort(); else f.dispose();
    await w.result; assert.deepEqual(f.goal, before); f.dispose();
  }
});
test('goal change releases wait, preserving native new revision', async () => {
  const f = fixture(); const w = await waiting(f); f.goal.revision++; f.goal.phase = 'paused';
  await f.emit('goal/changed', { agent: f.coordinator }); await w.result;
  assert.equal(f.goal.phase, 'paused'); assert.equal(f.goal.revision, 6); f.dispose();
});
test('human work, tool work, and pending input do not wait', async () => {
  for (const options of [{ human: true }, { tools: true }, { pending: true }]) {
    const f = fixture(); await (await f.begin(1)).stop(); const next = await f.begin(2, options);
    if (options.pending) f.coordinator.inbox.nextTurn.push({ id: 'queued' });
    await next.stop(); f.dispose();
  }
});
test('native cap, disarmed and terminal states are not held', async () => {
  for (const override of [{ roundsStarted: 512 }, { activation: 'disarmed' }, { phase: 'blocked' }, { phase: 'complete' }]) {
    const f = fixture(); Object.assign(f.goal, override); await (await f.begin(1)).stop(); await (await f.begin(2)).stop(); f.dispose();
  }
});

test('read-only status tool churn waits without another charged goal round', async () => {
  const f = fixture(); const before = structuredClone(f.goal);
  await (await f.begin(1, { tools: 'triad_status' })).stop();
  const next = await f.begin(2, { tools: 'get_goal' });
  let ended = false; const wait = next.stop().then(() => { ended = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(ended, false);
  await f.emit('session/event', { id: 'coder' }, { type: 'turn/end', data: { reason: { kind: 'completed' } } });
  await wait; assert.deepEqual(f.goal, before); f.dispose();
});
