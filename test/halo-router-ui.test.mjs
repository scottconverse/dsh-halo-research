import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const sourcePath = new URL('../stack/halo-routing/ui/client.js', import.meta.url);

async function loadClient(React) {
  const source = await readFile(sourcePath, 'utf8');
  const context = {
    clearInterval() {},
    console,
    setInterval(fn) { React.__timers?.push(fn); return 1; },
    window: {
      addEventListener() {},
      removeEventListener() {},
      __ModuleLoader__: {
        load(definition) {
          context.module = definition.factory((name) => {
            assert.equal(name, 'react');
            return React;
          });
        },
      },
    },
  };
  vm.runInNewContext(source, context, {filename: sourcePath.pathname});
  return context.module;
}

function reactHarness(states = []) {
  let stateIndex = 0;
  return {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) { return {type, props: props || {}, children}; },
    useCallback(callback) { return callback; },
    useEffect() {},
    useMemo(factory) { return factory(); },
    useRef(value) { return {current: value}; },
    useState(initial) {
      const value = stateIndex < states.length ? states[stateIndex] : initial;
      stateIndex += 1;
      return [value, () => {}];
    },
  };
}

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join(' ');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';
  return (node.children || []).map(textContent).join(' ');
}

function elements(node, type, found = []) {
  if (Array.isArray(node)) {
    for (const child of node) elements(child, type, found);
    return found;
  }
  if (!node || typeof node !== 'object') return found;
  if (node.type === type) found.push(node);
  for (const child of node.children || []) elements(child, type, found);
  return found;
}

test('formats structured routes and bounds a large searchable catalog without dropping the saved override', async () => {
  const client = await loadClient(reactHarness());
  const {formatDecisionEndpoint, visibleCandidates, routerBadge, humanRoleLabel, shortReason} = client.__test;
  assert.equal(formatDecisionEndpoint({provider: 'claude-cli', model: 'sonnet'}), 'claude-cli / sonnet');
  assert.equal(formatDecisionEndpoint({provider: 'codex-cli', model: 'gpt', reasoningEffort: 'high'}), 'codex-cli / gpt · high');
  const candidates = Array.from({length: 2747}, (_, index) => ({candidateId: `c${index}`, provider: 'provider', model: `model-${index}`}));
  const shown = visibleCandidates(candidates, 'model-2746', 'c1200', 40);
  assert.ok(shown.length <= 40);
  assert.ok(shown.some(({candidateId}) => candidateId === 'c1200'));
  assert.ok(shown.some(({candidateId}) => candidateId === 'c2746'));
  assert.equal(routerBadge(null, 'loading'), 'Loading');
  assert.equal(routerBadge(null, 'error'), 'Unavailable');
  assert.equal(humanRoleLabel('analysis'), 'Planner');
  assert.equal(humanRoleLabel('structured_write'), 'Coding worker');
  assert.equal(shortReason('literal donor reason', 140), 'literal donor reason');
});

test('shows the latest selection compactly with human role labels and full reason in disclosure', async () => {
  const longReason = 'Qualified local donor evidence '.repeat(12).trim();
  const snapshot = {
    version: '0.3.0',
    settings: {mode: 'automatic', scope: 'local-first', planner: null, worker: null},
    defaults: {mode: 'manual', scope: 'local-first'},
    sessionSpecific: true,
    candidates: [],
    recent: [{
      decisionId: 'decision-1',
      timestamp: '2026-09-08T12:00:00.000Z',
      role: 'structured_write',
      status: 'selected',
      from: {provider: 'claude-cli', model: 'sonnet'},
      to: {provider: 'lmstudio', model: 'coder'},
      reason: longReason,
    }, ...Array.from({length: 7}, (_, index) => ({
      decisionId: `older-${index}`,
      timestamp: '2026-09-08T11:00:00.000Z',
      role: 'analysis',
      status: 'selected',
      from: {provider: 'claude-cli', model: 'sonnet'},
      to: {provider: 'lmstudio', model: `planner-${index}`},
      reason: `Literal older reason ${index}`,
    }))],
  };
  const React = reactHarness([true, 'ready', snapshot, null, false, '', '', 0]);
  const client = await loadClient(React);
  const props = {remote: {haloRouting: {}}, sessions: {list: {getSnapshot: () => ({current: 'session-1'})}}};
  const tree = client.RouterOverlay({...props, placement: 'header'});
  assert.equal(tree.props.style.position, 'relative', 'session controls occupy a native header slot, not an overlay over Session log');
  const text = textContent(tree);
  assert.match(text, /Model selected for request/);
  assert.match(text, /Coding worker/);
  assert.match(text, /Earlier model selections \(6\)/);
  assert.doesNotMatch(text, /Recent actual decisions/);
  const disclosures = elements(tree, 'details');
  assert.ok(disclosures.length >= 2);
  assert.ok(disclosures.every((disclosure) => disclosure.props.open === undefined));
  assert.ok(textContent(disclosures[0]).includes(longReason));
});

