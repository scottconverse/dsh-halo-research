import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import {
	createOllamaTimeoutFetch,
	ollamaTimeoutAgentOptions
} from '../ollama-timeout-fetch.mjs';

const require = createRequire(import.meta.url);
const deploymentRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pnpmStore = join(deploymentRoot, 'node_modules', '.pnpm');
const piAiStoreEntry = readdirSync(pnpmStore).find(name => name.startsWith('@earendil-works+pi-ai@1.0.2_'));
assert.ok(piAiStoreEntry, 'the deployment lock should provide its pinned pi-ai package');
const piAiDirectory = join(pnpmStore, piAiStoreEntry, 'node_modules', '@earendil-works', 'pi-ai');
const openAiEntry = createRequire(join(piAiDirectory, 'dist', 'api', 'openai-completions.js')).resolve('openai');
const { default: OpenAI } = await import(pathToFileURL(openAiEntry).href);

test('Ollama transport timeouts remain beyond the SDK and stream idle limits', () => {
	assert.deepEqual(ollamaTimeoutAgentOptions({
		provider: 'ollama-local', timeoutMs: 600000, streamIdleTimeoutMs: 600000
	}), { headersTimeout: 601000, bodyTimeout: 601000 });
	assert.deepEqual(ollamaTimeoutAgentOptions({
		provider: 'ollama-local', timeoutMs: 720000, streamIdleTimeoutMs: 600000
	}), { headersTimeout: 721000, bodyTimeout: 721000 });
});

test('profile transport reuses its Agent and preserves the OpenAI fetch init and cancellation signal', async () => {
	const profile = { provider: 'ollama-local', timeoutMs: 600000, streamIdleTimeoutMs: 600000 };
	const instances = [];
	const calls = [];
	class FakeAgent {
		constructor(options) { this.options = options; this.closed = false; instances.push(this); }
		async close() { this.closed = true; }
	}
	const controller = new AbortController();
	const fakeFetch = async (input, init) => {
		calls.push({ input, init });
		return { ok: true };
	};
	const fetch = createOllamaTimeoutFetch(profile, { Agent: FakeAgent, fetch: fakeFetch });
	const snapshotFetch = createOllamaTimeoutFetch({ ...profile }, { Agent: FakeAgent, fetch: fakeFetch });
	assert.strictEqual(snapshotFetch, fetch,
		'equivalent config snapshots should reuse one Agent for the same timeout and implementation');
	class OtherAgent {
		constructor(options) { this.options = options; this.closed = false; instances.push(this); }
		async close() { this.closed = true; }
	}
	const otherFetch = createOllamaTimeoutFetch({ ...profile }, { Agent: OtherAgent, fetch: fakeFetch });
	assert.notStrictEqual(otherFetch, fetch, 'a different Agent implementation must use its own dispatcher');
	const headers = { authorization: 'test-only' };
	const body = '{"messages":[]}';
	const result = await fetch('http://127.0.0.1/v1/chat/completions', {
		method: 'POST', headers, body, signal: controller.signal
	});
	assert.equal(result.ok, true);
	assert.equal(instances.length, 2, 'the Agent must not be created per profile or request');
	assert.deepEqual(instances[0].options, { headersTimeout: 601000, bodyTimeout: 601000 });
	assert.equal(calls.length, 1);
	assert.equal(calls[0].input, 'http://127.0.0.1/v1/chat/completions');
	assert.equal(calls[0].init.method, 'POST');
	assert.strictEqual(calls[0].init.headers, headers);
	assert.equal(calls[0].init.body, body);
	assert.strictEqual(calls[0].init.signal, controller.signal);
	assert.strictEqual(calls[0].init.dispatcher, instances[0]);
	await snapshotFetch('http://127.0.0.1/v1/chat/completions', { method: 'POST' });
	assert.equal(calls[1].init.dispatcher, instances[0], 'a later equivalent snapshot should keep using the shared Agent');
	await otherFetch('http://127.0.0.1/v1/chat/completions', { method: 'POST' });
	assert.equal(calls[2].init.dispatcher, instances[1], 'the other implementation should keep its own Agent');
	assert.equal(instances.length, 2, 'one Agent per timeout and implementation, not per profile or request');
	assert.equal(instances[0].closed, false);
	assert.equal(instances[1].closed, false, 'using the shared Agent must not close a separate implementation');
});

test('actual OpenAI SDK streams through the same Undici fetch and Agent', async () => {
	const chunks = [];
	const server = createServer(async (request, response) => {
		for await (const _part of request) { /* consume the SDK request body */ }
		response.writeHead(200, { 'content-type': 'text/event-stream' });
		const events = [
			{ id: 'undici-contract', object: 'chat.completion.chunk', created: 1, model: 'test-model', choices: [{ index: 0, delta: { content: 'transport-ok' }, finish_reason: null }] },
			{ id: 'undici-contract', object: 'chat.completion.chunk', created: 1, model: 'test-model', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }
		];
		response.end(`${events.map(event => `data: ${JSON.stringify(event)}`).join('\n\n')}\n\ndata: [DONE]\n\n`);
	});
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const profile = { provider: 'ollama-local', timeoutMs: 600000, streamIdleTimeoutMs: 600000 };
	const client = new OpenAI({
		apiKey: 'test-only',
		baseURL: `http://127.0.0.1:${server.address().port}/v1`,
		timeout: 600000,
		maxRetries: 0,
		fetch: createOllamaTimeoutFetch(profile)
	});
	try {
		const stream = await client.chat.completions.create({
			model: 'test-model',
			messages: [{ role: 'user', content: 'hello' }],
			stream: true
		});
		for await (const chunk of stream) chunks.push(chunk);
		assert.equal(chunks[0]?.choices?.[0]?.delta?.content, 'transport-ok');
		assert.ok(chunks.some(chunk => chunk.choices?.[0]?.finish_reason === 'stop'));
	} finally {
		server.closeAllConnections();
		await new Promise(resolve => server.close(resolve));
	}
});
