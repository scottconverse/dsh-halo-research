# Halo stack — current installed configuration

## September 8 audit-fix update (DEV only)

The three Router audit defects are repaired: current message modality/context
requirements reach automatic selection; session controls reject obsolete replies
and save field-level patches; optional evidence writes cannot change a selected
worker route. Native picker authority, tools and production configuration are
unchanged. Fresh installs default to Manual; this delivered DEV remains Auto /
Local first. See `audit-lite-halo-router-recheck-2026-09-08.md` for the scoped
recheck, tests and live evidence, including preserved failed smoke evidence.

## September 8 update — active human Router DEV 0.3.0

The separate **Halo Router DEV** at **http://127.0.0.1:3085** now has a native
Router button on the opening screen and in conversations. Manual is the default
and preserves DSH's native model picker and existing verified-coder worker. A
human can enable per-conversation Auto, select Local first or Local only, and set
searchable planner/worker overrides across the 2,747 discoverable routes. Those
routes are catalog entries, not proof that an account is connected or entitled.

Auto uses the pinned DevHarmonics policy and exact current qualification. The
current exact-qualified set is the local Q4_K_M worker, Claude Sonnet, and Codex
`gpt-5.6-sol`; other routes remain manually selectable and unknown until proven.
Planner routing binds the current assembled tools, and worker selection is
deferred until the actual child and its tool schema exist. Changing DSH's native
picker cancels Auto for that conversation. Local first/Local only describe the
model/network route, not permission to use web or network tools.

Live bounded evidence covers Root Auto to local, Root Manual preservation, a
Codex planner override, an actual local gated child PASS, and an actual Codex
gated child PASS in 42.3 seconds. The first local qualification script read the
observer export before its settle point and produced a preserved false failure;
the settle check was corrected, so that first script must not be described as an
all-green receipt run.

The Router does not manage model residency or processes and adds no adaptive
scoring, automatic retry, or new failover mechanism. Its host service, UI link,
records, and controls are installed only in the separate DEV profile by
`halo-router-dev\configure-dev.mjs`. Production packages, configuration, picker,
sessions, services, models, and accounts remain unchanged. Operation and recovery:
[DEV runbook](halo-router-dev/README.md). Direct donor source and qualification
evidence: [direct reuse record](HALO-ROUTER-DIRECT-REUSE-2026-09-07.md).

## September 7 late update — direct donor reuse in DEV 0.2.0 (superseded status)

The same separate port 3085 DEV introduced the actual pinned DevHarmonics
selector, original qualification checks, and Codex Factory lineage tests. Its
shadow-only operating status was superseded by the human-controlled 0.3.0 update
above; its source and evidence remain valid historical inputs.

## September 7, 2026 — initial shadow Router DEV (historical)

The shadow-only Router 0.1.0 experiment was first deployed at
**http://127.0.0.1:3085**, with the **Halo Router DEV** preset and its own DSH home under
`stack\halo-router-dev\home`. Production runtime/configuration remains unchanged;
its observed listener today is `127.0.0.1:3000`. The `3080` addresses below
belong to earlier dated deployments, not this DEV instance.

The full picker remained available. At that stage DEV's fresh-session default was
the existing `lmstudio / halo/qwen3.6-35b-a3b`; Router 0.1.0 never selected or
loaded a model. Router 0.3.0 can now select a route only after a human enables
Auto, as documented above, and still never loads a model.
No production aliases, access settings, services or credentials were changed.
DEV shares the existing LM Studio/OmniRoute endpoints and native signed-in
accounts, but stores sessions, native conversation state and gate runs separately.

At that stage two native plugins observed and recommended with `authority: none`.
The Gateway was excluded from DEV. Local, Claude and Codex transport checks
passed, while automatic routing and organic worker qualification had not yet been
established. The current active evidence boundary is recorded above. Instructions:
[DEV runbook](halo-router-dev/README.md). Full evidence and limits:
[September 7 implementation](HALO-DSH-IMPLEMENTATION-2026-09-07.md).

