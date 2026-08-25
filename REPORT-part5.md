# 13. Model portfolio

## 13.1 What is already on the machine

`lms ls` reports **41 models, 549.14 GB**, against 852.5 GB free on the 2 TB system SSD. The
portfolio problem here is not acquisition — it is **pruning**. Several entries are duplicates
across quantizations or are tagged to other machines in a fleet (`NvideaBlackwell`, `R71`,
`TinyRyzen7`) rather than `Local`.

## 13.2 Recommended portfolio

Roles derived from the workload, not from the model list.

| Role | Model | Quant | Disk | Loaded (est.) | Context | Status |
|---|---|---|---|---|---|---|
| **Primary agent / coding / vision** | `unsloth/qwen3.8-27b` | UD-Q5_K_XL | 21.15 GB | **26.73 GB measured @131 K** | 131,072 | **resident — keep** |
| **Fast worker / subagent** | `qwen/qwen3.6-35b-a3b` | Q4/Q5 | 22.07 GB | ~24 GB | 32–64 K | present — **promote** |
| **Fast coding worker (alt.)** | `unsloth/qwen3-coder-30b-a3b-instruct` | Q4 | 17.46 GB | ~19 GB | 32–64 K | present |
| **Maximum-quality reasoning** | `gpt-oss-120b` | — | 63.39 GB | ~64 GB+ | reduced | present — **capacity-test before trusting** |
| **Embeddings** | `text-embedding-nomic-embed-text-v1.5` | — | 84 MB | <1 GB | — | present — keep |
| **Reranking** | — | — | — | — | — | **GAP** |
| **Draft / speculative** | *not needed as a separate model* | — | — | — | — | MTP is internal (§12.4) |

### Why this shape

**One dense primary, one sparse worker.** The decisive property of this machine is memory
bandwidth (~256 GB/s), not compute. Decode speed is governed by how many bytes must be swept
per token:

- A **dense** 27B at Q5 sweeps ~21 GB per token-step → measured **14.8–16.4 tok/s** (§10),
  held above the naive ~12 tok/s ceiling by MTP.
- An **A3B MoE** activates roughly 3 B parameters per token → a far smaller sweep, and should
  decode several times faster at comparable total size.

That asymmetry is the whole argument for a two-model portfolio: the dense model for quality on
the main thread, the MoE for subagents, batch classification and anything where latency matters
more than depth. **This claim is derived, and §20 lists the measurement that would confirm it
on this box.** It is not yet measured here and is not presented as though it were.

**No separate vision model.** Qwen3.8-27B is natively vision-language. Adding
`qwen3-vl-30b-a3b-instruct` (19.64 GB) is only justified if vision throughput becomes a
bottleneck.

**Q28 — largest model this machine can technically run.** `gpt-oss-120b` at 63.39 GB is the
largest present. With VGM at 64 GB it sits right at the carve-out boundary and would begin
using the shared path; the OpenCL **54.40 GiB maximum single allocation** is a real hazard for
any single buffer above that size, though llama.cpp allocates per-tensor rather than as one
block. Technically feasible; **verify, do not assume**.

**Q29 — largest it can run *usefully*.** Distinct question, and the honest answer is that it
depends on active parameters, not file size. A 63 GB *dense* model would decode near 4 tok/s
and be useless as an interactive agent. A 63 GB *MoE* with small active parameters could be
perfectly usable. §20 specifies the test.

**Q32 — which small model for fast worker/subagent tasks?** `qwen3.6-35b-a3b` or
`qwen3-coder-30b-a3b`, on the MoE-decode argument above.

## 13.3 Pruning

549 GB of models on a 1.9 TB drive with 852 GB free is not yet a problem, but it is heading for
one. Concretely: `qwen3.8-27b` exists locally at `q3_k_xl`, `q4_k_xl`, `q5_k_xl` (loaded) and
`q6_k`. Once §20's quantization comparison has run, **keep the winner and one fallback, delete
the rest** — that alone is ~35 GB.

---

# 14. XDNA 2 NPU analysis

**Q35 — does the XDNA 2 NPU provide a useful role? Not for this workstation today.**

| Finding | Status |
|---|---|
| NPU rated >50 AI TOPS | vendor claim |
| Used by llama.cpp / LM Studio for GGUF LLM inference | **No** — no NPU runtime is offered by `lms runtime` on this box |
| Targeted by Lemonade / Ryzen AI Software for specific models | yes, for named models **[community]** |
| Practical use today | Whisper, diffusion, background Copilot+ tasks **[community]** |
| Largely unused for general LLM inference as of mid-2026 | **[community]**, consistent with the runtime list here |

