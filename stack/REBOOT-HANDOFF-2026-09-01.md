# HALO DSH Reboot Handoff — 2026-09-01

Captured: 2026-09-01 19:19 MDT

## Scope and pause boundary

This work is **DSH Halo only**. It does not include the Halo Research Gateway, OpenClaw, CivicCast, Windows Sandbox, or Ollama.

Scott ordered: **pause and prepare for reboot**. The active acceptance subagent was interrupted. No further tests, installs, deployments, process stops, model unloads, or restarts were started after that instruction. Scott retains the reboot action.

## Authoritative paths

- Canonical repository: `C:\Users\scott\Desktop\Code\dsh-halo-research`
- Nested DSH source: `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness`
- Research copies: `C:\Users\scott\Desktop\Halo Stack Research`
- Live DSH state: `C:\Users\scott\.dsh`
- Live LM Studio state: `C:\Users\scott\.lmstudio`

## Live state at pause

- LM Studio API: `127.0.0.1:1234`, PID 1280.
- DSH cockpit: `127.0.0.1:3080`, PID 24560.
- Halo Mission Control: `127.0.0.1:3090`, PID 31500.
- The current source changes have **not** been deployed to live DSH or Mission Control.
- Resident LM Studio models were idle:
  - `halo/qwen3.8-27b`, Q5_K_XL, 32K, `parallel=1`, TTL disabled.
  - `qwen3.8-27b`, Q5_K_XL, 32K, `parallel=4`, TTL 1 hour.
- Do not infer ownership of or touch Ollama/port 11434. It belongs to another project.
- A normal reboot will end the above processes. Do not add shutdown automation or reboot the machine from an agent.

## Outer repository state

Branch: `master`.

Tracked modifications:

- `_upstream/deepseek-harness` submodule working tree
- `stack/Install-HaloPickerOverride.ps1`
- `stack/mission-control/Install-HaloMissionControl.ps1`
- `stack/mission-control/Launch-Status.ps1`
- `stack/mission-control/Snapshot-HaloMemory.ps1`
- `stack/mission-control/mission-control.mjs`
- `stack/mission-control/test/reasoning-contract.test.mjs`
- `stack/packages/deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz`

Untracked files belonging to the current DSH/Mission Control work:

- `stack/mission-control/INSTALLATION.md`
- `stack/mission-control/Install-HaloMemorySnapshotTask.ps1`
- `stack/mission-control/Test-HaloMissionControlLive.ps1`
- `stack/mission-control/test/data-contract.test.mjs`
- `stack/mission-control/test/installer-contract.test.mjs`
- `stack/mission-control/test/live-acceptance-contract.test.mjs`
- `stack/mission-control/test/memory-snapshot-contract.test.mjs`
- `stack/mission-control/test/picker-package-contract.test.mjs`
- `stack/mission-control/test/ui-contract.test.mjs`

Do **not** blindly stage:

- `.pnpm-store/v11/index.db-shm`
- `.pnpm-store/v11/index.db-wal`
- `DSH-Strix-Halo-Spec-v3.5.md` until its provenance and intended commit are reviewed.

## Nested DSH repository state

Branch: `master`, one commit ahead of `origin/master`.

Modified picker files:

- `packages/client/ui-model-selection/README.i18n.yaml`
- `packages/client/ui-model-selection/README.md`
- `packages/client/ui-model-selection/README.zh.md`
- `packages/client/ui-model-selection/src/client/locales.ts`
- `packages/client/ui-model-selection/tests/browser-plugin.client.spec.ts`

The existing nested direct-open picker commit is `318b4a8`. Earlier outer commits include picker deployment `b8c92b22` and reasoning contract `a94a3490`.

## Picker package status

The reviewed package candidate is:

`stack\packages\deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz`

- Size: 19,656 bytes.
- SHA-256: `148C45AE84FF5539B3EB5509CA5A277544AC48FD91D4E56591E5218A0701BFB9`.
- Includes `package/LICENSE`.
- Contains no `workspace:` dependency ranges.
- Contains 16 archive members.

Runtime artifact identities:

- client: `8AD89CED1EB23C241C82E0B3702359696827920AD99F37DE2AA568095533E131`
- index: `6879BA2C29E67B2AD0E0CAF8FEEEE9C62364D871F7664E10EFA7F14B4E216EB0`
- invariant: `F3E07C900344FD01FFE798DA2E98FBD55381F2E4BD0FE7467D00CF81A3CAFF78`

Completed checks before the pause:

- Focused picker package contract: 3/3 green before the new alternate-home test was added.
- Picker package build: green.
- Focused picker tests: 19/19 green.
- Full client/host Vitest: 3,999 pass, 1 skipped, 0 fail.
- Documentation sync: 27/28; the sole failure was Windows symlink creation denied with EPERM, not a content mismatch.
- Broad replay-web gate was red for environment/fixture reasons: Playwright browser absent, malformed Windows seed paths, Bash-versus-PowerShell expectations, and one timeout. Record this as failed broad upstream evidence, not as picker validation.

