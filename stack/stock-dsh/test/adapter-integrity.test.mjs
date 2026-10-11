import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const stock = createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
const adapterEntry = stock.resolve('@deepseek-ai/dsh-llm-pi-ai');
const llmEntry = stock.resolve('@deepseek-ai/dsh-llm');
const { LlmError } = await import(pathToFileURL(llmEntry));
const {
  ARGUMENTS_MARKER,
  INVALID_TOOL_ARGUMENTS_CODE,
  PATCHED_VERSION,
  PRISTINE_SHA256,
  REASONING_MARKER,
  OLLAMA_FETCH_MARKER,
  ensureAdapterIntegrityPatch,
  isFullyPatched,
  locateAdapter,
  patchSource
} = await import('../adapter-integrity-patch.mjs');

const modelId = 'halo/adapter-integrity-test-model';
const contextWindow = 65536;

// Deterministic usage fixtures. Pi-ai reports output tokens inclusive of reasoning.
const POSITIVE_REASONING = { prompt_tokens: 11, completion_tokens: 40, total_tokens: 51, completion_tokens_details: { reasoning_tokens: 7 } };
const ZERO_REASONING = { prompt_tokens: 11, completion_tokens: 40, total_tokens: 51, completion_tokens_details: { reasoning_tokens: 0 } };
const ABSENT_REASONING = { prompt_tokens: 11, completion_tokens: 40, total_tokens: 51 };

function adapterContext() {
  return {
    get: (name) => name === 'credentials'
      ? { resolve: async () => ({ value: 'test-only' }) }
      : undefined,
    fiber: { entry: { options: { id: 'llm-pi-ai' } } },
    on() {},
    inject() {},
    logger: { warn() {}, error() {}, info() {}, debug() {} },
    llm: {
      registerConfigurableProviders() { return { replace() {} }; },
      registerModelDiscovery() {},
      registerAdapter(adapter) { return { replace() {} }; }
    }
  };
}

function adapterConfig(baseURL) {
  return {
    providers: {
      'web-fast': {
        api: 'openai-completions',
        baseURL,
        apiKeyEnv: 'TEST_ONLY',
        reasoning: 'high',
        defaultContextWindow: contextWindow,
        defaultMaxTokens: 24576,
        models: [{
          id: modelId,
          contextWindow,
          maxTokens: 24576,
          input: ['text'],
          reasoningEfforts: { off: 'none', high: 'high' }
        }]
      }
    }
  };
}

