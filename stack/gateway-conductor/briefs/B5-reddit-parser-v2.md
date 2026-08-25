# Unit B5 (retry) — Reddit RSS provider: URL building + Atom parsing

Same contract as before. Touch only:
`src\halo_research_gateway\providers\reddit_rss.py`,
`tests\fixtures\reddit\`, `tests\unit\test_reddit.py`.

The previous attempt was ONE assertion away: everything passed except
`test_parse_feed_search_fixture`, which failed on the same AssertionError for
three rounds — a mismatch between the fixture you authored and the golden
string your test expected. Mandatory corrections:

1. **Do not assert byte-equality on normalized content strings.** For parsed
   `content_text`, assert with CONTAINMENT and properties instead:
   `"expected phrase" in item.content_text`, `"<" not in item.content_text`,
   `"&amp;" not in item.content_text` (entities decoded), no double spaces.
   Exact-equality assertions are allowed only for short, structural fields:
   titles, permalinks, authors, and built URLs.
2. Before writing the test goldens, print the parser's actual output for each
   fixture once (run it), then write assertions that state the CONTRACT, not
   the incidental formatting.

## Contract (unchanged)

- `build_search_url(query, subreddit=None, sort="relevance")`:
  all-Reddit `https://www.reddit.com/search.rss?q=<urlencoded>&sort=<sort>`;
  subreddit form adds `/r/<sub>/search.rss` and `&restrict_sr=on`; validation:
  sort in {relevance,new,top}, subreddit `^[A-Za-z0-9_]{1,50}$`, query 1..300
  chars; violations raise ValueError; use urllib.parse for encoding.
- `build_thread_rss_url(url)`: only `https://www.reddit.com/r/<sub>/comments/<id>/...`
  permalinks; strip query/fragment; append `.rss` exactly once (idempotent);
  everything else raises ValueError.
- `USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) halo-research-gateway/0.1 (+local-personal-research)"`
- `parse_feed(xml_bytes) -> list[FeedItem]` (dataclass: title, permalink,
  author, updated, content_text, source): defusedxml only; explicit Atom
  namespace; `<content>` via inner text/itertext (never element repr — keep the
  regression assertion `"Element" not in content_text`); strip tags, decode
  entities, collapse whitespace; permalink from `<link href>`; tolerate missing
  author/updated as None; skip unparseable entries; cap content at 10,000 chars.

Keep your three fixtures (search / thread / malformed) or simplify them — you
own both sides; make them consistent.

Run `uv run --frozen python -m pytest -q tests/unit/test_reddit.py` until green
before stopping.
