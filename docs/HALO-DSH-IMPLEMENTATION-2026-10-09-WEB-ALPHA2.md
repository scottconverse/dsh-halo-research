# DSH Web alpha.2 upgrade and recovery audit — October 9, 2026

## Outcome

Web was upgraded from 0.2.0-rc.2 to **0.2.1-alpha.2** and repaired against the restored Windows environment. This is the newest GitHub release checked for this task and is explicitly a **prerelease**. npm's ordinary latest/next tags still pointed at rc.2 during discovery; the upgrade pins alpha.2 explicitly.

Upstream release: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-alpha.2

Only the selected 35B model is resident. Desktop was not upgraded or tested concurrently. Bionic remains excluded. Existing unrelated working changes were preserved and are excluded from the upgrade commit.

## Effective Web defaults

| Setting | Verified value |
| --- | --- |
| Provider | web-fast, LM Studio |
| Serving model | halo/qwen3.6-35b-a3b-q6 |
| Quantization | Q6_K |
| Context | 65,536 tokens |
| Maximum response | 24,576 tokens |
| Parallel requests | 1 |
| New-session reasoning | Off |

These agree with the preserved Web selection and October backups, with Off reflecting Scott's subsequent explicit preference. A fresh request header and the resident model's actual serving capacity were inspected. Context and maximum response are separate settings. Explicit High delegation remains intentional; other picker/model choices remain available.

## Problems repaired

1. **Mixed package resolution.** Stock packages were pinned to alpha.2, including active plugins previously resolved from stale profile-local modules. The old profile modules were preserved under `C:\Users\scott\.dsh-stock\profiles\node_modules.pre-alpha2-20261009`; the live profile now resolves the deployment modules through a junction. The reviewed pi-ai dependency is pinned to 1.0.2 through pnpm's workspace override. Lockfile and version-specific release-age exceptions are retained for reproducibility.
2. **Output clamp regression protection.** Existing estimator-clamp opt-out remains enabled through `HALO_DSH_DISABLE_ESTIMATED_OUTPUT_CLAMP=1` in the supported detached launch path. The output guard and malformed-tool-history guard were adapted to the reviewed dependency versions. Malformed history is rejected visibly rather than converted silently to empty arguments. Focused tests pass; this is not a claim that a 24K response was generated during the smoke test.
3. **Alpha persona failure.** Alpha.2 rejected `{{cwd}}` in the custom persona suffix before model execution. All four embedded persona suffixes now use the working directory supplied by runtime context. Canonical/live profiles and external preset recovery mirrors are aligned. Actual model/tool requests then completed.
4. **Default consistency.** Canonical/live Web provider and legacy settings now consistently default to reasoning Off. Explicit session and delegated choices remain supported.
5. **Selected-model startup.** An empty resident inventory now loads the exact saved model with its configured context and parallel count. Matching residency is reused. Other residency produces a mismatch and does not trigger a second load, automatic unload, or route substitution. Cloud routes bypass local residency work. Windows PowerShell empty-array handling was corrected. A live empty inventory loaded only Qwen 35B Q6 at 64K in 48.84 seconds; subsequent starts reused it.
6. **Mission Control cold-start rejection.** One-second health requests could repeatedly reject a healthy telemetry server. Requests now have a configurable 30-second allowance within a 120-second startup deadline, capped by remaining time. Exact build checks, wrong-build refusal and owned-child cleanup remain. Real delayed-response and hung-endpoint tests passed, followed by live startup and acceptance.
7. **Memory recovery.** The Web root's missing global memory MCP path now points to a pinned deployment-local `@modelcontextprotocol/server-memory` 2026.8.31 dependency. The existing memory store was preserved. Windows reinstall had removed `HALO Memory Snapshot`; the existing installer restored it using the installed elevated helper. A real scheduled run returned result 0 and created a fresh snapshot. Host memory writer health was verified. The lean session tool catalog intentionally filters MCP tools, so this does not establish model-issued memory writes in that preset.
8. **Reddit scope leakage.** A query such as `site:reddit.com/r/Longmont city` previously stripped only the domain and ran global search, allowing unrelated subreddits. The adapter now constructs subreddit-specific RSS URLs with `restrict_sr=on`, validates canonical post links against the requested subreddit, and reports partial coverage if no matching records survive. Pacing, Retry-After handling and cancellation remain. The reviewed JS was deployed into the active fast-first preset directory as well as the canonical source.

## Research integration results

