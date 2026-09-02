# Halo provider promotion — 2026-09-02

Status: deployed and live-smoke-tested; release evidence and scoped local commits accompany this record. Independent final audit/operator walkthrough is still optional and not claimed complete.

## What changed

Scott authorized promotion after development-only evaluation. The working local stack remains the default. Native Claude Code and Codex routes, accurate native accounting, durable per-session selection, DSH/native continuity checkpoints and the searchable provider catalog are now installed in production. No LM Studio tuning, model load/unload, Ollama, CivicCast, Windows memory split or reboot was part of this promotion.

Canonical repository: `C:\Users\scott\Desktop\Code\dsh-halo-research`. Development repository: `C:\Users\scott\Desktop\Code\dsh-halo-dev`. Live installation: `C:\Users\scott\.dsh`. Operator copies: `C:\Users\scott\Desktop\Halo Stack Research`.

## Evidence ledger

| Claim | Instrument / scope |
|---|---|
| Production two-turn Claude and Codex acceptance passed | `stack\provider-integration\evidence\production-acceptance.json`, completed 2026-09-02T21:32:07.697Z |
| Existing sessions preserved | The same record: 116 pre-existing session IDs; missing list empty; two owned smoke sessions added |
| Exact native resume | Both providers returned the same native thread ID on turn two and recalled `ORBIT-41973` |
| Local default restored | `lmstudio / halo/qwen3.6-35b-a3b` in the production acceptance record |
| Additive catalog | 32 LM Studio entries, 3 Claude CLI, 7 Codex CLI, 2705 OmniRoute entries; no catalog validation failures |
| Final deterministic suite | 105 tests passed, zero fail/cancel/skip/todo; final post-app-restart rerun approximately 4.3 seconds; `provider-integration\evidence\development-acceptance.*` |
| Independent canonical subset | 74/74, zero fail/cancel/skip/todo after documented build-fixture setup; `provider-integration\evidence\canonical-acceptance.*` |
| Mission Control not rewritten by promotion | Installed/canonical SHA-256 `45D40A25C0A4EFB06DAA0C549D08E92BD7384508BF5D3B75754B74BD31CEE1EE` |
| Research/memory and local settings preserved | Additive profile/settings comparison in `provider-integration\evidence\release-state.json` |
| Recovery | Original file hashes plus non-destructive scratch-copy rehearsal; `evidence\recovery-check.json`. No live rollback claimed |

The production prompts were deliberately small, disclosed instrumentation checks: remember a nonce, then recall it. They were not a substitute for autonomous software-building evidence. Earlier development coding probes remain historical evidence with their original scope.

## Defects discovered and corrected before promotion

1. A real DSH post-compaction test initially answered the injected catalog reminder instead of the human's request. Source-aware message selection fixed this. A subsequent live recall resumed the original native thread correctly. Failed and successful development receipts remain preserved; the initial failure is not relabeled PASS.
2. The host model-selection overlay's first two development packages omitted its helper module. Version .3 includes the helper and was verified installed. Earlier tarballs are excluded from the release.
3. Codex's resumed terminal usage totals are cumulative. Persisted baselines now produce per-invocation deltas; counter resets/missing baselines remain unknown.
4. Independent review caught repeated identical human wording being dropped at a checkpoint and a possible native thread-ID mismatch. New boundary tests and runtime checks cover both. Multiple newly queued user messages remain ordered.
5. npm initially compiled SQLite for the system Node ABI instead of the intended portable Node ABI. Explicit Node 24 target rebuild repaired this before the production router was started successfully.
6. Twenty development catalog rows carried a `configured` label into a fresh production router. These were changed to `connect account`; no upstream accounts were copied. The promotion source now applies this distinction.
7. The first direct canonical test invocation lacked its build-only upstream installation and picker package template, so file-loading tests failed. Installing the checked-in lockfile offline and extracting the released picker package, as documented, resolved these setup errors; the unchanged canonical subset then passed 74/74. Production runtime did not depend on these test fixtures.

## App restart finding

The Codex app restarted during final documentation/commit work. Fresh post-restart checks found the cockpit, Mission Control and provider listener absent; LM Studio remained up. The earlier owned PIDs were gone. The cockpit's restart then failed because its existing required Research Gateway at 8765 was also down. The Gateway-owning task restored its service; this task did not change or disable that dependency. Halo services were restored using their normal scoped launchers, without generation or model loading. The 21:52 UTC release-state capture records all four checked endpoints HTTP 200 and all 118 sessions present. This proves successful manual recovery, not automatic survival of an app restart. No new Windows service or logon task was installed. See the restart checkpoint and final release-state capture for current health rather than old PIDs.

## Operating boundaries

- Local models remain primary; cloud/native specialists are selectable, not forced defaults.
- Native CLI routes retain normal-user authentication and full native coding tools. They are not silently restricted to a project sandbox or forced through the Halo worker gate.
- The optional Halo verifier is staged verification under the caller's permissions, **not** an anti-tampering isolation boundary against an agent with the same Windows access.
- `/compact` is an exact archived checkpoint with native-thread continuation. Native auto-compaction at its own context limit was not forced or benchmarked here. Interrupted coding jobs are not automatically retried.
- Native output counters, wall time and first complete model-message timing are distinct. No artificial decode t/s or first-token claim is made.
- The production router is independent of the development installation. Its catalog requires upstream account configuration; all 2705 models were not tested. Bionic-only credits were not migrated.
- llmster remains a proposal, not a deployed replacement. Spec 3.5 remains preserved historical context and has an explicit supersession notice.

## Operator / maintainer entry points

- `stack\HALO-CURRENT-CONFIGURATION.md` — current configuration.
- `stack\HALO-STACK-GUIDE.md` — user operation.
- `stack\provider-integration\README.md` — implementation, rebuild, diagnostics and rollback.
- `stack\APP-RESTART-HANDOFF-2026-09-02.md` — exact intermediate pause state, not a later completion claim.
- `C:\Users\scott\.dsh\backups\native-provider-promotion-20260902` — pre-change rollback files, private session baseline.
- `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration\MANIFEST-SHA256.txt` — recovery copy integrity; historical evidence hashes remain preserved.

Next: Scott uses the production picker/native routes and chooses whether to do a walkthrough or independent audit. No further model benchmark or provider redesign is required to perform that check-in.