## Current provider promotion — September 2, 2026

Production at **http://127.0.0.1:3080** now includes the development-tested
native Claude Code and Codex model routes, searchable opening/session picker,
native timing/token display, persistent model selection, and native-session
continuity. DSH remains the daily cockpit; local tuned models remain the
fresh-launch default. LM Studio and Mission Control were not restarted or
retuned by this promotion.

The live catalog exposes 32 LM Studio/local/LM Link entries, 3 Claude CLI
aliases, 7 installed-Codex catalog models, and 2,705 OmniRoute catalog routes.
Catalog presence is **not account entitlement or inference acceptance**.
Native Claude/Codex use the existing signed-in CLI accounts; other cloud
providers require connecting the relevant account/API key. OmniRoute is
production-owned at **http://127.0.0.1:20130**, independent of development
`:20129`. Runtime/state: `C:\Users\scott\.dsh\provider-runtime`.

Profile-local overlays: picker `halo-dev-search.4`, conversation metrics
`halo-native-metrics.2`, and API session selection `halo-selection.3`, all
based on DSH `0.1.1-rc.2`. No global pnpm package was hand-edited.
Native adapter source: `stack/provider-integration`; production receipts,
thread mappings, and compaction archives: `C:\Users\scott\.dsh\native-cli`.
DSH outer compaction creates an exact transcript archive/checkpoint while
the native CLI retains and compacts its own thread. This is not an additional
LLM-generated semantic summary. Changing routes starts a new native context
with DSH history; interrupted jobs are not automatically resumed/retried.

Research Gateway, reference memory, the local aliases, optional verification,
and existing sessions are preserved. Native CLI choices execute their own
tools; they do not secretly execute the DSH tool catalog or Halo verifier.
See `HALO-PROVIDER-PROMOTION-2026-09-02.md` for evidence, limitations, operation,
and rollback. Earlier counts and deployment claims below are dated history.

**Verified DSH research workflow (2026-09-03):** Halo Orchestrator now mounts
`stack\halo-research-state`. It rebuilds research state from successful,
durable `mcp__halo_research__*` calls and Gateway results after automatic DSH
compaction; model-written summaries cannot establish which sources or pages
were read, whether coverage is complete, what cursor remains, or how many
research calls ran. Explicit call/time budgets are enforced, and the requested
final-answer word/citation/coverage contract is checked before completion. The
live bounded workflow passed with 8/12 research calls, 128,443 ms of a six-minute
budget, three required sources, real continuation reads, two compactions, and a
139-word cited answer. See `HALO-DSH-IMPLEMENTATION-2026-09-03.md` and
`halo-research-state\README.md`. This is workflow acceptance, not certification
of every Gateway provider or arbitrary factual claim.

**Mission Control launcher correction (2026-09-02):** `Halo Status.lnk` now
reuses the verified running dashboard instead of launching a duplicate server.
The Windows PowerShell `-File` default-path failure is also fixed. The live
Mission Control server, DSH settings, models, and development deployment were
not replaced or restarted. See `HALO-DSH-IMPLEMENTATION-2026-09-02.md`.

**Status (2026-09-01 native-access correction):** Halo Orchestrator retains
native tools; the verified-coder workflow is optional and inherits caller
permissions. The 2026-08-30 capability restrictions below are superseded.
See `HALO-DSH-IMPLEMENTATION-2026-09-01.md` for the current DSH deployment
ledger and evidence boundaries. The native-access changes belong to the
separate Gateway task and are preserved, not reimplemented here.

**Evidence boundary:** older model/residency/picker measurements in this file
are dated baseline evidence, not a fresh current-state inventory. The native
access repair does not change model routes, contexts, or slots. Its gate suite
was reported as 16/16 by that task; this picker/monitoring task did not rerun
or strengthen that autonomy claim.

