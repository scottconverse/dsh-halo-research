import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const NODE = 'C:/Program Files/nodejs/node.exe';
const WIGOLO = 'C:/Users/scott/Desktop/Code/wigolo/dist/index.js';
const REDDIT_PARSER = 'C:/Users/scott/.agents/skills/reddit-search/scripts/reddit_extract.py';

function run(file, args, signal, input) {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { windowsHide: true, timeout: 25000,
      maxBuffer: 2 * 1024 * 1024, signal, encoding: 'utf8' }, (error, stdout) => {
      if (error) reject(error); else resolve(stdout);
    });
    if (input !== undefined) child.stdin.end(input);
  });
}

export function parseCliJson(stdout) {
  // Wigolo can emit JSON log lines before its pretty-printed payload.
  for (let start = stdout.indexOf('{'); start >= 0; start = stdout.indexOf('{', start + 1)) {
    try { return JSON.parse(stdout.slice(start).trim()); } catch {}
  }
  throw new Error('Wigolo returned no valid JSON payload');
}

function publicUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Expected an HTTP(S) URL without credentials');
  return url.href;
}

export function needsFallback(name, result) {
  const text = (result.content || []).map(block => block.text || '').join('\n');
  if (result.isError) return !/abort|cancel|denied|blocked by policy/i.test(text) &&
    !(name === 'web_fetch' && /unauthorized|authentication required|HTTP 40[13]/i.test(text));
  if (name === 'web_search') return /No results found\./i.test(text) ||
    !(result.value?.sources?.length || result.value?.content?.trim());
  if (name !== 'web_fetch') return false;
  if (result.value?.statusCode >= 400) return false; // Don't retry missing or protected pages.
  const body = result.value?.body?.content || '';
  return !body.trim() || /Content truncated\.|\[\.\.\. content truncated\]/i.test(text) ||
    /enable javascript|javascript is required/i.test(text) ||
    ((text.match(/\]\(/g) || []).length > 15 &&
      !text.split('\n').some(line => line.length > 160 && !/[<>]|\]\(/.test(line) && /[.!?]/.test(line)));
}

export async function wigoloFetch(url, signal, invoke = run) {
  const source = publicUrl(url);
  const data = parseCliJson(await invoke(NODE, [WIGOLO, 'fetch', source,
    '--max-content-chars=7000', '--max-tokens-out=2600', '--json'], signal));
  if (data.http_status < 200 || data.http_status >= 300 || !data.markdown?.trim())
    throw new Error('Wigolo returned no usable successful page body');
  console.info('[halo-research] web_fetch automatic Wigolo fallback:', new URL(source).hostname);
  return { isError: false, value: { url: publicUrl(data.url || source),
    statusCode: data.http_status, body: { kind: 'text', content:
      '[Retrieved with automatic Wigolo fallback; content may be partial.]\n\n' + data.markdown },
    truncated: /\[\.\.\. content truncated\]/i.test(data.markdown) } };
}

async function wigoloSearch(queries, signal, invoke) {
  const sources = [];
  for (const query of queries.slice(0, 2)) {
    const data = parseCliJson(await invoke(NODE, [WIGOLO, 'search', query,
      '--limit=3', '--no-content', '--json'], signal));
    for (const row of data.results || []) {
      try {
        const url = publicUrl(row.url);
        if (!sources.some(source => source.url === url)) sources.push({ url,
          ...(row.title ? { title: row.title } : {}), ...(row.snippet ? { snippet: row.snippet } : {}) });
      } catch {}
    }
  }
  if (!sources.length) throw new Error('Wigolo search returned no sources');
  console.info('[halo-research] web_search automatic Wigolo fallback');
  return { isError: false, value: { sources: sources.slice(0, 8),
    content: 'Retrieved with automatic Wigolo fallback. Search snippets are leads, not verified article bodies.',
    truncated: sources.length > 8 || queries.length > 2 } };
}

