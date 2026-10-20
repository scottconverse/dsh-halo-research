# Reddit listing fetch repair — October 19, 2026

## Cause and change

The shared Web/Desktop research hook intercepted only canonical Reddit post permalinks. Subreddit listing URLs therefore reached generic web_fetch and could return Reddit's empty JavaScript shell. Both apps use stack/stock-dsh/fast-first-preset/research-fallback.mjs; Desktop imports it through its existing research-tool-hook.mjs.

The hook now routes supported subreddit listings to the existing user-owned local Redlib service and the installed reddit-search parser's redlib-search mode. Supported paths are /r/name, and /r/name/new, hot, top, rising, controversial or search, with optional trailing slash. HTTPS reddit.com, www.reddit.com and old.reddit.com are accepted for these listings. Query parameters such as t, after and search terms are preserved. Login/user/arbitrary paths, credentialed URLs and deceptive hosts are not intercepted. Existing post routing and RSS/search behavior remain unchanged.

Returned posts are restricted to validated canonical permalinks in the requested subreddit. Normalized evidence is saved in the existing per-app cache, using the existing typed web_fetch evidence fields. Listings explicitly report partial coverage: comments not examined; other pages not fetched. No comments or additional pages are fetched automatically. The existing single local service, pacing, timeout, cancellation, response-size guard and strict output schema remain in use. No new dependencies, providers or services.

## Verification and deployment

Affected adapter suite:16 passed,0 failed,1 existing opt-in live Wigolo fixture skipped, approximately32 seconds. The added regression checks direct hook interception, exact sorting/pagination preservation, subreddit filtering, safe hostname/path boundaries, saved evidence and partial comment/page coverage. Existing thread schema/RSS/fallback tests also passed. No unrelated test suites or benchmarks were run; no subagents.

One real invocation of the shared installed hook used web_fetch on https://www.reddit.com/r/Longmont/new/ with stock fallback prohibited. It returned HTTP200,25 parsed posts, first title Monday Market and canonical permalink https://www.reddit.com/r/Longmont/comments/1x9w9rv/monday_market/ . The evidence explicitly states comments not examined and other pages not fetched. Evidence retained privately at C:\Users\scott\.dsh-stock\research-cache\reddit\80b44eb997b9b21d0cb0.json. This was direct execution of the deployed adapter with the real local Redlib/parser, not a model-generated claim or a new DSH model task. No generation tokens were used for this check; coordinator usage is unavailable.

Before reload, Mission Control showed no active or queued Web jobs and current stream data; Desktop's latest actual turn was completed. Web was restarted through its scoped stop/start scripts; Desktop through its existing preserved-home VBS launcher after checking the root executable identity. Model/profile/provider configuration was not edited. Existing versions and release tag v0.3.2 remain unchanged; this repair is a subsequent source commit, not a moved release tag.

Backup of the original adapter is private under C:\Users\scott\Documents\Codex\2026-10-19\dsh-upgrade-v032\research-fallback-before-listing.mjs. Recovery: restore the preceding committed adapter and reload the affected idle app. Raw listing evidence and private backups are not published. Historical upgrade reports retain the limitation as it existed at the time; this record supersedes it for supported subreddit listings.

Post-reload readback: Web ready on the preserved DeepSeek1017 route, 181 active/29 disabled/0 failed/0 waiting plugins and no active/queued jobs. Desktop host process is running with its preserved desktop profile path. No extra model job was submitted.
