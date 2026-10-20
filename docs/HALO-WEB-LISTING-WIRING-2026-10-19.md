# Web active-preset listing wiring — October 19, 2026

## Confirmed defect and correction

The previous listing implementation and v0.3.3 were correct in the maintained shared adapter, but Web's active Halo fast-first preset loaded a different on-disk copy: C:\Users\scott\.dsh-stock\.agent-presets\fast-first\research-fallback.mjs. That stale copy recognized post permalinks only. Restarting Web did not synchronize it. The earlier claim that restarting had enabled the fix in both apps was incorrect. Desktop's existing import referenced the repository adapter and its subsequent in-app check succeeded; Web's first in-app check returned only Reddit's shell.

The minimal correction changes one import in fast-first-preset/tool-catalog.mjs, applied identically to its live deployed copy: the relative research-fallback.mjs import now points to the maintained repository adapter's file URL. This matches the existing machine-specific deployment layout and avoids future drift between a copied Web adapter and the source used by Desktop. This is not a portable standalone installation; moving the checkout requires updating this path, as with other deployment file URLs.

No provider, model, default, effort, integration, parser or retrieval logic changed. Live Web cordis.patch.yml remained byte-for-byte identical. Source and deployed tool-catalog hashes both equal E8CE8D4D1A3F1EE27A8D796A47C3E9A700971EE98E5CE160EAA23972951C66F0. The old unused fallback copy is retained; the active import no longer uses it. Only the idle Web stack was restarted using its standard scoped launchers. Desktop was not modified or restarted in this correction.

## One actual Web acceptance

Submitted through DSH Web's active Halo fast-first preset, in existing session session-eace720c-f98d-4a25-990a-3645e596416c, turn2:

> Use web_fetch exactly once on https://www.reddit.com/r/Longmont/new/ . In under 40 words give one post title and its canonical Reddit link, retrieval method, and comment-coverage limitation. No other tools, files, skills, or retries.

Actual tool result seq35: HTTP200, Local Redlib listing, source_adapter redlib-html, source_instance127.0.0.1:18080,25 posts, coverage partial. Explicit warning: Listing page only; comments not examined; other pages not fetched. Preview was truncated and full normalized evidence remained in the existing cache. The answer supplied a retrieved T-Mobile Service Update post and its canonical Reddit link. Turn ended completed at seq40 after2173ms. Exactly one tool call; no retries, other tools, subagents, benchmarks or test suites.

Requests retained DeepSeek V4.1 Flash1017 Cloud, reasoningOff,maxTokens8192. Logged turn usage25393+27443=52836 tokens, consisting of2140 uncached input,50560 cached input and136 output. Coordinator usage is unavailable. No automatic title request was needed because the existing session was reused.

Private before-copy/profile backup, raw session evidence and completion state: C:\Users\scott\Documents\Codex\2026-10-19\dsh-listing-web-wiring. These are excluded from GitHub. For rollback restore the backed-up deployed tool-catalog.mjs and preceding committed source import, then reload idle Web. Model/profile configuration is unchanged. Local Halo Stack Research reading/recovery copies are synchronized. This correction is a subsequent source commit; existing release tags are not moved.
