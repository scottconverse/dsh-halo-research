# Desktop real LSP and session-query verification — October 20, 2026

## Outcome

Both requested tools executed successfully through the installed Desktop 0.2.1-rc.2 host. This is runtime tool execution, not a registration check. No application code or normal configuration was changed.

- LSP: TypeScript language server goToDefinition on line 94, column 21 of an exact temporary JavaScript copy of the deployed compactor returned **Desktop-LSP-Verification.js:12:17**. Actual tool result, isError=false; 755 ms.
- Session query: session_search returned **one persisted prior-session result**, session-326bc19c-34ad-4138-940f-d483d727e1ea, assistant event **31**, with the expected retained-task passage containing LIME-AUTO-20. Actual tool result, isError=false; 34 ms.

## Method and limits

Used the actual installed Electron Desktop host and its stock session/prompt RPC, with a physical copy of normal Desktop dependencies and profile in an isolated home. The home-level configuration was copied with only its SQLite location redirected into that home. All normal tools remained enabled. The prior completed Desktop session log was copied unchanged and indexed by Desktop. This verifies installed host behavior; no GUI interaction or claim about the visible picker is involved.

The LSP input file was an exact copy of real deployed source, SHA-256 79b5a6094f9644d2c4a4bb06c57dea4c03a40b64ffa2f29a9e9291a4f8899f61. The .js extension lets the configured TypeScript provider handle the source. This file and isolated dependency copy are temporary verification artifacts.

## Failed attempts and correction

The initial runner expected a session log before sending its first prompt. Blank sessions do not have a log yet; this runner error occurred before inference and was corrected.

The first actual turn performed one successful LSP call and one session search. That search returned no matches. Read-only inspection confirmed the target event was indexed, but the copied history stored its Windows workspace with backslashes while the new caller used forward slashes. The stock query tool enforces exact cwd string equality. The fixture therefore created a different workspace identity despite resolving to the same Windows folder.

One search-only correction used the exact stored cwd and succeeded. LSP was not repeated. Preparing that correction initially also changed the runner home path unintentionally; the host exited before readiness/inference because its manifest was absent. The path was corrected before the successful search. No deployment repair was required. Exact-string workspace comparison remains a limitation; this work does not claim path normalization is fixed.

## Preservation and scope

Six normal Web/Desktop configuration, manifest and lock files matched their before hashes after execution. Actual request headers retained Ollama deepseek-v4.1-flash:1017-cloud, Low effort and 65,536 maximum output tokens. No models/defaults/integrations were edited. No tools were disabled. No subagents, benchmarks, token padding or compaction tests ran; durable logs contain zero compaction events. Only owned isolated Desktop hosts were shut down, and both inference runs exited with code 0.

## Timing, usage and evidence

The initial model turn ended at 20:27:09.733 UTC; its owned host ran from 20:27:04.629 to 20:27:10.510 UTC. The corrected search turn ended at 20:29:08.399 UTC; its owned host ran from 20:29:05.301 to 20:29:09.386 UTC. These are short tool checks, not throughput measurements.

Provider-reported per-response usage, configuration, exact calls/results, process exits and preservation hashes are in [results.json](evidence/desktop-real-tools-2026-10-20/results.json). Repeated request input/cache counts are not unique context size. Codex coordinator token usage is unavailable from this tool interface; no invented full-run total is claimed.

Exact model prompts: [initial](evidence/desktop-real-tools-2026-10-20/initial-prompt.md), [corrected search](evidence/desktop-real-tools-2026-10-20/corrected-search-prompt.md). Private raw session dumps, credentials, copied histories and dependencies are excluded from Git.

Across the two model turns (five provider responses), reported totals: 91,765 tokens, including 87,262 cache-read tokens, 3,734 other input tokens and 769 output tokens. These include repeated cached input across tool steps.
