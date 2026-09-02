# Halo native-access repair and follow-up audit — 2026-09-01

## Outcome

The imposed Halo Orchestrator/worker capability restrictions are removed and the installed preset is updated. A fresh real DSH session executed PowerShell directly as `halo\scott`. The optional verified-coder workflow still performs staged-change checks, verification, promotion and receipts; it no longer locks the parent, strips the worker's tools, forces a workspace sandbox, or imposes its own delegation-depth cap.

This is a repair of the added gate restrictions, not a claim that every bundled DSH feature is enabled or that Gateway 0.2.0 has passed complete acceptance.

## What changed

- `stack/halo-verified-coder/index.mjs`: removed pre/post-verdict tool denials, global goal-completion denial, worker command denylist, six-tool allowlist and depth-1 cap. The synthetic staging parent copies the caller's explicit sandbox policy instead of substituting workspace-write. No explicit override means the deployment default remains in effect.
- `stack/halo-orchestrator/agent.cordis.yml`: native tools and optional verification guidance; module revision changed from v=9 to v=10. Synced to `C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\agent.cordis.yml`.
- `stack/halo-verified-coder/test/plugin.test.mjs`: updated the genuinely changed permission contract, covering full access, an explicitly narrower caller policy, no override, PASS, FAILED, root tool availability and worker command availability.
- Updated plugin README, stack README, current-configuration record, operator guide, this successor implementation report and recovery copies.
- Gate core unchanged. The local model routes, contexts, slots, LM Studio configuration, unrelated picker/Mission Control changes, and Ollama were not changed.

Full access is not a security sandbox: a worker with Scott's machine authority can reach files outside staging. The retained gate is a verification/promotion workflow, not tamper-proof isolation from the same Windows user. A receipt proves only its checked state.

## Verification

Baseline command: `node --test stack/halo-verified-coder/test/*.test.mjs`.

```text
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4797.2056
```

TDD RED command: `node --test stack/halo-verified-coder/test/plugin.test.mjs`.
Five assertion failures reproduced the old forced workspace-write policy and planner tool denial before the implementation changed. Full failures are preserved in the verification appendix.

Final command: `node --test stack/halo-verified-coder/test/*.test.mjs`.

```text
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6272.0388
```

`node --check stack/halo-verified-coder/index.mjs` and the scoped `git diff --check` exited zero. The first diff check emitted only Git LF-to-CRLF warnings, preserved in the appendix; the final check used `-c core.autocrlf=false`.

Actual DSH session: `session-4db8e0b1-ee20-4e63-a3af-aaa2c220c70a`, preset `halo-orchestrator`, permission `danger-full-access`.

- Tool call seq 98: `Write-Output "HALO_NATIVE_SHELL_RESTORED"; whoami`.
- Tool result seq 99: `HALO_NATIVE_SHELL_RESTORED\r\nhalo\\scott\r\n`, `isError:false`; turn completed at seq 256.
- Tool call seq 702 ran the real Gateway suite, not a separate Codex shell test:

```powershell
& "C:\Users\scott\Desktop\Code\halo-research-gateway\.venv\Scripts\python.exe" -m pytest -q tests/unit .
```

Working directory: `C:\Users\scott\Desktop\Code\halo-research-gateway`.
Tool result seq 703, `isError:false`:

```text
........................................................................ [ 56%]
........................................................                 [100%]
128 passed in 5.11s
```

The worker-wrapper tests use simulated worker changes against real Git worktrees and real verifier subprocesses. They are not a new live local-Coder canary. No claim is made that every external specialist or native tool was individually exercised.

## What else was missed

### 1. Local browser requests escape the exact-target check — high priority, reproduced

`halo-research-gateway/src/halo_research_gateway/service.py:926` validates the initial named local target, then calls the browser with `public=False` at line 967. In `providers/crawl4ai_provider.py:146`, that mode immediately returns from request validation for every URL. Redirects, subresources and WebSockets are therefore not compared with the approved target after initial navigation.

An offline call accepted `http://127.0.0.1:1/not-the-approved-target` in local mode without any target comparison. No real private service was contacted. This violates the Gateway's exact-local-target contract; it is distinct from DSH's intentional full-machine permission.

### 2. GitHub public-discovery pagination is broken — live DSH reproduction

