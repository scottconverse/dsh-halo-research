import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createResearchHook, createRedditAdapter, needsFallback, parseCliJson, wigoloFetch, redditRssSearch, redditRssRequest, isRedditPostInScope } from './research-fallback.mjs';
import { apply } from './tool-catalog.mjs';
import { extendEvidenceSchema } from '../../desktop-tuning/research-tool-hook.mjs';

const signal = new AbortController().signal;
const page = { isError: false, value: { url: 'https://example.com/story', statusCode: 200,
  body: { kind: 'text', content: 'Article body.' }, truncated: false },
  content: [{ type: 'text', text: 'Article body.' }] };
const unusable = { ...page, content: [{ type: 'text', text: 'Navigation\n(Content truncated. Fetch a more specific URL or section for the full text.)' }] };
const payload = JSON.stringify({ url: 'https://example.com/story', http_status: 200,
  markdown: 'Recovered article body with relevant evidence.' });

test('Redlib thread output obeys the installed web_fetch schema and retains evidence in its body', async () => {
  const require = createRequire(import.meta.url);
  const stock = createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
  const base = createRequire(stock.resolve('@deepseek-ai/dsh-base/package.json'));
  const web = await import(pathToFileURL(base.resolve('@deepseek-ai/dsh-tool-web')).href);
  const {validateJsonSchemaValue}=await import(pathToFileURL(base.resolve('@deepseek-ai/dsh-tools')).href);
  let definition;
  web.applyWebFetchTool({systemPrompt:{section(){},getSectionOrder(){return 0;}},
    tools:{register(value){definition=value;}}},30000,14000);
  // A pristine upstream package has the closed stock schema. The shared
  // research plugin, not an old patched node_modules tree, owns this extension.
  extendEvidenceSchema(definition);
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(),'halo-reddit-contract-'));
  const url='https://www.reddit.com/r/Longmont/comments/abc123/ballot/';
  const record={coverage:'partial',threads:[{canonical_reddit_url:url,title:'Ballot',
    retrieved_comment_count:1,reported_comment_count:2,comments:[{body_text:'Retrieved comment'}]}]};
  try {
    const adapter=createRedditAdapter({baseUrl:'http://127.0.0.1:18080',cacheDir,
      fetchImpl:async()=>new Response('fixture'),invoke:async()=>JSON.stringify(record)});
    const result=await adapter.fetch(url,signal);
    assert.equal(result.isError,false);
    const schema=definition.output.schema;
    assert.equal(schema.additionalProperties,false);
    assert.equal(schema.properties.evidenceFile.type,'string');
    assert.equal(schema.properties.coverage.type,'string');
    const compiled=schema;
    assert.deepEqual(validateJsonSchemaValue(compiled,result.value),[]);
    assert.ok(validateJsonSchemaValue(compiled,{...result.value,evidenceFile:42}).length);
    assert.ok(validateJsonSchemaValue(compiled,{...result.value,coverage:{invented:true}}).length);
    assert.ok(validateJsonSchemaValue(compiled,{...result.value,arbitraryField:true}).length);
    for(const key of Object.keys(result.value))assert.ok(key in schema.properties,`undeclared web_fetch field: ${key}`);
    for(const [key,property] of Object.entries(schema.properties))if(property.required)assert.ok(key in result.value);
    assert.match(result.value.body.content,/coverage partial/);
    assert.match(result.value.body.content,/Retrieved 1 of 2/);
    assert.equal(result.value.coverage,'partial');
    assert.equal(typeof result.value.evidenceFile,'string');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(cacheDir,fs.readdirSync(cacheDir)[0]),'utf8')),record);
    assert.match(definition.output.render({},result.value)[0].text,/Retrieved comment/);
  } finally {fs.rmSync(cacheDir,{recursive:true});}
});

test('installed plugin registers retrieval without hiding browser or memory schemas', async () => {
  const hooks = new Map();
  apply({ on: (name, handler) => hooks.set(name, handler) });
  assert.ok(hooks.has('tools/execute'));
  assert.equal(hooks.has('system-prompt/assemble'), false);
  assert.equal(await hooks.get('tools/execute')({ name: 'web_fetch', arguments: { url: page.value.url }, signal }, async () => page), page);
});