export function createResearchHook({ invoke = run, redditSearch, redditFetch } = {}) {
  return async (exec, next) => {
    if (!['web_fetch', 'web_search'].includes(exec.name)) return next();
    const args = exec.arguments;
    if (exec.name === 'web_fetch' && redditFetch && (isRedditPostInScope(args.url) || redditListingScope(args.url)))
      return redditFetch(args.url, exec.signal);
    if (exec.name === 'web_search' && redditSearch &&
      args.queries?.some(query => /\breddit\b|site:reddit\.com/i.test(query)))
      return redditSearch(args.queries, exec.signal);
    const stock = await next();
    if (exec.signal?.aborted || !needsFallback(exec.name, stock)) return stock;
    try {
      return exec.name === 'web_fetch' ? await wigoloFetch(args.url, exec.signal, invoke) :
        await wigoloSearch(args.queries, exec.signal, invoke);
    } catch (error) {
      if (exec.signal?.aborted) return stock;
      return { isError: true, content: [{ type: 'text', text:
        'Stock web retrieval was unusable and the bounded Wigolo fallback failed. Coverage is partial. ' +
        String(error.message).slice(0, 400) }], error: { message: 'Research fallback failed' } };
    }
  };
}

// Use the skill's configured, user-owned instance; never rotate public instances.
function configuredRedlib() {
  const raw = JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA || 'C:/Users/scott/AppData/Local', 'RedditSearch/config.json'), 'utf8').replace(/^\uFEFF/, ''));
  if (raw.schemaVersion !== 1 || raw.mode !== 'redlib') throw new Error('No configured Redlib mode');
  return raw.baseUrl;
}

let redlibQueue = Promise.resolve();
let lastRedlibRequest = 0;
async function pacedRedlib(url, signal, fetchImpl) {
  const operation = async () => {
    const wait = Math.max(0, 8000 - (Date.now() - lastRedlibRequest));
    if (wait) await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, wait);
      function abort() { clearTimeout(timer); reject(new Error('Redlib request aborted')); }
      signal?.addEventListener('abort', abort, { once: true });
      setTimeout(() => signal?.removeEventListener('abort', abort), wait);
    });
    signal?.throwIfAborted();
    lastRedlibRequest = Date.now();
    const response = await fetchImpl(url, { signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(20000)]) });
    if (!response.ok) throw new Error(`Redlib HTTP ${response.status}; coverage partial.`);
    const text = await response.text();
    if (text.length > 2 * 1024 * 1024) throw new Error('Oversized Redlib response; coverage partial.');
    return text;
  };
  const pending = redlibQueue.then(operation);
  redlibQueue = pending.catch(() => {});
  return pending;
}

