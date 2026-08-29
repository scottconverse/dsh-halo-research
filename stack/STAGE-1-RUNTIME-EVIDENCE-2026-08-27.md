# Halo Stage 1 runtime evidence — 2026-08-27

**Stage:** tuned LM Studio JIT load envelope  
**Result:** PASS for the DSH-native 27B and Coder routes  
**Window:** 2026-08-27 12:07–12:18 MDT  
**Coordination:** Townlight sent `HALO-CLEAR` before model loading and received
`HALO-RELEASED` after both models were unloaded.

## What changed

Halo-owned LM Studio model definitions now wrap the two previously tuned GGUF
files:

- `halo/qwen3.8-27b`
- `halo/qwen3-coder-30b-a3b`

DSH's default route and `subagent_coder` route use those aliases. The original
raw LM Studio model entries remain available in the picker for experiments.
The aliases make the load envelope part of the requested model instead of
depending on a person to remember load-time switches.

## Real DSH-path proof

No model was preloaded. A fresh DSH session was created with the
`halo-orchestrator` preset:

`session-halo-stage1-20260827-1209`

Before the first prompt, `session.models` reported:

```text
provider = lmstudio
model = halo/qwen3.8-27b
context = 32768
permission = danger-full-access
```

The prompt entered through `POST /api/session.prompt`; no `lms load` command
was used. LM Studio received the first request at 12:08:01 and logged:

```text
[2026-08-27 12:08:29] load_model: initializing,
  n_slots = 1, n_ctx_slot = 32768, kv_unified = 'true'
```

The 27B returned exactly `HALO-STAGE1-COCKPIT-OK`.

The same parent was then instructed to call `subagent_coder` once in the
foreground. DSH created child session
`7180b96d-f8aa-465f-a601-9589f8ed00c1`; LM Studio received the child request
at 12:10:27 and logged:

```text
[2026-08-27 12:13:00] load_model: initializing,
  n_slots = 1, n_ctx_slot = 32768, kv_unified = 'true'
```

The child transcript identifies its model as `halo/qwen3-coder-30b-a3b`, has
a normal `turn/end`, and contains the exact response
`HALO-STAGE1-WORKER-OK`. DSH then resumed the parent. LM Studio reloaded the
27B and logged the same one-slot 32K line at 12:16:17. The parent ended
normally after reporting the worker's exact reply.

This proves the real lifecycle used by the product:

```text
DSH 27B request -> DSH subagent_coder -> DSH 27B resume
```

At no point did `lms ps --json` show both Halo models resident.

## Effective runtime configuration

LM Studio's live `/api/v1/models` response exposed the following configuration
for the loaded 27B instance:

| Setting | Effective value |
|:--|:--|
| Context | 32,768 |
| Evaluation batch | 2,048 |
| Physical batch | 512 |
| Parallel sessions | 1 |
| Flash Attention | enabled |
| Context checkpoints | 32 |
| MTP draft | enabled |
| MTP maximum tokens | 4 |
| MTP minimum tokens | 0 |
| MTP minimum continue probability | 0.5 |
| KV cache GPU offload | enabled |

For the loaded Coder instance it exposed:

| Setting | Effective value |
|:--|:--|
| Context | 32,768 |
| Evaluation batch | 2,048 |
| Physical batch | 512 |
| Parallel sessions | 1 |
| Flash Attention | enabled |
| Context checkpoints | 32 |
| MTP draft | disabled |
| KV cache GPU offload | enabled |

LM Studio's llama.cpp log independently corroborated one slot, 32K per slot,
unified KV, model load completion, MTP creation for the 27B, and successful
inference on both aliases.

Three configured loader fields are not included in LM Studio's public runtime
receipt: F16 KV precision, `tryMmap = false`, and strict VRAM cap. They remain
code-reviewed values in each Halo `model.yaml`, but this report does **not**
mislabel them as independently observed runtime fields. A later audit may
obtain process-level evidence if it requires those values separately.

## Performance observation

The corrected slot count fixed the four-slot defect, but this sequential cold
cycle was slow:

- Initial 27B request to model-ready line: about 28 seconds.
- Coder request to model-ready line: about 153 seconds.
- 27B return request to model-ready line: about 182 seconds.

The generation itself was healthy: the Coder processed its 10,813-token
prompt in about 13.9 seconds, and both outputs completed normally. The long
delay was model page-in/load time, not decode time. This is evidence for the
later two-resident soak; it is not permission to declare dual residency safe
without that test.

## Known pending item

The Stage 1 log did not prove whether the alias continued with reasoning
enabled: its new warning named no fallback. Stage 2 therefore had to establish
the behavior from a fresh request rather than inherit an assumption. Stage 2
later proved that a bare DSH request preserves LM Studio's actual `on` default;
see `STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md`.

## Contemporaneous resource observations

Mission Control's history contains one-minute samples for this exact
12:07–12:18 load window. They were omitted from the first version of this
report and are added here without changing the Stage 1 verdict:

- Windows free memory ranged from 37.7 to 40.8 GiB.
- Dedicated GPU memory reached 29.2 GiB on the 27B samples.
- Dedicated GPU memory reached 24.8 GiB on the Coder samples.
- Shared GPU memory ranged from 0.3 to 1.3 GiB.

These are point samples, not guaranteed peaks. Stage 4 remains the controlled
memory soak.

## Final state

- DSH `:3080`: HTTP 200
- LM Studio `:1234`: HTTP 200
- Resident models after evidence capture: `[]`
- Rollback backup:
  `C:\Users\scott\.dsh\backups\halo-stage1-20260827-115516`
- Complete successor rollback backup, including the LM Studio Halo aliases:
  `C:\Users\scott\.dsh\backups\halo-stage2-20260827-144812`
- LM Studio runtime log:
  `C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log`