**Current startup (2026-09-01 evening):** a fresh cockpit launch selects the
tuned `lmstudio/halo/qwen3.6-35b-a3b` default and preloads that brain plus
`halo/qwen3-coder-30b-a3b-q4km`. Both were observed resident at Q4_K_M, 32768
context, one slot, and no idle TTL. Reopening a running cockpit refreshes the
catalog without resetting selection or residency. The picker currently has
32 saved choices, including API-discovered local and LM Link models. This
is a catalog count, not 32 independent files or 32 tested inference routes.
Full native tools and permissions remain unchanged. See
`HALO-STARTUP-AND-BIONIC-2026-09-01.md` for the new evidence and limitations.

**DSH:** `@deepseek-ai/dsh@0.1.1-rc.2`

**Operator surface:** `http://127.0.0.1:3080`

**LM Studio API:** `http://127.0.0.1:1234`

This is the current operating record for Halo. It supersedes older handoffs,
morning reports, sequential-residency instructions, and the 2026-08-27 model
choices. Historical files remain evidence, not current configuration.

## Evidence correction — 2026-08-30

At that date, the daily 35B/Q4_K_M baseline below was the accepted configuration.
The Q6 worker and persistent-memory audition remain preserved as unfinished
experiments, but neither replaced that baseline. The root was restored to the
35B then; the current default is recorded above. The optional `subagent_coder`
route remains Q4_K_M.

Prior Hardgate/canary results were actively shaped by Codex through prompts,
roles, tool restrictions, acceptance criteria, and retry decisions. They prove
the guided Halo pipeline, not unassisted prompt-to-software autonomy. The raw
record and failure analysis for the first replacement prompt-only trial are in
`..\evidence\prompt-only-todo-20260830` and the takeover handoff. Direct
runtime measurements, file hashes, gate unit tests, and independently rerun
repository tests remain valid within their stated scope.

## Model-picker package — 2026-09-01

The web profile shadows only
`@deepseek-ai/dsh-client-ui-model-selection@0.1.1-rc.2` with the reviewed local
tgz under `stack\packages`. For a current model with no reasoning metadata, the
first click now displays the full model-radio list directly. Models that expose
reasoning metadata retain DSH's Model/Effort root menu. The active cockpit
served the reviewed client SHA-256
`8AD89CED1EB23C241C82E0B3702359696827920AD99F37DE2AA568095533E131`
after today's deployment. The HTTP-served and installed bytes match. A live
browser check exposed all 12 choices, changed the selection to the tuned 35B,
verified its label and checked radio, then restored the original raw 27B
selection. No generation prompt was submitted for this UI check. The older
`ADD6028C...`/`181d51cad54e` identity is superseded deployment evidence.

The canonical profile dependency is `stack\web-profile.package.json`. The
installer `stack\Install-HaloPickerOverride.ps1` uses an offline,
lifecycle-script-disabled profile install, creates hash-verified copies of the
pre-install manifest and lockfile, and verifies the immutable tgz,
client/index/invariant bytes, package contract, and lockfile integrity binding.
It fails closed if the reviewed tgz is missing instead of rebuilding it, and
returns the exact `-RollbackFrom` command. Installation and rollback each
require a separate, ownership-checked DSH-cockpit-only restart; they do not
restart LM Studio, the Research Gateway, Mission Control, or Ollama.

The alternate-DSH-home install and second-run no-op were also tested in a
disposable directory without changing the real profile. Same-version repairs
remove only the picker dependency before adding the pinned archive, so pnpm
cannot silently retain an older bundle. Failed installs retain rollback evidence.

## 1. Source of truth and copy policy

