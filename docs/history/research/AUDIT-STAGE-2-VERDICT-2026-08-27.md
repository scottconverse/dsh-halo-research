> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Stage 2 independent audit — VERDICT: PASS

**Auditor:** Claude (Opus 5), 2026-08-27
**Audited:** `STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md` (Codex), plus the four
Stage 1 audit items Codex reports as closed.
**Method:** raw runtime log and raw evidence artifacts read FIRST, before
reading Codex's report. Every number below was re-derived from the machine.

---

## 1. The Stage 2 question, and the answer

Stage 2 had to replace a fake graded `medium` with an honest mapping, and prove
it at runtime. Three things had to be true at once, or the stage fails:

**(a) DSH must stop sending a fabricated effort.** Verified from DSH's own
durable session record, not from Codex's summary. In
`SESSION-HISTORY.json`, event seq 11, `request/header.config` reads exactly:

```json
{"provider": "lmstudio", "model": "halo/qwen3.8-27b"}
```

No `reasoningEffort` key. `POSTTURN-SESSION-MODELS.json` shows the same for the
live session route, and the halo entries carry no effort selector.

**(b) The warning must stop.** I counted every reasoning `[WARN]` in the day's
LM Studio log: **25 total, the last at 12:16:18** — during Stage 1, before this
change. There are **zero WARN lines of any kind** after log line 6000. Codex's
own counter file agrees and decomposes the same total (22 `Falling back` + 3
`cannot be converted` = 25, all deltas 0). Two instruments, one number.

**(c) Reasoning must still actually happen** — silence is not proof. This is
the part an absent warning cannot establish, so I looked for positive evidence
and found it: the assistant turn contains a `block-start` of
`blockType: "reasoning"` followed by **140 `reasoning-delta` chunks**. The
assembled visible text is exactly `HALO-STAGE2-REASONING-OK: 12193`, and
nothing else. 137 x 89 = 12193, so the reasoning also reached the right answer.

All three hold. Stage 2 passes on its own terms.

## 2. Envelope did not regress

The Stage 2 load had to keep Stage 1's gains. It did:

- `14:57:12` `POST /v1/chat/completions` — JIT, no `Endpoint=loadModel` in the
  window; the only CLI action is `unloadModel` at 14:59:30 (cleanup).
- `14:57:12` loads `Qwen3.8-27B-UD-Q5_K_XL.gguf` — correct quant, from the
  engine log.
- `14:57:23` `common_speculative_init_result` — MTP active.
- `14:57:27` `n_slots = 1, n_ctx_slot = 32768, kv_unified = 'true'`.
- Turn: prefill 164.1 tok/s over 10,299 tokens; decode 23.86 tok/s over 161
  tokens; draft acceptance 0.797, mean length 4.11.

`lms ps --json` — the sanctioned truth source — was captured this time and
reports `modelKey halo/qwen3.8-27b`, `quantization Q5_K_XL`,
`contextLength 32768`, **`parallel: 1`**. That closes part of my Stage 1 gap:
parallel, context and quant now come from the sanctioned instrument, not from
REST. Note the aliased id did NOT misreport its quantization here.

## 3. Stage 1 audit items — all four closed, all four verified

1. **RAM/GPU evidence.** Codex added it and named its source: Mission Control's
   one-minute history for the 12:07-12:18 window. I found that store myself
   (`C:\Users\scott\.dsh\mission-control\mc-history.jsonl`, 912 samples) and read
   the window directly:

   | time | GPU dedicated GiB | GPU shared GiB | Windows free GiB |
   |:--|--:|--:|--:|
   | 12:07:29 (idle) | 6.4 | 0.3 | 40.6 |
   | 12:08:29 / 12:09:29 (27B) | 29.2 | 1.3 | 38.5 / 37.7 |
   | 12:11:29 / 12:12:29 (Coder) | 22.9 | 0.5 | 40.3 / 40.5 |
   | 12:13:29 - 12:15:29 (Coder) | 24.8 | 1.1 | 40.4 - 39.8 |
   | 12:16:29 / 12:17:29 (27B) | 29.2 | 1.3 | 37.9 / 38.8 |
   | 12:18:29 (unloaded) | 6.4 | 0.3 | 40.8 |

   Every figure Codex published reproduces inside its stated window, including
   the 37.7-40.8 GiB free-memory range. Codex labelled them point samples
   rather than peaks; that label is accurate.

   Cross-instrument check: this store's `decodeTps` column reads 20.5 and 60.4
   for the two Stage 1 models, against 20.01 and 60.35 computed from the engine
   log; and 23.8 for Stage 2 against 23.86. The instruments agree.

2. **`ws-gatecheck\AGENTS.md`** now opens `SCOPE: Halo stack configuration
   tasks only.` Confirmed by reading the file.
