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
  input: ['text'], contextWindow: 65536, maxTokens: 24576,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  compat: { maxTokensField: 'max_tokens', supportsDeveloperRole: false } };
const context = { messages: [{ role: 'user', content: 'a'.repeat(61370 * 4), timestamp: 0 }] };

async function withOptOut(value, fn) {
  const before = process.env[OPT_OUT];
  if (value === undefined) delete process.env[OPT_OUT]; else process.env[OPT_OUT] = value;
  try { return await fn(); } finally {
    if (before === undefined) delete process.env[OPT_OUT]; else process.env[OPT_OUT] = before;
  }
}

test('version-pinned patch is idempotent and rejects unknown implementations', () => {
  const source = readFileSync(join(sdk, 'dist/api/simple-options.js'), 'utf8');
  assert.equal(patchSource(source), source);
  assert.throws(() => patchSource('export function clampMaxTokensToContext() {}'), /Unexpected/);
});

test('pristine installed SDK backup receives exactly the scoped opt-out', () => {
  const pristine = readFileSync(new URL(`../runtime-patch-backups/pi-ai-${PATCHED_VERSION}-simple-options.js.original`, import.meta.url), 'utf8');
  assert.ok(!pristine.includes(OPT_OUT));
  const patched = patchSource(pristine);
  assert.ok(patched.includes(`process.env.${OPT_OUT} === "1"`));
  assert.equal(patchSource(patched), patched);
  assert.ok(patched.includes('model.contextWindow - estimateContextTokens(context).tokens - CONTEXT_SAFETY_TOKENS'));
});

test('upstream clamp reproduces 70 tokens; DSH opt-out preserves 24K even at estimated overflow', async () => {
  await withOptOut(undefined, () => assert.equal(clampMaxTokensToContext(model, context, 24576), 70));
  await withOptOut('1', () => {
    assert.equal(clampMaxTokensToContext(model, context, 24576), 24576);
    assert.equal(clampMaxTokensToContext(model, { messages: [{ role: 'user',
      content: 'x'.repeat(300000), timestamp: 0 }] }, 24576), 24576);
    assert.equal(clampMaxTokensToContext(model, context, 512), 512);
  });
});

test('actual OpenAI request serialization preserves 24K and high reasoning', async () => {
  await withOptOut('1', async () => {
    let payload;
    const result = await streamSimple(model, context, { apiKey: 'test-only', maxTokens: 24576,
      reasoning: 'high', maxRetries: 0, fetch: async (_url, init) => {
        payload = JSON.parse(init.body);
        const event = { id: 'budget-test', object: 'chat.completion.chunk', created: 1,
          model: model.id, choices: [{ index: 0, delta: { content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11 } };
        return new Response(`data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`,
          { headers: { 'content-type': 'text/event-stream' } });
      } }).result();
    assert.equal(result.stopReason, 'stop', result.errorMessage);
    assert.equal(payload.max_tokens, 24576);
    assert.equal(payload.reasoning_effort, 'high');
    assert.equal(payload.messages[0].content.length, 61370 * 4);
  });
});

test('installed DSH adapter keeps real 64K metadata and sends the configured 24K default', async () => {
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
        inject() {}, logger: console, llm: { registerConfigurableProviders() { return { replace() {} }; },
          registerModelDiscovery() {}, registerAdapter(_routes, value) { adapter = value; return { replace() {} }; } } },
        Config({ providers: { 'web-fast': { api: 'openai-completions',
          baseURL: `http://127.0.0.1:${server.address().port}/v1`, apiKeyEnv: 'TEST_ONLY', reasoning: 'high',
          defaultContextWindow: 65536, defaultMaxTokens: 24576,
          models: [{ id: model.id, contextWindow: 65536, maxTokens: 24576, input: ['text'],
            reasoningEfforts: { off: 'none', high: 'high' } }] } } }));
      const metadata = await adapter.resolveModel('web-fast', model.id);
      assert.equal(metadata.context.contextWindow, 65536);
      for await (const chunk of adapter.stream({ provider: 'web-fast', model: model.id,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(61370 * 4) }] }] }))
        assert.notEqual(chunk.type, 'error');
      assert.equal(captured.max_completion_tokens, 24576);
      assert.equal(captured.reasoning_effort, 'high');
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
});
