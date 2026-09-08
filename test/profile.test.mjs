import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveProfile } from '../stack/halo-routing/profile.mjs';

const candidate = (overrides = {}) => ({
  provider: { id: 'lmstudio' },
  model: { id: 'halo/qwen3-coder-30b-a3b-q4km' },
  executionClass: 'local-native',
  endpointIdentity: 'http://127.0.0.1:1234/v1',
  adapterName: 'lmstudio',
  adapterVersion: '1',
  contextWindow: 32768,
  reasoningMode: 'off',
  tools: [{ type: 'function', function: { name: 'read_file', description: 'Read a file', parameters: { type: 'object', properties: { path: { type: 'string' } } } } }],
  ...overrides,
});

const enrichment = (overrides = {}) => ({
  source: 'lmstudio-api',
  quantization: 'Q4_K_M',
  modelFile: 'Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf',
  contextWindow: 32768,
  parallelSlots: 1,
  loadConfig: { flashAttention: true, evalBatchSize: 2048 },
  runtime: { name: 'llama.cpp', version: '2.33.0', instanceVerified: true, source: 'loaded-instance' },
  ...overrides,
});

test('derives an execution profile from observed local runtime data', () => {
  const profile = deriveProfile({
    provider: 'lmstudio',
    model: 'halo/qwen3-coder-30b-a3b-q4km',
    executionClass: 'local-native',
    endpointIdentity: 'http://user:secret@127.0.0.1:1234/api?token=secret',
    adapterName: 'lmstudio',
    adapterVersion: '1',
    reasoningMode: 'off',
    tools: [{ name: 'read_file', parameters: { type: 'object' } }],
  }, {
    source: 'lmstudio-api',
    quantization: 'Q4_K_M',
    modelFile: 'Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf',
    contextWindow: 32768,
    parallelSlots: 1,
    loadConfig: { flashAttention: true },
  });

  assert.equal(profile.schemaVersion, '1');
  assert.equal(profile.identity.endpointHost, '127.0.0.1:1234');
  assert.equal(profile.actual.contextWindow.value, 32768);
  assert.equal(profile.requested.contextWindow.state, 'missing');
  assert.equal(profile.reasoningMode.value, 'off');
  assert.match(profile.toolSchemaDigest, /^[a-f0-9]{64}$/);
  assert.match(profile.fingerprint, /^[a-f0-9]{64}$/);
});

test('fingerprint is stable under shuffled schema/load-config keys and tool order', () => {
  const left = deriveProfile(candidate({
    tools: [
      { function: { name: 'write_file', parameters: { required: ['path'], type: 'object' } } },
      { function: { name: 'read_file', parameters: { properties: { path: { type: 'string' } }, type: 'object' } } },
    ],
  }), enrichment({ loadConfig: { evalBatchSize: 2048, flashAttention: true } }));
  const right = deriveProfile(candidate({
    tools: [
      { function: { parameters: { type: 'object', properties: { path: { type: 'string' } } }, name: 'read_file' } },
      { function: { parameters: { type: 'object', required: ['path'] }, name: 'write_file' } },
    ],
  }), enrichment({ loadConfig: { flashAttention: true, evalBatchSize: 2048 } }));

  assert.equal(left.toolSchemaDigest, right.toolSchemaDigest);
  assert.equal(left.fingerprint, right.fingerprint);
});

test('every shipped execution identity field mutates the fingerprint', () => {
  const baseline = deriveProfile(candidate(), enrichment()).fingerprint;
  const cases = [
    ['provider', candidate({ provider: 'other' }), enrichment()],
    ['model', candidate({ model: 'other/model' }), enrichment()],
    ['execution class', candidate({ executionClass: 'local-alt' }), enrichment()],
    ['endpoint host', candidate({ endpointIdentity: 'https://other.example.test:444/path?secret=no' }), enrichment()],
    ['adapter name', candidate({ adapterName: 'other-adapter' }), enrichment()],
    ['adapter version', candidate({ adapterVersion: '2' }), enrichment()],
    ['quantization', candidate(), enrichment({ quantization: 'Q6_K' })],
    ['model file', candidate(), enrichment({ modelFile: 'other.gguf' })],
    ['context window', candidate(), enrichment({ contextWindow: 65536 })],
    ['parallel slots', candidate(), enrichment({ parallelSlots: 2 })],
    ['load config', candidate(), enrichment({ loadConfig: { flashAttention: false, evalBatchSize: 2048 } })],
    ['declared context window', candidate({ contextWindow: 65536 }), enrichment()],
    ['reasoning mode', candidate({ reasoningMode: 'on' }), enrichment()],
    ['tool schema', candidate({ tools: [{ function: { name: 'other_tool', parameters: { type: 'object' } } }] }), enrichment()],
    ['verified runtime', candidate(), enrichment({ runtime: { name: 'llama.cpp', version: '2.34.0', instanceVerified: true } })],
  ];

  for (const [label, changedCandidate, changedEnrichment] of cases) {
    assert.notEqual(deriveProfile(changedCandidate, changedEnrichment).fingerprint, baseline, label);
  }
});

test('volatile residency and performance values do not alter the fingerprint', () => {
  const base = deriveProfile(candidate(), enrichment({
    loadConfig: { flashAttention: true, pid: 1, residency: 'resident', tokenCount: 20, speed: 100, cost: 0 },
  }));
  const volatile = deriveProfile(candidate(), enrichment({
    loadConfig: { flashAttention: true, pid: 999, residency: 'evicted', tokenCount: 9999, speed: 1, cost: 50 },
  }));

  assert.equal(base.fingerprint, volatile.fingerprint);
});