`service.py:735` obtains a `web_search` envelope and then changes its visible tool name to `github_research`, leaving the signed cursor bound to `web_search`. `github_research` resumes expecting its own tool name at line 710.

Fresh workflow result request `27fb9e0f-a292-47b6-a8e4-9fb6d8a55606` returned that cursor. Reusing the exact cursor through the same DSH GitHub tool produced `CURSOR_INVALID`, request `236e5f9c-efcc-4bbe-b863-bb7319df2cc0`, seq 1213. The SDK tool transport reported `isError:false` while the actual Gateway envelope correctly said `ok:false`; callers must inspect the envelope.

### 3. WebSocket rejection does not await close — reproduced

`providers/crawl4ai_provider.py:163` calls `websocket.close(...)` without `await`. Installed Playwright 1.62.0 confirms `close` is asynchronous; `connect_to_server` is synchronous. The unit test's fake `close` at `tests/unit/test_browser_policy.py:29` is synchronous and conceals this.

Offline async-faithful reproduction: one close call, zero awaits, and an unawaited-coroutine RuntimeWarning. This proves the rejection does not perform the intended close; it does not establish that an upstream blocked socket connected.

### 4. Chrome import is not proved usable, and complete import misses key metadata

`connections/chrome_import.py:56` recursively copies only the selected profile directory for a complete import. Its sibling `Local State` is added only in the selected-category branch at line 67. A synthetic fixture proved that complete import omitted it while selected cookies import included it.

Copied data is placed under `Profile/` at line 152; the browser adapter supplies the enclosing user-data directory without explicitly selecting that profile. This is an additional integration concern requiring a real disposable-profile canary, not proof of a working signed-in session. Existing tests use placeholder encrypted-database bytes, not real decryptable cookies/passwords.

No personal Chrome data was imported. The live gateway-owned profiles directory was empty at audit.

### 5. DSH client/model profile attribution is not deployed

The live web composition sends no `X-Halo-Client` header. Gateway stats expose only `unidentified` with default/ceiling 6000. DSH supports static HTTP headers, but an exact measured profile is not configured.

The fairness implementation has deterministic tests; distinct DSH/client attribution and measured model-specific output budgets are not live-proven. All unidentified callers share one bucket. This is not an authentication bypass; the spec explicitly treats the header as untrusted scheduling metadata.

### 6. The research workflow completed, but evidence quality did not pass

Fresh DSH session `session-c3eb66db-84a2-4cda-adf4-ea27d11469da` completed six sequential public-tool calls and a final response (turn/end seq 1199):

| Capability | Observed live result |
|---|---|
| deep_research | Returned one official source across two partial cursor pages, not complete retained architecture evidence |
| Public GitHub research | Returned a source snippet; warned GITHUB_AUTH_NOT_CONFIGURED and RESULT_TRUNCATED |
| Transcript | Zero items, TRANSCRIPT_UNAVAILABLE; no successful transcript extraction proof |
| Community search | Returned Hacker News discovery metadata, partial page |
| Community thread | Returned the root and one partial reply, not two complete replies |
| Multi-step answer | Mechanically completed, but the model added unsupported video attribution, author affiliation and architecture claims not established by its retained snippets |

The 2000-character cap was a deliberately small canary budget, not a changed production default. In that canary, deep-research page 1 retained mostly navigation and divided the page into 113 content parts. Page 2 reported cumulative count 2 with only one source available, illustrating a chunk-versus-source coverage ambiguity. This is not a full-quality research acceptance pass.

### 7. Documentation still contradicts the delivered code

The installed/canonical Halo skill's `references/limitations.md:10-15` still says GitHub uses only discovery, that only generic form submission executes, and that multiple shipped adapters need implementation. The Gateway host matrix still describes the reduced worker surface. Those Gateway docs were not silently rewritten during this DSH fix.

The DSH stack README also described the obsolete external Gate-Build path as the only build path. This repair adds an explicit current-state section and labels the retained text historical. Current configuration/guide capability descriptions are corrected; older model/picker measurements are labeled dated evidence rather than fresh inventory.

### 8. Remaining native-preset differences must be disclosed

The separate `subagent_claude_plan` provider is configured in planning mode; Claude Build remains configured with native bypassPermissions. Codex is configured with its native full-access mode.