The runtime inventory on this machine is direct evidence: `lms runtime get -l` offers exactly
four extensions — `harmony`, `llama.cpp` CPU/AVX2, `llama.cpp` Vulkan, `llama.cpp` AMD ROCm.
**There is no NPU option to select.** The path to using the NPU at all would be Lemonade or
Ryzen AI Software with a specifically supported model, which is a different model portfolio
than the one this workstation wants.

Where it could earn a place later: embeddings, reranking, ASR, and OCR running *concurrently*
with the GPU-resident LLM, so they do not steal bandwidth from decode. That is a real
architectural benefit on a bandwidth-limited part — the NPU has its own execution resources.
But it is **WATCH**, not **BUILD NOW**, and it should not shape the initial build.

---

# 15. Windows 11 developments

| Item | Value on this machine |
|---|---|
| Build | **26200.9168**, `DisplayVersion 25H2` |
| Relevance | **This is the exact build AMD's ROCm 7.14.0 matrix names for Ryzen AI Max** |
| WDDM shared-memory behaviour | measured, §8.1 — 48,938 MB shared over 63.79 GB system RAM |
| WSL2 | installed, Ubuntu, **WSL version 2**; package repaired to 2.7.12.0 and kernel 6.18.33.2 during this investigation (§6.7). Not part of the recommended execution path — see §19.2 |
| Insider builds | **not recommended** |

**Q36 — are recent Windows builds materially improving Strix Halo local AI?** For this machine
the material fact is alignment rather than a new subsystem: 25H2 / build 26200 is the version
AMD certifies for gfx1151 ROCm support. That alignment is what makes §9 and §10 possible.

**Q37 — are any Insider features compelling enough to test?** **No.** Nothing found in this
investigation identifies an Insider-only capability that changes GPU memory allocation, ROCm
availability, or inference throughput on this part. The machine is already on the certified
build. Moving to Insider would trade a certified configuration for no identified gain.
Classification: **REJECT FOR NOW**.

---

# 16. Storage plan

## 16.1 Current state

| Volume | Size | Free |
|---|---|---|
| `C:` — Micron 4600 NVMe SSD | 1905.6 GB | **852.5 GB** |
| `D:` — Seagate One Touch Hub, USB **HDD** | 7451.8 GB | 4346 GB |

Models currently consume **549.14 GB**.

## 16.2 Recommended allocation

| Purpose | Budget | Notes |
|---|---|---|
| Windows + drivers + apps | ~200 GB | as-is |
| Dev toolchain, Node/pnpm store, Python envs, repos | ~150 GB | pnpm's content-addressed store grows quietly |
| **Model weights** | **≤ 700 GB** | a ceiling, not a target — currently 549 GB |
| DSH state, sessions, logs, spill | ~50 GB | `$DSH_HOME`; `session-query-sqlite` and `spill-local` both write |
| Benchmark data + evidence | ~20 GB | |
| **Free reserve** | **≥ 250 GB** | do not go below |

**Keep model weights on `C:` (NVMe).** `D:` is a USB **hard disk**, not an SSD. §8.4 showed
that a model falling out of residency costs a full reload inside the next request's TTFT —
paying that from spinning rust over USB would be severe. `D:` is correct for archives,
benchmark artefacts and GGUF files not in rotation; it is wrong for anything LM Studio may
need to page in.

## 16.3 Changes actually made to this machine during the investigation

Recorded here because the rest of the report asserts the machine was left alone.

| Change | Reason | Reversible |
|---|---|---|
| Downloaded LM Studio runtime `llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1` (210.73 MB) | required for the controlled backend comparison in §10 — it is not possible to compare ROCm against Vulkan without it | yes — `lms runtime remove` |
| Cloned `deepseek-harness` to `dsh-halo-research\_upstream\` | source reading for §4–§6 | yes — delete |
| Created `C:\Users\scott\Desktop\Code\dsh-halo-research\` | report, evidence, benchmark scripts | yes — delete |
| Ran inference requests against the already-running LM Studio server on `:1234` | benchmarks | no persistent effect |
| **Temporarily selected the ROCm runtime** and reloaded the model on it | the §10 comparison cannot be made any other way | **done — reverted, see below** |
| **`wsl --update`** — WSL package 2.6.3.0 → 2.7.12.0 | the package was `Modified, NeedsRemediation`; both its App Execution Aliases were dead (§6.7) | **intentionally permanent** — this repaired damaged system state |
| **Installed a `bash` shim** at `C:\Users\scott\.local\bin\bash.exe` + `.shim` | the MS `bash.exe` alias silently dropped `-c` arguments and piped stdin — 7/9 on the conformance battery (§6.8) | yes — delete the two files; the MS alias is shadowed, not removed |

### The runtime switch, and its restoration

To measure ROCm the selected runtime had to be changed and the model reloaded. Both were done
with the model's exact prior parameters recorded first
(`evidence/PRE-SWITCH-lms-ps.json`) and restored afterwards:

```
lms runtime select llama.cpp-win-x86_64-vulkan-avx2@2.29.1
lms load unsloth/qwen3.8-27b --identifier qwen/qwen3.8-27b \
         --context-length 131072 --parallel 1 --ttl 86400 -y
