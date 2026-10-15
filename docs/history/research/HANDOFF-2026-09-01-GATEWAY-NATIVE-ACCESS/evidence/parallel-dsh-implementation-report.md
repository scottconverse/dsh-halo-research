> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# Halo DSH picker and Mission Control repair — 2026-09-01

Scope: DSH Halo only. This is the dated successor for today's picker and
monitoring deployment. The Research Gateway is owned by a separate task. No
Ollama, Windows Sandbox, OpenClaw, GPU-memory split, or model-tuning changes
belong to this work.

**Result at 20:10 MDT:** picker and final Mission Control deployed and verified.
Final deterministic suite: 118/118; final candidate-bound live acceptance: 199
checks passed. Snapshot-task replacement remains pending administrator approval.

## Current state and authority

- Repository: `C:\Users\scott\Desktop\Code\dsh-halo-research`
- DSH source checkout: `_upstream\deepseek-harness` inside that repository.
- Live DSH: `C:\Users\scott\.dsh`, cockpit `http://127.0.0.1:3080`.
- Mission Control: `http://127.0.0.1:3090`.
- LM Studio: `http://127.0.0.1:1234`.
- Readable records: `C:\Users\scott\Desktop\Halo Stack Research`.
- Recovery: `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration`.
- Governing supplied spec: `DSH-Strix-Halo-Spec-v3.5.md`; canonical and Research
  copies match SHA-256 `4B80C52983D3FC8C4F22D9D34F92BFBE20BDD014D36C05BA68E610C5F20F77F8`.

The configured default during this repair is
`lmstudio/unsloth/qwen3.8-27b`, with provider-owned reasoning (no explicit
effort field). The earlier tuned 35B/Q4_K_M pair remains a dated baseline, not
the current root-selection claim. Other live DSH use changed residency during
this audit; model timing from that activity is not this task's benchmark.

The native-access correction belongs to the Gateway session. It retains native
tools and caller permissions and makes verified-coder use optional. Its reported
16/16 gate tests supersede the older handoff's 13/13 count. That is separate
evidence, not a new autonomy result from this UI repair. Those uncommitted source
changes are preserved and excluded from this task's scoped commits.

## Picker delivered

The package shadows only `@deepseek-ai/dsh-client-ui-model-selection` through
DSH's supported profile-local package mechanism. It is not a DSH fork or a
replacement provider catalog. Models without reasoning metadata open directly
to the full model list; capability-bearing models retain the model/effort menu.
The wording accurately distinguishes the current conversation from best-effort
new-conversation default saving.

- Package: `stack\packages\deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz`.
- Archive SHA-256: `148C45AE84FF5539B3EB5509CA5A277544AC48FD91D4E56591E5218A0701BFB9`.
- Installed and HTTP-served client SHA-256:
  `8AD89CED1EB23C241C82E0B3702359696827920AD99F37DE2AA568095533E131`.
- Live rollback bundle:
  `C:\Users\scott\.dsh\backups\halo-picker-before-install-20260901-194537-464-1cfede09`.

The installer derives the dependency path from the actual target DSH home.
A disposable alternate-home installation and a second-run no-op passed without
mutating the real profile. Same-version repair removes/re-adds only this package
through pnpm; it does not hand-edit pnpm's store or run lifecycle scripts.

Live browser proof: the list exposed 12 configured local choices; selecting the
tuned 35B changed the composer label and checked radio; selecting the original
raw 27B restored them. No prompt was submitted for this check. The served file
was hashed independently, so installation is not inferred from a screenshot.
The running DSH process served the accepted bytes without an additional forced
restart during this final verification.

## Mission Control changes

- Exact model/instance/device joins, visible local-versus-peer origin, and no
  false unloaded inventory after a failed resident query.
- Configured default, current residency, and historical throughput are separate.
  Missing repeated decode observations remain absent, not fake zero samples.
- Memory files are parsed and errors remain visible. No memory is fabricated.
  The real existing store has one entity and no relations at this checkpoint.
- The Memory tab displays actual writer, task, and snapshot status, checks every
  five seconds, and refreshes the graph when the backing-file identity changes.
  Unchanged refreshes preserve layout/selection. Resizing refits after physics
  settles, preventing nodes from drifting offscreen.
- Windows task timestamps are serialized explicitly in UTC; snapshot cadence
  is derived from canonical snapshot names rather than copied-file mtimes.
- Full MTP language models are not mislabeled as draft heads solely by name.
- UI loading/error/empty states, tab accessibility, unknown-hash fallback,
  response-driven actions, and exact loopback-origin authorization are covered.

The installer tests the selected source, records exact suite hashes, preserves
a verified backup, rechecks destination/source identity before replacement,
and restores prior bytes on a failed promotion. The launcher requires the live
source path/hash, not merely HTTP 200. See `mission-control\INSTALLATION.md`.

## Evidence ledger

All run files are under
`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\evidence\dsh-repair-2026-09-01`.
These logs include failed attempts; they are not all success receipts.

