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
