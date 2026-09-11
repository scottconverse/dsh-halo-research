# The Qwen 3.8 family and what it means for HALO (2026-09-10)

Author: Claude Opus 5 (session code-6c). Question from Scott: what happened to Qwen 3.8 27B and the related 3.8 derivatives such as Flash. Nothing was loaded, downloaded, started or changed. This corrects one claim in `HALO-MODEL-ALTERNATIVES-2026-09-09.md`.

## 1. Qwen 3.8 27B: nothing happened to it, and it is on this disk

Alibaba's own changelog dates it **August 19, 2026**: "The Qwen3.8 27B native vision-language dense model builds upon the 3.6-27B version, with key improvements in coding and office productivity capabilities across both text and visual modalities." Epoch's catalog lists it at 2026-08-14, 27B dense, open weights unrestricted.

On this machine:

| Item | Value |
|---|---|
| Alias | `halo/qwen3.8-27b` -> `unsloth/Qwen3.8-27B-GGUF` |
| Weights | `Qwen3.8-27B-UD-Q5_K_XL.gguf`, 18.83 GB, plus `mmproj-F16.gguf` 0.86 GB (vision) |
| Load envelope baked into the alias | 32768 context, 1 parallel session, flash attention on, MTP draft on, `gpuStrictVramCap` true |
| Alias declares | `vision: true`, `reasoning: true`, `trainedForToolUse: true` |
| Second local copy | `qwen3.8-27b-uncensored`, 23.01 GB (unique uncensored lane) |
| On LM Link peers | R71 17.74 GB; NvideaBlackwell Q3_K_XL 13.44 GB and Q4_K_XL 17.92 GB |

The 2026-08-30 cleanup deleted two **redundant** copies (bartowski Q5_K_M 19.328 GiB, lmstudio-community Q4_K_M 16.523 GiB) and kept the unsloth build with the role "Proven dense planner fallback". Nothing was lost.

## 2. Why it looked absent in yesterday's analysis

Yesterday I ranked candidates by Epoch's Capabilities Index and wrote that Qwen 3.8 27B was "not rated by Epoch at all". That was wrong, and the reason is a real distinction worth keeping:

- **No ECI score.** `processed_data_for_eci.csv` has **zero** rows for `qwen3.8-27b`. Its results never entered the composite fit, so it has no ECI number and cannot appear in an ECI ranking. Epoch's ECI does include `Qwen 3.8 Max` (156.6) and `Qwen3.7 Flash` (144.6), both API-only.
- **But five benchmark results exist**, all carrying a reasoning-effort suffix:

| Benchmark | qwen3.8-27b score |
|---|---|
| SciCode | 0.4468 (xhigh), 0.3981 (low), 0.3808 (medium), 0.3565 (none) |
| WebDev Arena | 1594.78 |
| Surface Evolver Bench | 0.45 (xhigh) |
| ProofBench | 0.16 |
| CritPt | 0.0543 (xhigh), 0.0029 (none), 0.0 (medium), 0.0 (low) |

So the older 3.6 generation dominated my ranking purely because it is the generation Epoch has scored into the index.

## 3. The finding that actually matters: reasoning effort

SciCode is a coding benchmark. Ranking open-weight models on it, HALO-class only:

| Model | SciCode |
|---|---|
| **qwen3.8-27b, xhigh reasoning** | **0.4468** |
| gemma-4-31b-it | 0.4340 |
| gemma-4-26b-a4b | 0.4005 |
| **qwen3.8-27b, low reasoning** | 0.3981 |
| **qwen3.8-27b, medium reasoning** | 0.3808 |
| qwen3.6-27b, none | 0.3727 |
| **qwen3.8-27b, no reasoning** | **0.3565** |
| qwen3.6-35b-a3b (current planner) | 0.3576 |

Read the top and bottom rows together. With reasoning at xhigh, Qwen3.8-27B is the best HALO-class open model on this benchmark. With reasoning off, it is indistinguishable from the planner already in production.

**The two aliases on this box are configured differently, and one of them is unspecified.** I read both files:

- `halo/qwen3.6-35b-a3b` (the planner) defines an `enableThinking` custom field with `defaultValue: false`, bound to the Jinja variable `enable_thinking`. The comment above it states the intent plainly: "Daily Halo planning is prompt-heavy and usually needs a short visible answer. Keep the fast path honest by disabling extended thinking here; GPT-OSS 120B and **the preserved 27B alias remain reasoning-capable lanes**." So thinking-off on the planner is a deliberate speed decision, and the 27B was already earmarked as the lane that keeps reasoning.
- `halo/qwen3.8-27b` is 67 lines with **no `customFields` block at all**, no `enableThinking` override and no prompt-template override. It declares `reasoning: true` and pins only the load envelope. It therefore inherits whatever its own embedded chat template defaults to. The Flash-Next template from the same family defaults to `reasoning_effort|default('xhigh')` and accepts only xhigh, medium and low.

