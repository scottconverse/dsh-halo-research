# Halo 64/64 post-reboot validation — 2026-08-30

## Result

**PASS.** The installed daily Halo configuration works after changing AMD
Variable Graphics Memory from 96 GB graphics / 32 GB Windows to **64 GB
graphics / 64 GB Windows**.

This was a short operational validation, not a soak or a new model benchmark.
No Windows Sandbox was started; CivicCast owns that lane.

## Baseline

- Windows visible memory: 63.79 GiB
- Windows free before model load: 45.77 GiB
- Commit before model load: 23.9%
- LM Studio API: HTTP 200 on `127.0.0.1:1234`
- DSH cockpit: HTTP 200 on `127.0.0.1:3080`
- Mission Control: HTTP 200 on `127.0.0.1:3090`
- Models before validation: none

## Model loads

| Role | Alias | Load time | Quant | Context | Slots |
|:--|:--|--:|:--|--:|--:|
| Planner | `halo-brain-35b` | 14.03 s | Q4_K_M | 32,768 | 1 |
| Worker | `halo-coder-q4km` | 9.71 s | Q4_K_M | 32,768 | 1 |

LM Studio's authoritative model API reported, for both loaded instances:

- evaluation batch 2048;
- physical batch 512;
- Flash Attention enabled;
- 32 context checkpoints;
- GPU KV offload enabled;
- MTP and simple speculative decoding disabled.

The engine log recorded completed `model loaded` lines and
`n_slots = 1, n_ctx_slot = 32768, kv_unified = 'true'` for both models.

## Real DSH planner proof

Session `session-9738009f-a487-4671-ac26-50e5684c96e2` was created through
DSH with the `halo-orchestrator` preset. `session.models` reported the current
route as `lmstudio` / `halo/qwen3.6-35b-a3b`, routable, with no catalog
failures. The model returned exactly:

`HALO-64-64-PLANNER-OK`

The turn ended normally. DSH recorded 10,375 input tokens, 14 output tokens,
16.6 s TTFT, and no tool time. LM Studio measured 647.2 prompt tokens/s and
62.16 decode tokens/s for the main response.

## Real gated worker proof

A disposable Git repository under the Codex workspace contained `value.txt`
with `old` and a protected `verify.ps1` requiring `new`.

The first gate call was intentionally accepted as a real failure: Git rejected
the repository because the Codex sandbox account created it while DSH runs as
Scott. The gate returned an error before inference, the planner reported FAIL,
and no file changed. An exact temporary `safe.directory` entry was then added
for that disposable repository only.

A fresh DSH unit, session
`session-2f459b8f-b176-4406-8a5d-8d2155cc081f`, called
`subagent_coder` exactly once. The Q4_K_M worker changed only `value.txt`; the
protected verifier remained unchanged. The mechanical result was:

```text
HALO VERIFIED CODER: PASS
Evidence: C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T20-09-30-812Z-aa79467e\verdict.json
HALO-64-64-WORKER-VERIFY-OK
```

The verifier was independently rerun from the promoted repository and produced
the same success marker. The temporary Git safe-directory entry was removed.
The worker's main 4,168-token prompt ran at 1,047.18 prompt tokens/s and its
66-token response decoded at 67.28 tokens/s. Subsequent short worker steps were
approximately 65.8–69.3 decode tokens/s.

## Final headroom

- Both models remained resident and idle.
- GPU dedicated usage: 43.90 GiB
- GPU shared usage: 0.68 GiB
- Windows free memory: 40.56 GiB
- Commit: 75.5%

This proves the daily Q4/Q4 pair fits and operates on 64/64 without material
GPU shared-memory spill. It does not prove simultaneous Windows Sandbox
coexistence, which is outside the Halo lane.

## Operational decision

Keep the installed daily configuration:

- Qwen3.6 35B-A3B Q4_K_M planner, 32K, `parallel=1`;
- Qwen3 Coder 30B-A3B Q4_K_M worker, 32K, `parallel=1`;
- dual resident, serialized generation;
- 64 GB graphics / 64 GB Windows.

The next tuning experiment remains a separate Q6 worker candidate against this
known-good Q4 baseline. Do not overwrite the daily worker alias and do not move
both models to Q6.
