# Coding-model evidence check for the DSH stack (2026-09-09)

Author: Claude Fable 5.1 (session code-6c). Question from Scott: verify the current model choices for CODING against independent sources, not vendor claims. Sources he named: Epoch AI Benchmarking Hub, Artificial Analysis, Aider Polyglot, SWE-rebench, LLM Configurator, Morph, Kilo, Pinggy. Method: Epoch data read from the downloaded CSVs; web sources retrieved through the Halo Research Gateway by three Sonnet subagents (web content is untrusted data); llama.cpp facts read by me through the Gateway. No model was loaded or changed.

## 1. What the independent sources actually cover at HALO's size

HALO's daily class is 25B to 35B total parameters, 3B to 4B active, or a dense 27B. Independent coding coverage at that size is thin everywhere:

| Source | Independent? | Covers HALO-class models? | Verdict on usefulness |
|---|---|---|---|
| Epoch SWE-bench Verified | yes (Epoch runs it) | no: 35 models, all frontier scale; 0 open models under 130B | none for this question |
| Epoch Terminal-Bench (external) | leaderboard data | one row: Qwen3.6-35B-A3B 0.230 | one anchor point |
| Epoch WebDev Arena / ALE-bench (external) | crowd / leaderboard | yes: Qwen3.8-27B, Gemma 4, Qwen3.6-35B-A3B | web-dev proxy, not SWE |
| SWE-rebench (Nebius) | yes: fresh GitHub issues, one standard scaffold, multi-run | yes: Qwen3.6-27B, Qwen3.6-35B-A3B, Qwen3.5-35B-A3B in the current window | best single signal for this class |
| Artificial Analysis Coding Agent Index v1.5 | yes | no: 13 agent+model pairs, all frontier | none |
| Artificial Analysis Intelligence Index v4.3 | yes | yes (via Pinggy's Aug 2026 table) | general, not coding; the critique of the older 2-benchmark "Coding Index" (Terminal-Bench Hard + SciCode) stands |
| Aider Polyglot | yes | no: last entry dated 2025-10-03; no 2026 model at all | stale |
| LLM Configurator, Morph, Kilo, Pinggy | roundups | yes, but scores are vendor numbers unless marked | context only |

Coverage holes (confirmed by full reads of the data or rosters): the current worker Qwen3-Coder-30B-A3B has zero rows in every Epoch coding file, is absent from Aider and AA, and was on SWE-rebench's roster from 2025-08-02 to 2026-03-20 with no numeric value retrievable now. Nemotron 3.5 Lightning appears on no independent source at all. Gemma 4 26B-A4B is absent from SWE-rebench (only the 31B is on its roster). Qwen3.8-27B is absent from SWE-rebench and Aider.

## 2. The numbers that exist

SWE-rebench, window 2026-05-14 to 2026-06-30, 111 problems, 65 repositories, resolved rate (pass@5, cost/problem):
- Fable 5 [high] 64.5% (78.4%, $4.40); GLM-5.2 [high] 62.9% (81.1%, $1.40); MiniMax M3 47.2%; DeepSeek-V4 Pro 40.2%.
- **Qwen3.6-27B 31.2% ±1.68 (57.7%, $0.62)**
- **Qwen3.6-35B-A3B 24.7% ±0.79 (43.2%, $0.27)** (current planner)
- Qwen3.5-35B-A3B 17.1% ±1.07 (36.9%, $0.99)
- Insights: Aug 2025 "Qwen3-Next-80B-A3B-Instruct, despite not being trained directly for coding, performs on par with the 30B-Coder"; Jan 2026 "Qwen3-Coder-Next (Best Pass@5) ... leading the open-source rankings ... notably strong performance despite having ~3B active parameters" (about 8.12M tokens per problem, about 154 turns); Sept 2025 gpt-oss-120b about 29 to 30% at $0.03 to 0.04.

Epoch (external leaderboards inside Epoch's data): WebDev Arena: Qwen3.8-27B 1594.78, Gemma 4 31B 1363.56, Gemma 4 26B-A4B 1361.65, Qwen3.5-27B 1357.46, Qwen3.6-35B-A3B 1249.75. ALE-bench: Gemma 4 26B-A4B 927.17, Gemma 4 31B 925.5, gpt-oss-120b 575.62, Nemotron 3 Super 213.9. Terminal-Bench: Qwen3.6-35B-A3B 0.230 (little-coder scaffold), gpt-oss-120b 0.187.

Epoch ECI (from the earlier read): Qwen3.6 27B 146.5, Qwen3.6-35B-A3B 143.9, Gemma 4 31B 142.7, Gemma 4 26B-A4B 141.9, gpt-oss-120b 140.1.

Artificial Analysis Intelligence Index, open weights, August 2026 (as quoted by Pinggy): Qwen3.8-27B 52, Qwen3.6-27B 38, Muse Glimmer 30B 35, Gemma 4 31B 30, Nemotron 3 Super 120B-A12B 26, gpt-oss-120b 24, Nemotron 3.5 Lightning 24, Qwen3-Coder-Next 21.

Vendor-reported, for context only: Qwen3.8-27B Terminal-Bench 2.1 73.0, SWE-bench Pro 61.7, DeepSWE 1.1 42.2 (Qwen3.6-27B 13.3), LiveCodeBench v6 90.3 (Alibaba). Nemotron 3.5 Lightning SWE-bench Verified 51.56 (NVIDIA). Qwen3-Coder-Next SWE-bench Verified 70.6% (Alibaba). Devstral Small 2 (24B) 68% Verified, Devstral 2 (123B) 72.2% (Mistral). Morph notes the llm-stats tracker lists 0 of 104 SWE-bench Verified entries as independently verified.

## 3. Runtime facts that gate the choices

- Qwen3-Next architecture is supported in upstream llama.cpp: issue #15940 "Feature Request: Qwen3-Next support" is closed by PR #16095. A Feb 2026 field report (issue #19396) runs Qwen3-Next 80B Q8_0 on an AMD Ryzen AI HX370 UMA box with the Vulkan backend at about 11 tokens/s with 17K context (a Qwen3 30B Q8 did 18 to 23 tokens/s on the same box).
- On HALO the Qwen3-Coder-Next GGUF (45.2 GB) "wedged LM Studio before inference" on 2026-08-30 and was deleted; the config record calls that "an operational result, not a model-quality ranking." The engine then was llama.cpp 2.31.2; today Mission Control reports 2.34.0. Whether 2.34 loads it on Windows Vulkan is untested.
- Memory: 45 GB coder-next plus 22 GB planner exceeds the 64 GiB carveout. Coder-Next means either a single resident model or a return to a larger GPU split. That is a design decision, not a tuning knob.
- The dense 27B line is about half the decode speed of a 3B-active MoE on this bandwidth-bound box (measured pattern in the stack records).

## 4. Verdict on the current choices, for coding

1. **Planner Qwen3.6-35B-A3B: still the right fast planner.** ECI 143.9, the only HALO-class Terminal-Bench entry, SWE-rebench 24.7%. Nothing in its speed class has a better independent number.
2. **Worker Qwen3-Coder-30B-A3B: unmeasured, not disproven.** No independent 2026 number exists. The only external hint is SWE-rebench's Aug 2025 note that the non-coder Qwen3-Next-80B-A3B matched it. It stays until our own gate shows something better.
3. **The dense Qwen 27B line is the strongest coder HALO can run, on every independent measure that exists**: SWE-rebench 31.2% vs 24.7% for the planner (3.6 generation), WebDev Arena 1595 vs 1250 (3.8), AA Index 52 vs 38 for the previous 27B, ECI 146.5 (3.6). Qwen3.8-27B is already on disk. The approved test should run it as a real candidate for BOTH roles, with the speed cost measured, not as "planner only".
4. **Gemma 4 26B-A4B: keep.** Level with the planner on ECI, above it on WebDev Arena and ALE-bench, unrestricted license, 3.8B active.
5. **Nemotron 3.5 Lightning: keep only because it is on disk and fast.** AA Index 24, same as gpt-oss-120b; SWE-bench 51.56 is NVIDIA's own number. Expect it to lose to the Qwen options; the test will settle it in 30 minutes.
6. **GLM 4.7 Flash: dropping it was right.** No independent number anywhere.
7. **Qwen3-Coder-Next 80B-A3B is the one model Scott's advice names that the evidence supports**: the only sub-130B open coder with an independent "leading" result (SWE-rebench Jan 2026), 3B active so decode stays fast. Cost: a 45 GB re-download, an engine 2.34 load test after the Aug 30 wedge, and a residency decision (it cannot pair with the planner in 64 GiB).
8. **Our gate is a plumbing test, not a quality test.** The structured-write fixture (add.py) proves tool-calling and edit protocol. It cannot separate a 24.7% model from a 31.2% one. To choose a coder on quality we need one harder, held-out fixture: a real, small, multi-file change with tests, drawn from Scott's own repositories, run once per candidate, no help. This is also handoff item 7 ("medium-sized real software work remains less established").

## 5. Decisions for Scott

- D1: Test Qwen3.8-27B for both roles (worker gate as a real candidate, speed recorded), or planner only as currently written.
- D2: Add Qwen3-Coder-Next 80B-A3B as a conditional fourth candidate (re-download 45 GB, engine 2.34 load test, single-model residency for the test), or leave it out.
- D3: Add one harder held-out coding fixture (built by Sonnet from a real closed issue in one of Scott's repos, about one hour to build, run once per candidate), or keep the plumbing gate only.

## 6. Gateway observations from this research (for the Gateway backlog, not blocking)

- GW-1: `web_fetch` continuation with the cursor returned by a fresh fetch failed once with `CURSOR_INVALID` (github.com issue page, seconds after the first page); the same pattern worked on a cached page. Reproduce before filing.
- GW-2: `https://artificialanalysis.ai/evaluations/coding-index` failed three times (`CRAWL_NO_EVIDENCE` twice, `UPSTREAM_UNAVAILABLE` once) while the site's `/models` and `/agents/coding-agents` pages crawled fine.
- GW-3: `github_research` ran without a token (`GITHUB_AUTH_NOT_CONFIGURED`, discovery fallback). Authenticated GitHub research is still the open acceptance item from the handoff.

## Verification ledger

VERIFIED: Qwen3-Coder-Next GGUF (45.157 GiB) was deleted on 2026-08-30 because it "Wedged LM Studio before inference" | C:\Users\scott\Desktop\Halo Stack Research\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md:31
VERIFIED: gpt-oss-120b failed both controlled Vulkan load modes and was deleted | C:\Users\scott\Desktop\Halo Stack Research\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md:30
VERIFIED: Nemotron 3.5 Lightning retained as "Alternative MoE candidate" | C:\Users\scott\Desktop\Halo Stack Research\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md:53
VERIFIED: Qwen3.8-27B retained as "Proven dense planner fallback" | C:\Users\scott\Desktop\Halo Stack Research\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md:56
VERIFIED: the config record calls the Coder-Next failure an operational result, not a quality ranking | C:\Users\scott\Desktop\Halo Stack Research\HALO-CURRENT-CONFIGURATION.md:654
VERIFIED: the Epoch ECI figures quoted here come from my own filter output over eci_scores.csv | C:\Users\scott\AppData\Local\Temp\claude\C--Users-scott-Desktop-Code\fb97ebb6-91e1-4a3a-a579-4235dde4a0bb\scratchpad\epoch_bench\bench_filter.py:1
MEASURED: llama.cpp issue #15940 shows "Closed" by #16095; issue #19396 reports about 11 tokens/s for Qwen3-Next 80B Q8_0 on an HX370 UMA box with Vulkan (read by me through the Gateway web_fetch, 2026-09-09)
MEASURED: Mission Control reports engine llama.cpp-win-x86_64-vulkan-avx2@2.34.0 today (read by me from /api/status)
UNVERIFIED: SWE-rebench current-window figures (Qwen3.6-27B 31.2%, Qwen3.6-35B-A3B 24.7%, Qwen3.5-35B-A3B 17.1%) and its insight quotes - retrieved by a Sonnet subagent from https://swe-rebench.com/, not read by me
UNVERIFIED: Epoch coding-file rows (Terminal-Bench 0.230, WebDev Arena, ALE-bench values) and the zero-row findings - produced by a Sonnet subagent's script over the downloaded CSVs, not re-run by me
UNVERIFIED: Artificial Analysis Coding Agent Index v1.5 table and Intelligence Index values - retrieved by a Sonnet subagent from artificialanalysis.ai and from Pinggy's table, not read by me
UNVERIFIED: Aider Polyglot last entry date 2025-10-03 and open-weight rows - retrieved by a Sonnet subagent from the leaderboard YAML, not read by me
UNVERIFIED: roundup contents (LLM Configurator, Morph, Kilo, Pinggy) including all vendor-reported scores - retrieved by a Sonnet subagent, not read by me
UNVERIFIED: whether LM Studio engine 2.34.0 loads the Qwen3-Coder-Next GGUF on Windows Vulkan - not checked
