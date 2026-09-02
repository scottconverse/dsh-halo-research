import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultModelDirectory } from './source/client/default-directory.mjs';
import { fixture } from './component-harness.mjs';

function createStore(value) {
  return { getSnapshot: () => value, update: fn => { value = structuredClone(value); fn(value); }, subscribe: () => () => {} };
}
const ok = value => ({ result: { ok: true, value } });
function server() {
  let persisted = { provider: 'lmstudio', model: 'local/brain', reasoningEffort: 'high' };
  const writes = [];
  const api = {
    llm: { models: async () => ok({ groups: fixture().groups, failures: [] }) },
    settings: {
      describe: async () => ok({ namespaces: [{ ns: 'agent-default-model', value: { ...persisted } }] }),
      replace: async payload => { writes.push(payload); persisted = { ...payload.section }; return ok({ value: persisted }); },
    },
  };
  return { api, writes, nextSession: () => ({ ...persisted }) };
}

test('opening picker reads the complete catalog and persisted default without creating a session', async () => {
  const s = server();
  const d = createDefaultModelDirectory(s.api, createStore);
  await d.load();
  assert.deepEqual(d.store.getSnapshot().current, s.nextSession());
  assert.equal(d.store.getSnapshot().groups.flatMap(g => g.models).length, 3);
  assert.equal(s.writes.length, 0);
});
test('selection persists exact route for the next session and a fresh controller after restart', async () => {
  const s = server();
  const d = createDefaultModelDirectory(s.api, createStore);
  await d.load();
  const selected = { provider: 'omniroute', model: 'anthropic/claude-opus' };
  assert.equal(await d.select(selected), true);
  assert.deepEqual(s.writes, [{ ns: 'agent-default-model', section: selected }]);
  assert.deepEqual(s.nextSession(), selected);
  const restarted = createDefaultModelDirectory(s.api, createStore);
  await restarted.load();
  assert.deepEqual(restarted.store.getSnapshot().current, selected);
  assert.equal('reasoningEffort' in s.nextSession(), false, 'Old effort must not leak across routes');
});
test('reasoning effort is persisted only when explicitly selected', async () => {
  const s = server();
  const d = createDefaultModelDirectory(s.api, createStore);
  await d.load();
  const selected = { provider: 'omniroute', model: 'anthropic/claude-opus', reasoningEffort: 'low' };
  assert.equal(await d.select(selected), true);
  assert.deepEqual(s.nextSession(), selected);
});
test('failed persistence preserves the old selection and exposes an actionable error', async () => {
  const s = server();
  s.api.settings.replace = async () => ({ result: { ok: false, error: { message: 'Settings file is locked' } } });
  const d = createDefaultModelDirectory(s.api, createStore);
  await d.load();
  const before = d.store.getSnapshot().current;
  assert.equal(await d.select({ provider: 'omniroute', model: 'other' }), false);
  assert.deepEqual(d.store.getSnapshot().current, before);
  assert.equal(d.store.getSnapshot().error, 'Settings file is locked');
});
test('failed catalog refresh retains last good catalog and current selection', async () => {
  const s = server();
  const d = createDefaultModelDirectory(s.api, createStore);
  await d.load();
  s.api.llm.models = async () => { throw new Error('Disconnected'); };
  await d.load();
  assert.equal(d.store.getSnapshot().groups.flatMap(g => g.models).length, 3);
  assert.equal(d.store.getSnapshot().error, 'Disconnected');
});

test('missing default leaves every catalog choice available so the user can repair it', async () => {
  const s = server();
  s.api.settings.describe = async () => ok({ namespaces: [] });
  const d = createDefaultModelDirectory(s.api, createStore);
  await d.load();
  assert.equal(d.store.getSnapshot().groups.flatMap(g => g.models).length, 3);
  assert.equal(d.store.getSnapshot().current, null);
  assert.match(d.store.getSnapshot().error, /not configured/);
});

test('a late initial load cannot overwrite a newer saved route', async () => {
  const s = server();
  let finish;
  s.api.settings.describe = () => new Promise(resolve => { finish = resolve; });
  const d = createDefaultModelDirectory(s.api, createStore);
  const pending = d.load();
  const selected = { provider: 'omniroute', model: 'other' };
  await d.select(selected);
  finish(ok({ namespaces: [{ ns: 'agent-default-model', value: { provider: 'old', model: 'old' } }] }));
  await pending;
  assert.deepEqual(d.store.getSnapshot().current, selected);
});