- **Wigolo:** an actual model-issued native search missing provider credentials invoked the configured Wigolo CLI fallback and returned substantive official Longmont material. Wigolo MCP remains disabled/on-demand by design; a catalog row alone was not accepted as proof.
- **Reddit RSS:** after deploying the repaired active hook and restarting Web, the same saved session resumed, read back its nonce, and retrieved six canonical r/Longmont post links. This verifies discovery scope, not comment completeness or news-claim verification.
- **Redlib:** part of the installed reddit-search skill's enrichment workflow. The running executable was independently identified as `C:\Users\scott\TownReporterTools\Redlib\versions\a4d36e9\bin\redlib.exe`. The bundled test was run with that installation root. Recorded and observed commit both equal `a4d36e954cf1bd64f209cd8868c5a29edc81b374`; listener is 127.0.0.1:18080. The controlled `/r/foss` request returned HTTP 200, 25 post markers and 54 comment links; `installed`, `running` and `usable` were all true. No replacement build, public-instance rotation, service or logon task was added. This verifies usable listing access, not complete nested-thread extraction by a model. The Web automatic search adapter remains RSS discovery; Redlib enrichment is performed through the skill workflow when useful.
- **Skills:** actual skill calls loaded reddit-search and report-local-news. Skill loading does not establish completion of their full workflows.
- **Fetch:** model-issued web_fetch returned HTTP 200 and the Example Domain body.

## Verification and exact limits

| Evidence | Result |
| --- | --- |
| Web test:audit | 62 tests: 61 passed, zero failed, one optional live Wigolo article test skipped |
| Mission Control serial runner | 149 passed |
| New slow-start tests | Two passed separately; related reopen/installer suites also passed |
| Fresh Mission Control installer | Four required suites passed; exact receipt/build retained |
| Mission Control live acceptance | 215 checks passed, health Healthy |
| Empty inventory autoload | Exact selected model, 64K, parallel 1, sole residency |
| Actual desktop launcher | Opened Chrome with Web and Mission Control; matching residency reused |
| HTTP frontend | Token exchange 303; authenticated HTML and all four Web JS/CSS assets 200; Mission Control HTML 200 |
| Fresh model tool runs | PowerShell/file operations, deterministic nonce readback, skills, LSP definition, web fetch and research observed |
| Resume after restart | Persisted session listed and resumed; saved nonce and scoped Reddit result verified |
| Cancellation | turn/end aborted with nested user reason after session/cancel |
| Redlib skill gate | Usable true with actual upstream content, matching pin and loopback ownership |

The first broad smoke fixture passed. A second fixture initially reported false because it demanded a PowerShell call while the model completed the file task with native read/write tools. Its artifacts remain unchanged; it is not presented as an overall passing fixture. The subsequent dedicated resume and cancellation fixtures passed against the observed alpha event schema. The model also recovered from an observation-required file-write rejection by reading the existing file before writing it.

Browser automation returned `net::ERR_BLOCKED_BY_CLIENT` for both in-app and Edge loopback access. The supported Chrome launcher succeeded and HTTP/assets/RPC were verified, but visual rendering and click-through acceptance remain unconfirmed. Automatic full compaction was not forced or reached in these bounded tests. No complete report-local-news editorial/publishing pipeline was run. No claim of complete Reddit comments or full local-news source coverage is made.

## Recovery and operations

Canonical deployment: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh`.

Live Web home: `C:\Users\scott\.dsh-stock`; Web port 3080; Mission Control port 3090; LM Studio port 1234; existing Redlib port 18080. All audited local endpoints are loopback. The selected Qwen 35B remains loaded for use.

Desktop shortcut **Start DSH Web** invokes `Launch-StockDSH.ps1`, which opens Chrome. **Stop DSH + Wigolo** shuts down the owned Web/Mission Control stack while preserving LM Studio models. Local Redlib retains its existing independent skill lifecycle; it was not added to the Web launcher or stop ownership list.

Current human-readable files and copies of changed deployables are synchronized under `C:\Users\scott\Desktop\Halo Stack Research`. The recovery manifest records exact hashes. Dependency directories are restored by the pinned package/lock/workspace files rather than copied into the reading folder. Active fast-first research JS must be copied into `C:\Users\scott\.dsh-stock\.agent-presets\fast-first` when restoring; YAML preset-sync alone does not copy hook JS. Existing installed Mission Control source has preexisting working changes which this task preserved and did not include in its Git commit.

Local immutable/diagnostic evidence is retained under repository `work\web-upgrade-2026-10-09`: package/config backups, install logs, audit-tests.log, mission-control-tests.log, mission-control-install.log, live-acceptance.log, alpha smoke session/results, resume-reddit-session/result, cancel-result.json, redlib-result.json and http-result.json. These local evidence files may contain private session/config information and are not included in the public-facing change set.

Relevant live sessions: `session-9814c482-b208-49e9-a780-60a64fe178d2` (initial tools/research); `session-8c28fba1-61f0-4f90-b5bd-4c23378aa3e0` (skills/LSP/fetch, resumed scoped Reddit, cancellation).
