import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterModelGroups } from './source/client/filter-models.mjs';
import { fixture } from './component-harness.mjs';

test('empty search preserves every model, ordering and identity', () => {
  const { groups } = fixture();
  assert.equal(filterModelGroups(groups, '   '), groups);
});
test('matches provider label, model ID and name case-insensitively across words', () => {
  const { groups } = fixture();
  const actual = filterModelGroups(groups, ' GATEWAY   CLAUDE ');
  assert.deepEqual(actual.map(g => [g.id, g.models.map(m => m.id)]), [['omniroute', ['anthropic/claude-opus']]]);
  assert.equal(actual[0].models[0], groups[1].models[0]);
  assert.equal(filterModelGroups(groups, 'local/brain')[0].models[0], groups[0].models[0]);
});
test('provider ID and descriptions are searchable without mutating source', () => {
  const { groups } = fixture();
  const before = JSON.stringify(groups);
  assert.equal(filterModelGroups(groups, 'omniroute').flatMap(g => g.models).length, 2);
  assert.equal(filterModelGroups(groups, 'subscription')[0].models[0].id, 'anthropic/claude-opus');
  assert.equal(JSON.stringify(groups), before);
});
test('literal hostile and absent search terms return no matches, not regex or markup', () => {
  const { groups } = fixture();
  for (const query of ['.*', '<script>', '[', 'not-a-model']) assert.deepEqual(filterModelGroups(groups, query), []);
});
test('a large catalog remains complete; search has no hidden provider cap', () => {
  const groups = [{ id: 'all', name: 'All providers', models: Array.from({ length: 3000 }, (_, i) => ({ id: `model-${i}`, name: `Model ${i}` })) }];
  assert.equal(filterModelGroups(groups, '').flatMap(g => g.models).length, 3000);
  const matches = filterModelGroups(groups, 'model-2999')[0].models;
  assert.equal(matches.length, 1);
  assert.deepEqual(matches.map(m => m.id), ['model-2999']);
});
