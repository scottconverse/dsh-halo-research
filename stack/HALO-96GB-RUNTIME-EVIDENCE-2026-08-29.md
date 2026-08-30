# Halo 96 GB runtime evidence — 2026-08-29

## Outcome

The 96/32 Halo daily stack is operational. DSH is routed to local LM Studio,
the Qwen3.6 35B-A3B Q4_K_M brain and Qwen3 Coder 30B-A3B Q4_K_M worker can
remain resident together at 32K with one slot each, and the real DSH-native
verified-worker canary passed end to end.

## Daily brain smoke

- Alias: `halo/qwen3.6-35b-a3b`
- Quant: Q4_K_M
- Runtime: context 32768, parallel 1
- Exact visible response: `HALO35_FAST_OK`
- Wall clock: 13.87 seconds
- Usage: 24 prompt tokens, 7 completion tokens
- No reasoning block appeared; the alias's `enableThinking=false` fast path
  worked in the observed request.

## Daily worker smoke

- Alias: `halo/qwen3-coder-30b-a3b-q4km`
- Quant: Q4_K_M
- Runtime: context 32768, parallel 1
- Exact visible response: `HALOCODER_Q4KM_OK`
- Structured tool call: function `halo_probe`, arguments
  `{"value":"TOOL_OK"}`, finish reason `tool_calls`

## GPT-OSS 120B exclusive load experiment

The alias was tested at 32K and one slot with a one-second memory sampler.

| Mode | Result | Peak dedicated | Peak shared | Minimum Windows free |
|:--|:--|--:|--:|--:|
| mmap off | Failed near 60%, Vulkan0 allocation | 45.382 GiB | not material | 0 GiB |
| mmap on | Failed near 90%, Vulkan0 allocation | 47.443 GiB | 0.231 GiB | 6.666 GiB |

The second path was safer for host memory but did not load the model. At the
close of this experiment the alias was retained with mmap on and labeled
load-blocked; it was not a working brain route. **2026-08-30 supersession:**
Scott approved the curated-library cleanup, and the GGUF plus active alias were
removed. The alias definition and this failure evidence remain preserved under
the recovery snapshot's model-library-cleanup evidence directory.

Sampler files:

- `gptoss-120b-load-memory-20260829.csv`
- `gptoss-120b-load-memory-mmap-20260829.csv`

## DSH local-provider correction

The first launch showed DeepSeek onboarding because an invalid
`reasoningEfforts` array caused DSH to reject the entire custom pi-ai provider
section. It was corrected to the supported map form. The live catalog then
reported:

- current provider: `lmstudio`
- current model: `halo/qwen3.6-35b-a3b`
- routable: true
- provider failures: zero
- one LM Studio group with 23 model entries

DSH's OpenAI-compatible client requires a nonempty key value even though local
LM Studio ignores it. The provider therefore names `LMSTUDIO_API_KEY`, and
`Launch-Halo.ps1` supplies the dummy value `x`. No DeepSeek or external API
credential is used.

A real DSH session returned exactly `HALO_DSH_LOCAL_OK` from the 35B with a
normal stop. DSH recorded 10,316 input tokens, 7 output tokens, and 15.817
seconds of model time.

## Gate integration defects caught and fixed

The live canary caught four integration defects before the final PASS:

1. `subagent_coder.parameters` used DSH's shorthand field map rather than a
   standard object JSON schema. LM Studio rejected tool index 23. The schema
   now has `type: object`, `properties`, and `required`.
2. The child used `maxDepth: 0`, but DSH numbers the direct child at depth 1.
   The absolute cap is now 1.
3. A global tool deny-list named preset-scoped tools and was rejected. The
   invalid filter was removed.
4. The synthetic parent did not join the Halo preset, so its worker saw only
   the two host-global Exa tools. The plugin now uses DSH's native
   `agentPresets.composeFrom(childCtx, parent.ctx)` seam before applying the
   reduced sandbox. The live child then received 30 Halo tools, including
   `read`, `edit`, `write`, `pwsh`, `glob`, and `grep`.

Each failed attempt produced a fail-closed verdict and did not modify the live
implementation or protected test.

## Final DSH-native canary

- Parent session: `session-halo-gate-canary6-20260829`
- Brain: `halo/qwen3.6-35b-a3b`
- Worker: `halo/qwen3-coder-30b-a3b-q4km`
- Editable path: `stack/halo-live-canary-20260829/calculator.py`
- Protected path: `stack/halo-live-canary-20260829/test_calculator.py`
- Verifier: `python stack/halo-live-canary-20260829/test_calculator.py`
- Result: PASS
- Verifier output: `HALO_GATE_CANARY_PASS`
- Promoted implementation: `return a * b`
- Tool time: 48.979 seconds
- Receipt:
  `C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T01-16-38-059Z-2fdc1f28\verdict.json`

After the PASS, both daily models were resident, idle, at context 32768 and
parallel 1. The zero-model gate suite also passed 8/8.

## Acceptance boundary

Per Scott's direction, this was short functionality testing, not a multi-hour
soak or a mode benchmark. The next evaluation is real software work through
the running stack.