- Reproducible stack: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack`
- Live DSH home: `C:\Users\scott\.dsh`
- Live Halo LM Studio aliases: `C:\Users\scott\.lmstudio\hub\models\halo`
- Scott's required readable copy: `C:\Users\scott\Desktop\Halo Stack Research`
- Recovery snapshot: `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration`
- Governing current specification:
  `C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Spec-v3.5.md`
- Complete historical specification through v3.1:
  `C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report-v3.0.md`

Every material configuration change must update the canonical stack, the live
installation, this document, the Research-folder copy, and the recovery
manifest in the same task.

## 2. Machine and memory policy

The AMD Variable Graphics Memory split is now **64 GB graphics / 64 GB
Windows**. Scott no longer uses WSL and permits only one Windows Sandbox at a
time. Halo owns model inference and tuning; CivicCast owns its Windows Sandbox
lane.

The normal Halo pair was post-reboot verified together in the 64 GB graphics
pool at 32K and `parallel=1`. It used 43.9 GiB dedicated and 0.68 GiB shared
GPU memory, while Windows retained 40.56 GiB free after a real DSH planner turn
and gated worker PASS. Only one model generates at a time, but both remain
resident so the planner/worker loop does not pay a reload on every delegation.
If a future configuration cannot remain fully resident without material shared
memory or paging, serialized loading is the fallback before changing VGM again.

## 3. Accepted baseline topology (current selected route is recorded above)

| Layer | Current component | Purpose |
|:--|:--|:--|
| Cockpit | DSH web on `:3080` | Point-and-click control plane |
| Daily brain | `halo/qwen3.6-35b-a3b` | Fast planning, coordination, tool use, review |
| Daily worker | `halo/qwen3-coder-30b-a3b-q4km` | Bulk implementation behind the verified gate |
| Model server | LM Studio on `:1234` | Local OpenAI-compatible inference |
| Gate | Halo Verified Coder DSH plugin | Isolated staging, verification, promotion, receipts |
| Cloud specialists | Native Codex and Claude subagents | Optional subscription-backed help |
| Public web | Local Halo Research Gateway 0.2.0 on `:8765` | Shared search/fetch/crawl/research tools |
| Reddit | Gateway Reddit tools | Shared anonymous pacing and cache |
| Monitoring | Mission Control on `:3090` | Models, memory, services, gate ledger |

## 4. Daily model pair

### Brain: Qwen3.6 35B-A3B Q4_K_M

- DSH id: `halo/qwen3.6-35b-a3b`
- LM Studio identifier: `halo-brain-35b`
- Base: `qwen/qwen3.6-35b-a3b`, Q4_K_M, approximately 20.55 GiB
- Context: 32,768
- Parallel slots: 1
- Unified KV, GPU KV offload, F16 KV, Flash Attention
- Batches: 2048 evaluation / 512 physical
- Context checkpoints: 32
- Full GPU offload, strict VRAM cap, mmap off
- MTP/simple speculative decoding: off
- `keepModelInMemory`: true
- Daily `enableThinking` default: false

This MoE brain replaced the dense 27B as the daily cockpit because the
measured local path has much faster prefill and decode for the prompt-heavy,
short-output planning role. The no-thinking fast path was proved through a
visible exact response, not inferred from YAML.

### Worker: Qwen3 Coder 30B-A3B Q4_K_M

- DSH id: `halo/qwen3-coder-30b-a3b-q4km`
- LM Studio identifier: `halo-coder-q4km`
- Base: `lmstudio-community/qwen3-coder-30b-a3b-instruct`, Q4_K_M,
  approximately 17.29 GiB
- Context: 32,768
- Parallel slots: 1
- Same load envelope as the brain except reasoning and speculative decoding
  are off
- `keepModelInMemory`: true
- DSH entry point: `subagent_coder`

Q4_K_M replaced Q4_K_S as the daily worker to preserve the stronger
tool-calling quantization floor. The Q4_K_S worker remains installed as a
rollback option.

### Residency

The accepted daily-pair operating pattern is **dual resident, serialized generation**:

1. The 35B plans and calls `subagent_coder`.
2. When selected, the Q4_K_M Coder implements a bounded unit in gate-owned
   staging with the native tool catalog and the caller's permission scope.
3. The verifier decides PASS or FAIL and promotes only PASS.
4. The orchestrator reports the actual receipt and continues authorized work.
   New changes need fresh verification; a failed receipt cannot be called PASS.

Halo Orchestrator supports direct `write`, `edit`, shell, generic subagents,
Codex/Claude Build, workflows, and Ralph before and after gate calls. There is
no preset-switch requirement for native access. The model picker remains
operator-controlled; the model measurements here describe the earlier baseline.

The 2026-08-29 live canary ended with both models resident, idle, context
32,768, and `parallel: 1`. Sequential swapping is now a fallback, not the
normal policy.

The 2026-08-30 parallel-slot probe kept this setting. One corrected sample at
two slots completed accurately but did not demonstrate a concurrency benefit:
the four-request batch took 36.924 seconds versus 32.751 seconds at one slot,
and the four-tool batch took 10.161 seconds versus 8.123 seconds. Because the
one-versus-two comparison was only one run per cell, treat the modest
differences as directional rather than universal.

The attempted four-slot cell is not comparative evidence. Its `lms load`
command was interrupted at approximately 98%, and a later probe ran while
earlier requests could still be outstanding. The engine log proves four 32K
contexts were allocated, not that the endpoint was fully ready. The cell is
classified invalid, and paging remains a hypothesis because page-fault and
pagefile telemetry were not captured.

The operational decision is still firm: no extra-slot setting earned promotion,
and `parallel: 1` matches the installed serialized planner/worker topology while
preserving more Windows headroom. Full evidence and the reviewer reconciliation
are in `HALO-PARALLEL-SLOT-TEST-2026-08-30.md` and
`HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`.

### Parallel operating profiles

**Installed daily profile:** both the 35B planner and 30B worker remain at 32K
and `parallel=1`. The planner issues one gated implementation unit and waits for
its verdict. This is the accepted tuning profile; raw-model selections can use
different load defaults.

**Proposed two-worker fan-out profile:** not installed and not accepted yet. If
Halo later needs two genuinely independent coding units at once, leave the
planner at `parallel=1` and create a separate coder-only candidate at
`parallel=2`. DSH must admit at most two sibling workers in disjoint worktrees,
and each unit must earn its own gate PASS. Promotion requires a bounded
end-to-end comparison measured by time to two verified green units, with more
Windows headroom and authoritative completed model loads. The daily alias must
not be repurposed for this experiment.

### Preserved fallbacks

- `halo/qwen3.8-27b`: dense Qwen3.8 27B Q5_K_XL, 32K, boolean reasoning on,
  MTP enabled; previous cockpit.
- `halo/qwen3-coder-30b-a3b`: Q4_K_S, 32K; previous worker.

## 5. GPT-OSS 120B capability result

The former `halo/gpt-oss-120b` route was tested at 32K with one slot, F16 KV,
MTP off, and real low/medium/high reasoning efforts. It was **not usable on the
current Windows Vulkan path** and was never promoted to a normal route.

Two controlled exclusive loads were attempted after the 96/32 change:

- mmap off: failed near 60% with `unable to allocate Vulkan0 buffer`; peak
  dedicated GPU memory 45.382 GiB; Windows free memory reached zero.
- mmap on: failed near 90% with the same Vulkan allocation error; peak
  dedicated 47.443 GiB, peak shared 0.231 GiB, minimum Windows free 6.666 GiB.

The mmap retry protected Windows headroom better but did not overcome the
driver allocation ceiling. On 2026-08-30, Scott approved the curated-library
cleanup: the 59.034 GiB GGUF and its live/canonical picker aliases were removed.
The alias definitions, pre-cleanup catalog, and failure evidence remain under
`Current Halo Configuration\evidence\model-library-cleanup-20260830`. Restoring
the route requires re-downloading the model and obtaining new runtime proof.

## 6. DSH provider and model picker

DSH has one active picker provider: `lmstudio`, displayed as **LM Studio
(HALO local)**. The provider is OpenAI-compatible at
`http://127.0.0.1:1234/v1`.

