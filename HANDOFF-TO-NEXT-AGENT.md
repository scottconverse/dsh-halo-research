# Handoff to the next agent — "Halo v1" local autonomous dev stack

**Written:** 2026-08-24 23:15 MDT · **Machine:** HALO (Windows 11) · **Operator:** Scott
**For:** the incoming agent, whatever vendor. Assume no prior context. Everything below is
sourced from files on this disk; the ground truth is `tuning/tc/TC-FINAL-REPORT.md`
(newest — where it conflicts with an older file, it wins, and conflicts are flagged inline).

---

## A. Mission

Build **Halo v1**: a fully-local autonomous AI development stack on this machine. The stack is
**DeepSeek Harness (DSH) 0.1.1-rc.2** running bare metal on Windows, driving a **local
Qwen3.8-27B** served by **LM Studio on :1234**, with `DSH_PERMISSION_MODE=danger-full-access`.
The permission mode is a **deliberate operator choice on his own hardware**. Do not question it,
do not add safety caveats to it, do not "helpfully" narrow it.

The test-run product is **TownReporter** — a lite civic-journalism app (ingest a public-meeting
transcript → local LLM drafts a neutral article → producer review passes a hard gate → publish
to a searchable public page → public corrections). Its contract is pinned exactly, route by
route and string by string, in `tuning/tc/BRIEF-TEMPLATE.md`. **The LOCAL model must build it
autonomously.** A previous agent hand-wrote a working version; the operator explicitly rejected
that as the deliverable. A correct hand-written implementation still exists, but its only
sanctioned use is as the **grader-fairness reference** (§E) — never as the product.

Agreed phase plan: **Phase 1** = the local model builds TownReporter (IN PROGRESS — this is
where you are). **Phase 2** = the Lucebox server gate (spec T-25). **Phase 3** = full stack plus
cloud OAuth (the operator clicks the login flows; you cannot). **Phase 4** = add-ons, including
the FastFlowLM NPU lane (T-15).

---

## B. Machine facts

| Item | Value | Note |
|---|---|---|
| APU | AMD Ryzen AI Max+ 395 w/ Radeon 8060S, 16C/32T, 3.0 GHz base | `Win32_Processor` |
| GPU target | **gfx1151** (RDNA 3.5), Strix Halo | ROCm matrix maps Ryzen AI Max → gfx1151 |
| Memory | 128 GB unified, **VGM split 64/64** — 63.79 GB visible to Windows | re-measure, never assume |
| OS | Windows 11 Pro **25H2, build 26200.9168** | registry `ProductName` lies ("Windows 10 Pro"); build+DisplayVersion are authoritative |
| Display driver | 32.0.31035.1003 / Adrenalin **26.7.1** | 26.8.1 shipped 2026-08-20, not applied; all §10 numbers are on 26.7.1 |
| Inference server | **LM Studio, :1234**, OpenAI-compatible | truth source is **`lms ps --json`** |
| Runtime | **llama.cpp 2.29.1**, **Vulkan** default | same version ships for ROCm — a genuinely controlled comparison |
| ROCm | 7.14.0 supports gfx1151 on Win11 25H2; **HIP SDK not installed on this box** | experimental lane only |
| Node | **25.9.0** | DSH requires `^22.19.0 \|\| >=24.0.0` |
| pnpm | **11.22.0** | DSH declares `pnpm@11.7.0` |
| DSH | **0.1.1-rc.2**, pinned commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` | MIT, prerelease, repo created 2026-08-13 |
| Python / Git / PowerShell | 3.13.5 / 2.55.0.windows.3 / 7.6.5 | |

**Never use `npx` on this box — the resolver hangs.** Always:
`pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" …`

**Never trust the REST `/v1/models` list** for what is loaded or at what quantization — it lies
about aliased ids. `lms ps --json` is the only truth source, and it also carries `contextLength`,
`status`, `parallel`, and the exact GGUF path.

Resident model roster (both fit the 64 GB carve-out together):
- `unsloth/qwen3.8-27b` — Qwen3.8-27B **UD-Q5_K_XL**, 21.1 GB, arch `qwen35`, vision, tool-use, `maxContextLength` 262,144. The **agent** model.
- `unsloth/qwen3-coder-30b-a3b-instruct` — **Q4_K_S**, 17.5 GB, arch `qwen3moe`, tool-use. The **second resident**, used by apps-under-test that themselves call an LLM.