// A hook lifecycle renderer: state/ref identity, dependency comparison, effect
// cleanup and post-render effects match the React contracts used by this client.
function lifecycleHarness() {
  const slots = []; let cursor = 0; let dirty = false; let effects = []; let render;
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const React = {
    __timers: [],
    Fragment: Symbol('Fragment'), createElement: (type, props, ...children) => ({type, props: props || {}, children}),
    useState(initial) { const i = cursor++; slots[i] ??= {value: initial}; return [slots[i].value, (v) => { slots[i].value = typeof v === 'function' ? v(slots[i].value) : v; dirty = true; }]; },
    useRef(value) { const i = cursor++; slots[i] ??= {current: value}; return slots[i]; },
    useMemo(factory, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = {deps, value: factory()}; return slots[i].value; },
    useCallback(fn, deps) { return React.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { const old = slots[i]; slots[i] = {deps}; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  return {React, mount(fn) { render = fn; return this.flush(); }, flush() { do { dirty = false; cursor = 0; this.tree = render(); const pending = effects; effects = []; pending.forEach(fn => fn()); } while (dirty); return this.tree; }};
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
const uiSnapshot = (mode = 'automatic', worker = null) => ({version: '0.3.0', settings: {mode, scope: 'local-first', worker, planner: null}, defaults: {}, candidates: [], recent: []});
async function raceFixture() {
  const hooks = lifecycleHarness(); const client = await loadClient(hooks.React);
  let id = 'A'; const listeners = new Set(); const loads = [], saves = [];
  const api = {status(request) { const d = deferred(); loads.push({request, ...d}); return d.promise; }, configure(request) { const d = deferred(); saves.push({request, ...d}); return d.promise; }};
  const sessions = {list: {getSnapshot: () => ({current: id}), subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }}};
  hooks.mount(() => client.RouterOverlay({remote: {haloRouting: api}, sessions, placement: 'header'}));
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); hooks.flush(); };
  const field = (name) => elements(hooks.tree, 'select').find(x => x.props.id === name);
  const click = (label) => elements(hooks.tree, 'button').find(x => textContent(x) === label).props.onClick();
  elements(hooks.tree, 'button')[0].props.onClick(); hooks.flush();
  return {hooks, loads, saves, settle, field, click, poll() { hooks.React.__timers.at(-1)(); hooks.flush(); }, switchTo(next) { id = next; listeners.forEach(fn => fn()); hooks.flush(); }};
}

test('session switch hides stale controls and ignores late status and save responses', async () => {
  const f = await raceFixture(); f.loads[0].resolve(uiSnapshot('automatic', 'worker-A')); await f.settle();
  f.field('halo-router-mode').props.onChange({target: {value: 'manual'}}); f.hooks.flush();
  f.switchTo('B');
  assert.ok(!f.field('halo-router-mode') || f.field('halo-router-mode').props.disabled, 'A controls must not be usable while B is loading');
  f.loads.at(-1).resolve(uiSnapshot('manual', 'worker-B')); await f.settle();
  f.saves[0].resolve(uiSnapshot('manual', 'worker-A')); await f.settle();
  assert.equal(f.field('halo-router-worker').props.value, 'worker-B', 'late A save must not overwrite B');
  f.field('halo-router-mode').props.onChange({target: {value: 'automatic'}}); await f.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(f.saves.at(-1).request)), {sessionId: 'B', settings: {mode: 'automatic'}}, 'save only the edited field, not a stale whole snapshot');
});

