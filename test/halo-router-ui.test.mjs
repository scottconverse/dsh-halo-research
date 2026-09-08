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
    setInterval() { return 1; },
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