---

## C. Proven results — do not re-derive these

### C.1 Context-window sweep (7 tiers, canary task, headless, deterministic grader)

| ctx | result | wall | peak ctx |
|---|---|---|---|
| 8K | **FAIL** — `CONTEXT_WINDOW_EXCEEDED` | 0.3 m | — |
| 16K | 7/7 | 6.0 m | 12,169 |
| 32K | 7/7 | **4.2 m (fastest)** | 10,630 |
| 48K | 7/7 | 5.7 m | 11,124 |
| 64K | 7/7 | 5.9 m | 12,040 |
| 96K | 7/7 | 12.4 m | 12,398 |
| 128K | 7/7 | **9.9 m** | 11,232 |

**Every usable window 16K–128K passes 6/6 on a small task.** The DSH agent's own baseline
context is ~8.5K, which is why 8K is below the floor and unusable. Window size is **eliminated**
as the primary driver of the original failure: the same 131K config that died after 7 hours
interactively completes the canary in 9.9 minutes headless.

### C.2 The T-C battery — what actually breaks big autonomous builds

| Cell | Window | Strategy | Wall | Tool calls | Graded | Outcome |
|---|---|---|---|---|---|---|
| sweep (ref) | 16–128K | small task, one-shot | 4.2–12.4 m | 1–2 | 7/7 each | **6/6 PASS** |
| T-C1 | 32K | big, write-only | 45 m (cap) | **0** | 0/1 | stall — 55K chars pure reasoning |
| T-C2 | 32K | big, + self-test loop | 67.8 m (self-exit 1) | **0** | 0/1 | stall — 23,168 output tokens, **all reasoning** |
| **T-C2b** | 32K | big, **incremental ≤80 lines/call** | 61.3 m | **24** | **5/15** | **real build loop**, half an app, died at window (peakCtx **32,709**/32,768), **0 compactions** |
| T-C2c | 64K | big, incremental | 75 m (cap) | 5 | 0/1 | glacial — acted, wrote nothing |
| T-C2d | 32K | big, incremental + 2-file + lean | 75 m (cap) | **0** | 0/1 | stall — 87K chars reasoning |
| T-C2e | 32K | **computer-forced cadence** | in flight at handoff | — | — | see §I |
| T-C3 | 128K | big, write-only | **SKIPPED**, recorded not hidden | — | — | stall already established by T-C1/T-C2 |

**Task size is the driver.** Same model, same window, same framing, same harness: 6/6 on a small
task, 1-partial-in-5 on the big one.

**The failure mode is a large-artifact emission stall.** The model reasons *in place of* emitting
a big first artifact, indefinitely, until the harness's output budget kills the turn before a
tool call ever leaves. This is §12.5's measured toy-scale pathology (`max_tokens: 8` → 8 reasoning
tokens, empty content) reproduced as the terminal failure mode of real work. A 1.9 KB canary app
never trips it; a ~6K-token `app.py` trips it almost always.

**Ignition is stochastic, not promptable.** Capping emissions to ≤80 lines/call ignited a genuine
act-verify loop **once** (24 tool calls, `pwsh`×11, `job_output`×3, live server, real LLM draft in
**7.5 s**, DB created) — and the identical configuration stalled on replicate. 64K was worse:
window slack appears to invite deliberation. Five draws at temp ~1.0: 1 ignition, 1 partial,
3 stalls. **"Better prompting will fix it" is dead as a strategy. Structure over phrasing.**

### C.3 Compaction root cause — FIX APPLIED, VERIFICATION PENDING

T-C2b died at 32,709/32,768 tokens with **zero compaction events** despite compaction-basic's 0.8
threshold. Source isolation:

- `dsh-compaction-basic` sizes its threshold from `resolveModelInfo(provider, model).context` — the **declared** capacity, not the loaded one.
- `dsh-llm-pi-ai/lib/index.js:639` resolves a hand-entered model as `entry.contextWindow ?? … ?? DEFAULT_CONTEXT_WINDOW`.
- `dsh-llm-pi-ai/lib/index.js:849`: `DEFAULT_CONTEXT_WINDOW = 262144`.

