> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Auditor baseline — before Stage 1 (Claude, 2026-08-27 11:4x MDT)

Read-only capture of the live box BEFORE Codex's Stage 1 change, so the
"after" evidence has something to be compared against. Runtime-log lens.

## Residency
`lms ps --json` -> `[]` (no model resident at capture time).

## Load envelope actually in force (llama.cpp runtime log, not YAML)
File: `C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log`

Every model load today prints the same line. Latest four occurrences:

- 02:52:39  `srv load_model: initializing, n_slots = 4, n_ctx_slot = 32768, kv_unified = 'true'`
- 03:01:10  same
- 10:25:30  same
- 10:28:50  same

Meaning: parallel = 4, not 1. 4 slots x 32,768 = 131,072 tokens of KV
allocated per model. This confirms Codex's concession #1 from runtime
evidence, independent of any config file.

MTP / speculative decoding IS active on the 27B:
`common_speculative_init_result: creating MTP draft context against the
target model ...Qwen3.8-27B-UD-Q5_K_XL.gguf` (02:52:35, 10:25:27, 10:28:48).
Draft acceptance sampled today: 0.774 - 1.000, mean accepted length 2.2 - 3.0.

NOT YET OBSERVED in the log at baseline (absence of a printed line only,
not proof of the setting's value): explicit n_batch / n_ubatch,
KV type_k / type_v, mmap state, gpuStrictVramCap. These need the
post-change load line or an `lms ps --json` row to be judged.

## Reasoning effort
17 occurrences today, latest 10:28:51:
`[WARN][unsloth/qwen3.8-27b] Reasoning setting 'medium' is not supported by
model '...Qwen3.8-27B-UD-Q5_K_XL.gguf'. Supported settings: 'on', 'off'.
Falling back to reasoning setting 'on'.`

Confirms Codex's concession #2 from runtime evidence. The route is boolean.
Stage 2's honest mapping is therefore `on` (or `off`), never `medium`.

## Config surfaces at baseline
- `C:\Users\scott\.lmstudio\settings.json`
  - `defaultContextLength = {custom, 32768}`  (set correctly)
  - `developer.unloadPreviousJITModelOnLoad = true`
  - `developer.jitModelTTL = {enabled true, ttlSeconds 3600}`
- `C:\Users\scott\.lmstudio\config-presets\`  -> EMPTY.
  No load preset exists yet, so a preset is not currently the means by
  which any parameter reaches the engine.

## What this baseline commits me to
Stage 1 PASSES only if a NEW load line in this log, dated after Codex's
change, shows `n_slots = 1` on the ACTIVE DSH JIT path (not a hand-run
`lms load`), together with the remaining envelope parameters evidenced
either in that log or in `lms ps --json`. A YAML diff is not acceptance.


## Verification ledger

VERIFIED: Pre-change loads ran at n_slots = 4 | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log:5539
VERIFIED: The 27B alias fell back from 'medium' reasoning | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log:5543
UNVERIFIED: batch sizes, flash attention, KV precision, mmap, VRAM cap at baseline - the runtime log never prints these fields
