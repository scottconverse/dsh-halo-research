# Local model alternatives for the DSH stack, from the Epoch AI catalog (2026-09-09)

Author: Claude Fable 5.1 (session code-6c). Input: `C:\Users\scott\Downloads\ai_models.zip` = Epoch AI, "Data on AI Models" (CC-BY 4.0, retrieved 2026-09), four CSV files. Scott asked for a read and an opinion on additional alternatives for the DSH stack. This is analysis only. No model was downloaded, loaded, or changed.

## What the file is, and is not

It is a catalog, not a report: 3,610 model rows (24,084 CSV lines because abstracts span lines) with organization, date, total parameters, notes that usually give active parameters for MoE models, training compute, and a weights-open flag. It has NO benchmarks, no tool-calling results, no GGUF or llama.cpp/Vulkan support data, no quantized sizes, no context-cost data, and only a coarse license class. Those missing things are exactly what decides fit for DSH on HALO. So the catalog can build a shortlist; it cannot pick a winner.

Filter used: Domain contains "Language", published 2025-01-01 or later, weights open, parameters known. Result: 293 rows, 160 in the 5B to 400B range printed and read. The frontier CSV parsed to 137 rows and showed no open-weight rows since June 2025; I did not chase that further.

## HALO constraints that the shortlist must respect (from the stack records)

- 128 GB unified memory, 64/64 split; GPU carveout 64.2 GiB (Mission Control today). Two resident models plus KV must fit in that.
- Decode speed is bandwidth-bound. A 3B-active MoE decodes about 10 to 16 tokens per second here (with MTP). Dense 27B to 32B is roughly half that. 12B-active MoE is slower again.
- Vulkan is the backend that works; ROCm was measured worse. MTP is worth about 1.5x here, not the 2.4x seen on discrete GPUs.
- Current pair: planner `halo/qwen3.6-35b-a3b` Q4_K_M (22.1 GB) and worker `halo/qwen3-coder-30b-a3b-q4km` Q4_K_M (18.6 GB), both at 32K, parallel 1. About 41 GB of weights resident.
- Recorded history: 120B experiments (gpt-oss-120b) did not earn daily use; Qwen3-Coder-Next 80B-A3B was removed in the 2026-08-30 library cleanup; the config record says do not restart a tuning campaign except for a measured product problem or Scott's request. This is Scott's request.

## What the catalog says

The open-weight frontier moved to 200B to 400B MoE during 2026: GLM-5.3-Flash 320B-A18B, DeepSeek V4 Flash 284B-A13B, Tencent Hy3 295B-A21B, MiniMax M2.7 229B-A10B, Qwen3.5 397B-A17B, Motif-3 314B, Solar Open2 250B. None of these fits a 64 GiB carveout at a useful quantization (a 229B model is about 130 GB at Q4). Even a 96/32 split would not hold them. They are out of reach for HALO and stay out of this shortlist.

The 100B to 130B low-active MoE class also grew: Nemotron 3 Super 120B-A12B, Mistral Small 4 119B-A6B, Qwen3.5-122B-A10B (restricted license), GLM-4.5-Air 106B-A12B, INTELLECT-3 106B-A12B, Solar Open 100B-A12B, plus the already-tried gpt-oss-120b. At Q4 these are 60 to 75 GB, so one of them would occupy the whole carveout alone. That collapses the planner/worker pair into one model. Given the recorded verdict on 120B daily use, I do not recommend spending time here unless Scott wants a single-model design.

The class HALO actually lives in, 25B to 35B total with 3B to 4B active, was refreshed in 2026. That is where the useful alternatives are.

## Shortlist (same class as today's pair; each fits beside the other resident model)

| Candidate | Date | Shape | Why it is interesting | Cost to try |
|---|---|---|---|---|
| NVIDIA Nemotron 3.5 Lightning | 2026-08-11 | 30B total, 3B active | Already on disk (`nvidia-nemotron-3.5-lightning-30b-a3b`, Q4_K_S, 24.5 GB, 1M context claim). Hybrid architecture family with cheap long-context KV. Newest thing in the library. | Zero download. |
| Z.ai GLM 4.7 Flash | 2026-01-19 | 30B-A3B | Strong coding/agent reputation at this size; GLM-4.6V-flash is already in the LM Studio catalog, so the family runs here. | One ~18 GB download. |
| Google Gemma 4 26B-A4B | 2026-04-02 | 25.2B total, 3.8B active | Unrestricted weights; Gemma 4 12B QAT already runs here. Smaller than today's planner, so more room for KV. | One ~15 GB download. |
| Cohere North Mini Code | 2026-06-09 | 30B-A3B | Code-specialized at exactly the worker's shape. License is likely non-commercial; check before adopting. | One download; license check first. |

Not shortlisted, with reasons: Qwen3.5-35B-A3B (superseded by the resident Qwen3.6); Qwen3-Coder-Next 80B-A3B (removed on 2026-08-30, 45 GB, would crowd out the worker); Nemotron 3 Nano 30B-A3B (superseded by 3.5 Lightning); dense 24B to 33B models (Qwen3.8-27B is already resident for quality roles; Gemma 4 31B, Devstral Small 2, Olmo 3 32B, EXAONE 4.5, Granite 4.1 30B are all slower-decode dense and would only make sense as a reviewer/gate model, where Qwen3.8-27B already sits).

## My opinion

1. The current pair is still the right shape for this box. The catalog shows nothing that beats "30-35B total, 3B active" on HALO's bandwidth budget. Do not chase the 200B+ releases.
2. There are three or four credible same-class swaps. Whether any is better than Qwen3.6-35B-A3B as planner or Qwen3-Coder-30B-A3B as worker cannot be read from this catalog. It needs a measured, bounded test on the real gate.
3. Test plan, if Scott wants it: at most three candidates, one at a time, each about 30 minutes, after CivicCast has shipped. Same settings as production (Q4, 32K, parallel 1, Vulkan). Fixtures: the existing independent local coding gate for the worker role, and the recorded DSH research workflow (Gateway search plus fetch plus sourced answer) for the planner role. Pass or fail against today's pair, preserve prompts, no mid-test help. Start with Nemotron 3.5 Lightning because it is already on disk.
4. Nothing here changes production. The Router's qualification rules stay as they are; a new model gets Auto only after it passes the same exact-profile gate.

## Verification ledger

VERIFIED: the dataset license and citation | C:\Users\scott\AppData\Local\Temp\claude\C--Users-scott-Desktop-Code\fb97ebb6-91e1-4a3a-a579-4235dde4a0bb\scratchpad\ai_models\README.md:1
VERIFIED: filter logic (domain, date, open weights, parameter range) | C:\Users\scott\AppData\Local\Temp\claude\C--Users-scott-Desktop-Code\fb97ebb6-91e1-4a3a-a579-4235dde4a0bb\scratchpad\ai_models\filter.py:22
MEASURED: candidate rows, dates, parameter counts and active-parameter notes quoted above come from filter.py output over all_ai_models.csv (this session)
MEASURED: current resident pair, library contents, GPU carveout and RAM figures come from Mission Control /api/status and the Models tab read earlier today (this session)
UNVERIFIED: any quality, speed, tool-calling or license claim about the shortlisted models beyond what the catalog rows state - not checked
UNVERIFIED: GGUF availability and llama.cpp Vulkan support for GLM 4.7 Flash, Gemma 4 26B-A4B and North Mini Code - not checked
