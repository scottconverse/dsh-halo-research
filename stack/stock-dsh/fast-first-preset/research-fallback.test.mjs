import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchHook, needsFallback, parseCliJson, wigoloFetch, redditRssSearch } from './research-fallback.mjs';
import { apply } from './tool-catalog.mjs';

const signal = new AbortController().signal;
const page = { isError: false, value: { url: 'https://example.com/story', statusCode: 200,
  body: { kind: 'text', content: 'Article body.' }, truncated: false },
  content: [{ type: 'text', text: 'Article body.' }] };
const unusable = { ...page, content: [{ type: 'text', text: 'Navigation\n(Content truncated. Fetch a more specific URL or section for the full text.)' }] };
const payload = JSON.stringify({ url: 'https://example.com/story', http_status: 200,
  markdown: 'Recovered article body with relevant evidence.' });

test('installed plugin registers the native execution hook and preserves catalog filtering', async () => {
  const hooks = new Map();
  apply({ on: (name, handler) => hooks.set(name, handler) });
  assert.ok(hooks.has('tools/execute'));
  const assembly = await hooks.get('system-prompt/assemble')({}, {}, async () => ({ tools: [{name:'web_fetch'}, {name:'mcp__hidden'}], sections: [] }));
  assert.deepEqual(assembly.tools.map(tool => tool.name), ['web_fetch']);
  assert.equal(await hooks.get('tools/execute')({ name: 'web_fetch', arguments: { url: page.value.url }, signal }, async () => page), page);
});

test('HTTP 200 truncation triggers exactly one automatic CLI fetch', async () => {
  let calls = 0;
  const hook = createResearchHook({ invoke: async (_file, args) => {
    calls++; assert.equal(args[1], 'fetch'); assert.equal(args[2], page.value.url); return payload;
  } });
  const result = await hook({ name: 'web_fetch', arguments: { url: page.value.url }, signal }, async () => unusable);
  assert.equal(calls, 1); assert.equal(result.isError, false);
  assert.match(result.value.body.content, /Recovered article/);
});
test('usable bodies, 404, access policy denials and cancellation do not invoke fallback', async () => {
  assert.equal(needsFallback('web_fetch', page), false);
  assert.equal(needsFallback('web_fetch', { ...unusable, value: { ...page.value, statusCode: 404 } }), false);
  assert.equal(needsFallback('web_fetch', { isError: true, content: [{ text: 'blocked by policy' }] }), false);
  const controller = new AbortController(); controller.abort();
  const hook = createResearchHook({ invoke: async () => { throw new Error('must not invoke'); } });
  assert.equal(await hook({ name: 'web_fetch', arguments: { url: page.value.url }, signal: controller.signal }, async () => unusable), unusable);
});
test('failed fallback reports partial coverage without retrying', async () => {
  let calls = 0;
  const hook = createResearchHook({ invoke: async () => { calls++; throw new Error('timeout'); } });
  const result = await hook({ name: 'web_fetch', arguments: { url: page.value.url }, signal }, async () => unusable);
  assert.equal(calls, 1); assert.equal(result.isError, true); assert.match(result.content[0].text, /partial/);
});
test('missing stock search provider falls back with sources in stock result shape', async () => {
  const hook = createResearchHook({ invoke: async () => JSON.stringify({ results: [{ url: 'https://example.com', title: 'Record', snippet: 'Evidence' }] }) });
  const result = await hook({ name: 'web_search', arguments: { queries: ['local council'] }, signal }, async () => ({ isError: true, content: [{ text: 'missing provider authentication' }] }));
  assert.equal(result.value.sources.length, 1); assert.equal(result.isError, false);
});
test('Reddit query routes to RSS adapter without sending the stock query', async () => {
  let routed = false;
  const hook = createResearchHook({ redditSearch: async () => { routed = true; return page; } });
  await hook({ name: 'web_search', arguments: { queries: ['site:reddit.com Longmont'] }, signal }, async () => { throw new Error('stock must not run'); });
  assert.equal(routed, true);
});
test('CLI payload parser ignores prefixed log lines and rejects malformed results', () => {
  assert.equal(parseCliJson('{"log":"ready"}\n' + payload).http_status, 200);
  assert.throws(() => parseCliJson('no JSON'));
});
test('Reddit RSS is normalized by the real skill parser, then rate limits stop further requests', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    if (requests > 1) return new Response('', { status: 429, headers: { 'retry-after': '60' } });
    return new Response('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Local question</title><link href="https://www.reddit.com/r/Longmont/comments/abc123/local_question/"/><updated>2026-10-07T12:00:00Z</updated><content type="html">A community statement.</content></entry></feed>', { status: 200 });
  };
  try {
    const result = await redditRssSearch(['Reddit Longmont'], signal);
    assert.equal(result.isError, false);
    assert.equal(result.value.sources[0].publishedAt, '2026-10-07T12:00:00Z');
    assert.match(result.value.sources[0].url, /reddit.com\/r\/Longmont/);
    const limited = await redditRssSearch(['Reddit Longmont'], signal);
    assert.equal(limited.isError, true); assert.match(limited.content[0].text, /429/);
    await redditRssSearch(['Reddit Longmont'], signal);
    assert.equal(requests, 2);
  } finally { globalThis.fetch = originalFetch; }
});
test('live Wigolo retrieves the article that stock fetch truncated', { skip: !process.env.HALO_LIVE_RESEARCH_TEST }, async () => {
  const result = await wigoloFetch('https://www.timescall.com/2026/10/07/dariss-yearby-shooting-family-longmont-council/', signal);
  assert.equal(result.value.statusCode, 200);
  assert.match(result.value.body.content, /Yearby/);
  assert.match(result.value.body.content, /family|relatives/i);
  assert.ok(result.value.body.content.length > 1000);
});