The client library requires a nonempty API-key field even though local LM
Studio ignores it. `Launch-Halo.ps1` therefore sets
`LMSTUDIO_API_KEY=x`. This is a harmless local dummy value, not an external
credential. No user account or paid API key is involved.

The bundled DeepSeek model catalog is empty. **Halo does not require or use a
DeepSeek API key.** If a browser shows DeepSeek onboarding after a restart,
refresh it and verify that the live LM Studio provider is routable; do not add
a DeepSeek key.

The picker contains four Halo aliases for the daily pair and preserved
27B/Q4_K_S fallbacks, plus the seven retained raw local models. The library was
curated on 2026-08-30 from 21 directories / 383.28 GiB to seven directories /
approximately 136.30 GiB. Fourteen rejected, incomplete, redundant, or
nonessential directories were permanently removed, reclaiming 246.984 GiB.
Codex and Claude are subscription-backed tools, not picker models.

The retained uncensored Qwen entry is now `qwen3.8-27b-uncensored`. Its
22.08 GB Q6_K no-MTP language weights and 0.93 GB F16 vision projector are
still separate files but one LM Studio model. On 2026-08-30 the projector was
renamed from the publisher's former
`Qwen3.8-27B-Uncensored-vision-f16.gguf` name to the current
`mmproj-Qwen3.8-27B-Uncensored-F16.gguf` name. The bytes were not downloaded or
changed: local SHA-256
`5ac423f8a29059dc24e51bc6a43e9380dcd57a9347f28b62591e0b3f60b7081c`
matches the publisher's artifact. LM Studio then indexed one vision-capable
model instead of two misleading standalone rows.

