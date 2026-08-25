# T-C Final Report — Autonomous coding on the local stack: what breaks, what works, and the recipe

**Date:** 2026-08-24 · **Machine:** HALO (Strix Halo, 128 GB) · **Stack:** DSH 0.1.1-rc.2 headless, danger-full-access, LM Studio :1234, Qwen3.8-27B Q5_K_XL + Qwen3-Coder-30B-A3B (second resident)
**Evidence:** `tuning/tc/` (per-run grades, metrics JSONs, headless logs, session logs), all under git (`dsh-halo-research`, initial commit `1e07d9e`).

---

## 1. Executive summary

**Question:** the 7-tier sweep proved this model builds a *small* app headless at every window (6/6, 4–12 min). The original 7-hour failure was on a *big* app, interactive. What actually breaks big autonomous builds, and what configuration makes them work?

**Answer, in one paragraph:** Task size is the driver. A big single-file build puts the model into a **large-artifact emission stall** — it reasons *in place of* emitting, indefinitely, and the harness's own output budget kills the turn before a tool call ever leaves (§12.5's mechanism at agent scale). Instruction-level fixes (incremental ≤80-line writes, forced tool cadence) can unlock a genuine build loop — one run produced **half a working app with live LLM integration** — but the unlock is **stochastic at temp-1.0**: 1 clean breakout in 5 attempts. Meanwhile two system defects were isolated: **compaction was aimed at an assumed 262K window over a real 32K one** (root-caused to a missing `contextWindow` in the provider config — one-line fix, applied), and the single-slot contention that plagued earlier runs is **fully solved by a second resident model** (drafts 7.5–8.4 s vs 414 s + self-blocking). **The reliable production recipe is structural, not prompt-level: decompose big jobs into canary-sized one-shot units** — each unit sits in the regime measured 6/6 deterministic — using the harness's shipped mechanisms (tool-ralph / workflow).

**Program verdict:** the local model is **not** capable of reliably building TownReporter-sized software as a single autonomous task under any instruction style tested. It **is** capable of (a) building canary-sized units deterministically, (b) sustaining a real act-verify loop when one ignites, and (c) serving as a fast runtime engine. Phase 1 should proceed as a **decomposed build** — that is the next run, with a falsifiable prediction attached (§7).

---

## 2. Method

