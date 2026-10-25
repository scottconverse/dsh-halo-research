> **Activation update:** Both apps have now been restarted while idle. Web's four preset layers and Desktop's current existing session expose model_route. Settings hashes are unchanged. See the activation section below; the earlier pending-restart statements describe the pre-restart state.

# DSH Web/Desktop model routing plugin — October 24, 2026

## Outcome

Implemented and installed native plugin v0.1.0 in both apps. Routing source:
https://github.com/scottconverse/deepseek-harness-model-routing-1024/commit/657dd92ce2e10b702ef00c0e8e765ed5df8be807

The CLI is retained without changes, and SKILL.md is now a small companion.
Both installed copies match all 21 source files byte for byte.
Four Web presets and three Desktop presets now contain the plugin row. The
Web generated recovery mirrors were synchronized from the canonical profile.

## Architecture

The dependency-free plugin registers one native tool, model_route, in each
existing session-preset tool registry. Operations are settings, call, batch and
report. It passes validated/quoted arguments to the existing route.ps1 through
DSH's tools.execute(pwsh), retaining caller agent, parent and cancellation.
DSH retains approval/sandbox enforcement, workspace, shell-output limits and
optional background jobs. The existing CLI owns transport, settings and receipts.
No new agent loop, model catalog, provider, scheduler or automatic retries.

See [architecture and usage](../stack/stock-dsh/skills/deepseek-harness-model-routing-1024/plugin/README.md).

## Preservation

Only plugin rows were added to source and installed Web/Desktop profiles.
Removing those rows reproduces the private pre-change snapshots exactly. This
includes provider catalogs, models, defaults, Low effort, 64K allowances, Wigolo,
Reddit/Redlib, XERJ and other existing integration configuration. These
integrations were preserved, not independently retested. Root settings and
normal session selections were not changed. CLI scripts/route.ps1 and model
settings/prices are unchanged from the earlier committed version. Private
ledgers, credentials, conversations and backups were excluded from Git.

## Actual verification

Focused offline check used the real installed DSH 0.2.1-rc.2 ToolRuntime, plugin
and CLI. Only the native process executor was substituted for an isolated
PowerShell subprocess, whose OLLAMA_BASE pointed to an ephemeral loopback mock.
No request reached Ollama or a model provider. Final installed verification passed:

- Exact DeepSeek 1017: one call plus two batch items each sent think=low and
  options.num_predict=65536, without num_ctx. Advertised 1M remains provider-managed.
- Local Qwen batch: two items sent no imposed think or options.
- Another cloud batch was blocked before any HTTP request.
- One explicit override sent High/17, proving overrides are still explicit.
- Settings preview sent no HTTP. Temporary receipts matched settings; six rows.
- Native permission denial and pre-start cancellation prevented process execution.
- Background option forwarded to native pwsh; stub job ID, no live job was launched.
- Native schema registration, nested parent correlation and quoting were checked.

[Offline receipt](evidence/routing-plugin-2026-10-24/offline.json) and
[installation/preservation receipt](evidence/routing-plugin-2026-10-24/installation.json).

## Failures and limits

Initial offline setup incorrectly used Context.start, which this Cordis release
does not expose; corrected to Fiber.await before passing source and final
installed checks. A local deployment helper initially failed to parse Markdown
fences in its JS string; fixed before deployment. Neither error caused provider
requests or changed models/defaults. A native SDK lookup on Desktop's profile
could not resolve dsh-tools transitively from its optional terminal package; the
plugin has no SDK imports or npm dependencies and does not require that lookup.
The focused native-registry verification used Web's installed runtime, not a
second Desktop live execution. Both installed plugin/CLI copies are identical.

Existing Web and Desktop processes were not restarted or interrupted. Profile
installation is verified; active tool availability in already-running preset
scopes is not claimed. Those scopes may need a normal app restart to load the
new plugin. No live model/UI/background-job acceptance test was run, as this
request specified offline verification. Normal chat/subagent defaults are not
controlled by this plugin. CLI remains Windows/PowerShell-specific.

## Resources and delivery

No subagents, benchmarks, downloads, new dependencies, model calls or persistent
test jobs. The final check made six HTTP requests only to the mock and removed
its temporary files/processes. Exact Codex turn token/billing totals are not
exposed by these tools; no fabricated usage number is supplied. Source and
deployment docs are committed/pushed separately; no npm publication, tag or
GitHub release is implied. Halo Stack Research reading/recovery files are synced.

## Activation verified after idle restarts — October 24, 2026

This supersedes the earlier pending-restart limitation. Both apps were checked
through their real native agent/job registries: no running agents, queued work,
or running/stopping jobs. Web was restarted first with its existing launcher;
Desktop then used its normal app relaunch/quit path. Both old Desktop processes
exited and the new host opened the same Desktop profile.