### First action after reboot: finish the alternate-DshHome repair

A new focused test is intentionally RED because `Install-HaloPickerOverride.ps1` advertises `-DshHome` but validates the canonical relative `file:` dependency as though every target were the real live profile.

Required implementation:

1. Validate the checked-in canonical picker dependency against the real/default profile root at `%USERPROFILE%\.dsh\profiles\web`.
2. Derive the target runtime `file:` dependency from the actual `$profileRoot` using `[IO.Path]::GetRelativePath($profileRoot, $artifactPath)` and normalize it.
3. Re-run `picker-package-contract.test.mjs` until the focused test is green.
4. Re-run the disposable GUID-based alternate-DshHome integration install. It must not touch the live profile.

Do not install the picker live until this is green.

## Mission Control status

Source work already includes:

- build source/hash identity;
- subprocess acknowledgements;
- memory parsing and duplicate/dangling detection;
- route errors and ambiguity reporting;
- exact model mutations;
- completed-run truth;
- task/writer/snapshot state;
- no-store responses;
- plugin freshness;
- fail-closed GPU reporting;
- unknown-URL fallback;
- accessible memory controls;
- conditional memory UI copy rather than claiming a writer/task exists;
- exact parsed Origin/Referer validation rather than prefix matching;
- receipt `SchemaVersion = 1` and `ReceiptType = HaloMissionControlInstall`.

The deterministic suite was 71/71 before the most recent acceptance and UI additions. Do not quote 71/71 as the current complete count until the entire suite is rerun after reboot.

Snapshot support is present but not registered live:

- `Snapshot-HaloMemory.ps1`
- `Install-HaloMemorySnapshotTask.ps1`
- `memory-snapshot-contract.test.mjs`
- `INSTALLATION.md`

Design: honest no-op when memory is absent, atomic writes, 168 snapshot retention, exact scheduled task name `HALO Memory Snapshot`, hourly/startup triggers, retry, no overlap, PlanOnly/WhatIf. No live scheduled task was registered.

### Interrupted live-acceptance work

The subagent was interrupted while editing:

- `stack\mission-control\Test-HaloMissionControlLive.ps1`
- `stack\mission-control\test\live-acceptance-contract.test.mjs`

The files are fully flushed on disk (30,332 and 17,677 bytes at pause) but have not received a final focused/full test pass. Treat them as incomplete until reviewed and tested.

Review requirements to preserve:

- Mandatory externally supplied source and receipt SHA-256 identities.
- Exact installed source path/hash checked against `/api/status` and rehashed at the end.
- Versioned/type-tagged receipt with exact four-suite allowlist and strict Boolean/numeric JSON typing.
- Exact token and exact loopback Origin validation; redirects disabled; token never emitted.
- Plugin freshness and counter consistency.
- Memory file, writer, scheduled task, and snapshot corroboration.
- GPU must be healthy to pass; an honestly degraded payload is still a failed acceptance.
- `#requires -Version 7` and deterministic native-command handling.
- Single structured success result; failures must exit nonzero without leaking secrets.

## Resume order after reboot

1. Read this file and re-check both Git worktrees before editing.
2. Confirm no unrelated process/worktree changes occurred during the reboot.
3. Finish the picker alternate-DshHome TDD cycle and disposable integration install.
4. Review and finish the interrupted live-acceptance script and contract tests.
5. Run the complete Mission Control deterministic suite, PowerShell syntax checks, `node --check`, and `git diff --check`.
6. Only after all source checks pass: register the memory snapshot task with PlanOnly first, then actual registration.
7. Install Mission Control, preserve the exact receipt/hash, stop only the verified old Mission Control process, relaunch with `Launch-Status.ps1 -NoBrowser`, and run strict live acceptance.
8. Perform a real browser walkthrough.
9. Install the picker package live.
10. Verify the exact DSH process and absence of active DSH jobs, then restart only DSH via `stack\Launch-Halo.ps1 -NoBrowser`.
11. Do not restart LM Studio or unload its models merely for the picker deployment.
12. Verify fresh-session picker behavior, worker pinning to `lmstudio/halo/qwen3-coder-30b-a3b-q4km`, a bounded worker call, a prompt-only planner-to-worker-to-verifier temp-repo test, and the native gate 13/13.
13. Sync current configuration, stack guide if operation changed, successor implementation documentation, deployable `Current Halo Configuration` copies, Research-folder copies, and SHA-256 manifest.
14. Commit in scoped order: nested DSH picker, outer picker deployment, Mission Control, then docs/recovery. Never absorb the PNPM database files or unrelated spec blindly.

## Non-negotiable evidence boundary

The independent verifier receipt is authoritative, not the planner or worker's claim. Do not guide or steer the autonomous acceptance model beyond the test prompt. Configuration text is not runtime proof; deployment, live acceptance, and autonomous end-to-end evidence remain incomplete.
