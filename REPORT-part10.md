# 10. Vulkan versus ROCm — measured on this machine

This is the section the directive cares most about, and the one where secondary sources are
least trustworthy. Everything below was measured on the target machine on 2026-08-23.

## 10.1 Why this comparison is unusually clean

Both backends are the **same llama.cpp version, 2.29.1**, shipped as interchangeable LM Studio
runtime extensions. Only the backend changed between runs:

| Held constant | Value |
|---|---|
| Model | `unsloth/Qwen3.8-27B-GGUF/Qwen3.8-27B-UD-Q5_K_XL.gguf` |
| Quantization | Q5_K_XL (5-bit), 21.15 GB on disk, 19.69 GiB loaded |
| Context length | 131,072 |
| `parallel` | 1 |
| llama.cpp | **2.29.1 on both sides** |
| Sampling | `temperature = 0` |
| Output cap | 192 tokens |
| Machine state | VGM 64 GB, driver 32.0.31035.1003, nothing else driving the GPU |

Method: an HTTP ladder over the OpenAI-compatible endpoint, each rung prefixed with a **unique
GUID nonce** so no rung is served from a previous rung's prompt cache, preceded by a **discarded
warm-up** request so no rung pays a model reload inside TTFT. Both backends ran the identical
script, and nothing else touched the server during either run.

> **Three runs were discarded before these were accepted.** The first shared a prompt prefix
> across rungs and measured the prompt cache (inflating marginal prefill by ~71 %). The second
> and third were contended — interactive probes were issued against the same single-slot server
> mid-run. Only uncontended, cache-defeated, warmed runs appear below. The discarded CSVs are
> kept in `evidence/` deliberately.

## 10.2 Results

The 8 KB and 32 KB rungs were run **four times on each backend** (`n = 4`) and are reported as
mean ± sample standard deviation. The 64 KB and 256 KB rungs remain **`n = 1`** and are labelled
as such throughout — see §10.6.

### Time to first token (lower is better)

| Prompt | Prompt tokens | n | Vulkan | ROCm | ROCm advantage | Separation |
|---:|---:|:-:|---:|---:|---:|---:|
| 8 KB | ~1,488 | **4** | 22.600 ± 0.115 s | **7.715 ± 0.025 s** | **2.93×** | **179 sd** |
| 32 KB | ~5,654 | **4** | 44.392 ± 0.072 s | **21.218 ± 0.328 s** | **2.09×** | **98 sd** |
| 64 KB | ~11,211 | 1 | 76.884 s | **41.558 s** | 1.85× | *unreplicated* |
| 256 KB | ~44,531 | 1 | 278.536 s | 244.161 s | 1.14× | *unreplicated, confounded — §10.6* |

### Marginal prefill throughput

The slope between rungs, which removes the large fixed per-request overhead that contaminates a
naive `prompt_tokens ÷ TTFT`. **This is the honest prefill number.**

| Segment | n | Vulkan | ROCm | ROCm advantage |
|---|:-:|---:|---:|---:|
| **8 KB → 32 KB** | **4** | **191.1 ± 0.4 tok/s** (cv 0.21 %) | **308.7 ± 7.3 tok/s** (cv 2.36 %) | **+61.5 %, 23 sd** |
| 32 KB → 64 KB | 1 | 170.9 tok/s | 269.3 tok/s | +58 % *(unreplicated)* |
| 64 KB → 256 KB | 1 | 165.2 tok/s | 164.5 tok/s | −0.4 % *(unreplicated, confounded)* |

### Decode throughput (higher is better)

| Prompt | n | Vulkan | ROCm | Vulkan advantage | Verdict |
|---:|:-:|---:|---:|---:|---|
| 8 KB | **4** | **16.05 ± 0.24** (cv 1.5 %) | 14.03 ± 1.26 (cv **9.0 %**) | +14.4 % | **suggestive only — 2.2 sd** |
| 32 KB | **4** | **15.35 ± 0.67** (cv 4.3 %) | 12.23 ± 0.49 (cv 4.0 %) | +25.6 % | **decisive — 5.3 sd** |
| 64 KB | 1 | 16.2 | 11.9 | +36 % | *unreplicated* |
| 256 KB | 1 | 14.8 | 7.2 | +106 % | *unreplicated, confounded* |

