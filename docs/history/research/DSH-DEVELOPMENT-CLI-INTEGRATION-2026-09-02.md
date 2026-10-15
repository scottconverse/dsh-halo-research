> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# DSH development: native Claude/Codex integration

Update, September 2 afternoon: native accounting is now implemented and verified in development; see [CLI-METRICS-2026-09-02.md](CLI-METRICS-2026-09-02.md). Final acceptance is 94/94 plus two live instrumentation probes and restart/UI checks. The 78-test receipt below is the earlier integration milestone. Codex already auto-compacts internally; the remaining gap is DSH/native-thread continuity, not a missing Codex compaction engine.

SCOPE: `C:\Users\scott\Desktop\Code\dsh-halo-dev` only. 2026-09-02, America/Denver.

## Outcome and correction

The development DSH picker now offers **Claude Code — signed-in CLI** and **Codex — signed-in CLI**, alongside the existing direct local and OmniRoute catalog. The opening screen has its own searchable “New conversation model” chooser before a workspace/session is selected. Production on 3080 was not upgraded.

The earlier authentication conclusion was wrong: empty development auth homes proved only that those empty homes were signed out. The official CLIs already have usable normal-user logins. This integration uses those CLIs and their existing homes; it neither reads/copies credential files nor creates a new login. Claude reports Claude.ai Max; Codex reports ChatGPT. A saved login alone was not counted as acceptance.

## Live coding evidence

Both tests used the identical prompt in `dev/run-coding-probe.mjs`: create a duration-parsing ES module, reject specified invalid input/unsafe integers, write Node tests and run them. Each received a fresh development directory. No mid-run prompts, edits, test fixes or retries were supplied by Codex. These are small integration tests, not proof of autonomous delivery of a whole application.

| Selected route | End-to-end observed turn | Independent checks | Actual execution |
|---|---:|---:|---|
| claude-cli / sonnet | about 42.1 seconds | 16/16 | Claude native Write/Bash tools; provider initialization/assistant records identify claude-sonnet-5 |
| codex-cli / gpt-5.6-terra | about 33.1 seconds | 16/16 | Codex native command/file tools; exact model argument used, successful terminal result |

Codex's requested model field is not an independent backend-model attestation. Its CLI selected the exact requested ID; unlike Claude's record, do not infer extra identity evidence from an echoed field.

Fixtures and full prompt/history:

- `C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\evidence\native-claude-1788372481531`
- `C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\evidence\native-codex-1788372555079`
- Actual files are in the correspondingly named directories under `.runtime\workspace`.
- Raw native events: `.runtime\evidence\cli\1788372522763-272368e8-b081-4a6c-8a42-5630956ec974.json` and `1788372588486-7734930d-fd40-42a4-a9b4-a7c6e04d0fc8.json`.
- Consolidated fresh checks: `dev\evidence\cli-live-2026-09-02.json`; deterministic checks: `dev\evidence\acceptance.txt` and `.json`.

Final deterministic run: **78 tests, 78 pass, 0 fail/cancel/skip, 4543.5565 ms**. After deploying the reviewed adapter and restarting development, both original sessions resumed and performed the explicit read/run-tests/no-edits follow-up: Claude completed in about 16.2 seconds, Codex in 22.3 seconds. Full post-restart histories: `dev\evidence\cli-restart-2026-09-02.json`. This verifies final-version execution and conversation continuity for these short sessions, not long-context compaction.

The actual blank browser screen retained Claude/sonnet after the service restart. Browser warnings were connection retries during the deliberate restarts; no browser error was observed in the inspected log. Production's seven monitored hashes matched, and 3080/3090/3180/20129 returned HTTP 200. These are the monitored boundaries, not an assertion that every file on the machine was hashed.

## How to use

Open `http://127.0.0.1:3180`, choose a model in “New conversation model”, then choose your development workspace. Search “Claude Code” or “Codex” and select the **signed-in CLI** group. OmniRoute rows that say “connect account” are different routes and have not acquired subscription access through this change. Local models remain available; selecting the new cloud routes does not load a local model.