| Evidence | Meaning |
| --- | --- |
| `picker-integration-native.log` | Alternate-home install/no-op and real-profile preservation |
| `picker-live-install-complete.log` | Accepted live package installation and rollback path |
| `picker-served-identity.json` | Served/installed client byte identity |
| `picker-focused-final.log` | Fresh focused upstream picker regression run |
| `mission-control-combined.log` | Intermediate 117/117 combined tests before resize regression |
| `mission-control-install.log` | Intermediate D8F56BEB candidate, 82/82 installer tests |
| `mission-control-live-acceptance.log` | Intermediate candidate: 201 live checks passed at 19:57 MDT |
| `mission-control-combined-final.log` | Combined suite including the browser-found resize regression |
| `mission-control-final-install.json` / `.log` | Final source installation and 83/83 required installer tests |
| `mission-control-final-receipt.json` | Byte-identical copy of the actual final install receipt |
| `mission-control-final-launch.json` | Final source-hash-verified live process, PID 38916 at launch |
| `mission-control-final-acceptance.json` | Final source: 199 passing live checks at 20:09 MDT |

Intermediate source SHA-256:
`D8F56BEBB98E9E2A447EE2C349BAA4DCF6F4DC5B09902642A242C405C5FCFCAA`.
Intermediate receipt:
`C:\Users\scott\.dsh\mission-control\backups\install-20260901-195603-567-d2a28fe3.json`,
SHA-256 `C18E464F59996924840643CD1F0E719104BF89BDAA4DAD66E36D45680D1FD141`.
Do not combine the intermediate receipt with newer source bytes.

### Final deployed candidate

- Source SHA-256: `45D40A25C0A4EFB06DAA0C549D08E92BD7384508BF5D3B75754B74BD31CEE1EE`.
- Receipt: `C:\Users\scott\.dsh\mission-control\backups\install-20260901-200659-415-7a6201a6.json`.
- Receipt SHA-256: `7C35A43EA15DE18DB81E9E6A595168060A55FFEE18FBFACC5D52B3F8B3C51D2E`.
- Prior intermediate bytes saved by this install:
  `C:\Users\scott\.dsh\mission-control\backups\mission-control-20260901-200659-415-7a6201a6.mjs`.
- Combined contract command: `node --test stack/mission-control/test/*.test.mjs`:
  118 passed, zero failed/skipped, 39.39 seconds.
- Focused picker command in the nested source:
  `pnpm exec vitest run packages/client/ui-model-selection/tests/browser-plugin.client.spec.ts`:
  13 passed, zero failed, 10.41 seconds.
- PowerShell parsers, `node --check`, and scoped `git diff --check`: passed.

The live-check count varies with residency: the earlier 201-check run had a
resident model; the final run had none, so its two per-resident numeric checks
were absent. No test was removed. The earlier resident check is intermediate
runtime evidence; the final source retains the same catalog logic and adds only
the independently tested graph-resize correction.

Browser walkthrough covered Overview, Models, Sessions, Plugins, System,
Memory, and Settings. Real stored entity selection displayed its observation.
Final 390px viewport had 390px document width; the node/label bounds were fully
inside the 340px graph pane after settling, and selected details were retained.
No browser errors or warnings were reported. The temporary viewport override
was cleared. No live memory records were added or altered to make this pass.

### Failures and corrections to preserve

1. Alternate-home validation treated every target as the real profile. Fixed
   by deriving its relative dependency path from the actual target.
2. The first isolated integration fixture omitted `pnpm-workspace.yaml`; the
   sandbox also selected an empty cache. The corrected fixture and native
   offline PNPM run passed. This was not proof of a broken production package.
3. A relative log path broke when the installer changed directory. Subsequent
   evidence uses absolute paths.
4. PNPM retained the old installed same-version client; the hash check caught it
   and rollback succeeded. Target-only remove/add corrected the repair path.
5. `pnpm remove --offline --ignore-scripts` is unsupported. The correct removal
   uses `--config.offline=true --config.ignore-scripts=true`; add retains its
   supported flags. The failed attempt rolled back.
6. Windows denied snapshot-task replacement, but the original installer emitted
   `Registered:true`. `snapshot-task-install.json` is **invalid success evidence**.
   The fixed script uses explicit terminating errors and exact task/action
   read-back. Its falsification suite covers denial and missing/wrong read-back.
7. Browser resize moved a node offscreen after a premature fit. A physics-backed
   regression reproduced negative screen coordinates; fitting after settling
   fixes it without resetting ordinary unchanged views.

## Snapshot-task boundary — not finished

The existing `HALO Memory Snapshot` task works, has an hourly trigger, and runs
the older installed `Snapshot-HaloMemory.ps1`. Its pre-change XML is saved as
`snapshot-task-before.xml`. The new installer/script are tested but their
replacement task is **not registered**: Windows returned Access Denied.
Administrator/UAC approval was requested and remains pending.