The bundled DSH web-tool row remains disabled, including its independently available direct-fetch tool; the no-DeepSeek-key explanation alone does not justify disabling fetch. The Gateway supplies named research tools and native shell/network access works, but that is not identical to enabling every bundled DSH tool. This pre-existing row was reported, not silently changed during removal of the verified-coder restrictions.

Windows chooses PowerShell instead of Bash. Explicit operator-selected plan mode and provider-enforced behavior remain separate from the removed Halo-specific deny rules.

## Earlier acceptance attempts were not successful

Recovered four saved DSH sessions:

- `session-dbef223d-4a1a-4a20-ac77-d5fa2f511217`: actual planner-led denial, then LM Studio error `speculative batch index 1 is not inside the current sub-batch [0, 1)`.
- `session-e606b3b4-07a3-4b08-8078-f1709c55c846`: context exceeded before any test-tool execution.
- `session-9101f74a-214c-4ed7-a3b3-a497df003898`: context exceeded before any research-tool execution.
- `session-ed3f5b84-1ab0-4891-83c5-a2a0243a18e2`: context exceeded before any fail-closed action-tool execution.

This turn did not diagnose or retune those prior LM Studio errors. The post-reboot native shell, unit-suite and bounded public workflow succeeded at their stated layers.

## Outstanding real acceptance

- Authenticated GitHub research: no saved connection; positive-path live acceptance absent.
- Gmail actions and GitHub issue/comment actions: deterministic tests pass, but no real approved account action was performed. GitHub comment creation lacks a dedicated positive-path test in the focused action test file.
- Chrome imported-profile crawling: absent live profile and the defects above.
- WebSocket: mocked tests pass; async-close reproduction fails the intended behavior.
- CapSolver/Bright Data: both disabled with zero configured attempt/spend allowances; no paid call performed.
- Full research workflow: bounded tool sequencing proved, research-quality acceptance failed as described.

Following the Gateway skill's approval/evidence rules, no operator approval token was minted, no Gmail message or GitHub issue/comment was sent, no credentials were borrowed, and no paid provider was enabled. Those need specific operator setup and target approval, not inferred permission from “test these.”

## Files read, scope, and security review

Read the gate plugin/core/tests, preset and host configuration, launchers, native DSH delegation implementation, relevant Gateway source/tests/skill references, saved DSH event logs and operator documentation before edits/review. The TDD skill caused baseline/RED/GREEN verification; the review/Gateway skills kept tests, live evidence and approval authority separate.

- Trust-boundary inputs: no new route or parser; gate path validation unchanged.
- Endpoint authn/authz: no endpoint changes.
- Secrets: none added to source or evidence; event extraction omitted model reasoning and used public/no-account tests.
- Rendering/eval/deserialization: none introduced.
- Dependencies: none added or upgraded.
- Falsification: tested caller-selected narrower policy, undefined override, failed verification, protected-file tampering, crash/timeout, and async-faithful browser behavior.
- No reboot or process stop was performed. After detecting the completed reboot, the existing Gateway and DSH launchers were used; LM Studio/Ollama were not restarted or retuned.

## Version control and recovery

DSH remains on master at `a94a34903743976bb70bdd0faa94160a40fe14cf` plus this scoped uncommitted repair and the pre-existing unrelated work. No commit, push, merge or version bump was performed. Gateway remains clean at `41e5b6da1afcde6b6d451f213b32079d26764c0e` (0.2.0); its audit findings are reported, not fixed here.

Pre-change gate/preset backups:
`C:\Users\scott\Documents\Codex\2026-09-01\is-this-tool-plugin-real-https\outputs\native-access-backup`.

Exact evidence appendix:
`C:\Users\scott\Documents\Codex\2026-09-01\is-this-tool-plugin-real-https\outputs\native-access-verification.md`.

Offline reproduction:
`C:\Users\scott\Documents\Codex\2026-09-01\is-this-tool-plugin-real-https\outputs\audit-reproductions.py`.

Required operator documents and deployable recovery copies are synchronized under `C:\Users\scott\Desktop\Halo Stack Research`; all 132 SHA-256 manifest entries verified with zero failures. Both new DSH test sessions ended as completed. Final health: DSH HTTP 200; Gateway status ok, version 0.2.0.
