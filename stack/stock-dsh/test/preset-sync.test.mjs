import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  checkPresets,
  externalPathForPreset,
  formatCheckReport,
  readEmbeddedPresets,
  presetFromEntry,
  renderExternal,
  stripGeneratedHeader,
  syncPresets,
} from '../preset-sync.mjs';

const require = createRequire(import.meta.url);
const stockRequire = createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
const { parseDocument } = stockRequire('yaml');
const { entryListProblem } = stockRequire('@deepseek-ai/dsh-agent-preset-registry');

function assertValidPluginRows(name, plugins) {
  const problem = entryListProblem(plugins);
  assert.equal(problem, undefined, `${name} must compose as a registered plugin sequence: ${problem}`);
}

function assertValidYaml(name, text) {
  const doc = parseDocument(text);
  assert.deepEqual(doc.errors, [], `${name} must parse as YAML`);
}

test('embedded presets compose through the registered preset schema', () => {
  const { presets } = readEmbeddedPresets();
  assert.deepEqual(
    presets.map((preset) => preset.presetId),
    ['fast-first', 'local', 'local-codex', 'local-lean'],
  );
  for (const preset of presets) {
    const Schema = stockRequire('@deepseek-ai/schemastery');
    const AgentPreset = stockRequire('@deepseek-ai/dsh-agent-preset').default;
    assert.doesNotThrow(() => Schema.resolve(preset.definition.toJSON(), AgentPreset.Config, {}));
    assert.ok(preset.plugins.items.length > 0, `${preset.presetId} must have plugins`);
    assertValidPluginRows(preset.presetId, preset.plugins.toJSON());
  }
});

test('external mirrors are compositional copies of embedded presets', () => {
  const { presets } = readEmbeddedPresets();
  for (const preset of presets) {
    const external = fs.readFileSync(externalPathForPreset(preset), 'utf8');
    assert.equal(external, renderExternal(preset));
    assert.ok(external.startsWith('# GENERATED FILE - DO NOT EDIT.'));
    const body = stripGeneratedHeader(external);
    assertValidYaml(`${preset.presetId} external`, body);
    const parsed = parseDocument(body).toJSON();
    assertValidPluginRows(`${preset.presetId} external`, parsed);
  }
});

test('relative module paths and !!js tags survive mirror generation', () => {
  const { presets } = readEmbeddedPresets();
  const fastFirst = presets.find((preset) => preset.presetId === 'fast-first');
  const localLean = presets.find((preset) => preset.presetId === 'local-lean');
  for (const preset of presets) {
    const external = renderExternal(preset);
    assert.match(external, /!!js /, `${preset.presetId} must preserve !!js tags`);
    if ([fastFirst, localLean].includes(preset))
      assert.match(external, /name: '\.\/tool-catalog\.mjs'/, `${preset.presetId} must use its preset-relative catalog`);
    assert.doesNotMatch(external, /\.dsh-stock\/\.agent-presets\/fast-first\/tool-catalog\.mjs/);
    const { load } = stockRequire('js-yaml');
    const { entryListSchema } = stockRequire('@deepseek-ai/cordis-plugin-include');
    const { isJsExpr } = stockRequire('@deepseek-ai/cordis-plugin-loader');
    const rows = load(external, { schema: entryListSchema });
    const expressions = [];
    function walk(value) {
      if (!value || typeof value !== 'object') return;
      if (isJsExpr(value)) { expressions.push(value.__jsExpr); return; }
      Object.values(value).forEach(walk);
    }
    walk(rows);
    assert.deepEqual(expressions.sort(), ["process.platform !== 'win32'", "process.platform === 'win32'"].sort());
  }
});

test('default delegation uses main Ollama route and preserves optional LM Studio choices', () => {
  const { presets } = readEmbeddedPresets();
  const fastFirst = presets.find((preset) => preset.presetId === 'fast-first');
  const delegation = fastFirst.plugins.toJSON().find((row) => row.id === 'delegation');
  const subagent = delegation.config.find((row) => row.id === 'tool-subagent');
  assert.deepEqual(subagent.config.agentOptions, {
    provider: 'ollama-local',
    model: 'qwen3.8:27b-q6_K',
    reasoningEffort: 'off',
    maxTokens: 24576,
  });
  const profile = fs.readFileSync(path.join(import.meta.dirname, '..', 'web-profile', 'cordis.patch.yml'), 'utf8');
  assert.match(profile, /subagent-model-selection-settings[\s\S]*provider: web-fallback[\s\S]*model: halo\/qwen3\.8-27b-q6-fast/);
  const selection = parseDocument(profile).toJSON().find(row => row.id === 'subagent-model-selection-settings');
  assert.deepEqual(selection.config.allowedModels, [
    { provider: 'ollama-local', model: 'qwen3.8:27b-q6_K' },
    { provider: 'web-fast', model: 'halo/qwen3.6-35b-a3b-q6' },
    { provider: 'web-fallback', model: 'halo/qwen3.8-27b-q6-fast' },
  ]);
  const main = parseDocument(profile).toJSON().find(row => row.id === 'agent-default-model').config;
  assert.equal(subagent.config.agentOptions.provider, main.provider);
  assert.equal(subagent.config.agentOptions.model, main.model);
});

