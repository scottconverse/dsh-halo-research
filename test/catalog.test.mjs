import assert from 'node:assert/strict';
import test from 'node:test';
import { census, enrichLocal, localRuntime, residentOrigins } from '../stack/halo-routing/catalog.mjs';
import { recommend } from '../stack/halo-policy-deterministic/index.mjs';

test('census preserves registered routes and resolves exact context, modalities, and reasoning metadata', async () => {
  const llm = {
    listProviders: () => [{ id: 'cloud', name: 'Cloud' }],
    listModels: async () => [{ provider: 'cloud', id: 'model-a', name: 'Model A', inputModalities: ['image'] }],
    resolveModelInfo: async () => ({
      provider: 'cloud', id: 'model-a', name: 'Model A',
      context: { contextWindow: 8192 },
      inputModalities: ['text', 'image'],
      reasoning: { efforts: [{ id: 'low', name: 'Low' }], defaultEffort: 'low' },
    }),
  };

  const result = await census(llm);
  const candidate = result.candidates[0];

  assert.equal(candidate.contextWindow, 8192);
  assert.deepEqual(candidate.inputModalities, ['text', 'image']);
  assert.deepEqual(candidate.reasoning, { state: 'observed', efforts: ['low'], defaultEffort: 'low' });
  assert.equal(candidate.toolSupport.state, 'unknown');
  assert.equal(candidate.catalogState, 'registered');
  assert.equal(candidate.metadataState, 'resolved');
  assert.equal(candidate.available, null);
  assert.equal(candidate.availability, null);
});

test('local enrichment records an exact singleton instance without turning catalog facts into active config', () => {
  const runtime = enrichLocal([{ key: 'halo/worker', quantization: { name: 'Q4_K_M' }, loaded_instances: [{ id: 'halo/worker', config: { context_length: 32768, parallel: 1, flash_attention: true } }] }]);
  const profile = runtime.get('halo/worker');

  assert.equal(profile.contextWindow, 32768);
  assert.equal(profile.parallelSlots, 1);
  assert.equal(profile.quantization, 'Q4_K_M');
  assert.equal(profile.modelFile, undefined);
  assert.equal(profile.localInstanceState, 'singleton-loaded');
});

test('unresolved metadata remains unknown and a failed provider catalog remains visible', async () => {
  const llm = {
    listProviders: () => [{ id: 'known' }, { id: 'broken' }],
    listModels: async (provider) => {
      if (provider === 'broken') throw new Error('offline');
      return [{ provider, id: 'model', name: 'Model' }];
    },
    resolveModelInfo: async () => { throw new Error('not disclosed'); },
  };

  const result = await census(llm);
  const candidate = result.candidates[0];

  assert.equal(candidate.inputModalities, null);
  assert.equal(candidate.inputModalitiesState, 'unknown');
  assert.deepEqual(candidate.reasoning, { state: 'unknown' });
  assert.deepEqual(candidate.toolSupport, { state: 'unknown' });
  assert.equal(result.providers.find((provider) => provider.id === 'broken').modelCatalogState, 'unavailable');
  assert.deepEqual(result.providerErrors, [{ provider: 'broken', reason: 'model-catalog-unavailable' }]);
});

test('native subagent provider discovery uses list and getProvider without inventing a model catalog', async () => {
  const llm = { listProviders: () => [] };
  const subagents = {
    list: () => ['worker'],
    getProvider: (name) => name === 'worker' ? {
      name,
      capabilities: { outputSchema: true, depthLimit: false, toolFilter: true, persona: false },
      inheritsParentContext: true,
      prepareContinuable: async () => ({}),
    } : undefined,
  };

  const observed = await census(llm, subagents);
  const unavailable = await census(llm);

  assert.equal(observed.candidates.length, 0);
  assert.equal(observed.nativeCatalogState, 'observed');
  assert.deepEqual(observed.nativeCandidates, []);
  assert.deepEqual(observed.nativeProviders, [{
    id: 'worker', kind: 'native-subagent', catalogState: 'registered',
    providerState: 'observed', modelCatalogState: 'unknown', capabilityState: 'observed',
    capabilities: { outputSchema: true, depthLimit: false, toolFilter: true, persona: false },
    inheritsParentContext: true, continuable: true,
  }]);
  assert.equal(unavailable.nativeCatalogState, 'unavailable');
  assert.deepEqual(unavailable.nativeCandidates, []);
});

test('cold and multi-instance aliases are classified without selecting an arbitrary runtime configuration', () => {
  const runtime = enrichLocal([
    { key: 'halo/cold', quantization: { name: 'Q6_K' }, selected_variant: 'halo/cold@q6_k', loaded_instances: [] },
    { key: 'halo/multiple', quantization: { name: 'Q4_K_M' }, loaded_instances: [
      { id: 'instance-a', config: { context_length: 8192, parallel: 1 } },
      { id: 'instance-b', config: { context_length: 32768, parallel: 2 } },
    ] },
  ]);

  assert.equal(runtime.has('halo/cold'), false);
  assert.equal(runtime.has('halo/multiple'), false);
  assert.equal(runtime.coldAliases.get('halo/cold').localInstanceState, 'cold');
  assert.equal(runtime.coldAliases.get('halo/cold').requested.quantization, 'Q6_K');
  assert.equal(runtime.ambiguousAliases.get('halo/multiple').localInstanceState, 'ambiguous');
  assert.deepEqual(runtime.ambiguousAliases.get('halo/multiple').instances.map((instance) => instance.config.context_length), [8192, 32768]);
});