### Mission Control truth contract

Mission Control defaults the Models tab to this device. LM Link peer catalogs
are opt-in and every row carries its physical origin; peer rows cannot invoke a
local load action. The footer distinguishes physical local disk use from
addressable entries because Halo aliases share the raw weight files. The Brain
and Worker slots are derived from the current LM Studio model.yaml aliases, not
the deleted legacy loader scripts. Global context alarms cover running sessions
and sessions updated in the previous 15 minutes; historical fill remains on the
Sessions tab and does not keep the whole dashboard red. A missing memory graph
is reported as not configured, never as zero entities.

The 2026-09-01 final Mission Control build is deployed with source SHA-256
`45D40A25C0A4EFB06DAA0C549D08E92BD7384508BF5D3B75754B74BD31CEE1EE`.
It passed 118/118 combined tests, 83/83 installer checks, and 199 live checks
bound to its exact install receipt. The real memory node, writer/task/snapshot
status, unchanged-refresh preservation, and narrow-width graph fitting were
checked in the browser. Current deployment and recovery evidence is in
`HALO-DSH-IMPLEMENTATION-2026-09-01.md`.

After Scott approved UAC, the replacement `HALO Memory Snapshot` task was
registered at 20:47 MDT on 2026-09-01. It runs the canonical snapshot script
as Scott with Interactive/Limited privileges, hourly plus a startup trigger,
missed-run handling, three five-minute retries, no overlapping runs, a
ten-minute execution limit, and 168-snapshot retention. The real Task Scheduler
run at 20:49 completed with result 0 and created a byte-identical snapshot of
the source memory file. Startup/retry behavior is definition-verified, not a
claim that a reboot or injected failure was tested. Before/after definitions
and first-run proof are preserved with the dated implementation evidence.

## 7. Verified Coder gate

The current `subagent_coder` is the Halo-owned DSH composite in
`stack\halo-verified-coder`. It is foreground-only and mechanically owns:

- a detached staging worktree;
- explicit editable and protected path lists;
- a synthetic staging parent with the caller's explicit permission scope;
- the native DSH preset composition without a gate-specific child tool filter
  or delegation-depth cap;
- at most two worker rounds;
- a gate-owned `.halo-scratch` directory for temporary fixtures and pytest
  basetemp, excluded from diffs and promotion;
- protected/out-of-scope change rejection;
- independent-baseline verification;
- compare-and-swap promotion;
- post-promotion verification and rollback;
- fail-closed timeout/crash behavior;
- a read-only `halo_preflight` that checks the actual Git, Node, Python,
  package-manager, Docker CLI, and Docker-daemon state;
