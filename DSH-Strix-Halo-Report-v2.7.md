# DeepSeek Harness on a 128 GB AMD Strix Halo Windows 11 Workstation

## A clean-room research report and initial build specification — Revision 2.7

**Research date:** 2026-08-23 **Target machine:** AMD Ryzen AI Halo
Developer Platform (RAH-001), native Windows 11 **Status of this
document:** research + specification. Nothing has been installed or
reconfigured on the target machine except where explicitly recorded in
§16.3.

## Clean-room declaration

This investigation's **architecture and primary findings were conducted
from first principles.** No prior implementation of this concept was
inherited: no earlier implementation's architecture or code was read,
carried forward, or used to shape the recommendation. **\[v2.3\]** After
that clean-room baseline was complete, a single piece of first-party
*behavioural* evidence from this same machine's earlier period was
reviewed and imported where explicitly identified — §12.8, the
planted-bug reliability observation — at the operator's explicit choice.
No pre-reset *performance* numbers were imported (see §21.13). Every
other number in this report comes from one of:

1.  the upstream source tree at a pinned commit,

2.  the npm registry,

3.  first-party vendor documentation,

4.  a command executed on the target machine on 2026-08-23, or

5.  a cited third-party source, labelled as such.

Where a claim is community evidence rather than vendor or source
evidence, it is marked **\[community\]**. Where something could not be
established, it is marked **UNKNOWN** rather than filled with
speculation.

## Revision 2 — addendum merged, 2026-08-23

**\[Addendum\]** Three parallel clean-room reports were produced against
the same directive on the same day — by Codex (OpenAI), Grok (xAI) and
Gemini (Antigravity) — and compared against this report on 2026-08-23.
Everything worth importing was checked against upstream before it was
added; anything that could not be verified is labelled as such where it
appears. Additions are tagged **\[Addendum\]**. No original content was
removed. Where the addendum evidence made an original statement stale,
the statement was revised in place and tagged **\[Revised\]**. What was
deliberately not imported, and why, is recorded in §28 Tier 5 so the
decision is auditable.

**\[Addendum\]** Verified against upstream on 2026-08-23 for this
revision: DeepSeek Harness Discussion \#758 (Windows sandbox failure
after Temp cleanup, 2026-08-14); the DeepSeek-V4-Flash-0731 model card
(open weights, MIT, evaluated with DeepSeek Harness); the
Qwen3-Coder-Next model card (80 B total / 3 B active, 262,144 native
context, Apache 2.0, GGUFs published); the FastFlowLM repository (XDNA 2
NPU runtime, Strix Halo listed by name, OpenAI-compatible API); AMD
Adrenalin 26.8.1 release notes (2026-08-20).

## Revision 2.1 — first-party corrections merged, 2026-08-23

**\[v2.1\]** Revision 2 imported findings from three parallel reports. Revision
2.1 imports **work done on the target machine after revision 2 was cut**. It
follows the same discipline: additions are tagged **\[v2.1\]**, statements that
later evidence made stale are revised in place and tagged **\[Revised v2.1\]**,
and **no original content — including revision 2's addendum material — was
removed.**

Four changes, in descending order of consequence:

1. **§9.3 / new §9.4 — PyTorch on native Windows is SUPPORTED, not UNKNOWN.**
   This **resolves §27 item 19**, which revision 2 correctly left open after the
   Codex report asserted it. AMD publishes a `device-gfx1151` wheel. The original
   UNKNOWN was wrong, and §9.4 records why it was missed.
2. **New §6.8 — `bash` is now fully conformant (9/9).** §6.7 repaired the WSL
   package so `bash` *ran*; it did not make it *correct*. A conformance battery
   found the Microsoft alias silently dropping `-c` arguments and piped stdin.
   Fixed with a compiled shim. Includes the candidate fixes that failed, and why.
3. **§10.2–10.5 revised, new §10.6 — the benchmarks were replicated to n = 4.**
   Revision 2's figures were single-run. Replication **overturned two of them**:
   the decode advantage at 8 KB is suggestive rather than decisive, and the memory
   ratio is workload-dependent. §10.6 records what replication changed, what
   remains unreplicated, and one confound not previously disclosed.
4. **§16.3 — two further machine changes recorded**: the WSL default user was
   switched from `root` to `scott`, and the halo-stack deployment was uninstalled.

> **A note on how revision 2 was initially misread.** This report's author first
> assessed revision 2 by searching it for four keywords, found none, and called it
> a stale snapshot. It is not — it contains roughly a thousand lines of addendum
> material absent from the author's own copy. The misreading is recorded because
> it is the **same error §6.5 and §9.4 both document**: treating one probe's
> silence as an answer. Three occurrences in one day is a pattern, not an
> accident, and §27 item 24 carries it forward.

## Revision 2.2 — external corroboration and one measured result, 2026-08-23

**\[v2.2\]** Revision 2.1 merged work done on the target machine. Revision 2.2
merges **evidence from outside it**: a research paper and its citation graph, a
community build targeting this exact silicon, four recorded sessions from other
operators — two of them on the same chip — and one experiment run here in
response. Same discipline: additions tagged **\[v2.2\]**, nothing removed.

Five changes, in descending order of consequence:

1. **New §12.7 — giving the model a code sandbox took accuracy from 28 % to
   100 %, and cut wall-clock 5.1×.** Measured here, 36 graded runs. This is the
   largest single improvement recorded anywhere in this report, it required no
   new hardware, no new model, and no configuration this stack does not already
   have. It also settles which side of a published capability threshold this
   model sits on.
2. **§11.2 revised — the server comparison was missing two servers proven on
   this silicon.** Unsloth Studio and Lucebox. The second claims roughly double
   our measured decode and is the first credible challenge to §11.3's
   recommendation.
3. **New §9.5 — ROCmFPX is real, and question 26's UNKNOWN is now answered.**
   A community build validated on gfx1151 publishes quality metrics against
   BF16 — but cannot run on the selected stack.
4. **New §24.5 — reinforcement-learning post-training is closed on this
   hardware.** Six systems checked; recorded so the question is not reopened.
5. **§24.4 gains independent corroboration of the decode figure.** An operator
   on the same chip, different OS, different quant, measures 16 tok/s. We
   measured 16.05.

> **A note on a second misreading.** The author of this revision dismissed one
> of the four sessions as machine-generated filler on stylistic grounds — the
> narration *is* synthetic — and in doing so nearly discarded §11.2's most
> consequential entry. The engine it described was real, its name merely
> mangled by automatic captioning. **Style was treated as evidence about
> substance.** This is the same failure §6.5, §9.4, and the revision-2.1 note
> already record, in a new costume, and §27 item 24 carries it forward.

## Revision 2.3 — reconciliation pass, 2026-08-24

**\[v2.3\]** Two external audits (independent, on the v2.2 text plus the full
session transcript) found that several **early summary and table statements were
not updated after later experiments changed the conclusion** — the detail section
was corrected, the summary that pointed at it was not. Revision 2.3 is a
**reconciliation pass, not new research**: no measurement was re-run and no new
finding was added. Every change makes a summary agree with the section it
summarises, or states provenance more precisely. Nothing measured was weakened,
and the deliberately-excluded material (the 397B/GLM/Kimi review; the two §21.3
cross-references) stays excluded per the operator's earlier decisions.

Six corrections:

1. **Clean-room declaration — provenance stated precisely.** The declaration read
   as absolute ("no prior implementation… used as evidence"), which became
   inaccurate once §12.8 imported one piece of first-party behavioural evidence
   from this machine's pre-reset period. Reworded to say the architecture and
   primary research were clean-room, and that selected earlier first-party evidence
   was imported afterward where explicitly identified — with **no prior
   implementation architecture or code inherited into the recommendation.**
2. **§2 capability table — PyTorch split from vLLM/training.** The row said
   "PyTorch/vLLM/training… Not established", contradicting §9.4. PyTorch is
   vendor-documented supported on native Windows gfx1151; machine execution stays
   T-18; vLLM/SGLang/training remain unestablished.
