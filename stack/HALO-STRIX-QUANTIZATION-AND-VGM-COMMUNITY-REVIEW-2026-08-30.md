# Halo Strix Halo Quantization and VGM Community Review

**Date:** 2026-08-30  
**Purpose:** Determine whether the current Halo daily configuration stopped at “good enough,” particularly the use of Q4_K_M weights and the 64/64 VGM split.  
**Status:** Research and recommendation only. No models, VGM settings, aliases, or DSH configuration were changed during this review.

## Executive judgment

The earlier advice—keep Q4_K_M indefinitely and consider Q6 only after repeated real failures—was **too conservative**.

It was reasonable as an operational acceptance decision: the current Q4_K_M worker has completed real gated coding work, it was a clear improvement over the former Q4_K_S worker, and the mechanical verifier prevents an unverified result from being promoted. But it was not a sufficient *optimization* decision. It treated “works” as evidence that a potentially better quant was not worth auditioning.

The corrected judgment is:

1. **Do not blindly convert both Halo models to Q6.** The available evidence does not justify that, and two Q6 models would be uncomfortably close to the 64 GB dedicated-memory ceiling.
2. **Do run a short, controlled Q6 worker audition after reboot.** The worker writes the code, so any quantization-related reasoning or tool-call improvement has the highest leverage there.
3. **Keep the Q4_K_M brain for the first experiment.** That preserves the measured speed and leaves enough memory to test a Q6 worker beside it.
4. **Judge the quant by verified time-to-green and first-pass correctness, not perplexity or raw tokens/second.** A mechanical gate protects the repository, but it does not make a weaker model equally productive.
5. **Keep 64/64 as the correct next boot profile.** AMD's 96 GB recommendation is for very large AI-only workloads. The current Halo pair plus a 16 GB CivicCast Sandbox is a mixed workload, and the 120B model that originally justified 96/32 has been removed.

In short: **64/64 is still the right reboot choice, but Q4_K_M should now be considered the proven baseline—not the final quantization verdict.**

## What AMD actually says

AMD's July 2025 FAQ makes two distinct claims.

### VGM

AMD describes Variable Graphics Memory as a BIOS-level reallocation of system RAM into a contiguous dedicated graphics-memory block. It warns that the allocation is removed from CPU-accessible system RAM and may hurt system performance if used incorrectly. AMD maps `Default`, `Medium`, `High`, and `Custom (75%)` to casual, gaming, power-user, and AI-enthusiast use. Its 96 GB example is explicitly about running 4-bit models up to roughly 128B parameters or FP16 models up to roughly 32B.

That is honest generic product guidance. It does **not** mean that every 128 GB Strix Halo used for AI should run 96/32. Scott's actual workload matters:

- the daily Halo models are about 22.1 GB and 18.6 GB on disk;
- their measured dual-resident Q4 runtime used roughly 49 GiB dedicated GPU memory;
- CivicCast uses a Windows Sandbox capped at 16 GB;
- the 120B model that motivated 96 GB did not become the daily brain and has been deleted.

For this mixed workload, 64/64 is a better-balanced profile. It still gives the current model pair enough dedicated space while making a single 16 GB Sandbox much less likely to starve Windows.

### Quantization

AMD calls Q4_K_M the common balanced/recommended llama.cpp quant, then argues that coding shows deterioration at Q4 and that Q6 is “generally the minimum viable level for coding.” It recommends Q6 or higher for accuracy-sensitive work.

The direction is credible: higher-bit quants usually reduce quantization loss. But the article does not publish a controlled coding-task matrix supporting the universal Q6 threshold. It moves from generic perplexity numbers—originally measured on a different, older model—to a broad coding recommendation. That is useful advice, not a model-specific acceptance test.

AMD's statement should therefore trigger an experiment. It should not replace one.

## What the community evidence says

The community does **not** support a universal “Q6 always wins for coding” rule. It supports a more important rule: **quant choice is model-, quantizer-, template-, runtime-, and workload-specific.**

### Evidence favoring higher fidelity

- A 2026 Strix Halo study ran 23 deployments through 230 executable coding requests. Qwen3.8-27B Q6_K scored 8/10, tied its much larger Q8 build, and outperformed that study's Q4 result. That is the strongest direct reason not to stop at Q4 automatically.
- Current GGUF inventories show the expected quality gradient. A Qwen3 Coder 30B Q6_K is about 25.1 GB versus 18.6 GB for Q4_K_M. Qwen3.6 35B Q6 variants are roughly 28.5–31.0 GB versus roughly 21–22 GB for Q4 variants.
- Current quantization data for Qwen3.6 shows substantially lower perplexity/KL divergence at Q6 than Q4. That proves closer reproduction of the original model distribution, although it still does not prove better agentic coding.

