import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './core.mjs';
import { apply } from './index.mjs';

test('isolated actual triad adapter wires membership, input wake and host disposal', async () => {
  const root = mkdtempSync(join(tmpdir(), 'triad-guard-adapter-'));
  const file = join(root, 'state.json');
  const store = new Store(file);
  const p = store.create('parent', root, 'Bounded fixture', [{ id: 'R1', text: 'Fixture acceptance' }]);
  p.children = { coder: 'coder', auditor: 'auditor' }; p.status = 'running'; store.save();
  const parent = { id: 'parent', inbox: { nextStep: [], nextTurn: [] } };
  const goal = { id: 'existing', phase: 'active', activation: 'armed', revision: 5, roundsStarted: 20, maxGoalRounds: 512 };
  const originalGoal = structuredClone(goal);
  const handlers = new Map();
  const ctx = {
    agents: { get: id => id === parent.id ? parent : undefined }, goals: { get: () => goal },
    subagents: { registerProvider() {} }, agentPresets: { async register() { return () => {}; } }, tools: {},
    on(name, fn) {
      const list = handlers.get(name) ?? []; list.push(fn); handlers.set(name, list);
      return () => handlers.set(name, (handlers.get(name) ?? []).filter(x => x !== fn));
    }
  };
  const emit = (name, ...args) => Promise.all([...(handlers.get(name) ?? [])].map(fn => fn(...args)));
  async function turn(n) {
    await emit('session/event', { id: parent.id }, { type: 'turn/start', data: { turn: n } });
    await emit('session/event', { id: parent.id }, { type: 'user/message', data: { source: { kind: 'goal', round: n } } });
    return () => emit('agent/turn-stopping', { agent: parent, turn: n, signal: new AbortController().signal });
  }
  let disposed = false;
  try {
    await apply(ctx, { stateFile: file });
    await (await turn(1))();
    let released = false;
    const wait = (await turn(2))().then(() => { released = true; });
    await new Promise(resolve => setImmediate(resolve)); assert.equal(released, false);
    await emit('session/event', { id: 'unrelated' }, { type: 'turn/end', data: { reason: { kind: 'completed' } } });
    assert.equal(released, false, 'unrelated project cannot wake this Coordinator');
    const message = { id: 'human-message', source: { kind: 'human' } };
    parent.inbox.nextTurn.push(message);
    await emit('agent/inbox/inserted', { agent: parent, message }); await wait;
    assert.deepEqual(parent.inbox.nextTurn, [message]); assert.deepEqual(goal, originalGoal);
    parent.inbox.nextTurn.length = 0; // Mock native loop consumed input, not the plugin.
    await (await turn(3))();
    const secondWait = (await turn(4))();
    await emit('dispose'); disposed = true; await secondWait;
    assert.equal(handlers.get('agent/turn-stopping').length, 0);
    assert.deepEqual(goal, originalGoal);
    assert.deepEqual(new Store(file).project(p.id).requirements, p.requirements);
  } finally {
    if (!disposed) await emit('dispose');
    rmSync(root, { recursive: true });
  }
});