test('local runtime fetches only the catalog endpoint with a bounded signal', async () => {
  let request;
  const models = await localRuntime('http://127.0.0.1:1234/ignored', {
    timeoutMs: 25,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ models: [{ key: 'halo/worker' }] }) };
    },
  });

  assert.equal(request.url, 'http://127.0.0.1:1234/api/v1/models');
  assert.ok(request.options.signal instanceof AbortSignal);
  assert.deepEqual(models, [{ key: 'halo/worker' }]);
});

test('resident origins use only lms ps deviceIdentifier and preserve no provider-wide locality claim', async () => {
  let invocation;
  const origins = await residentOrigins({
    execFileImpl: async (file, args, options) => {
      invocation = { file, args, options };
      return { stdout: JSON.stringify([
        { modelKey: 'halo/local', deviceIdentifier: null },
        { modelKey: 'halo/lm-link', deviceIdentifier: 'remote-device-7' },
      ]) };
    },
  });

  assert.deepEqual(invocation.args, ['ps', '--json']);
  assert.equal(invocation.options.timeout, 3_000);
  assert.equal(invocation.options.maxBuffer, 2 * 1024 * 1024);
  assert.equal(origins.get('halo/local').locality, 'local');
  assert.equal(origins.get('halo/lm-link').locality, 'remote');
  assert.equal(origins.get('halo/local').source, 'lms ps --json/deviceIdentifier');
  assert.equal(origins.has('halo/not-loaded'), false);
});

test('a slow catalog lookup is bounded and leaves the provider route observable', async () => {
  const llm = {
    listProviders: () => [{ id: 'slow' }],
    listModels: () => new Promise(() => {}),
  };
  const result = await census(llm, undefined, { timeoutMs: 15 });

  assert.equal(result.providers[0].id, 'slow');
  assert.equal(result.providers[0].modelCatalogState, 'unavailable');
  assert.deepEqual(result.providerErrors, [{ provider: 'slow', reason: 'model-catalog-unavailable' }]);
});

test('availability changes only when adapter metadata explicitly supplies a boolean', async () => {
  const llm = {
    listProviders: () => [{ id: 'metadata' }],
    listModels: async () => [{ provider: 'metadata', id: 'listed', name: 'Listed', available: false }],
    resolveModelInfo: async () => ({ provider: 'metadata', id: 'listed', name: 'Listed', available: false }),
  };

  const result = await census(llm);

  assert.equal(result.candidates[0].available, false);
  assert.equal(result.candidates[0].availability, false);
});

test('keeps the full picker universe while marking only exact OmniRoute generated connect-account labels catalog-only', async () => {
  const llm = {
    listProviders: () => [{ id: 'omniroute' }, { id: 'lmstudio' }],
    listModels: (provider) => provider === 'omniroute'
      ? [
          { id: 'needs-account', name: 'Model [vendor; connect account; context unverified]' },
          { id: 'ordinary', name: 'Ordinary connect account model' },
        ]
      : [{ id: 'lm-link-or-local', name: 'LM Studio route' }],
    resolveModelInfo: (provider, id) => ({ provider, id }),
  };

  const result = await census(llm);
  const catalogOnly = result.candidates.find((candidate) => candidate.candidateId === 'omniroute/needs-account');
  const ordinary = result.candidates.find((candidate) => candidate.candidateId === 'omniroute/ordinary');
  const lmstudio = result.candidates.find((candidate) => candidate.candidateId === 'lmstudio/lm-link-or-local');

  assert.deepEqual(result.candidates.map((candidate) => candidate.candidateId), [
    'omniroute/needs-account', 'omniroute/ordinary', 'lmstudio/lm-link-or-local',
  ]);
  assert.equal(catalogOnly.catalogState, 'catalog-only');
  assert.equal(catalogOnly.catalogStateSource, 'halo-catalog-label-not-live-entitlement-probe');
  assert.equal(catalogOnly.registeredRoute, true);
  assert.equal(catalogOnly.available, null);
  assert.equal(ordinary.catalogState, 'registered');
  assert.equal(lmstudio.locality, 'unknown');
});

test('policy accepts the census candidate contract with availability explicitly unknown', async () => {
  const llm = {
    listProviders: () => [{ id: 'lmstudio' }],
    listModels: () => [{ id: 'halo/worker', inputModalities: ['text'] }],
    resolveModelInfo: () => ({ provider: 'lmstudio', id: 'halo/worker', inputModalities: ['text'] }),
  };
  const live = await census(llm);

  const result = recommend({
    workload: { role: 'planner', requiredCapabilities: ['text'] },
    candidates: live.candidates,
  });

  assert.equal(result.recommendedCandidateId, 'lmstudio/halo/worker');
});