- non-Git greenfield support through gate-owned `.halo-acceptance` files,
  written before the worker starts, protected from it, verified in isolated
  Git worktrees, and never promoted into the user's project;
- structured receipts under
  `C:\Users\scott\AppData\Local\HaloGate\runs`.

The live 2026-08-29 canary used session
`session-halo-gate-canary6-20260829`. The 35B issued the real tool call, the
Q4_K_M worker changed only `calculator.py`, the protected test was unchanged,
the verifier printed `HALO_GATE_CANARY_PASS`, promotion succeeded, and the
parent reported PASS. Receipt:

`C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T01-16-38-059Z-2fdc1f28\verdict.json`

The corrected plugin's zero-model suite passes 16/16, including existing
promotion/tampering/crash/timeout checks and native-access regressions before
and after PASS/FAILED. Staging is not a security sandbox: a full-access worker
can access the rest of the machine. The receipt is evidence for the checked
changes, not a tamper-proof guarantee against an agent with that authority.

A fresh real-repository guided Halo proof then ran under a Codex-designed
brief, role split, tool boundary, verifier, and retry policy:

- parent session: `session-halo-hardgate-simplified-20260830`;
- gate receipt:
  `C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T06-19-50-999Z-6bcf3a43\verdict.json`;
- the 35B called `subagent_coder` exactly once;
- the 30B used only `read`, `write`, and `pwsh` from its six-tool allowance;
- after PASS, the parent used only `read` and made no second call or mutation;
- isolated and post-promotion checks passed 17/17;
- independent target verification passed 17/17 and the complete Hardgate
  suite passed 133/133;
- the protected test hash stayed unchanged.

The guided proof also exposed an important verifier boundary: the original protected
test asserted strings but not the full Claude hook schema. A separate bounded
unit added a semantic schema test, proved a genuine RED (`1 failed, 17
passed`), then let the same guided 35B-to-30B gated flow repair only the
README. The gate passed on round one; isolated, post-promotion, and independent
target checks all passed 18/18; the complete Hardgate suite passed 134/134.
The current README now matches Hardgate's canonical nested hook structure.
This repository change remains uncommitted pending Scott's normal repository
decision. Full evidence is in `HALO-IMPROVEMENT-BASELINE-2026-08-30.md`.

## 8. Permissions and behavior modes

New Halo sessions default to DSH `danger-full-access` with approval policy
`never`, matching Scott's requested machine access. The gate now preserves
that scope for its worker. If the operator explicitly selects a narrower
session policy, it is inherited instead; the plugin does not override it.
Available capabilities do not authorize unrelated actions. The separately
named Claude Plan provider remains a planning-mode option, not Claude Build.

Permission mode, model selection, and agent behavior are different controls:

- permission mode controls accessible machine resources;
- the picker controls the root model for the conversation;
- Standard/Plan and other modes control behavior and tool usage;
- the verified Coder is Standard-derived, not the shipped PTC/Code preset.

## 9. Research tools

Enabled for Halo research:

- the research-only `mcp__halo_research__*` tools from the local 0.2.0 Gateway
- DSH's verified research ledger, explicit-budget gate, and final-answer gate
- installed `reddit-search` skill

Anonymous Exa has a hosted free quota and may return a rate-limit error. It is
not equivalent to an unlimited research service. The bundled DeepSeek-keyed
web tool remains disabled without a key; native shell/network capability is
available for tasks that authorize it, but it is not part of the Gateway's
research-only product scope. Authenticated research, imported-profile sessions,
and paid-provider positive-path acceptance still require separate evidence.

## 10. Operator procedure

Use the desktop shortcut:

`C:\Users\scott\Desktop\Halo Cockpit.lnk`

It runs:

`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`

