> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Stage 1 independent audit — VERDICT: PASS (with 4 open items, none blocking)

**Auditor:** Claude (Opus 5), 2026-08-27
**Audited:** `STAGE-1-RUNTIME-EVIDENCE-2026-08-27.md` (Codex)
**Method:** raw runtime log read FIRST, before reading Codex's report, against the
pre-registered rule in `AUDIT-BASELINE-2026-08-27.md`. Every item below was
re-derived from the machine, not copied from Codex's text.

---

## 1. The pass rule, and whether it was met

Pre-registered rule: a load line in the LM Studio runtime log, dated after the
change, showing `n_slots = 1` on the ACTIVE DSH JIT path — not a hand-run
`lms load`. A YAML diff would not count.

**Met.** Three such lines exist:

```
12:08:29  srv load_model: initializing, n_slots = 1, n_ctx_slot = 32768, kv_unified = 'true'
12:13:00  srv load_model: initializing, n_slots = 1, n_ctx_slot = 32768, kv_unified = 'true'
12:16:17  srv load_model: initializing, n_slots = 1, n_ctx_slot = 32768, kv_unified = 'true'
```

versus six loads earlier the same day at `n_slots = 4` (00:35:02, 02:52:39,
03:01:10, 10:25:30, 10:28:13, 10:28:50). The defect and its repair are both
visible in one file.

**JIT path proven, not asserted.** I grepped the whole day for
`Endpoint=loadModel`. Three hits, all before 03:00, all for the OLD raw id
`unsloth/qwen3.8-27b`. In the 12:07-12:18 window the only CLI model action is
`Endpoint=unloadModel: halo/qwen3.8-27b` at 12:17:43 — cleanup after the test.
Each of the three loads is preceded by a `POST to /v1/chat/completions`
(12:08:01, 12:10:27 to 12:10:29, 12:13:14 to 12:13:15). No manual load occurred.

## 2. Independently confirmed

