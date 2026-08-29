# Halo Stage 2 runtime evidence — 2026-08-27

**Stage:** honest 27B reasoning route  
**Result:** PASS  
**Window:** 2026-08-27 14:57–15:00 MDT  
**Session:** `session-halo-stage2-20260827-1454`

## Decision

The previous DSH profile advertised `off`, `low`, `medium`, and `xhigh` and
selected `medium`. That was not the runtime's capability. LM Studio reports
the exact tuned alias `halo/qwen3.8-27b` as:

```json
{"allowed_options":["on"],"default":"on"}
```

DSH's pi-ai model profile can expose canonical graded levels, but it has no
honest selector named `on`. Mapping `on` to `medium` or `high` would leave a
false label in the picker. The implemented mapping therefore removes the
alias's `reasoningEfforts` declaration and removes the default
`reasoningEffort`. A bare DSH request now preserves LM Studio's real provider
default. The raw Q5_K_XL route received the same correction because LM Studio
advertises it as boolean on/off rather than graded effort.

This follows DSH's own adapter contract: omitting an effort preserves the
provider default. It also matches LM Studio's native API contract, which says
the reasoning field defaults to the automatically chosen model setting:
https://lmstudio.ai/docs/developer/rest/chat

## Coordination and pre-state

Townlight reported: “The hold is active and acknowledged. No TownLight heavy
process is running. No tests or builds will launch until HALO-RELEASED.” No
Halo model was loaded before that receipt. After the proof, the 27B was
explicitly unloaded and Townlight received `HALO-RELEASED`.

Complete pre-Stage-2 backup:

`C:\Users\scott\.dsh\backups\halo-stage2-20260827-144812`

Unlike the Stage 1 backup, it includes the live LM Studio Halo alias tree as
well as DSH and canonical files. `PRESTATE-MANIFEST.json` was self-checked:
15 entries, zero missing files, zero hash mismatches. `ROLLBACK-README.md`
names every restore target and forbids blind overwrite.

Before inference, a fresh DSH session was created through
`POST /api/session.create` with the `halo-orchestrator` preset. Its
`session.models` receipt reported:

```text
current = { provider: lmstudio, model: halo/qwen3.8-27b }
routable = true
provider groups = 1
catalog failures = 0
reasoningEffort on current selection = absent
reasoning selector on exact model descriptor = absent
```

The absence is intentional: it means provider-owned default, not reasoning
disabled.

## Real DSH-path proof

The prompt entered through `POST /api/session.prompt`; no `lms load` or direct
LM Studio inference request was used. DSH's durable `request/header` at
14:57:12.159 recorded exactly:

```json
{"provider":"lmstudio","model":"halo/qwen3.8-27b"}
```

There is no `reasoningEffort` field. LM Studio JIT-loaded the tuned Q5_K_XL
alias and logged at 14:57:27:

```text
load_model: initializing, n_slots = 1, n_ctx_slot = 32768,
kv_unified = 'true'
```

While loaded, `lms ps --json` reported the exact alias, Q5_K_XL, 32K context,
and `parallel: 1`. LM Studio's `/api/v1/models` runtime receipt reported:

```text
reasoning allowed_options = [on]
reasoning default = on
context = 32768
eval batch = 2048
physical batch = 512
parallel = 1
flash attention = true
context checkpoints = 32
MTP = true, maximum draft tokens = 4
KV GPU offload = true
```

The completed DSH assistant message contains two distinct blocks:

1. A `reasoning` block that performs and checks `137 × 89`.
2. A visible `text` block containing exactly
   `HALO-STAGE2-REASONING-OK: 12193`.

The replay state identifies `openai-completions`, provider `lmstudio`, model
`halo/qwen3.8-27b`, with a `reasoning_content` signature. The turn ended
normally at 14:58:37.907.

## Warning and resource evidence

The LM Studio log counts immediately before and after this exact request were:

| Warning | Before | After | Delta |
|:--|--:|--:|--:|
| `Reasoning setting 'medium'` | 25 | 25 | **0** |
| `cannot be converted to any custom KVs` | 3 | 3 | **0** |
| `Falling back to reasoning setting 'on'` | 22 | 22 | **0** |

The proof therefore did not rely on a silent fallback and introduced no
reasoning-conversion warning.

Mission Control captured the same load window:

| State | Windows free GiB | Windows used GiB | GPU dedicated GiB | GPU shared GiB | Models |
|:--|--:|--:|--:|--:|--:|
| Before request | 39.8 | 24.0 | 6.5 | 0.3 | 0 |
| 27B loaded, turn complete | 37.6 | 26.2 | 29.2 | 1.3 | 1 |
| Settled after unload | 39.9 | 23.9 | 6.5 | 0.3 | 0 |

These are observed point samples, not a peak-memory claim. Stage 4 remains the
controlled two-resident memory/performance soak.

## Stage 1 audit items closed here

1. The missing Stage 1 RAM/VRAM record is now added to the Stage 1 receipt
   from Mission Control's contemporaneous 12:07–12:18 history.
2. `stack\ws-gatecheck\AGENTS.md` now begins with
   `SCOPE: Halo stack configuration tasks only.`
3. `Halo-Code.ps1` and `Gate-Build.ps1` now carry unmistakable LEGACY control-
   plane warnings while preserving their verifier logic for Stage 3 reference.
4. Rollback now includes the LM Studio Halo aliases and exact manual restore
   instructions.

## Final state and limitation

- `lms ps --json`: `[]`
- DSH `:3080`: healthy
- LM Studio `:1234`: healthy
- Settled GPU dedicated memory: 6.5 GiB
- Live/canonical settings SHA-256:
  `ad034219aa2445558ff1818d19e2aeadd221b15ced6a41e212e008250fd266c9`

Stage 2 proves **reasoning on through the real DSH route**. It does not prove
graded reasoning, because this tuned alias does not advertise graded levels.
DSH intentionally shows no effort picker for this route; LM Studio owns the
real `on` default. Any future graded-effort claim requires a different alias,
template, or endpoint and a new runtime comparison.