test('RSS failure uses configured Redlib, canonicalizes scope and rejects unrelated results', async () => {
  const urls = [];
  const reddit = createRedditAdapter({ rss: async () => ({isError:true,error:{message:'Reddit RSS HTTP 403'}}),
    baseUrl:'http://127.0.0.1:18080', fetchImpl: async url => { urls.push(url.href); return new Response('fixture'); },
    invoke: async (_file, args) => { assert.ok(args.includes('redlib-search')); return JSON.stringify({threads:[
      {canonical_reddit_url:'https://www.reddit.com/r/Longmont/comments/abc123/ballot/',title:'Ballot'},
      {canonical_reddit_url:'https://www.reddit.com/r/Boulder/comments/abc123/ballot/',title:'Wrong scope'}]}); } });
  const result=await reddit.search(['site:reddit.com/r/Longmont ballot'],signal);
  assert.equal(result.isError,false);
  assert.equal(result.value.sources.length,1);
  assert.match(urls[0],/127\.0\.0\.1:18080\/r\/Longmont\/search\?/);
  assert.match(result.value.content,/comments not yet examined/);
});

test('successful RSS and cancellation never enter Redlib fallback', async () => {
  const reddit=createRedditAdapter({rss:async()=>page,baseUrl:()=>{throw new Error('must not enter');}});
  assert.equal(await reddit.search(['Reddit Longmont'],signal),page);
  const controller=new AbortController();controller.abort();
  const cancelled={isError:true,error:{message:'aborted'}};
  const other=createRedditAdapter({rss:async()=>cancelled,baseUrl:()=>{throw new Error('must not enter');}});
  assert.equal(await other.search(['Reddit Longmont'],controller.signal),cancelled);
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
test('named subreddit queries select the restricted RSS endpoint and remove the scope from search terms', () => {
  for (const query of ['site:reddit.com/r/Longmont local news', 'site:www.reddit.com/r/Longmont/ local news', 'r/Longmont local news']) {
    const { url, subreddit } = redditRssRequest(query);
    assert.equal(subreddit, 'Longmont');
    assert.equal(url.pathname, '/r/Longmont/search.rss');
    assert.equal(url.searchParams.get('restrict_sr'), 'on');
    assert.equal(url.searchParams.get('q'), 'local news');
    assert.equal(url.searchParams.get('sort'), 'new');
  }
  assert.throws(() => redditRssRequest('site:reddit.com/r/Longmont site:reddit.com/r/Boulder news'), /Multiple.*partial/);
});
test('ordinary global Reddit queries retain global discovery without an invented subreddit scope', () => {
  for (const query of ['Reddit Longmont', 'site:reddit.com Longmont']) {
    const { url, subreddit } = redditRssRequest(query);
    assert.equal(subreddit, undefined);
    assert.equal(url.pathname, '/search.rss');
    assert.equal(url.searchParams.has('restrict_sr'), false);
    assert.equal(url.searchParams.get('q'), query.startsWith('site:') ? 'Longmont' : query);
  }
});
test('canonical thread validation requires the requested subreddit rather than hostname alone', () => {
  assert.equal(isRedditPostInScope('https://www.reddit.com/r/longmont/comments/abc123/council/', 'Longmont'), true);
  for (const link of ['https://www.reddit.com/r/AIdaily_news/comments/abc123/council/',
    'https://www.reddit.com/r/Longmont/', 'https://www.reddit.com/login',
    'https://www.reddit.com.evil.example/r/Longmont/comments/abc123/council/',
    'https://user@www.reddit.com/r/Longmont/comments/abc123/council/', 'not a URL'])
    assert.equal(isRedditPostInScope(link, 'Longmont'), false, link);
});
test('scoped RSS drops unrelated posts, rejects unrelated-only discovery and respects cancellation during pacing', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  const unrelated = '<entry><title>Unrelated news</title><link href="https://www.reddit.com/r/AIdaily_news/comments/abc123/news/"/><content type="html">Unrelated statement.</content></entry>';
  const relevant = '<entry><title>Local question</title><link href="https://www.reddit.com/r/longmont/comments/def456/local_question/"/><content type="html">A local statement.</content></entry>';
  globalThis.fetch = async url => {
    requests++;
    assert.equal(url.pathname, '/r/Longmont/search.rss');
    assert.equal(url.searchParams.get('q'), 'local news');
    assert.equal(url.searchParams.get('restrict_sr'), 'on');
    return new Response('<feed xmlns="http://www.w3.org/2005/Atom">' + unrelated + (requests === 1 ? relevant : '') + '</feed>');
  };
  try {
    const result = await redditRssSearch(['site:reddit.com/r/Longmont local news'], signal);
    assert.equal(result.isError, false);
    assert.equal(result.value.sources.length, 1);
    assert.match(result.value.sources[0].url, /\/r\/longmont\/comments\/def456\//);
    const controller = new AbortController();
    const pending = redditRssSearch(['site:reddit.com/r/Longmont local news'], controller.signal);
    const timer = setTimeout(() => controller.abort(), 20);
    try {
      const cancelled = await pending;
      assert.equal(cancelled.isError, true);
      assert.match(cancelled.content[0].text, /abort/i);
      assert.equal(requests, 1);
    } finally { clearTimeout(timer); }
    const unrelatedOnly = await redditRssSearch(['site:reddit.com/r/Longmont local news'], signal);
    assert.equal(unrelatedOnly.isError, true);
    assert.match(unrelatedOnly.content[0].text, /No validated.*requested scope.*partial/);
    assert.equal(unrelatedOnly.value, undefined);
    assert.equal(requests, 2);
  } finally { globalThis.fetch = originalFetch; }
});test('Reddit RSS is normalized by the real skill parser, then rate limits stop further requests', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async url => {
    requests++;
    assert.equal(url.pathname, '/search.rss');
    assert.equal(url.searchParams.has('restrict_sr'), false);
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

test('subreddit listings bypass stock fetch, retain sorting/pagination and disclose unexamined comments', async () => {
  const {redditListingScope}=await import('./research-fallback.mjs');
  for(const link of ['https://www.reddit.com/r/Longmont/new/','https://old.reddit.com/r/Longmont/top/?t=week','https://reddit.com/r/Longmont/'])
    assert.equal(redditListingScope(link).subreddit,'Longmont');
  for(const link of ['https://www.reddit.com.evil.test/r/Longmont/new/','https://user@www.reddit.com/r/Longmont/','https://www.reddit.com/login','https://www.reddit.com/user/test','http://www.reddit.com/r/Longmont/'])
    assert.equal(redditListingScope(link),undefined);
  const cacheDir=fs.mkdtempSync(path.join(os.tmpdir(),'halo-listing-'));
  try {
    const url='https://www.reddit.com/r/Longmont/top/?t=week&after=t3_abc123';
    let calls=0;
    const adapter=createRedditAdapter({baseUrl:'http://127.0.0.1:18080',cacheDir,
      fetchImpl:async target=>{calls++;assert.equal(target.pathname,'/r/Longmont/top/');assert.equal(target.search,'?t=week&after=t3_abc123');return new Response('fixture');},
      invoke:async(_file,args)=>{assert.ok(args.includes('redlib-search'));return JSON.stringify({coverage:'complete',threads:[
        {canonical_reddit_url:'https://www.reddit.com/r/Longmont/comments/abc123/ballot/',title:'Ballot'},
        {canonical_reddit_url:'https://www.reddit.com/r/Boulder/comments/abc123/other/',title:'Wrong scope'}]});}});
    const hook=createResearchHook({redditFetch:adapter.fetch});
    const result=await hook({name:'web_fetch',arguments:{url},signal},async()=>{throw Error('stock must not run');});
    assert.equal(calls,1);assert.equal(result.isError,false);assert.equal(result.value.url,url);
    assert.equal(result.value.coverage,'partial');assert.match(result.value.body.content,/Comments not examined/);
    const saved=JSON.parse(fs.readFileSync(result.value.evidenceFile,'utf8'));
    assert.equal(saved.threads.length,1);assert.equal(saved.threads[0].title,'Ballot');
    assert.equal(saved.coverage,'partial');assert.match(saved.warnings.join(' '),/other pages not fetched/);
  } finally {fs.rmSync(cacheDir,{recursive:true});}
});