test('checkPresets reports drift without mutating the mirror', () => {
  const { presets } = readEmbeddedPresets();
  const fastFirst = presets.find((preset) => preset.presetId === 'fast-first');
  const target = externalPathForPreset(fastFirst);
  const original = fs.readFileSync(target, 'utf8');
  const fakeFs = {
    readFileSync: (file, encoding) => {
      if (file !== target) return fs.readFileSync(file, encoding);
      return original.replace('qwen3.8:27b-q6_K', 'different-model');
    },
  };
  const results = checkPresets({ fsApi: fakeFs });
  assert.ok(results.some((result) => result.drift), formatCheckReport(results));
  assert.equal(fs.readFileSync(target, 'utf8'), original, 'checkPresets must not write mirrors');
});

test('sync rewrites an embedded edit, then remains idempotent', () => {
  const { presets } = readEmbeddedPresets();
  const fastFirst = presets.find((preset) => preset.presetId === 'fast-first');
  const target = externalPathForPreset(fastFirst);
  const original = fs.readFileSync(target, 'utf8');
  const files = new Map(presets.map(preset => [externalPathForPreset(preset), fs.readFileSync(externalPathForPreset(preset), 'utf8')]));
  files.set(target, original.replace('qwen3.8:27b-q6_K', 'different-model'));
  const fakeFs = {
    readFileSync: file => files.get(file),
    mkdirSync: () => {},
    writeFileSync: (file, data) => files.set(file, data),
  };
  const first = syncPresets({ fsApi: fakeFs });
  const second = syncPresets({ fsApi: fakeFs });
  assert.ok(first.some(result => result.presetId === 'fast-first' && result.changed));
  assert.ok(second.every(result => !result.changed), 'second sync must perform no writes');
  assert.equal(files.get(target), original);
  assert.equal(fs.readFileSync(target, 'utf8'), original, 'sync must produce byte-identical mirror content');
});

test('embedded edits propagate to mirrors through a fixture without touching deployment files', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'dsh-preset-sync-'));
  const profile = path.join(dir, 'profile.yml');
  const original = fs.readFileSync(path.join(import.meta.dirname, '..', 'web-profile', 'cordis.patch.yml'), 'utf8');
  const { presets } = readEmbeddedPresets();
  const files = new Map(presets.map(p => [externalPathForPreset(p), fs.readFileSync(externalPathForPreset(p), 'utf8')]));
  const fsApi = { readFileSync: file => files.get(file), mkdirSync: () => {}, writeFileSync: (file, data) => files.set(file, data) };
  try {
    fs.writeFileSync(profile, original.replace('backgroundMode: continuable', 'backgroundMode: awaitable'));
    const result = syncPresets({ profilePath: profile, fsApi });
    assert.deepEqual(result.filter(row => row.changed).map(row => row.presetId), ['fast-first']);
    assert.match(files.get(externalPathForPreset(presets[0])), /backgroundMode: awaitable/);
    assert.ok(checkPresets({ profilePath: profile, fsApi }).every(row => !row.drift));
  } finally { fs.rmSync(dir, { recursive: true }); }
});

test('non-preset plugin rows and unsafe preset directories cannot become recovery targets', () => {
  const entry = name => parseDocument(`id: fixture\nname: ${name}\nconfig:\n  id: fixture\n  plugins: []\n`).contents;
  assert.equal(presetFromEntry(entry('another-plugin')), null);
  const unsafe = entry('@deepseek-ai/dsh-agent-preset'); unsafe.get('config').set('id', '../outside');
  assert.throws(() => presetFromEntry(unsafe), /safe directory/);
  const missing = entry('@deepseek-ai/dsh-agent-preset'); missing.get('config').delete('plugins');
  assert.throws(() => presetFromEntry(missing), /plugins/);
  const badId = entry('@deepseek-ai/dsh-agent-preset'); badId.get('config').set('id', 123);
  assert.throws(() => presetFromEntry(badId));
});

test('duplicate IDs and malformed raw registered configs fail before mirror writes', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'dsh-preset-invalid-'));
  const profile = path.join(dir, 'profile.yml');
  const original = fs.readFileSync(path.join(import.meta.dirname, '..', 'web-profile', 'cordis.patch.yml'), 'utf8');
  try {
    fs.writeFileSync(profile, original.replace(/id: local-codex(?=\r?\n)/, 'id: local'));
    assert.throws(() => readEmbeddedPresets(profile), /Duplicate/);
    const { presets } = readEmbeddedPresets();
    const invalid = { ...presets[0], definition: presets[0].definition.clone() };
    invalid.definition.set('name', 123);
    assert.throws(() => renderExternal(invalid));
  } finally { fs.rmSync(dir, { recursive: true }); }
});