The spec's canonical §18.1 provider block **never declared `contextWindow`**. Compaction therefore
aimed at 0.8 × 262,144 ≈ **209.7K** on models really loaded at 32K or 131K. Every window-death in
the battery — and plausibly the original 7-hour run's terminal 214K-on-a-131K-window state — is
consistent with this one missing line.

**Fix is applied** in `C:\Users\scott\.dsh\settings.yaml` (`contextWindow: 131072` with an
explanatory comment). It is **not yet runtime-verified** — that is **T-28**. Spec §18.1 is
defective as published and v2.4 must amend it. Note: the older `REPORT-TC.md` conclusion 4(a)
says the compaction cause was "unisolated"; **TC-FINAL-REPORT.md supersedes it** — the cause was
isolated afterward.

### C.4 The two-resident-model pattern is validated

The app-under-test drafts on the coder MoE while the agent reasons on the 27B: **no contention
events, drafts of 7.5–8.4 s**, against the earlier single-slot experience of a **414 s draft that
blocked the agent into retries** (~49–50× on the operation, and the deadlock class eliminated).
Both models fit the 64 GB carve-out with room. **This is the standing pattern for any
app-under-test that itself calls the LLM.**

### C.5 Other settled facts

- **MTP is worth ~1.5×, not 2.4×, on this box.** Ablation, n=4, 8 KB prompt: MTP off **10.4 tok/s**, MTP on **16.05 ± 0.24 tok/s** = **+54 %**, prefill unchanged. Halve any published discrete-GPU speculative-decoding number before applying it here. (Spec §12.4 / Q25.)
- **Vulkan over ROCm — chosen on memory shape, not a blanket speed claim.** Vulkan's footprint is flat; ROCm's is larger and grows with prompt size (78.39 GiB on a long prompt, driving free system RAM to 1.55 GB). ROCm keeps a real prefill advantage at short-to-moderate context. Vulkan decode is faster and steadier from 32 K up. (Spec §10.6 / §22.)
- **`reasoning_effort` and `enable_thinking` are silently ignored** through LM Studio. 60 graded runs: `none` averaged **212** reasoning tokens (peak 534) vs `xhigh` at 169 — within noise and *backwards*. Both are accepted-and-discarded, never refused. **You cannot turn reasoning down on this stack.** The only mitigation is a generous `max_tokens`. (Spec §12.6; T-23 would isolate whether it is an LM Studio forwarding gap or a template gap.)
- **§12.7 — the sandbox effect is the largest measured improvement anywhere in this program.** 36 graded runs, bare vs sandbox: **5/18 (28 %) → 18/18 (100 %)** correct, mean wall-clock 327.1 s → **63.5 s** (5.1×), mean completion tokens 3,010 → **518**. Tool-use rate 18/18. The bare failure mode was **non-termination, not error** — 12 of 13 bare failures exhausted the whole budget without answering. **Tools-on is the posture. It is not a convenience setting.** Honest limit: the task mix was deliberately sandbox-favourable, so the direction transfers and the magnitude does not (T-24 would size the general case).

---

## D. The immediate next runs

From `TC-FINAL-REPORT.md` §7, in priority order. Each carries a falsifiable prediction — keep them
that way.

1. **R1 — Decomposed TownReporter build.** Split the build into **~8 canary-sized one-shot units**
   (skeleton, ingest, review/gate, article, home/search, corrections, wiring, self-test). Each unit
   sits inside the regime measured 6/6. Budget ≈ 8 × ~6 min + assembly + grade ≈ **1.5–2 h**.
   **Prediction: ≥13/15 on the existing grader, no unit stalls.** If any unit stalls, the
   emission-pathology claim is wrong in a measurable way — say so. DSH ships the loop mechanism
   (`tool-ralph`, `tool-workflow`, `workflow-worker-thread`); use it rather than writing one.
2. **R2 — Low-temperature incremental replicate** (~75 m). The cheapest discriminator on the
   stochasticity claim. **Prediction: ignition becomes reliable (≥2/3).**
3. **R3 / T-28 — Compaction verification post-fix** (~30 m). With `contextWindow` declared, drive a
   session past 0.8× the real window and observe an actual compaction event. Note the swallowed
   error path (empty stderr) seen during isolation — it is unexplained and worth watching.
