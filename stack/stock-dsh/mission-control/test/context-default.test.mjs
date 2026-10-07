import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Evaluate only the relevant production expressions; never start the server.
const source = fs.readFileSync(new URL('../mission-control.mjs', import.meta.url), 'utf8');
const brainDeclaration = source.slice(source.indexOf('const DAILY_BRAIN ='), source.indexOf('const DAILY_WORKER ='));
const brain = new Function('path', 'HOME', `${brainDeclaration}; return DAILY_BRAIN;`)({ join: (...parts) => parts.join('/') }, 'fixture');

test('missing manual-load context uses the approved context; explicit choices remain intact', () => {
  const expression = source.match(/const ctxN = (.+);/)[1];
  const normalize = new Function('ctx', 'DAILY_BRAIN', `return ${expression};`);
  assert.equal(brain.context, 65536);
  for (const value of [undefined, null, NaN, 0, -1]) assert.equal(normalize(value, brain), 65536);
  assert.equal(normalize(32768, brain), 32768);
  assert.equal(normalize(65536, brain), 65536);
  assert.equal(normalize(2097152, brain), 1048576);
});

test('brain validation and its warning describe the current role contract', () => {
  const body = source.slice(source.indexOf('function brainMismatch('), source.indexOf('const ACTIONS ='));
  const check = new Function('DAILY_BRAIN', `${body}; return brainMismatch;`)(brain);
  assert.match(check({ brain: { ...brain, definitionOk: false } }, []), /65536 tokens/);
  assert.doesNotMatch(check({}, []), /32K/);
  const profiles = { brain: { ...brain, definitionOk: true } };
  const model = { ...brain, originKind: 'local' };
  assert.equal(check(profiles, [model]), null);
  assert.match(check(profiles, [{ ...model, context: 32768 }]), /daily profile says Q6_K@65536/);
});
