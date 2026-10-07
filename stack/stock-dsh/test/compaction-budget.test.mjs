import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const require = createRequire(import.meta.url);
const stock = createRequire(realpathSync(require.resolve('@deepseek-ai/dsh/package.json')));
const base = createRequire(stock.resolve('@deepseek-ai/dsh-base/package.json'));
const source = readFileSync(join(dirname(base.resolve('@deepseek-ai/dsh-compaction-basic/package.json')), 'lib/index.js'), 'utf8');
// Execute the installed pure policy resolver; do not start a harness or a model.
const start = source.indexOf('const DEFAULT_THRESHOLD_RATIO');
const end = source.indexOf('//#endregion', start);
const { resolveConfig, resolveTargetPolicy, resolveCompactSpec } = new Function('deepFreeze', 'isDeepStrictEqual',
  source.slice(start, end) + ';return {resolveConfig,resolveTargetPolicy,resolveCompactSpec};')(Object.freeze, isDeepStrictEqual);
const { parse } = stock('yaml');
const target = { provider: 'web-fast', model: 'halo/qwen3.6-35b-a3b-q6' };

test('installed DSH 0.2 default headroom makes a 64K route invalid', () => {
  const config = resolveConfig({ auto: true, thresholdRatio: .7, retainRatio: .55, maxTokens: 8192 });
  assert.equal(config.headroomTokens, 65536);
  assert.throws(() => resolveCompactSpec(resolveTargetPolicy(config, target), 65536, 24576), /leaving no pressure budget/);
});

test('every registered Web compaction policy leaves room for a full 24K response', () => {
  const rows = parse(readFileSync(new URL('../web-profile/cordis.patch.yml', import.meta.url), 'utf8'));
  const policies = [];
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if (value.id === 'compaction-basic') policies.push(value.config);
    Object.values(value).forEach(visit);
  }
  visit(rows);
  assert.equal(policies.length, 4);
  for (const policy of policies) {
    assert.equal(policy.headroomTokens, 4096);
    const config = resolveConfig(policy);
    const spec = resolveCompactSpec(resolveTargetPolicy(config, target), 65536, 24576);
    assert.equal(spec.thresholdTokens, 36864);
    assert.equal(spec.retainTokens, 22528);
    assert.equal(spec.maxTokens, 8192);
    assert.ok(spec.retainTokens < spec.thresholdTokens);
  }
});