test('cloud identities remain distinct while context metadata remains declared rather than runtime actual', () => {
  const first = deriveProfile(candidate({
    provider: 'cloud', model: { id: 'cloud/one' }, executionClass: 'cloud-api', endpointIdentity: 'https://api.example.test/v1', contextWindow: 64000,
  }), {});
  const second = deriveProfile(candidate({
    provider: 'cloud', model: { id: 'cloud/two' }, executionClass: 'cloud-api', endpointIdentity: 'https://api.example.test/v1', contextWindow: 64000,
  }), {});

  assert.equal(first.actual.quantization.state, 'inapplicable');
  assert.equal(first.actual.modelFile.state, 'inapplicable');
  assert.equal(first.actual.parallelSlots.state, 'inapplicable');
  assert.equal(first.actual.contextWindow.state, 'inapplicable');
  assert.equal(first.declared.contextWindow.value, 64000);
  assert.notEqual(first.fingerprint, second.fingerprint);
});

test('requested local alias settings never overwrite observed runtime fields or its fingerprint', () => {
  const active = enrichment({ requested: { source: 'model-yaml', contextWindow: 8192, parallelSlots: 4, loadConfig: { flashAttention: false } } });
  const changedRequested = enrichment({ requested: { source: 'model-yaml', contextWindow: 4096, parallelSlots: 8, loadConfig: { flashAttention: false } } });
  const left = deriveProfile(candidate(), active);
  const right = deriveProfile(candidate(), changedRequested);

  assert.equal(left.actual.contextWindow.value, 32768);
  assert.equal(left.requested.contextWindow.value, 8192);
  assert.equal(left.actual.parallelSlots.value, 1);
  assert.equal(left.fingerprint, right.fingerprint);
});

test('declared local context never becomes a loaded-instance observation', () => {
  const profile = deriveProfile(candidate({ contextWindow: 65536 }), enrichment({ contextWindow: undefined }));

  assert.equal(profile.actual.contextWindow.state, 'missing');
  assert.equal(profile.declared.contextWindow.value, 65536);
});

test('reasoning provider-default and explicit off are different execution identities', () => {
  const providerDefault = deriveProfile(candidate({ reasoningMode: undefined }), enrichment());
  const off = deriveProfile(candidate({ reasoningMode: 'off' }), enrichment());

  assert.equal(providerDefault.reasoningMode.state, 'provider-default');
  assert.equal(off.reasoningMode.value, 'off');
  assert.notEqual(providerDefault.fingerprint, off.fingerprint);
});

test('unverified runtime selection is never treated as an instance identity', () => {
  const left = deriveProfile(candidate(), enrichment({ runtime: { name: 'global-runtime', version: '1' } }));
  const right = deriveProfile(candidate(), enrichment({ runtime: { name: 'different-global-runtime', version: '2' } }));
  const absent = deriveProfile(candidate(), enrichment({ runtime: undefined }));

  assert.equal(left.actual.runtime.name.state, 'unverified');
  assert.equal(left.fingerprint, right.fingerprint);
  assert.equal(left.fingerprint, absent.fingerprint);
});

test('only instance-verified runtime values enter identity', () => {
  const verified = deriveProfile(candidate(), enrichment());
  const unverified = deriveProfile(candidate(), enrichment({ runtime: { name: 'global-runtime', version: '1' } }));

  assert.equal(verified.identity.runtimeName, 'llama.cpp');
  assert.equal(verified.identity.runtimeVersion, '2.33.0');
  assert.equal(Object.hasOwn(unverified.identity, 'runtimeName'), false);
  assert.equal(Object.hasOwn(unverified.identity, 'runtimeVersion'), false);
});

test('tool arguments and prompts are omitted while schema changes alter only the digest', () => {
  const left = deriveProfile(candidate({
    tools: [{ function: { name: 'read_file', description: 'Read a file', parameters: { type: 'object' }, arguments: { path: 'secret-a' }, prompt: 'ignore this' } }],
  }), enrichment());
  const right = deriveProfile(candidate({
    tools: [{ function: { name: 'read_file', description: 'Read a file', parameters: { type: 'object' }, arguments: { path: 'secret-b' }, prompt: 'ignore that' } }],
  }), enrichment());
  const schemaChanged = deriveProfile(candidate({
    tools: [{ function: { name: 'read_file', description: 'Read a file', parameters: { type: 'object', required: ['path'] } } }],
  }), enrichment());

  assert.equal(left.toolSchemaDigest, right.toolSchemaDigest);
  assert.equal(left.fingerprint, right.fingerprint);
  assert.notEqual(left.toolSchemaDigest, schemaChanged.toolSchemaDigest);
  assert.equal(JSON.stringify(left).includes('secret-a'), false);
});

test('local profile fields distinguish missing from explicit unknown', () => {
  const missing = deriveProfile(candidate(), enrichment({ quantization: undefined }));
  const unknown = deriveProfile(candidate(), enrichment({ quantization: null }));

  assert.equal(missing.actual.quantization.state, 'missing');
  assert.equal(unknown.actual.quantization.state, 'unknown');
  assert.notEqual(missing.fingerprint, unknown.fingerprint);
});
