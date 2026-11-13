import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OPT_OUT, PATCHED_VERSION, patchSource, locateSdk } from '../output-budget-patch.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';

const sdk = locateSdk();
const { clampMaxTokensToContext } = await import(pathToFileURL(join(sdk, 'dist/api/simple-options.js')));
const { streamSimple } = await import(pathToFileURL(join(sdk, 'dist/api/openai-completions.js')));
const model = { id: 'halo/qwen3.6-35b-a3b-q6', name: 'budget test', api: 'openai-completions',
  provider: 'web-fast', baseUrl: 'http://127.0.0.1:1/v1', reasoning: true,
  input: ['text'], contextWindow: 131072, maxTokens: 32768,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  compat: { maxTokensField: 'max_tokens', supportsDeveloperRole: false } };
const context = { messages: [{ role: 'user', content: 'a'.repeat(128000 * 4), timestamp: 0 }] };

async function withOptOut(value, fn) {
  const before = process.env[OPT_OUT];
  if (value === undefined) delete process.env[OPT_OUT]; else process.env[OPT_OUT] = value;
  try { return await fn(); } finally {
    if (before === undefined) delete process.env[OPT_OUT]; else process.env[OPT_OUT] = before;
  }
}

test('installed DSH adapter keeps real 128K metadata and sends the configured 32K default', async () => {
  await withOptOut('1', async () => {
    const require = createRequire(import.meta.url);
    const stock = createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
    const { apply, Config } = await import(pathToFileURL(stock.resolve('@deepseek-ai/dsh-llm-pi-ai')));
    let captured;
    const server = createServer(async (req, res) => {
      let body = ''; for await (const part of req) body += part;
      captured = JSON.parse(body);
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end('data: ' + JSON.stringify({ id: 'adapter-budget', object: 'chat.completion.chunk',
        created: 1, model: model.id, choices: [{ index: 0, delta: { content: 'OK' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      let adapter;
      apply({ get: name => name === 'credentials' ? { resolve: async () => ({ value: 'test-only' }) } : undefined,
        fiber: { entry: { options: { id: 'llm-pi-ai' } } }, on() {},
        inject() {}, waterfall(_event, _request, _headers, fallback) { return fallback(); }, logger: console, llm: { registerConfigurableProviders() { return { replace() {} }; },
          registerModelDiscovery() {}, registerAdapter(_routes, value) { adapter = value; return { replace() {} }; } } },
        Config({ providers: { 'web-fast': { api: 'openai-completions',
          baseURL: `http://127.0.0.1:${server.address().port}/v1`, apiKeyEnv: 'TEST_ONLY', reasoning: 'medium',
          defaultContextWindow: 131072, defaultMaxTokens: 32768,
          models: [{ id: model.id, contextWindow: 131072, maxTokens: 32768, input: ['text'],
            reasoningEfforts: { off: 'none', medium: 'medium' } }] } } }));
      const metadata = await adapter.resolveModel('web-fast', model.id);
      assert.equal(metadata.context.contextWindow, 131072);
      for await (const chunk of adapter.stream({ provider: 'web-fast', model: model.id,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(128000 * 4) }] }] }))
        assert.notEqual(chunk.type, 'error');
      assert.equal(captured.max_completion_tokens, 32768);
      assert.equal(captured.reasoning_effort, 'medium');
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
});
