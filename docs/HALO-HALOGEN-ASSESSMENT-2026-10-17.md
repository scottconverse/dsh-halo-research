# Halogen assessment for Scott's Halo — 2026-10-17

Research only. No installation, model download, inference, benchmark, BIOS edit, or DSH configuration change. Sources accessed October 17, 2026. Single-agent source review; no delegated model jobs. Exact coordinator token usage is not exposed by these tools.

## Decision

Halogen is relevant to a future native-Linux Halo inference server, particularly long-context Flash-Next use. It is not a supported native-Windows replacement for the installed Gufo Windows engine. DSH on Windows could call a separate Linux server through its OpenAI-compatible API; that integration is proposed, not tested here. Preserve the current installation and defaults.

## Product and platform

There are two different engines:

- [halogen-flash-server](https://github.com/peonist-ai/halogen-flash-server): specialized for Qwen3.8-Flash-Next and gfx1151; current quickstart pins 0.18.9.
- [halogen-server](https://github.com/peonist-ai/halogen-server): specialized for Qwen3.8-27B; README pins image 0.1.4 and a separate 35.9 GB HGN checkpoint. Its published results are not Flash-Next results.

The [deployment playbook](https://github.com/peonist-ai/halogen-flash-server/blob/main/AGENTS.md) and changelog identify native Linux/amdgpu/KFD requirements and unsupported WSL2. No supported Windows release was established. Having Windows ROCm installed does not supply the Linux host interface this container requires.

The engine is a compiled closed-source binary. The public repository is deployment documentation and tools. Its [EULA](https://github.com/peonist-ai/halogen-flash-server/blob/main/LICENSE.md) permits free commercial/production use without registration or a license key; it is not an MIT/open-source engine.

## Published speed evidence

All numbers below are other people's measurements, not measurements on Scott's computer.

The Flash README's 0.18.0 defaults on Max+395/128GB, about 85 W sustained, greedy/thinking off report about 54 tokens/s prose and 73 code; synthetic prefill 1,821/1,740/1,675 tokens/s at 8K/32K/131K. The authors say real chat-template text prefills 8–12% slower. Predictable repetitive output is faster still and should not be presented as general chat speed. See the [README and measurement conditions](https://github.com/peonist-ai/halogen-flash-server).

The separate 27B README reports DFlash2 mean 31.71 tokens/s, range 20.8–44.2 across ten prompt shapes, and 566 tokens/s prefill at 32K. Its approximately 6.3-bit effective checkpoint differs from Scott's Q6 and Q4 artifacts. These figures do not establish a winner over installed Gufo.

[Independent Tomas Reminek records](https://github.com/tomasreminek/strix-halo) use Linux. Their October 6 matched Unsloth Flash-Next comparison found Halogen 0.16.3 faster at new-prefix prefill, while Strata was faster at decode and cached requests. At 126K input/420 output Halogen recorded 1,702 prefill and 34.98 decode tokens/s, versus Strata 1,294 and 42.71. These were separate measured sessions, not interleaved repetitions; the author explicitly leaves long-term coding/stability superiority unproven.

The [Gufo/Halogen configuration comparison](https://github.com/orenaksakal/strix-halo-gufo-halogen-configs) documents Ubuntu, matched Flash-Next GGUF shards, different compatible draft heads, and pinned September 28 versions. Three configured sessions were capacity, not proof of three simultaneous full-context jobs.

## Cache, concurrency and memory

[Configuration documentation](https://github.com/peonist-ai/halogen-flash-server/blob/main/docs/configuration.md) confirms optional disk prompt-cache persistence through HALOGEN_CACHE_DIR, incremental attention-row writes, restore after restart, configuration-specific stores, and a 64 GiB default disk limit. Reported sizes: roughly 0.9 GB/32K, 2.7 GB/100K, 7.2 GB/262K. A real filesystem supporting direct I/O is required. This preserves computed state; it does not remove active inference memory requirements.

Four generating slots share a KV pool. Published short code results are about 70–72 tokens/s for one stream, 84–85 aggregate for four, about 21 per stream. Four conversations do not each receive single-stream speed.

Engram/lookup-table storage is separate from conversation KV persistence. Putting the latter on an external SSD relocates writes but is not evidence that any external drive performs well or that total writes decrease.

The [quickstart](https://github.com/peonist-ai/halogen-flash-server/blob/main/docs/getting-started.md) requires the minimum explicit BIOS carve-out, not Scott's reported 64 GB allocation. Default Flash weights download is about 111 GiB. [Host guidance](https://github.com/peonist-ai/halogen-flash-server/blob/main/docs/host-setup.md) budgets roughly 89 GiB for the default engine configuration and strongly favors a dedicated machine; ordinary free-memory displays can overstate usable headroom. No BIOS change is authorized by this research.

## NPU, DSH and limitations

The [API](https://github.com/peonist-ai/halogen-flash-server/blob/main/docs/api.md) documents OpenAI chat completions, SSE, streamed function arguments, structured output, Responses and Anthropic Messages. DSH would remain the agent/MCP host; Wigolo, Reddit/Redlib and XERJ retain their roles. API compatibility alone is not an end-to-end DSH verification.

The [NPU documentation](https://github.com/peonist-ai/halogen-flash-server/blob/main/docs/npu-small-models.md) includes embeddings, reranking, small generation and speech-to-text. [Open issue 139](https://github.com/peonist-ai/halogen-flash-server/issues/139) reports whole-machine hangs on 0.16.1/0.16.2 from overlapping NPU/GPU work despite a held fabric clock. This is a specific unresolved report, not proof every current installation fails. Do not promise safe concurrency based solely on feature support.

The supplied secondhand Apple M5 anecdote was not traced to its original post. Halogen's engine targets AMD gfx1151; no Apple performance transfer is established. No performance, quality, concurrency, disk persistence or DSH integration was tested on Scott's hardware in this task.