The launcher is idempotent. It starts a hidden, bounded supervisor which
supplies the local dummy LM Studio credential, sets DSH
`danger-full-access`, preserves stdout/stderr, writes child/supervisor PID and
health metadata, captures the exit code, and performs at most one restart.
Evidence is under `C:\Users\scott\.dsh\logs`. The startup helper requests
`lms server start` if the local API is unavailable. The observed successful
path used Bionic as the runtime host; a completely stopped runtime/daemon
has not been tested in this change. LM Studio and Bionic must not be launched
simultaneously. Bionic can serve local models to DSH while its own cloud UI
remains available.

The launcher waits for the settings plugin (not merely an HTTP page), then
refreshes all advertised LLM choices without erasing custom/offline entries.
On fresh DSH start it preloads the pair sequentially and verifies actual
resident quant/context/slots. It does not unload or lock out other models.
Raw/remote choices retain provider-owned load settings; catalog discovery
does not prove their loaded context, tool support, or hardware fit. The 32K
catalog declaration must be matched to the runtime when using those routes.
Catalog discovery is on launcher invocation, not a continuous background poll.

For a normal build, open a new Halo Orchestrator task, describe the software
work. The selected model may implement directly or use `subagent_coder` for
verified staging. Both paths are available in this preset; neither silently
changes the selected model or authorizes unrelated work.

## 11. Recovery and evidence

- Pre-change backup: `C:\Users\scott\.dsh\backups\halo-96gb-20260829-182512`
- Runtime evidence: `HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md`
- Guided coding evidence (not unassisted autonomy):
  `HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`
- Improvement and candidate-audition evidence:
  `HALO-IMPROVEMENT-BASELINE-2026-08-30.md`
- Prompt-only failure and structural repair:
  `HALO-AUTONOMY-REPAIR-2026-08-30.md`
- Parallel-slot correction and outside-review reconciliation:
  `HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`
- Verified DSH research workflow, live acceptance, and rollback:
  `HALO-DSH-IMPLEMENTATION-2026-09-03.md`
- Research-state plugin operation and verification:
  `halo-research-state\README.md`
- Recovery snapshot manifest:
  `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration\MANIFEST-SHA256.txt`

Do not restore blindly. Compare versions and hashes, preserve user work, and
validate DSH and LM Studio after restoration.

## 12. Known boundaries

- GPT-OSS 120B was load-blocked by the Windows Vulkan allocation path. Its
  GGUF was removed in the 2026-08-30 curated-library cleanup and must be
  re-downloaded before any new experiment.
- GPT-OSS 20B and Qwen3-Coder-Next 80B did not reach usable inference. Their
  GGUFs and active aliases were removed in the same cleanup; this remains an
  operational result, not a model-quality ranking.
- After the failed candidate loads and LM Studio restart, a serialized 35B
  cold load took 8m30s and the resident-pair coder load took 2m18s. Once loaded,
  exact-response smokes completed in 2.50s and 1.34s respectively. Do not issue
  inference merely because `lms ps` says `idle`; wait for `lms load` to report
  success.
- Exa's anonymous hosted quota is finite.
- The Halo Research Gateway is deployed at 0.2.0. The 2026-09-03 live run proves
  one bounded DSH discovery/read/pagination/comparison/final workflow against
  saved evidence. It does not prove every Gateway tool/provider, authenticated
  or imported-profile path, paid provider, arbitrary semantic claim, or long
  soak. The separate Gateway task owns that broader acceptance.
- Full worker prefill is materially slower than a tiny direct completion
  because it includes the coding system prompt and tool schemas; the live
  verified canary completed in about 49 seconds after the final composition
  fix.
- No multi-hour soak or large benchmark was run; per Scott's direction,
  tonight's acceptance was short functionality proof plus real-world use.
- Parallel serving is not rejected as a hardware capability. It remains an
  optional coder-only experiment whose product metric is time to independently
  verified green units, not aggregate tokens per second.
- A gate can prove only the behavior encoded in its protected verifier. The
  Hardgate schema defect escaped the old 133-test contract; the strengthened
  semantic contract now catches it and the full suite is green at 134 tests.