4. **T-12 — Code Mode cell.** One Tier-2 task in Code Mode and again in native tool mode. DSH mounts
   `code-runtime-worker-thread` by default and also ships `code-runtime` and `code-runtime-python`
   (§5.1). **The `DSH_TOOLS_MODE` env value must be read out of the tools package source before you
   set it — never guess it.** Nothing in spec v2.3 records the accepted values; that is a gap in the
   document, not a fact about the code.

Then: **spec v2.4 merge** (sweep + T-C battery + the §18.1 `contextWindow` amendment + T-list
updates including a new T-28), then **Phase 2, the Lucebox gate (T-25)**.

---

## E. How to run the harness

Everything lives under `C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\`.

**Full T-C variant, end to end** (workspace → brief → headless agent → ownership-checked cleanup →
grade → metrics), `tuning\tc\Run-TC.ps1`:

```powershell
cd C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc
.\Run-TC.ps1 -Variant tc3 -Ctx 32768 -Port 5159 -CapMin 75
.\Run-TC.ps1 -Variant tc1 -Ctx 32768 -Port 5151 -CapMin 45 -WriteOnly
.\Run-TC.ps1 -Variant tc2f -Ctx 32768 -Port 5160 -CapMin 75 -VariantInstructionsFile .\tc2f-instructions.md
```

It reloads the 27B to the requested context (coder stays resident), builds a **fresh** workspace,
substitutes `{PORT}` / `{DRAFT_MODEL}` / `{VARIANT_INSTRUCTIONS}` into `BRIEF-TEMPLATE.md`, writes
the result as **`AGENTS.md` in the workspace**, copies in `sample_transcript.txt`, launches, and on
completion grades and extracts metrics. Default `-DraftModel` is
`unsloth/qwen3-coder-30b-a3b-instruct` — the second-resident pattern, already wired in.

**Context sweep**, `tuning\Run-Tuning.ps1`:

```powershell
.\Run-Tuning.ps1 -Sizes 65536,98304,131072 -TimeoutMin 30
```

**Grading**, `tuning\tc\grade_townreporter.py` — 15 deterministic checks mapping 1:1 to the brief
contract, including a **real LLM drafting call**:

```powershell
python .\grade_townreporter.py <workspace-dir> <port>   # exit 0 = all 15 pass
```

> **Grader-fairness discipline — non-negotiable.** The grader is **harness-owned and never written
> by the agent under test**, and it **must score a known-correct reference implementation 15/15
> before it is allowed to grade any model output**. This discipline already caught a broken grader
> during the sweep. The reference lives at `tuning\tc\ws-selftest\app.py`, which is byte-identical to
> `C:\Users\scott\Desktop\Code\townreporter\app.py` except for two lines (`LLM_MODEL` and the port)
> — verified by diff at handoff time. If you change the contract in `BRIEF-TEMPLATE.md`, you must
> update the reference and re-prove 15/15 before any run counts.

**Honest metrics**, `tuning\extract_metrics.py` — reads the real DSH session logs at
`~\.dsh\sessions\**\*.jsonl.zstd`, never a summary:

```powershell
python ..\extract_metrics.py --newest-after <epoch_seconds>
python ..\extract_metrics.py <path-to-session.jsonl.zstd>
```

It reports `tool_calls`, `compactions`, `peak_context_tokens` (from the model's own
`chunk.usage.inputTokens`), `total_output_tokens`, `reasoning_chars` vs `text_chars`, and
`action_ratio_by_chars` — the single most diagnostic number in this program. A stalled cell reads
`actionRatio` 0 to 0.006; the one real build loop read **0.039**.

**Headless invocation pattern — three hard mechanics, each learned the expensive way:**

1. Launch through the **full path to `pnpm.cmd`**, not the `pnpm` shim. `Start-Process` cannot run
   the shim. `Join-Path (Split-Path (Get-Command pnpm).Source -Parent) 'pnpm.cmd'`.
2. The **task string must be ONE LINE with no `<` or `>` characters** — `cmd.exe` eats them as
   redirection. `canary-task.txt` is deliberately written without metacharacters; do not re-add
   them. `Run-Tuning.ps1` flattens newlines with `-replace '\s*\r?\n\s*', ' '`.
3. Because of (2), **the brief goes in `AGENTS.md` in the workspace**, not on the command line. DSH's
   `agent-instructions` plugin (§5.1) picks it up natively. The task string then only has to say
   *"Carry out the TownReporter build specified in AGENTS.md in this directory, exactly as written."*

---

## F. Traps and hard rules

Each of these cost real time. They are not style preferences.

1. **Read the DSH specs and source BEFORE building anything.** The predecessor project on this
   machine (halo-stack) died after six days spent rebuilding what DSH already ships (224 packages).
   Enumerate the platform first: `pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config`,
   plus the spec's **§5 capability map**. The rule that follows from §21.5: **a package appearing in
   dump output is not evidence it is active — read the `disabled` key on the row.**
2. **Never kill processes by image name.** Capture **PID + parent + cmdline** first and kill only
   trees you recorded launching. A blanket `node.exe` kill on this box once took out a live MCP
   server belonging to another agent. `Run-TC.ps1` models the correct pattern: recursive
   `Kill-Tree` on a recorded PID, and port cleanup that only reaps a listener whose `CommandLine`
   contains this run's workspace path — anything else gets a WARNING and is left alone.
   **Other agents share this box. Their processes and files are NO-TOUCH.**
3. **Single-slot LLM contention deadlocks.** Anything that calls the LLM while an agent holds the
   slot will block. Use the **second-resident-model pattern** (§C.4): the agent on the 27B, the
   app-under-test on the coder MoE @16K.
4. **Benchmark hygiene, or the number does not count.** Unique nonce per run, discard the warm-up,
   no concurrent server access, **n ≥ 4** before a claim. Pre-reset performance numbers from the
   old halo-stack deployment are **not importable** into current-stack tables (spec §21.13) — a
   throughput figure is only meaningful attached to the runtime, context, and hygiene that produced
   it. If those measurements are wanted, re-run them.
5. **This is a thinking model.** `max_tokens` must be generous (**8000** in the TownReporter
   contract). If `message.content` comes back empty, **fall back to `message.reasoning_content`**
   and extract the JSON out of it. `reasoning_effort` / `enable_thinking` are inert here (§C.5) —
   do not build a design on throttling them.
6. **Storage Sense is ON on this box.** A Temp purge deletes the per-session
   `…\AppData\Local\Temp\dsh-xxxxxx` directory that the Windows ACL runner never recreates,
   permanently breaking DSH's `workspace-write` sandbox until repaired by hand (upstream Discussion
   #758). Irrelevant while running at `danger-full-access`, live the moment anything runs
   `workspace-write`. Exclude the `dsh-*` temp directory from cleanup schedules.
7. **Every custom-provider model entry MUST declare `contextWindow` matching the loaded context.**
   One line. Prevents the entire death-at-window class (§C.3). Keep it in sync with the
   `--context-length` the model is actually loaded at — if you reload the 27B at 32K for an
   experiment, the declared 131072 is now wrong for that session.
8. **The repo now exists — commit as you go.** `dsh-halo-research` is a git repo (§H). Two commits
   at handoff: `1e07d9e` (initial capture) and `b3c499a` (T-C final report). Uncommitted at handoff:
   `tuning/tc/ws-tc2e/app.py` and `ws-tc2e/townreporter.db` — the live run's output.

---

## G. Operator working rules

Scott has corrected each of these on this machine. Following them is part of the job.

- **Report outcomes, not process.** Result first. No caveat paragraphs, no narrating your own
  verification. Verify silently, then state what is true.
- **Never claim "done" or "verified" without named evidence.** Name the artifact, the command, or
  the file you checked. "The verification is now done" written without doing it is the specific
  sentence that killed the predecessor project.
- **A negative result is a probe, not a conclusion.** Write *"grep for A, B, C in X found none"*,
  never *"X doesn't contain them."* If that weaker sentence is too weak to act on, widen the search
  rather than strengthen the wording. Any count or size mismatch is a contradiction to be accounted
  for, not rounded off.
- **Deliver the full evident intent the first time.** Narrow-literal delivery that forces him to
  extract the obvious follow-up one correction at a time is the meta-failure here. Zero
  anticipatable follow-ups.
- **Actively monitor long runs and post regular inline progress.** Never let a run sit unwatched.
  A 7-hour unwatched death is literally the origin of this entire research program. If you see the
  same finding twice with a known cause, that is a task, not a status — act on it.
- **Answer-don't-act when he says so.** If he asks a question, answer it; do not start executing.
- **His stated purpose is the spec.** Never demote it to "optional" and never reorder it behind
  your own priorities. Your priorities fill the remaining time.
- **No risk warnings about his own machine.** Destructive, privileged, irreversible — if he asked
  for it, do it, at most one short line of fact, then proceed.
- **When a report or document is the deliverable, state the full raw drive path in plain text in
  chat.** A link alone does not count. Deliver copyable text inline.

---

## H. File map

| Path | What it is |
|---|---|
| `C:\Users\scott\Desktop\Code\dsh-halo-research` | **The git repo.** Master spec, benches, tuning harness, evidence. Commits `1e07d9e`, `b3c499a`. |
| `…\dsh-halo-research\DSH-Strix-Halo-Report-v2.3.md` | **The master spec**, ~3,700 lines. Cite it by section. Key sections: §5 capability map, §10/§10.6 benchmarks, §12.5 thinking-token exhaustion, §12.6 inert reasoning_effort, §12.7 sandbox effect, §18.1 provider block (defective — see §C.3), §18.2 sandbox/#758, §18.5 cloud providers + OAuth, §20 T-list, §21 risks, §21.13 two machine states, §22 build decisions. Also present: v2.1, v2.2, and `.docx` renderings. |
| `…\dsh-halo-research\HANDOFF-TO-NEXT-AGENT.md` | This document. |
| `…\dsh-halo-research\tuning\` | Sweep harness: `Run-Tuning.ps1`, `canary-task.txt`, `smoke_test.py` (7-check canary grader, proven 7/7 on `_grader_selftest\`), `extract_metrics.py`, `runs\`, `HANDOFF.md` (running notes — older than TC-FINAL-REPORT.md). |
| `…\dsh-halo-research\tuning\tc\` | T-C battery: `Run-TC.ps1`, `BRIEF-TEMPLATE.md`, `grade_townreporter.py`, `TC-FINAL-REPORT.md` (**newest ground truth**), `REPORT-TC.md` (timestamped run log), per-cell `tc*-instructions.md`, `grade-*.txt`, `metrics-*.json`, `headless-*.log`, `ws-*` workspaces, `ws-selftest\` (the fairness reference). |
| `…\dsh-halo-research\bench\` | `Bench-Local.ps1`, `Test-SandboxEffect.ps1`, `Test-ReasoningEffort.ps1`, `Run-MtpAblation.ps1`, `Run-RocmRepeats.ps1`, `Test-BashConformance.ps1`, `Compare-Builds.ps1`, `Compute-BenchStats.ps1`, session-export helpers. |
| `…\dsh-halo-research\evidence\` | Raw CSVs behind §10 (vulkan/rocm reps, MTP off, memmatch), pre-switch `lms ps` captures, upstream bug threads. |
| `C:\Users\scott\Desktop\Code\townreporter` | The **reference implementation** (hand-written by the previous agent, rejected as the product). `app.py` 23,002 bytes, `README.md`, `sample_transcript.txt`, `llm_probe.py`, `probe2.py`, own git repo. Use only for grader fairness. |
| `C:\Users\scott\.dsh` | **Live DSH home.** `settings.yaml` (provider block with the `contextWindow` fix + comment; `agent-default-model` → `lmstudio` / `unsloth/qwen3.8-27b`), `profiles\web\cordis.patch.yml` (currently an empty `[]` patch array), `profiles\web\cordis.yml`, `sessions\` (the `.jsonl.zstd` logs `extract_metrics.py` reads), `storages\`. |
| `C:\Users\scott\Desktop\Halo Old Archive` | The **RETIRED** previous-generation halo-stack. **REFERENCE ONLY — start at `GUIDE.md`.** Do not resurrect its architecture. This project restarted clean-room specifically to stop rebuilding what DSH already ships. |
| `C:\Users\scott\.lmstudio\models` | LM Studio model store (the GGUF paths reported by `lms ps --json`). |

---

## I. Current live state at handoff (2026-08-24 23:15 MDT)

**A run is IN FLIGHT right now. Do not disturb it, do not reload models, do not touch :5158.**

- **Resident models** (`lms ps --json`): `unsloth/qwen3.8-27b` @ **32768** (status `generating`) and `unsloth/qwen3-coder-30b-a3b-instruct` @ **16384** (status alternating `generating`/`idle` — the app-under-test is drafting on it). This is the two-model pattern working live.
- **T-C2e is running.** Launched 22:39:50 as PID **30940** (`cmd.exe /c "…pnpm.cmd" dlx @deepseek-ai/dsh@0.1.1-rc.2 --profile headless "Carry out the TownReporter build specified in AGENTS.md in this directory, exactly as written."`), 75-minute cap → **expires ~23:54:50**. Strategy: computer-forced cadence (first move must be a `python --version` tool call; think-act alternation; ≤40 lines per edit; restart-and-HTTP-test after every increment).
- **It has ignited.** `ws-tc2e\app.py` is **10,811 bytes** (written 23:11) and `townreporter.db` grew 16,384 → 24,576 bytes between 23:03 and 23:13. That is a second real build loop with live LLM drafting — the first was T-C2b. **This is directly relevant to the §C.2 stochasticity claim: at handoff the count is 2 ignitions in 6 draws, not 1 in 5.**
- **`grade-tc2e.txt` does not exist yet** and `REPORT-TC.md` ends at the `[22:39:50] tc2e : agent launched` line. `Run-TC.ps1` will append the grade and metrics automatically when the process exits or hits the cap. **First thing you should do: check `tuning\tc\REPORT-TC.md` tail and `tuning\tc\grade-tc2e.txt`, then append the result to the T-C matrix in `TC-FINAL-REPORT.md` §3 — that report explicitly promises the cell will be appended either way.**
- **Machine state:** the standing config is 27B @ **131072** with the coder unloaded. The battery left it restored; T-C2e then reloaded the 27B to 32768 per its cell. **Restore the standing config when the run finishes**, and remember rule F.7 — `settings.yaml` declares `contextWindow: 131072`, so a session run against a 32K-loaded model has a stale declaration.
- **Git:** working tree clean except `tuning/tc/ws-tc2e/app.py` and `tuning/tc/ws-tc2e/townreporter.db` (untracked, the live run's output).

---

## J. Open questions — the T-list

The spec's **§20 table** carries T-1 … T-27. **T-28 (compaction verification after the
`contextWindow` fix) was created by `TC-FINAL-REPORT.md` and is not yet in the §20 table** — adding
it is part of the v2.4 merge.

The top five by value:

1. **R1 — decomposed TownReporter build.** Completes Phase 1 and tests the one recipe the evidence
   actually supports. Prediction ≥13/15. *(Not yet a numbered T; it is the successor experiment to
   the whole T-C battery.)*
2. **T-28 — compaction verification post-fix.** Until an actual compaction event is observed, the
   root cause in §C.3 is source-isolated but not runtime-proven, and **no long headless run should
   be trusted**. ~30 min.
3. **T-12 — Code Mode vs native tool mode**, one Tier-2 task each. `code-runtime-worker-thread` is
   mounted by default and `code-runtime-python` exists. Given §12.7's +72.2 pp sandbox result, this
   is the highest-leverage untested harness capability. **Verify the `DSH_TOOLS_MODE` value from the
   tools package source; do not guess it.**
4. **T-25 — the Lucebox gate (Phase 2).** Build Lucebox under WSL2, confirm ROCm reaches the 8060S
   from inside WSL2, run `bench\Bench-Local.ps1` unchanged against its `:8000` endpoint so results
   compare directly to §10.2. The spec calls this **the highest-value open question in the report**:
   if the claimed 3.08× decode over llama.cpp HIP survives, §11.3's server recommendation changes.
5. **T-22 — OAuth end to end (Phase 3, needs the operator).** Complete one OAuth login (start with
   `anthropic`), confirm a `grant`-kind credential is written, the model appears in the picker, and
   a token refresh survives a restart. The mechanism is proven from source but unexercised. **Scott
   clicks — you cannot.** Related: **T-20** (`openai-codex` / `github-copilot` — whether an existing
   subscription is honoured rather than metered credits). Note from §18.5.5: use `openai-codex`, not
   plain `openai`, for ChatGPT; `google`/`google-vertex` have no OAuth path at all.

Also worth knowing: **T-7 / §17.3 criterion 6** (network-disconnect proof of locality) remains
**untested** — cutting the NIC severs the operator session driving the experiment. It is recorded as
untested, not waived.
