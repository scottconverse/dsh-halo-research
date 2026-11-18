import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { apply as applyPolicy } from './delegation-policy.mjs';
import { installPresetLeads, wrapAdapter } from './autostart.mjs';

const [runtime, profiles] = process.argv.slice(2);
assert(runtime && profiles, 'Usage: node verify.mjs DSH_RUNTIME_PACKAGE_JSON RECORDS_DIR');
const require = createRequire(pathToFileURL(runtime));
const { parse } = createRequire(import.meta.url)('yaml');
const { apply, Config } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-tool-subagent')));
const adapterModule = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-llm-pi-ai')));

const paired = true;
const autoStart = true;
for (const [surface, mode] of ['web', 'desktop'].flatMap(surface => ['full', 'capped'].map(mode => [surface, mode]))) {
  const capped = mode === 'capped';
  const profile = parse(readFileSync(join(profiles, surface + '.paired.yml'), 'utf8'), {
    customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: source => source }],
  });
  const { providers } = profile.find(row => row.id === 'llm-pi-ai').config;
  const preset = profile.flatMap(row => row.insert ?? []).find(row => row.id === 'halo-preset-local-5070' + (capped ? '-capped' : ''));
  const spawn = preset.config.plugins.find(row => row.id === 'tool-subagent').config;
  const lead = capped ? 'strata-halo-capped' : autoStart ? 'strata-halo-auto' : 'strata-local';
  const leadPort = capped ? 8083 : 8081;
  const worker = spawn.agentOptions.provider;
  assert.equal(providers[lead].baseURL, 'http://127.0.0.1:' + leadPort + '/v1');
  assert.equal(providers[lead].models[0].contextWindow, capped ? 32768 : 131072);
  assert.equal(providers[worker].baseURL, 'http://127.0.0.1:8082/v1');
  const model = spawn.agentOptions.model;
  const received = [];
  const services = new Map();
  const localProviders = {};
  try {
    for (const provider of [lead, worker]) {
      const service = createServer(async (req, res) => {
        let body = '';
        for await (const chunk of req) body += chunk;
        const request = JSON.parse(body);
        received.push({ provider, path: req.url, model: request.model });
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.end('data: ' + JSON.stringify({
          id: 'mock-' + provider, object: 'chat.completion.chunk',
          created: 1, model, choices: [{ index: 0, delta: { role: 'assistant', content: provider }, finish_reason: 'stop' }],
        }) + '\n\ndata: [DONE]\n\n');
      });
      services.set(provider, service);
      service.listen(0, '127.0.0.1');
      await once(service, 'listening');
      localProviders[provider] = { ...providers[provider], baseURL: 'http://127.0.0.1:' + service.address().port + '/v1' };
    }
    let adapter;
    adapterModule.apply({
      get: service => service === 'credentials' ? { resolve: async () => ({ value: 'mock' }) } : undefined,
      fiber: { entry: { options: { id: 'llm-pi-ai' } } },
      on() {}, inject() {}, logger: console,
      waterfall(_event, _request, _headers, fallback) { return fallback(); },
      llm: {
        registerConfigurableProviders() { return { replace() {} }; },
        registerModelDiscovery() {},
        registerAdapter(_routes, value) { adapter = value; return { replace() {} }; },
      },
    }, adapterModule.Config({ providers: localProviders }));
    const startupCalls = [];
    if (autoStart) {
      wrapAdapter(adapter, async route => {
        // No model loaders are run. Make startup observable before releasing each request.
        startupCalls.push(route.port);
        assert.equal(received.length, route.port === leadPort ? 0 : 1);
        if (startupCalls.length === 2) throw new Error('Mock startup refused');
      });
    }
    async function ask(provider, prompt) {
      let text = '';
      for await (const chunk of adapter.stream({
        provider, model, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      })) {
        if (chunk.type === 'error') throw new Error(JSON.stringify(chunk));
        if (chunk.type === 'text-delta') text += chunk.text;
      }
      return text;
    }
    const parent = { options: { provider: lead, model }, session: { requestHeader() {} } };
    if (paired) {
      const events = new Map();
      const original = { provider: 'strata-local', model };
      const session = {};
      let recorded = null;
      let selectedPreset = 'local';
      let lastTurn = 0;
      const agent = { session, model: {
        current: () => recorded ?? original,
        recordedSelection: () => recorded,
        select: selection => { recorded = selection; },
      } };
      installPresetLeads({
        on: (event, handler) => events.set(event, handler),
        agentPresets: { presetForSession: () => selectedPreset },
        agents: { get: () => agent, turnBoundaryOf: () => ({ lastTurn, openTurnStartSeq: null }) },
      });
      events.get('agent/created')({ agent });
      assert.equal(recorded, null);
      selectedPreset = preset.config.id;
      events.get('agent/created')({ agent });
      assert.deepEqual(recorded, { provider: lead, model });
      selectedPreset = 'local';
      events.get('agent-preset/selected')('session', selectedPreset);
      await Promise.resolve();
      assert.deepEqual(recorded, original);
      selectedPreset = preset.config.id;
      events.get('agent-preset/selected')('session', selectedPreset);
      await Promise.resolve();
      assert.deepEqual(recorded, { provider: lead, model });
      lastTurn = 1;
      selectedPreset = 'local';
      events.get('agent-preset/selected')('session', selectedPreset);
      await Promise.resolve();
      assert.deepEqual(recorded, { provider: lead, model });
    }
    let tool, policy, delivered;
    const tools = {
      get(name) { return tool?.name === name ? tool : undefined; },
      register(value) { tool = value; return () => {}; },
    };
    const backend = {
      name: 'spawn', inheritsParentContext: false,
      capabilities: { agentPreset: true, agentOptions: true, depthLimit: true },
    };
    const context = {
      tools, effect: callback => callback(), on() {},
      get(name) {
        if (name === 'agentPresets') return {};
        if (name === 'llm') return { async resolveCallConfig(input) { assert.equal(input.provider, worker); } };
      },
      sessionProjections: { async register() { return { stateOf() { return null; } }; } },
      systemPrompt: {
        getSectionOrder() { return 2800; }, getContextOrder() { return 120; },
        section(row) { if (row.name === 'halo-5070-delegation-policy') policy = row.text; }, context() {},
      },
      subagents: {
        getProvider() { return backend; }, resolveMaxDepth(value) { return value; },
        async startActivation({ provider, request, delivery }) {
          assert.equal(provider, 'spawn');
          assert.equal(request.parent, parent);
          assert.equal(delivery, 'parent');
          assert.equal(request.agentPreset, 'local-lean');
          assert.equal(request.maxDepth, 1);
          assert.deepEqual(request.agentOptions, { provider: worker, model, maxTokens: 8192 });
          delivered = await ask(request.agentOptions.provider, request.prompt[0].text);
          return { childId: 'mock-child' };
        },
      },
    };
    await apply(context, Config(spawn));
    applyPolicy(context);
    assert.match(policy({ scope: {} }), /on your own initiative/);
    assert.equal(await ask(parent.options.provider, 'Lead work'), lead);
    if (autoStart) {
      await assert.rejects(tool.execute({ prompt: 'Review the tests', description: 'Review test coverage' },
        { agent: parent, signal: new AbortController().signal }), /Mock startup refused/);
      assert.equal(received.length, 1);
    }
    const result = await tool.execute({ prompt: 'Review the tests', description: 'Review test coverage' },
      { agent: parent, signal: new AbortController().signal });
    assert.equal(result.subagentId, 'mock-child');
    assert.equal(delivered, worker);
    if (autoStart) {
      assert.deepEqual(startupCalls, [leadPort, 8082, 8082]);
    }
    assert.deepEqual(received, [lead, worker].map(provider => ({ provider, path: '/v1/chat/completions', model })));
    console.log(surface + ' ' + mode + ': lead and native delegation hit distinct mock endpoints and request parent delivery');
  } finally {
    for (const service of services.values()) {
      service.closeAllConnections();
      service.close();
    }
  }
}
