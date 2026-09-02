import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickerHarness, findAll, fixture } from './component-harness.mjs';

test('native footer keeps ordinary local sessions on the original stats component',()=>{
  const h=pickerHarness(fixture());assert.equal(h.nativeRender().type,'stock-stats');
});
test('native footer never calls transport time decode time and never shows another session receipt',()=>{
  const state=fixture();state.current={provider:'codex-cli',model:'gpt-5.6-sol'};
  const h=pickerHarness(state);const registration=h.registrations.get('conversation.composer.dock');
  assert.equal(registration.config.id,'stats');assert.equal(registration.config.priority,-10);
  const receipt={wallMs:1500,firstModelMessageMs:1200,status:'completed',provider:'codex-cli',model:'gpt-5.6-sol',tokens:{input:100,output:5,uncachedInput:40,cacheRead:60,cacheWrite:null,reasoning:null}};
  const content=JSON.stringify(h.nativeRender({sessionId:'s',runs:[receipt]}));
  assert.match(content,/1.50s/);assert.match(content,/not first-token latency/);assert.match(content,/context occupancy/);
  assert.ok(!JSON.stringify(h.nativeRender({sessionId:'other',runs:[receipt]})).includes('1.50s'));
});

test('baseline: all provider rows remain available and routing uses exact opaque IDs', async () => {
  const h = pickerHarness(fixture());
  findAll(h.render(), n => n.type === 'button')[0].props.onClick();
  const rows = findAll(h.render(), n => n.props?.role === 'menuitemradio');
  assert.equal(rows.length, 3);
  rows[1].props.onClick();
  await Promise.resolve();
  assert.deepEqual(JSON.parse(JSON.stringify(h.selected)), [{ provider: 'omniroute', model: 'anthropic/claude-opus' }]);
});

test('search filters the actual component and does not change selection until a row is chosen', async () => {
  const h = pickerHarness(fixture());
  findAll(h.render(), n => n.type === 'button')[0].props.onClick();
  const search = findAll(h.render(), n => n.type === 'input' && n.props.type === 'search')[0];
  assert.ok(search, 'Model pane must contain an accessible search field');
  assert.equal(search.props['aria-label'], 'Search models and providers');
  search.props.onChange({ target: { value: 'claude' } });
  const rows = findAll(h.render(), n => n.props?.role === 'menuitemradio');
  assert.equal(rows.length, 1);
  assert.equal(h.selected.length, 0);
  assert.equal(h.state.current.model, 'local/brain');
  rows[0].props.onClick();
  await Promise.resolve();
  assert.deepEqual(JSON.parse(JSON.stringify(h.selected)), [{ provider: 'omniroute', model: 'anthropic/claude-opus' }]);
});

test('no-match state is explicit and clearing restores the full catalog', () => {
  const h = pickerHarness(fixture());
  findAll(h.render(), n => n.type === 'button')[0].props.onClick();
  const search = findAll(h.render(), n => n.type === 'input')[0];
  assert.ok(search, 'Search field must exist');
  search.props.onChange({ target: { value: 'not-a-model' } });
  const empty = h.render();
  assert.equal(findAll(empty, n => n.props?.role === 'menuitemradio').length, 0);
  assert.ok(findAll(empty, n => n.props?.role === 'status' && String(n.props.children).includes('No matching models')).length);
  search.props.onChange({ target: { value: '' } });
  assert.equal(findAll(h.render(), n => n.props?.role === 'menuitemradio').length, 3);
});

test('keyboard arrows from search focus first and last visible model without selecting', () => {
  const h = pickerHarness(fixture());
  findAll(h.render(), n => n.type === 'button')[0].props.onClick();
  const tree = h.render();
  const search = findAll(tree, n => n.type === 'input')[0];
  const target = {};
  search.props.ref.current = target;
  const focused = [];
  findAll(tree, n => n.props?.role === 'menuitemradio').forEach((row, i) => row.props.ref({ focus: () => focused.push(i) }));
  tree.props.onKeyDown({ key: 'ArrowDown', target, preventDefault() {} });
  tree.props.onKeyDown({ key: 'ArrowUp', target, preventDefault() {} });
  assert.deepEqual(focused, [0, 2]);
  assert.equal(h.selected.length, 0);
});

test('search does not hide load errors or failures and does not rewrite current reasoning', () => {
  const state = fixture();
  state.error = 'Catalog unavailable';
  state.failures = [{ id: 'missing', name: 'Unavailable provider', message: 'Authentication required' }];
  state.current.reasoningEffort = 'high';
  const h = pickerHarness(state);
  findAll(h.render(), n => n.type === 'button')[0].props.onClick();
  findAll(h.render(), n => n.type === 'input')[0].props.onChange({ target: { value: 'not-a-model' } });
  const serialized = JSON.stringify(h.render());
  assert.ok(serialized.includes('Catalog unavailable'));
  assert.ok(serialized.includes('Authentication required'));
  assert.equal(state.current.reasoningEffort, 'high');
  assert.equal(h.selected.length, 0);
});

test('long labels retain provider and authentication details in the full row tooltip', () => {
  const state = fixture();
  state.groups[1].models[0].name = 'Claude Opus unusually long model label with provider and account suffix';
  state.groups[1].models[0].description = 'Anthropic: account not connected; sign in to use this route';
  const h = pickerHarness(state);
  findAll(h.render(), n => n.type === 'button')[0].props.onClick();
  const row = findAll(h.render(), n => n.props?.role === 'menuitemradio')[1];
  assert.equal(row.props.title, [state.groups[1].name, state.groups[1].models[0].name, state.groups[1].models[0].description].join('\n'));
  assert.ok(JSON.stringify(row.props.children).includes('account not connected'));
});

test('a root opening picker exists before a session and disappears once the session picker takes over', () => {
  const h = pickerHarness(fixture());
  assert.ok(h.registrations.has('shell.overlay'), 'Opening screen requires an additive root picker');
  assert.ok(h.openingRender(undefined), 'Picker should render before a session exists');
  assert.equal(h.openingRender('session-1'), null, 'Do not duplicate the established session picker');
});
