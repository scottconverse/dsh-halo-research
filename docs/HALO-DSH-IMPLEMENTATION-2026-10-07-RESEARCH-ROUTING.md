# DSH Web research routing repair


## Research fallback repair - 2026-10-07

Web fast-first now treats missing provider/authentication, empty or navigation-only
bodies, JavaScript shells, and truncation missing the requested evidence as
unusable results, including HTTP 200. After one unusable stock web result, the
agent must load desktop-optional-tools and try the existing Wigolo CLI before
repeating stock fetches. Truncation alone is not proof of a paywall.
Explicit Reddit requests and community/practitioner research require reddit-search,
with RSS discovery, validation, pacing, and partial-coverage reporting. Reddit is
not primary verification of a news claim. No MCP catalog was enabled.

Installed Web profile and fast-first preset were updated with backups; only
persona prefixes changed and parsed unrelated YAML values were preserved.
The shared optional-tools skill was updated. Web was restarted after the news
turn ended. LM Studio retained only halo-fast-35b-q6; 27B remained unloaded.
Wigolo retrieved actual article prose from the same Times-Call URL stock fetch
returned as navigation. Reddit live validation hit HTTP 429; no further retry
was made. A future model turn still needs to demonstrate skill selection.
The failed news turn ended max-tokens with one output token; no finished story
or editorial audit was observed. This repair does not claim that failure solved.


### Native tool fallback added after the prompt-only repair failed

The fast-first tool-catalog now installs a preset-scoped tools/execute hook.
It automatically tries the existing Wigolo CLI once after unusable stock fetch
content (including displayed truncation/navigation) or missing/empty stock
search results. Results pass through the stock output schema and renderer;
pre-execute policies and post-execute checks remain in place. Cancellation,
policy denials, protected pages and HTTP 404 do not trigger fetch retries.
Each CLI call is capped at 25 seconds and bounded output. Failures explicitly
report partial coverage rather than silently returning navigation as evidence.
Queries explicitly mentioning Reddit use sequential Reddit RSS and the existing
reddit-search Python parser, with eight-second pacing and Retry-After handling.
RSS discovery has unknown comment coverage; no Redlib server was installed.

Nine checks passed, including actual Wigolo retrieval of the failing Times-Call
article and the real Reddit parser with controlled RSS/429 responses. Live Reddit
availability remains unverified after its earlier rate limit. Installed adapter
modules match canonical sources. Web was restarted after the news turn ended;
35B remains loaded and 27B remains unloaded. The news session again ended at
max-tokens; this adapter does not claim to fix that separate model termination.