3. **LEGACY labels.** `Halo-Code.ps1` now opens `LEGACY ORCHESTRATOR — DO NOT
   USE AS THE CURRENT HALO CONTROL PLANE`; `Gate-Build.ps1` opens `LEGACY
   EXTERNAL CONDUCTOR — DO NOT REVIVE...`. Both keep their verifier logic for
   Stage 3 reference. Confirmed by reading both files.
4. **Rollback coverage.** `halo-stage2-20260827-144812` contains `live-dsh\`,
   `canonical-stack\`, and — the gap I raised — `live-lmstudio-halo\` with both
   alias `model.yaml` files. I confirmed the backed-up `live-dsh\settings.yaml`
   still contains the OLD `reasoningEfforts` block, i.e. it is a genuine
   pre-change state and not a copy of the new file.

## 4. Integrity checks I ran myself

- Research snapshot manifest: **66 entries, 0 missing, 0 mismatched.**
- Stage 2 evidence bundle manifest: **30 entries, 0 missing, 0 mismatched.**
- `PRESTATE-MANIFEST.json`: 15 entries, as stated.
- Published settings hash `ad034219aa2445558ff1818d19e2aeadd221b15ced6a41e212e008250fd266c9`
  matches the live file, the canonical copy, AND the Research snapshot copy —
  all three identical.
- Byte-compare MATCH: live vs snapshot vs canonical for `settings.yaml`,
  `agent.cordis.yml`, both `model.yaml` files; Research vs snapshot for the
  Stage 1 and Stage 2 evidence documents.
- Live now: `lms ps --json` returns `[]`; DSH :3080 = 200; LM Studio :1234 = 200.

## 5. What is still not proven (carried forward, not a Stage 2 defect)

**The rest of the load envelope remains declared, not observed.** Eval batch
2048, physical batch 512, flash attention, 32 context checkpoints, KV GPU
offload, F16 KV, `tryMmap = false`, strict VRAM cap: none of these appear in
`lms ps --json` or in the engine log. They are in both `model.yaml` files and in
the `/api/v1/models` receipt. Unchanged since Stage 1; Stage 4 is the place to
settle what can be settled.

One point in the REST surface's favour, recorded because it is the first real
test of it on this box: its reasoning claim (`allowed_options: ["on"]`,
`default: "on"`) was independently corroborated this round — by the warning
disappearing AND by a real reasoning block appearing. It was right. That
raises confidence in the surface. It does not make it the sanctioned source.

## 6. One consequence nobody has stated yet — for Stage 5 planning

If `halo/qwen3.8-27b` advertises `allowed_options: ["on"]` only, then **`off`
and `none` are also unreachable on this alias**, not just `medium`. The tuning
report's pinned settings call for `reasoning_effort: none` on mechanical steps,
citing a measured ~4x speed-up at 4/4 correctness. On this route that lever is
now unavailable in both directions.

Two readings, and I do not yet know which is right:
- **Benign:** mechanical work goes to the Coder, whose `model.yaml` declares
  `reasoning: false`, so the lever lives there and nothing is lost.
- **Real cost:** the ~4x measurement applied to the brain, and the brain can no
  longer be put into a cheap mode.

This is not a reason to reopen Stage 2 — the honest mapping is still the right
call, and a false `medium` was worse. It is a question to answer before Stage 5
compares modes, so the comparison is not run on a route that has quietly lost a
tuning lever.

## 7. Verdict

**Stage 2: PASS.** All four Stage 1 audit items: **CLOSED and verified.**

The change is small and correct: DSH stopped claiming a capability the runtime
does not have, and the runtime's real default was proven to survive the
omission. Codex's report distinguishes what it observed from what it declared,
states its own limitation in the closing paragraph without being asked, and its
published numbers reproduce exactly against instruments it did not cite.

Stage 3 may proceed to joint gate design. Carry section 5 into Stage 4 and
section 6 into Stage 5.


## Verification ledger

VERIFIED: The last reasoning warning in the whole log is at 12:16:18, before the Stage 2 change | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log:5999
VERIFIED: The Stage 2 load kept n_slots = 1 at 32K | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-27.1.log:6589
VERIFIED: lms ps reported the alias at Q5_K_XL, 32768 context, parallel 1 | C:\Users\scott\.dsh\backups\halo-stage2-20260827-144812\POSTTURN-LMS-PS.json:26
VERIFIED: The live DSH settings no longer declare a graded reasoning effort (re-checked 2026-08-30 after the file was rewritten by the library cleanup: zero reasoningEffort declarations remain; the boolean-reasoning comment now sits at the cited line) | C:\Users\scott\.dsh\settings.yaml:31
VERIFIED: The tuned load envelope is declared in the alias model definition | C:\Users\scott\.lmstudio\hub\models\halo\qwen3.8-27b\model.yaml:31
UNVERIFIED: that the 29.2 GiB figure is a peak rather than a one-minute point sample - Mission Control samples once per minute
