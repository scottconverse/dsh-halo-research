# Linux Halo engine recommendation — October 19, 2026

Research only: no installs, downloads, inference, benchmarks, configuration changes or model jobs. Current upstream documentation reviewed October 19. Coordinator token accounting is not exposed by the tools; no token estimate is presented as measured.

## Recommendation

Provisionally choose Halogen Flash Server for a dedicated Linux Halo whose main role is text-based journalism and long-document questioning. This is a workflow recommendation, not proof of superior factual accuracy or a measured head-to-head winner. Keep Gufo as the alternative where changing supported models, source-level control or broader local AI work dominates. The model/checkpoint and document preparation matter more to answer quality than an engine label.

## Evidence and qualifications

- [Halogen quality](https://github.com/peonist-ai/halogen-flash-server/blob/main/docs/quality.md) reports 148/150 synthetic retrieval cases through 32K; two plausible fabricated codes were failures. The authors attribute those misses to the attention budget and report recovery with 4096. This is retrieval evidence, not proof of reasoning, source attribution or journalism quality at 128K/262K.
- [Halogen configuration](https://github.com/peonist-ai/halogen-flash-server/blob/main/docs/configuration.md) documents 262K native context, repeated questions over a retained document, optional disk persistence and an increased attention budget. For quality-prioritized document lookup, 4096 is the proposed attention budget, not a change made here. Keep native context rather than enabling 1M YaRN by default. Disable experimental composable-context reuse; avoid optional KV8 and smaller/lower-precision variants initially. Cache mode 1 offers exact cold/warm reproducibility at a substantial latency cost; that is not a claim it is more accurate than mode 2.
- [Halogen published performance](https://github.com/peonist-ai/halogen-flash-server/blob/main/docs/performance.md) now covers 0.18.11. Earlier 0.18.0 workload-specific measurements include about 54 tokens/s prose and document explanation. These are vendor observations, not predictions for Scott's machine.
- [Gufo current measurements](https://github.com/gufo-org/gufo/blob/main/docs/models/qwen3.8-flash-next/BENCHMARKS.md) were refreshed October 18 at fec4759d. Mixed MTP is about 36–40 tokens/s through 128K; repetitive output exceeds 100. Those values cannot be directly ranked against Halogen's different checkpoint, prompts and sampling.
- [Gufo cache](https://github.com/gufo-org/gufo/blob/main/docs/KV-CACHE.md) supports disk restart recovery and shared-prefix reuse. Disk caching is not exclusive to Halogen.
- [Gufo quality](https://github.com/gufo-org/gufo/blob/main/docs/models/qwen3.8-flash-next/QUALITY.md) records extensive numerical/regression checks, an unresolved vision comparison discrepancy and remaining timing qualifications. Preserving previous logits does not establish upstream model fidelity or factual-answer quality. Neither runtime is qualified here as the sole OCR reader for scanned records.

Suggested initial use is one primary text research conversation, ordinary native context, disk persistence and no NPU co-running. DSH remains on Windows and would call the Linux API; Wigolo, Reddit/Redlib and XERJ keep their jobs. This topology is proposed, not installed or end-to-end verified. Retain original documents and passage-level sourcing: fast context processing does not ensure that every passage was considered.

The recommendation can change with stronger matched quality evidence. No evidence reviewed establishes that either engine produces the best journalism answers on Scott's material.