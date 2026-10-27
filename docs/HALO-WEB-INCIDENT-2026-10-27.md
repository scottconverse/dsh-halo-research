# DSH Web interruption and independent host repair — October 27, 2026

## Outcome
Web and Mission Control are running again under the on-demand Windows task `DSH Halo Web Host`, as the signed-in user with Limited privileges. No login trigger, model generation, automatic project retry, new provider or model-setting change was added. Verdict remains stopped. Its unsent correction prompt survived browser recovery; implementation edits remain in main pending the requested worktree correction.

## Incident and evidence
The first real Verdict takeover stopped during step 73 at 1:21:40.467 PM MDT. The last completed operation was reading MCP claim handling. The persisted v4 session ended with step/start and no turn/end. Both ports 3080/3090 refused connections; the browser continued displaying running/thinking and a background cargo test. A live process check found no surviving Verdict Cargo/Rust test process. No passing completion can be claimed for that interrupted background job.

Windows System events 43/44 record the OpenAI.Codex update starting at 1:21:40 PM, the exact interruption second. Event 19 records completion at 1:21:42 PM. Service events 7040/7045 show replacement of the Codex sandbox service; AppX deployment records confirm replacement of version 26.1021.3705.0 by 26.1023.6123.0. A native IsProcessInJob probe confirmed Codex tool processes are Windows-job members. DSH had been launched by Codex at 12:54 PM. Node detached/unref does not itself establish independence from an inherited Windows job.

**Diagnosis:** termination with the Codex update is the strongest explanation, consistent with both servers and the test process disappearing together. This is timing and architecture evidence, not a captured terminating caller or historical job-handle proof. No fatal DSH stack, OOM record, or matching Application crash event was found. Do not characterize the original cause as conclusively proven or blame the model/context window.

## Preservation
Before restarting, the session, startup logs and all nine dirty Verdict tracked files were copied byte-for-byte with SHA-256 manifest to a private dated Codex incident folder. The corrected design.md predates this run. No implementation edits were removed or transferred. Raw logs/session/draft are private and excluded from GitHub; published records contain no launch tokens.

## Repair
- Start-StockDSH.ps1 now delegates normal launch to Start-PersistentDSH.ps1. The latter registers/runs an on-demand Interactive, Limited user task with no password or elevated principal. Its action runs the existing startup checks and exact-identity lifecycle logic. Existing model startup safety, provider routing and integrations remain in place.
- The persistent task action retains a host, records the server PIDs and logs exit codes without automatically resuming/retrying user work. Startup no longer belongs to the Codex tool process tree. A normal reuse invocation does not create a second server instance.
- Each launch preserves previous stdout/stderr in timestamped files before creating current-run logs, avoiding both lost diagnostics and stale-token selection. Lifecycle history remains append-only. Prior logs were separately preserved before the first recovery.
- A version/hash-guarded Web HTML patch displays a persistent warning after a failed transport probe: running/job indicators may be stale, preserve unsent input and reconnect. It makes no inference/API job request and never submits or retries a prompt. Probe interval 10 seconds, request timeout 4 seconds. An HTTP auth response still means transport reachable.
- No model, default, profile, plugin, skill, Wigolo, Reddit/Redlib or XERJ configuration was edited. Upstream stays 0.2.1-rc.3. Desktop launcher was not modified; its shortcut target and icon path, plus both Web shortcuts, were checked separately.

## Affected verification only
1. Changed PowerShell scripts parsed successfully. Offline guard check accepts expected HTTP 401 as transport reachable and produces exactly one warning for failed fetches; patch application is idempotent.
2. Recovered Web exchanges its token for a cookie (303), then serves authenticated HTML (200), including the guard. A naive fetch following the redirect without retaining the cookie returned 401; that was a diagnostic-client limitation, not failed Web authentication. Startup readiness was corrected to recognize the expected unauthenticated 401.
3. Mission Control HTTP 200, jobs streamConnected true, dataStale false, no active jobs or queued inputs. Browser reopened the original session and explicitly reported Stopped: DSH process exited before the turn finished; unfinished tool calls have unknown outcomes. Draft remained intact.
4. One controlled recovery check, after confirming idle: existing exact-identity Stop script stopped both services. Persistent host recorded exit code -1 for both at 1:42:15 PM. Actual Chrome displayed the new offline warning. Normal launch recovered Web at 1:42:35 PM, Mission Control by 1:42:46 PM under a new independent task host. No project/model calls were triggered.
5. Host parent is Windows svchost/Task Scheduler, not a Codex process. The initiating command returned while services remained alive. This verifies new ownership and launcher lifetime; it does not claim a second actual Codex-update experiment.

## Operating recovery and limits
Use Start DSH Web normally. Use the existing Stop DSH + Wigolo action before a complete restart; it preserves LM Studio and loaded models. A server that fails must not be treated as completed work or blindly retried. Preserve drafts, reopen the saved session and inspect unknown command outcomes first. The browser warning can appear after the 10-second probe interval plus timeout; a freshly authenticated/reloaded page clears it. An old page cannot acquire the guard until reopened/refreshed.

The pending Verdict correction remains distinct: move verified edits from main to merge-trial without losing the pre-existing corrected spec. This incident repair does not claim that transfer or any Verdict phase is complete. A future actual Codex update has not been tested. Automatic retry/replay is deliberately absent.

## Accounting
No subagents, inference requests, benchmarks or new Verdict tests. One controlled service stop/recovery and one bounded offline guard check. Coordinator token accounting is unavailable through the current tools and is not zero. Historical 8.3M displayed session usage includes cache traffic and is not this repair's token count.