Do not call the new startup/retry/168-retention task policy deployed. The planned
principal is Interactive, so an AtStartup trigger alone does not prove execution
before Scott logs in. After approved registration, save an exact task-definition
read-back and first-run result; unattended pre-login behavior needs separate proof.
No reboot is required or authorized for this repair.

## What this does not prove

This is package, telemetry, installation, and UI acceptance. It is not a new
prompt-only coding test, model-quality comparison, throughput benchmark, or
complete Gateway acceptance. Historical guided Hardgate runs remain guided.
No claim that every optional model/cloud provider was inference-tested is made.
No new tool restriction, model filter, forced delegation, or permission narrowing
was added. Configuration editing in Mission Control remains a read-only display;
DSH's actual native capabilities remain unchanged.

## Recovery and next action

Use the validated rollback paths and preserved copies; never restore all of
`.dsh` blindly. Recovery copies are in `Current Halo Configuration`, with a
manifest covering all files except itself. Keep the installer and its exact
four test suites together. The picker contract's source-tree-relative paths
require the canonical repository layout, not the rearranged snapshot layout.

The remaining operator decision is approval to replace the existing snapshot
task. Do not erase the working old task or claim its replacement happened.
The reboot handoff also requests a real local-Coder and planner-to-verifier
canary; the UI/telemetry acceptance above does not satisfy that separate
integration check. See the completion audit below.

## Local Git and shared-work boundary

- Nested picker source commit: `4ee42f7` (staged translation, lint, whitespace,
  and vendor-manifest hooks passed).
- Outer picker deployment commit: `a7c5abbb`.
- Outer Mission Control source/tests/installers commit: `87ddc839`.
- This report, the unchanged reboot handoff, and timestamped evidence are saved
  in a separate documentation/evidence commit. No push was performed.

The Gateway task confirmed ownership of the uncommitted native-access code and
requested it not be included without owner approval. Shared current-configuration
and guide files combine that work with this task's documentation corrections;
they are saved and synchronized but deliberately left uncommitted with those
owner-held changes. The PNPM database side files and supplied v3.5 specification
are also not blindly staged. A dirty outer tree here is disclosed preservation,
not a claim that all of its changes belong to this task.

## Completion audit follow-up — 2026-09-01, after 20:22 MDT

Re-ran the exact candidate-bound Mission Control acceptance against the live
service: `CheckedAt=2026-09-02T02:22:12.3542477Z`, `Passed=true`,
`Health=Healthy`, `CheckCount=199`. Source and receipt hashes still match the
final candidate above. Rehashed all 173 recovery-manifest entries and counted
173 actual files, with no missing or mismatched entries.

### Fresh-conversation picker persistence — newly proved

Used the actual browser picker in a new blank conversation, without submitting
a prompt. Selected `halo/qwen3.6-35b-a3b`, then independently created an idle
session through DSH's normal `session.create` API:

- `session-682ad85f-b0e8-4a07-bccc-1d05f3211da8` inherited
  `lmstudio/halo/qwen3.6-35b-a3b`; `routable=true`; all 12 configured choices
  remained in its catalog.
- Restored `lmstudio/unsloth/qwen3.8-27b` with the browser picker.
- `session-56b71a42-2002-4e97-83fe-8316e1fd1dd9`, created afterward, inherited
  the restored raw 27B default; `routable=true`.
- Live `settings.yaml` before and after:
  `024FF6130C605A0BE6B456ED8F0DCD1498DB64344FCD418C1EB083D71C00A805`.

These were idle acceptance sessions, not model generations. This closes
fresh-session/default propagation, not inference compatibility for all choices.

### Why the explicit DSH restart was substituted

The reboot handoff proposed a restart. For this exact client-only replacement,
the supported module path and declaration were unchanged, the picker node-side
`apply()` is empty, and DSH serves the browser bundle by reading its file on
each request with `cache-control: no-cache` (`packages/client/modules/src/index.ts`).
Fresh browser loading plus the accepted HTTP byte hash proves this deployment
without interrupting DSH. The installer's `RestartRequired:true` is a
conservative unconditional post-install flag, not a runtime stale-code result.
This is a documented operational substitution, not a claimed performed restart
or general proof that server-plugin changes never need one.

### Still not completed

1. Windows still has the older working hourly snapshot action, with
   `StartWhenAvailable=false` and `RestartCount=0`. The replacement needs the
   requested administrator approval, exact definition read-back, and a real
   first-run result.
2. Reboot-handoff step 12's real local-Coder call and prompt-only
   planner-to-worker-to-verifier fixture remain unproven by this task. The
   current native-access contract makes that workflow optional; it does not
   remove the integration-test requirement. The other owner's 16-test gate
   suite uses simulated worker changes, as its report explicitly discloses.

No old tool restrictions, forced delegation, or sandbox narrowing should be
restored to obtain this evidence. Any explicitly requested workflow canary must
be labeled integration testing, not general unprompted coding autonomy.