> **A single-run claim that did not survive replication.** The first draft of this report stated
> that Vulkan wins decode at 8 KB "by 21 %", from one run of each. With `n = 4` the gap is
> **14.4 %** and only **2.2 standard deviations** — suggestive, not decisive. One ROCm repeat
> returned 15.9 tok/s, statistically on top of Vulkan's 16.05 mean. **The corrected claim is that
> Vulkan's decode is modestly faster and far more *consistent*, not that it is decisively faster
> at short context.**

## 10.3 What this says

**Q10 — does Vulkan outperform ROCm?**
**On decode, yes — but by less than first reported, and only decisively from 32 KB upward.**
At 8 KB the gap is 14.4 % at 2.2 sd (suggestive). At 32 KB it is 25.6 % at 5.3 sd (decisive).
Vulkan's larger and more reliable advantage is **consistency**: its 8 KB decode has a coefficient
of variation of **1.5 %** against ROCm's **9.0 %** — ROCm's decode is roughly six times noisier
run to run.

**Q11 — where does ROCm outperform Vulkan?**
**On prefill, decisively, and by a wide margin in the band an agent actually occupies.** At 8 KB
it is **2.93× faster** to first token (179 sd); at 32 KB, **2.09×** (98 sd); marginal prefill is
**+61.5 %** (23 sd). These are the most solid numbers in this report — the coefficient of
variation on Vulkan's marginal prefill is **0.21 %**.

**The advantage appears to fade at long context, but that measurement is not trustworthy.**
The 64 KB→256 KB segment shows 165.2 vs 164.5 tok/s — apparent parity — from **one run each**,
and the ROCm run executed with the machine at **1.55 GB of free RAM**. Memory pressure is a
plausible cause of that degradation, which means the "parity at 45 K" and "decode collapses to
7.2 tok/s" findings may be *consequences of the memory behaviour rather than independent
results*. **They are retained as observations and explicitly not relied upon.** §10.6.

Against community reports **[community]** (ROCm ≈ +20.6 % prompt processing, ≈ −24.6 %
generation): the decode penalty brackets their figure well at 32 KB, while the prefill advantage
measured here is **three times larger** than theirs. The claim that ROCm "uses less memory than
Vulkan" is contradicted at every workload measured here (§10.4).

## 10.4 The memory measurement

Sampled from the OS's own `\GPU Process Memory(*)` counters — **telemetry independent of
LM Studio and of the benchmark script** — at matched workloads on each backend.

| Workload | Vulkan | ROCm | Ratio |
|---|---:|---:|---:|
| Model loaded, idle | 26.73 GiB | — | — |
| **After the 32 KB rung** (n=1 Vulkan, **n=3 ROCm**) | **29.35 GiB** | **46.60 GiB** | **1.59×** |
| After the 45 K-token rung (n=1 each) | 29.35 GiB | **78.39 GiB** | 2.67× |
| Free system RAM, 45 K-token rung | 18.42 GB | **1.55 GB** | — |
| Shared (non-local) GPU memory | 0 GiB | 0 GiB | — |

The correct statement is not a single ratio. It is a difference in **shape**:

- **Vulkan's footprint is flat.** 29.35 GiB after a 32 KB prompt and 29.35 GiB after a 45 K-token
  prompt — because llama.cpp preallocates the whole KV cache at load (§8.4). Prompt size does not
  move it.
- **ROCm's footprint grows with the prompt.** 46.60 GiB at 32 KB, rising to 78.39 GiB at 45 K
  tokens, sampled mid-rung at 64.79 → 69.57 → 78.39 GiB, eventually exceeding the 63.83 GiB
  dedicated carve-out and driving free system RAM to **1.55 GB**.