Claude exposes native aliases opus/sonnet/haiku. Codex lists models from its installed `C:\Users\scott\.codex\models_cache.json`, including Sol/Terra/Luna. Catalogs are advisory; the adapter accepts other exact IDs. Codex effort choices come from the same per-model metadata; Claude uses native default effort in this picker until model-specific effort metadata is wired.

Normal coding uses full native user capabilities. Development isolation separates DSH state/deployment, not filesystem capability. Official CLIs may refresh their own tokens and write their normal caches/logs. Inherited API tokens/base-URL/backend overrides are removed only from the subscription CLI child's environment, not from the machine or saved user settings. Normal user configuration and native provider limits still apply.

## Implementation and honest boundaries

- `dev\cli-provider.mjs` implements DSH's adapter protocol as an additive file plugin; no DSH core or pnpm hardlink is edited. `dev\cli-runtime.mjs` owns the exact child process. The full conversation and current request are passed as a disclosed transport prompt: history is labeled as context, not new work; native tools replace unavailable DSH tool names. It is not literally an unchanged standalone-CLI prompt.
- The CLI owns execution. DSH emits native progress as text and never re-executes native tool events. Thus DSH's independent verifier is **not** mechanically gating these native CLI routes. The independent checks above are post-run acceptance, not a secretly inserted worker gate.
- Automatic whole-agent retries are disabled. Timeout/cancel kills only the owned PID tree. Unit tests cover external abort and closing a stream while its next item is pending. Live destructive cancellation was not tested on a user's active job.
- Titles are derived locally without a model task. Claude auxiliary synthesis disables model-selectable tools/MCP; Codex auxiliary compaction explicitly errors rather than launching an unintended coding job. **Long-session Codex compaction is unfinished.** Native CLIs have their own internal context handling, but that does not close this DSH-level gap.
- Context metadata is no longer arbitrarily limited to 32K: Codex uses its installed cache (272K for Terra; 128K for Spark in this snapshot), and Claude Sonnet's successful receipt reports 1M. Unknown models remain unknown. These are metadata, not a maximum-context benchmark.
- Native turn usage now maps to a separate native-agent panel and `/halo-dev/cli-metrics` view. Historical raw DSH token/TTFT/tool projections remain transport data, not native inference telemetry. The development UI no longer displays native transport TTFT as model TTFT. See the metrics report for mapping, unknown fields and compiled UI overlay.
- Image attachments are explicitly unsupported by this transport; a local path can be supplied for the native CLI to inspect with its tools. No silent image dropping.
- New-conversation defaults are saved to the development settings. An existing session's selection made without another turn can still revert to its last recorded request model after a restart—an existing DSH host persistence issue, not fixed by the opening UI.
- No API credentials for other cloud providers were added, no accounts purchased, no production promotion, no LM Studio/Ollama changes, and no commit/push.

## Recovery and next work

Pre-change checkpoint: `.runtime\checkpoints\pre-cli-provider-20260902.tar.gz`. Restore only deliberate development files from it; do not blindly overwrite later user work. To disable this integration, remove only the `halo-dev-native-cli-provider` insert from the development profile and restart the verified development process. Existing official CLI logins require no rollback because no credentials were copied or replaced.

Review source: TownReporter's `C:\Users\scott\Desktop\Code\townreporter-dev\src\lib\news\ai-claude-code.server.ts` and `ai-codex.server.ts` were read-only references. Newsroom tool restrictions were not reused. Cross-review is in `dev\CLI-INTEGRATION-REVIEW.md`; runner contract in `dev\CLI-RUNTIME.md`; picker source/build/RED/GREEN in `dev\picker`.

Before calling this a production-ready replacement: integrate native-thread continuity/compaction and durable per-session model selections; then run one useful multi-file task and obtain Scott's production-promotion decision. Native metrics are now implemented with explicit unreported fields, not invented measurements. The two native subscription coding routes themselves have passed real development-only execution.