```

**Verified restored state:** selected runtime `llama.cpp-win-x86_64-vulkan-avx2@2.29.1`;
`qwen/qwen3.8-27b` resident at Q5_K_XL, `contextLength 131072`, `parallel 1`, `ttlMs 86400000`
— identical to the pre-investigation reading. System RAM free returned to 19.22 GB and GPU
local to 29.25 GiB.

**One incident worth recording.** During the ROCm long-context rung the machine reached
**1.55 GB of free system RAM** with the GPU process holding **78.39 GiB** (§10.4). The run
completed, and the state above was restored immediately afterwards. This was a live box running
other services; the ROCm long-context path should not be re-run on it without first reducing
the model's context length.

**No DSH configuration was written. No VGM setting was changed. No `PATH` entry was added or
removed — the user `PATH` is byte-identical to the backup taken at
`evidence/HKCU-Path-backup.txt`. The machine ends this investigation on the runtime and model
configuration it started with, plus two deliberate repairs: the WSL package is healthy (§6.7)
and `bash` is fully conformant (§6.8).**

---

# 17. Benchmark and acceptance-test architecture

## 17.1 Why the obvious benchmark is the wrong one

Decode tokens/sec is the number everyone quotes and the least useful one for this workload.
An agent turn is dominated by **prefill**: a repository file, a 4,000-line diff, a tool result,
a compaction pass. §10 measures a 45 K-token prompt taking minutes to first token while decode
sits comfortably around 20 tok/s. **Optimising this machine for decode would optimise the part
that is already fine.**

## 17.2 The suite

### Tier 1 — raw inference (scripted, repeatable)

`bench/Bench-Local.ps1` in the research directory implements this. Two methodological
requirements it enforces, both learned the hard way during this investigation:

1. **A discarded warm-up request.** LM Studio lets an idle model fall out of residency; the
   first request then pays a 21 GB reload *inside TTFT*. Without a warm-up the first rung is
   pure noise — observed as 22.8 s TTFT for a 274-token prompt.
2. **A unique nonce at the head of every prompt.** Without it, successive rungs share a prefix
   and are served from the prompt cache. Measured effect: apparent marginal prefill fell from
   **336.7 tok/s (cached)** to **196.6 tok/s (honest)** on the same rung — a 71 % overstatement.

A third requirement was learned by violating it: **nothing else may touch the server during a
run.** One benchmark pass in this investigation was discarded because interactive compat probes
were issued against the same single-slot server mid-run.

A fourth was learned by being challenged on it: **one run per configuration is not a
measurement.** Every rung must be repeated — `n = 4` proved sufficient here — and every
backend comparison must be expressed in **units of measured noise**, not as a bare ratio.
`bench/Compute-BenchStats.ps1` does this and refuses to call anything under 3 sd decisive.
Replication changed several conclusions in §10; see §10.6 for what it overturned.

### Tier 2 — DSH agent performance

Fixed, repeatable tasks against a real repository, scored on completion rather than speed:
repository comprehension; multi-file edit; a test/fix loop; a Git operation; a PowerShell
operation; use of a specific tool; a long-running task that crosses a compaction boundary; a
deliberately oversized tool output; recovery after a tool error.

### Tier 3 — reliability

Tool-call success rate, malformed calls, hallucinated tools, loops, context failures,
truncation, incorrect edits, permission failures. **This tier decides the model choice, not
Tier 1.** A model that is 30 % faster and emits one malformed tool call in twenty is worse than
a slower model that never does.

## 17.3 Acceptance criteria

The environment is **not** complete because DSH opens and a model answers "hello". Acceptance
requires all of:

1. `lms ps --json` shows the intended model **and quantization** resident.
2. `dsh --dump-config` shows the intended provider and model — not `deepseek-official`.
3. A DSH session completes a multi-file edit in a real repository, using the PowerShell tool
   seam, with the sandbox in `workspace-write`.
4. A tool call whose result exceeds 100 KB is ingested without breaking the turn.
5. A session survives at least one compaction and continues correctly.
6. The network is disconnected and the same task still completes — **the only real proof that
   the work is local**.
7. `--dump-config` shows `tool-bash` carrying a `disabled` key and `tool-pwsh` active — read the
   **row**, not the package name (§6.5).

Criterion 6 is the one that would have caught the failure mode §18.4 describes. Criterion 7 is
the one that would have caught the false finding retracted in §6.5.