test('older load failures and responses cannot overwrite a newer save', async () => {
  const f = await raceFixture(); f.loads[0].resolve(uiSnapshot()); await f.settle();
  f.poll(); const oldLoad = f.loads.at(-1);
  f.field('halo-router-mode').props.onChange({target: {value: 'manual'}});
  f.hooks.flush(); f.saves[0].resolve(uiSnapshot('manual')); await f.settle();
  oldLoad.reject(new Error('stale polling failure')); await f.settle();
  assert.equal(f.field('halo-router-mode').props.value, 'manual');
  assert.doesNotMatch(textContent(f.hooks.tree), /stale polling failure/);
  assert.equal(elements(f.hooks.tree, 'div').filter(x => x.props.role === 'alert').length, 0, 'obsolete polling errors must not replace a successful save');
});

test('late status response from an earlier visit cannot overwrite a return to that session', async () => {
  const f = await raceFixture(); const firstA = f.loads[0]; f.switchTo('B'); f.switchTo('A');
  f.loads.at(-1).resolve(uiSnapshot('manual', 'new-A')); await f.settle();
  firstA.resolve(uiSnapshot('automatic', 'old-A')); await f.settle();
  assert.equal(f.field('halo-router-worker').props.value, 'new-A');
});

test('polls and queued duplicate edits are suppressed during save; late poll success stays obsolete', async () => {
  const f = await raceFixture(); f.loads[0].resolve(uiSnapshot()); await f.settle();
  f.poll(); const poll = f.loads.at(-1); const edit = f.field('halo-router-mode').props.onChange;
  edit({target: {value: 'manual'}}); edit({target: {value: 'automatic'}}); f.hooks.flush();
  const count = f.loads.length; f.poll();
  assert.equal(f.loads.length, count, 'poll cannot race an in-flight save');
  assert.equal(f.saves.length, 1, 'queued duplicate edits cannot race the first save');
  f.saves[0].resolve(uiSnapshot('manual')); await f.settle();
  poll.resolve(uiSnapshot('automatic')); await f.settle();
  assert.equal(f.field('halo-router-mode').props.value, 'manual');
});

test('late save failure from the old session cannot show an error in the new session', async () => {
  const f = await raceFixture(); f.loads[0].resolve(uiSnapshot()); await f.settle();
  f.field('halo-router-mode').props.onChange({target: {value: 'manual'}}); f.hooks.flush(); f.switchTo('B');
  f.loads.at(-1).resolve(uiSnapshot()); await f.settle();
  f.saves[0].reject(new Error('old session save failed')); await f.settle();
  assert.equal(elements(f.hooks.tree, 'div').filter(x => x.props.role === 'alert').length, 0);
  assert.equal(f.field('halo-router-mode').props.disabled, false);
});

test('the actual remote configure codec permits a single-field patch and rejects an invalid field', async () => {
  const client = await loadClient(reactHarness()); let descriptors;
  const remote = {$mount: async (definition) => { descriptors = definition.descriptors; return () => {}; }};
  const effects = [];
  client.apply({effect(fn) { effects.push(fn()); }, get() { return remote; }, inject() {}});
  await Promise.all(effects);
  const codec = descriptors.find(x => x.method === 'configure').parameters[0].codec.schema;
  assert.deepEqual(codec.parse({sessionId: 'B', settings: {mode: 'manual'}}), {sessionId: 'B', settings: {mode: 'manual'}});
  assert.deepEqual(codec.parse({settings: {worker: null}}), {settings: {worker: null}});
  assert.throws(() => codec.parse({settings: {scope: 'remote-only'}}), /scope is invalid/);
});
