# Unit B5 — Reddit RSS provider: URL building + Atom parsing (no network)

Work ONLY in this repository. Touch only:
`src\halo_research_gateway\providers\reddit_rss.py`,
`tests\fixtures\reddit\` (new fixture files you author),
`tests\unit\test_reddit.py`.

This unit is pure logic: URL construction and feed parsing. NO network calls
anywhere — parsing operates on bytes handed to it; tests use local fixtures.

## reddit_rss.py

- `build_search_url(query, subreddit=None, sort="relevance") -> str`
  - all-Reddit: `https://www.reddit.com/search.rss?q=<urlencoded>&sort=<sort>`
  - one subreddit: `https://www.reddit.com/r/<subreddit>/search.rss?q=<urlencoded>&restrict_sr=on&sort=<sort>`
  - `sort` must be one of `relevance|new|top`; `subreddit` must match
    `^[A-Za-z0-9_]{1,50}$`; query must be 1..300 chars; violations raise
    `ValueError`. Use a standards-compliant encoder — never string-concatenate
    raw query text.
- `build_thread_rss_url(url) -> str`: accept only public
  `https://www.reddit.com/r/<sub>/comments/<id>/...` permalinks; strip query
  and fragment; append `.rss` exactly once (idempotent if already present);
  anything else (other hosts, `old.reddit.com`, non-thread paths) raises
  `ValueError`.
- `USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) halo-research-gateway/0.1 (+local-personal-research)"`
- `parse_feed(xml_bytes) -> list[FeedItem]` where `FeedItem` is a dataclass:
  `title, permalink, author, updated, content_text, source`.
  - Parse with **defusedxml** (never plain ElementTree on remote bytes).
  - Handle the Atom namespace explicitly.
  - Extract `<content>` via the element's INNER TEXT (itertext), never the
    element object's string representation — a regression test must prove the
    result contains no `XmlElement` / object-repr artifacts.
  - Strip all HTML tags from content, decode entities, collapse whitespace.
  - `permalink` from the entry's `<link href>`; keep it canonical
    (`https://www.reddit.com/...`).
  - Tolerate missing author/updated (None), skip malformed entries rather than
    raising, and cap `content_text` at 10,000 chars.

## Fixtures you must author (realistic minimal Atom)

1. `search.atom`: 3 entries with title/link/author/updated and HTML-encoded
   `<content type="html">` including entities (`&amp;`, `&#39;`) and tags.
2. `thread.atom`: a post entry plus 3 comment entries, one entry missing
   author, one with empty content.
3. `malformed.atom`: one good entry plus one broken entry (unclosed tag inside
   content handled by making it a separate invalid entry) — parser returns the
   good entries it can.

## tests

- URL building goldens for both search forms and the thread form, including
  encoding of spaces/`&`/unicode in queries; every validation rejection.
- Thread URL: query/fragment stripped; `.rss` idempotent; `old.reddit.com`,
  `evil.com`, and a user-profile URL all rejected.
- Parsing each fixture: counts, titles, permalinks, entity decoding, tag
  stripping, no object-repr artifacts (assert `"Element"` not in content),
  missing-field tolerance, malformed-entry survival, content cap.

Run `uv run --frozen python -m pytest -q tests/unit/test_reddit.py` yourself and
make it pass before stopping.