| Claim | Confirmed how |
|:--|:--|
| parallel = 1, 32K/slot, unified KV | 3 runtime load lines above |
| Correct 27B quant | log: `Qwen3.8-27B-UD-Q5_K_XL.gguf` (12:08:01, 12:13:15) |
| Correct Coder quant | log: `Qwen3-Coder-30B-A3B-Instruct-Q4_K_S.gguf` (12:10:29) |
| 27B to Coder to 27B lifecycle | three loads, alternating, API-triggered |
| MTP on for 27B, off for Coder | only two `common_speculative_init_result` lines in the window (12:08:16, 12:15:52), BOTH naming the 27B GGUF; none for the Coder |
| Load timings 28 s / 153 s / 182 s | arithmetic on the log's own request/ready timestamps: 12:08:01 to 12:08:29; 12:10:27 to 12:13:00; 12:13:15 to 12:16:17 |
| `contextWindow` declared = loaded | `.dsh\settings.yaml` declares `contextWindow: 32768` on BOTH new alias ids. The C1 failure class (renamed id, orphaned declaration) did NOT recur |
| DSH routes to the aliases | `settings.yaml:105` default = `halo/qwen3.8-27b`; `agent.cordis.yml:240` subagent_coder = `halo/qwen3-coder-30b-a3b` |
| Reasoning still dishonest | 3 warnings at 12:08:29, 12:10:09, 12:16:18 (Stage 2's job, correctly left open) |
| Snapshot integrity | all 33 SHA-256 manifest entries recomputed: 0 missing, 0 mismatch |
| Snapshot == live | byte-compare MATCH on `.dsh\settings.yaml`, `agent.cordis.yml`, `preset.yml`, both `halo\*\model.yaml`, `.lmstudio\settings.json` |
| Canonical stack == live | byte-compare MATCH on `halo-settings.yaml`, `agent.cordis.yml`, `preset.yml` |
| Research docs == snapshot | byte-compare MATCH on all 4 markdown files |
| Final state | `lms ps --json` returns `[]`; DSH :3080 returns 200; LM Studio :1234 returns 200 |
| Rollback backup exists | `.dsh\backups\halo-stage1-20260827-115516\` — 4 files |

## 3. What I could NOT independently verify (stated, not glossed)

**The effective-configuration table** (eval batch 2048, physical batch 512,
flash attention enabled, context checkpoints 32, KV GPU offload enabled).

Codex sourced it from `GET /api/v1/models` while the models were loaded. I
confirm that request happened (12:09:46, 12:10:43) but the models are now
unloaded, so I cannot reproduce the response. I grepped the entire day's log
for `flash_attn`, `n_batch`, `n_ubatch`, `type_k`, `type_v`, `mmap`: **zero
hits**. The instrument's blind spot: LM Studio's server log at verbosity 3 does
not print these fields at all, so their absence is not evidence against them.

What I CAN confirm is that both `model.yaml` files declare exactly those values
(`evalBatchSize 2048`, `physicalBatchSize 512`, `flashAttention true`,
`contextCheckpoints 32`, `offloadKVCacheToGpu true`), and that every field in
those files which the runtime DOES print — parallel sessions, context length,
unified KV, MTP on/off — came out correct at runtime. That is good indirect
support. It is not the same as observation.

Standing-rule note for the record: `/api/v1/models` is not the sanctioned truth
source on this box (`lms ps --json` is; the REST catalog has misreported
quantization for aliased ids before, and these are now aliased ids). The table
should be re-captured via `lms ps --json` during the Stage 4 soak, when both
models are loaded anyway. Codex's own quant claims survive this because the
engine log names the GGUF files directly.

**Codex was straight about its own limits** and I confirm the disclosure is
accurate: F16 KV, `tryMmap = false`, and `gpuStrictVramCap` are declared in
`model.yaml` and are NOT independently observed. Codex labelled them as such
rather than claiming them. That is the correct behaviour.

**"At no point did `lms ps --json` show both Halo models resident."**
Not reproducible after the fact. Circumstantially supported:
`unloadPreviousJITModelOnLoad = true`, and each load starts a fresh
`llama_server` on its own port. Treated as plausible, not proven.

**"The runtime continued with reasoning enabled."** NOT supported by the log.
The old warning said `Falling back to reasoning setting 'on'`. The new
alias produces a DIFFERENT warning — `No valid custom reasoning fields found in
model 'halo/qwen3.8-27b'. Reasoning setting 'medium' cannot be converted to any
custom KVs.` — which states no fallback at all. Whether reasoning is on or off
for the alias is currently unstated by the instrument. Stage 2 must establish
it, and must not inherit this sentence as a settled fact.

## 4. Open items

1. **RAM/VRAM numbers are missing.** Codex's own pre-announced Stage 1 list
   included "actual RAM/VRAM use". The evidence file contains none. Not
   blocking — Stage 4 is the memory stage — but the deliverable list and the
   delivery do not match, and that should be said rather than absorbed.
2. **`ws-gatecheck\AGENTS.md` has no SCOPE header.** The Research-folder and
   `stack\AGENTS.md` copies both open with `SCOPE: Halo stack configuration
   tasks only.` This third one opens with two blank lines and 36 lines of hard
   cadence rules that will inject into any agent working in that directory.
   Path: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\ws-gatecheck\AGENTS.md`
3. **LEGACY labels not applied.** `Halo-Code.ps1` still opens "THE public entry
   point of the Halo Stack"; `Gate-Build.ps1` — the explicitly rejected
   second-DSH conductor — carries no warning. Both sit in the recovery
   snapshot's source directory, where a future agent could reconstruct from
   them. Plan item, still open.
4. **Rollback instruction is incomplete.** The backup holds DSH files only. A
   full revert also requires removing `C:\Users\scott\.lmstudio\hub\models\halo\`,
   which is new and therefore not in any backup. Add that line to the evidence
   file.

## 5. Performance, recorded without spin

First post-change 27B round: prefill 162.2 tok/s over 10,267 tokens (TTFT
63.3 s), decode 20.0 tok/s, draft acceptance 0.703. The historical record for
this model is 181 tok/s prefill and 26.9 tok/s decode solo, acceptance
0.83-0.86.

These are cold-load, n=1, a different prompt, and the decode sample is 77
tokens. This is **not** a regression finding. It is a warning against the
opposite error: Stage 1 has not yet demonstrated that parallel=1 is faster, and
nobody should write that down. What parallel=1 demonstrably fixes is KV
over-allocation (4 x 32,768 down to 1 x 32,768 per model) and the MTP-at-np>=2
inversion. Speed is Stage 4/5's question.

Coder round for comparison: prefill 779.1 tok/s over 10,813 tokens, decode
60.4 tok/s on an 11-token sample.

## 6. Verdict

**Stage 1: PASS.**

The required outcome — the proven load envelope reaching the engine on the
active DSH path — is met for the parameters the runtime actually reports, by
the means the contract allows (model-identity defaults, section 9 clarification
(a)). The change is small, reversible, evidenced, and the report distinguishes
observed values from declared ones without being asked to.

Stage 2 may proceed. The four open items above should be closed alongside it,
not deferred past it.


## Verification ledger

VERIFIED: First post-change load ran at n_slots = 1, 32K, unified KV | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log:5715
VERIFIED: The Coder load also ran at n_slots = 1 | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log:5842
VERIFIED: The 27B reload also ran at n_slots = 1, completing the 27B-Coder-27B cycle | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log:5995
VERIFIED: The reasoning warning changed wording and named no fallback | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log:5719
VERIFIED: Snapshot manifest recomputed, 33 of 33 entries matched | C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration\MANIFEST-SHA256.txt:2
UNVERIFIED: eval batch, physical batch, flash attention, context checkpoints, KV offload, F16 KV, tryMmap, strict VRAM cap - declared in model.yaml and reported by REST, never observed in the sanctioned instrument