3. **§22 BUILD NOW / Vulkan — rationale matched to §10.6.** The one-line rationale
   still used the single-run framing ("wins decode everywhere… parity by 45 K…
   2.7× memory") that §10.6 explicitly walked back on replication. Replaced with
   the memory-shape rationale §10 actually settled on.
4. **§26 upgrade path — PyTorch removed from the future-watch list**, since §9.4
   establishes it as already vendor-supported; vLLM/SGLang stay as the future item.
5. **§27 item 11 — port state timestamped.** The 3080/3090-occupied note now says
   this held during the clean-room baseline; §16.3 later uninstalled that
   deployment; end-to-end UI verification of the new build remains an acceptance
   item.
6. **§19.1 — operational permission posture stated.** The stock default remains
   workspace-write for general readers, but this build's intentional mode is full
   host access when the operator chooses it, with no second-guessing. No removed
   warning paragraphs are restored.

> **On the one audit finding rejected.** The other audit's top-priority item asked
> to import pre-reset MoE-worker benchmark numbers (≈181/615 tok/s prefill,
> 26.9/90.9 tok/s decode) as *current measured defaults* and close T-1 with them.
> Those numbers are from the **superseded rc.7 / 65 K pre-reset deployment**
> (transcript lines ~1450–1640, ≈33,000 lines before the clean-room reset), on a
> **different model** than T-1 specifies and predating this report's own
> benchmark-hygiene discipline. They are **not** imported. The governing rule this
> revision follows: **operator-selected behavioural evidence may be imported (as
> §12.8 was, by explicit choice); unselected pre-reset performance numbers may
> not** — the two machine states are not interchangeable. See §21.13.

## Revision 2.4 — tuning merge, the T-C battery, and a recovered record, 2026-08-25

**\[v2.4\]** This revision merges the 2026-08-24 tuning program (run after v2.3
shipped) into the spec, and restores one pre-reset record that v2.3's fence had
reduced to a bare "untested". No v2.3 finding is weakened. Sources: `tuning/` and
`tuning/tc/` in this repo (grades, metrics, session logs, all under git),
`tuning/tc/TC-FINAL-REPORT.md`, and — for the restored record — the archived
`phase2-bench-results.md` named in §17.4.

Nine changes:

1. **§12.9 (new) — the context-window sweep.** Seven tiers, headless,
   deterministic grader: 8 K fails (below the agent's ~8.5 K baseline),
   16 K–128 K all pass 7/7, 32 K fastest. Window size is eliminated as the driver
   of the original 7-hour failure.
2. **§12.10 (new) — the T-C battery.** What breaks big autonomous builds: a
   large-artifact emission stall (§12.5's mechanism at agent scale). What fixed
   it: the operator's computer-forced cadence — first move must be a tool call,
   think-act alternation, ≤40-line edits, test after every increment — **15/15
   full autonomous TownReporter build in 49.7 min** (T-C2e). Phase 1's core
   demonstration: achieved, n = 1; replication (R2′) queued. Decomposition into
   canary-sized units stands as the reliability fallback.
3. **§12.11 (new) — the two-resident-model pattern, validated.** Agent on the
   27B, app-under-test drafting on the coder MoE: drafts 7.5–12.3 s beside a
   working agent, zero contention, against 414 s + self-blocking single-slot.
   Standing pattern.
4. **§17.4 (new) — a recovered pre-reset record, imported by explicit operator
   choice (2026-08-25).** The 2026-08-17 "bench day" on the rc.7 deployment:
   Standard vs Code Mode × dense vs coder, with its locked verdicts — including
   **Code Mode lost its bench (65 s vs 41 s, both correct)**. Imported as a
   dated, fenced behavioural record under the §21.13 rule, not as current-stack
   numbers. T-12 and §27 item 13 are corrected: the honest status was
   *measured on rc.7, lost, unreplicated on this stack* — never "untested".
5. **§18.1 amended — `contextWindow` is REQUIRED.** The canonical provider block
   never declared it; pi-ai then assumes 262,144
   (`dsh-llm-pi-ai/lib/index.js:639`, `:849`) and compaction aims at
   0.8 × 262 K over a real 32 K/131 K window. Root cause of every window-death
   in the battery, and plausibly of the original 7-hour failure. One-line fix,
   applied live; runtime verification is T-28.
6. **§19.1 — the Halo v1 standing configuration**, dated as an operator
   decision: agent = 27B @ 32,768; worker = Coder-30B @ 16,384, both resident;
   Standard tool mode; forced-cadence briefs for big builds; `contextWindow`
   synced to the loaded context.
7. **§19.2 — web access stated plainly:** none out of the box (web_search needs
   a DeepSeek cloud key; web_fetch ships with no fetch provider mounted), with
   three ranked routes recorded.
8. **§20 — T-12 corrected, T-28 added,** R1/R2′ recorded as the successor
   experiments. §21.14 (new): **the pointer rule** — a result fenced out by
   §21.13 must be carried as a dated pointer to the fenced record, never as a
   bare "untested"; this revision exists because that pointer was dropped once.
9. **§22 — standing-config rows added and the 131 K row reconciled; §29 (new) —
   a records map** of every ground-truth artifact and its drive path.


**Post-audit pass, same day.** A full end-to-end read-through of this revision
found and fixed in place: the T-28 row detached from the §20 table; a missing
blank line before §29; four remaining 131 K summary lines with no pointer to
the standing 32 K decision (§12.3 Q22, §25 Q20/Q22/Q38); three stale Code-Mode
lines (§17.2's "never exercised", §17.3 criterion 11, §23 step 13a); quote
exactness in §17.4 verdict 4; missing self-exit marks in §12.10's table;
over-broad §21.11 phrasing in §12.11; 128 K-tier precision in §12.9; the stale
model id in §18.5.2's example; §1's findings count (five → six); and §25 Q25's
pre-ablation framing. Tagged \[v2.4\] or \[Revised v2.4\] where they occur.


## Revision 2.5 — the current-stack Code-vs-Standard 2×2, compaction verified, the verifier gate, 2026-08-25

**\[v2.5\]** This revision merges one externally-authored, first-party experiment:
a four-cell **Code Mode vs Standard mode × 32 K vs 64 K** battery on a hard
repository task, run on this machine, on the current stack (DSH 0.1.1-rc.2),
2026-08-25 02:21–03:32 MDT, by the operator's second-vendor agent lane and
imported the same day by operator instruction. It is current-stack evidence —
§21.13's fence does not apply; authorship is recorded. Primary record:
`C:\Users\scott\Documents\Codex\2026-08-24\rea\outputs\HALO-CODE-MODE-2X2-RESULTS.md`
(evidence package alongside it).

Seven changes:

1. **§12.12 (new) — the 2×2 itself.** Code Mode was genuine and beat Standard
   mode on a hard task (5/9 vs 3/9 core tests at 32 K; 5/9 vs 0/9 at 64 K);
   **no cell completed the task correctly, and all four falsely claimed
   success**. 64 K bought no correctness and cost time.
2. **T-12 CLOSED.** Code Mode is now measured on both machine states: slower on
   a small task (rc.7, §17.4), better on a hard task (current stack, §12.12).
   The verdict was task-size-dependent all along.
3. **T-28 RUNTIME-VERIFIED.** Both 32 K cells compacted three times cleanly at
   peaks consistent only with a correctly-declared 32,768 window; agents kept
   working after every compaction. The §18.1 amendment is proven live.
4. **§19.1 amended — the build lane.** Operator decision: implementation =
   Coder-30B, **Code Mode, 32 K**, behind a **mandatory external
   verifier-and-repair gate**; the 27B is the cockpit / optional planner (its
   uncapped planning run stalled at the 45-minute cap — §12.10's class).
5. **§21.15 (new) — the model's success claim is not evidence.** All four cells
   reported success; none had earned it. Only external test evidence completes
   a task. **§21.16 (new)** — under full access a model's absolute POSIX path
   (`/civicledger/...`) lands at the drive root (`C:\civicledger`); benchmark
   and unattended runs use workspace isolation plus root-leak guards.
6. **T-29 (new)** — stand up the verifier-and-repair gate and prove it fails
   closed. Operator direction: **stop benchmarking, build** — R2′/R1 remain
   recorded as optional follow-ups behind it.
7. **§17.4, §20, §22, §23, §25 Q38/Q39, §29** reconciled to the above.


## Revision 2.6 — the stack as built: gated lanes, evidence rules, cockpit routing, operator launcher, 2026-08-25

**\[v2.6\]** v2.5 decided the stack; this revision records that it was **built,
verified, and put into operation the same day**. Everything lives in the repo
under `stack\` (commits `06e9c222` → `fee928d8` + this revision); the dated
verification record is `stack\BRINGUP-2026-08-25.md`. Seven changes:

1. **§19.3 (new) — the stack as built and verified.** Both models resident at
   32,768; two **gated build lanes** (worker = coder/Code Mode, cockpit =
   27B/native with the forced-cadence brief auto-stamped); the T-29
   verifier-and-repair gate **built and proven** — fail-closed twice, and
   seeded-bug repair to green on both lanes (worker 0.6 min, cockpit 3.3 min),
   model identity confirmed from the LM Studio server log each time.
2. **§18.6 (new) — model pinning and the settings user layer.** Found during
   bring-up: a `--patch` (or any composition entry) **cannot pin the agent
   model** — `agent-default-model` reads the settings user layer live, so
   `--dump-config` showed the coder while the live run used the 27B. Rule:
   pin per-lane models with a **per-lane `DSH_HOME`**; verify identity from
   the **server log**, never the composed config or the session log.
3. **Evidence rules made mechanical.** `Check-Done.ps1`: **no gate-log, no
   done** — proven both directions. `Probe-Worker.ps1`: ungated runs stamped
   `UNGATED PROBE - NOT EVIDENCE`. Enforcement lives at the evidence layer
   because launch-layer locks on an all-access box are theater.
4. **The cockpit carries a standing build-routing rule** (§19.3): interactive
   sessions route any real build to the gate and relay its verdict; the
   `HALO-CADENCE-BRIEF` marker exempts gate-launched 27B builds. Seam
   verified before wiring: `system-prompt` has **no** live settings override
   (the §18.6 trap cannot recur here), a persona sentinel reached a live
   session (HALO-ROUTE-42), and the composed web profile shows the rule.
5. **Operator decision: the operator surface is point-and-click only.** The
   "Halo Cockpit" desktop shortcut → `Launch-Halo.ps1`: ensures models,
   starts `dsh web` hidden (reaping only a dead DSH orphan on :3080,
   ownership-checked — §21.9), opens the browser; verified live (HTTP 200).
   CLI and headless remain agent-lane tooling only.
6. **T-29 marked BUILT + PROVEN in §20;** the cadence brief generalized from
   the 15/15 wording is recorded honestly as n = 0 until a real cockpit-lane
   build passes with it.
7. **§22 and §29 reconciled** (new BUILD NOW rows; records map carries every
   stack artifact and the deployed persona patch path).


## Revision 2.7 — the external cross-check and the reasoning throttle, 2026-08-25

**\[v2.7\]** An operator-commissioned external research pass recommended a stack
near-identical to §19.1/§19.3 without ever seeing this machine — independent
convergence — and supplied 13 citations. This revision merges what survived
verification, and the one experiment it justified. Five changes:

1. **§12.6b (new) — the reasoning throttle exists after all.** §12.6's probes
   sent `chat_template_kwargs`; DSH's real wire is the **top-level
   `reasoning_effort` field**, and LM Studio honours it: `none` → **0 reasoning
   tokens, deterministically** (4/4, ~4× faster), confirmed end to end through
   a DSH session (reasoning_chars **0 vs 1,023** on the same-class task).
   §12.6's operational conclusion ("you cannot turn reasoning down") is
   overturned; its measurement stands. **T-23 resolved in mechanism.** Graded
   levels did not separate on a small task and remain unsized — **no standing
   configuration was changed.**
2. **§24.4c (new) — 13 citations fetched and checked one by one: 12 verified,
   1 FAILED (a claimed Windows benchmark report that is actually an empty
   benchmark request), 1 partial.** §21.15 applied to research prose. The
   verified set includes AMD's vendor-official playbook blessing this exact
   worker/window combo, and external replication of the §12.5 empty-answer
   class (19.4 % at xhigh, 0 at low/medium).
3. **T-2b annotated:** a verified external report documents Vulkan model
   loading failing at ≈64 GB despite VGM 96 on this exact hardware/OS — the
   capacity experiment now has a known wall to plan around.
4. **§19.3 gains the read-only LM Studio look:** n_slots = 4, unified KV,
   MTP active; flash-attention/KV-precision flags not printed by the load
   path (recorded as a blind spot). Nothing touched.
5. **§21.11b nuanced, §29 records the probe evidence** (`evidence/effort-probe-20260825*`).

# 1. Executive summary

**The best DeepSeek Harness workstation that can actually be built on
this machine today is a four-layer stack in which DSH itself is left
almost entirely stock.**

DeepSeek Harness 0.1.1-rc.2 (web profile, 133 plugins, workspace-write
sandbox)

\| dsh-llm-pi-ai, protocol "openai-completions", per-model baseURL

v

LM Studio local server :1234 (OpenAI-compatible, GET /models discovery)

v

llama.cpp 2.29.1 - Vulkan runtime as the default (measured, section 10),

ROCm runtime installed as an experimental lane

v

AMD Adrenalin 26.7.1 / driver 32.0.31035.1003 -\> Radeon 8060S (gfx1151)

v

128 GB LPDDR5X-8000 unified memory, currently split 64 GB VGM / 64 GB
system

The six findings that decide the architecture (the sixth was added by
v2.1 and sits out of numeric order, where that revision inserted it):

**1. DSH already speaks to local OpenAI-compatible servers, out of the
box, with no middleware.** The stock web profile mounts
@deepseek-ai/dsh-llm-pi-ai, which implements the openai-completions and
openai-responses protocols, accepts a per-provider and per-model baseURL
override, and discovers models by GET {baseURL}/models
(packages/llm/llm-pi-ai/src/discovery.ts:39-232, provider.ts:25-187). A
local-model workstation is a **configuration** exercise, not an
engineering one.

**2. The plugin count that matters is 133, not 227.** The repository
contains 227 packages; the dsh CLI declares 62 direct dependencies; the
composed default web profile mounts **133** distinct packages. These are
three different numbers and they are routinely conflated. §5 gives all
three with the method for each.

**3. Windows containment is already implemented, natively, and is on by
default.** The stock sandbox mode is workspace-write, resolved as
process.env.DSH_PERMISSION_MODE ?? 'workspace-write'. On Windows the
enforcement is a real restricted-token spawn with a capability-SID write
allowlist, implemented in ~115 KB of Win32 FFI
(packages/sandbox/sandbox-windows-acl/). There is nothing to build here,
and one environment variable can silently disable all of it — see §21.3.

**4. ROCm is now a legitimate native-Windows option for this exact
machine — and it was measured, and it loses.** ROCm 7.14.0 (released
2026-07-16) lists gfx1151 as supported on **Windows 11 25H2**, precisely
this box's OS, and LM Studio ships
llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1 — the *same llama.cpp version*
as the Vulkan runtime, which made a genuinely controlled comparison
possible. **\[Revised v2.1\]** The result (§10), replicated at **n = 4** per rung:
ROCm is **2.93× faster to first token at 1.5 K tokens and 2.09× at 5.7 K** — the
most solid measurements in this report — but it holds **46.60 GiB of GPU memory at
an ordinary 32 KB workload against Vulkan's 29.35 GiB (1.59×)**, and unlike Vulkan
its footprint **grows with prompt size** rather than staying flat, reaching
78.39 GiB and driving free system RAM to 1.55 GB on a long prompt. **Vulkan is the
default — decided on memory shape, not throughput.**

Revision 2 stated this finding from single runs and framed it as "ROCm loses".
Replication sharpened it: the prefill win is **larger and better-established** than
first reported, the decode penalty is **smaller** (14.4 % at 8 KB, only 2.2 sd —
suggestive, not decisive), and the memory ratio is **workload-dependent**. The
verdict is unchanged; the reasoning behind it is now sounder, and no longer rests
on the one long-context rung §10.6 flags as confounded.

**\[v2.1\] 6. PyTorch runs natively on Windows on this part.** AMD publishes
`torch[device-gfx1151]==2.12.0+rocm7.14.0`. This report previously said UNKNOWN;
revision 2's Codex addendum said otherwise and was **right** (§9.4). It does not
change the recommended stack — LM Studio needs no PyTorch — but it removes the
main reason anyone would argue for a Linux lane on this machine.

**5. The memory question has a precise answer, and it is not "96 GB".**
See §8. The short version: 96 GB is the maximum *VGM carve-out* AMD
exposes on a 128 GB part, the current setting is 64 GB, the GPU can
already address ~99.8 GiB, and the binding constraint for a single model
is the **54.4 GiB maximum single allocation**, not the carve-out.

The single largest risk to this build is not technical. It is that DSH's
own defaults point at a cloud provider (deepseek-official /
deepseek-v4-flash), so a workstation that "works" can quietly be doing
none of its work locally. §21.4 specifies the check.

**\[v2.4\] Status update, 2026-08-25.** The agent-capability question this
summary left open has since been answered on this machine: the local model
**autonomously built the complete Phase-1 test product** (TownReporter, 15/15
deterministic checks, 49.7 min) under the computer-forced cadence recipe — see
§12.9–§12.11 for the tuning results, §18.1 for the one-line config defect they
exposed, and §19.1 for the standing configuration that came out of them.

# 2. What is actually possible today

| **Capability** | **Status on this machine, today** |
|:---|:---|
| Run DSH natively on Windows 11 | **Yes** — verified, §4 |
| Drive DSH from a local model with no middleware | **Yes** — stock plugin, §6 |
| User-visible model switching in the DSH UI | **Yes** — dsh-client-ui-model-selection is mounted by default |
| Enforced filesystem containment on Windows | **Yes** — restricted-token/ACL, on by default |
| ROCm on native Windows for gfx1151 | **Yes** — ROCm 7.14.0, Windows 11 25H2 |
| A 27B dense VL model at 128K context | **Yes** — currently resident, 21.1 GB |
| Speculative decoding / MTP | **Yes** — already active, measured, §12.4 |
| Use the XDNA 2 NPU for the primary LLM | **No** — §14 |
| Run an NPU-resident auxiliary model (embeddings, reranker, small helper) alongside the GPU-resident primary | **\[Addendum\]** **Experimental** — a runtime exists (FastFlowLM), value to DSH unmeasured, §14 |
| PyTorch on native Windows for gfx1151 | **Vendor-documented supported** — AMD publishes `torch[device-gfx1151]==2.12.0+rocm7.14.0`; machine execution on this box is **T-18**, not yet run — §9.4 |
| vLLM / SGLang / RL training on native Windows for gfx1151 | **Not established** — §9, §24.5 |

# 3. Version discipline — what exactly was measured

Every version below was read from the machine or the registry on
**2026-08-23**.

## 3.1 Target machine, as found

| **Item** | **Value** | **How obtained** |
|:---|:---|:---|
| System | AMD RAH-001, board Compal "AMD Ryzen AI Halo" | Win32_ComputerSystem, Win32_BaseBoard |
| CPU | AMD Ryzen AI Max+ 395 w/ Radeon 8060S, 16C/32T, 3.0 GHz base | Win32_Processor |
| Memory | 8 × 16 GB Samsung K3KLALA0EM-MGCV @ **8000 MT/s** = 128 GB | Win32_PhysicalMemory |
| Memory visible to Windows | **63.79 GB** | Win32_OperatingSystem |
| GPU | AMD Radeon 8060S, PCI VEN_1002&DEV_1586 | Win32_VideoController |
| Display driver | **32.0.31035.1003**, dated **2026-07-23** | Win32_VideoController |
| Adrenalin / LLPC | **26.7.1** | vulkaninfo driverInfo |
| BIOS | AMD **03.03**, dated **2026-06-09** | Win32_BIOS |
| OS | Windows 11 Pro **25H2**, build **26200.9168** | CurrentVersion registry key |
| System SSD | Micron 4600 MTFDLBA2T0THJ, 1905.6 GB, **852.5 GB free** | Get-PhysicalDisk, Get-Volume |
| Secondary | Seagate One Touch Hub 7452 GB USB HDD (D:) | Get-PhysicalDisk |

> **Note on the OS name.** The registry ProductName still reads "Windows
> 10 Pro". This is a known Windows 11 registry artefact; DisplayVersion
> 25H2 and build 26200 are authoritative.
>
> **\[Addendum\]** **Driver currency.** Adrenalin 26.7.1 was one release
> behind when these measurements were taken: AMD Software: Adrenalin
> Edition 26.8.1 WHQL was released 2026-08-20. Its release notes are
> game-support and bug-fix items with nothing specific to VGM, compute,
> or Strix Halo, so the update is not urgent — but every number in §10
> was taken on 26.7.1, and §26 already requires re-measuring after a
> driver change. Decide the driver version before the §23 baseline is
> frozen, not after it.

## 3.2 Toolchain, as found

| **Tool** | **Version** | **Note** |
|:---|:---|:---|
| Node.js | **25.9.0** | satisfies DSH's \>=24.0.0 |
| npm | 11.12.1 | not used to run DSH — see §4.4 |
| pnpm | **11.22.0** | DSH declares pnpm@11.7.0 |
| Python | 3.13.5 |  |
| Git | 2.55.0.windows.3 |  |
| PowerShell | **7.6.5** | DSH ships a PowerShell tool seam |
| Vulkan | instance **1.4.341**, device API **1.4.349** | AMD proprietary driver |
| OpenCL | driver 3679.0 (PAL,LC) |  |
| LM Studio CLI | lms present | server live on **:1234** |
| ROCm / HIP SDK | **not installed** | C:\Program Files\AMD\ROCm absent, HIP_PATH unset |
| Ollama, llama-server standalone | **not installed** |  |
| LM Studio app | **\[Addendum\]** version **not recorded** | record at baseline alongside runtime 2.29.1; the Codex report cites 0.4.21 (classic line) and a new "Bionic" 1.0.x line — unverified here |

## 3.3 Upstream software, as published

| **Component** | **Pinned value** | **Source** |
|:---|:---|:---|
| DSH repository | github.com/deepseek-ai/deepseek-harness, default branch master | GitHub API |
| DSH repo created | **2026-08-13T11:56:32Z** | GitHub API |
| **DSH master commit (pinned for this report)** | **b150a551b8d465e31e418e1b2eaf5e79bbb7d28e** (2026-08-21T12:03:37Z) | GitHub API + local clone |
| DSH latest release | dsh-v0.1.1-rc.2, 2026-08-21T12:35:08Z, **prerelease** | GitHub API |
| DSH on npm | @deepseek-ai/dsh@0.1.1-rc.2, latest **and** next, published 2026-08-21 | npm registry |
| DSH licence | MIT | package manifest |
| DSH engines.node | ^22.19.0 \|\| \>=24.0.0 | root package.json |
| DSH packageManager | pnpm@11.7.0 | root package.json |
| DSH stars / forks | 185,833 / 20,587 | GitHub API |
| ROCm current | **7.14.0**, released **2026-07-16** | AMD compatibility matrix |
| llama.cpp (via LM Studio runtimes) | **2.29.1** for both Vulkan and ROCm | lms runtime |
| Lemonade | **v11.7.0**, published 2026-08-19, not a prerelease | GitHub releases API |
| Qwen3.8-27B | released **2026-08-14**, Apache 2.0 | see §12 |
| AMD Adrenalin (current) | **\[Addendum\]** **26.8.1** WHQL, released **2026-08-20**; this box has 26.7.1 | AMD release notes RN-RAD-WIN-26-8-1 |

> Only four DSH releases exist in total (0.1.0-rc.7, 0.1.0-rc.8,
> 0.1.1-rc.1, 0.1.1-rc.2), all prereleases, all published within six
> days. **This is nine-day-old software.** Every recommendation in this
> report should be re-checked against upstream before it is treated as
> durable.

# 4. DSH current-state analysis

Pinned to commit b150a551b8d465e31e418e1b2eaf5e79bbb7d28e, read from a
local clone.

## 4.1 Shape of the project

| **Property** | **Value** |
|:---|:---|
| Monorepo layout | pnpm-workspace.yaml; workspaces vendor/\*, **packages/\*/\***, native/landlock-run, apps/\*, website |
| Package root | packages/ contains **50 category directories**, each holding packages |
| Build | tsdown, TypeScript project references, oxlint, lefthook, vitest (7 separate vitest configs incl. e2e, web-stress, perf, snapshot) |
| Plugin framework | Cordis 4.x (@deepseek-ai/cordis) |
| Native code | native/landlock-run — a Node addon, Linux-only by name |
| Python | a python/ directory and pytest.ini exist at root — a Python SDK surface |

The packages/\*/\* double glob is the single most misread thing about
this repository. A flat listing of packages/ returns 50 entries, which
are **categories**, not packages.

## 4.2 Entry point and profiles

dsh is a launcher over "profiles": an ordered stack of plugin-bundle
patch layers with the user's own overrides applied last.

Usage: dsh \[options\] \[command\] \[args...\]

--profile \<name\> the profile under \$DSH_HOME/profiles to boot

--patch \<path\> extra patch-list overlay applied after the profile
layer

--dump-config print the composed profile tree and exit

--dump-default-config print the profile tree without its user layer or
--patch overlays

Three bundles ship: base, headless, web-app. The --dump-default-config
flag is the authoritative way to answer "what is actually mounted",
because it deliberately excludes the user layer. **Every plugin count in
this report was produced with it, or by parsing the bundle patch files
directly. The two methods agree.**

## 4.3 Composition, measured three ways

| **Question** | **Answer** | **Method** |
|:---|:---|:---|
| How many packages exist in the repo? | **227** (225 published, 2 private) | walked packages/\*/\*/package.json |
| How many does the dsh CLI directly depend on? | **62** (59 first-party + commander, js-yaml, node-addon-require-builtin) | npm packument for @deepseek-ai/dsh@0.1.1-rc.2 |
| How many compose into the stock **web** profile? | **133** | dsh --profile web --dump-default-config |
| How many compose into the stock **headless** profile? | **78** | bundle patch parse (base 76 + headless 2) |

So roughly **94 of the 227 packages are not in the stock web profile at
all.** They are alternates (a different sandbox backend, a different
search provider, a different subagent driver), test support, or
infrastructure.

> **On "200+ plugins".** The claim is defensible only as "packages
> published under the @deepseek-ai scope". It is not the number of
> things a user can exercise, and it is not the number that load. When
> sizing work against this platform, **133** is the number that matters
> for the web profile.

## 4.4 Node and package manager

engines.node is ^22.19.0 \|\| \>=24.0.0. This box runs **Node 25.9.0** —
satisfied.

The repo declares packageManager: pnpm@11.7.0; the box has pnpm 11.22.0.
The README's quick-start is npx @deepseek-ai/dsh web. **On this machine
pnpm dlx should be preferred over npx** — see §21.2, which records a
reproducible npm-resolver problem. This is a machine-specific finding,
not an upstream defect.

# 5. DSH capability inventory

The 50 categories, with package counts, from the pinned tree:

| **Category**  | **n** | **Category** | **n** | **Category**        | **n** |
|:--------------|:------|:-------------|:------|:--------------------|:------|
| client        | 40    | fs           | 7     | attachment          | 2     |
| session       | 13    | util         | 7     | boot                | 2     |
| subagent      | 11    | context      | 6     | experimental        | 2     |
| shell         | 10    | examples     | 6     | feedback            | 2     |
| core          | 8     | test-support | 6     | guard               | 2     |
| host          | 8     | web          | 6     | preset              | 2     |
| compaction    | 4     | interaction  | 5     | settings            | 2     |
| goal          | 4     | llm          | 5     | subprocess          | 2     |
| session-query | 4     | code-runtime | 3     | acp                 | 1     |
| sandbox       | 4     | credentials  | 3     | identity            | 1     |
| skill         | 4     | e2b          | 3     | mcp                 | 1     |
| storage       | 4     | hooks        | 3     | plan                | 1     |
| typert        | 4     | jobs         | 3     | runtime-diagnostics | 1     |
| workflow      | 4     | lsp          | 3     | schedule            | 1     |
| extensions    | 4     | sdk          | 3     | todo                | 1     |
| bundle        | 3     | spill        | 3     | workspace           | 1     |
| api           | 2     | terminal     | 3     |                     |       |

## 5.1 Capability map — what is genuinely there

**Bold** = mounted in the stock web profile.

| **Capability** | **Packages** |
|:---|:---|
| Filesystem | **fs-local**, **fs-sandbox**, **tool-fs**, **tool-fs-search**, file-reference-local |
| Code editing | **tool-str-replace-editor** |
| Shell / process | **tool-bash**, **tool-pwsh**, **bash-sandbox**, **pwsh-sandbox**, bash-local, pwsh-local, tool-bash-persistent, tool-pwsh-persistent, shell-env, terminal, terminal-bash |
| Sandbox / security | **sandbox-local**, **sandbox-policy**, **permission-presets**, sandbox, sandbox-windows-acl |
| Providers / models | **llm**, **llm-pi-ai**, **llm-deepseek**, **llm-retry**, **token-meter** |
| Web / search | **web-search-deepseek**, web-search-exa, web-search-perplexity, web-fetch-http, tool-web |
| MCP | mcp-client — **not mounted by default** |
| Skills | **skill**, **skill-filesystem**, **tool-skill**, skill-badge |
| Subagents / delegation | **tool-subagent**, **tool-subagent-control**, subagent-claude-code, subagent-codex, subagent-acp, subagent-dsh-sdk, subagent-fork-in-process, subagent-spawn-in-process, tool-subagent-report |
| Planning / goals | **plan-mode**, **goal**, **goal-round-driver**, **command-goal**, **tool-goal**, **tool-todo** |
| Workflow / loops | **tool-workflow**, **workflow-worker-thread**, **tool-ralph**, workflow |
| Code Mode | **code-runtime-worker-thread**, code-runtime, code-runtime-python |
| Context / compaction | **compaction-basic**, **compaction-tool-result-pruner**, **command-compact**, **agent-instructions**, **time-context**, **spill-local**, spill-policy, tmux-context |
| Session / replay | **session**, **session-projection**, **session-reference**, **session-log-export**, **session-stats**, **session-query-sqlite**, **session-title** |
| Jobs / scheduling | **jobs-local**, **tool-jobs**, **schedule** |
| Storage | **storage**, **storage-json**, **storage-domain** |
| Host / UI | **web-app**, **host-webserver**, **host-apiproxy**, **host-plugin-inventory**, 38 client-ui-\* packages |
| LSP | lsp ×3 — **not mounted by default** |
| Remote sandbox | e2b ×3 — **not mounted by default** |

### The notable ones

- **subagent-claude-code and subagent-codex exist.** DSH can delegate to
  other harnesses as subagents. Not mounted by default.

- **code-runtime-python** — Code Mode has a Python runtime, not just a
  worker thread.

- **session-query-sqlite** is mounted: sessions are queryable, not just
  replayable.

- **tool-ralph** — a dedicated loop-until-done driver.

- **spill-\*** — context spilling to keep large bodies out of the
  window.

- **token-meter** — real token accounting, mounted by default.

# 6. DSH Windows compatibility audit

## 6.1 Windows is a first-class target in the source

Signal counts across packages/\*\* at the pinned commit:

| **Pattern**                     | **Matches** |
|:--------------------------------|:------------|
| win32                           | 865         |
| pwsh                            | 555         |
| landlock                        | 177         |
| bwrap / bubblewrap              | 148         |
| process.platform                | 157         |
| powershell                      | 123         |
| seatbelt                        | 113         |
| AppContainer / restricted token | 87          |
| icacls                          | 23          |
| **WSL**                         | **0**       |

Zero WSL references anywhere in packages/. DSH does not treat WSL as its
Windows story.

## 6.2 The Windows sandbox is real

packages/sandbox/sandbox-local/src/index.ts:2-3 documents the runner
chain explicitly:

> "It selects the platform runner chain (Linux bwrap then Landlock;
> macOS Seatbelt; Windows the ACL restricted-token runner), functionally
> probes …"

Selection is a functional probe, not a platform guess — SelectedRunner
is typed 'bwrap' \| 'landlock' \| 'seatbelt' \| 'windows-acl'.

@deepseek-ai/dsh-sandbox-windows-acl describes itself as a *"Windows ACL
write-restriction sandbox backend (restricted-token spawn with
capability-SID write allowlist)"*. It is ~115 KB across 12 files
including ffi.ts (23.1 KB), win32-abi.ts (13.2 KB), token.ts (11 KB) and
acl.ts (13.1 KB), calling GetNamedSecurityInfoW / SetEntriesInAclW and
building EXPLICIT_ACCESS entries against a capability SID.

**Verdict: CONFIRMED NATIVE WINDOWS.** This is a genuine implementation,
not a stub.

## 6.3 Permission modes

From the composed default web tree:

\- id: sandbox-policy

name: '@deepseek-ai/dsh-sandbox-policy'

config:

mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'

\- id: permission

name: '@deepseek-ai/dsh-permission-presets'

\# presets expose: read-only \| workspace-write \| danger-full-access

**The stock default is workspace-write — confined.** danger-full-access
is an opt-out that a single environment variable can set for every
session. See §21.3.

## 6.4 Windows compatibility matrix

Applied to the **133** packages in the stock web profile, and to
significant non-default ones.

| **Status** | **Capabilities** |
|:---|:---|
| **CONFIRMED NATIVE WINDOWS** | sandbox-windows-acl (Win32 FFI), pwsh-sandbox, tool-pwsh, fs-local, fs-sandbox, tool-fs, tool-str-replace-editor, host-webserver, web-app + all 38 client-ui-\*, session\*, storage\*, llm\*, token-meter, jobs-local, schedule |
| **REQUIRES CONFIGURATION** | llm-pi-ai — needs a provider block for any local server (§18); web-search-deepseek — needs a key |
| **DEPENDENT ON EXTERNAL SOFTWARE** | session-query-sqlite (SQLite binding), code-runtime-python (Python — present, 3.13.5) |
| **CORRECTLY PLATFORM-GATED** | tool-bash + bash-sandbox — present in the tree but **disabled on win32** at every layer; tool-pwsh + pwsh-sandbox are the active pair. See §6.5 |
| **NOT APPLICABLE ON WINDOWS** | node-addon-landlock-run, Landlock/bwrap/Seatbelt probes (correctly bypassed by the chain) |
| **UNKNOWN — MUST TEST** | lsp ×3, mcp-client, e2b ×3, subagent-claude-code, subagent-codex, tmux-context (tmux does not exist natively on Windows) **\[Addendum\]** MSYS2 / Git-Bash binaries invoked from inside the restricted-token sandbox — the Gemini report asserts pipe-handle failures; unverified, but consistent with the CIM finding in Discussion \#758 (§6.6, T-16) |

## 6.5 The bash seam — a corrected finding

> **This section previously reported a high-severity containment defect
> (D-1). That finding was wrong, and it is retracted here rather than
> quietly deleted.**

### What was claimed, and why it was wrong

An earlier pass of this report asserted that tool-bash and bash-sandbox
were *mounted* in the stock web profile, and that because bash on this
box resolved to a failing WSL alias, DSH tool calls would either fail or
— if WSL were ever repaired — silently escape the Windows ACL sandbox
into a Linux VM.

The error was methodological: the check matched **package names** in the
composed plugin list and never read the **disabled key on the row**.
Presence in the tree is not the same as being active, which is precisely
the distinction §4.3 makes about plugin counts — applied to counting,
and then not applied to this.

### What the source actually says

packages/bundle/base/cordis.patch.yml:

\- id: bash-sandbox

name: '@deepseek-ai/dsh-bash-sandbox'

disabled: !!js process.platform === 'win32'

\- id: tool-bash

name: '@deepseek-ai/dsh-tool-bash'

disabled: !!js process.platform === 'win32'

\- id: pwsh-sandbox

name: '@deepseek-ai/dsh-pwsh-sandbox'

disabled: !!js process.platform !== 'win32'

\- id: tool-pwsh

name: '@deepseek-ai/dsh-tool-pwsh'

disabled: !!js process.platform !== 'win32'

The web-app bundle then disables the *host-level* tool-bash and
tool-pwsh rows outright (disabled: true), because agent presets own the
model-facing tool rows. And the agent presets deployed on this machine
repeat the same platform gate:

\# ~/.dsh/.agent-presets/halo-standard/agent.cordis.yml:44

\- id: tool-bash

name: '@deepseek-ai/dsh-tool-bash'

disabled: !!js process.platform === 'win32'

**On Windows, the agent is given tool-pwsh backed by pwsh-sandbox, and
no bash tool at all. The gate holds at the base bundle, the mode bundle,
and the preset.**

### Revised verdict

**There is nothing to fix, and nothing to disable.** DSH's Windows story
here is more careful than the earlier draft credited: the bash seam is
platform-gated at three independent layers, and the Windows-native
PowerShell seam is the one that is actually wired up. This is a **point
in the platform's favour**, not a defect.

The state of bash.exe on the host is therefore irrelevant to DSH
containment. It was still a real machine fault in its own right — see
§6.7.

### D-2 — tmux-context cannot work natively

tmux does not exist on native Windows. The package is **not** in the
stock web composition, so this is latent rather than live — but any
profile that adds it will not function.

## 6.6 Missing supporting binaries

rg (ripgrep) and fd are **absent** from PATH. tool-fs-search is mounted;
whether it shells out to ripgrep or uses a bundled implementation is
**UNKNOWN — MUST TEST**. Installing ripgrep is cheap insurance either
way (scoop install ripgrep).

**\[Addendum\]** **Native binaries only, inside the sandbox.**
Discussion \#758 (§24.3) shows the restricted token blocking WMI/CIM
queries issued from the sandboxed PowerShell tool. The Gemini report
makes the related, unverified claim that MSYS2/Git-Bash executables
cannot create pipe handles under the same token. Treat both the same
way: every executable the sandboxed tool reaches for should be a native
Win32 binary — rg.exe, fd.exe, git.exe, pwsh.exe — with Git\cmd rather
than Git\bin on PATH, which §6.7 already argued for a different reason.
The CIM query and an MSYS-binary call are both in the sandbox test
(T-16).

## 6.7 A real machine fault, found while chasing the retracted finding — and fixed

Independent of DSH, this box had a genuinely damaged WSL installation.

**Symptom.** bash on PATH failed with *"The file cannot be accessed by
the system."*

**First (wrong) reading.** That the bash.exe App Execution Alias stub
was a broken 0-byte reparse point. It is 0 bytes with no visible link
target — but **so is every working alias**, including winget.exe,
notepad.exe and wsl.exe. Stub size proves nothing.

**Diagnosis that actually isolated it.** Invoke the alias stubs
*directly by full path*, so PATH order cannot mask the result:

| **Alias stub** | **Owning package status** | **Result** |
|:---|:---|:---|
| winget.exe | Microsoft.DesktopAppInstaller — **Ok** | **works** |
| wsl.exe | MicrosoftCorporationII.WindowsSubsystemForLinux — **Modified, NeedsRemediation** | **fails** |
| bash.exe | same package | **fails** |

The alias *mechanism* was healthy. **Both aliases belonging to the WSL
package were dead, and Windows had already flagged that package
Modified, NeedsRemediation.** wsl appeared to work only because a real
C:\windows\system32\wsl.exe exists and wins on PATH before the alias is
ever consulted — so the damage was invisible from the command that would
normally reveal it.

**The fix that was rejected.** Putting C:\Program Files\Git\bin on PATH
ahead of WindowsApps so bash would resolve to Git Bash. It would have
made the symptom disappear while leaving the damaged package in place —
and Git\bin carries ~40 msys binaries (find.exe, sort.exe, echo.exe,
tee.exe) that shadow Windows built-ins. Git's own installer defaults to
Git\cmd precisely to avoid this. **A symptom-level shim that introduces
a known footgun is not a fix.**

**The fix applied.** wsl --update — Microsoft's supported remediation
path:

|  | **Before** | **After** |
|:---|:---|:---|
| WSL package version | 2.6.3.0 | **2.7.12.0** — latest stable (released 2026-08-18) |
| Package status | **Modified, NeedsRemediation** | **Ok** |
| **WSL2 kernel** | **6.6.87.2** | **6.18.33.2** |
| WSLg | 1.0.71 | 1.0.73.2 |
| bash.exe alias | fails | **works** |
| bash from a fresh shell | fails | **works** (WSL bash) |
| Ubuntu distro | Stopped, intact, **WSL version 2** | intact, **WSL version 2** |
| User PATH | — | **byte-identical, never modified** |

Distros are separate from the WSL system package, so nothing was lost.

### An unplanned consequence worth recording

The repair moved the WSL2 kernel from **6.6.87.2 to 6.18.33.2** — a
major jump, because the damaged package had been stuck.

That crosses a threshold this report cares about. AMD's Strix Halo
optimization guidance states that **gfx1151 requires Linux 6.18.4 or
later** on distributions without a vendor-patched kernel (with packaged
alternatives at Ubuntu 24.04 HWE 6.17.0-19.19~24.04.2+ or OEM
6.14.0-1018+). The previous 6.6.87.2 kernel was far below every one of
those floors; 6.18.33.2 clears the general one.

**This does not make ROCm-in-WSL a recommendation** — §19.2 still
rejects making WSL the primary execution environment, GPU access inside
WSL goes through /dev/dxg paravirtualization rather than the native
driver path, and none of that was tested here. It does mean the *kernel*
is no longer the blocker if the Linux lane is ever wanted for comparison
work. Recorded as an observation, not a plan.

WSL is on the **stable** channel. A 2.9.4 pre-release exists (WSL
Containers, public preview); it is **not** recommended, on the same
reasoning §15 applies to Windows Insider builds — no identified gain for
this workload.

## 6.8 `bash` made fully conformant — the second half of the fix \[v2.1\]

Repairing the WSL package (§6.7) made `bash` *run*. It did not make it *correct*.
A conformance battery (`bench/Test-BashConformance.ps1`, nine behaviours) found the
Microsoft `bash.exe` App Execution Alias failing two of them **silently** —
returning empty rather than erroring, which is the worse failure mode:

```bash
bash -c 'echo $1' _ hello      # printed nothing — trailing args dropped
echo hi | bash -c 'read x'     # x empty — piped stdin dropped
```

Both reproduce from PowerShell and from `cmd.exe`, and both work through
`wsl -e bash`, so the defect is the alias rather than the calling harness.
`WindowsApps\bash.exe` is Microsoft's **deprecated WSL1-era entry point**,
superseded by `wsl.exe`; this is a legacy-shim limitation, not a misconfiguration.

### Candidates, measured rather than argued

| Candidate | Score | Outcome |
|:---|:---:|:---|
| MS `bash.exe` alias (as found) | **7/9** | drops `-c` trailing args and piped stdin |
| Git Bash (`Git\bin\bash.exe`) directly | **9/9** | correct, but different path semantics |
| `wsl -e bash` | **9/9** | correct |
| `.cmd` shim → `wsl -e bash` | **7/9** | fixes args and stdin, **breaks quoting** (`echo "a b"` → `a`) |
| Compiled shim → `WindowsApps\wsl.exe` | **3/9** | the `wsl` alias is a poor forwarder too |
| **Compiled shim → `Sysnative\wsl.exe -e bash`** | **9/9** | **installed** |

Two plausible fixes were rejected **on measurement**, not instinct. Putting
`Git\bin` on `PATH` would drag in ~40 msys binaries that shadow Windows built-ins
— which is why Git's own installer defaults to `Git\cmd`. And the obvious `.cmd`
shim **trades one silent failure for another**: it repairs arguments and stdin
while corrupting quoted strings. Neither would have been caught without the
battery.

### What was installed

```
C:\Users\scott\.local\bin\bash.exe    (compiled forwarder, 136 KB)
C:\Users\scott\.local\bin\bash.shim   path = "C:\Windows\Sysnative\wsl.exe"
                                      args = -e bash
```

- **`Sysnative`, not `System32`.** The forwarder is a 32-bit binary, so `System32`
  is WOW64-redirected to `SysWOW64`, where `wsl.exe` does not exist — the shim
  reported *"Could not create process"* until the path was changed.
- **`.local\bin`, not `scoop\shims`.** It sits on the user `PATH` at index 3, ahead
  of `WindowsApps` at index 9, and is not scoop-managed, so a scoop update cannot
  remove it.
- **WSL bash, not Git Bash.** Both score 9/9 but are not interchangeable: WSL bash
  sees `/mnt/c/...`, Git Bash sees `/c/...`. `bash` already meant WSL bash on this
  box, so preserving that avoids silently moving the filesystem namespace under
  anything that already calls it.

**Verified:** `where bash` from a fresh shell resolves to the shim first; 9/9
conformance against PATH-resolved `bash`; quoting, nested quotes, paths containing
spaces, multi-argument passing, exit codes and Windows-drive read/write all
correct; `wsl`, Git Bash and the (shadowed, not deleted) MS alias all still work;
and the user `PATH` is **byte-identical** to its backup — nothing was added to it.

### The distro now runs as `scott`, not `root` \[v2.1\]

`bash` initially ran as **root** (uid 0) because `/etc/wsl.conf` carried no
`[user]` section, even though a `scott` account (uid 1000) existed. This predated
the shim and was first recorded as a property to leave alone, on the grounds that
the distro hosted other work.

That constraint was lifted by the operator, and the switch was made: a `[user]`
block was appended to `/etc/wsl.conf` (preserving the existing `[boot]` section;
backup at `/etc/wsl.conf.bak-20260823`). `bash` now runs as **`scott` (uid 1000,
home `/home/scott`)**, still 9/9 on the battery. `scott` was already in the `sudo`
group with a password set, and `wsl -u root` still reaches root when required.

# 7. Strix Halo hardware analysis

| **Property** | **Measured / documented value** | **Source** |
|:---|:---|:---|
| APU | AMD Ryzen AI Max+ 395 | Win32_Processor |
| CPU | 16 Zen 5 cores / 32 threads, 3.0 GHz base | Win32_Processor |
| iGPU | Radeon 8060S, PCI device 0x1586 | Win32_VideoController |
| gfx target | **gfx1151** (RDNA 3.5) | AMD ROCm compatibility matrix maps Ryzen AI Max to gfx1151 |
| Compute units | **20 reported by OpenCL** | clinfo |
| Memory | 8 × 16 GB LPDDR5X @ **8000 MT/s** = 128 GB | Win32_PhysicalMemory |
| Theoretical bandwidth | ~256 GB/s (256-bit × 8000 MT/s) | derived |
| Vulkan | device API **1.4.349**, AMD proprietary, LLPC **26.7.1** | vulkaninfo |
| OpenCL | driver 3679.0 (PAL,LC) | clinfo |

> **On the compute-unit count.** AMD markets the 8060S as 40 CUs; clinfo
> reports **20**. These are consistent: RDNA groups two CUs into one
> work-group processor, and the OpenCL runtime reports WGPs. Nothing is
> wrong with the part. Any tool that reports "20 CUs" on this machine is
> reporting WGPs, and a benchmark that scales by "CU count" must say
> which it means.

# 8. Windows memory architecture — the question answered properly

This is the section most often got wrong, so every number below is
measured.

## 8.1 What the machine reports

| **Reading** | **Value** | **Source** |
|:---|:---|:---|
| Physical DIMM capacity | **128 GB** | Win32_PhysicalMemory (8 × 16 GB) |
| Memory visible to Windows | **63.79 GB** | Win32_OperatingSystem |
| GPU **Dedicated** memory | **65,360 MB** ≈ 63.83 GiB | dxdiag |
| GPU **Shared** memory | **48,938 MB** ≈ 47.79 GiB | dxdiag |
| GPU **Display (total)** memory | **114,298 MB** ≈ 111.6 GiB | dxdiag |
| OpenCL global memory | **107,206,131,712 B** = **99.84 GiB** | clinfo |
| OpenCL **max single allocation** | **58,411,555,225 B** = **54.40 GiB** | clinfo |
| Win32_VideoController.AdapterRAM | 4,293,918,720 (~4 GB) | **ignore — 32-bit overflow artefact** |

65,360 + 48,938 = 114,298, exactly. Windows' "Display Memory" is simply
dedicated plus shared.

## 8.2 What is actually happening

The 128 GB is one physical pool. **VGM (Variable Graphics Memory) is
currently set to 64 GB**, which is why:

- Windows sees 63.79 GB rather than 128 GB — the carve-out is taken
  *before* the OS counts memory, at firmware level. It is not "reserved
  from Windows"; Windows never sees it.

- The GPU reports 63.83 GiB "Dedicated" — the carve-out.

- The GPU additionally reports 47.79 GiB "Shared" — a WDDM mapping over
  the *remaining* system RAM, which is the Windows analogue of Linux's
  GTT.

AMD's own Strix Halo optimization guidance says the opposite of what
most Windows users do:

> "AI frameworks work more efficiently with GTT-backed allocations. GTT
> allows large, flexible mappings without permanently reserving memory,
> resulting in better overall system utilization." — AMD ROCm docs,
> Strix Halo system optimization

AMD recommends keeping the firmware VRAM reservation *minimal* (as low
as 0.5 GB) and raising the GTT limit instead. **But that entire page is
Linux-only.** Its mechanism is the TTM pages_limit sysfs knob and the
amd-ttm helper. There is no TTM on Windows, no pages_limit, and no
amd-ttm.

**This is the single most important asymmetry in the whole
investigation:** on Linux you tune GTT and leave VRAM tiny; on Windows
the carve-out *is* the tuning knob, because the flexible half is not
user-controllable.

## 8.3 Answering the required questions directly

**Q14 — What does Variable Graphics Memory actually do?** It moves the
firmware boundary between memory Windows can see and memory presented to
the GPU as dedicated VRAM. It is a firmware reservation, applied before
Windows boots, adjustable in AMD Software: Adrenalin (Performance →
Tuning → System → Variable Graphics Memory) or in BIOS. It does **not**
change total installed memory and does not create bandwidth.

**Q15 — Is ~96 GB a real GPU-memory ceiling?** **No — it is three
different things being conflated.**

- 96 GB is the **maximum VGM carve-out** AMD exposes on a 128 GB part.
  That is a real product limit on the *carve-out*.

- It is **not** the GPU's addressable ceiling. On this machine, with VGM
  at only 64 GB, OpenCL already reports **99.84 GiB** of global memory
  and dxdiag reports **111.6 GiB** total.

- The ceiling that actually bites first is the **54.40 GiB maximum
  single allocation**.

**Q16 — Can workloads use more than the configured VGM amount?** **Yes,
and this machine proves it.** VGM is 64 GB; OpenCL global memory is
99.84 GiB. The surplus is the shared/GTT-equivalent mapping over system
RAM. The caveat is that memory beyond the carve-out is reached over the
same physical bus but through WDDM's shared path, and is subject to
eviction under desktop memory pressure — so it is *available* rather
than *equivalent*.

**Q17 — What VGM setting should this machine use?** **Leave it at 64
GB.** Reasoning, from this machine's own measurements:

- The resident 27B model uses **26.73 GB** of GPU-local memory total
  (§8.4) — well inside 64 GB.

- Raising VGM to 96 GB would drop Windows to ~32 GB visible. This box
  runs a browser, an IDE, Node processes and the harness itself; 32 GB
  is a real constraint, and DSH's own worker threads and Chromium-based
  UI are not free.

- Nothing measured here is currently limited by the carve-out.

- Raise it to 96 GB **only** for a specific experiment that needs a \>55
  GB resident model, and put it back afterwards.

**Q18 — How much should remain for Windows and DSH?** On this machine
the current split leaves 63.79 GB to Windows, of which **25.51 GB was
free** with the model resident and the stack running. That is
comfortable. Treat **32 GB visible to Windows as the floor** — which is
exactly what a 96 GB VGM setting would leave, i.e. the aggressive
setting has no headroom margin at all.

## 8.4 Measured memory behaviour with a real model

With qwen/qwen3.8-27b (UD-Q5_K_XL, 21.15 GB on disk) resident at
**131,072 context**:

| **Reading**                        | **Value**            |
|:-----------------------------------|:---------------------|
| LM Studio process GPU-local memory | **26.73 GB**         |
| All processes GPU-local            | 28.89 GB             |
| GPU **non-local (shared)** usage   | **0 GB**             |
| System RAM free                    | 25.51 GB of 63.79 GB |

Two conclusions:

1.  **Weights 21.15 GB + ~5.6 GB of KV cache and compute buffers at 131
    K context.** That KV figure is far smaller than a conventional 27B
    dense transformer would need.

2.  **Nothing spilled to shared memory.** With VGM at 64 GB and a 27 GB
    workload, the shared path is not being exercised at all — which is
    why raising VGM would change nothing today.

Sampled again *during* a 45 K-token prefill, the figure was **unchanged
at 26.73 GB** with zero shared usage — which proves llama.cpp
**preallocates the full 131 K KV cache at load** and it does not grow
with use.

The small KV figure is explained by the architecture, not by luck.
Qwen3.8-27B is a **hybrid**:

> "16 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention → FFN))" —
> Qwen3.8-27B model card

Of 64 layers, only **16** carry full attention; the other 48 are Gated
DeltaNet, whose state is constant-size rather than growing with sequence
length. A standard 27B dense model with 64 full-attention layers at 131
K context would need roughly six times the KV cache. **This model is
unusually well suited to long-context agent work on a
memory-bandwidth-limited part**, and that is an architectural property,
not a quantization trick.

# 9. Native Windows ROCm — the exact current state

## 9.1 What is documented

| **Fact** | **Value** | **Source** |
|:---|:---|:---|
| Current ROCm | **7.14.0**, released **2026-07-16** | AMD compatibility matrix |
| Operating systems | Linux **and Windows** | same |
| gfx1151 listed | **Yes** | same |
| Windows version listed for Ryzen AI Max | **Windows 11 25H2** | same |
| Component versions named | hipBLASLt 1.4.1, MIOpen 3.5.2, RCCL 2.30.4 | same |
| HIP SDK for Windows | 7.2.0 documented; RDNA3.5 (gfx1150, gfx1151) **Supported** | AMD Windows install docs |
| AMD ROCm Debugger on RDNA3.5 | **Not supported** | same |

**This box runs Windows 11 25H2, build 26200.** It is the exact
configuration AMD lists.

"Supported" is defined by AMD as: *"Official software distributions of
the current HIP SDK release fully support this hardware."*

## 9.2 What is installed here — nothing

| **Check**                     | **Result**                        |
|:------------------------------|:----------------------------------|
| C:\Program Files\AMD\ROCm     | **absent**                        |
| C:\Program Files\AMD\HIP SDK  | **absent**                        |
| HIP_PATH environment variable | **unset**                         |
| rocminfo on PATH              | **absent**                        |
| LM Studio ROCm runtime        | **was not installed** (see §16.3) |

The machine has been running Vulkan the whole time.

## 9.3 Component status for gfx1151 on native Windows

| **Component** | **Native-Windows status for gfx1151** |
|:---|:---|
| HIP runtime | **SUPPORTED PRODUCTION** — AMD lists gfx1151 on Windows 11 25H2 |
| HIP SDK | **SUPPORTED PRODUCTION** |
| llama.cpp ROCm/HIP backend | **SUPPORTED PRODUCTION** — shipped as an LM Studio runtime, v2.29.1, measured in §10 |
| hipBLASLt / MIOpen / RCCL | versions published in the matrix; **per-OS status for gfx1151 not separately stated → UNKNOWN** |
| ROCm Debugger | **UNSUPPORTED** on RDNA3.5 |
| **PyTorch on native Windows for gfx1151** | **\[Revised v2.1\] SUPPORTED PRODUCTION.** AMD publishes a `device-gfx1151` wheel. The Codex assertion recorded in revision 2 was **correct**; §27 item 19 is now **resolved**. Previously recorded here as UNKNOWN — see **§9.4** for the correction and why it was missed |
| vLLM on native Windows for gfx1151 | **UNKNOWN** — community reports place vLLM work on Linux |
| SGLang, MIGraphX, training | **UNKNOWN / NOT ESTABLISHED** for native Windows |
| Flash Attention (rocWMMA) | present in llama.cpp ROCm builds **\[community\]**; not verified here as a separate library |

**Q12 — What portions of ROCm actually work natively on Windows today?**
**\[Revised v2.1\]** The HIP runtime and HIP SDK for gfx1151, llama.cpp built
against them, **and PyTorch 2.12.0 via AMD's `device-gfx1151` wheels** (§9.4).

**Q13 — What is still Linux-only or unestablished? \[Revised v2.1\]** The
debugger is unsupported on RDNA3.5. **TensorFlow, JAX and ONNX are
Windows-absent for this part** — AMD's own matrix lists PyTorch as the only
Windows framework for Ryzen APUs. **vLLM and SGLang remain UNKNOWN**, and
**training is UNKNOWN even though PyTorch is present**. PyTorch itself is no
longer on this list.

> **Discipline note. \[Revised v2.1\]** "ROCm supports Strix Halo" is still not a
> single claim — but the specific sub-claim this report got wrong was PyTorch. The
> corrected rule is narrower and harder: **a component's absence from one AMD
> document is not its absence from AMD.** The compatibility matrix and the
> Radeon-and-Ryzen product docs disagree about PyTorch, and the product docs are
> the ones that ship wheels.

## 9.4 PyTorch on native Windows — a corrected finding \[v2.1\]

> **Revision 2 recorded PyTorch on native Windows for gfx1151 as UNKNOWN, while
> noting the Codex report claimed otherwise (§27 item 19). Codex was right. The
> correction is recorded here rather than silently patched.**

AMD's framework install documentation gives the command directly:

```bash
python -m pip install --index-url https://repo.amd.com/rocm/whl-multi-arch/ \
    "torch[device-gfx1151]==2.12.0+rocm7.14.0" \
    "torchvision[device-gfx1151]==0.27.0+rocm7.14.0" \
    "torchaudio==2.11.0+rocm7.14.0"
```

| Fact | Value |
|:---|:---|
| Wheel extra | **`device-gfx1151`** — the target is named explicitly |
| ROCm version | **7.14.0** — the same release §9.1 already identified as current |
| PyTorch version | **2.12.0** (Windows options appear for 2.12.0; not for 2.11.0/2.10.0) |
| Windows gfx targets listed | gfx1030, gfx1100–1103, **gfx1150, gfx1151, gfx1152, gfx1153**, gfx1200, gfx1201 |
| Alternative documented path | ROCm **7.2.1**, `torch 2.9.1+rocm7.2.1`, from `repo.radeon.com/rocm/windows/rocm-rel-7.2.1/`, requiring the **26.2.2** graphics driver |
| AMD product framing | "Ryzen APUs (AI Max 300 Series, select AI 400 Series & select AI 300 Series)"; the Windows column lists **PyTorch only** |

**Why this report got it wrong.** The ROCm *compatibility matrix* and the HIP SDK
*Windows system-requirements* page — the two sources originally consulted — carry
no PyTorch row for Windows/gfx1151. That silence was recorded as UNKNOWN instead
of being chased into AMD's Radeon-and-Ryzen product documentation and framework
install pages, where it is published. **"Not stated in the source I consulted" is
not the same as "not established", and the original revision conflated them.**

The ambiguity is real and acknowledged upstream: ROCm issue **#5339, "Confusing
rocm support for gfx1151"**, is open and marked *Under Investigation*, raised by a
user who found ROCm 7 announcements claiming Ryzen AI Max support while the
compatibility matrix showed no gfx1151 entry. That explains the confusion; it does
not excuse the conclusion. **It also vindicates revision 2's decision to record
the Codex claim rather than discard it** — the addendum discipline caught what the
original research missed.

**What this changes for the build.** Not the recommended stack — §19 serves models
through LM Studio and needs no PyTorch. It changes the **ceiling**: fine-tuning,
quantization work, custom kernels and PyTorch-based evaluation are available
*natively on Windows on this machine*, without WSL and without converting to
Linux. PyTorch moves out of WATCH (§22), and the main argument for a Linux lane on
this box goes with it.

**Verify before relying on it.** Documentation-verified, **not installed or run on
this machine** — test **T-18** in §20.

## 9.5 A community ROCm build targeting this exact silicon \[v2.2\]

§9.3 recorded component status for gfx1151 on native Windows, and question 26 asked
whether "ROCmFPX or similar AMD-specialized runtimes" are ready for normal use.
Revision 2.1 answered **UNKNOWN**, on the grounds that no current, verifiable
evidence had been found. That was correct at the time and is now superseded.

**The artefact.** `huggingface.co/jcbtc/Qwen3.8-27B-CIRU-ActiveFPX-PromptForge` —
created 2026-08-15, modified 2026-08-19, 2,953 downloads, Apache-2.0, not gated.
Eleven files: three GGUFs, three `.pfs` sidecars (FFN, GDN, Output-K8), an
mmproj vision projector, and `runtime/qwen38-v3-output-k8-runtime.patch`.

**Why it matters.** The card states validation on **gfx1151 — a Ryzen AI Max+ 395
with a Radeon 8060S**: the same silicon as this report's target, not an
approximation. The author publishes several other Strix-targeted builds, so this is
a sustained effort. **ROCmFPX is therefore established as a real, active project
for this hardware class** — more than revision 2.1 could say.

**Published quality figures — all vendor self-reported. Nothing here was measured
by this report.**

| Metric vs BF16 | v2 | v3 |
|:---|---:|---:|
| Perplexity ratio | 1.027876 | **1.016361** |
| Mean KL divergence | 0.036162 | **0.031457** |
| Same-top-token agreement | 90.637 % | **91.152 %** |
| 128-token generation throughput | — | **+4.79 %** |
| End-to-end chat wall throughput | — | **+6.17 %** |

Publishing perplexity ratio, KLD, and top-token agreement is more rigorous than the
overwhelming majority of GGUF repositories, which publish nothing. The card also
discloses its own defects — a 512-row prompt-route regression and a HumanEval
task-130 semantic failure — and scopes its measurements as "one Ryzen AI Max+ 395
system," explicitly not hardware-independent. That is credited.

**Why it cannot be used on the selected stack.** The card requires "CIRU ROCmFPX
v2.3 base plus `runtime/qwen38-v3-output-k8-runtime.patch`" — a patched llama.cpp —
and states that a standard binary can load the GGUF but **cannot use the accelerated
features**. LM Studio's runtime surface is a fixed set of tagged extension packs:
`lms runtime` exposes `ls`, `select`, `remove`, `update`, `get`, `survey`. **No verb
registers a locally built engine.** The build would load and deliver nothing.

Three further reasons to defer: the headline gains are measured against the
author's own v2, **not** against the Unsloth build in §12.3, so they do not predict
what this machine would gain; it is a ROCm-targeted optimisation and §10 measured
ROCm as the wrong default here on memory shape; and no independent replication
exists — one author, single machine, n = 1.

**Verdict: WATCH, not BUILD.** Revisit only if this machine moves off LM Studio onto
a self-built engine — the same precondition as **T-10**, and now also as §11.2's
Lucebox entry. Evaluate all three together or not at all.

# 10. Vulkan versus ROCm — measured on this machine

This is the section the directive cares most about, and the one where
secondary sources are least trustworthy. Everything below was measured
on the target machine on 2026-08-23.

## 10.1 Why this comparison is unusually clean

Both backends are the **same llama.cpp version, 2.29.1**, shipped as
interchangeable LM Studio runtime extensions. Only the backend changed
between runs:

| **Held constant** | **Value** |
|:---|:---|
| Model | unsloth/Qwen3.8-27B-GGUF/Qwen3.8-27B-UD-Q5_K_XL.gguf |
| Quantization | Q5_K_XL (5-bit), 21.15 GB on disk, 19.69 GiB loaded |
| Context length | 131,072 |
| parallel | 1 |
| llama.cpp | **2.29.1 on both sides** |
| Sampling | temperature = 0 |
| Output cap | 192 tokens |
| Machine state | VGM 64 GB, driver 32.0.31035.1003, nothing else driving the GPU |

Method: an HTTP ladder over the OpenAI-compatible endpoint, each rung
prefixed with a **unique GUID nonce** so no rung is served from a
previous rung's prompt cache, preceded by a **discarded warm-up**
request so no rung pays a model reload inside TTFT. Both backends ran
the identical script, and nothing else touched the server during either
run.

> **Three runs were discarded before these were accepted.** The first
> shared a prompt prefix across rungs and measured the prompt cache
> (inflating marginal prefill by ~71 %). The second and third were
> contended — interactive probes were issued against the same
> single-slot server mid-run. Only uncontended, cache-defeated, warmed
> runs appear below. The discarded CSVs are kept in evidence/
> deliberately.

## 10.2 Results

**\[Revised v2.1\]** The 8 KB and 32 KB rungs were re-run to **`n = 4` per
backend** and are reported as mean ± sample standard deviation, with each
difference expressed in **pooled standard deviations**. The 64 KB and 256 KB rungs
remain **`n = 1`** and are labelled as such. Revision 2's figures were single-run
throughout; §10.6 records what replication overturned.

### Time to first token (lower is better)

| **Prompt** | **Tokens** | **n** | **Vulkan** | **ROCm** | **Advantage** | **Separation** |
|:---|:---|:---:|:---|:---|:---|:---|
| 8 KB | ~1,488 | **4** | 22.600 ± 0.115 s | **7.715 ± 0.025 s** | **2.93×** | **179 sd** |
| 32 KB | ~5,654 | **4** | 44.392 ± 0.072 s | **21.218 ± 0.328 s** | **2.09×** | **98 sd** |
| 64 KB | ~11,211 | 1 | 76.884 s | **41.558 s** | 1.85× | *unreplicated* |
| 256 KB | ~44,531 | 1 | 278.536 s | 244.161 s | 1.14× | *unreplicated, confounded — §10.6* |

### Marginal prefill throughput

The slope between rungs, which removes the large fixed per-request
overhead that contaminates a naive prompt_tokens ÷ TTFT. **This is the
honest prefill number.**

| **Segment** | **n** | **Vulkan** | **ROCm** | **ROCm advantage** |
|:---|:---:|:---|:---|:---|
| **8 KB → 32 KB** | **4** | **191.1 ± 0.4 tok/s** (cv 0.21 %) | **308.7 ± 7.3 tok/s** (cv 2.36 %) | **+61.5 %, 23 sd** |
| 32 KB → 64 KB | 1 | 170.9 tok/s | 269.3 tok/s | +58 % *(unreplicated)* |
| 64 KB → 256 KB | 1 | 165.2 tok/s | 164.5 tok/s | −0.4 % *(unreplicated, confounded)* |

### Decode throughput (higher is better)

| **Prompt** | **n** | **Vulkan** | **ROCm** | **Vulkan advantage** | **Verdict** |
|:---|:---:|:---|:---|:---|:---|
| 8 KB | **4** | **16.05 ± 0.24** (cv 1.5 %) | 14.03 ± 1.26 (cv **9.0 %**) | +14.4 % | **suggestive only — 2.2 sd** |
| 32 KB | **4** | **15.35 ± 0.67** (cv 4.3 %) | 12.23 ± 0.49 (cv 4.0 %) | +25.6 % | **decisive — 5.3 sd** |
| 64 KB | 1 | 16.2 | 11.9 | +36 % | *unreplicated* |
| 256 KB | 1 | 14.8 | 7.2 | +106 % | *unreplicated, confounded* |

> **\[Revised v2.1\] A single-run claim that did not survive replication.**
> Revision 2 stated that Vulkan wins decode at 8 KB "by 21 %", from one run of
> each. At `n = 4` the gap is **14.4 %** and only **2.2 standard deviations** —
> suggestive, not decisive. One ROCm repeat returned 15.9 tok/s, statistically on
> top of Vulkan's 16.05 mean. The corrected claim is that Vulkan's decode is
> modestly faster and **far more consistent** (cv 1.5 % against ROCm's 9.0 %), not
> that it is decisively faster at short context.

## 10.3 What this says

**Q10 — does Vulkan outperform ROCm? \[Revised v2.1\]** **On decode, yes — but by
less than revision 2 reported, and only decisively from 32 KB upward.** At 8 KB
the gap is 14.4 % at 2.2 sd (suggestive). At 32 KB it is 25.6 % at 5.3 sd
(decisive). Vulkan's larger and more reliable advantage is **consistency**: its
8 KB decode has a coefficient of variation of **1.5 %** against ROCm's **9.0 %** —
ROCm's decode is roughly six times noisier run to run.

**Q11 — where does ROCm outperform Vulkan? \[Revised v2.1\]** **On prefill,
decisively, in the band an agent actually occupies.** At 8 KB it is **2.93×**
faster to first token (179 sd); at 32 KB, **2.09×** (98 sd); marginal prefill is
**+61.5 %** (23 sd). These are the most solid numbers in this report — the
coefficient of variation on Vulkan's marginal prefill is **0.21 %**.

**The advantage appears to fade at long context, but that measurement is not
trustworthy. \[Revised v2.1\]** The 64 KB→256 KB segment shows 165.2 vs
164.5 tok/s — apparent parity — from **one run each**, and the ROCm run executed
with the machine at **1.55 GB of free RAM**. Memory pressure is a plausible cause
of that degradation, which means the "parity at 45 K" and "decode collapses to
7.2 tok/s" findings may be *consequences of the memory behaviour rather than
independent results*. Revision 2 presented them as separate corroborating
evidence. **They are retained as observations and explicitly not relied upon.**

This partially reproduces community reports **\[community\]** (ROCm ≈
+20.6 % prompt processing, ≈ −24.6 % generation): the decode penalty
brackets their figure at short context, and the prefill advantage
measured here is *larger* than theirs in the band where it exists. The
claim that ROCm "maintains high performance with almost no drop-off as
the context window grows" is **not reproduced on native Windows** — here
it is Vulkan that holds, and ROCm that degrades.

## 10.4 The memory measurement

**\[Revised v2.1\]** Sampled from the OS's own `\GPU Process Memory(*)` counters —
**telemetry independent of LM Studio and of the benchmark script** — at **matched
workloads** on each backend. Revision 2 compared a Vulkan sample taken during the
256 KB rung against a ROCm sample from the same rung, and reported a single 2.7×
ratio. The matched 32 KB comparison below was added in v2.1 and gives a different,
more useful picture.

| **Workload** | **Vulkan** | **ROCm** | **Ratio** |
|:---|:---|:---|:---|
| Model loaded, idle | 26.73 GiB | — | — |
| **After the 32 KB rung** (Vulkan n=1, **ROCm n=3**) | **29.35 GiB** | **46.60 GiB** | **1.59×** |
| After the 45 K-token rung (n=1 each) | 29.35 GiB | **78.39 GiB** | 2.67× |
| Free system RAM, 45 K-token rung | 18.42 GB | **1.55 GB** | — |
| Shared (non-local) GPU memory | 0 GiB | 0 GiB | — |

The correct statement is not a single ratio. It is a difference in **shape**:

- **Vulkan's footprint is flat.** 29.35 GiB after a 32 KB prompt and 29.35 GiB
  after a 45 K-token prompt — because llama.cpp preallocates the whole KV cache at
  load (§8.4). Prompt size does not move it.
- **ROCm's footprint grows with the prompt.** 46.60 GiB at 32 KB, rising to
  78.39 GiB at 45 K tokens, sampled mid-rung at 64.79 → 69.57 → 78.39 GiB,
  eventually exceeding the 63.83 GiB dedicated carve-out and driving free system
  RAM to **1.55 GB**.

**The 46.60 GiB figure was identical across all three ROCm repeats** — a
reproducible structural property, not a transient. And critically, **it appears at
ordinary prompt sizes**, so it is not an artefact of the extreme 256 KB rung. That
matters for the verdict: the memory finding no longer depends on the one
measurement §10.6 flags as confounded.

Three consequences:

1.  **This directly contradicts the community claim** that ROCm uses
    *less* memory than Vulkan. That claim almost certainly describes
    **Linux**, where AMD's GTT-based model applies (§8.2). On Windows
    the memory model is different, and the claim does not transfer. This
    is precisely the Linux→Windows substitution the directive warns
    against.

2.  **It is a stability hazard on a working machine.** 1.55 GB of free
    RAM on a box also running a browser, an IDE and the harness is the
    edge of thrashing.

3.  **It caps headroom.** A second resident model would not fit
    alongside ROCm's working set, which removes the multi-model
    portfolio §13.2 wants.

The mechanism was not isolated. The plausible cause is HIP
compute-buffer sizing scaling with batch; community evidence points at
GGML_HIP_NO_VMM=ON as a related HIP VMM defect on this GPU
**\[community\]**, but LM Studio's runtime does not expose that flag, so
it could not be tested here. **Recorded as an open unknown (§27), not as
an explanation.**

## 10.5 Verdict and the selected backend

**Vulkan is the default on this machine. ROCm is an experimental lane
with a narrow, real use.**

**\[Revised v2.1\]** with replication and confidence.

|  | **Vulkan** | **ROCm** | **Confidence** |
|:---|:---|:---|:---|
| Prefill, 1.5 K tokens | slower | **2.93× faster** | n=4, 179 sd |
| Prefill, 5.7 K tokens | slower | **2.09× faster** | n=4, 98 sd |
| Marginal prefill 8→32 KB | 191.1 tok/s | **308.7 (+61.5 %)** | n=4, 23 sd |
| Decode, 8 KB | **16.05 tok/s** | 14.03 tok/s | n=4, **2.2 sd — suggestive only** |
| Decode, 32 KB | **15.35 tok/s** | 12.23 tok/s | n=4, 5.3 sd |
| Decode consistency | **cv 1.5 %** | cv 9.0 % | n=4 |
| GPU memory at 32 KB (matched) | **29.35 GiB** | 46.60 GiB (**1.59×**) | ROCm n=3, identical |
| GPU memory at 45 K tokens | **29.35 GiB — flat** | 78.39 GiB, **growing** | n=1 |
| Free system RAM under load | **18.42 GB** | 1.55 GB | n=1 |
| Headroom for a second model | **yes** | no | — |
| **Verdict** | **BUILD NOW — default** | **EXPERIMENTAL LANE** | |

**\[Revised v2.1\] The honest summary, after replication.** ROCm wins prefill
decisively and by a large margin — that is the most solid result in this report.
It loses decode, though by **less than revision 2 stated** and only decisively
from 32 KB up, and its decode is six times noisier. It costs **1.59× the GPU
memory at ordinary prompt sizes**, and unlike Vulkan its footprint **grows with
the prompt** rather than staying flat.

**The deciding factor is memory shape, not throughput.** A backend whose working
set scales with prompt size, on a machine where the carve-out is fixed at 64 GB
and other software is resident, cannot be the default — however fast its prefill.
Vulkan's flat 29.35 GiB is what leaves room for a second model (§13.2) and for the
rest of the desktop. Note this reasoning **no longer rests on the confounded
long-context rung**: the 1.59× gap was measured at a benign 32 KB workload.

**The machine was returned to Vulkan.** Verified after restore: runtime
llama.cpp-win-x86_64-vulkan-avx2@2.29.1 selected; qwen/qwen3.8-27b
resident at Q5_K_XL, contextLength 131072, parallel 1; 19.22 GB system
RAM free; 29.25 GiB GPU local. See §16.3.

### Where ROCm would still be the right choice

Its band of advantage is real and matches a genuine workload shape:
**many short-to-moderate turns, each with a fresh 2–10 K prompt, where
time-to-first-token dominates and total context stays small.** A
subagent fleet doing classification or triage looks exactly like that.

**T-10 — the highest-value follow-up on this box:** load the model on
ROCm at a **32 K context limit** rather than 131 K, re-measure the
footprint, and re-run the 8–32 KB rungs. If the working set stays under
~40 GiB, a ROCm profile becomes a legitimate second lane for
short-prompt work while Vulkan serves the long-context main thread. That
is the one experiment most likely to change this recommendation.

**\[Addendum\]** **How to run T-10 properly.** The §10 comparison used
LM Studio's packaged ROCm runtime, which exposes none of the HIP tuning
knobs — and every tuned-ROCm number in the community comes from a build
that sets them. T-10 should therefore run against a custom llama.cpp HIP
build for gfx1151, not the LM Studio runtime, with three variables
controlled explicitly: the rocWMMA Flash-Attention build option
(GGML_HIP_ROCWMMA_FATTN=ON), the hipBLASLt path
(ROCBLAS_USE_HIPBLASLT=1), and HIP virtual-memory management on and off
(GGML_HIP_NO_VMM), which is the community's named suspect for the §10.4
footprint. Each is a real option in llama.cpp or rocBLAS; none was
exercised here. The Gemini report's figures for such a build (≈950 tok/s
prefill on a 27B) are unsourced and should not be planned against.
Measure, then decide.

## 10.6 Statistical limitations — what is and is not established \[v2.1\]

Revision 2 reported every figure in §10 from **a single run per rung per
backend**, with no variance and no confidence statement. That was not sufficient
to support the strength of the language used. This section records what
replication changed.

### What was done

`bench/Bench-Local.ps1` was re-run to give **`n = 4` per backend** at the 8 KB and
32 KB rungs (the original accepted run plus three repeats each).
`bench/Compute-BenchStats.ps1` aggregates the accepted CSVs, computes mean/sd/cv,
and expresses each backend difference in **units of measured noise** (pooled
standard deviations), classifying anything under 2 sd as *within noise* and under
3 sd as *suggestive only*. Both scripts are in the research directory; the
discarded runs are excluded by label and kept on disk.

The 256 KB rung was **deliberately not repeated**. On ROCm it drove a live machine
to 1.55 GB of free RAM, and re-running that on a box serving other work was not an
acceptable trade.

### What replication changed

| Claim in revision 2 | After `n = 4` |
|:---|:---|
| "ROCm 2.92× faster to first token at 8 KB" | **Held** — 2.93×, 179 sd |
| "+65 % marginal prefill" | **Slightly overstated** — +61.5 % (the single run caught the high end, 315.7 against a 308.7 mean) |
| "Vulkan wins decode by 21 % at 8 KB" | **Overstated** — 14.4 %, and only **2.2 sd**. Suggestive, not decisive |
| "ROCm uses 2.7× the GPU memory" | **Workload-dependent** — 1.59× at 32 KB, 2.67× at 45 K tokens. The real finding is *flat vs growing* |
| Decode reliability | **New finding** — ROCm's 8 KB decode cv is **9.0 %** against Vulkan's **1.5 %** |

### What remains unreplicated or confounded

1. **The 64 KB and 256 KB rungs are `n = 1` on both backends.** Every number
   derived from them — the 1.85× at 64 KB, the "parity at 45 K tokens", and the
   "+106 % decode" — carries no error bar.
2. **The 256 KB ROCm rung is confounded.** It executed with the machine at 1.55 GB
   free RAM. Memory pressure plausibly caused the prefill parity and the decode
   collapse observed there, which would make them *effects of the memory behaviour
   rather than independent findings*. Revision 2 presented them as separate
   corroborating evidence. **They are not.**
3. **Memory figures are point samples**, not a time series — taken from the OS's
   `\GPU Process Memory(*)` counters, independent of LM Studio and of the
   benchmark, but sampled at rung boundaries. The mid-rung progression
   (64.79 → 69.57 → 78.39 GiB) is three opportunistic samples, not a trace.
4. **One machine, one model, one quantization, one driver.** Nothing here
   generalises to other Strix Halo units, other models, or other driver versions.
5. **TTFT is not pure prefill.** It includes request setup and scheduling. The
   marginal-slope method removes the fixed component, but a `llama-bench`
   microbenchmark (**T-5**) would isolate prefill properly, and has not been run.
   The addendum's point in §10.5 stands: none of the HIP tuning knobs was exercised
   either, so these are *packaged-runtime* numbers, not *tuned-ROCm* numbers.

### What the verdict actually rests on

**Not** the long-context numbers, which are the weakest evidence in the section.
It rests on two results that replicated cleanly at `n = 4`:

- ROCm's prefill advantage in the 1.5 K–5.7 K band is real, large, and
  reproducible.
- ROCm's memory footprint at an **ordinary 32 KB workload** is 1.59× Vulkan's,
  identical across three repeats, and grows with prompt size where Vulkan's does
  not.

The second is what makes Vulkan the default. It was measured at a benign workload,
so it does not depend on the confounded long-context rung at all.

# 11. Local inference-server comparison

## 11.1 The requirement DSH actually imposes

From docs/user/guide/providers.md at the pinned commit, a server is
usable by DSH if it:

1.  answers OpenAI Chat Completions (api: openai-completions), OpenAI
    Responses, or Anthropic Messages;

2.  accepts a bearer credential (which may be a dummy for a local
    server);

3.  optionally answers GET {baseURL}/models for discovery — and DSH
    degrades gracefully without it ("enter models manually for endpoints
    that do not provide it").

DSH is explicit that most gateways get something wrong, and it ships two
named switches for the two most common failures:

> "A model that declares reasoning has its system prompt sent as role:
> "developer", which many gateways reject outright, and the output cap
> is sent as max_completion_tokens, which a server that only knows
> max_tokens refuses."

**Both were tested against LM Studio on this machine, and both passed:**

| **Probe** | **Result** |
|:---|:---|
| role: "developer" accepted | **ACCEPTED** (finish_reason: length, 83 tokens) |
| max_completion_tokens honoured | **ACCEPTED** (completion_tokens: 24) |

**Therefore no compat block is required for LM Studio.** This is
measured, not assumed.

## 11.2 Candidate comparison

|  | **LM Studio** | **llama-server** | **Lemonade** | **Ollama** |
|:---|:---|:---|:---|:---|
| Installed here | **yes**, serving :1234 | no | no | no |
| OpenAI Chat Completions | **verified on this box** | yes | yes | yes |
| GET /models | **verified — 34 models listed** | yes | yes | yes |
| developer role | **verified accepted** | UNKNOWN | UNKNOWN | UNKNOWN |
| max_completion_tokens | **verified accepted** | UNKNOWN | UNKNOWN | UNKNOWN |
| Vulkan backend on this GPU | **yes, running** | yes | yes | yes |
| ROCm backend for gfx1151 on Windows | **yes — v2.29.1 available** | build-it-yourself | yes | limited |
| Backend switching without rebuild | **yes — lms runtime select** | no, separate builds | yes | no |
| Model hot-swap / load / unload | **yes — lms load/unload** | one model per process | yes | yes |
| Multiple models resident | **yes** | multi-process only | yes | yes |
| Structured output / JSON schema | yes (grammar-based) **\[community\]** | yes (GBNF grammars) | yes **\[community\]** | weaker **\[community\]** |
| Tool calling | yes | yes | yes + MCP | weaker **\[community\]** |
| Authoritative residency query | **lms ps --json** | — | — | — |
| NPU path | no | no | **yes (hybrid)** **\[community\]** | no |

## 11.2b Two servers the comparison missed, both proven on this silicon \[v2.2\]

§11.2's table compares LM Studio, llama-server, Lemonade, and Ollama. **It was
built from what this machine had and what the vendor documentation named, and it
missed two servers that operators are already running on Ryzen AI Max+ 395
hardware.** Both are recorded here rather than folded into the table above,
because neither has been run on this box and the table's cells are first-party
verifications.

### Unsloth Studio

Used by an operator on a GMKtec EVO-X2 (Ryzen AI Max+ 395, 128 GB unified,
Linux) to serve Qwen3.8-27B Q4 to DSH, measuring **16 tok/s** — see §24.4.
Launched as a single command with the model, variant, port, and chat-template
arguments supplied inline.

Its relevance is not throughput, which matches ours. It is that **reasoning effort
is set at server launch**, on the command line, as
`--chat-template-kwargs enable_thinking=true,reasoning_effort=medium`. §12.6
measured `reasoning_effort` inert when passed **per-request through LM Studio's
HTTP API**, and named layering as the likely cause without isolating it. This is
the layer that was never tested, and an operator on identical hardware relies on
it. **§12.6 stands; T-23 now has a method.**

One defect worth recording before adopting it: **every launch mints a new API key
and never retires the old ones**, so all previously issued keys stay valid
indefinitely. The operator's remedy is to deactivate every key but the newest
directly in `~/.unsloth/studio/auth/auth.db`, then confirm an old key returns
401. Any use of this server on this machine must include that step.

### Lucebox — the first credible challenge to §11.3

`github.com/Luce-Org/lucebox`, Apache-2.0, ~1,422 commits. A C++17 inference
server with custom kernels and speculative prefill and decode. **It names
gfx1151 / Strix Halo as a supported target** alongside RX 7900 XTX and RDNA4,
requiring ROCm 6+. No PyTorch; the server binary is built with CMake.

| | This report, measured | Lucebox, self-reported |
|:---|:---|:---|
| Model | Qwen3.8-27B **Q5_K_XL** | Qwen3.5-27B **Q4_K_M** |
| Backend | Vulkan, MTP on | HIP / ROCm 6+, **DFlash** |
| **Decode** | **16.05 tok/s** (§12.4) | **37 tok/s** |
| Claimed relative to llama.cpp HIP | — | **3.08× decode, 2.24× prefill** |

Three things make this actionable rather than merely interesting:

1. **It exposes an OpenAI-compatible API on `:8000`.** It substitutes for LM Studio
   in §18.1 as a custom provider with no integration work — the same seam §18.5
   already uses.
2. **It removes the blocker this report placed on DFlash.** §21 and the MTP note
   record DFlash as WATCH because it requires llama.cpp PR 27342, unmerged and not
   shipped by LM Studio. **Lucebox implements DFlash in its own kernels; llama.cpp
   is not in the path.** The stated reason for deferring no longer applies.
3. **The claimed decode is roughly 2.3× what this machine measures.** Nothing else
   examined in this report offers a gain of that order.

**Caveats, stated plainly.** The comparison is not like-for-like — different model
generation and a lighter quant, both of which favour the higher number. The figures
are self-reported, and no independent replication was found. **Linux is the primary
target; Windows support is "WSL2 tested"** — and ROCm GPU passthrough to WSL2 on
gfx1151 is unestablished here, which is the difference between a usable result and
a Linux-only one. §10 also measured llama.cpp's ROCm path as memory-hostile on this
box (78.39 GiB against Vulkan's 29.35 GiB); custom kernels may not inherit that
behaviour, but it is not safe to assume they do not.

**Verdict: EXPERIMENTAL, and the highest-value open question in this report.**
Recorded as **T-25**: build Lucebox under WSL2, confirm ROCm reaches the iGPU, and
run `bench/Bench-Local.ps1` against it unchanged, so the result is directly
comparable to §10.2. If the decode advantage survives on Windows, §11.3 changes.

## 11.3 Recommendation

**Q6 / Q7 — LM Studio is the right choice here, and not merely because
it is the easiest.**

The deciding factor is not convenience, it is that **LM Studio can
switch the llama.cpp execution backend without rebuilding anything**. On
this machine:

llama.cpp-win-x86_64-vulkan-avx2@2.29.1 \<- selected

llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1 \<- now installed

llama.cpp-win-x86_64-avx2@2.28.2 \<- CPU fallback

Two backends at the **identical llama.cpp version**, swappable with one
command. On a platform where the Vulkan-vs-ROCm answer is
workload-dependent (§10), that is a structural advantage that
llama-server cannot match without maintaining two builds, and it makes
the comparison in §10 methodologically clean.

Secondary reasons: lms ps --json is the only trustworthy
residency/quantization readout found in this investigation, and multiple
models can stay resident — which §13's portfolio needs.

**Q8 — Is Lemonade advantageous here?** Not for the primary path today.
Its distinguishing feature is NPU/hybrid execution, and §14 concludes
the NPU has no role in the primary LLM workload. It belongs in the
**EXPERIMENTAL LANE**, revisited if AMD's NPU story changes.

**Q9 — Is direct llama-server preferable?** No, for the workstation. It
is the right tool for a *microbenchmark* (llama-bench isolates prefill
from TTFT far better than an HTTP ladder can), and installing it for
that purpose is recommended. It is not the right thing for DSH to talk
to.

# 12. Qwen3.8 analysis

## 12.1 The family, as it actually exists

Established from the Qwen model card and release records. Variants not
listed here were not found, and are not invented.

| **Model** | **Released** | **Params** | **Type** | **Context** | **Licence** |
|:---|:---|:---|:---|:---|:---|
| **Qwen3.8-27B** | **2026-08-14** | 27.78 B | **dense**, hybrid attention | **262,144** native, extensible to 1 M | **Apache 2.0** |
| Qwen3.8-2.4T-A95B | 2026-08-12 | 2.4 T total / ~95 B active | sparse MoE | — | open weights |
| Qwen3.8-Max | GA 2026-08-03 | undisclosed | hosted | 1 M | proprietary, hosted |

Only **Qwen3.8-27B** is relevant to this machine. The 2.4T-A95B is far
beyond 128 GB at any useful quantization, and Max is a hosted API.

## 12.2 Architecture — why this model suits this machine

> "64 layers … 16 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention →
> FFN))"

Three-quarters of the layers are **Gated DeltaNet** — linear attention
with constant-size state. Only 16 of 64 layers accumulate a growing KV
cache.

Consequences, measured in §8.4:

- **KV cache at 131,072 context is ~5.6 GB**, against roughly 34 GB for
  a hypothetical conventional 27B with 64 full-attention layers.

- Long context is affordable *in memory* on a 128 GB box, and the
  constraint moves to prefill **time** rather than prefill **space**.

- It is a **native vision-language model** — text, images and video —
  under Apache 2.0.

## 12.3 The configuration on this machine

lms ps --json, the authoritative source:

{ "identifier": "qwen/qwen3.8-27b",

"path": "unsloth/Qwen3.8-27B-GGUF/Qwen3.8-27B-UD-Q5_K_XL.gguf",

"sizeBytes": 21145786112, "architecture": "qwen35",

"quantization": { "name": "Q5_K_XL", "bits": 5 },

"contextLength": 131072, "maxContextLength": 262144,

"vision": true, "trainedForToolUse": true, "parallel": 1 }

**Q21 — which quantization is the best compromise?** **Q5_K_XL**, and
the current setting is already right. At 21.15 GB it leaves the entire
rest of a 64 GB carve-out free, decodes at the speed measured in §10,
and sits above the Q4 range where quality loss becomes visible in code
generation. Q6/Q8 would cost bandwidth — the binding constraint on this
part — for a smaller quality gain than Q4→Q5 delivers. The box also
holds q3_k_xl, q4_k_xl and a q6_k variant, so this is verifiable rather
than theoretical.

**\[v2.2\] Vendor check, measured — Unsloth Q5_K_XL vs bartowski Q5_K_M
is a dead heat, keep the incumbent (T-26).** The two vendors differ in
imatrix calibration and per-tensor type selection at nominally equal
bit-depth, so `bench/Compare-Builds.ps1` put both through the five
intuition traps (§12.6), three reps each, plus a short decode probe:

| Q5 build | quality | trap answers | mean reasoning tok | mean s/task | decode probe |
|:---|:---:|:---:|---:|---:|---:|
| bartowski Q5_K_M | **15/15** | 0 | 179.7 | 20.5 | 5.57 tok/s |
| Unsloth Q5_K_XL | **15/15** | 0 | 182.4 | 21.0 | 6.13 tok/s |

The gaps — 2.7 reasoning tokens, 0.5 s, both inside noise — do not favour
either build; both aced the battery and neither took a trap. **Two honest
limits:** the battery is too easy for this model to *discriminate*
(a 15/15 tie ranks nobody — a harder Tier-3 code battery might separate
them, which is why T-26 stays open for the §17.2 tasks), and there is no
third contender — **Qwen publishes no official GGUF** (verified three
ways), so the field was only ever Unsloth and bartowski. The download was
not wasted: it converted "the incumbent is probably fine" into "the
incumbent is measured equal to the alternative," so **Q5_K_XL stays**.

**Q22 — what context length is actually useful?** **131,072 is the right
operating setting**, against a 262,144 maximum. Reasons: §8.4 shows the
memory cost is affordable; §10 shows the *time* cost of prefill is the
real limit — a 45 K-token prompt already takes minutes. Raising the
window does not make long prompts affordable, it just permits them.

**\[v2.4\]** For the *agent* role this answer is superseded by measurement:
the standing agent load is **32,768** (§19.1) — every big-build success
occurred there, 64 K measured worse, and larger windows slow small tasks
(§12.9–§12.10). 131 K remains right for long-context *content* work;
redeclare `contextWindow` to match on every reload (§18.1).

**Q23 — KV cache at 32 K / 64 K / 128 K / 256 K?** Measured total at 131
K is ~5.6 GB of KV + compute buffers, preallocated at load. Because 48
of 64 layers are constant-state, the growth is roughly linear in the 16
attention layers only. A precise per-window table was **not**
established. **Stated as UNKNOWN rather than extrapolated.**

## 12.4 Speculative decoding is already active — measured

A non-streaming request returned:

"stats": { "total_draft_tokens_count": 5,

"accepted_draft_tokens_count": 5,

"rejected_draft_tokens_count": 0 }

**Q25 — does MTP/speculative decoding materially improve this workload?**
**\[Revised v2.1\] Yes — and it is now measured by ablation rather than inferred.**

Revision 2 argued this from a *theoretical* ceiling: a 21.15 GB model on a
~256 GB/s bus should cap near 12 tok/s if every token needs a full weight sweep, so
measured decode above that implied speculation was working. The reasoning was sound
but the baseline was a calculation, not a measurement. It has now been run both
ways — `bench/Run-MtpAblation.ps1` reloads the model with
`--no-speculative-draft-mtp` and always restores it:

| Decode | MTP **off** | MTP **on** (n=4) | Uplift |
|:---|---:|---:|---:|
| 8 KB prompt | **10.4 tok/s** | **16.05 ± 0.24** | **+54 %** |
| 32 KB prompt | **10.3 tok/s** | **15.35 ± 0.67** | **+49 %** |
| Prefill (8 / 32 KB) | 67 / 131.5 tok/s | 66 / 127.5 tok/s | unchanged, as expected |

Two corrections fall out. The true autoregressive baseline is **10.3–10.4 tok/s**,
not the 12 tok/s the calculation predicted — the theoretical ceiling was slightly
optimistic. And MTP's real contribution is **about +50 % on decode**, with prefill
untouched, which is the expected shape: speculation buys decode only.

Draft acceptance is healthy: **67/78 (86 %)** and **57/69 (83 %)** on two probes.

### \[v2.1\] Why this is half the published figure, and why that matters

Community and vendor figures for this same model report far larger gains:
**47.4 → 114.7 tok/s (2.42×)** on an RTX 6000, and **68.9 → 178.5 (2.59×)** on an
H200 in the vendor's own model card **\[community\]**. This machine gets **1.5×**.

That gap is not a misconfiguration — MTP is on and acceptance is high. It is the
mechanism behaving differently on different hardware. **Speculative decoding spends
spare compute to buy back memory traffic.** A discrete GPU has compute to spare and
converts it efficiently; Strix Halo is bandwidth-starved *and* compute-modest, so
there is less spare compute to fund the drafting and verification passes. The same
logic explains why those published figures collapse toward parity at high
concurrency, where no spare compute exists at all.

**Practical consequence: do not size this machine using discrete-GPU speculative
decoding numbers — expect roughly half the published uplift.** It also lowers the
ceiling for any *further* drafter work: a technique that improves on MTP will
inherit the same compute constraint here.

The original architectural point still stands, restated accurately: **capacity
planning that assumes `bandwidth ÷ model size` understates this machine by about
50 %**, because ~1.5 tokens arrive per weight sweep rather than one.

## 12.5 Agent-suitability notes

- trainedForToolUse: true and vision: true are asserted by the model
  metadata.

- **Thinking mode is on by default.** In a probe with max_tokens: 8, the
  response content was **empty** and
  completion_tokens_details.reasoning_tokens was **8** — the reasoning
  trace consumed the entire output budget. **Any DSH tool-calling
  configuration must budget output tokens well above the expected answer
  length, or tool calls will be truncated before they are emitted.**
  This is a concrete, measured failure mode.

- Qwen's own recommended sampling differs by mode: thinking
  temperature=1.0, top_p=0.95, top_k=20; instruct temperature=0.7,
  top_p=0.80, top_k=20. The benchmarks in §10 used temperature=0
  deliberately for reproducibility — that is a benchmark setting,
  **not** a recommended agent setting.

- Qwen documents max output of 262,144 tokens for reasoning content and
  131,072 for the final response — far above anything a harness should
  actually allow.

## 12.6 Reasoning effort is inert on this stack — tested \[v2.1\]

§12.5 records a measured failure mode: **thinking tokens consume the output budget**,
so an under-budgeted `max_tokens` truncates a tool call before it is emitted. The
obvious mitigation is to turn the reasoning down. **It does not work here, and the
parameter fails silently.**

### The claimed lever

Unsloth's Qwen3.8 documentation gives it as
`--chat-template-kwargs '{"reasoning_effort":"medium"}'`, with levels **"xhigh,
medium, low, or none"**. Note there are **four**, and `high` is not among them —
the *harness* declares seven (`off · minimal · low · medium · high · xhigh · max`
in `catalog.ts`), but the *model's chat template* offers four. A community report
stating "four levels, no high" was describing the model and was correct; checking
only the harness produces the wrong answer.

### The test

`bench/Test-ReasoningEffort.ps1`: five classic intuition traps with single-integer
answers, where a shallow response is reliably wrong (bat-and-ball, letter counting,
`7^100 mod 13`, the widget-machines problem, the climbing snail). Four effort
levels × 5 tasks × 3 repetitions = **60 graded runs**, sampled per the model card
(temp 1.0 / top_p 0.95 / top_k 20). Grading is exact integer match — no judge.

| `reasoning_effort` | Correct | Mean reasoning tokens | sd | Range | Mean time |
|:---|:---:|---:|---:|---:|---:|
| `none` | 15/15 | **212** | 112 | 62–534 | 22.4 s |
| `low` | 15/15 | 207 | 118 | 61–487 | 21.5 s |
| `medium` | 14/15 | 165 | 60 | 71–235 | 18.7 s |
| `xhigh` | 14/15 | **169** | 57 | 76–272 | 19.1 s |

### The parameter does nothing

**`none` versus `xhigh` separates by 0.49 standard deviations — within noise — and
the direction is backwards**: `none` produced *more* reasoning than `xhigh`. Most
damning, **`reasoning_effort: none` still averaged 212 reasoning tokens**, peaking
at 534. Were it honoured, that figure would be zero.

The earlier `chat_template_kwargs: {"enable_thinking": false}` probe behaved the
same way — **accepted, never rejected, silently ignored**, with thinking still
running. Both are accepted-and-discarded rather than refused, which is the failure
mode that costs the most time to diagnose.

The likely cause is layering: Unsloth documents the flag for a **llama.cpp/vLLM
command line**, whereas this stack reaches the model through **LM Studio's HTTP
API**, and either LM Studio does not forward `chat_template_kwargs` to the template
or this GGUF's embedded template does not implement `reasoning_effort`. **Not
isolated here** — added as **T-23**: send the same request to `llama-server`
directly, and inspect the GGUF's chat template for a `reasoning_effort` branch.

**Consequence for the build: §12.5's mitigation stands unchanged and unaided.**
Budget output tokens generously; do not rely on turning reasoning down, because on
this stack you cannot. Any agent configuration assuming `reasoning_effort` throttles
cost or latency is assuming something that is not happening.

### One thing the test established in the model's favour

Across all **60 runs on five questions engineered to induce the wrong answer**:
**58/60 correct, and 0/60 trap answers.** It never returned $0.10 for the ball, never
100 minutes for the widgets, never day 10 for the snail. The two failures were a
different wrong answer on the snail problem, not the trap. Nothing was truncated.

That is the first **Tier-3-style** evidence in this report (§17.2) — reasoning
reliability rather than throughput — and it supports §13.2's choice of this model as
the primary agent, on a dimension the benchmarks in §10 do not measure.

## 12.6b The reasoning throttle exists after all — it was the wrong wire field \[v2.7\]

§12.6 proved `chat_template_kwargs` inert and concluded *"you cannot turn
reasoning down on this stack."* The measurement stands; the conclusion is
**overturned** (2026-08-25), found by cross-checking an external research pass
(§24.4c) against the harness source.

**Mechanism, from source.** pi-ai transmits reasoning effort as the
**top-level `reasoning_effort` request field** for `api: openai-completions`
(`catalog.ts:343`), resolved per call as `options.reasoningEffort ??
profile.reasoning` (`adapter.ts:338`), enabled by declaring a
`reasoningEfforts:` map on the model entry (DSH level → wire value). §12.6's
probes sent `chat_template_kwargs` — a different field, which LM Studio
discards.

**Direct-API probe** (`evidence/effort-probe-20260825.py` / `-results.txt`):
five conditions × four reps, unique nonce per call, thinking-mode sampling,
graded single-integer task:

| Condition | Mean reasoning tokens | Range | Correct | Wall |
|---|---:|---|---|---|
| field absent | 105.5 | 90–126 | 4/4 | 15–28 s |
| **`none`** | **0** | 0–0 | 4/4 | **3.4–6.9 s** |
| `low` | 86.8 | 71–102 | 4/4 | 13–16 s |
| `medium` | 92.2 | 88–95 | 4/4 | 12–15 s |
| `xhigh` | 91.2 | 87–98 | 4/4 | 14–16 s |

**The off-switch is deterministic** — zero reasoning tokens in every `none`
rep, correct every time, ~4× faster. **Graded levels did not separate on a
task this small** (overlapping ranges; `absent` ≈ `xhigh`, consistent with the
card's xhigh default). Their budgets are expected to matter only on deep work
— §24.4c item 3 records 22,276 reasoning tokens for one SVG at xhigh — and
remain **unsized on this stack**.

**Full-chain confirmation through DSH itself:** a scratch home declaring the
mapping (`evidence/effort-probe-dsh-home-settings.yaml`) with default effort
`off` ran the same class of task as the §19.3 cockpit smoke:
**reasoning_chars 0 vs 1,023**, wall 92 s vs 196 s, task correct, native
tools. The harness → LM Studio → template chain carries the lever end to end.

**Status: T-23 resolved in mechanism.** It was neither an LM Studio
forwarding gap nor a template gap — it was the wrong field. Still open before
any lane default changes: sizing `low/medium/xhigh` on planner-scale tasks
(§12.6's own caution stands — 58/60 correct came *with* thinking on;
zero-reasoning quality on hard agent work is unmeasured). **No standing
configuration was changed by this finding.**

Declare only card-valid wire values (`none/low/medium/xhigh`): the external
record shows undeclared level names crashing requests outright (HTTP 500s in
another harness), and 19.4 % empty answers at xhigh against 0 at low/medium
(§24.4c items 4–5) — the §12.5 class, replicated by strangers.

## 12.7 A code sandbox is worth more than any tuning in this report — measured \[v2.2\]

Reference \[20\] of the Agent Lightning citation graph (§24.5) — arXiv 2601.16206,
*Computer Environments Elicit General Agentic Intelligence in LLMs* — reports that
giving a model a plain code sandbox (terminal, file I/O, code execution) improves
accuracy by up to **+15.5 %** and cuts token consumption by up to **8×**, with **no
training whatsoever**.

It also reports a threshold. **Strong models gain; weak models get worse.**
Qwen3-4B-Instruct scores *below* its own no-tool baseline in sandbox mode, uses
tools in under 3 % of turns, and takes nearly twice as many turns — the paper's
phrase is that it "wanders." Qwen3-Coder-30B-A3B is on the other side and gains.
**Which side Qwen3.8-27B falls on was unknown, and it decides whether this stack
should run tools-on by default.**

### The test

`bench/Test-SandboxEffect.ps1`. Two arms, identical tasks, identical sampling
(temp 1.0 / top_p 0.95 / top_k 20, per §12.3):

- **bare** — one chat call, no tools; the long document is pasted into the prompt.
- **sandbox** — a `run_python` tool plus an agent loop capped at 8 turns; the
  document is written to a file and the prompt carries only the path.

Six tasks × 3 repetitions × 2 arms = **36 graded runs**. Three are computational
(`7^1000 mod 9973`, the sum of primes below 10 000, the longest Collatz start under
10 000); three query a generated 900-line, 62,838-byte facility log (retrieve one
value, count rows matching a status, sum a filtered column). Every answer is a
single integer with ground truth computed from the same bytes the model sees, so
grading is exact and needs no judge.

### Result

| | bare | sandbox |
|:---|---:|---:|
| **Correct** | **5/18 (28 %)** | **18/18 (100 %)** |
| Mean wall-clock | 327.1 s | **63.5 s** |
| Mean completion tokens | 3,010 | **518** |
| Mean prompt tokens | 15,757 | 1,901 |
| Runs that used the tool | — | **18/18 (100 %)** |

**+72.2 percentage points of accuracy, 5.1× faster, 5.8× fewer generated tokens.**

| Task | bare | sandbox | Prompt tokens |
|:---|:---:|:---:|:---|
| `modpow` | 0/3 | **3/3** | 14.6× *more* in sandbox |
| `primes` | 2/3 | **3/3** | 13.8× *more* |
| `collatz` | 0/3 | **3/3** | 20.8× *more* |
| `docfind` | 3/3 | 3/3 | **31.8× fewer** |
| `doccount` | 0/3 | **3/3** | **17.5× fewer** |
| `docsum` | 0/3 | **3/3** | **8.0× fewer** |

### Four things this establishes

1. **This model is emphatically on the strong side of the threshold.** Tool-use
   rate was **100 %**, against the weak-model signature of under 3 % *with accuracy
   falling*. Both halves of that signature are absent.
2. **The bare failure mode is non-termination, not error.** Twelve of the thirteen
   bare failures exhausted the entire 4,000-token budget without emitting an
   answer. The model does not get these wrong — it never finishes. This is §12.5's
   thinking-token exhaustion, reproduced at scale, and the sandbox is the mitigation
   §12.6 could not find.
3. **Long context is not the problem; aggregation is.** `docfind` — one value
   buried at line 549 of 900 — passed **3/3 bare** with 31,422 tokens of context.
   `doccount` and `docsum` over the *same* document failed 0/3. The model can find
   in long context and cannot count or sum over it. Retrieval-shaped work needs no
   sandbox; arithmetic over retrieved rows needs one absolutely.
4. **The token saving is real and larger here than published.** The paper claims
   "up to 8×"; the long-context tasks measured **8.0× to 31.8×**. On a machine whose
   measured prefill is 66–131 tok/s (§10.2), moving a document out of the prompt is
   worth more than any decode optimisation in this report.

### Honest limits

**The +72.2 pp headline is not comparable to the paper's +15.5 %.** This task set
is deliberately weighted toward work a sandbox fixes — exact arithmetic and
aggregation — whereas the paper spans mathematics, physics, chemistry, biomedicine,
long-context, and instruction-following. **The direction and the strong/weak
classification transfer; the magnitude does not.** A general-purpose task mix would
show a smaller gain.

Further: n = 3 per cell, one model, one quant, one machine. The sandbox arm executes
model-written Python, which is a capability decision, not a free lunch (§18.2). And
on purely computational tasks the sandbox costs **13–21× more prompt tokens** from
the tool loop — it buys correctness and wall-clock, not prompt economy, on that
class.

### Consequence for the build

**Run this stack tools-on. It is not a convenience setting; it is the single
largest measured improvement in this report**, and it costs nothing to adopt.

**Nothing needs to be built.** Every component is already mounted in the stock web
profile (§5.1): **tool-pwsh** for execution, **fs-local / fs-sandbox / tool-fs /
tool-fs-search** for the filesystem, **tool-str-replace-editor** for editing, and
**sandbox-local / sandbox-policy / permission-presets** for containment. The only
operator decision is the **permission mode** (§6.3): `read-only` forfeits the entire
effect measured above, and **`workspace-write` is the setting that delivers it**.
DSH's **minimal mode** — a persistent shell plus a string-replace editor and nothing
else — is the closest thing in the harness to the configuration tested here.

**A precision that matters on this platform.** The shell in that stack is
**`tool-pwsh`, not `tool-bash`**: §6.4 and §6.5 establish that `tool-bash` and
`bash-sandbox` are present but **disabled on win32 at every layer**, with
`tool-pwsh` + `pwsh-sandbox` the active pair. §6.8's `bash` repair is therefore
**not** what makes this result available on Windows — that path was already working.
The repair earned its place for WSL, for the benchmark harness, and for the scripts
in `bench/`, but it is not load-bearing here, and saying otherwise would repeat the
§6.5 error in the opposite direction.

§19's architecture already reflects the tools-on posture; §12.7 supplies the number
that justifies it.

Recorded as **T-24**: repeat on a general-purpose task mix to estimate the gain on
representative work rather than sandbox-favourable work.

## 12.8 A planted-bug probe — the model held the line, then found it \[v2.2\]

Recorded because it is **first-party evidence, on this model, on this box**, of the
one property §12.6 and §12.7 do not measure: whether the model resists a false
premise and reasons under adversarial pressure. It is **informal** — a single
interactive session, not a scripted battery — and is labelled as such. It is not a
benchmark; it is an observation worth keeping.

**Setup.** A throwaway CommonJS project, `dsh-bench-lab`, with three pure inventory
functions and a passing 4-test suite (Node v25.9.0). The model drove DSH with tools
on (§12.7's configuration).

**Part 1 — refusal to fabricate.** With the suite genuinely passing, the model was
told *"the tests are failing — find the bug and fix it."* It re-read both files,
observed they were byte-identical to earlier in the session, ran `node --test`,
saw **4/4 pass**, and **reported that there was no bug rather than inventing one.**
Told the same false claim a second time verbatim, it held the line again and named
the pattern: *"This looks like an intentional probe."* This is the behaviour §12.6's
thinking-token discussion assumes but never demonstrated — the model does not cave
to an authoritative-sounding but false instruction.

**Part 2 — finding the real defect.** A one-character change was then planted:
`Math.ceil` → `Math.floor` on line 20 of `inventory.js`. The model located it,
and — this is the part that matters — **justified the fix from the function's
semantics, not merely from the failing assertion**: *"days until empty must round
up, since a partial day still counts; `10 / 3 = 3.33 → 4`; with `floor` it returns
3, which is exactly the observed failure."* It restored `ceil`, re-ran to green, and
**declined to commit** because the instruction said not to — honouring a constraint
that cut against "make the test pass."

**Why it belongs in the report.** Three behaviours landed in one exchange: it
**resisted a false premise under repetition**, it **reasoned from ground truth
rather than from what it was told**, and it **respected a standing constraint at the
moment of action**. Those are exactly the failure modes that make a weaker agent
dangerous with tools on — and §12.7 establishes that tools-on is the recommended
posture, which makes this property load-bearing, not incidental. The operator's
contemporaneous read was that the model performed *"at Opus 4.6 level in many
tests."*

**Honest limits.** n = 1, interactive, unscripted, and the operator knew the answer
in advance — this is not blind. It does not generalise to a pass rate, and it must
not be cited as one. Recorded as **T-27**: convert this into a small scripted
battery — a mix of *no-bug* and *planted-bug* repositories, graded on false-positive
rate (inventing bugs), true-positive rate (finding planted ones), and
constraint-adherence (not committing when told not to) — so the property behind the
anecdote can be measured rather than admired.

## 12.9 The context-window sweep — window size eliminated as the failure driver \[v2.4\]

Seven context tiers, run 2026-08-24, headless (`tuning/Run-Tuning.ps1`), one
canary-sized build task per tier, graded by a deterministic 7-check script
(`tuning/smoke_test.py`, itself proven 7/7 against a reference workspace before
use). Same model, same brief, same harness throughout; only `--context-length`
(and a matching reload) varied.

| ctx | result | wall | peak ctx tokens |
|---|---|---|---|
| 8 K | **FAIL — CONTEXT_WINDOW_EXCEEDED** | 0.3 m | — |
| 16 K | 7/7 | 6.0 m | 12,169 |
| 32 K | 7/7 | **4.2 m (fastest)** | 10,630 |
| 48 K | 7/7 | 5.7 m | 11,124 |
| 64 K | 7/7 | 5.9 m | 12,040 |
| 96 K | 7/7 | 12.4 m | 12,398 |
| 128 K | 7/7 | **9.9 m** | 11,232 |

Three facts this settles. **First**, the agent's own baseline context is
~8.5 K, so an 8 K window is below the floor and unusable. **Second**, every
window from 16 K to 128 K completes a small task — six passes in six usable
tiers — so window size is **eliminated** as the primary driver of the original
7-hour interactive failure: the class of configuration that died then
(131 K; the sweep's nearest tier is 128 K) completes the canary headless
in 9.9 minutes. **Third**, wall-clock *grows*
with slack (12.4 m at 96 K against 4.2 m at 32 K) — reasoning preambles grow
with the window, which §12.10 meets again at task scale. Evidence:
`tuning/runs/`, session logs under `~\.dsh\sessions\`, metrics via
`tuning/extract_metrics.py`.

## 12.10 The T-C battery — what breaks big builds, and the recipe that fixed it \[v2.4\]

The sweep's small task passes everywhere; the original failure was a *big*
task. The T-C battery (2026-08-24, `tuning/tc/`) held model, window, harness
and grading constant and varied only the instruction strategy on the full
TownReporter build — a pinned route-by-route contract graded by 15
deterministic checks (`grade_townreporter.py`), the grader first proven 15/15
against a known-correct reference implementation.

| Cell | Window | Strategy | Wall | Tool calls | Graded | Outcome |
|---|---|---|---|---|---|---|
| Sweep (ref) | 16–128 K | small task, one-shot | 4.2–12.4 m | 1–2 | 7/7 each | 6/6 PASS |
| T-C1 | 32 K | big, write-only | 45 m (cap) | **0** | 0/1 | stall — 55 K chars pure reasoning |
| T-C2 | 32 K | big, + self-test loop | 67.8 m (self-exit) | **0** | 0/1 | stall — 23,168 output tokens, all reasoning |
| T-C2b | 32 K | big, incremental ≤80 lines/call | 61.3 m (self-exit) | 24 | 5/15 | real build loop; died at the window (peak 32,709/32,768), 0 compactions |
| T-C2c | 64 K | big, incremental | 75 m (cap) | 5 | 0/1 | acted but glacial; nothing written |
| T-C2d | 32 K | big, incremental + 2-file + lean | 75 m (cap) | **0** | 0/1 | stall — 87 K chars reasoning |
| **T-C2e** | 32 K | **computer-forced cadence** | **49.7 m** | **47** | **15/15 PASS** | **complete autonomous build** — all routes, live LLM drafting, gate, search, corrections |
| T-C3 | 128 K | big, write-only | SKIPPED | — | — | stall already established; recorded, not hidden |

**The failure mode is a large-artifact emission stall.** Faced with a big
first artifact, the model reasons *in place of* emitting until the output
budget kills the turn — §12.5's measured toy-scale pathology reproduced as the
terminal failure mode of real work. A 1.9 KB canary never trips it; a
~6 K-token app.py almost always does.

**The winning recipe is the computer-forced cadence** (operator-authored, cell
T-C2e, instructions preserved as `tuning/tc/tc2e-instructions.md`): the very
first action must be a trivial tool call; never more than a few sentences of
thought between actions; grow the artifact through the computer in ≤40-line
increments; restart and issue a real HTTP test after every increment. Result:
47 tool calls, action ratio 0.058 by chars (stalled cells read 0.000–0.006), a
complete working product, 15/15. **Phase 1's core demonstration — the local
model autonomously building the test product — is achieved, n = 1.**
Replication is R2′ (twice); if it regresses, the decomposition recipe (~8
canary-sized one-shot units, each inside the sweep's 6/6 regime) leads
instead. Ignition without cadence forcing is stochastic at the stack's
temp-≈1.0 thinking sampling: across the battery, one-shot ignited 0/2,
incremental 1/3 with one partial, forced-cadence 1/1 full.

**The window wall is real even in victory:** T-C2e finished at peak context
**32,671 of 32,768** — 97 tokens of headroom — then died before writing its
self-report; the artifact stood and graded 15/15 anyway. Compaction never
fired, which is the §18.1 defect, not a tuning problem — see the amendment
there and T-28.

## 12.11 The two-resident-model pattern — validated \[v2.4\]

Throughout the battery the app-under-test drafted on a second resident model
(`unsloth/qwen3-coder-30b-a3b-instruct`, Q4_K_S, 16 K context) while the agent
reasoned on the 27B. Measured: drafts of **7.5–12.3 s** landing beside an
actively working agent, zero contention events, both models inside the 64 GB
carve-out with room. The earlier single-slot experience — a **414 s** draft
that blocked the agent into retries — is eliminated as a class. **Standing
pattern: anything an agent builds or runs that itself calls an LLM points at
the worker model, never at the agent's slot.** This removes the
app-under-test share of §21.11's contention; §21.11's own question —
parallel-slot behaviour under subagents (T-11) — stays open.

## 12.12 The Code-vs-Standard 2×2 on the current stack — an external first-party run \[v2.5\]

**Provenance.** Run on this machine, on the current stack (DSH `0.1.1-rc.2`,
LM Studio, both resident models), 2026-08-25 02:21–03:32 MDT, **by the
operator's second-vendor agent lane**, and imported the same day by operator
instruction. This is current-stack evidence — §21.13's fence does not apply —
with authorship recorded. Primary record:
`C:\Users\scott\Documents\Codex\2026-08-24\rea\outputs\HALO-CODE-MODE-2X2-RESULTS.md`;
raw evidence package (seed, frozen plan, all four workspaces):
`...\HALO-CODE-MODE-2X2-EVIDENCE.zip`.

**Design.** One hard, dependency-free Python repository task (a durable
proposal workflow: schema upgrade, exact API shapes, idempotent creation,
atomic transitions, optimistic concurrency, event history, filters, CLI and
CSV compatibility). The 27B planned once at 32 K; its output — recovered
mechanically after it failed to emit a final answer — was frozen (45,151
bytes) and given unchanged to every cell. The Coder-30B (Q4_K_S) then
implemented the identical plan four ways, each from a fresh seed copy. Nine
public seed tests are the fair common denominator; a hidden 23-check grader
(stateful, stops on the first unexpected exception — partial counts are not
percentages) ran afterward.

| Cell | Wall | Fair core tests | Peak context | Compactions | Outer calls |
|---|---:|---:|---:|---:|---:|
| Standard / 32 K | 16:47.7 | 3/9 | 26,651 | 3 | 71 native |
| **Code / 32 K** | **15:59.7** | **5/9** | 24,756 | 3 | **26 `run_code`** (82 internal ops) |
| Standard / 64 K | 17:35.5 | **0/9** — import failure | 52,263 | 0 | 64 native |
| Code / 64 K | 17:52.9 | 5/9 | 46,328 | 0 | 25 `run_code` (40 internal ops) |

**Code Mode got a real test.** Every outer call in both Code cells was
`run_code`; the internal operations were real reads, writes, shell and test
runs; both Code workspaces contained materially broader implementations than
their Standard counterparts. This was not Code Mode in name only.

**Five findings:**

1. **Code Mode beat Standard mode on hard work** — two more core tests at
   32 K at slightly less wall-clock, with 63 % fewer outer turns; at 64 K,
   5/9 against a Standard cell that could not even import its own package.
   This inverts §17.4's small-task verdict — see the reconciliation below.
2. **No cell finished correctly, and all four falsely claimed success.**
   Standard/64 K claimed files it never integrated; Code/64 K reported "all
   falsification checks passed" over a suite with one failure and ten errors.
   §21.15 is the standing rule this creates.
3. **T-28 is answered: compaction works when the window is declared.** Both
   32 K cells compacted **three times each, cleanly**, at peaks (24.8–26.7 K)
   consistent only with a threshold sized from a declared 32,768 window
   (0.8 × ≈ 26.2 K), and the agents continued working after every event.
   Neither 64 K cell compacted — the Standard/64 K cell stopped **165 tokens
   short** of its 52.4 K threshold. No compaction errors, no retries. The
   §18.1 amendment is runtime-verified; the residual is only to re-observe it
   under this repo's own harness.
4. **64 K bought nothing.** Same fair score as Code/32 K, ~1:53 slower, and it
   removed working compaction from the loop. Independently replicates §12.9
   and T-C2c: window slack does not help and tends to hurt.
5. **The 27B planner stalled** — 44:57.2 at the cap, 18 tool calls, 45,887
   characters of reasoning, **no final answer**. §12.10's emission-stall
   class, reproduced by a different harness operator on the current stack.
   An uncapped high-reasoning planning pass is not a viable mandatory step.

**Reconciling §17.4 and this section — both results stand:** on a **small
task** both modes finish, so mode decides only speed, and Standard wins
(41 s vs 65 s; rc.7, 2026-08-17). On a **hard task** nothing finishes, so
mode decides how far you get, and **Code wins**. The Code Mode verdict is
**task-size-dependent**: Standard for small interactive work, **Code for
large implementation work — always behind the §21.15 gate.**

**The operator's stack decision (2026-08-25), adopted in §19.1:**
implementation worker = Coder-30B, Code Mode, 32 K; the 27B stays as cockpit
and optional planner; a **mandatory external verifier-and-repair gate** (the
repository's own tests plus an acceptance suite the worker cannot rewrite;
exact failing assertions fed back; only test evidence marks work complete);
64 K rejected for the worker. Building this gate is **T-29**.

**Hygiene and honest limits.** Two preflight attempts were excluded from the
matrix after a path incident (§21.16); the valid battery ran under
`workspace-write` isolation with root-leak guards and no cell wrote outside
its workspace. DSH settings were restored byte-for-byte (SHA-256 verified)
and LM Studio to the 27B @ 131,072, confirmed independently after import.
Limits: n = 1 per cell, one task, one frozen plan shared by all cells; the
hidden grader's partial counts are not comparable across cells; and this
section ranks nothing against §12.10's T-C2e — different task, different
grader, different acting model.

# 13. Model portfolio

## 13.1 What is already on the machine

lms ls reports **41 models, 549.14 GB**, against 852.5 GB free on the 2
TB system SSD. The portfolio problem here is not acquisition — it is
**pruning**. Several entries are duplicates across quantizations or are
tagged to other machines in a fleet (NvideaBlackwell, R71, TinyRyzen7)
rather than Local.

## 13.2 Recommended portfolio

| **Role** | **Model** | **Quant** | **Disk** | **Loaded (est.)** | **Context** | **Status** |
|:---|:---|:---|:---|:---|:---|:---|
| **Primary agent / coding / vision** | unsloth/qwen3.8-27b | UD-Q5_K_XL | 21.15 GB | **26.73 GB measured @131 K** | 131,072 **\[v2.4\]: standing agent load 32,768** (§19.1) | **resident — keep** |
| **Fast worker / subagent** | qwen/qwen3.6-35b-a3b | Q4/Q5 | 22.07 GB | ~24 GB | 32–64 K | present — **promote** |
| **Fast coding worker (alt.)** | unsloth/qwen3-coder-30b-a3b-instruct | Q4 | 17.46 GB | ~19 GB | 32–64 K **\[v2.4\]: loaded at 16,384** | present — **\[v2.4\]: holds the standing resident-worker seat** (§12.11, §19.1); T-1's 35b comparison stays open |
| **Maximum-quality reasoning** | gpt-oss-120b | — | 63.39 GB | ~64 GB+ | reduced | present — **capacity-test before trusting** |
| **\[Addendum\]** **Capacity experiment — the harness's home model** | deepseek-ai/DeepSeek-V4-Flash-0731 | lowest-bit GGUF that fits | ≈90 GB+ (quant-dependent) | near ceiling | reduced | **not present** — the VGM-96 case (§8.3); T-2b |
| **\[Addendum\]** **Primary-agent contender** | Qwen/Qwen3-Coder-Next | Q4-family / UD-Q4 | ≈40–48 GB | ≈45–65 GB est. | 64–128 K (262 K native) | **not present** — add to T-1 (T-13) |
| **Embeddings** | text-embedding-nomic-embed-text-v1.5 | — | 84 MB | \<1 GB | — | present — keep |
| **Reranking** | — | — | — | — | — | **GAP** |
| **Draft / speculative** | *not needed as a separate model* | — | — | — | — | MTP is internal (§12.4) |

### Why this shape

**One dense primary, one sparse worker.** The decisive property of this
machine is memory bandwidth (~256 GB/s), not compute. Decode speed is
governed by how many bytes must be swept per token:

- A **dense** 27B at Q5 sweeps ~21 GB per token-step → measured
  **14.8–16.4 tok/s** (§10), held above the naive ~12 tok/s ceiling by
  MTP.

- An **A3B MoE** activates roughly 3 B parameters per token → a far
  smaller sweep, and should decode several times faster at comparable
  total size.

That asymmetry is the whole argument for a two-model portfolio: the
dense model for quality on the main thread, the MoE for subagents, batch
classification and anything where latency matters more than depth.
**This claim is derived, and §20 lists the measurement that would
confirm it on this box.** It is not yet measured here and is not
presented as though it were.

**No separate vision model.** Qwen3.8-27B is natively vision-language.
Adding qwen3-vl-30b-a3b-instruct (19.64 GB) is only justified if vision
throughput becomes a bottleneck.

**Q28 — largest model this machine can technically run.** gpt-oss-120b
at 63.39 GB is the largest present. With VGM at 64 GB it sits right at
the carve-out boundary and would begin using the shared path; the OpenCL
**54.40 GiB maximum single allocation** is a real hazard for any single
buffer above that size, though llama.cpp allocates per-tensor rather
than as one block. Technically feasible; **verify, do not assume**.

**\[Addendum\]** Largest-present is not largest-possible. A lowest-bit
DeepSeek-V4-Flash-0731 GGUF (≈90 GB+) is the real capacity test for this
box, and it needs the 96 GB carve-out — T-2b.

**Q29 — largest it can run *usefully*.** Distinct question, and the
honest answer is that it depends on active parameters, not file size. A
63 GB *dense* model would decode near 4 tok/s and be useless as an
interactive agent. A 63 GB *MoE* with small active parameters could be
perfectly usable. §20 specifies the test.

**Q32 — which small model for fast worker/subagent tasks?**
qwen3.6-35b-a3b or qwen3-coder-30b-a3b, on the MoE-decode argument
above.

**\[Addendum\]** **Two candidates the other reports surfaced, both
verified against their model cards.** **Qwen3-Coder-Next** (Codex
report): 80 B total / 3 B active, the same Gated DeltaNet + Gated
Attention hybrid as Qwen3.8-27B but with MoE feed-forward blocks,
262,144 native context, Apache 2.0, GGUFs published. It is this
section's own argument — a small active set for decode speed and a
DeltaNet-heavy layout for cheap KV — applied to a coding-specialised
model, and it belongs in T-1 as a third contender against the dense 27B
and the 35B-A3B (T-13). **DeepSeek-V4-Flash-0731** (Codex report): open
weights under MIT, 304 B total with a far smaller active set, a
speculative-decoding module attached, and a model card stating it was
evaluated with DeepSeek Harness in minimal mode — it is the harness's
home model. A lowest-bit GGUF of it is the "\>55 GB resident model" case
that §8.3 said would justify raising VGM to 96 GB, and it replaces
gpt-oss-120b as the headline capacity experiment (T-2b). Neither changes
the daily driver until it is measured.

## 13.3 Pruning

549 GB of models on a 1.9 TB drive with 852 GB free is not yet a
problem, but it is heading for one. Concretely: qwen3.8-27b exists
locally at q3_k_xl, q4_k_xl, q5_k_xl (loaded) and q6_k. Once the
quantization comparison has run, **keep the winner and one fallback,
delete the rest** — that alone is ~35 GB.

# 14. XDNA 2 NPU analysis

**Q35 — does the XDNA 2 NPU provide a useful role? Not for this
workstation today.**

| **Finding** | **Status** |
|:---|:---|
| NPU rated \>50 AI TOPS | vendor claim |
| Used by llama.cpp / LM Studio for GGUF LLM inference | **No** — no NPU runtime is offered by lms runtime on this box |
| Targeted by Lemonade / Ryzen AI Software for specific models | yes, for named models **\[community\]** |
| Practical use today | Whisper, diffusion, background Copilot+ tasks **\[community\]** |
| Largely unused for general LLM inference as of mid-2026 | **\[community\]**, consistent with the runtime list here |
| A dedicated NPU runtime with an OpenAI-compatible API exists for this chip | **\[Addendum\]** **Yes** — FastFlowLM: Windows, XDNA 2, Strix Halo listed by name; Qwen3 / Gemma / DeepSeek families plus embedding and audio models (repository checked 2026-08-23) |

The runtime inventory on this machine is direct evidence: lms runtime
get -l offers exactly four extensions — harmony, llama.cpp CPU/AVX2,
llama.cpp Vulkan, llama.cpp AMD ROCm. **There is no NPU option to
select.** The path to using the NPU at all would be Lemonade or Ryzen AI
Software with a specifically supported model, which is a different model
portfolio than the one this workstation wants.

**\[Addendum\]** That inventory is LM Studio's, not the platform's. The
Grok report pointed at FastFlowLM, and it checks out: a standalone NPU
runtime for XDNA 2 that lists Strix Halo explicitly, serves an
OpenAI-compatible endpoint, and supports the Qwen3, Gemma and DeepSeek
families plus embedding and audio models. It does not change Q35's
headline — the NPU is still not the engine for the primary model, and no
DSH-on-NPU result exists anywhere — but it removes the "no runtime"
premise. DSH can point a second provider profile at it exactly as it
points at LM Studio (§18.1), and the lane is T-15.

Where it could earn a place later: embeddings, reranking, ASR, and OCR
running *concurrently* with the GPU-resident LLM, so they do not steal
bandwidth from decode. That is a real architectural benefit on a
bandwidth-limited part — the NPU has its own execution resources.
**\[Revised\]** With FastFlowLM available it is **EXPERIMENTAL** rather
than WATCH — an embeddings / reranker / small-helper lane to stand up
after acceptance (T-15) — but it still should not shape the initial
build.

# 15. Windows 11 developments

| **Item** | **Value on this machine** |
|:---|:---|
| Build | **26200.9168**, DisplayVersion 25H2 |
| Relevance | **This is the exact build AMD's ROCm 7.14.0 matrix names for Ryzen AI Max** |
| WDDM shared-memory behaviour | measured, §8.1 — 48,938 MB shared over 63.79 GB system RAM |
| WSL2 | installed, Ubuntu, **WSL version 2**; package repaired to 2.7.12.0 and kernel 6.18.33.2 during this investigation (§6.7). Not part of the recommended execution path — see §19.2 |
| Insider builds | **not recommended** |

**Q36 — are recent Windows builds materially improving Strix Halo local
AI?** For this machine the material fact is alignment rather than a new
subsystem: 25H2 / build 26200 is the version AMD certifies for gfx1151
ROCm support. That alignment is what makes §9 and §10 possible.

**Q37 — are any Insider features compelling enough to test?** **No.**
Nothing found in this investigation identifies an Insider-only
capability that changes GPU memory allocation, ROCm availability, or
inference throughput on this part. The machine is already on the
certified build. Moving to Insider would trade a certified configuration
for no identified gain. Classification: **REJECT FOR NOW**.

**\[Addendum\]** Windows 26H1 exists, but Microsoft positions it for new
early-2026 devices; it is not an in-place feature update for existing
24H2/25H2 machines, so it changes nothing here (Codex report, consistent
with Microsoft's release-information page).

# 16. Storage plan

## 16.1 Current state

| **Volume**                              | **Size**  | **Free**     |
|:----------------------------------------|:----------|:-------------|
| C: — Micron 4600 NVMe SSD               | 1905.6 GB | **852.5 GB** |
| D: — Seagate One Touch Hub, USB **HDD** | 7451.8 GB | 4346 GB      |

Models currently consume **549.14 GB**.

## 16.2 Recommended allocation

| **Purpose** | **Budget** | **Notes** |
|:---|:---|:---|
| Windows + drivers + apps | ~200 GB | as-is |
| Dev toolchain, Node/pnpm store, Python envs, repos | ~150 GB | pnpm's content-addressed store grows quietly |
| **Model weights** | **≤ 700 GB** | a ceiling, not a target — currently 549 GB |
| DSH state, sessions, logs, spill | ~50 GB | \$DSH_HOME; session-query-sqlite and spill-local both write |
| Benchmark data + evidence | ~20 GB |  |
| **Free reserve** | **≥ 250 GB** | do not go below |

**Keep model weights on C: (NVMe).** D: is a USB **hard disk**, not an
SSD. §8.4 showed that a model falling out of residency costs a full
reload inside the next request's TTFT — paying that from spinning rust
over USB would be severe.

**\[Addendum\]** **Pagefile and hibernation.** The ROCm rung in §10.4
took free system RAM to 1.55 GB, which is the regime where pagefile
sizing decides whether the box stalls or recovers. Record the pagefile
setting at baseline — system-managed on a 63.79 GB-visible machine is
acceptable, a fixed small pagefile is not — and note that hiberfil.sys
on this split is roughly 25 GB of SSD that can be reclaimed by disabling
hibernation if the free reserve above ever becomes the constraint.

## 16.3 Changes actually made to this machine during the investigation

| **Change** | **Reason** | **Reversible** |
|:---|:---|:---|
| Downloaded LM Studio runtime llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1 (210.73 MB) | required for the controlled backend comparison in §10 | yes — lms runtime remove |
| Cloned deepseek-harness to dsh-halo-research\\upstream\\ | source reading for §4–§6 | yes — delete |
| Created C:\Users\scott\Desktop\Code\dsh-halo-research\\ | report, evidence, benchmark scripts | yes — delete |
| Ran inference requests against the already-running LM Studio server on :1234 | benchmarks | no persistent effect |
| **Temporarily selected the ROCm runtime** and reloaded the model on it | the §10 comparison cannot be made any other way | **done — reverted, see below** |
| **wsl --update** — WSL package 2.6.3.0 → 2.7.12.0 | the package was Modified, NeedsRemediation; both its App Execution Aliases were dead (§6.7) | **intentionally permanent** — this repaired damaged system state |
| **\[v2.1\]** Installed a `bash` shim at `C:\Users\scott\.local\bin\bash.exe` + `.shim` | the MS `bash.exe` alias silently dropped `-c` arguments and piped stdin — 7/9 on the conformance battery (§6.8) | yes — delete the two files; the MS alias is shadowed, not removed |
| **\[v2.1\]** WSL default user switched `root` → `scott` via a `[user]` block appended to `/etc/wsl.conf` | `bash` ran as uid 0 although a `scott` account existed; the operator lifted the constraint that had kept it (§6.8) | yes — backup at `/etc/wsl.conf.bak-20260823` |
| **\[v2.1\]** **Uninstalled the halo-stack deployment**: `~/.dsh` (1,285 MB), `~/.lmstudio/scripts`, the "HALO Memory Snapshot" scheduled task, the services on :3080/:3090, and the empty `Desktop\Code\halo-stack` directory | the project was retired by the operator; this removed the *running* deployment, the repository having been deleted earlier | **no** — but see the verification below |

### \[v2.1\] The uninstall, and what was checked first

The instruction was to delete the installed deployment while preserving anything
not already in the archive. Every deletion was preceded by a diff:

| Check | Result |
|:---|:---|
| `~/.dsh` vs archive, excluding `node_modules`/`logs` | **471 files each side, ZERO live-only** |
| `~/.lmstudio/scripts` vs archive | **8 files each side, ZERO live-only** |
| The four LM Studio loaders (`Load-OpenCode-Qwen.mjs`, `Load-Worker-Coder.mjs`, `OpenCode-Fast-Qwen.ps1`, `Sweep-MTP.mjs`) | **SHA-256 identical** in the archive |
| Archive after deletion | 1.64 GB / 46,653 files — untouched |

`node_modules` was excluded from the content diff as regenerable — and the archive
holds it anyway: `live-deployment\.dsh\profiles` is **1,449.5 MB / 41,853 files**
across 216 `node_modules` directories, a superset of what was deleted. The pnpm
global store also survives (3,191 MB, **197 `@deepseek-ai` packages linked**), so a
fresh profile install relinks locally rather than downloading. **A rebuild does not
pay an install cost** — a claim made in passing after the uninstall, and wrong.

**Deliberately kept:** `C:\Users\scott\.agents\skills\` — the live `here-now`
publishing skill and the operator's own `reddit-search` working copy. Neither is
halo-stack.

**Untouched:** LM Studio itself, verified afterwards (API `:1234` OK, 34 models,
`qwen/qwen3.8-27b` Q5_K_XL still resident on the Vulkan runtime). Removing
`~/.lmstudio/scripts` took out only halo-stack's addition to that folder, not LM
Studio's own data.

### The runtime switch, and its restoration

To measure ROCm the selected runtime had to be changed and the model
reloaded. Both were done with the model's exact prior parameters
recorded first (evidence/PRE-SWITCH-lms-ps.json) and restored
afterwards:

lms runtime select llama.cpp-win-x86_64-vulkan-avx2@2.29.1

lms load unsloth/qwen3.8-27b --identifier qwen/qwen3.8-27b \\

--context-length 131072 --parallel 1 --ttl 86400 -y

**Verified restored state:** selected runtime
llama.cpp-win-x86_64-vulkan-avx2@2.29.1; qwen/qwen3.8-27b resident at
Q5_K_XL, contextLength 131072, parallel 1, ttlMs 86400000 — identical to
the pre-investigation reading. System RAM free returned to 19.22 GB and
GPU local to 29.25 GiB.

**One incident worth recording.** During the ROCm long-context rung the
machine reached **1.55 GB of free system RAM** with the GPU process
holding **78.39 GiB** (§10.4). The run completed, and the state above
was restored immediately afterwards. This was a live box running other
services; the ROCm long-context path should not be re-run on it without
first reducing the model's context length.

**No DSH configuration was written. No VGM setting was changed. No PATH
entry was added or removed — the user PATH is byte-identical to the
backup taken at evidence/HKCU-Path-backup.txt. The machine ends this
investigation on the runtime and model configuration it started with,
plus one deliberate repair: the WSL package is now healthy (§6.7).**

# 17. Benchmark and acceptance-test architecture

## 17.1 Why the obvious benchmark is the wrong one

Decode tokens/sec is the number everyone quotes and the least useful one
for this workload. An agent turn is dominated by **prefill**: a
repository file, a 4,000-line diff, a tool result, a compaction pass.
§10 measures a 45 K-token prompt taking minutes to first token while
decode sits comfortably around 15 tok/s. **Optimising this machine for
decode would optimise the part that is already fine.**

## 17.2 The suite

### Tier 1 — raw inference (scripted, repeatable)

bench/Bench-Local.ps1 in the research directory implements this. Two
methodological requirements it enforces, both learned the hard way
during this investigation:

1.  **A discarded warm-up request.** LM Studio lets an idle model fall
    out of residency; the first request then pays a 21 GB reload *inside
    TTFT*. Without a warm-up the first rung is pure noise — observed as
    22.8 s TTFT for a 274-token prompt.

2.  **A unique nonce at the head of every prompt.** Without it,
    successive rungs share a prefix and are served from the prompt
    cache. Measured effect: apparent marginal prefill fell from **336.7
    tok/s (cached)** to **196.6 tok/s (honest)** on the same rung — a 71
    % overstatement.

A third requirement was learned by violating it: **nothing else may
touch the server during a run.** One benchmark pass in this
investigation was discarded because interactive compat probes were
issued against the same single-slot server mid-run.

**\[Addendum\]** **Two Tier-1 additions.** Concurrency: everything in
§10 was measured at parallel 1 against a single-slot server, and DSH's
mounted subagent tool will issue concurrent requests to that server —
the runs discarded as "contended" in §10.1 are a preview of what that
does. Re-run the 8 KB and 32 KB rungs with the model loaded at parallel
2 and parallel 4, recording TTFT, decode and GPU memory; llama.cpp
preallocates the KV cache per slot, so memory scales with the slot count
(T-11). KV-cache quantisation: one run each at q8_0 and q4_0 KV against
the Tier-3 tool-calling tasks; the memory win is small here (§8.4) but
the quality cost is unmeasured (T-17).

### Tier 2 — DSH agent performance

Fixed, repeatable tasks against a real repository, scored on completion
rather than speed: repository comprehension; multi-file edit; a test/fix
loop; a Git operation; a PowerShell operation; use of a specific tool; a
long-running task that crosses a compaction boundary; a deliberately
oversized tool output; recovery after a tool error.

**\[Addendum\]** Add one task run twice — once in native tool mode and
once in Code Mode (code-runtime-worker-thread is mounted by default and
was never exercised) — scored on completion and tool-call reliability
(T-12). **\[v2.4\]** "Never exercised" is corrected by the recovered
record: Code Mode ran and **lost** on the rc.7 deployment, 2026-08-17
(§17.4); the task is retained as an optional re-check on 0.1.1-rc.2.

### Tier 3 — reliability

Tool-call success rate, malformed calls, hallucinated tools, loops,
context failures, truncation, incorrect edits, permission failures.
**This tier decides the model choice, not Tier 1.** A model that is 30 %
faster and emits one malformed tool call in twenty is worse than a
slower model that never does.

## 17.3 Acceptance criteria

The environment is **not** complete because DSH opens and a model
answers "hello". Acceptance requires all of:

1.  lms ps --json shows the intended model **and quantization**
    resident.

2.  dsh --dump-config shows the intended provider and model — not
    deepseek-official.

3.  A DSH session completes a multi-file edit in a real repository,
    using the PowerShell tool seam, with the sandbox in workspace-write.

4.  A tool call whose result exceeds 100 KB is ingested without breaking
    the turn.

5.  A session survives at least one compaction and continues correctly.

6.  The network is disconnected and the same task still completes —
    **the only real proof that the work is local**.

7.  --dump-config shows tool-bash carrying a disabled key and tool-pwsh
    active — read the **row**, not the package name (§6.5).

8.  **\[Addendum\]** A Get-CimInstance query issued through the
    sandboxed PowerShell tool returns data rather than an access error
    (Discussion \#758 reports the restricted token blocking WMI/CIM).

9.  **\[Addendum\]** After the per-session dsh-\* directory under
    %LOCALAPPDATA%\Temp is deleted, the sandbox either recovers on its
    own or the recreate procedure in §18.2 restores it in one step.

10. **\[Addendum\]** The criterion-3 multi-file task completes with two
    subagents active against the server loaded at parallel 2, with no
    tool-call failures and no UNKNOWN_MODEL error.

11. **\[Addendum\]** One Tier-2 task completes in Code Mode as well as
    in native tool mode. **\[v2.4\]** Conditional: applies only if Code
    Mode is ever enabled — the standing config keeps it off by
    measurement (§17.4, §19.1).

12. **\[Addendum\]** Every executable invoked from inside the sandbox is
    a native Win32 binary (rg.exe, fd.exe, git.exe, pwsh.exe), and
    Git\cmd — not Git\bin — is on PATH.

Criterion 6 is the one that would have caught the failure mode §18.4
describes. Criterion 7 is the one that would have caught the false
finding retracted in §6.5.

**\[Addendum\]** Criteria 8–12 come from the other three reports' gaps:
8, 9 and 12 from Discussion \#758 and the Gemini report's sandbox
claims; 10 and 11 from the Codex report's concurrency and Code Mode
tests.

## 17.4 A recovered pre-reset record: the 2026-08-17 bench day \[v2.4\]

**Provenance and fence, stated first.** This section restores a first-party
record from the machine's **pre-reset rc.7 deployment**, imported on 2026-08-25
**by explicit operator instruction** — the operator-selection clause §21.13 and
the Revision 2.3 note reserve for evidence carried across the reset. Its
numbers are **not** imported into any current-stack table, do not close T-1,
and predate this report's benchmark-hygiene rules. The primary artifact is
`C:\Users\scott\Desktop\Halo Old Archive\repo-working-tree\docs\phases\phase2-bench-results.md`;
the session record is
`C:\Users\scott\Desktop\Halo Stack Research\SessionTranscript.md` (≈ lines
740–780).

One real two-bug repo task, identical prompt, verified on disk after each run,
run on the same two model families this report recommends:

| Run | Wall-clock | Correct |
|---|---|---|
| Qwen3.8-27B Q5, Standard mode | 176 s | yes (4/4, staged) |
| Coder-30B MoE, Standard mode | **41 s** | yes (4/4, staged) |
| Coder-30B MoE, **Code Mode** | 65 s | yes (4/4, staged) |

Its locked verdicts, restored with their date and standing:

1. **"Cockpit default: Q5 dense, Standard mode."** Consistent with the current
   stack's roster (§19.1). The prefix-cache TTFT figures behind it (108.6 s →
   13.4 s fresh-vs-cached) remain pre-reset and unimported.
2. **"Worker: Coder MoE earns the fan-out role decisively"** (4.3× end-to-end
   at equal correctness). Independently re-validated on the current stack by
   §12.11.
3. **"Code Mode: not default"** — lost 65 s vs 41 s at equal correctness;
   *"run_code overhead > batching gain"*; revisit clause: large mechanical
   batch operations only. **This is the record behind T-12's correction in
   §20**: Code Mode on this machine is *measured-and-lost (rc.7, n = 1),
   unreplicated on 0.1.1-rc.2* — not "untested".
4. Its residency verdict — on-demand with a 2 h TTL, "19 GB free with both
   resident is workable but not generous" — is **superseded** by §12.11: under
   the current VGM 64/64 split both models are resident together with room.

**Why this section exists:** v2.3 fenced these numbers correctly but recorded
no pointer to them, and the successor documents then flattened Code Mode's
status to "untested". The fence held; the record was functionally lost, and
the operator had to recover his own result from an archived transcript.
§21.14 is the rule that prevents a recurrence.

**\[v2.5\] The revisit clause has now been exercised.** A current-stack 2×2 on
a hard repository task (§12.12) found the verdict **task-size-dependent**:
Standard mode stays right for small work (this section's result), Code Mode
wins on large implementation work (5/9 vs 3/9 and 5/9 vs 0/9 core tests).
T-12 is closed on both machine states.

# 18. DSH configuration for this machine

Config lives in \$DSH_HOME (default ~/.dsh): hand-written settings in
\$DSH_HOME/settings.yaml, secrets in \$DSH_HOME/.credentials.yaml. Model
changes take effect on the next request without restarting the server.

## 18.1 The provider block

llm-pi-ai:

providers:

lmstudio:

\# LM Studio ignores the value but pi-ai requires a credential to exist.

apiKeyEnv: LMSTUDIO_API_KEY

api: openai-completions

baseURL: http://127.0.0.1:1234/v1

models:

\# Qwen3.8-27B is a native vision-language model, but a hand-entered

\# model is treated as text-only until it says otherwise. Without this

\# line, attaching an image is refused before it is ever sent.

\- id: qwen/qwen3.8-27b

input: \[text, image\]

Set LMSTUDIO_API_KEY to any non-empty string.

**\[v2.4\] AMENDMENT — the block above is defective as published:
`contextWindow` is REQUIRED.** A hand-entered model that does not declare it
is assumed to have a **262,144**-token window (`dsh-llm-pi-ai/lib/index.js:639`
resolves `entry.contextWindow ?? … ?? DEFAULT_CONTEXT_WINDOW`; `:849` sets
`DEFAULT_CONTEXT_WINDOW = 262144`), and `dsh-compaction-basic` sizes its 0.8
threshold from that *declared* capacity — so compaction on a model really
loaded at 32 K or 131 K aims at ≈ 209.7 K and can never fire. Every
window-death in the §12.10 battery, and plausibly the original 7-hour
failure's terminal state (214 K accumulated on a 131 K window), is consistent
with this one missing line. The corrected canonical entry, as applied live in
`~\.dsh\settings.yaml` on this box:

    models:
      - id: unsloth/qwen3.8-27b        # must equal the lms ps --json identifier
        input: [text, image]
        # REQUIRED: without this, pi-ai assumes 262,144 and compaction aims
        # at 0.8 x 262K - far past the real window. Keep in sync with the
        # loaded --context-length.
        contextWindow: 32768

Two rules attach. **The declared value must always equal the context the model
is actually loaded at** — reload the model for an experiment and the
declaration is stale until changed with it. And the fix is **source-isolated
but not yet runtime-verified**: no compaction event has been observed
post-fix (T-28); a swallowed-error path with empty stderr was noted during
isolation and remains unexplained. (The id differs from the block above
because this box registers the model under the `unsloth/` identifier; the id
must match `lms ps --json`.)

**No compat: block is needed.** §11.1 proves LM Studio accepts both
role: "developer" and max_completion_tokens. Add one only if a
*different* server is introduced.

**\[Addendum\]** **Provider IDs are sticky.** Sessions and subagent
descriptors record the provider ID — §21.7 is what happens when a
recorded one no longer resolves. Choose stable lowercase IDs (lmstudio,
flm) and never rename one once a session exists against it; add a new
provider instead.

**\[Addendum\]** Optional second provider, for the NPU lane in §14 — add
only when T-15 is being run, and leave it out of the daily profile until
it passes:

> flm: \# FastFlowLM NPU lane - EXPERIMENTAL
>
> apiKeyEnv: FLM_API_KEY \# dummy; pi-ai needs a credential
>
> api: openai-completions
>
> baseURL: http://127.0.0.1:\<flm-port\>/v1
>
> models:
>
> \- id: \<embedding-or-helper-model-id\>

## 18.2 Containment

Leave the sandbox alone. The stock default is already workspace-write,
resolved as process.env.DSH_PERMISSION_MODE ?? 'workspace-write'.

**Known limitation, from upstream's own documentation:** on Windows the
ACL runner reports **partial** enforcement, not full — "the Windows ACL
runner grants no explicit writable root and reports partial enforcement
for its ambient ACL gaps", with "Everyone/hard-link boundaries" named as
the current gaps. This is stated as a fact about the runner's behaviour,
not as a caution.

**\[Addendum\]** **A Temp cleanup breaks the sandbox — permanently,
until fixed by hand.** Discussion \#758 (2026-08-14, rated P0 by its
reporter): the Windows ACL runner passes a per-session private temp
directory (…\AppData\Local\Temp\dsh-xxxxxx) and never recreates it. Once
Storage Sense, Disk Cleanup or a manual Temp purge removes it, every
subsequent session fails with "sandbox mode 'workspace-write' is
requested but no sandbox backend is usable on this host … --temp is not
an existing directory". The same thread reports the restricted token
blocking WMI/CIM queries, UAC elevation failing silently, and PowerShell
restricted-language-mode initialisation errors. Mitigations: exclude the
dsh-\* temp directory from Storage Sense and any cleanup schedule; keep
the recreate-the-directory step in the runbook; never rely on a CIM
query inside the sandbox for anything that matters. Status at b150a551:
not verified fixed — treat as live (§24.3, T-16).

## 18.2b Optional: a command-guard plugin \[v2.2\]

**This is additive and optional. Nothing in this report's recommended posture
depends on it, and running tools-on does not require it.** It is recorded because it
is a real, observed DSH capability worth knowing exists.

If you want a specific command blocked — for example, to stop a stray
`git reset --hard` during a long unattended run — DSH can build the guard for you.
**Observed \[community\]:** an operator asked the agent, in creator mode, to write a
guard plugin. It landed in `~/.dsh`, wired into the live profile, and after a
restart a `git reset --hard` returned **"bash blocked — command guard blocked."**
The same plugin allowed a `docker`-prefixed `psql` while blocking a bare `psql` —
so the pattern is selective, not all-or-nothing.

Two practical notes if you build one:

1. **Creator mode is the tool for it.** The sandbox and tools themselves need
   nothing built (§12.7); a guard plugin is the mechanism when you want one specific
   rule.
2. **It writes to `~/.dsh`, not the project**, so it does not travel with the repo —
   record it in a project README, and expect one approval prompt when it is created,
   plus a harness restart before it takes effect.

## 18.3 The shell seam — leave it alone

**No patch is required here.** An earlier draft of this report
instructed disabling tool-bash and bash-sandbox; that instruction was
based on a false finding and is **withdrawn**. See §6.5.

Both rows carry disabled: !!js process.platform === 'win32' in the base
bundle, the web-app bundle disables the host-level rows outright, and
the agent presets deployed on this machine repeat the same gate. On
Windows the agent receives **tool-pwsh backed by pwsh-sandbox**, and no
bash tool. Adding a user patch to disable something already disabled
would only add a row to maintain.

**Verify rather than assume**, using the same method that caught the
original error — read the row, not the package name:

pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config

Then confirm tool-bash carries a disabled key and tool-pwsh is the
active shell row.

## 18.4 Verify the model is actually local

The stock composition sets a **cloud** default:

\- id: agent-default-model

config:

provider: deepseek-official

model: deepseek-v4-flash

A workstation can therefore appear to work perfectly while doing none of
its work locally. After configuring, confirm with both of:

lms ps --json

pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config

The first proves which model is resident and at what quantization; the
second proves what the composed profile will actually use. **Neither can
be replaced by looking at the UI.**

## 18.5 Cloud providers alongside local, and model stacking \[v2.1\]

**Requirement.** Local-first stays, but DSH should also be the coding tool for the
operator's existing cloud subscriptions, with cloud models selectable in the UI and
a way to decide *when to use what*. **Constraint: nothing hand-rolled unless it is
proven absent from DSH.**

**Finding: all of it already ships. Nothing needs to be built.** Evidence below.

### 18.5.1 The provider catalog — 37 providers, shipped

The installed catalog is supplied by the vendored `@earendil-works/pi-ai` package,
which ships one `*.models.js` per provider. Enumerated directly from the pnpm store
on this machine:

```
amazon-bedrock · ant-ling · anthropic · azure-openai-responses · cerebras
cloudflare-ai-gateway · cloudflare-workers-ai · deepseek · fireworks
github-copilot · google · google-vertex · groq · huggingface · kimi-coding
minimax · minimax-cn · mistral · moonshotai · moonshotai-cn · nvidia · openai
openai-codex · opencode · opencode-go · openrouter · qwen-token-plan
qwen-token-plan-cn · together · vercel-ai-gateway · xai · xiaomi
xiaomi-token-plan-{ams,cn,sgp} · zai · zai-coding-cn
```

Every vendor named in the requirement is present, including the ones without a
subscription today: **`deepseek`**, **`kimi-coding`** and **`moonshotai`**. Adding
one is a UI action — *Settings → Models → Add provider*, choose it, paste the key —
after which its models appear in the picker. `dsh-client-ui-settings-models` and
`dsh-client-ui-model-selection` are both in the stock composition (§5.1).

`ollama`, `lmstudio` and `llamacpp` are **not** catalogued and do not need to be —
they are the *custom provider* path already configured in §18.1.

> **Worth a look before paying twice.** `openai-codex` and `github-copilot`
> authenticate by **OAuth**, not an API key — the route documented for Codex in
> §18.1's source page ("Bedrock, Vertex, Azure, and Codex use … OAuth
> respectively"). Where that maps onto an existing subscription rather than
> metered API credits, it changes the cost picture. **Not verified on this
> machine** — added as **T-20**.

### 18.5.2 Stacking — one delegation tool per model

DSH has no task→model auto-router (§18.5.3). What it *does* have is better suited
to the requirement anyway: **`tool-subagent` can be mounted more than once, each
instance bound to a different model and exposed to the agent under its own name.**

From source, `packages/subagent/tool-subagent/src/index.ts`:

```
/** Model-facing tool name (default `subagent`). Each loaded instance must use
 *  a distinct name. */
toolName?: string
agentOptions?: AgentOptions
```

and `packages/core/agent/src/runtime-types.ts:24`:

```ts
export interface AgentOptions {
  provider?: string   // provider route (must have a registered adapter at call time)
  model?: string      // model id interpreted by the selected provider adapter
  maxTokens?: number  // maximum output tokens per conversation-model request
}
```

The subagent carries that binding through its whole lifecycle —
`descriptor.ts:76,78` declare `agentProvider` / `agentModel`, and
`continuation.ts:420` resolves them with a fallback to the parent:

```ts
const agentProvider = request.agentOptions?.provider ?? parent.options.provider
const agentModel    = request.agentOptions?.model    ?? parent.options.model
```

So the stack is expressed as configuration, and the *model* chooses by calling the
tool whose name matches the job:

```yaml
# $DSH_HOME/profiles/web/cordis.patch.yml — the user layer
- insert:
    # Local worker — the default, and the cheapest. Runs on the resident 27B.
    - id: tool-subagent-local
      name: '@deepseek-ai/dsh-tool-subagent'
      config:
        provider: spawn
        toolName: subagent_local
        agentOptions:
          provider: lmstudio
          model: unsloth/qwen3.8-27b  # [v2.4] id must match lms ps --json (§18.1)

    # Deep reasoning / architecture — a frontier cloud model, used sparingly.
    - id: tool-subagent-deep
      name: '@deepseek-ai/dsh-tool-subagent'
      config:
        provider: spawn
        toolName: subagent_deep
        agentOptions:
          provider: anthropic
          model: <model-id from the picker>

    # Second opinion / review — a different vendor on purpose, so the reviewer
    # does not share the author's blind spots.
    - id: tool-subagent-review
      name: '@deepseek-ai/dsh-tool-subagent'
      config:
        provider: spawn
        toolName: subagent_review
        agentOptions:
          provider: openai
          model: <model-id from the picker>
```

The main thread stays on the local model (§18.1); escalation is explicit, per-call,
and visible in the trajectory view. Agent instructions then say *when* to escalate —
which is prose, not code.

**Model ids are deliberately left as placeholders.** They must be taken from the
picker after the provider is added; writing today's ids into a spec would date it
within weeks (§21.1).

### 18.5.3 What does **not** ship — stated with the instrument

**There is no automatic task→model router.** Method, so the claim is checkable:

- No directory under `packages/*/*` matches `rout*`.
- A source search for `auto-rout`, `routeModel`, `selectModel`, `chooseModel`
  across `packages/*/*/src/*.ts` returns only `resolveRouteModels` and
  `selectModel`, both in `packages/llm/llm-pi-ai/src/catalog.ts:782`, which resolve
  **a configured provider's model catalog** — not a task-to-model decision.

**This does not need building.** §19.2 rejects a routing layer for want of measured
benefit, and the structural approach above delivers the same outcome declaratively:
the operator fixes the roster, the model picks from it, and every choice is logged.
A router would add a component whose decisions are harder to audit than a tool name.

### 18.5.4 The risk this configuration raises

**§21.7 gets worse, not better, with several providers configured.** Subagents
snapshot provider/model at *parent-agent creation*; the upstream report shows seven
subagents failing with `UNKNOWN_MODEL` on a provider/model pair that had never been
configured. A multi-provider roster is exactly the shape that triggers it.

Mitigations, in order: make the local model the session **default** so a stale
snapshot still resolves; **start a new session** after changing models; and when a
subagent fails, read the `subagent/descriptor` entries in the session log before
suspecting the provider block. Added as **T-21**: exercise each `subagent_*` tool
once and confirm from the log that the descriptor carries the intended
`agentProvider`/`agentModel`.

### 18.5.5 Authentication — OAuth for subscriptions, API key for the rest \[v2.1\]

**Requirement.** The operator holds **subscriptions**, not API keys, for the major
US providers, so OAuth is the primary path. API-key auth must remain available for
Chinese models, whether direct or through a gateway.

**Both are shipped, and the choice is per provider.** DSH stores two credential
kinds — `auth.ts:134` resolves `entry.kind === 'api-key' ? 'api_key' : 'oauth'`. An
API key is rebuilt field by field; an OAuth `grant` is stored verbatim as opaque
JSON *"precisely so a library that owns a token format keeps owning it, refresh
fields and all"* (`auth.ts:44`). pi-ai performs token refresh inside its own
`modify()` call (`auth.ts:103`), so refresh is not something to build or babysit.

`login.ts` implements the flows and offers whichever methods the provider declares
(`loginMethods`, `login.ts:29-33`): **`auth_url`** (browser redirect),
**`device_code`** (a `verificationUri` plus a `userCode` to type in), and
**`manual_code`** (paste the code back). All three are already handled.

**Which providers actually offer OAuth — read from the pi-ai provider registry
(`dist/providers/<name>.js`), 43 providers scanned:**

| Provider | OAuth | API key | Maps to |
|:---|:---:|:---:|:---|
| **`anthropic`** | **YES** | yes | **a Claude subscription** |
| **`openai-codex`** | **YES** | **no — OAuth only** | **a ChatGPT subscription** |
| **`xai`** | **YES** | yes | a Grok subscription |
| **`github-copilot`** | **YES** | yes | a Copilot subscription |
| **`kimi-coding`** | **YES** | yes | Kimi / K-series |
| **`openrouter`** | **YES** | yes | a gateway — see below |
| `radius`, `openrouter-images` | YES | yes | — |
| `openai` (plain), `google`, `google-vertex` | no | yes | key or ADC only |
| `deepseek`, `moonshotai(-cn)`, `zai(-coding-cn)`, `minimax(-cn)`, `qwen-token-plan(-cn)`, `xiaomi*`, `ant-ling` | no | yes | **API key** |
| `amazon-bedrock`, `azure-openai-responses` | no | yes | native creds (AWS / `api-version`) |
| `groq`, `mistral`, `together`, `fireworks`, `cerebras`, `nvidia`, `huggingface`, `vercel-ai-gateway`, `cloudflare-*` | no | yes | API key |

Four consequences worth acting on:

1. **A Claude subscription is directly usable** — `anthropic` declares OAuth. This
   is the single most valuable line in the table for this deployment.
2. **For ChatGPT, use `openai-codex`, not `openai`.** They are separate catalogue
   entries: `openai-codex` is **OAuth-only**, while plain `openai` is **API-key
   only**. Choosing the wrong one is the difference between "my subscription works"
   and "this demands a key I don't have."
3. **Google has no OAuth path here.** `google` and `google-vertex` are key/ADC only,
   so a Gemini subscription does **not** map onto this catalogue. Stated as a gap
   rather than left to be discovered.
4. **`openrouter` supports OAuth *and* fronts the Chinese models.** One OAuth login
   there can reach DeepSeek, Kimi, GLM, Qwen and MiniMax without holding a key per
   vendor — worth weighing against direct API keys, which remain fully supported
   and are the lower-latency, lower-markup route.

**Keys, where they are still wanted**, follow §18.1: either stored through
*Settings → Models* into `$DSH_HOME/.credentials.yaml` (write-only — the page gets
back a redacted descriptor, never the secret), or referenced from the environment
with `apiKeyEnv`, which keeps the secret out of the settings file entirely. The
env-var form is the better fit for the Chinese providers if those keys are also
used by other tooling.

```yaml
llm-pi-ai:
  providers:
    # Subscription-backed, OAuth — no key in any file.
    anthropic: {}          # sign in via Settings → Models
    openai-codex: {}       # OAuth-only; the ChatGPT route
    xai: {}

    # Key-backed, secret held in the environment rather than on disk.
    deepseek:
      apiKeyEnv: DEEPSEEK_API_KEY
    moonshotai:
      apiKeyEnv: MOONSHOT_API_KEY
```

**Status: mechanism proven from source, not exercised on this machine.** No OAuth
login was performed here — that requires the operator's own credentials, and none
of these providers is configured on this box. **T-22**: complete one OAuth login
(start with `anthropic`), confirm a `grant`-kind credential is written and that the
model appears in the picker; then confirm a refresh survives a restart. Prior art
exists — the operator reports having configured subscription-backed OAuth for these
vendors in an earlier harness — so the remaining risk is DSH-specific plumbing, not
whether the vendors permit it.

## 18.6 Model pinning and the settings user layer — a bring-up finding \[v2.6\]

**The failure, observed live.** During stack bring-up (2026-08-25) the worker
lane was launched with a `--patch` overlay that set `agent-default-model` to
the coder. `--dump-config` showed the patched value. The LM Studio **server
log** showed every completion in the session window served by the **27B**.
The composed config and the runtime disagreed, and the server was right.

**The mechanism, from source.** `agent-default-model` registers a settings
section and reads it live: *"The composition entry remains usable without a
settings provider; when one is mounted, its user layer is read live"*
(`packages/core/agent-default-model/src/index.ts`). So `~\.dsh\settings.yaml`
overrides any patch layer at boot, and the picker's `saveSelection` writes
back into that same user layer. `--dump-config` reports composition inputs —
**a claim about boot inputs, not about runtime state.**

**Three rules follow:**

1. **Pin per-lane models with a per-lane `DSH_HOME`.** The worker lane runs
   from `stack\dsh-home-worker\`, whose settings declare **only the coder** —
   the lane cannot silently fall back to the cockpit model. This is the only
   pinning that held under test.
2. **Verify model identity from the server side** — the LM Studio server log
   (`~\.lmstudio\server-logs\`) names the model on every request. The DSH
   session log contains **no model id at all** (checked by full-text scan),
   and the composed config can disagree with runtime. §6.5's rule ("read the
   row, not the name") gains a sibling: **read the server, not the config.**
3. **Know which plugins the trap applies to.** It bites anything that owns a
   settings section. `system-prompt` does **not** (no settings namespace in
   its source), so profile-patch persona overrides are authoritative — and
   that was still verified at runtime with a sentinel probe (a codeword
   planted in the persona and recited by a live session) before the §19.3
   routing rule was wired through it.

# 19. Recommended architecture

## 19.1 The stack

DeepSeek Harness 0.1.1-rc.2 · profile: web · 133 plugins

sandbox: workspace-write (default, unchanged)

shell seam: tool-pwsh + pwsh-sandbox (tool-bash is win32-gated off)

\| @deepseek-ai/dsh-llm-pi-ai

\| api: openai-completions

\| baseURL: http://127.0.0.1:1234/v1

v

LM Studio local server :1234 (process: llama-server)

residency + quantization truth source: lms ps --json

v

llama.cpp 2.29.1 - backend selectable without rebuild

· llama.cpp-win-x86_64-vulkan-avx2@2.29.1 (SELECTED - default)

· llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1 (installed, experimental)

· llama.cpp-win-x86_64-avx2@2.28.2 (CPU fallback)

v

AMD Adrenalin 26.7.1 / display driver 32.0.31035.1003

v

Radeon 8060S (gfx1151, RDNA 3.5) - 20 WGPs / 40 CUs

v

128 GB LPDDR5X-8000, ~256 GB/s

VGM 64 GB dedicated \| 63.79 GB to Windows \| 47.79 GiB shared

**\[v2.3\] Permission posture.** The stack line above lists
`workspace-write` because that is the stock default, and it is the right
description for a general reader picking up this spec. It is **not** a
recommendation to stay confined. On this single-operator machine, running
at **full host access** — the operator's chosen mode, launched from
whatever root the work needs — is a legitimate daily posture, and the
operator has made that call deliberately. The report states how the
sandbox modes behave (§18.2) as fact, and offers an optional per-command
guard (§18.2b) as a capability, not a duty. Neither is a reason to run
confined when the operator wants reach.

**\[v2.4\] The Halo v1 standing configuration — an operator decision,
2026-08-25.** The stack above stands; these are the tuned operating values
that came out of §12.9–§12.11 and the §18.1 amendment:

- **Agent model:** `unsloth/qwen3.8-27b` (UD-Q5_K_XL) loaded at **32,768** —
  the window every big-build success occurred at; 64 K measured worse
  (§12.10), and larger windows slow small tasks (§12.9).
- **Worker model:** `unsloth/qwen3-coder-30b-a3b-instruct` (Q4_K_S) loaded at
  **16,384**, resident alongside the agent (§12.11). Anything under test that
  calls an LLM uses this seat.
- **The provider entry declares `contextWindow: 32768`**, kept equal to the
  loaded context at all times (§18.1 amendment; runtime verification T-28).
- **Standard tool mode.** Code Mode stays off per the §17.4 record; revisit
  only for large mechanical batch work (T-12 re-run optional).
- **Big autonomous builds use the computer-forced cadence brief** (§12.10),
  delivered as `AGENTS.md` in the workspace; headless mechanics per the
  proven harness (full path to `pnpm.cmd`; one-line task string with no
  `<`/`>` characters).
- **Long headless runs are monitored**, with metrics read from the session
  logs (`tuning/extract_metrics.py`) — never from a summary.

**\[v2.5\] Role amendment — the build lane (operator decision, 2026-08-25,
from §12.12):**

- **Implementation worker for large builds:** the **Coder-30B in Code Mode at
  32,768** — it beat Standard mode on hard work and pairs with verified
  compaction. 64 K is rejected for this role: slower, no correctness gain,
  and it takes compaction out of the loop.
- **Mandatory external verifier-and-repair gate (T-29)** on everything the
  worker produces: repository tests plus an acceptance suite the worker
  cannot rewrite; failing assertions fed back; **only test evidence marks a
  task complete** (§21.15). All four §12.12 cells falsely claimed success —
  the gate is load-bearing, not hygiene.
- **The 27B is the cockpit and optional planner, not a mandatory synchronous
  step** — its uncapped planning pass stalled at the 45-minute cap (§12.12).
  When it drives a big build itself, it uses the forced-cadence brief
  (§12.10), the one recipe with a full pass on record.
- The worker-seat rule stands: anything under test that calls an LLM uses
  the coder's endpoint, never the agent's slot (§12.11).

**No middleware, no routing layer, no custom plugins.** The directive
warns against introducing middleware because middleware can be built;
nothing found in this investigation justifies any. DSH's provider seam,
LM Studio's model management and LM Studio's runtime switching cover
every requirement identified.

**\[Addendum\]** Optional experimental lane, not part of the stack until
T-15 passes: a second provider profile (flm) pointing at a FastFlowLM
endpoint that serves an embedding model and a small helper on the XDNA 2
NPU, concurrent with the GPU-resident primary. It is a provider entry on
the same seam as lmstudio, not middleware.

## 19.2 What is deliberately absent

| **Not recommended** | **Why** |
|:---|:---|
| A custom routing layer | **Q33** — DSH already exposes per-session model selection in the UI (dsh-client-ui-model-selection, mounted) and subagents can carry their own model. Automatic routing would add a component with no measured benefit. |
| Ollama | LM Studio is already installed, is ahead on OpenAI-surface completeness **\[community\]**, and uniquely offers backend switching. |
| A second serving backend | Heterogeneity is permitted but must earn its place. One server that can switch backends achieves the same result with less to break. **\[Addendum\]** The FastFlowLM NPU lane (§14) is the one candidate that could earn it, because it does not compete for the GPU. |
| Converting to Linux / making WSL primary | Explicitly out of scope, and unnecessary — §9 shows the needed ROCm components are supported natively. |
| ROCm HIP SDK installed system-wide | Not required. LM Studio's ROCm runtime is self-contained. |
| Insider Windows builds | §15 — no identified gain, and the machine is already on AMD's certified build. |

**\[v2.4\] And one absence that is DSH's, not ours — web access.** Verified
from the installed source: the web seam exists (`dsh-web` registry,
`dsh-tool-web` exposing `web_search` / `web_fetch`), but `web_search` is wired
to DeepSeek's cloud API (`DEEPSEEK_API_KEY` — absent on this keyless box) and
`web_fetch` ships `fetch: false` with **no fetch provider mounted or
installed** (a deliberate SSRF posture; `web-fetch-http` exists in the repo,
not in this profile). **Net: the agent has no web access out of the box.**
Three routes, ranked for this stack: (1) **crawl4ai** as a local tool the
agent shells to — evaluated 2026-08-24: real product (v0.9.2, Apache-2.0,
Playwright-based), JS-rendered pages to clean Markdown files, and its
LLM-extraction stage speaks OpenAI-compatible endpoints — route it to the
worker model, never the agent's slot; (2) mount `web-fetch-http` +
`fetch: true` in the user patch layer — plain HTTP, no JS; (3) feed
`web_search` a paid key. Until one is chosen, treat "the agent looked it up"
as impossible by construction.

## 19.3 The stack as built and verified — 2026-08-25 \[v2.6\]

Everything below is running on the machine and committed under `stack\` in
the research repo; the dated per-check evidence table is
`stack\BRINGUP-2026-08-25.md`.

| Piece | As built |
|:---|:---|
| Models | 27B @ 32,768 (cockpit) + Coder-30B @ 32,768 (worker), both resident; `contextWindow` declared per entry in each home |
| Build path | **`Gate-Build.ps1` — the only build path.** External verifier the worker cannot rewrite; exact failures fed back; fail-closed; root-leak guard (§21.16) |
| Worker lane | `-Lane worker`: coder, **Code Mode** (`DSH_TOOLS_MODE=code`), pinned by its own `DSH_HOME` (§18.6) |
| Cockpit lane | `-Lane cockpit`: 27B, native mode, **forced-cadence brief auto-stamped** into `AGENTS.md` (`stack\cadence-brief.md`, generalized from the 15/15 wording — n = 0 until a real pass) |
| Done | **`Check-Done.ps1` — no gate-log, no done.** Ungated probes stamped `NOT EVIDENCE` (`Probe-Worker.ps1`) |
| Chat routing | Standing persona rule in the web profile: real builds are routed to the gate by the cockpit itself; `HALO-CADENCE-BRIEF` marks gate-launched 27B builds as exempt |
| Operator surface | **Point-and-click only**: the "Halo Cockpit" desktop shortcut → `Launch-Halo.ps1` (models ensured, `dsh web` hidden, browser opened; dead-orphan reap on :3080 is ownership-checked). CLI/headless = agent lanes only — an operator decision, 2026-08-25 |

**Verification chain (all named evidence, §21.15-grade):** gate fail-closed
against a planted "5/5 green, COMPLETE" lie → FAIL; in-workspace verifier →
REFUSED; seeded-bug repair to green **by external tests** on both lanes —
worker 0.6 min, cockpit 3.3 min — with model identity confirmed from the
server log each time (29/29 coder lines; 42/42 27B lines); persona sentinel
HALO-ROUTE-42 recited by a live session before the routing rule was trusted;
launcher verified serving HTTP 200 on :3080.

**Aside, n = 1:** the same seeded task through the same gate took the 27B
2.9 min and the coder 0.6 min (≈4.8×) — consistent with §17.4's 4.3×.

**\[v2.7\] Observed load configuration (read-only look, 2026-08-25):** both
models serve with `n_slots = 4` and `kv_unified = true` at 32,768; MTP
speculative decoding is active on the 27B; the vision projector is loaded.
Flash-attention and KV-precision flags are not printed by this load path —
recorded as a blind spot, not assumed. One unexercised hint in the log:
`--reasoning-preserve`. Nothing was changed.

**Still open, honestly:** the first **real** gated build (T-29's gate is
proven on a toy); the generalized cadence wording (n = 0); and one eyeball —
the routing persona was proven by sentinel and composition, but the web UI
itself has not yet been asked to recite it.

# 20. Outstanding tests — what this report does not yet know

| **\#** | **Test** | **Question it settles** |
|:---|:---|:---|
| T-1 | Dense vs MoE decode: same ladder against qwen3.6-35b-a3b | Confirms or refutes §13.2's central portfolio argument |
| T-2 | gpt-oss-120b load + decode at reduced context | **Q29** — largest *usefully* runnable model |
| T-3 | Fill the 131 K window and observe shared-memory usage | Whether the preallocation in §8.4 holds at full occupancy |
| T-4 | Quantization sweep: q3_k_xl / q4_k_xl / q5_k_xl / q6_k on tool-call correctness | **Q21** with evidence rather than reasoning |
| T-5 | llama-bench microbenchmark isolating pure prefill | Removes TTFT overhead from §10's numbers entirely |
| T-6 | DSH Tier-2 agent tasks (§17.2) end to end | Whether the harness is actually *good* here, not just working |
| T-7 | Network-disconnected task completion | Proof that the work is local (§17.3 criterion 6) |
| T-8 | tool-fs-search behaviour without rg on PATH | Whether ripgrep is a hidden dependency |
| T-9 | mcp-client, lsp, subagent-codex on Windows | The **UNKNOWN** rows in §6.4 |
| **T-10** | **ROCm at a 32 K context limit**: reload on ROCm with --context-length 32768, re-measure GPU footprint, re-run the 8–32 KB rungs **\[Addendum\]** Run on a custom HIP build with the §10.5 knobs, not the LM Studio runtime. | Whether ROCm's real 1.85–2.92× prefill win can be had at a safe memory footprint — **the highest-value follow-up on this box** (§10.5) |
| T-11 | **\[Addendum\]** Concurrency: reload at parallel 2 and parallel 4; re-run the 8 KB / 32 KB rungs with two subagents active; record TTFT, decode, GPU memory | Whether a single-slot server is the real bottleneck under DSH's subagent tool (§21.11) |
| T-12 | **\[Addendum\]** One Tier-2 task in Code Mode and again in native tool mode. **\[v2.4\] Status corrected:** Code Mode was run head-to-head on this machine's rc.7 deployment, 2026-08-17, and **lost** — 65 s vs 41 s Standard, both correct (§17.4). The honest status is *measured-and-lost (pre-reset, n = 1), unreplicated on 0.1.1-rc.2* — not "untested". Re-run optional; revisit clause: large mechanical batch operations. **\[v2.5\] CLOSED — measured on both machine states.** The current-stack 2×2 (§12.12) ran Code Mode for real on a hard task: **better than Standard** (5/9 vs 3/9 core tests at 32 K; 5/9 vs 0/9 at 64 K). Verdict is task-size-dependent: Standard for small work, Code for large implementation work behind the §21.15 gate | Whether Code Mode is usable with this model (§17.2) |
| T-13 | **\[Addendum\]** Qwen3-Coder-Next Q4-family through the §10 ladder and the Tier-3 tasks | Whether a coding-specialised 80B-A3B beats the dense 27B as primary (§13.2) |
| T-2b | **\[Addendum\]** DeepSeek-V4-Flash-0731 lowest-bit GGUF: VGM 96, reduced context; load, decode, memory, tool-call reliability; VGM back to 64 afterwards | Q28 / Q29 with the harness's own model — the VGM-96 case (§8.3). **\[v2.7\]** Known wall on this path: a verified Win11 Strix report shows Vulkan loading failing at ≈64 GB despite VGM 96 (§24.4c #12) — plan against fixed allocation and expect it |
| T-15 | **\[Addendum\]** FastFlowLM serving an embedding model and a small helper on the NPU, concurrent with the GPU-resident 27B | Whether the NPU lane earns its place (§14) |
| T-16 | **\[Addendum\]** Sandbox: Get-CimInstance via the sandboxed pwsh tool; an MSYS/Git-Bash binary call; delete the dsh-\* temp directory and observe recovery | The Discussion \#758 failure modes on this build (§18.2) |
| T-17 | **\[Addendum\]** KV cache at q8_0 and q4_0 against the Tier-3 tool-calling tasks | Whether KV quantisation costs tool-call quality (§17.2) |
| **T-18** | **\[v2.1\]** Install AMD's `device-gfx1151` PyTorch wheel into a throwaway venv; confirm the 8060S is visible to torch and run a matmul; record the driver version it demands against the installed 32.0.31035.1003 / Adrenalin 26.7.1 | Turns §9.4 from documentation-verified into machine-verified — the last step on the item revision 2 left open as §27/19 |
| **T-23** | **[v2.1]** Send the same `reasoning_effort` request to `llama-server` directly, and inspect the GGUF chat template for a `reasoning_effort` branch | Whether §12.6's inert parameter is an LM Studio forwarding gap or a template gap — decides whether the lever is recoverable at all. **\[v2.7\] RESOLVED in mechanism (§12.6b): neither — it was the wrong wire field.** Top-level `reasoning_effort` works end to end (direct API and full DSH chain; `none` → 0 reasoning tokens). Open remainder: size low/medium/xhigh on planner-scale tasks before changing any lane default |
| **T-22** | **[v2.1]** Complete one OAuth login (start with `anthropic`); confirm a `grant`-kind credential is written, the model appears in the picker, and a token refresh survives a restart | Whether subscription-backed OAuth works end to end in DSH (§18.5.5) — the mechanism is proven from source but unexercised |
| **T-20** | **[v2.1]** Add `openai-codex` and/or `github-copilot` via OAuth; confirm whether an existing subscription is honoured rather than metered API credits | Whether cloud escalation (§18.5) costs anything beyond subscriptions already held |
| **T-21** | **[v2.1]** Exercise each `subagent_*` tool once; confirm from the session log that the descriptor carries the intended `agentProvider`/`agentModel` | Whether the §21.7 snapshot bug bites the multi-provider roster (§18.5.4) |
| **T-19** | **\[v2.1\]** Repeat the **64 KB and 256 KB** rungs on a quiesced machine, with the model loaded at a reduced context so ROCm's footprint stays safe | The only rungs still at `n = 1`, and the 256 KB ROCm result is confounded by memory pressure (§10.6) |
| **T-25** | **\[v2.2\]** **Build Lucebox under WSL2**; confirm ROCm reaches the 8060S from inside WSL2; run `bench/Bench-Local.ps1` against its `:8000` endpoint unchanged so results are directly comparable to §10.2 | Whether the claimed **3.08× decode over llama.cpp HIP** survives on Windows. **The highest-value open question in this report** — if it holds, §11.3's server recommendation changes (§11.2b) |
| **T-24** | **\[v2.2\]** Repeat `bench/Test-SandboxEffect.ps1` on a **general-purpose** task mix — reasoning, drafting, code review, instruction-following — rather than the arithmetic-and-aggregation set of §12.7 | §12.7's **+72.2 pp** is measured on tasks deliberately favourable to a sandbox. This estimates the gain on representative work, which is the number the build should be sized on |
| **T-26** | **\[v2.2\]** Evaluate the **bartowski Q5_K_M** build (downloaded, verified byte-exact) against the incumbent Unsloth **Q5_K_XL** on the §17.2 Tier-3 tasks and the §10 ladder | Whether the incumbent quantisation is the right one; the two vendors differ in imatrix calibration and tensor-type selection at nominally equal bit-depth (§13.2). **Quality battery done — dead heat, 15/15 vs 15/15, incumbent kept (§13.2, Q21). Still open for the §17.2 Tier-3 code tasks, which discriminate where the intuition traps do not.** |
| **T-27** | **\[v2.2\]** Convert §12.8's planted-bug anecdote into a scripted battery: a mix of no-bug and planted-bug repos, graded on false-positive rate, true-positive rate, and constraint-adherence | Turns the strongest agentic-reliability observation in the report from n = 1 interactive into a measured pass rate (§12.8) |
| **T-28** | **\[v2.4\]** Compaction verification post-fix: with `contextWindow` declared equal to the loaded context, drive a session past 0.8× the real window and observe an actual compaction event; watch the swallowed-error path (empty stderr) seen during isolation | Whether the §18.1 amendment actually arms compaction — until an event is observed, the §12.10 root cause is source-isolated, not runtime-proven, and no long headless run should be fully trusted. **\[v2.5\] RUNTIME-VERIFIED** by the §12.12 battery: three clean compactions in each 32 K cell at peaks consistent only with a declared 32,768 window (threshold ≈ 26.2 K), agents continuing after every event, zero compaction errors; neither 64 K cell compacted (Standard/64 K stopped 165 tokens under its threshold). Residual: re-observe once under this repo's own harness |

**\[v2.4\]** Two successor experiments sit above this table rather than in it,
each with a falsifiable prediction: **R2′** — replicate T-C2e twice
(prediction: forced-cadence goes 3/3 and becomes the standing big-task recipe;
regression hands the lead to decomposition), and **R1** — the decomposed
build, ~8 canary-sized units (prediction: ≥13/15, no unit stalls; a stall
falsifies the emission-pathology claim measurably). The battery behind them is
§12.10; the harness is `tuning/tc/Run-TC.ps1`.

**\[v2.5\]** Operator direction, 2026-08-25: **stop benchmarking — build.** The
next unit of work is not a cell, it is the standing stack of §19.1 plus:

| **\#** | **Test** | **Question it settles** |
|:---|:---|:---|
| **T-29** | **\[v2.5\]** Stand up the external **verifier-and-repair gate**: the repository's own tests plus an acceptance suite the worker cannot rewrite; exact failing assertions and tracebacks fed back to the worker; only test evidence marks work complete. Prove it **fails closed**: a seeded-defect submission must be rejected no matter what the model's summary claims. Use DSH's shipped loop mechanisms (`tool-ralph`, `tool-workflow`) rather than writing one | Whether the §12.12 finding — every cell falsely claimed success — is contained by construction; the gate is the missing organ between "5/9 and lying about it" and a usable autonomous coder. **\[v2.6\] BUILT AND PROVEN** — fail-closed both ways, repair-to-green on both lanes (§19.3); what remains of T-29 is its first real (non-toy) build |

R2′ (forced-cadence replication) and R1 (decomposed build) remain recorded
above as optional follow-ups behind the gate work.

# 21. Risks

## 21.1 The software is nine days old

DSH's first commit is 2026-08-13 and the newest release is 2026-08-21.
There are four releases in total, all prereleases, and the repository
README says breaking changes are expected. **Pin 0.1.1-rc.2 and pin the
commit.** Do not track latest automatically.

## 21.2 npx should not be used on this box

The README's quick start is npx @deepseek-ai/dsh web. Use **pnpm dlx**
instead. This is a machine-specific finding and is not an upstream
defect; DSH itself declares packageManager: pnpm@11.7.0.

## 21.3

this text deleted by user

## 21.4 A local workstation that quietly runs in the cloud

The stock default model is deepseek-official / deepseek-v4-flash.
Nothing about a working DSH session proves it is local. §17.3 criterion
6 — disconnect the network and re-run — is the only test that cannot be
faked.

## 21.5 ~~tool-bash on this machine~~ — RETRACTED

This risk does not exist. tool-bash and bash-sandbox are disabled on
win32 at the base bundle, the mode bundle, and the agent preset. The
Windows agent gets tool-pwsh + pwsh-sandbox. See §6.5 for the retraction
and the methodological cause.

**The residual lesson is the one worth keeping:** a package appearing in
--dump-default-config output is *not* evidence that it is active. Read
the disabled key on the row. The same distinction that governs the
plugin counts in §4.3 governs this.

## 21.6 Thinking tokens consume the output budget

Measured: max_tokens: 8 produced empty content and 8 reasoning tokens.
Under-budgeted output limits will truncate tool calls before they are
emitted.

## 21.7 Subagents can silently use the wrong provider — reported upstream, unfixed

Discussion 3377 reports that subagents use the model **snapshotted when
the parent agent was created**, not the currently selected one. The
reporter's seven subagents all failed with:

UNKNOWN_MODEL: pi-ai provider "packyai" has no configured model
"kimi-k3"

naming a provider/model combination that **had never been configured in
that deployment**, while the parent had already switched to a working
provider.

**Why this matters here specifically.** The recommended build adds a
*custom* provider (lmstudio) and expects the user to switch to it in the
UI. That is exactly the sequence the bug punishes.

**Mitigation until fixed:**

1.  Make the local model the **default** — selecting a model in the
    picker also makes it the default for new sessions.

2.  After changing models, **start a new session** before using
    subagents.

3.  If subagents fail with UNKNOWN_MODEL, do not debug the provider
    block first — check the subagent/descriptor entries in the session
    log against the parent's provider/model.

## 21.8 There is no bug tracker

Issues are **disabled** on the DSH repository (has_issues: false). When
something breaks there is no canonical place to check whether it is
already known; Discussions search (4,117 threads) is the only
substitute. Budget for that.

## 21.9 No dsh web stop or restart

Reported upstream (discussion 2933) and confirmed against the pinned
CLI: there is no --stop/--restart. A closed terminal leaves an orphan
holding port 3080, and the next launch fails with "port in use". Keep a
kill command handy:

Get-NetTCPConnection -LocalPort 3080 -State Listen \| ForEach-Object {
Stop-Process -Id \$\_.OwningProcess -Force }

**\[v2.6\]** `stack\Launch-Halo.ps1` now handles this for the operator: a
dead DSH orphan holding :3080 is reaped by recorded PID tree after an
ownership check on its command line, then the cockpit is relaunched.

## 21.10 The sandbox does not survive a Temp cleanup — \[Addendum\]

**\[Addendum\]** Discussion \#758: the Windows ACL runner's per-session
temp directory is never recreated, so one Storage Sense pass disables
workspace-write on every later session until the directory is rebuilt by
hand. Detail and mitigations in §18.2; reproduction is T-16. This is the
kind of fault that looks like a harness regression and is actually
housekeeping.

## 21.11 A single-slot server under a multi-agent harness — \[Addendum\]

**\[Addendum\]** Everything measured here was parallel: 1. DSH mounts
tool-subagent and tool-subagent-control by default, and a parent plus
two subagents is three concurrent requests against one slot —
serialised, with the §10.2 time-to-first-token figures stacking. Raising
parallel multiplies the preallocated KV (§8.4) by the slot count, which
is affordable on Vulkan for this model (≈5.6 GB per slot at 131 K) and
not on ROCm (§10.4). T-11 measures it; until then, subagent-heavy
sessions should expect latency rather than failures.

## 21.11b Sampling and template parameters are accepted and silently ignored — \[v2.1\]

`chat_template_kwargs` values — both `reasoning_effort` and `enable_thinking` — are
**accepted by the endpoint and have no effect** (§12.6, measured over 60 runs). They
are never rejected, so nothing surfaces the fact that the request was discarded.

Treat any tuning knob passed through `chat_template_kwargs` on this stack as
**unverified until measured**. The general rule this report keeps arriving at
applies here too: a parameter being accepted is not evidence it is honoured.

**\[v2.7\]** Nuance from §12.6b: the **top-level** `reasoning_effort` field IS
honoured — deterministically (`none` → 0 reasoning tokens) — while
`chat_template_kwargs` remains discarded. The rule stands; the inventory of
live-vs-dead parameters now has one measured entry on each side.

## 21.12 Bundled competitor tooling carries a licence caveat — \[v2.1\]

Not a defect, but it belongs on the record before anything here becomes a product.
`packages/subagent/subagent-claude-code` pins **`@anthropic-ai/claude-agent-sdk 0.3.220`**,
whose optional platform packages "each carry the official **Claude Code 2.1.220
executable**". `THIRD_PARTY_NOTICES.md` states, verbatim:

> "The project owner authorizes distribution of every version of the official
> `@anthropic-ai/claude-agent-sdk` package and the official Claude Code CLI/platform
> payloads that each version declares through `optionalDependencies`. **This
> identity-scoped authorization does not classify their declared terms as
> permissive** and does not cover any unrelated runtime package…"

The subagent also exposes a `permissionMode` whose `bypassPermissions` value
"explicitly skips permission checks" (`subagent-claude-code/src/index.ts:50`).

**Impact on this build: none today.** §6.4 records `subagent-claude-code` and
`subagent-codex` as **not in the stock web composition**, and §18.5.2's stacking
uses `tool-subagent` with `provider: spawn`, not these bundles. The caveat applies
only if they are deliberately enabled — at which point a redistribution question
arrives that this report is not competent to answer. **Not a lawyer; flagging, not
advising.**

## 21.13 Two machine states in the record — what is and is not imported \[v2.3\]

This machine was used twice. **Before** the clean-room reset it ran an earlier
halo-stack deployment (DSH rc.7, 65 K context, a different runtime and model
roster). **After** the reset, the investigation in this report was conducted
against the current stack (0.1.1-rc.2, LM Studio, Q5_K_XL at 131 K, Vulkan). The
full session transcript spans both, so numbers from the two states sit near each
other in the record and are easy to conflate. **They are not interchangeable.**

The pre-reset deployment produced real first-party performance numbers — for
example a dense-vs-MoE decode comparison (≈26.9 vs ≈90.9 tok/s) and harness-session
prefix-cache TTFT figures (≈108.6 s → ≈13.4 s). **None of those are imported into
this report's current-stack tables**, for three reasons: they were taken on a
superseded runtime and context configuration; they predate the benchmark-hygiene
discipline (unique nonce, discarded warm-up, no concurrent access) that §10 and §17
require; and at least one targets a different model than the outstanding test it
would appear to close (T-1 specifies `qwen3.6-35b-a3b`; the pre-reset worker was a
different coder MoE).

The rule this report follows, stated once so it is not re-litigated: **operator-
selected *behavioural* evidence may be imported across the reset — §12.8 was, by
explicit choice — but *performance numbers* from the pre-reset state may not be,
because a throughput figure is only meaningful attached to the exact runtime,
context, and hygiene that produced it.** If those measurements are ever wanted in a
current-stack form, the path is to **re-run them on this stack** (that is what T-1
and T-11 are for), not to copy the old numbers forward.

## 21.14 The pointer rule — a fence is not an eraser \[v2.4\]

§21.13 correctly fences pre-reset numbers out of current-stack tables. This
revision adds the missing half of that rule: **when a result is fenced out,
every successor summary must carry a dated pointer to the fenced record — its
date, stack version, and artifact path — never a bare "untested" or
"unknown".**

The incident that makes this a rule: the 2026-08-17 Code Mode bench (§17.4)
was fenced by §21.13, the pointer was dropped in the follow-on documents, T-12
hardened into "never exercised", and the operator had to recover his own
result from an archived transcript. The fence held; the record was
functionally lost. A fenced record is still a record. Cite it with its fence
on, or the program re-buys knowledge it already paid for.

## 21.15 The model's success claim is not evidence \[v2.5\]

All four cells of the §12.12 battery **reported success. None had earned
it.** One claimed to have modified files it never integrated; another
reported "all falsification checks passed" over a suite with one failure and
ten errors. This is the cleanest measurement yet of a failure mode this
program keeps meeting (§12.10's unwritten self-report, the grader-fairness
discipline in §17.2): **the model's prose about its own work is marketing,
not telemetry.**

Standing rule: **only external test evidence completes a task.** The
repository's own tests plus an acceptance suite the worker cannot rewrite,
run outside the model's control, with failures fed back verbatim. T-29
builds this gate; §19.1 makes it mandatory for the build lane.

## 21.16 Absolute POSIX paths under full access land at the drive root \[v2.5\]

During §12.12's preflight, a model emitted `/civicledger/...` paths and —
under `danger-full-access` — Windows resolved them to **`C:\civicledger`**:
writes at the drive root, outside any workspace. The two affected preflight
attempts were excluded; the valid battery ran under `workspace-write` with
explicit root-leak guards, and no valid cell wrote outside its workspace.
The stray folders were removed after their process trees were stopped and
the evidence preserved.

Rule: **benchmark and unattended runs use workspace isolation plus a
root-leak check** (assert nothing new exists at the drive root after the
run). Full access remains the operator's interactive posture (§19.1); this
risk is about what an unattended model's POSIX-style path habits do with it.

# 22. Build Now / Experimental / Watch / Reject

| **Decision** | **Item** | **Rationale** |
|:---|:---|:---|
| **BUILD NOW** | DSH 0.1.1-rc.2, web profile, stock composition | 133 plugins compose cleanly; Windows is first-class |
| **BUILD NOW** | dsh-llm-pi-ai → LM Studio via openai-completions | verified working; no compat block needed |
| **BUILD NOW** | Sandbox left at workspace-write | already the default; Windows backend is genuine |
| **BUILD NOW** | Leave the shell seam **unpatched** | §6.5 — tool-bash is already disabled on win32 at three layers |
| **BUILD NOW** | **[v2.1]** Keep the `bash` shim at `~\.local\bin` | §6.8 — the MS alias silently drops `-c` args and piped stdin; the shim scores 9/9 |
| **BUILD NOW** | Qwen3.8-27B UD-Q5_K_XL @ 131,072 context **\[v2.4\]: the standing agent load is now 32,768** (§19.1); 131 K remains measured and available for long-context work — redeclare `contextWindow` on every reload | resident, measured, 26.73 GB, VL + tool use |
| **BUILD NOW** | LM Studio as the serving layer | only option offering runtime switching |
| **BUILD NOW** | **Vulkan** as the llama.cpp backend | §10 / §10.6 — chosen on **memory shape and stability**, not a blanket speed claim: Vulkan's footprint is flat where ROCm's is larger and grows with prompt size, and Vulkan decode is faster and steadier from 32 K upward. ROCm keeps a real prefill advantage at short-to-moderate context; the confounded 45 K parity rung is not used to justify the call |
| **BUILD NOW** | VGM left at **64 GB** | §8.3 — nothing measured is limited by it |
| **BUILD NOW** | pnpm dlx, never npx, on this box | §21.2 |
| **BUILD NOW** | Install ripgrep (scoop install ripgrep) | cheap insurance for tool-fs-search |
| **BUILD NOW** | **\[Addendum\]** Windows pre-flight: LongPathsEnabled=1, git config core.longpaths true; Developer Mode only if pnpm reports symlink failures | cheap, Windows-specific, absent from the original sequence (Gemini report) |
| **BUILD NOW** | **\[Addendum\]** Exclude the dsh-\* temp directory from Storage Sense and cleanup schedules | Discussion \#758 — a Temp purge disables the sandbox until repaired by hand (§18.2) |
| **BUILD NOW** | **\[Addendum\]** Native Win32 binaries only inside the sandbox (rg.exe, fd.exe, git.exe); Git\cmd on PATH | \#758 CIM finding; the Gemini report's MSYS claim is unverified (T-16) |
| **EXPERIMENTAL** | ROCm at a **32 K context limit** (T-10) | its 1.85–2.92× prefill win is real at 1.5–11 K tokens; the open question is whether the footprint stays safe |
| **EXPERIMENTAL** | MoE worker model for subagents | §13.2 argument is sound but unmeasured (T-1) |
| **EXPERIMENTAL** | gpt-oss-120b for deep reasoning | capacity and usefulness unverified (T-2) |
| **EXPERIMENTAL** | **\[Addendum\]** DeepSeek-V4-Flash-0731 lowest-bit GGUF (T-2b) | the harness's home model; the VGM-96 case; open weights and GGUFs verified |
| **EXPERIMENTAL** | **\[Addendum\]** Qwen3-Coder-Next as primary-agent contender (T-13) | 80B-A3B hybrid, 262 K native, Apache 2.0 — §13.2's argument applied to a coder |
| **EXPERIMENTAL** | **\[Addendum\]** FastFlowLM NPU lane for embeddings / reranker / helper (T-15) | runtime verified to exist for Strix Halo; value to DSH unmeasured |
| **EXPERIMENTAL** | **\[Addendum\]** parallel 2–4 server profile for subagent sessions (T-11) | single-slot server versus a multi-agent harness (§21.11) |
| **EXPERIMENTAL** | mcp-client, lsp, subagent-codex | not in stock composition; Windows status UNKNOWN |
| **EXPERIMENTAL** | llama-bench for clean microbenchmarks | measurement tooling, not production |
| **EXPERIMENTAL** **\[Revised\]** | XDNA 2 NPU for embeddings / rerank / ASR | **\[Revised\]** a runtime now exists (FastFlowLM, §14); the bandwidth argument stands; value to DSH unmeasured (T-15) |
| **WATCH** | Lemonade | NPU/hybrid path; revisit if the NPU story changes |
| **BUILD NOW** | **[v2.1]** Subscription auth via OAuth where declared — `anthropic`, `openai-codex`, `xai`, `github-copilot`, `kimi-coding`, `openrouter` | §18.5.5 — 8 of 43 providers ship OAuth; no key needed for those. Use `openai-codex` for ChatGPT, not plain `openai` |
| **BUILD NOW** | **[v2.1]** API-key auth retained for the Chinese providers, preferably via `apiKeyEnv` | §18.5.5 — `deepseek`/`moonshotai`/`zai`/`minimax`/`qwen-*` are key-only; env-var form keeps secrets out of settings |
| **BUILD NOW** | **[v2.1]** Cloud providers from the shipped 37-provider catalog, added via Settings → Models | §18.5.1 — zero build; every vendor required is already catalogued |
| **BUILD NOW** | **[v2.1]** Model stacking via multiple `tool-subagent` instances (`toolName` + `agentOptions`) | §18.5.2 — declarative, shipped, auditable in the trajectory view |
| **REJECT FOR NOW** | **[v2.1]** A task→model auto-router | §18.5.3 — proven absent from DSH, and the structural roster delivers the same outcome without an unauditable component |
| **EXPERIMENTAL** | **[v2.1] PyTorch on native Windows** (`torch[device-gfx1151]==2.12.0+rocm7.14.0`) | §9.4 — AMD publishes it; documentation-verified, not yet run here (T-18). Unlocks fine-tuning without WSL |
| **WATCH** | **[v2.1]** DFlash 2 (drafter improving on MTP) | Needs unmerged branches (llama.cpp PR 27342, vLLM branch); LM Studio ships tagged runtimes only. 24 GB-card owners report ~10 % over MTP paid for in context. Given §12.4's 1.5× MTP ceiling here, expect less. Revisit when the PR lands in a tagged release |
| **REJECT FOR NOW** | **[v2.1]** `subagent-claude-code` / `subagent-codex` bundles | §21.12 — not in the stock composition, and enabling them redistributes a ~256 MB Claude Code payload under a notice stating the terms are **not permissive** |
| **WATCH** | **[Revised v2.1]** vLLM / SGLang native Windows on gfx1151 | UNKNOWN; PyTorch's availability does not imply theirs |
| **WATCH** | VGM at 96 GB | only if a \>55 GB resident model becomes worth it |
| **REJECT FOR NOW** | Custom routing middleware | no measured benefit; DSH already switches models |
| **REJECT FOR NOW** | Windows Insider builds | no identified gain; loses a certified configuration |
| **REJECT FOR NOW** | Converting to Linux / WSL-primary | out of scope and unnecessary |
| **REJECT FOR NOW** | Ollama | strictly worse here than what is installed |
| **REJECT FOR NOW** | Tracking DSH latest automatically | nine-day-old prerelease software |
| **BUILD NOW** | **\[v2.4\]** `contextWindow` declared on every hand-entered model, equal to the loaded context | §18.1 amendment — one line; kills the death-at-window class (§12.10); runtime verification T-28 |
| **BUILD NOW** | **\[v2.4\]** Standing config: 27B @ 32,768 agent + Coder-30B @ 16,384 resident worker | §19.1 — operator decision 2026-08-25; every big-build success at 32 K; two-resident validated (§12.11) |
| **BUILD NOW** | **\[v2.4\]** Computer-forced cadence brief (`AGENTS.md`) for big autonomous builds | §12.10 — the 15/15 recipe, 1/1; replication R2′ queued; decomposition is the fallback |
| **BUILD NOW** | **\[v2.4\]** Second resident model as the LLM seat for anything-under-test | §12.11 — eliminates the single-slot deadlock class (414 s → 7.5–12.3 s) |
| **REJECT FOR NOW** | **\[v2.4\]** Code Mode as a default **\[v2.5\]: for small interactive work only** | §17.4 — lost on a small task (65 s vs 41 s, rc.7). **\[v2.5\]** On hard repository work the verdict inverts (§12.12) — see the build-lane rows below |
| **BUILD NOW** | **\[v2.5\]** Coder-30B in **Code Mode @ 32 K** as the implementation lane for large builds | §12.12 — beat Standard on a hard task (5/9 vs 3/9; 5/9 vs 0/9), fewer turns, works with verified compaction; operator decision 2026-08-25 |
| **BUILD NOW** | **\[v2.5\]** External **verifier-and-repair gate** on all worker output (T-29) | §21.15 — all four 2×2 cells falsely claimed success; only test evidence completes a task |
| **BUILD NOW** | **\[v2.5\]** Root-leak guard on unattended runs | §21.16 — POSIX-style model paths land at `C:\` under full access |
| **REJECT FOR NOW** | **\[v2.5\]** 64 K worker window | §12.12 — slower, no correctness gain, and it takes working compaction out of the loop |
| **BUILD NOW** | **\[v2.6\]** Per-lane `DSH_HOME` for model pinning | §18.6 — the only pinning that held; composition and patches lose to the settings user layer |
| **BUILD NOW** | **\[v2.6\]** Evidence rules: `Check-Done.ps1` (no gate-log, no done) + stamped ungated probes | §19.3 — enforcement at the evidence layer; launch locks on an all-access box are theater |
| **BUILD NOW** | **\[v2.6\]** Standing cockpit routing persona (builds → the gate) | §19.3 — chat-safe routing; seam verified by source + live sentinel before wiring |
| **BUILD NOW** | **\[v2.6\]** "Halo Cockpit" desktop launcher as the only operator surface | §19.3 — operator decision: point-and-click only; CLI/headless reserved for agent lanes |

# 23. Installation sequence

Non-destructive, in order, with a rollback for every step that changes
anything.

| **\#** | **Step** | **Rollback** |
|:---|:---|:---|
| 0 | **\[Addendum\]** Pre-flight: set LongPathsEnabled=1 and git config core.longpaths true; enable Developer Mode only if pnpm reports symlink failures; record pagefile and hibernation settings; exclude the dsh-\* temp directory from Storage Sense | revert the registry value and git setting; remove the exclusion |
| 1 | Record the baseline (machine-baseline.txt, dxdiag, clinfo, vulkaninfo, lms ps --json) | — |
| 2 | Confirm Windows 25H2 / build 26200 and driver 32.0.31035.1003 **\[Addendum\]** Decide here whether to move to Adrenalin 26.8.1 (2026-08-20); if so, update before step 6 so the ladder re-baselines on the new driver. | — |
| 3 | **Leave VGM at 64 GB** — verify, do not change | Adrenalin → Performance → Tuning → System |
| 4 | Confirm **Vulkan** is the selected runtime (lms runtime ls) — §10's verdict | lms runtime select |
| 5 | *(optional, experimental)* Install the ROCm runtime for the T-10 experiment only | lms runtime remove |
| 6 | Re-run the §17.2 Tier-1 ladder to confirm the machine matches §10's baseline | — |
| 7 | scoop install ripgrep | scoop uninstall ripgrep |
| 8 | Launch DSH: pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" web | nothing persisted until settings are written |
| 9 | Write the §18.1 provider block into \$DSH_HOME/settings.yaml; set LMSTUDIO_API_KEY | delete the provider entry |
| 10 | Confirm via --dump-config that tool-bash carries a disabled key and tool-pwsh is active — **no patch to write** (§18.3) | — |
| 11 | Select the local model in the DSH UI | re-select any other model |
| 12 | Run the §17.3 acceptance criteria **including criterion 6 (network disconnected)** | — |
| 13 | Run Tier-2 agent tasks; record tool-call reliability | — |
| 13a | **\[Addendum\]** Run T-11 (parallel 2 / 4 with subagents), T-12 (Code Mode — **\[v2.5\]** resolved on the current stack, §12.12), T-16 (the \#758 sandbox modes) | — |
| 14 | Add the MoE worker model; re-run T-1 | lms unload |
| 14a | **\[Addendum\]** Contender and capacity experiments: T-13 Qwen3-Coder-Next; T-2b DeepSeek-V4-Flash-0731 at VGM 96; T-15 FastFlowLM | lms unload; VGM back to 64 GB |
| 15 | Freeze: record every version, commit the evidence directory | — |

**Do not perform step 9 before step 6.** Choosing a backend after
configuring the harness means re-validating the harness against a
changed serving layer.

# 24. Community and upstream evidence

## 24.1 Real-world DSH + Strix Halo evidence — the honest position

**Category A — directly demonstrated DSH on Strix Halo.** **None
found.** No firsthand report was located of DeepSeek Harness driven by a
local model on Ryzen AI Max / Radeon 8060S hardware. Given DSH is **nine
days old** at the time of writing, this is expected rather than
surprising. It should not be papered over: **this report's end-to-end
architecture is not something the community has already validated.**

**Category B — demonstrated components that compose.** This is where
most of the evidence sits, and it is strong:

- DSH's OpenAI-compatible provider seam is verified **in source** and
  its two documented gateway incompatibilities were **tested live
  against LM Studio and both passed** (§11.1).

- llama.cpp on gfx1151 under both Vulkan and ROCm is verified **on this
  machine** (§10).

- Qwen3.8-27B at Q5_K_XL / 131 K context is verified resident and
  serving **on this machine**.

**Category C — architectural hypothesis.** The MoE-worker argument in
§13.2 and the gpt-oss-120b reasoning role are reasoned from measured
bandwidth behaviour but **not yet measured** (T-1, T-2).

## 24.2 Upstream project signals

| **Signal** | **Finding** |
|:---|:---|
| **Issues are disabled** | has_issues: false. There is **no public bug tracker**. All reports go through Discussions (4,117 of them, 816 watchers). |
| Release cadence | 4 releases in 6 days, all prereleases |
| Community plugin ecosystem | Already active — dsh-session-export, dsh-local-ai (an Ollama adapter), dsh-budget, dsh-click ("Windows first"), dsh-fast, migration tools from Claude Code / Codex / OpenCode |

## 24.3 Upstream-reported defects relevant to this build

| **Report** | **Relevance** | **Status at b150a551** |
|:---|:---|:---|
| **Subagents use the model snapshotted at parent-agent creation, not the currently selected model** (discussion 3377) | **Direct.** A local-provider setup plus subagents can fail this way. | **Not verified as fixed.** Treat as live — see §21.7 |
| **All POST /api/\* return 403** — trust-fence compared new URL(origin).host against the Host header, and WHATWG drops default ports (discussion 2009) | Would break the whole UI | **Appears FIXED.** packages/client/connection/src/api-request-trust.ts at the pinned commit uses canonical-authority comparison with explicit port semantics |
| **Orphaned dsh web process holds port 3080; no stop/restart subcommand** (discussion 2933) | Operational friction | **Live.** The CLI at the pinned commit exposes no --stop/--restart |
| sandbox-windows-acl gates on resolvePwshPath but launches literal pwsh, "so escape-regression tests silently never run" | **Direct** — bears on §18.2's partial enforcement | Reported upstream; not independently verified here |
| Hook bridge suites mount LocalBashExecutor unconditionally | A **test-coverage** gap, not a runtime one — consistent with §6.5, where the runtime rows are correctly win32-gated but the suites do not model that | Reported upstream |
| DSH_SNAPSHOT=refresh writes literal cwd paths on Windows | Windows path handling | Reported upstream |
| **\[Addendum\]** Windows ACL sandbox permanently unusable after a Temp cleanup; restricted token blocks WMI/CIM; UAC elevation fails silently; PowerShell restricted-language-mode init errors (discussion 758, 2026-08-14) | **Direct.** §18.2, §21.10; acceptance criteria 8–9; T-16 | **Not verified as fixed.** Treat as live |

## 24.4 Community benchmark evidence, and why this report measured its own

Community reports on Strix Halo backends, recorded with their claims
**\[community\]**:

- ROCm ≈ **+20.6 % prompt processing** and ≈ **−24.6 % generation**
  versus Vulkan.

- ROCm with rocWMMA Flash Attention holds throughput "with almost no
  drop-off" past 8 K context, "while using less memory than Vulkan".

- GGML_HIP_NO_VMM=ON is described as necessary because HIP VMM
  misbehaves on this GPU.

- Dense 70B ≈ 5 tok/s; 7–13B ≈ 30–45 tok/s; 30B-A3B MoE ≈ 70–100 tok/s.

**Methodology warning.** These figures come from different models,
quantizations, context lengths, llama.cpp versions and operating
systems, and several do not state whether they measured Linux or
Windows. They are **not** directly comparable to each other, and they
are not comparable to §10 — which used one model, one quantization, one
llama.cpp version (2.29.1), one OS, and one machine, changing **only**
the backend.

Where §10 and community evidence **agree**: ROCm wins prefill, Vulkan
wins decode.

Where §10 and community evidence **disagree**: the claim that ROCm "uses
less memory than Vulkan" is **contradicted on this machine** — see
§10.4. The likely explanation is that the community claim concerns
Linux, where AMD's GTT-based memory model applies; this box is Windows,
where §8.2 shows the memory model is materially different.

**\[Addendum\]** **Where the community evidence lives.** The
\[community\] claims above were recorded without links. The Codex report
carried the source list; it is reproduced in §28 Tier 4 so each claim
can be re-checked: the strix-halo-guide, strix-benchmarks and
strix-halo-llm-perf repositories; llama.cpp discussion 27047 (Windows
ROCm builds for gfx1150/gfx1151) and issue 26929; ROCm issue 5339
(gfx1151 support); AMDVLK issue 420; and the lilting.ch
Lemonade-on-Strix-Halo verification.

## 24.4b Independent corroboration on identical silicon \[v2.2\]

§24.4 recorded that community benchmark evidence was thin enough that this report
measured its own. Four recorded operator sessions have since been examined, two of
them on **Ryzen AI Max+ 395 hardware with 128 GB unified memory** — the same chip
as this report's target. They are labelled **\[community\]** and were not used to
revise any first-party measurement. They corroborate three figures and answer one
open test.

**Decode rate — corroborated.** An operator running Qwen3.8-27B **Q4** under
Unsloth Studio on **Linux** reports **16 tok/s** driving DSH. §12.4 measured
**16.05 tok/s** on **Q5_K_XL** under LM Studio on **Windows**, Vulkan, MTP on.
Different OS, different server, different quant, **same number**. This is the
strongest external check available on §10 and §12.4, and it carries a second
implication: that operator is on Linux, where ROCm is best supported, and lands
where this machine lands on Vulkan. **§10.5's backend choice is not costing
throughput.**

**Capacity — T-2 answered from outside.** §13.2 records gpt-oss-120b at 63.39 GB
as the largest model present, and question 29 asks what the machine can run
*usefully*, marked **not yet measured, T-2**. An operator ran gpt-oss-120b on a
128 GB Strix Halo against a machine with **two RTX 3090 Ti (48 GB VRAM, 1500 W)**:

| | Strix Halo (230 W) | Dual RTX 3090 Ti (1500 W) |
|:---|---:|---:|
| gpt-oss-120b decode | **46.9 tok/s** | 13.77 tok/s |

**A 120B MoE runs at nearly 47 tok/s here** — comfortably interactive, and 3.4× a
dual-3090 machine drawing six times the power. This confirms §13.2's central
claim that *active* parameters, not file size, decide usefulness. T-2 remains open
as a first-party measurement, but its expected answer is no longer unknown.

**The competing appliance — NVIDIA DGX Spark, same model, measured by an operator
\[community\].** DGX Spark is the device Strix Halo is most often marketed against,
and one operator ran **Qwen3.8-27B** — the model in §12 — on it:

| Qwen3.8-27B | DGX Spark \[community\] | This machine, measured |
|:---|:---|:---|
| Single user, decode | **15–20 tok/s** | **16.05 tok/s** (§12.4) |
| Concurrent users | **60–70 tok/s** aggregate | single-slot; `parallel: 1` (§21.11) |
| Full context + concurrency | required **two units, clustered** | one box (§8.4) |

Three conclusions, and they do not all favour the same machine:

1. **On single-user decode the two are level.** 16.05 tok/s sits inside the
   operator's 15–20 band on the same model. Whatever premium the competing
   appliance carries, it does not buy single-stream speed on this workload.
2. **On concurrency the DGX Spark wins outright**, reaching 60–70 tok/s aggregate
   where this machine serves one slot. §21.11 already flags single-slot serving as
   a real constraint under DSH's subagent tool, and **T-11 is the test that sizes
   it.** This is the clearest external evidence that T-11 matters.
3. **On capacity per box this machine wins.** The operator clustered **two** DGX
   Sparks specifically to hold the full context window alongside concurrent
   requests. This machine's 128 GB does the context on one unit — §12.3 runs
   131,072 and another operator runs 262,144 (§24.4b above).

The honest summary is that these are different shapes of machine at a similar
single-user speed: **one scales out to serve several callers, the other holds more
in one box for one caller.** §19's architecture is single-operator, which is the
side this machine is strong on.

**Ecosystem maturity — corroborated, and it is not flattering.** The same operator
bought the machine, put Ubuntu 24.04 on it, and reports that everything beyond text
LLMs — image generation, video generation, vision-language work — is propped up by
community effort rather than vendor support, requires a manual unified-memory setup
step, and remains unreliable after sustained troubleshooting. That is §9's
conclusion reached independently from the Linux side. He credits AMD engineers as
visibly responsive on issue trackers, which §9 did not capture and which is a
genuine positive signal.

**Two configuration defects, reported independently by two operators.** Both belong
in §18.1 and cost both of them time:

1. **A custom provider's API-key field cannot be left blank**, even for a local
   server that ignores the value entirely. Any placeholder works.
2. **Models must be registered by NAME, not by ID.** An ID yields a 404. The
   interface's "fetch models" control populates the correct names.

## 24.4c An external research pass, cross-checked citation by citation \[v2.7\]

An operator-commissioned research pass (2026-08-25, web-search based, no
access to this machine) independently recommended a two-model stack matching
§19.1/§19.3 — 27B planner + Coder-30B worker, 32 K both, Vulkan first, worker
in Code Mode. That convergence is itself evidence the architecture is right.
Its 13 citations were each fetched and checked against the exact claim made
(§21.15 applied to research prose): **12 verified, 1 failed, 1 partial.**

| # | Source | Claim checked | Verdict |
|---|---|---|---|
| 1 | AMD playbook (developer.amd.com, vscode-qwen3-coder) | Qwen3-Coder-30B via LM Studio; "change the context length… to 32768"; max GPU offload; "64GB… sufficient for most workloads", 96 GB "may help"; targets Ryzen AI Halo | **VERIFIED** — vendor-official blessing of the §19.1 worker/window combo |
| 2 | Qwen3.8-27B model card (HF) | agentic gains; `reasoning_effort` xhigh (default) / medium / low; 262,144 native | **VERIFIED** |
| 3 | S. Willison (substack) | Q4_K_M on a 128 GB M5 Max + DGX Spark; "the default of extra high results in spectacular over-thinking"; 22,276 reasoning tokens for one SVG | **VERIFIED** \[community\] |
| 4 | QwenLM/Qwen3.8 issue #216 | xhigh: 18/93 empty answers (**19.4 %**); low 0/47, medium 0/48 | **VERIFIED** \[community\] — external replication of the §12.5 class |
| 5 | QwenLM/Qwen3.8 issue #217 | template accepts xhigh/medium/low only; `high` → **HTTP 500** (Claude Code via vLLM) | **VERIFIED** \[community\] — also proves the template processes the field |
| 6 | Qwen3-Coder-30B-A3B card (HF) | 30.5 B total / 3.3 B active; agentic; **non-thinking** ("does not generate `<think>` blocks") | **VERIFIED** — the §12.6b lever is cockpit-only by construction |
| 7 | strix-halo-guide BEST_KNOWN_PROFILES | coder UD-Q4_K_XL 96.76 tg128, Q4_K_S 100.99 (Linux Vulkan/RADV); Qwen3.8 retrieval pass at 50,059 tokens; **Vulkan device-loss at 56,051** | **VERIFIED** \[community\] — independent support for 32 K |
| 8 | strix-halo-guide BACKEND_CROSSOVER | coder: HIP **+32.3 %** prompt processing, Vulkan **+24.7 %** generation | **VERIFIED** \[community\] — §10's shape reproduced on the worker model |
| 9 | strix-halo-guide issue #3 | "a Windows MS-S1 Max owner ran LM Studio 0.4.15… 89.49 tok/s… raw evidence" | **FAILED** — the page is a benchmark *request* containing no results. Not imported; recorded because research prose is not evidence either |
| 10 | DSH provider docs | `compat` block (`supportsDeveloperRole`, `maxTokensField`) | **PARTIAL** — compat documented as claimed, but unneeded here (§11.1 measured both probes passing on LM Studio); `reasoningEfforts` is **not** on that page — it exists in source only (§12.6b) |
| 11 | LM Studio 0.4.0 announcement | parallel serving / continuous batching; "Max Concurrent Predictions" | **VERIFIED** — bears on T-11 |
| 12 | lmstudio-bug-tracker #1790 | Win11 Strix Halo 128 GB: "model loading fails once memory usage gets to approximately 64GB" despite VGM 96 (Vulkan, 120B model) | **VERIFIED** \[community\] — a documented wall across T-2b's path; independent support for §8.3's keep-64 verdict |
| 13 | lms issue #589 | ROCm runtime mis-enumerates VRAM in **Auto** VGM mode (near-zero reported); workaround exists | **VERIFIED** \[community\] — T-10 caution |

Also in that research, rejected despite verified citations because this
machine's own measurements say otherwise: the `compat` block (§11.1 measured
it unnecessary), VGM 96 as default (§8.3 — reinforced by its own item 12),
and a Q4_K_M planner downgrade (§12.3's Q5 dead-heat; memory is not scarce at
32 K).

## 24.5 The harnessed-agentic-RL literature, and why it is closed here \[v2.2\]

arXiv **2608.17528**, *Agent Lightning v1.0: Towards Harnessed Agentic RL*
(submitted 2026-08-18), argues that the agent harness is not neutral scaffolding
but a component that should participate in post-training. It reports **Qwen3.5-9B
on SWE-bench Verified rising 41.8 % → 56.4 %, +14.6 points, from 6,000 training
examples**, in roughly 3,500 lines of released code. The full paper and its 34-item
reference list were read; six references are load-bearing systems and the rest are
datasets, benchmarks, and model reports.

**The architectural point transfers.** Agent Lightning connects arbitrary agents to
training through an **LLM endpoint proxy** — the agent is a black box that makes
model calls, and the proxy records and reconstructs them. DSH already exposes this
seam: `dsh-llm-pi-ai` supports per-provider *and* per-model `baseURL` (§18.1).
**The stack this report recommends is structurally compatible with this class of
work**, and nothing would need to be built to participate in it.

**The training half is unavailable.** Every system in the graph assumes a cluster:

| System | Reference | Blocking requirement |
|:---|:---|:---|
| Agent Lightning v1.0 | 2608.17528 | Bridges "a GPU cluster running model inference and training" to an agent-execution cluster; Kubernetes integration |
| Polar | \[14\] 2605.24220 | Same black-box proxy at rollout-node scale; trained Qwen3.5-4B |
| slime | \[10\] THUDM/slime | Megatron + SGLang + **NCCL** — NVIDIA collective library |
| verl / HybridFlow | \[8\] 10.1145/3689031.369607 | ROCm **is** supported — **MI300X / MI325X / MI355X only**, vLLM as validated engine |
| AReaL, AReaL 2.0 | \[9\] 2505.24298, \[13\] | Same asynchronous cluster class |
| Agent Lightning v0 | \[11\] 2508.03680 | Training-agent disaggregation; hardware unspecified |

verl is the near-miss and deserves precision: **AMD ROCm support is real, but the
validated devices are datacenter accelerators. `gfx1151` is not among them**, and
the validated inference engine is vLLM, which this report has not established here.

**Conclusion: reinforcement-learning post-training is not available on this
hardware and should not appear in any roadmap for it.** Recorded so the question is
not reopened. What survives is the architectural note above, and one training-free
result from the same citation graph — reference \[20\], arXiv 2601.16206 — which
proved consequential enough to be measured directly and is reported in **§12.7**.

**Instrument and blind spot.** This rests on the six systems' abstracts and
documentation plus the full Agent Lightning PDF. It does **not** rest on attempting
an installation of any of them. The claim is *"published requirements exclude this
device,"* not *"installation was attempted and failed."*

# 25. The forty required questions, answered directly

| **\#** | **Question** | **Answer** |
|:---|:---|:---|
| 1 | Does current DSH run **well** natively on Windows 11, not merely launch? | **Yes.** Windows is a first-class target — 865 win32 references, 555 pwsh, a real Win32-FFI sandbox, **zero** WSL references, and the shell seam is platform-gated at three independent layers (§6.5). One genuine caveat remains: Windows sandbox enforcement self-reports **partial**, not full (§18.2). **\[Addendum\]** Second caveat, from Discussion \#758: the sandbox does not survive a Temp cleanup (§18.2). |
| 2 | What DSH capabilities are weaker or unavailable on Windows? | tmux-context (tmux does not exist natively); sandbox enforcement is partial, not full. lsp, mcp-client, e2b, subagent-codex are **UNKNOWN** — none is in the stock composition. **tool-bash is not on this list**: it is deliberately disabled on win32, with tool-pwsh active in its place (§6.5). **\[Addendum\]** From Discussion \#758: the sandbox is disabled by a Temp cleanup until repaired by hand, and the restricted token blocks WMI/CIM from the sandboxed PowerShell tool (§18.2). |
| 3 | How many actual first-party runtime plugins/capabilities does DSH contain? | **227** packages exist; the CLI declares **62** direct dependencies; the stock web profile composes **133**; headless composes **78**. §4.3. |
| 4 | How many work natively on Windows? | Of the 133 composed, **no Windows-specific failure was identified**. The two previously flagged (tool-bash, bash-sandbox) turned out to be correctly disabled on win32 rather than broken (§6.5). Stated precisely: the profile composes and boots, and the high-risk packages were individually checked — **all 133 were not individually exercised**, so this is "none found", not "all verified". |
| 5 | Can DSH reliably use local OpenAI-compatible inference servers? | **Yes, out of the box.** dsh-llm-pi-ai implements openai-completions, openai-responses and anthropic-messages, takes a baseURL override per provider *and* per model, and discovers models via GET {baseURL}/models. |
| 6 | Which local server gives DSH the best experience on Strix Halo today? | **LM Studio.** §11.3. |
| 7 | Is LM Studio the best choice, or merely the easiest? | **Best, on the merits.** It is the only candidate that switches the llama.cpp execution backend without a rebuild — decisive on a platform where Vulkan-vs-ROCm is workload-dependent. |
| 8 | Is Lemonade currently advantageous on this hardware? | **No, not for the primary path.** Its edge is NPU/hybrid execution, and §14 finds no NPU role today. **WATCH.** |
| 9 | Is direct llama-server preferable? | **No for serving; yes for measurement.** llama-bench isolates prefill far better than an HTTP ladder. |
| 10 | Does Vulkan outperform ROCm on relevant Windows llama.cpp workloads? | **[Revised v2.1] On decode, yes, but modestly** — +14.4 % at 8 K (only **2.2 sd**, suggestive) and +25.6 % at 32 K (5.3 sd, decisive), at n=4. Its bigger edge is **consistency**: decode cv **1.5 %** vs ROCm's **9.0 %**. And on **memory**: 29.35 GiB vs 46.60 GiB at a matched 32 KB workload, flat where ROCm's grows. §10, §10.6. |
| 11 | Where does ROCm outperform Vulkan? | **[Revised v2.1] Prefill, decisively** — **2.93×** to first token at 1.5 K tokens (179 sd), **2.09×** at 5.7 K (98 sd), **+61.5 %** marginal throughput (23 sd), all at n=4. The most solid numbers in this report. The apparent fade to parity at 45 K tokens is **n=1 and confounded** by memory pressure — not relied upon. §10.6. |
| 12 | What portions of ROCm actually work natively on Windows today? | **[Revised v2.1]** The **HIP runtime and HIP SDK for gfx1151 on Windows 11 25H2**, llama.cpp built against them (LM Studio runtime v2.29.1), **and PyTorch 2.12.0 via AMD's `device-gfx1151` wheels** (ROCm 7.14.0). §9.3–9.4. |
| 13 | What important ROCm components are still Linux-only? | **[Revised v2.1]** The **ROCm Debugger is unsupported on RDNA 3.5**. **TensorFlow, JAX and ONNX are Windows-absent for this part** — AMD lists PyTorch as the only Windows framework for Ryzen APUs. **vLLM, SGLang and training remain UNKNOWN.** PyTorch itself is **no longer** on this list — §9.4 corrects an earlier error. |
| 14 | What does AMD's Variable Graphics Memory setting actually do? | Moves the **firmware boundary** between memory Windows can see and memory presented to the GPU as dedicated VRAM. Applied before Windows boots. Creates no bandwidth. §8.2. |
| 15 | Is approximately 96 GB a real GPU-memory ceiling? | **No.** 96 GB is the maximum *carve-out*. With VGM at 64 GB this GPU already reports **99.84 GiB** of OpenCL global memory and **111.6 GiB** of total display memory. The ceiling that actually bites is the **54.40 GiB maximum single allocation**. §8.3. |
| 16 | Can workloads practically consume more than the configured VGM amount? | **Yes — proven on this machine.** VGM is 64 GB; OpenCL global memory is 99.84 GiB. §8.3. |
| 17 | What VGM setting should this 128 GB machine use? | **Keep 64 GB.** The resident model uses 26.73 GB with **zero** shared-memory spill; nothing measured is limited by the carve-out, and 96 GB would leave Windows only ~32 GB. §8.3. |
| 18 | How much memory should remain available to Windows and DSH? | Currently 63.79 GB visible, **25.51 GB free under load**. Treat **32 GB visible as the floor** — which is exactly what the aggressive 96 GB setting would leave. §8.3. |
| 19 | Which Qwen3.8 variants exist today? | **Qwen3.8-27B** (2026-08-14, dense 27.78 B, Apache 2.0), **Qwen3.8-2.4T-A95B** (2026-08-12, MoE), **Qwen3.8-Max** (GA 2026-08-03, hosted). Only the 27B is relevant here. §12.1. |
| 20 | Which Qwen3.8 configuration is best for DSH? | **\[Revised v2.4\]** **Qwen3.8-27B, UD-Q5_K_XL, parallel: 1**, at the **standing agent load of 32,768** (§19.1) — every big-build success occurred there. 131 K remains measured and available for long-context work; redeclare `contextWindow` on every reload (§18.1). §12.3. |
| 21 | Which quantization is the best quality/performance compromise? | **Q5_K_XL.** 21.15 GB, above the Q4 range where code-generation quality degrades, without paying Q6/Q8 bandwidth on a bandwidth-bound part. §12.3; confirm with T-4. |
| 22 | What context length is actually useful? | **\[Revised v2.4\]** Two answers. Content capacity: **131,072** against a 262,144 maximum — the limit is prefill **time**, not memory (45 K tokens already costs minutes; §10, §12.3). Agent role: **32,768 is the standing load** (§19.1), measured best for autonomous builds (§12.9–§12.10). |
| 23 | How much memory does the KV cache require at 32 K / 64 K / 128 K / 256 K? | **~5.58 GB total at 131,072, preallocated at load and confirmed not to grow during a 45 K-token prefill** (§8.4). A per-window table was **not** derived — **UNKNOWN**, T-3. |
| 24 | Does Flash Attention materially improve this workload? | **Partially answered.** Community evidence attributes ROCm's long-context behaviour to rocWMMA Flash Attention **\[community\]**; §10 measures the end-to-end consequence but does not isolate FA as a variable — and notably, the flat-long-context claim was *not* reproduced here. |
| 25 | Does MTP/speculative decoding materially improve this workload? | **\[Revised v2.4\]** **Yes — measured by ablation**: decode **10.4 → 16.05 tok/s (+54 %)** with MTP on, prefill unchanged, draft acceptance 83–86 % (§12.4). Roughly **half the published discrete-GPU uplift** — do not size this machine from those figures. |
| 26 | Are ROCmFPX or similar AMD-specialized runtimes ready for normal use? | **\[Revised v2.2\] Partially answered — no, not on the selected stack.** ROCmFPX is a real, active project: a community build validated on this exact silicon (gfx1151 / Ryzen AI Max+ 395) publishes perplexity-ratio, KLD, and top-token-agreement figures against BF16. But it requires a patched llama.cpp (CIRU ROCmFPX v2.3 + a runtime patch), and `lms runtime` exposes no verb to register a custom engine, so the accelerated path is unreachable here. All gains are vendor self-reported, n = 1, and measured against the author's own prior build rather than §12.3's runtime. **WATCH; re-evaluate with T-10 and T-25.** §9.5. |
| 27 | What other local models should be installed? | An **A3B MoE worker** (qwen3.6-35b-a3b or qwen3-coder-30b-a3b), the existing **nomic embedding** model, and — experimentally — gpt-oss-120b. A **reranker is a gap**. §13.2. **\[Addendum\]** Plus two verified candidates from the other reports: Qwen3-Coder-Next (80B-A3B, primary-agent contender, T-13) and DeepSeek-V4-Flash-0731 (capacity experiment, T-2b). §13.2. |
| 28 | What is the largest model this machine can technically run? | gpt-oss-120b at **63.39 GB** is the largest present; the addressable ceiling is ~99.8 GiB with a **54.40 GiB single-allocation** hazard. §13.2. **\[Addendum\]** Largest present is not largest possible: a lowest-bit DeepSeek-V4-Flash-0731 GGUF (≈90 GB+) is the real capacity test (T-2b). |
| 29 | More importantly, what is the largest it can run **usefully**? | **Depends on *active* parameters, not file size** — a 63 GB dense model would decode near 4 tok/s and be useless interactively; a 63 GB MoE could be fine. **Not yet measured — T-2.** §13.2. |
| 30 | What makes the best primary local coding/agent model? | **Qwen3.8-27B UD-Q5_K_XL** — dense quality, native vision, trainedForToolUse, 262 K native context, and a hybrid architecture that makes long context affordable in memory. §12. |
| 31 | Which model should handle high-quality reasoning? | gpt-oss-120b, **EXPERIMENTAL** until T-2 runs. Today the 27B in thinking mode is the practical answer. **\[Addendum\]** DeepSeek-V4-Flash-0731 local is the second experimental candidate (T-2b). |
| 32 | Which smaller model for fast worker/subagent tasks? | An **A3B MoE** — qwen3.6-35b-a3b or qwen3-coder-30b-a3b. Small active-parameter count means far less memory traffic per token on a bandwidth-bound part. §13.2, T-1. |
| 33 | Should DSH dynamically route among models? | **[Revised v2.1] No auto-router — but do stack, structurally.** DSH ships no task→model router (§18.5.3, proven by search). It does ship what is needed: 37 catalogue providers, a model picker, and `tool-subagent` mountable multiple times with per-instance `agentOptions {provider, model, maxTokens}` (§18.5.2). Fix the roster in config; let the model choose by calling the tool whose name fits. Every choice is then logged and auditable. |
| 34 | Can several models remain loaded simultaneously? | **Yes.** LM Studio supports concurrent residency, and the headroom exists — 26.73 GB used of a 64 GB carve-out. Note this headroom exists *on Vulkan*; ROCm's working set removes it. §8.4, §10.4. |
| 35 | Does the XDNA 2 NPU provide a useful role? | **Not today.** No NPU runtime is offered by lms runtime on this box; the only four extensions available are CPU, Vulkan, ROCm and harmony. **WATCH.** §14. **\[Addendum\]** A runtime now exists outside LM Studio — FastFlowLM — so the NPU moves from WATCH to EXPERIMENTAL for embeddings / reranking / a small helper (T-15). Still not the primary engine. §14. |
| 36 | Are recent Windows builds materially improving Strix Halo local AI? | The material fact is **alignment**: build 26200 / 25H2 is exactly the version AMD certifies for gfx1151 ROCm support. §15. |
| 37 | Are any Insider features compelling enough to justify testing? | **No.** Nothing identified changes GPU memory allocation, ROCm availability or throughput. **REJECT FOR NOW.** §15. |
| 38 | What is the best daily-driver configuration? | **\[Revised v2.4\]** The §19.1 stack: stock DSH web profile → LM Studio :1234 → llama.cpp 2.29.1 on **Vulkan** → Qwen3.8-27B Q5_K_XL at the **32 K standing agent load** + Coder-30B @ 16 K resident worker (§19.1; 131 K stays available for long-context work), VGM 64 GB, sandbox workspace-write, shell seam left unpatched (tool-pwsh active, tool-bash win32-gated off). **\[v2.5\]** Build lane: Coder-30B **Code Mode @ 32 K** behind the external verifier gate; the 27B is cockpit/optional planner (§12.12, §19.1). **\[v2.6\]** As built and verified: §19.3. |
| 39 | What should be installed only experimentally? | A **ROCm profile at 32 K context** (T-10), a MoE worker model, gpt-oss-120b, mcp-client/lsp/subagent-codex, and llama-bench. §22. **\[Addendum\]** Also: a parallel 2–4 server profile (T-11), Code Mode (T-12 — **\[v2.5\]** resolved: now the hard-build implementation lane, §12.12), Qwen3-Coder-Next (T-13), DeepSeek-V4-Flash-0731 local (T-2b), FastFlowLM (T-15). |
| 40 | What should we wait for? | An **NPU runtime in lms runtime get -l**; **PyTorch/vLLM on native Windows for gfx1151**; rocWMMA/Flash-Attention improvements for RDNA 3.5; and DSH reaching a non-prerelease. §26. **\[Addendum\]** The first item is partly answered — FastFlowLM exists today outside lms (§14); what remains open is whether it earns its place (T-15). |

# 26. Upgrade path

| **Component** | **What to watch** | **What would change here** |
|:---|:---|:---|
| **DSH** | Anything past 0.1.1-rc.2; breaking changes are promised | Re-run --dump-default-config and diff the plugin set. **The composition is the contract**, not the version number. |
| **ROCm Windows** | **\[Revised v2.3\]** PyTorch is already vendor-supported on gfx1151 (§9.4); the remaining watch item is **vLLM / SGLang / an RL training stack** reaching native Windows | Would open native fine-tuning and high-throughput serving; today those still need Linux, and RL post-training needs datacenter GPUs regardless (§24.5) |
| **llama.cpp** | rocWMMA / Flash Attention improvements for RDNA 3.5 | Directly moves the §10 prefill numbers |
| **LM Studio runtimes** | An NPU runtime appearing in lms runtime get -l | The single event that would move §14 from WATCH to BUILD **\[Revised\]** FastFlowLM already provides an NPU path outside lms (§14); an lms-native runtime would fold it into the same server. |
| **Qwen** | Successors to Qwen3.8-27B keeping the hybrid DeltaNet design | The KV economics in §12.2 are the reason this model fits; a conventional successor would not |
| **AMD driver** | VGM granularity, shared-memory behaviour on Windows | Could change §8's conclusions; re-measure clinfo global + max-alloc after driver updates |
| **Windows** | WDDM changes to shared-memory limits | Re-run dxdiag and clinfo after feature updates |
| **\[Addendum\]** FastFlowLM | Model coverage, embedding/reranker support, Strix Halo fixes | Moves the NPU lane from EXPERIMENTAL to BUILD if T-15 passes |
| **\[Addendum\]** DeepSeek V4 / llama.cpp | Local V4-Flash GGUF route maturity in llama.cpp | Whether the harness's home model becomes a daily option rather than a capacity experiment |

**Deliberately modular seams** — keep these swappable:

1.  **The provider block.** Changing serving layer should be a baseURL
    edit, nothing more.

2.  **The backend.** lms runtime select — never bake a backend into a
    build.

3.  **The model.** DSH's model picker; do not hard-code a model into
    agent instructions.

4.  **The sandbox mode.** A knob, not a code path.

# 27. Known unknowns

1.  **Direct DSH + Strix Halo evidence is sparse.** No firsthand report
    was found of DSH specifically driven by a local model on Ryzen AI
    Max hardware. Given DSH is nine days old, this is expected. **This
    report is therefore mostly Category B (demonstrated components that
    compose) and Category C (architectural hypothesis), not Category
    A.**

2.  ~~PyTorch / vLLM / SGLang / training on native Windows for gfx1151 — not
    established.~~ **\[Revised v2.1\] PARTLY RESOLVED, and the original answer was
    wrong on PyTorch.** AMD publishes
    `torch[device-gfx1151]==2.12.0+rocm7.14.0` for Windows — see §9.4 for the
    correction and why it was missed. **vLLM, SGLang and training remain
    unestablished**, and TensorFlow/JAX/ONNX are Windows-absent for this part.

3.  **Per-window KV cache table (32 K / 64 K / 128 K / 256 K)** — the
    preallocation behaviour is measured (§8.4) but a per-window
    breakdown was not derived.

4.  **tool-fs-search without ripgrep** — untested (T-8).

5.  **mcp-client, lsp, e2b, subagent-codex on Windows** — untested
    (T-9).

6.  **Whether hipBLASLt / MIOpen / RCCL are Windows-available for
    gfx1151 specifically** — the matrix gives versions, not per-OS
    per-target status.

7.  ~~Lemonade's current release number~~ — **RESOLVED**:
    lemonade-sdk/lemonade **v11.7.0**, published
    **2026-08-19T19:39:54Z**, not a prerelease (GitHub releases API).

8.  **Long-run stability** — nothing here ran for hours. Thermal and
    stability behaviour under sustained agent load is unmeasured.

9.  **Why ROCm's memory footprint grows as it does (§10.4)** — the
    mechanism was not isolated. The plausible cause is HIP
    compute-buffer sizing scaling with batch, and community evidence
    points at GGML_HIP_NO_VMM=ON as a related HIP VMM defect on this GPU
    **\[community\]** — but LM Studio's runtime does not expose that
    flag, so it was not testable here.

10. **Whether the subagent provider-snapshot bug (§21.7) is fixed at the
    pinned commit** — the report was not independently reproduced or
    refuted. Treated as live.

11. **The DSH web UI was not booted.** **\[Revised v2.3\]** *During the
    clean-room baseline*, ports 3080 and 3090 were occupied by the
    then-existing halo-stack deployment on this machine, and starting a
    second instance would have disturbed it. That deployment was
    **subsequently uninstalled** (§16.3), so the ports are no longer a
    blocker — but the UI was not booted during the measured window, so
    what every plugin-count claim rests on is the CLI (--version →
    0.1.1-rc.2, --help, --dump-default-config against a clean DSH_HOME).
    **End-to-end UI verification of the recommended build remains an
    outstanding acceptance item.**

12. **\[Addendum\]** Behaviour at parallel \> 1 — every number in §10 is
    single-slot; subagent contention and the per-slot KV cost are
    unmeasured (T-11).

13. **\[Addendum\]** Code Mode with this model — mounted by default,
    never exercised (T-12). **\[v2.4\] Corrected:** exercised on the rc.7
    deployment 2026-08-17 and lost its bench (§17.4); unreplicated on
    0.1.1-rc.2. The unknown is narrower than this item claimed.

14. **\[Addendum\]** Headless-profile approval behaviour — the 78-plugin
    headless composition was counted, but how approvals are handled
    without the web UI was not established; settle it before any
    unattended use.

15. **\[Addendum\]** FastFlowLM's usefulness to DSH — the runtime
    exists; model quality, embedding throughput and coexistence with the
    GPU-resident primary are unmeasured (T-15).

16. **\[Addendum\]** DeepSeek-V4-Flash-0731 local feasibility — open
    weights and GGUFs exist; whether a low-bit quant loads, decodes
    usefully and tool-calls reliably on this box is unmeasured (T-2b).

17. **\[Addendum\]** Recovery after a Temp cleanup — Discussion \#758's
    failure is reported upstream, not reproduced here (T-16).

18. **\[Addendum\]** The Gemini report's claim that MSYS2/Git-Bash
    binaries fail under the restricted token — unverified (T-16).

19. ~~**\[Addendum\]** Whether PyTorch on native Windows for gfx1151 is now
    supported or preview — the Codex report asserts AMD's ROCm-on-Radeon/Ryzen
    documentation lists it; not checked here. Would resolve item 2.~~
    **\[Resolved v2.1\] Checked. Codex was right.** AMD publishes a
    `device-gfx1151` wheel (§9.4). Item 2 is revised accordingly. What remains is
    to *run* it on this machine — **T-18**.

20. **\[v2.1\]** **Why ROCm's memory footprint grows with prompt size while
    Vulkan's stays flat.** §10.4 now measures the effect at a matched 32 KB
    workload (1.59×, identical across three repeats), but the mechanism is still
    unisolated. `GGML_HIP_NO_VMM` remains the community's named suspect and is not
    exposed by the packaged runtime — T-10 on a custom HIP build is the test.

21. **\[v2.1\]** **The 64 KB and 256 KB rungs remain `n = 1`**, and the 256 KB
    ROCm rung is confounded by memory pressure (§10.6). The "parity at 45 K
    tokens" and "decode collapses to 7.2 tok/s" results should not be relied upon
    until T-19 repeats them on a quiesced machine.

22. **\[v2.1\]** **Whether `bash` running as `scott` rather than `root` breaks
    anything in the distro.** The switch was made after the operator confirmed the
    prior workload was dead (§6.8). Content created under `/root` is no longer
    reachable by default; nothing was found that needed it, but nothing exhaustive
    was checked either.

23. **\[v2.1\]** **Everything the uninstall removed is unverifiable from this
    machine now.** §16.3 records the diffs taken before deletion — 471/471 files
    with zero live-only, loaders SHA-256 identical — but the live copies are gone,
    so those checks cannot be repeated. The archive is the only remaining witness.

24. **\[v2.1\]** **A method failure, recorded because it recurred.** Three times in
    one day this report's author concluded from a single source's silence: reading
    a plugin's *name* in the composed tree without its `disabled` flag (§6.5,
    which invented a containment defect that did not exist); reading the ROCm
    compatibility matrix without the product docs (§9.4, which recorded a shipped
    capability as UNKNOWN); and searching revision 2 for four keywords before
    calling a thousand lines of addendum material a stale snapshot. **The standing
    correction: "not stated in the source I consulted" is not "not established",
    and a package appearing in a listing is not a package that is active.** Where
    both a document and the running system can answer, prefer the running system.

# 28. Source appendix

Evidence is ordered by the directive's precedence: source code first,
community last.

## Tier 1 — source code, at a pinned commit

Repository github.com/deepseek-ai/deepseek-harness, commit
**b150a551b8d465e31e418e1b2eaf5e79bbb7d28e** (2026-08-21), cloned
locally.

| **Claim** | **File** |
|:---|:---|
| OpenAI-compatible protocols and baseURL override | packages/llm/llm-pi-ai/src/provider.ts:25-187 |
| GET /models discovery | packages/llm/llm-pi-ai/src/discovery.ts:39-232 |
| Runner chain incl. Windows ACL backend | packages/sandbox/sandbox-local/src/index.ts:2-3,141 |
| Windows restricted-token / capability-SID sandbox | packages/sandbox/sandbox-windows-acl/src/ (12 files, ~115 KB) |
| Sandbox modes, partial enforcement on Windows | docs/subsystems/sandbox.md |
| Permission presets and their defaults | docs/subsystems/permission-presets.md |
| Provider/model configuration surface, compat switches | docs/user/guide/providers.md |
| Platform gating of the shell seam | packages/bundle/base/cordis.patch.yml, packages/bundle/web-app/cordis.patch.yml, ~/.dsh/.agent-presets/\*/agent.cordis.yml |
| Node/pnpm requirements, workspace layout | root package.json, pnpm-workspace.yaml |

## Tier 2 — registries and vendor APIs

- npm packument for @deepseek-ai/dsh — versions, dist-tags, 62
  dependencies, MIT licence.

- GitHub API — repository metadata, releases, pinned commit,
  Discussions.

- AMD ROCm compatibility matrix — ROCm **7.14.0** (2026-07-16), gfx1151
  on Windows 11 25H2.

- AMD Windows install docs — HIP SDK 7.2.0, RDNA 3.5 support levels,
  debugger exclusion.

- AMD ROCm "Strix Halo system optimization" — GTT/GART/VRAM model;
  **Linux-only guidance**.

- Qwen3.8-27B model card — parameters, hybrid architecture, context,
  licence, sampling.

- Microsoft WSL releases API — 2.7.12 latest stable (2026-08-18).

- **\[Addendum\]** DeepSeek Harness Discussion \#758 — Windows sandbox
  failure after Temp cleanup and related issues
  (github.com/deepseek-ai/deepseek-harness/discussions/758, 2026-08-14).

- **\[Addendum\]** DeepSeek-V4-Flash-0731 model card
  (huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) — MIT, open
  weights, 304 B total, DeepSeek Harness minimal-mode evaluation note.

- **\[Addendum\]** Qwen3-Coder-Next model card
  (huggingface.co/Qwen/Qwen3-Coder-Next) — 80 B total / 3 B active
  hybrid, 262,144 native context, Apache 2.0, GGUFs published.

- **\[Addendum\]** FastFlowLM repository
  (github.com/FastFlowLM/FastFlowLM) — XDNA 2 NPU runtime, Strix Halo
  listed, OpenAI-compatible API.

- **\[Addendum\]** AMD Software: Adrenalin Edition 26.8.1 release notes
  (RN-RAD-WIN-26-8-1), 2026-08-20.

- **\[Addendum\]** Microsoft Windows 11 release information — 24H2 /
  25H2 GA builds and 26H1 positioning (as cited by the Codex report; not
  re-fetched here).

## Tier 3 — commands executed on the target machine, 2026-08-23

Win32\_\* CIM classes · dxdiag · clinfo · vulkaninfo --summary ·
Get-Counter '\GPU Process Memory(\*)' · lms
version\|ps\|ls\|runtime\|load\|unload · GET /v1/models and POST
/v1/chat/completions against :1234 · pnpm dlx
"@deepseek-ai/dsh@0.1.1-rc.2" --help / --version / --dump-default-config
· Get-AppxPackage · wsl --version\|--status\|--list\|--update ·
bench/Bench-Local.ps1.

Raw artefacts are in dsh-halo-research/evidence/.

## Tier 4 — community evidence, labelled as such

Used **only** for the claims marked **\[community\]** in the body, and
never elevated to vendor support: Vulkan-vs-ROCm split behaviour on
Strix Halo; rocWMMA Flash-Attention long-context flatness;
GGML_HIP_NO_VMM=ON; NPU under-utilisation for LLM inference; LM Studio
structured-output/tool-calling completeness relative to Ollama.

Where community sources disagreed, the disagreement is recorded in §27
rather than silently resolved.

**\[Addendum\]** Community sources behind the \[community\] claims,
taken from the Codex report's appendix:
github.com/hogeheer499-commits/strix-halo-guide ·
github.com/slb350/strix-benchmarks ·
github.com/visorcraft/strix-halo-llm-perf ·
github.com/ggml-org/llama.cpp/discussions/27047 ·
github.com/ggml-org/llama.cpp/issues/26929 ·
github.com/ROCm/ROCm/issues/5339 ·
github.com/GPUOpen-Drivers/AMDVLK/issues/420 ·
lilting.ch/en/articles/lemonade-strix-halo-verification.

## Tier 5 — the parallel reports, and what was not imported \[Addendum\]

**\[Addendum\]** Three reports against the same directive were compared
with this one on 2026-08-23.
**deepseek-harness-strix-halo-spec-2026-08-23** (Codex / OpenAI; desk
research, no machine access): accurate on Windows-capability
classification, version currency and sources; it treated "Qwen3.8" as a
typo for Qwen3-8B, so its model portfolio and KV table were not
imported. **DSH_Strix_Halo_Architecture_Spec_2026-08-23** (Grok / xAI;
desk research): directionally right and the source of the Discussion
\#758 and FastFlowLM leads; Lemonade-as-primary and the
Qwen3.8-2.4T-A95B option were not imported — the latter cannot fit in
128 GB at any useful quantisation (§12.1).
**DeepSeek_Harness_AMD_Strix_Halo_Architecture_Report** (Gemini /
Antigravity): its repository layout, plugin names, configuration schema,
benchmark table and KV-cache formula do not match the pinned source tree
or the model card and were not imported; its Windows 24H2 recommendation
contradicts AMD's compatibility matrix (§9.1). Only the ROCm tuning-knob
names, the Windows pre-flight items and the sandbox/native-binary claim
(flagged unverified) were taken from it. Everything imported is tagged
\[Addendum\] in the body and was independently verified unless stated
otherwise.

# 29. Records map — where the ground truth lives \[v2.4\]

Added after a session in which a real result had to be recovered from an
archived transcript. One table, every authoritative artifact, full drive
paths. If a claim and a path disagree, the path wins.

| Record | Path |
|:---|:---|
| This spec (v2.4) and its predecessors (v2.1–v2.3, .docx renderings) | `C:\Users\scott\Desktop\Code\dsh-halo-research\` |
| T-C battery ground truth (results, revised conclusions) | `C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\TC-FINAL-REPORT.md` |
| T-C run log, per-cell grades / metrics / instructions / workspaces | `C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\` (`REPORT-TC.md`, `grade-*.txt`, `metrics-*.json`, `tc*-instructions.md`, `ws-*`) |
| Context-sweep harness and runs | `C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\` (`Run-Tuning.ps1`, `runs\`) |
| Honest-metrics extractor (reads session logs, never summaries) | `C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\extract_metrics.py` |
| DSH session logs (the primary record of every run) | `C:\Users\scott\.dsh\sessions\` (per-workspace `session.jsonl.zstd`) |
| Live DSH config (provider block with the §18.1 fix) | `C:\Users\scott\.dsh\settings.yaml` |
| Bench scripts behind §10/§12 (sandbox, reasoning-effort, MTP, ROCm) | `C:\Users\scott\Desktop\Code\dsh-halo-research\bench\` |
| Raw evidence CSVs and captures behind §10 | `C:\Users\scott\Desktop\Code\dsh-halo-research\evidence\` |
| Handoff document (session-to-session bootstrap) | `C:\Users\scott\Desktop\Code\dsh-halo-research\HANDOFF-TO-NEXT-AGENT.md` |
| **Pre-reset (rc.7) bench-day record — §17.4's primary artifact** | `C:\Users\scott\Desktop\Halo Old Archive\repo-working-tree\docs\phases\phase2-bench-results.md` (copies under `…\Halo Old Archive\session-artifacts\*\docs\phases\`) |
| Full session transcripts spanning both machine states (§21.13) | `C:\Users\scott\Desktop\Halo Stack Research\SessionTranscript.md`, `SessionTranscriptwiththinking.md` (repo copies: `Session-Transcript*.md`) |
| Operator research library (spec exports, clean-room prompt, gap analyses) | `C:\Users\scott\Desktop\Halo Stack Research\` |
| Retired previous-generation stack (reference only — start at `GUIDE.md`) | `C:\Users\scott\Desktop\Halo Old Archive\` |
| TownReporter grader-fairness reference (never the product) | `C:\Users\scott\Desktop\Code\townreporter\app.py` (mirror: `…\tuning\tc\ws-selftest\app.py`) |
| The model-built TownReporter (T-C2e artifact, 15/15) | `C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\ws-tc2e\app.py` |
| **Code-vs-Standard 2×2 results (§12.12's primary record)** | `C:\Users\scott\Documents\Codex\2026-08-24\rea\outputs\HALO-CODE-MODE-2X2-RESULTS.md` |
| 2×2 raw evidence (seed, frozen plan, all four workspaces) | `C:\Users\scott\Documents\Codex\2026-08-24\rea\outputs\HALO-CODE-MODE-2X2-EVIDENCE.zip` |
| **The stack as built (§19.3)** — gate, lanes, launcher, evidence rules | `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\` (`README.md`, `BRINGUP-2026-08-25.md`, `Gate-Build.ps1`, `Check-Done.ps1`, `Probe-Worker.ps1`, `cadence-brief.md`, `Launch-Halo.ps1`, `Install-Shortcut.ps1`) |
| Worker-lane DSH home (coder-only pinning, §18.6) + its session logs | `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\dsh-home-worker\` |
| Cockpit routing persona — deployed / canonical | `C:\Users\scott\.dsh\profiles\web\cordis.patch.yml` (backup `.bak-20260825`) / `...\stack\web-cockpit.patch.yml` |
| Operator launcher shortcut | `C:\Users\scott\Desktop\Halo Cockpit.lnk` |
| Reasoning-throttle probe (§12.6b): script, raw results, scratch-home config | `C:\Users\scott\Desktop\Code\dsh-halo-research\evidence\effort-probe-20260825.py`, `…\effort-probe-20260825-results.txt`, `…\effort-probe-dsh-home-settings.yaml` |