**The 46.60 GiB figure was identical across all three ROCm repeats** — this is a reproducible
structural property, not a transient. And critically, **it appears at ordinary prompt sizes**, so
it is not an artefact of the extreme 256 KB rung.

Three consequences:

1. **This directly contradicts the community claim** that ROCm uses *less* memory than Vulkan.
   That claim almost certainly describes **Linux**, where AMD's GTT-based model applies (§8.2).
   On Windows the memory model is different, and the claim does not transfer. This is precisely
   the Linux→Windows substitution the directive warns against.
2. **It is a stability hazard on a working machine.** 1.55 GB of free RAM on a box also running
   a browser, an IDE and the harness is the edge of thrashing.
3. **It caps headroom.** A second resident model would not fit alongside ROCm's working set,
   which removes the multi-model portfolio §13.2 wants.

The mechanism was not isolated. The plausible cause is HIP compute-buffer sizing scaling with
batch; community evidence points at `GGML_HIP_NO_VMM=ON` as a related HIP VMM defect on this
GPU **[community]**, but LM Studio's runtime does not expose that flag, so it could not be
tested here. **Recorded as an open unknown (§27), not as an explanation.**

## 10.5 Verdict and the selected backend

**Vulkan is the default on this machine. ROCm is an experimental lane with a narrow, real use.**

| | Vulkan | ROCm | Confidence |
|---|---|---|---|
| Prefill, 1.5 K tokens | slower | **2.93× faster** | n=4, 179 sd |
| Prefill, 5.7 K tokens | slower | **2.09× faster** | n=4, 98 sd |
| Marginal prefill 8→32 KB | 191.1 tok/s | **308.7 tok/s (+61.5 %)** | n=4, 23 sd |
| Decode, 8 KB | **16.05 tok/s** | 14.03 tok/s | n=4, **2.2 sd — suggestive only** |
| Decode, 32 KB | **15.35 tok/s** | 12.23 tok/s | n=4, 5.3 sd |
| Decode consistency | **cv 1.5 %** | cv 9.0 % | n=4 |
| GPU memory at 32 KB | **29.35 GiB** | 46.60 GiB (**1.59×**) | ROCm n=3, identical each time |
| GPU memory at 45 K tokens | **29.35 GiB — flat** | 78.39 GiB, **growing** | n=1 |
| Free system RAM, long rung | **18.42 GB** | 1.55 GB | n=1 |
| Headroom for a second model | **yes** | no | — |
| **Verdict** | **BUILD NOW — default** | **EXPERIMENTAL LANE** | |

**The honest summary, after replication:** ROCm wins prefill decisively and by a large margin —
that is the most solid result in this report. It loses decode, though by less than first stated
and only decisively from 32 KB up, and its decode is six times noisier. It costs **1.59× the GPU
memory at ordinary prompt sizes**, and unlike Vulkan its footprint **grows with the prompt**
rather than staying flat.

**The deciding factor is memory shape, not throughput.** A backend whose working set scales with
prompt size, on a machine where the carve-out is fixed at 64 GB and other software is resident,
cannot be the default — however fast its prefill. Vulkan's flat 29.35 GiB is what leaves room for
a second model (§13.2) and for the rest of the desktop.

**The machine was returned to Vulkan.** Verified after restore: runtime
`llama.cpp-win-x86_64-vulkan-avx2@2.29.1` selected; `qwen/qwen3.8-27b` resident at Q5_K_XL,
`contextLength 131072`, `parallel 1`; 19.22 GB system RAM free; 29.25 GiB GPU local. See §16.3.

### Where ROCm would still be the right choice

Its band of advantage is real and matches a genuine workload shape: **many short-to-moderate
turns, each with a fresh 2–10 K prompt, where time-to-first-token dominates and total context
stays small.** A subagent fleet doing classification or triage looks exactly like that.