### Evidence favoring a strong Q4

- A recent Strix Halo owner tested 144 hostile tool calls, 16 agentic tasks, polyglot exercises, and long-context replay across Qwen3.6 variants. Their UD-Q4_K_XL model beat Q6 on the small agentic set: 93.8% versus 68.8%, while tool-call validity was essentially tied. The author explicitly concluded that the dynamic Q4 kept important tensors at higher precision and that plain Q6 spent extra memory without improving the real work.
- Large Strix Halo benchmark repositories repeatedly call Q4_K_M or UD-Q4_K_XL the balanced/all-rounder choice. Qwen3 Coder 30B Q4 variants are commonly measured in the 90–98 t/s range on tuned Linux Vulkan/RADV paths.
- A current Strix Halo optimization effort deliberately focuses on Q4_K_XL for Qwen3.6 35B-A3B rather than treating Q6 as the automatic target.

These results are not contradictory once their boundaries are respected. Different Qwen generations, quantizers, templates, backends, and task harnesses can reverse the ranking.

### Speed and backend lessons

- Strix Halo is strongly memory-bandwidth-bound. MoE models remain the right shape for the Halo planner and worker because only a small fraction of total parameters are active per token.
- One Qwen3.6 Strix Halo quant sweep found only a modest decode drop moving from Q4 toward Q6, suggesting that a higher quant may be affordable when it improves useful work. Other builds show different deltas.
- Community llama.cpp forks report substantial long-context/prefill improvements from Strix-specific Vulkan/ROCm work. Those results are real enough to track, but they are mostly Linux/custom-backend results. Replacing LM Studio with a maintained custom llama.cpp stack would be a separate project, not a safe post-reboot tweak.
- Video demonstrations show Strix Halo running 100B-plus models, but they mostly establish capacity, not daily coding productivity or Q4-versus-Q6 correctness. They should not drive the Halo quant decision.

## Reddit evidence boundary

Direct Reddit RSS requests were attempted first, serialized with the required delay, and Reddit returned HTTP 429 for both the search feed and the selected thread feeds. Publicly indexed Reddit pages were still available through the web index and are cited as anecdotal community evidence. They were not treated as reproducible benchmarks unless they included a method and result table.

This matters because Reddit contains both of the opposing claims: some owners prefer Q6 for coding fidelity, while at least one unusually detailed agentic harness found a dynamic Q4 decisively better than Q6. The disagreement is itself useful evidence against a universal quant rule.

## What we missed

The project did not miss the basic hardware shape. It correctly converged on Vulkan, 32K context, parallel=1, MoE models, flash attention, and a mechanical verification boundary.

It did miss three optimization disciplines:

1. **A working quant was promoted into a lasting policy without a same-model higher-quant audition.** Passing Hardgate proved deployability, not optimality.
2. **The verifier's protection was overcounted.** It prevents false completion, but a weaker worker can still take more retries, consume more context, or fail tasks a stronger quant would solve.
3. **Generic quality advice was initially dismissed too quickly.** AMD's Q6 claim is not enough to change production blindly, but it is enough to warrant a cheap experiment on hardware with this much memory.

## Memory feasibility at 64/64

The first experiment should be mixed-quant:

- brain: Qwen3.6 35B-A3B Q4_K_M, unchanged;
- worker candidate: Qwen3 Coder 30B-A3B Q6_K, about 25.1 GB;
- context: 32K each;
- parallel: 1 each;
- one generating at a time.

The Q6 worker adds about 6.5 GB of weight data over the current Q4_K_M worker. Starting from the observed roughly 49 GiB Q4/Q4 dual-resident footprint, the mixed pair should land in roughly the mid-50 GiB range before run-to-run/runtime variation. That is plausible inside 64 GB dedicated memory, but it is close enough that the load must be measured.

Both models at Q6 would add roughly 13–16 GB of weights and likely consume essentially the entire dedicated block once context/runtime overhead is included. That is not a sensible daily default at 64/64.

A Q5_K_M worker (about 21.7 GB) is a useful middle option if Q6 is beneficial but too tight. It should be treated as the fallback experiment, not added to the first short comparison.

## Recommended post-reboot experiment

This is intentionally short. It is not another multi-hour benchmark campaign.

### Step 1 — confirm the reboot state

- Windows reports approximately 64 GB dedicated graphics memory and 64 GB remaining system memory.
- LM Studio and DSH are healthy.
- No Sandbox is active during the model load.
- Existing Q4 aliases remain untouched and available for rollback.

