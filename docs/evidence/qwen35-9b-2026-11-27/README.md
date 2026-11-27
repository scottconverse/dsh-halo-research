# Qwen3.5-9B on three Windows PCs

The November 27, 2026 benchmark compared the same LM Studio Community Q4_K_M GGUF on Strix Halo, RTX 5060 Ti, and RTX 5070 Ti. Each ran llama.cpp build 12532. Halo used Vulkan and the Blackwell cards used CUDA. The benchmark covered real headless DSH Web and Desktop tasks at 8K and direct, prompt-matched replays at 8K and 32K.

- [Live HTML report](https://scottconverse.github.io/dsh-halo-research/benchmarks/qwen35-9b-2026-11-27/)
- [HTML source](../../../site/benchmarks/qwen35-9b-2026-11-27/index.html)
- [DSH task evidence](../../../site/benchmarks/qwen35-9b-2026-11-27/evidence/dsh-tasks.csv), [direct replay evidence](../../../site/benchmarks/qwen35-9b-2026-11-27/evidence/direct-replays.csv), and [prompts, request measurements, provenance, and validation](../../../site/benchmarks/qwen35-9b-2026-11-27/evidence/receipts.json)

All 18 task instances met their functional criteria. All six extraction replies contained the correct values and failed strict JSON parsing because of Markdown fences. The initial Halo Desktop harness rejected an additional tool before inference. The rerun changed only the isolated fixture. The direct replays include two warmups and nine scored coding prompts at the two configured context sizes per machine. Task times reflect single runs. Provider decode rates and DSH elapsed times measure different things.

Publication reused the saved results and synthetic fixtures. The published evidence contains the actual prompts, relevant outputs, timings, and cleanup outcomes. Local paths, identifiers, and raw session logs were excluded. No models were downloaded or loaded for publication.