async function withAdapter(usageFactory, fn) {
  const requests = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const part of req) body += part;
    const parsed = JSON.parse(body);
    requests.push(parsed);
    const index = requests.length - 1;
    const usage = usageFactory(index);
    const event = {
      id: `adapter-integrity-${index}`,
      object: 'chat.completion.chunk',
      created: 1,
      model: modelId,
      choices: [{ index: 0, delta: { content: 'OK' }, finish_reason: null }]
    };
    const finalEvent = {
      id: `adapter-integrity-${index}`,
      object: 'chat.completion.chunk',
      created: 1,
      model: modelId,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      usage
    };
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end(`data: ${JSON.stringify(event)}\n\ndata: ${JSON.stringify(finalEvent)}\n\ndata: [DONE]\n\n`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const cwd = process.cwd();
  process.chdir(join(cwd, '..', '..'));
  try {
    const { apply, Config } = await import(pathToFileURL(adapterEntry).href);
    const value = { adapter: undefined };
    const ctx = adapterContext();
    ctx.llm.registerAdapter = (_routes, adapter) => { value.adapter = adapter; return { replace() {} }; };
    apply(ctx, Config(adapterConfig(`http://127.0.0.1:${server.address().port}/v1`)));
    assert.ok(value.adapter, 'adapter should be registered');
    return await fn({ adapter: value.adapter, requests });
  } finally {
    process.chdir(cwd);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function consume(adapter, messages) {
  const chunks = [];
  for await (const chunk of adapter.stream({ provider: 'web-fast', model: modelId, messages }))
    chunks.push(chunk);
  return chunks;
}

function usageOf(chunks) {
  const usage = chunks.find((chunk) => chunk.type === 'usage');
  assert.ok(usage, 'expected a usage chunk');
  return usage.usage;
}

test('version-pinned adapter patch is idempotent, guarded, and backup-backed', () => {
  const { target, version } = locateAdapter();
  assert.equal(version, PATCHED_VERSION);
  const source = readFileSync(target, 'utf8');
  assert.ok(isFullyPatched(source), 'installed adapter must expose the full expected patched shape');
  assert.ok(source.includes(OLLAMA_FETCH_MARKER), 'only the configured Ollama profile should receive the timeout fetch');
  assert.equal(patchSource(source), source);
  assert.throws(() => patchSource('function mapUsage() { return {}; }'), /Unexpected/);
  // Remove both parseArguments error messages so only the usage repair remains: a genuine partial patch.
  const partial = source.split(ARGUMENTS_MARKER).join('removed-marker');
  assert.throws(() => patchSource(partial), /Partially patched|Unexpected|refusing a blind patch/);
  assert.throws(() => patchSource(source.replace(REASONING_MARKER, 'drifted-reasoning-marker')), /Partially patched|Unexpected/);
  const backup = new URL(`../runtime-patch-backups/dsh-llm-pi-ai-${PATCHED_VERSION}-index.js.original`, import.meta.url);
  assert.ok(existsSync(backup), 'pristine backup must exist');
  const pristine = readFileSync(backup, 'utf8');
  assert.equal(createHash('sha256').update(pristine).digest('hex').toUpperCase(), PRISTINE_SHA256);
  const patched = patchSource(pristine);
  assert.ok(patched.includes(REASONING_MARKER));
  assert.ok(patched.includes(ARGUMENTS_MARKER));
  assert.ok(patched.includes(OLLAMA_FETCH_MARKER));
  assert.ok(isFullyPatched(patched));
  assert.equal(patchSource(patched), patched);
  assert.deepEqual(ensureAdapterIntegrityPatch(), { changed: false, version: PATCHED_VERSION });
});

test('actual adapter maps positive reasoningTokens and keeps output inclusive', async () => {
  const chunks = await withAdapter(() => POSITIVE_REASONING, ({ adapter }) => consume(adapter, [
    { role: 'user', content: [{ type: 'text', text: 'hello' }] }
  ]));
  const usage = usageOf(chunks);
  assert.equal(usage.reasoningTokens, 7);
  assert.equal(usage.outputTokens, 40);
  assert.equal(usage.totalTokens, 51);
});

for (const [label, usage] of [['zero', ZERO_REASONING], ['absent', ABSENT_REASONING]]) {
  test(`actual adapter omits reasoningTokens when reasoning is ${label}`, async () => {
    const chunks = await withAdapter(() => usage, ({ adapter }) => consume(adapter, [
      { role: 'user', content: [{ type: 'text', text: 'hello' }] }
    ]));
    const mapped = usageOf(chunks);
    assert.equal('reasoningTokens' in mapped, false);
    assert.equal(mapped.outputTokens, 40);
  });
}

test('actual adapter sends valid nested tool arguments unchanged', async () => {
  const nested = { query: 'alpha', options: { limit: 3, tags: ['a', 'b'] } };
  const { chunks, requests } = await withAdapter(() => POSITIVE_REASONING, async ({ adapter, requests: captured }) => {
    const result = await consume(adapter, [
      { role: 'user', content: [{ type: 'text', text: 'use a tool' }] },
      { role: 'assistant', source: { provider: 'web-fast', model: modelId }, content: [{
        type: 'tool-call', id: 'call-1', name: 'search', arguments: JSON.stringify(nested)
      }] }
    ]);
    return { chunks: result, requests: captured };
  });
  assert.ok(usageOf(chunks));
  assert.equal(requests.length, 1);
  const assistant = requests[0].messages.find((message) => Array.isArray(message.tool_calls));
  assert.ok(assistant, 'serialized request should carry the historical tool call');
  assert.equal(assistant.tool_calls[0].function.name, 'search');
  assert.deepEqual(assistant.tool_calls[0].function.arguments, JSON.stringify(nested));
  assert.deepEqual(JSON.parse(assistant.tool_calls[0].function.arguments), nested);
});

for (const [label, raw] of [
  ['malformed JSON', '{"query":'],
  ['array JSON', '[1,2,3]'],
  ['null JSON', 'null'],
  ['numeric JSON', '42'],
  ['string JSON', '"query"']
]) {
  test(`actual adapter fails loudly before dispatch for ${label} historical tool arguments`, async () => {
    await withAdapter(() => POSITIVE_REASONING, async ({ adapter, requests }) => {
      await assert.rejects(
        () => consume(adapter, [
          { role: 'user', content: [{ type: 'text', text: 'use a tool' }] },
          { role: 'assistant', source: { provider: 'web-fast', model: modelId }, content: [{
            type: 'tool-call', id: 'call-bad', name: 'search', arguments: raw
          }] }
        ]),
        (error) => error instanceof LlmError
          && error.code === INVALID_TOOL_ARGUMENTS_CODE && error.cause === undefined
          && /pi-ai chat history tool call search \(call-bad\)/.test(error.message)
          && /cannot be replayed because its tool-call arguments/.test(error.message)
      );
      assert.equal(requests.length, 0, 'failure must happen before any HTTP dispatch');
    });
  });
}

function durableReplayMessages(raw) {
  return [
    { role: 'user', content: [{ type: 'text', text: 'use a tool' }] },
    { role: 'assistant', source: { provider: 'web-fast', model: modelId, replayState: {
      response: { kind: 'pi-ai', version: 2, api: 'openai-completions',
        provider: 'web-fast', model: modelId, stopReason: 'toolUse' },
      blocks: [{ type: 'tool-call', thoughtSignature: 'sig' }]
    } }, content: [{ type: 'tool-call', id: 'call-replay', name: 'search', arguments: raw }] }
  ];
}

test('durable replay preserves nested arguments and rejects malformed arguments before dispatch', async () => {
  await withAdapter(() => POSITIVE_REASONING, async ({ adapter, requests }) => {
    const nested = { query: 'alpha', options: { limit: 3, tags: ['a', 'b'] } };
    await consume(adapter, durableReplayMessages(JSON.stringify(nested)));
    assert.equal(requests.length, 1);
    const assistant = requests[0].messages.find(message => Array.isArray(message.tool_calls));
    assert.deepEqual(JSON.parse(assistant.tool_calls[0].function.arguments), nested);
    await assert.rejects(() => consume(adapter, durableReplayMessages('{"query":')),
      error => error instanceof LlmError && error.code === INVALID_TOOL_ARGUMENTS_CODE && error.cause === undefined &&
        /Replayed tool call search \(call-replay\).*not valid JSON/.test(error.message));
    assert.equal(requests.length, 1, 'invalid replay must not send another request');
  });
});