### Step 2 — add one candidate only

Acquire a reputable Qwen3 Coder 30B-A3B Instruct Q6_K GGUF (approximately 25.1 GB). Create a separate alias with the exact same template, 32K context, `parallel=1`, KV policy, batch settings, and tool surface as the current Q4_K_M worker. Do not overwrite the working alias.

### Step 3 — run a bounded A/B

Use the same deterministic tool-call probe and two comparable gated coding units:

1. one known small Hardgate-shaped unit;
2. one medium multi-file unit, because scale is the current unproven boundary.

Record only:

- valid tool-call rate;
- first-pass gate result;
- number of repair attempts;
- verified time-to-green;
- prompt/output tokens and total wall time;
- peak dedicated/shared GPU memory and minimum Windows free memory.

Expected duration: roughly 20–40 minutes after the model is present, not including download time.

### Promotion rule

Promote Q6 only if it produces a meaningful operational improvement—fewer failed/repair turns, a Q4 failure that Q6 solves, or reliably better first-pass results—without paging or a material time-to-green regression. A reasonable initial ceiling is no more than about 15–20% slower time-to-green when quality is equal.

If both quants produce the same verified result, Q4_K_M wins because it is smaller, faster, and leaves more memory for Windows and the Sandbox.

If Q6 is better but memory is uncomfortable, audition Q5_K_M as the compromise.

## Final recommendation

The honest position is neither “AMD says Q6, so switch everything” nor “Q4 passed once, so stop.”

**Reboot at 64/64. Keep the current Q4/Q4 configuration as the known-good baseline. Then perform one short Q6-worker audition behind the existing mechanical gate.**

That uses the box's extra capability without sacrificing the stack that already works. It also answers the only question that matters: does the higher quant ship correct software faster or more reliably on this exact Windows + LM Studio + DSH stack?

## Sources

### First-party and primary technical sources

- AMD, “FAQs: AMD Variable Graphics Memory, VRAM, AI Model Sizes, Quantization, MCP and More!” (2025-07-29): https://www.amd.com/en/blogs/2025/faqs-amd-variable-graphics-memory-vram-ai-model-sizes-quantization-mcp-more.html
- llama.cpp quantizer source and current quant descriptions: https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/quantize.cpp
- Qwen3 Coder 30B GGUF quant inventory, including Q4_K_M 18.557 GB and Q6_K 25.093 GB: https://huggingface.co/tensorblock/Qwen_Qwen3-Coder-30B-A3B-Instruct-GGUF
- Qwen3.6 35B-A3B GGUF quant inventory: https://huggingface.co/bartowski/Qwen_Qwen3.6-35B-A3B-GGUF
- Qwen3.6 specialized quant measurements: https://huggingface.co/AesSedai/Qwen3.6-35B-A3B-GGUF/blob/main/README.md

### Strix Halo community benchmarks and engineering reports

- Strix Halo guide and raw benchmark ledger: https://github.com/hogeheer499-commits/strix-halo-guide/blob/main/BENCHMARKS.md
- 23-deployment, 230-request executable coding comparison: https://www.soothill.io/blog/2026/08/14/coding-model-benchmark-strix-halo/
- Current Strix Halo llama.cpp performance fork and correctness-gated results: https://github.com/Nathanw1014/strix-halo-llamacpp
- Strix Halo quant/performance notes: https://github.com/fewtarius/CachyLlama/blob/master/STRIX_HALO_NOTES.md
- Pre-tuned Strix Halo model catalog and benchmark rows: https://github.com/apellegr/Strix-Halo-Models/blob/main/README.md
- Community Qwen3.6 agentic/tool-call quant comparison: https://www.reddit.com/r/LocalLLM/comments/1uydqr8/i_made_claude_code_test_every_single_variant_of/
- Community same-build Strix Halo cache/model matrix: https://www.reddit.com/r/StrixHalo/comments/1vn9kn4/i_benchmarked_nine_models_on_one_llamacpp_build/
- Earlier Windows Strix Halo agentic-use discussion: https://www.reddit.com/r/LocalLLaMA/comments/1m6b151/updated_strix_halo_ryzen_ai_max_395_llm_benchmark/

### Video/capacity context

- Donato Capitella, Strix Halo running GLM 4.5 Air 106B and Qwen3 235B: https://www.youtube.com/watch?v=wCBLMXgk3No

Video and very-large-model demonstrations were used only as capacity/context evidence, not as proof of coding quality or of a Q6 advantage.