export function createRedditAdapter({ rss = redditRssSearch, baseUrl = configuredRedlib,
  fetchImpl = fetch, invoke = run, cacheDir = 'C:/Users/scott/.dsh-stock/research-cache/reddit' } = {}) {
  async function retrieve(url, kind, signal) {
    const base = new URL(typeof baseUrl === 'function' ? baseUrl() : baseUrl);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || base.username || base.password)
      throw new Error('Configured Redlib must be a credential-free local instance.');
    const target = new URL(url.pathname + url.search, base);
    const html = await pacedRedlib(target, signal, fetchImpl);
    // Parser validates Redlib identity, required structures, canonical permalinks and thread identity.
    const record = JSON.parse(await invoke('python', [REDDIT_PARSER, 'parse', kind, '--source-url', target.href], signal, html));
    return { record, target };
  }
  return {
    async search(queries, signal) {
      const initial = await rss(queries, signal);
      if (!initial.isError || signal?.aborted || /abort|cancel|denied|blocked by policy/i.test(initial.error?.message || '')) return initial;
      try {
        const sources = [];
        for (const query of queries.slice(0, 2)) {
          const { url, subreddit } = redditRssRequest(query);
          url.pathname = subreddit ? `/r/${subreddit}/search` : '/search';
          const { record } = await retrieve(url, 'redlib-search', signal);
          for (const row of (record.threads || []).slice(0, 6)) {
            if (isRedditPostInScope(row.canonical_reddit_url, subreddit)) sources.push({ url: row.canonical_reddit_url,
              title: row.title, snippet: (row.body_text || '').slice(0, 800), publishedAt: row.created_at });
          }
        }
        if (!sources.length) throw new Error('No validated Redlib posts in requested scope');
        return { isError: false, value: { sources, truncated: true, content:
          'Reddit RSS unavailable; retrieved through configured local Redlib and reddit-search parser. Coverage partial; comments not yet examined. Community statements are leads, not primary verification.' } };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: `${initial.error?.message || 'RSS failed'} Local Redlib also failed: ${error.message}. Coverage partial.` }] };
      }
    },
    async fetch(url, signal) {
      try {
        const canonical = new URL(publicUrl(url));
        const listing = redditListingScope(canonical.href);
        if (!listing && !isRedditPostInScope(canonical.href)) throw new Error('Expected a canonical Reddit post or subreddit listing');
        const { record } = await retrieve(canonical, listing ? 'redlib-search' : 'redlib-thread', signal);
        if (listing) {
          const rows = record.threads || [];
          record.threads = rows.filter(row => isRedditPostInScope(row.canonical_reddit_url, listing.subreddit));
          if (rows.length && !record.threads.length) throw new Error('No validated Redlib posts in requested subreddit');
          record.coverage = 'partial';
          record.warnings = [...(record.warnings || []), 'Listing page only; comments not examined; other pages not fetched.'];
        }
        fs.mkdirSync(cacheDir, { recursive: true });
        const file = path.join(cacheDir, createHash('sha256').update(canonical.href).digest('hex').slice(0, 20) + '.json');
        fs.writeFileSync(file, JSON.stringify(record, null, 2));
        const thread = record.threads[0];
        const text = JSON.stringify(record, null, 2);
        if (listing) return { isError: false, value: { url: canonical.href, statusCode: 200,
          body: { kind: 'text', content: `Local Redlib listing; coverage partial. Retrieved ${record.threads.length} posts on this page. Comments not examined; other pages not fetched. Full normalized evidence: ${file}\n\n${text.slice(0, 7000)}` },
          truncated: text.length > 7000, evidenceFile: file, coverage: 'partial' } };
        return { isError: false, value: { url: thread.canonical_reddit_url, statusCode: 200,
          body: { kind: 'text', content: `Local Redlib thread; coverage ${record.coverage}. Full normalized evidence: ${file}\nRetrieved ${thread.retrieved_comment_count} of ${thread.reported_comment_count ?? 'unknown'} reported comments. Read the saved JSON for comments beyond this preview.\n\n${text.slice(0, 7000)}` },
          truncated: text.length > 7000, evidenceFile: file, coverage: record.coverage } };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: `Local Redlib retrieval failed: ${error.message}. Coverage partial.` }] };
      }
    },
  };
}

// A named subreddit is a search boundary, not text to send to global search.
export function redditRssRequest(query) {
  const subreddits = new Map();
  const capture = (_match, subreddit) => {
    subreddits.set(subreddit.toLowerCase(), subreddit);
    return ' ';
  };
  let terms = query.replace(/(?:^|\s)(?:site:)?(?:https?:\/\/)?(?:(?:www|old)\.)?reddit\.com\/r\/([a-z0-9_]+)\/?(?=\s|$)/gi, capture);
  terms = terms.replace(/(?:^|\s)\/?r\/([a-z0-9_]+)\/?(?=\s|$)/gi, capture);
  if (subreddits.size > 1) throw new Error('Multiple Reddit subreddit scopes in one query; coverage partial. Split them into separate searches.');
  const subreddit = subreddits.values().next().value;
  const url = new URL(subreddit ? `https://www.reddit.com/r/${subreddit}/search.rss` : 'https://www.reddit.com/search.rss');
  url.searchParams.set('q', terms.replace(/\bsite:(?:(?:www|old)\.)?reddit\.com\/?(?=\s|$)/gi, '').trim());
  if (subreddit) url.searchParams.set('restrict_sr', 'on');
  url.searchParams.set('sort', 'new');
  return { url, subreddit };
}

