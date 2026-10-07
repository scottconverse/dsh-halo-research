import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const stock = createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
const { parse } = stock('yaml');
const { apply, Config } = await import(pathToFileURL(stock.resolve('@deepseek-ai/dsh-llm-pi-ai')));
const settings = parse(readFileSync(process.env.HALO_SETTINGS_UNDER_TEST || new URL('../settings.yaml', import.meta.url), 'utf8'));

test('stock adapter sends High by default, none for explicit Off, and no reasoning for coder', async () => {
  const captured = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const part of req) body += part;
    captured.push(JSON.parse(body));
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('data: ' + JSON.stringify({ id: 'test', object: 'chat.completion.chunk', created: 0,
      model: captured.at(-1).model, choices: [{ index: 0, delta: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const source = settings['llm-pi-ai'].providers;
    assert.equal(source['web-fast'].baseURL, source.lmstudio.baseURL);
    assert.deepEqual(source['web-fast'].models.map(m => m.id), ['halo/qwen3.6-35b-a3b-q6']);
    assert.deepEqual(source.lmstudio.models.map(m => m.id), ['halo-coder-q4km']);
    assert.deepEqual(settings['agent-default-model'], { provider: 'web-fast', model: 'halo/qwen3.6-35b-a3b-q6', reasoningEffort: 'high' });
    const providers = structuredClone({ 'web-fast': source['web-fast'], lmstudio: source.lmstudio });
    for (const route of Object.values(providers)) route.baseURL = `http://127.0.0.1:${server.address().port}/v1`;
    let adapter;
    apply({
      get: name => name === 'credentials' ? { resolve: async () => ({ value: 'local-test-placeholder' }) } : undefined,
      fiber: { entry: { options: { id: 'llm-pi-ai' } } }, on() {},
      inject() {}, logger: console,
      llm: {
        registerConfigurableProviders() { return { replace() {} }; },
        registerModelDiscovery() {},
        registerAdapter(routes, value) { adapter = value; return { replace() {} }; },
      },
    }, Config({ providers }));
    const brain = await adapter.resolveModel('web-fast', 'halo/qwen3.6-35b-a3b-q6');
    assert.equal(brain.reasoning.defaultEffort, 'high');
    assert.deepEqual(brain.reasoning.efforts.map(e => e.id), ['off', 'high']);
    const coder = await adapter.resolveModel('lmstudio', 'halo-coder-q4km');
    assert.equal(coder.reasoning, undefined);
    assert.equal(brain.context.contextWindow, 65536);
    assert.equal(coder.context.contextWindow, 131072);
    for (const selection of [
      { provider: 'web-fast', model: 'halo/qwen3.6-35b-a3b-q6' },
      { provider: 'web-fast', model: 'halo/qwen3.6-35b-a3b-q6', reasoningEffort: 'off' },
      { provider: 'lmstudio', model: 'halo-coder-q4km' },
    ]) {
      for await (const chunk of adapter.stream({ ...selection, messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply OK' }] }], maxTokens: 8 })) {
        assert.notEqual(chunk.type, 'error');
      }
    }
    assert.equal(captured.length, 3);
    assert.deepEqual(captured.map(r => r.model), ['halo/qwen3.6-35b-a3b-q6', 'halo/qwen3.6-35b-a3b-q6', 'halo-coder-q4km']);
    assert.deepEqual(captured.map(r => r.reasoning_effort), ['high', 'none', undefined]);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
