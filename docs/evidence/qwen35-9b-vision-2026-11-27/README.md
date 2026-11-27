# Qwen3.5-9B vision test on three Windows PCs

On November 27, 2026, Halo, the RTX 5060 Ti, and the RTX 5070 Ti each answered seven questions about the same synthetic image. All seven answers were correct on all three hosts. End-to-end times were 10.40, 13.23, and 51.93 seconds, respectively.

- [Live report](https://scottconverse.github.io/dsh-halo-research/benchmarks/qwen35-9b-vision-2026-11-27/)
- [Report source](../../../site/benchmarks/qwen35-9b-vision-2026-11-27/index.html)
- [Input, answer key, timing data, per-host responses, and cleanup receipts](../../../site/benchmarks/qwen35-9b-vision-2026-11-27/evidence/)

Each host ran one headless request with the same Ollama Qwen3.5-9B Q4_K_M vision bundle, image, and prompt. The Ollama versions differed. The 5070 Ti spent 26.19 seconds loading and 23.91 seconds processing the image and prompt, including a 12.90-second image decode recorded by the runner. Its 1.81-second text generation used CUDA, and the runner log confirms CUDA use for the vision encoder. The records do not establish a single cause for the phase latency.

All test instances reported zero loaded models after the explicit unload. Temporary listeners shut down and the working listeners stayed in place. Publication reused the saved evidence. Internal paths, network addresses, process IDs, and raw server logs are excluded from public receipts. No tests were rerun and no models were loaded to publish this report.