// Only known subreddit listing routes; do not redirect login, user or arbitrary URLs.
export function redditListingScope(link) {
  try {
    const url = new URL(link);
    const match = url.pathname.match(/^\/r\/([a-z0-9_]+)(?:\/(?:new|hot|top|rising|controversial|search))?\/?$/i);
    return url.protocol === 'https:' && !url.username && !url.password &&
      ['reddit.com', 'www.reddit.com', 'old.reddit.com'].includes(url.hostname) && match
      ? { subreddit: match[1] } : undefined;
  } catch { return undefined; }
}

export function isRedditPostInScope(link, subreddit) {
  try {
    const url = new URL(link);
    const match = url.pathname.match(/^\/r\/([a-z0-9_]+)\/comments\/[a-z0-9]+\/[^/]+\/?$/i);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.hostname === 'www.reddit.com' && Boolean(match) &&
      (!subreddit || match[1].toLowerCase() === subreddit.toLowerCase());
  } catch { return false; }
}
let redditQueue = Promise.resolve();
let lastRedditRequest = 0;
let redditBlockedUntil = 0;
export async function redditRssSearch(queries, signal) {
  const operation = async () => {
    const sources = [];
    for (const query of queries.slice(0, 2)) {
      signal?.throwIfAborted();
      const { url, subreddit } = redditRssRequest(query);
      if (Date.now() < redditBlockedUntil) throw new Error('Reddit RSS rate limited; coverage partial. No further request sent.');
      const wait = Math.max(0, 8000 - (Date.now() - lastRedditRequest));
      if (wait) await new Promise((resolve, reject) => {
        const timer = setTimeout(done, wait);
        function done() { signal?.removeEventListener('abort', abort); resolve(); }
        function abort() { clearTimeout(timer); reject(new Error('Reddit request aborted')); }
        signal?.addEventListener('abort', abort, { once: true });
      });
      signal?.throwIfAborted();
      lastRedditRequest = Date.now();
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 HaloResearch/1.0' },
        signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(15000)]) });
      if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        const delay = /^\d+$/.test(retry || '') ? Number(retry) * 1000 : Date.parse(retry || '') - Date.now();
        redditBlockedUntil = Date.now() + Math.max(60000, Number.isFinite(delay) ? delay : 60000);
        throw new Error('Reddit RSS HTTP 429; stopped this path, coverage partial.');
      }
      if (!response.ok) throw new Error('Reddit RSS HTTP ' + response.status + '; coverage partial.');
      const text = await response.text();
      if (text.length > 1024 * 1024 || !/<feed[\s>]/.test(text)) throw new Error('Invalid or oversized Reddit RSS; coverage partial.');
      const parsed = JSON.parse(await run('python', [REDDIT_PARSER, 'parse', 'rss', '--source-url', url.href], signal, text));
      const records = Array.isArray(parsed) ? parsed : parsed.threads || [];
      for (const record of records.slice(0, 6)) {
        const link = record.canonical_reddit_url;
        if (isRedditPostInScope(link, subreddit)) sources.push({ url: link,
          ...(record.title ? { title: record.title } : {}),
          ...(record.body_text ? { snippet: record.body_text.slice(0, 800) } : {}),
          ...(record.created_at ? { publishedAt: record.created_at } : {}) });
      }
    }
    if (!sources.length) throw new Error('No validated Reddit posts matching the requested scope; coverage partial.');
    return { isError: false, value: { sources, truncated: true,
      content: 'Reddit RSS discovery through reddit-search parser. Comment coverage is unknown. Posts are attributed community statements and leads, not primary verification.' } };
  };
  const pending = redditQueue.then(operation);
  redditQueue = pending.catch(() => {});
  try { return await pending; } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error.message }], error: { message: error.message } };
  }
}
