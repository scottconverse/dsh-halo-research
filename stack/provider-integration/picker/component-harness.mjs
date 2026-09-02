import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// A deterministic component-logic harness, not a browser or accessibility audit.
export function pickerHarness(state) {
  let component, exports, cursor = 0;
  const registrations = new Map();
  const cells = [];
  const react = {
    createElement: (type,props)=>({type,props}),
    useState(initial) { const at = cursor++; if (!(at in cells)) cells[at] = initial; return [cells[at], value => { cells[at] = value; }]; },
    useRef(initial) { const at = cursor++; if (!(at in cells)) cells[at] = { current: initial }; return cells[at]; },
    useId: () => 'test-picker', useMemo: fn => fn(), useEffect: () => {},
    useSyncExternalStore: (_subscribe, get) => get(),
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const modules = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '@deepseek-ai/cordis': { Service: class {} },
    '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore: initial => {
      let value = initial;
      return { getSnapshot: () => value, subscribe: () => () => {}, update: fn => { value = structuredClone(value); fn(value); } };
    } },
    '@deepseek-ai/dsh-client-ui-primitives': new Proxy({}, { get: (_o, name) => String(name) }),
  };
  const sandbox = { window: { __ModuleLoader__: { load(def) { exports = def.factory(name => {
    if (!(name in modules)) throw new Error(`Unexpected browser dependency: ${name}`);
    return modules[name];
  }); } } }, queueMicrotask: fn => fn(), document: { activeElement: null }, Node: class {} };
  sandbox.document.querySelector = () => ({});
  vm.runInNewContext(readFileSync(new URL('package/lib/client.js', import.meta.url), 'utf8'), sandbox);
  let dictionaries;
  const connection = { api: {
    settings: { describe: async () => ({ result: { ok: true, value: { namespaces: [{ ns: 'agent-default-model', value: state.current }] } } }) },
    llm: { models: async () => ({ result: { ok: true, value: { groups: state.groups, failures: [] } } }) },
  } };
  const scope = {
    effect: fn => fn(), plugin: () => {}, inject: (names, fn) => { if (names[0] === 'slots') fn(scope); },
    get: name => name === 'connection' ? connection : undefined,
    on: () => () => {}, remote: { $on: () => () => {} },
    sessions: { list: { getSnapshot: () => ({ current: undefined }), subscribe: () => () => {} } },
    locale: { register: (_ns, value) => { dictionaries = value; }, bind: () => key => key },
    slots: { inject: (_slot, fn) => fn(), register: (config, render) => {
      registrations.set(config.name, { config, render });
      if (config.name === 'conversation.input.model') component = render;
      return () => {};
    } },
  };
  exports.apply(scope);
  const selected = [];
  const props = {
    locked: false, available: true, directory: { subscribe: () => () => {}, getSnapshot: () => state },
    load() {}, select: async selection => { selected.push(selection); return true; },
    t: (key, params = {}) => (dictionaries.en[key] ?? key).replace(/\{(\w+)\}/g, (_m, name) => params[name] ?? ''),
  };
  const render = () => { cursor = 0; return component(props); };
  const openingRender = current => {
    const opening = registrations.get('shell.overlay');
    if (!opening) return undefined;
    cursor = 0;
    return opening.render({ ...props, sessions: { getSnapshot: () => ({ current }), subscribe: () => () => {} } });
  };
  const nativeRender=(data=null,sessionId='s')=>{
    cursor=0;cells[0]=data;cells[1]='';
    return registrations.get('conversation.composer.dock')?.render({...props,sessionId,getOriginal:()=> 'stock-stats'});
  };
  return { render, selected, state, props, registrations, openingRender,nativeRender };
}
export function findAll(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(node => findAll(node, predicate));
  return [...(predicate(tree) ? [tree] : []), ...findAll(tree.props?.children, predicate)];
}
export const fixture = () => ({
  current: { provider: 'lmstudio', model: 'local/brain' }, routable: true,
  groups: [
    { id: 'lmstudio', name: 'Local LM Studio', models: [{ id: 'local/brain', name: 'Qwen Brain' }] },
    { id: 'omniroute', name: 'Gateway cloud', models: [
      { id: 'anthropic/claude-opus', name: 'Claude Opus', description: 'Anthropic cloud subscription' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
    ] },
  ], failures: [], status: 'ready', error: null,
});