The restarted Web tool registry contains model_route in all four preset layers.
The restarted Desktop registry contains it in all three preset layers, and its
current existing session's native tool schema explicitly includes model_route.
No tool, CLI routing operation, prompt or model request was submitted. Desktop's
current session had not exposed the new tool before restart; it does now.

Four existing source-of-truth settings/profile files have identical SHA-256
hashes before and after. Model selections/defaults and integration configuration
were preserved. Temporary loopback native diagnostic listeners were closed.
New normal processes: Web 14752; Desktop main 23080 and backend 64108. These PIDs
are an observation at verification time, not future shutdown authorization.

The read-only diagnostic setup initially tried an unauthenticated backend read
(401), a cross-origin renderer fetch (blocked), and dynamic import in inspector
evaluation (unsupported). It was corrected to the native app proxy and cached
module lookup; no model calls or settings edits resulted. The final checks read
actual running registries rather than creating an isolated replacement host.

Receipt: docs/evidence/routing-plugin-2026-10-24/activation.json. No subagents,
model calls, benchmarks or persistent diagnostic processes were created.
## Two short live plugin coding checks — October 25, 2026

Scott requested a settings check first, followed by simple coding checks in both
apps. No application, plugin, model, default or integration settings were changed.

Both installed profiles select Ollama `deepseek-v4.1-flash:1017-cloud`, Low effort,
65,536 maximum output tokens and an advertised 1,048,576-token context window.
The installed routing configuration has the same Low/65,536 per-model defaults.
Direct routing calls use provider-managed context and do not send `num_ctx`;
the advertised context is not a proof of full-context enforcement.

One call ran through each actual application's native `model_route` tool and
native `pwsh` service, Web first and Desktop second, in isolated ordinary
sessions. Effort and output overrides were omitted. These were direct plugin
calls, not model-selected tool calls from a normal chat, and not UI interaction
checks. No subagents or benchmark suites were started.

| Host | Native tool elapsed | HTTP/provider elapsed | Input tokens | Output tokens | Code checks |
|---|---:|---:|---:|---:|---:|
| Web | 2.294 s | 1.354 s | 132 | 265 | 6/6 passed |
| Desktop | 4.195 s | 2.056 s | 132 | 454 | 6/6 passed |

Total model-reported usage: 264 input + 719 output = **983 tokens**. Output counts
are provider counts, not a count of the visible Python alone. Recorded cost is
$0.000471 estimated API-equivalent, not a subscription bill. These counts cover
the two DeepSeek calls, not Codex's own coordinator usage, which is not exposed by
these receipts. Neither timing column is a generation tokens-per-second metric.

Both receipts identify served model `deepseek-v4.1-flash:1017`, effort `low` with
source `model-default`, max_tokens 65536 with source `model-default`, and stop
reason `stop`. Both native PowerShell executions exited 0 without timeout,
truncation, cancellation or sandbox denial. They used the existing full-access
policy. No 64K exhaustion or 1M context stress test was attempted or needed.

Full prompt (identical in both calls):

```text
Return only Python 3 code, without Markdown or explanation. Implement latest_by_id(rows): rows is a list of dictionaries, each with a hashable id. Return a new list containing only the last row for each id, ordered by those last occurrences in the input. Do not mutate the input. Empty input returns an empty list. Example: [{"id":"a","v":1},{"id":"b","v":2},{"id":"a","v":3}] returns [{"id":"b","v":2},{"id":"a","v":3}]. Use only the standard library. Keep the implementation short.
```

The returned code was saved unchanged and executed with Python. Six explicit
cases cover empty input, a single row, nonconsecutive duplicate ordering,
consecutive duplicates, mixed integer/string/None IDs, and a repeated middle ID.
Each also checks that the input remains unchanged and the returned list is new.
Web used a last-position map and an ordered second pass. Desktop sorted retained
last-position/row pairs. Both satisfy the small task; this is not evidence of
broad coding ability or comparative model performance.

Preparation issues: the restricted shell could not access loopback diagnostics,
so authorized elevated access was used. A preparation attempt tried to resume a
new session whose write handle DSH already owned; it failed before any model
request. The check then used the agent DSH had already created. That failed
attempt left an empty isolated session; it was not deleted. Python emitted a
location-discovery warning but completed successfully, with all assertions
passing. No extra model calls were made to recover from preparation issues.

The four existing settings/profile SHA-256 hashes match the prior activation
receipt exactly. Models, defaults, Wigolo, Reddit/Redlib and XERJ configuration
were preserved. Temporary native diagnostic listeners were closed after each
call. Both applications remain running.

Evidence and exact returned source:
`docs/evidence/routing-plugin-2026-10-25/` contains the two native receipts,
full prompts, unchanged Python solutions, six-case checker, results and settings
preservation receipt. No private session history or credentials are included.