**T-10 — the highest-value follow-up on this box:** load the model on ROCm at a **32 K context
limit** rather than 131 K, re-measure the footprint, and re-run the 8–32 KB rungs. If the
working set stays under ~40 GiB, a ROCm profile becomes a legitimate second lane for
short-prompt work while Vulkan serves the long-context main thread. That is the one experiment
most likely to change this recommendation.

## 10.6 Statistical limitations — what is and is not established

An earlier draft of this section reported every figure from **a single run per rung per
backend**, with no variance and no confidence statement. That was not sufficient to support the
strength of the language used. This section records what replication changed.

### What was done

`bench/Bench-Local.ps1` was re-run to give **`n = 4` per backend** at the 8 KB and 32 KB rungs
(the original accepted run plus three repeats each). `bench/Compute-BenchStats.ps1` aggregates
the accepted CSVs, computes mean/sd/cv, and expresses each backend difference in **units of
measured noise** (pooled standard deviations), classifying anything under 2 sd as *within noise*
and under 3 sd as *suggestive only*. Both scripts are in the research directory; the discarded
runs are excluded by label and kept on disk.

The 256 KB rung was **deliberately not repeated**. On ROCm it drove a live machine to 1.55 GB of
free RAM, and re-running that on a box serving other work was not an acceptable trade.

### What replication changed

| Claim in the first draft | After `n = 4` |
|---|---|
| "ROCm 2.92× faster to first token at 8 KB" | **Held** — 2.93×, 179 sd |
| "+65 % marginal prefill" | **Slightly overstated** — +61.5 % (the single run had caught the high end, 315.7 vs a 308.7 mean) |
| "Vulkan wins decode by 21 % at 8 KB" | **Overstated** — 14.4 %, and only **2.2 sd**. Suggestive, not decisive |
| "ROCm uses 2.7× the GPU memory" | **Workload-dependent** — 1.59× at 32 KB, 2.67× at 45 K tokens. The real finding is *flat vs growing* |
| Decode reliability | **New finding** — ROCm's 8 KB decode cv is **9.0 %** against Vulkan's **1.5 %** |

### What remains unreplicated or confounded

1. **The 64 KB and 256 KB rungs are `n = 1` on both backends.** Every number derived from them —
   including the 1.85× at 64 KB, the "parity at 45 K tokens", and the "+106 % decode" — carries
   no error bar.
2. **The 256 KB ROCm rung is confounded.** It executed with the machine at 1.55 GB free RAM.
   Memory pressure plausibly caused the prefill parity and the decode collapse observed there,
   which would make them *effects of the memory behaviour rather than independent findings*.
   The first draft presented them as separate corroborating evidence. **They are not.**
3. **Memory figures are point samples**, not a time series. They are taken from the OS's
   `\GPU Process Memory(*)` counters — independent of LM Studio and of the benchmark — but
   sampled at the end of a rung rather than continuously. The mid-rung progression
   (64.79 → 69.57 → 78.39 GiB) is three opportunistic samples, not a trace.
4. **One machine, one model, one quantization, one driver.** Nothing here generalises to other
   Strix Halo units, other models, or other driver versions.
5. **TTFT is not pure prefill.** It includes request setup and scheduling. The marginal-slope
   method removes the fixed component but a `llama-bench` microbenchmark (**T-5**) would isolate
   prefill properly, and has not been run.

### What the verdict actually rests on

**Not** the long-context numbers, which are the weakest evidence in the section. It rests on two
results that replicated cleanly at `n = 4`:

- ROCm's prefill advantage in the 1.5 K–5.7 K band is real, large, and reproducible.
- ROCm's memory footprint at an **ordinary 32 KB workload** is 1.59× Vulkan's, identical across
  three repeats, and grows with prompt size where Vulkan's does not.

The second is what makes Vulkan the default. It was measured at a benign workload, so it does not
depend on the confounded long-context rung at all.
