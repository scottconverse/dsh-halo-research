# Halo stack — current installed configuration

**Status:** authoritative human-readable configuration record

**Verified:** 2026-08-30 after the Hardgate repair, library cleanup, slot-test correction, and Revision 3.2 reconciliation

**DSH:** `@deepseek-ai/dsh@0.1.1-rc.2`

**Operator surface:** `http://127.0.0.1:3080`

**LM Studio API:** `http://127.0.0.1:1234`

This is the current operating record for Halo. It supersedes older handoffs,
morning reports, sequential-residency instructions, and the 2026-08-27 model
choices. Historical files remain evidence, not current configuration.

## 1. Source of truth and copy policy

- Reproducible stack: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack`
- Live DSH home: `C:\Users\scott\.dsh`
- Live Halo LM Studio aliases: `C:\Users\scott\.lmstudio\hub\models\halo`
- Scott's required readable copy: `C:\Users\scott\Desktop\Halo Stack Research`
- Recovery snapshot: `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration`
- Governing current specification:
  `C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report-v3.2.md`
- Complete historical specification through v3.1:
  `C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report-v3.0.md`

Every material configuration change must update the canonical stack, the live
installation, this document, the Research-folder copy, and the recovery
manifest in the same task.

## 2. Machine and memory policy

The AMD Variable Graphics Memory split is now **96 GB graphics / 32 GB
Windows**. Scott no longer uses WSL and permits only one Windows Sandbox at a
time. This split is intentional: model capacity has priority over simultaneous
VM capacity.

The normal Halo pair fits together in the 96 GB pool. Only one model generates
at a time, but both remain resident so the planner/worker loop does not pay a
reload on every delegation. A Windows Sandbox or another memory-heavy build
must not be started blindly on top of active inference; coordinate the single
heavy lane and check current headroom first.

## 3. Current topology

| Layer | Current component | Purpose |
|:--|:--|:--|
| Cockpit | DSH web on `:3080` | Point-and-click control plane |
| Daily brain | `halo/qwen3.6-35b-a3b` | Fast planning, coordination, tool use, review |
| Daily worker | `halo/qwen3-coder-30b-a3b-q4km` | Bulk implementation behind the verified gate |
| Model server | LM Studio on `:1234` | Local OpenAI-compatible inference |
| Gate | Halo Verified Coder DSH plugin | Isolated staging, verification, promotion, receipts |
| Cloud specialists | Native Codex and Claude subagents | Optional subscription-backed help |
| Public web | Anonymous Exa MCP | Search and fetch without a DeepSeek key |
| Reddit | Installed `reddit-search` skill | Anonymous RSS-backed Reddit research |
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

The current default is **dual resident, serialized generation**:

1. The 35B plans and calls `subagent_coder`.
2. The Q4_K_M Coder implements one bounded unit in gate-owned staging with only
   `read`, `write`, `edit`, `glob`, `grep`, and `pwsh` available.
3. The verifier decides PASS or FAIL and promotes only PASS.
4. The already-resident 35B reviews a PASS with read-only tools or reports a
   FAIL and stops. It cannot retry the gate or directly mutate around the
   verdict in the same unit.

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
its verdict. This is the only accepted and deployed profile.

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

## 7. Verified Coder gate

The current `subagent_coder` is the Halo-owned DSH composite in
`stack\halo-verified-coder`. It is foreground-only and mechanically owns:

- a detached staging worktree;
- explicit editable and protected path lists;
- a synthetic `workspace-write` parent;
- the native DSH preset composition copied into that parent, narrowed by DSH's
  native child tool filter to `read`, `write`, `edit`, `glob`, `grep`, and
  `pwsh` only;
- a direct-child depth cap of 1;
- at most two worker rounds;
- a gate-owned `.halo-scratch` directory for temporary fixtures and pytest
  basetemp, excluded from diffs and promotion;
- protected/out-of-scope change rejection;
- independent-baseline verification;
- compare-and-swap promotion;
- post-promotion verification and rollback;
- fail-closed timeout/crash behavior;
- `update_goal(action=complete)` denial when the last armed verdict is not
  PASS;
- denial of a second gate call or parent `write`/`edit`/shell mutation after
  the unit's verdict, whether PASS or FAIL;
- structured receipts under
  `C:\Users\scott\AppData\Local\HaloGate\runs`.

The live 2026-08-29 canary used session
`session-halo-gate-canary6-20260829`. The 35B issued the real tool call, the
Q4_K_M worker changed only `calculator.py`, the protected test was unchanged,
the verifier printed `HALO_GATE_CANARY_PASS`, promotion succeeded, and the
parent reported PASS. Receipt:

`C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T01-16-38-059Z-2fdc1f28\verdict.json`

The simplified plugin's zero-model suite passes 9/9, including scratch
containment, parent mutation lock, protected-test tampering, and verifier
crash/timeout cases.

A fresh real-repository autonomous proof then ran without Codex steering:

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

The proof also exposed an important verifier boundary: the original protected
test asserted strings but not the full Claude hook schema. A separate bounded
unit added a semantic schema test, proved a genuine RED (`1 failed, 17
passed`), then let the same autonomous 35B-to-30B gated flow repair only the
README. The gate passed on round one; isolated, post-promotion, and independent
target checks all passed 18/18; the complete Hardgate suite passed 134/134.
The current README now matches Hardgate's canonical nested hook structure.
This repository change remains uncommitted pending Scott's normal repository
decision. Full evidence is in `HALO-IMPROVEMENT-BASELINE-2026-08-30.md`.

## 8. Permissions and behavior modes

New Halo sessions default to DSH `danger-full-access` with approval policy
`never`, matching Scott's requested machine access. The gate intentionally
narrows its local worker staging parent to `workspace-write`; the worker does
not receive the cockpit's unrestricted live-workspace authority.

Permission mode, model selection, and agent behavior are different controls:

- permission mode controls accessible machine resources;
- the picker controls the root model for the conversation;
- Standard/Plan and other modes control behavior and tool usage;
- the verified Coder is Standard-derived, not the shipped PTC/Code preset.

## 9. Web, GitHub, and Reddit

Enabled in Halo:

- `mcp__exa__web_search_exa`
- `mcp__exa__web_fetch_exa`
- normal filesystem, PowerShell, Git, and GitHub tooling
- installed `reddit-search` skill

Anonymous Exa has a hosted free quota and may return a rate-limit error. It is
not equivalent to an unlimited research service. The bundled DeepSeek-keyed
web tool and unsafe unrestricted direct fetch remain disabled. The planned
Halo Research Gateway is not deployed yet.

## 10. Operator procedure

Use the desktop shortcut:

`C:\Users\scott\Desktop\Halo Cockpit.lnk`

It runs:

`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`

The launcher is idempotent. It supplies the local dummy LM Studio credential,
sets DSH `danger-full-access`, starts DSH only if `:3080` is absent, and opens
the browser. LM Studio must already be running. The current session was left
with DSH serving HTTP 200 and both daily models resident.

For a normal build, open a new Halo Orchestrator task, describe the software
work, and let the 35B delegate implementation through `subagent_coder`. Select
a raw picker model only when intentionally bypassing the orchestrated
planner/worker/gate flow.

## 11. Recovery and evidence

- Pre-change backup: `C:\Users\scott\.dsh\backups\halo-96gb-20260829-182512`
- Runtime evidence: `HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md`
- Autonomous coding evidence:
  `HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`
- Improvement and candidate-audition evidence:
  `HALO-IMPROVEMENT-BASELINE-2026-08-30.md`
- Parallel-slot correction and outside-review reconciliation:
  `HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`
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
- The Halo Research Gateway remains a specification/partial project, not a
  deployed DSH service.
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