Consequence, corrected: my first reading was that the test would silently measure the reasoning-off number. That is probably wrong for this alias, because nothing turns reasoning off for it. The real risk is the opposite one and it is worse: **the effort in force is unspecified and unrecorded, so any result could land anywhere on a 0.3565-to-0.4468 spread with no way to tell which run happened.** The plan must therefore set the effort explicitly per run and capture the actual runtime payload, exactly as the handoff's own lesson warns ("The old `medium` reasoning label was unsupported on a route... Verify actual payload/template/runtime output"). A comparison against the planner also has to say whether it is fair to hold one side at thinking-off.

Caution on precision: the low (0.3981) versus medium (0.3808) ordering is inverted, which it should not be. Treat single-benchmark gaps under about 0.03 as noise.

## 4. The 3.8 "Flash" question: there are two, and one is open

Epoch's catalog (retrieved 2026-09-09) contains no Qwen 3.8 Flash of any kind. That is a gap in that instrument, not an absence in the world. Two other sources show otherwise:

- **Qwen3.8-Flash** — hosted API only. Alibaba's changelog, August 26, 2026: multimodal, native one-million-token context, "shines in coding assistance, agentic workflows", compatible with both OpenAI and Anthropic API protocols.
- **Qwen3.8-Flash-Next** — the **open-weight** release, same date. This is the significant one.

What is confirmed about Flash-Next from Hugging Face's own API:

| Property | Value |
|---|---|
| Architecture | `qwen4exp` (the next-generation architecture behind the coming Qwen4 family) |
| Native context | 262,144 |
| License | `qwen-community-1.0` |
| Modality | image-text-to-text (vision) |
| Reasoning | xhigh (default), medium, low |
| Popularity | 1,053,823 downloads, 877 likes |
| Quant repo last modified | 2026-09-02 |
| Ships a dedicated MTP build | yes, `MTP/` directory, 22.9 GB |

Note the shape of the 3.8 generation: a 2.4T-A95B flagship, a 27B dense model, and this Flash-Next MoE. **There is no 3.8 successor to your 35B-A3B planner.** The last open fast-MoE in that exact size class is the 3.6 generation you are already running. That is why the planner is 3.6 while the dense model on disk is 3.8. It is not neglect; Qwen simply did not ship that size this round.

## 5. Does Flash-Next fit HALO? Not at the current memory split

Every published quant, measured from the Hugging Face API today:

| Quant | Size | Fits a 64.2 GiB carveout? |
|---|---|---|
| UD-IQ1_S | 67.6 GB | no |
| UD-IQ1_M | 69.4 GB | no |
| UD-Q2_K_XL | 73.5 GB | no |
| UD-IQ3_XXS | 76.3 GB | no |
| UD-Q3_K_XL | 83.8 GB | no |
| UD-IQ4_XS | 87.2 GB | no |
| UD-Q4_K_XL | 103.7 GB | no |
| UD-Q5_K_XL | 147.4 GB | no |
| Q8_0 | 175.3 GB | no |

Mission Control reported the carveout at 64.2 GiB yesterday. The smallest quant exceeds it before any KV cache. Running this model here requires a memory-split change and therefore a reboot, which Scott owns, or accepting spill into the shared pool.

Two same-day community reports claim it nevertheless runs well on this hardware class. Both are unverified by me and are recorded here as leads, not facts:
- A post to r/ROCm, r/QwenAI and r/DeepSeekHarness at about 9:41 AM MDT today, titled "Qwen3.8-Flash-Next (125B MoE) at 38 t/s on Windows — Strix Halo, working MTP, full guide + tools (MIT)". I read only the title; Reddit rate-limited, then opened its circuit breaker, before I could read the body.
- A post to r/LocalLLM at about 12:52 PM MDT today reporting "Vulkan+MTP: ~27–40 tok/s" versus "HRX+MTP: ~12-13 tok/s" on Windows.

For scale: the measured decode on this box for the tuned 35B-A3B pair is roughly 10 to 16 tokens per second with MTP. If 38 holds, Flash-Next would be faster **and** far more capable than anything currently in the plan.

## 6. Software support on this box is already present

I searched the installed engine binaries for architecture identifiers. The Vulkan engine Mission Control reports as running, **2.34.0**, contains `qwen4exp`, `qwen35moe`, `qwen3next`, `qwen3moe` and `nemotron_h_moe`. So does 2.31.2.