- **Task:** the full TownReporter vertical slice (ingest → LLM draft → gated review → publish + search → corrections), pinned as an exact route/field/string contract in `BRIEF-TEMPLATE.md`, delivered via `AGENTS.md` (native agent-instructions seam).
- **Grading:** 15 deterministic checks (`grade_townreporter.py`) mapping 1:1 to the contract, including a **real LLM drafting call**. Grader **fairness-proven 15/15 against a known-correct reference implementation before grading any model output** — the same discipline that caught a broken grader in the sweep.
- **Contention control:** the app drafts on a second resident model (coder MoE @16K) while the agent reasons on the 27B — the §13.2/Q34 pattern, validated below.
- **Hygiene:** fresh workspace per cell; hard wall-clock caps; kills only by recorded PID trees (never by image name); ownership-checked port reaping; Codex processes untouched; machine restored to standing config at end (verified: 27B@131K resident, coder unloaded, zero leftover processes).
- **Metrics:** extracted from the actual session logs (tool calls, reasoning/text chars, peak context from the model's own usage records, compaction events, wall time).

## 3. Results

| Cell | Window | Strategy | Wall | Tool calls | Graded | Outcome |
|---|---|---|---|---|---|---|
| Sweep (reference) | 16–128K | small task, one-shot | 4.2–12.4 m | 1–2 | 7/7 each | **6/6 PASS** |
| T-C1 | 32K | big, write-only | 45 m (cap) | **0** | 0/1 | stall — 55K chars reasoning, zero emissions |
| T-C2 | 32K | big, + self-test loop | 67.8 m (self-exit) | **0** | 0/1 | stall — 23,168 output tokens, **all reasoning**; died by output-budget exhaustion |
| **T-C2b** | 32K | big, **incremental ≤80 lines/call** | 61.3 m (self-exit) | **24** | **5/15** | **real build loop**: skeleton → 4 str-replace extensions → server run → routes tested; died at the window (peakCtx **32,709**/32,768), **0 compactions** |
| T-C2c | 64K | big, incremental | 75 m (cap) | 5 | 0/1 | acted but glacial; nothing written |
| T-C2d | 32K | big, incremental + 2-file + lean-context | 75 m (cap) | **0** | 0/1 | stall — 87K chars reasoning |
| T-C2e | 32K | big, **computer-forced cadence** (first move = tool call; think-act alternation) | *in flight at writing* | — | — | appended on completion |
| T-C3 | 128K | big, write-only | **SKIPPED** | — | — | expected result (stall) already established by T-C1/T-C2; time reallocated to the actionable ladder. Recorded, not hidden. |

**What T-C2b actually built** (the partial that matters): server boots; `POST /ingest` → **real LLM draft in 7.5 s** → redirect to review; publish partially working. Failures cluster in the routes it never reached before context death (corrections, search detail, article completeness) — a build cut off mid-flight, not wrong code throughout.

## 4. Analysis

### 4.1 The failure is a large-artifact emission pathology, and §12.5 is its mechanism
In the one-shot cells the model generated **tens of thousands of reasoning tokens and zero actions**. T-C2's death certificate is explicit: 23,168 output tokens across the turn, every one reasoning, then exit 1 — the reasoning consumed the output budget before a tool call could be emitted, repeatedly. This is exactly the failure §12.5 measured at toy scale (`max_tokens: 8` → all 8 tokens reasoning, empty content), now reproduced as the terminal failure mode of real autonomous work. The size of the *first required artifact* is the trigger: a 1.9 KB canary app never trips it (6/6); a ~6K-token app.py trips it almost always.

### 4.2 Instruction-level fixes change the odds, not the guarantee
Capping emissions (≤80 lines/call) ignited a genuine act-verify loop once — 24 tool calls, `pwsh`×11, `job_output`×3, targeted edits, a running server, a created database. But the identical configuration stalled on replicate, and 64K was worse (window slack appears to *invite* deliberation; the sweep independently showed reasoning preambles growing with window). With DSH's thinking-mode sampling (temp ~1.0), **whether the loop ignites is a draw**. Five draws: 1 ignition, 1 partial, 3 stalls. n=1 per cell — the claim is about the class, and it is directionally solid: nothing prompt-shaped produced reliability.

### 4.3 Root cause found: compaction was aimed at a phantom window
T-C2b died at 32,709/32,768 tokens with **zero compaction events** despite compaction-basic's 0.8 threshold. Source isolation:
- `dsh-compaction-basic` sizes its threshold from `resolveModelInfo(provider, model).context` — the **declared** capacity;
- `dsh-llm-pi-ai/lib/index.js:639` resolves a hand-entered model's capacity as `entry.contextWindow ?? … ?? DEFAULT_CONTEXT_WINDOW`;
- `index.js:849`: `DEFAULT_CONTEXT_WINDOW = 262144` — *"context capacity assumed for a model neither configuration nor the catalog sizes."*

Our §18.1 provider block (and the settings this box ran) **never declared `contextWindow`**. Compaction therefore triggered at 0.8 × 262,144 ≈ **209.7K** on models really loaded at 32K/131K. Every window-death in this battery — and plausibly the original 7-hour run's terminal state (214K accumulated on a 131K window while the harness believed 262K) — is consistent with this one missing line. **Fix applied** to the standing config (`contextWindow: 131072` with an explanatory comment); verification is T-28. Spec impact: §18.1's canonical provider block is defective as published; v2.4 must amend it.

### 4.4 The two-model pattern is validated and closes an old wound
The app drafting on the coder MoE while the agent held the 27B: **no contention events, drafts of 7.5–8.4 s**, against the earlier single-slot experience of a **414 s draft that blocked the agent into retries**. ~50× on the operation and the deadlock class eliminated. Memory cost: both models fit the 64 GB carve-out with room (per Q34). This should be the standing pattern for any app-under-test that itself calls the LLM.

### 4.5 Cost accounting
≈ 5.6 hours of model time across the battery produced: three definitive negative cells, one partial build proving loop-capability, one regression cell isolating stochasticity, the compaction root cause (+1-line fix), and the validated two-model pattern. For comparison, the un-instrumented 7-hour failure produced one anecdote. Instrumentation is what converted the same wall-clock into findings.

## 5. Honest limitations
- Every cell n=1; the stochasticity conclusion rests on five draws of a class, not replicates of one cell. A low-temperature replicate is the cheapest discriminator and is queued.
- The compaction mechanism is source-isolated but not yet runtime-verified post-fix (T-28); the swallowed error path (empty stderr) is noted, unexplained.
- §17.3 criterion 6 (network-disconnect proof of locality) untested — cutting the NIC severs the operator session running the experiment.
- T-C2e was still in flight when this report was written; its result appends to the matrix either way.
- Storage Sense is ON; irrelevant to these runs (full access bypasses the sandbox path) but still a live trap for any future workspace-write run.

## 6. What this means for the program
1. **Phase 1 completes via decomposition, not a monolithic prompt.** Split TownReporter into ~8 canary-sized one-shot units (skeleton, ingest, review/gate, article, home/search, corrections, wiring, self-test), each graded by the existing harness. Each unit is in the 6/6 regime.
2. **Config standard:** every custom-provider model entry MUST declare `contextWindow` matching its loaded context. One line; prevents the entire death-at-window class.
3. **Runtime standard:** apps that call the LLM run on the second resident model.
4. The stochastic-ignition finding kills "better prompting will fix it" as a strategy. Structure over phrasing.

## 7. Next run (proposed), with predictions
**R1 — Decomposed TownReporter** (~8 units × ~6 min + assembly + grade ≈ 1.5–2 h): *prediction: ≥13/15 on the same grader; each unit completes without a stall.* If R1 stalls on any unit, the emission-pathology claim is wrong in a measurable way.
**R2 — Low-temp incremental replicate** (75 m): *prediction: ignition becomes reliable (≥2/3).* 
**R3 — T-28 compaction verification** (30 m): with `contextWindow` declared, drive a session past 0.8× and observe a compaction event.
Then: spec **v2.4** merge (sweep + T-C + the §18.1 amendment + T-list updates) and the Phase 2 Lucebox gate per the standing plan.
