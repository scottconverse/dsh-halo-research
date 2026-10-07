import { execFile } from 'node:child_process';

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

export function createResearchHook({ invoke = run, redditSearch } = {}) {
  return async (exec, next) => {
    if (!['web_fetch', 'web_search'].includes(exec.name)) return next();
    const args = exec.arguments;
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

let redditQueue = Promise.resolve();
let lastRedditRequest = 0;
let redditBlockedUntil = 0;
export async function redditRssSearch(queries, signal) {
  const operation = async () => {
    const sources = [];
    for (const query of queries.slice(0, 2)) {
      signal?.throwIfAborted();
      if (Date.now() < redditBlockedUntil) throw new Error('Reddit RSS rate limited; coverage partial. No further request sent.');
      const wait = Math.max(0, 8000 - (Date.now() - lastRedditRequest));
      if (wait) await new Promise((resolve, reject) => {
        const timer = setTimeout(done, wait);
        function done() { signal?.removeEventListener('abort', abort); resolve(); }
        function abort() { clearTimeout(timer); reject(new Error('Reddit request aborted')); }
        signal?.addEventListener('abort', abort, { once: true });
      });
      signal?.throwIfAborted();
      const url = new URL('https://www.reddit.com/search.rss');
      url.searchParams.set('q', query.replace(/site:reddit\.com/gi, '').trim());
      url.searchParams.set('sort', 'new');
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
        if (link && new URL(link).hostname === 'www.reddit.com') sources.push({ url: link,
          ...(record.title ? { title: record.title } : {}),
          ...(record.body_text ? { snippet: record.body_text.slice(0, 800) } : {}),
          ...(record.created_at ? { publishedAt: record.created_at } : {}) });
      }
    }
    if (!sources.length) throw new Error('No validated Reddit records; coverage partial.');
    return { isError: false, value: { sources, truncated: true,
      content: 'Reddit RSS discovery through reddit-search parser. Comment coverage is unknown. Posts are attributed community statements and leads, not primary verification.' } };
  };
  const pending = redditQueue.then(operation);
  redditQueue = pending.catch(() => {});
  try { return await pending; } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error.message }], error: { message: error.message } };
  }
}