Two consequences:
1. Flash-Next's architecture is known to the engine already in use. No engine upgrade is implied.
2. `qwen3next` is present too, so the 2026-08-30 failure of Qwen3-Coder-Next ("wedged LM Studio before inference") was **not** a missing-architecture problem. Memory pressure is the more likely cause: 45.157 GiB of weights against a 64 GiB carveout with other models resident.

A string in a binary is evidence of support, not proof that a specific file loads and generates correctly. Only a load test settles that.

## 7. What I would change, and what needs Scott

Nothing here is urgent and nothing changes production. In priority order:

1. **Set reasoning effort explicitly in the candidate test.** Without this the Qwen3.8-27B result is meaningless. This is a change to a plan that has not run yet, not to production.
2. **Promote Qwen3.8-27B from "planner only" to a real candidate for both roles.** Alibaba's own release note calls out coding as the improvement over 3.6-27B, and SciCode at xhigh agrees.
3. **Treat Flash-Next as a separate question from the candidate test.** It needs a 68 to 104 GB download, a memory-split decision, and a reboot. It should not be bolted onto a bounded 30-minute-per-candidate test.
4. **Read the Strix Halo guide when Reddit's circuit closes.** It is the single most relevant document for this box and I have only seen its title.

## Verification ledger

VERIFIED: the alias `halo/qwen3.8-27b` resolves to `unsloth/Qwen3.8-27B-GGUF` and bakes in 32768 context, 1 parallel session and MTP draft | C:\Users\scott\.lmstudio\hub\models\halo\qwen3.8-27b\model.yaml:1
VERIFIED: Qwen3.8-27B was retained in the cleanup as "Proven dense planner fallback" | C:\Users\scott\Desktop\Halo Stack Research\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md:56
VERIFIED: two redundant Qwen3.8-27B copies were deleted as "Redundant Q5_K_M copy" and "Redundant Q4_K_M copy" | C:\Users\scott\Desktop\Halo Stack Research\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md:36
VERIFIED: Qwen3-Coder-Next was deleted for "Wedged LM Studio before inference", an operational result | C:\Users\scott\Desktop\Halo Stack Research\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md:31
VERIFIED: the planner alias disables extended thinking by default and its comment names the 27B alias as a reasoning-capable lane | C:\Users\scott\.lmstudio\hub\models\halo\qwen3.6-35b-a3b\model.yaml:269
VERIFIED: the worker alias declares reasoning false | C:\Users\scott\.lmstudio\hub\models\halo\qwen3-coder-30b-a3b-q4km\model.yaml:21
VERIFIED: the 3.8-27B alias declares reasoning true and contains no customFields or enableThinking override | C:\Users\scott\.lmstudio\hub\models\halo\qwen3.8-27b\model.yaml:23
MEASURED: every Epoch figure in sections 2 and 3, from my own script over the downloaded CSVs | C:\Users\scott\AppData\Local\Temp\claude\C--Users-scott-Desktop-Code\fb97ebb6-91e1-4a3a-a579-4235dde4a0bb\scratchpad\qwen38.py
MEASURED: on-disk model inventory and physical GGUF sizes, from `lms ls` and a directory listing (this session)
MEASURED: Flash-Next quant sizes, from the Hugging Face tree API queried directly (this session)
MEASURED: `qwen4exp`, `qwen3next` and `nemotron_h_moe` are present in llama.dll of the 2.31.2 and 2.34.0 Vulkan engines, by byte scan (this session)
MEASURED: Flash-Next architecture, context length, license, download count and reasoning-effort template, from the Hugging Face model API read through the Gateway (this session)
MEASURED: the Qwen3.8-Flash and Qwen3.8-27B release notes, from Alibaba's QwenCloud changelog read through the Gateway (this session)
UNVERIFIED: the claim of 38 tokens/s for Flash-Next on Strix Halo - only the post title was retrieved; Reddit rate-limited then opened its circuit before the body could be read
UNVERIFIED: the claim that Flash-Next is a 125B MoE - taken from a Reddit post title, not from Alibaba or Hugging Face metadata
UNVERIFIED: whether engine 2.34.0 actually loads and generates with a qwen4exp GGUF on this box - not tested
UNVERIFIED: whether any Flash-Next quant can run within, or acceptably spill outside, the current 64.2 GiB carveout - not tested
UNVERIFIED: the codersera roundup's claim that Flash-Next is "180B total, 6B active" - conflicts with the Reddit title's 125B; neither was confirmed against Alibaba
