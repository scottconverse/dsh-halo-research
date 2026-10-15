> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Stage 4 independent audit — VERDICT: PASS (as scoped: short proof, real use is the soak)

**Auditor:** Claude (Opus 5), 2026-08-29 ~20:15 MDT
**Audited:** Codex's 2026-08-29 configuration record and Stage 4 completion claim.
**Method:** live instruments first (`lms ps --json`, LM Studio runtime log, DSH
durable session logs), Codex's report second.

---

## 1. Independently confirmed, from the machine

| Claim | Evidence |
|:--|:--|
| Dual residency is live | `lms ps --json` right now: TWO rows — `halo-brain-35b` (Q4_K_M, ctx 32768, parallel 1, idle) and `halo-coder-q4km` (Q4_K_M, ctx 32768, parallel 1, idle) |
| Envelope held | every load today at `n_slots = 1` except one 11:36 manual 4-slot load that predates the work |
| 96/32 split live | Windows total visible 31.79 GiB (measured earlier tonight) |
| Serialized generation happened for real | runtime log 19:11–19:17: brain generates, then 64 coder completions, then brain resumes — no overlap |
| The canary used the real brain → worker path | same log window; both models served requests in sequence |
| Gate PASS is in a durable record, not just prose | canary6's `session.jsonl.zstd` contains the tool result `HALO_GATE_CANARY_PASS` with `isError: false` and the exact receipt path `...HaloGate\runs\2026-08-30T01-16-38-059Z-2fdc1f28\verdict.json`, plus 12 `subagent_coder` and 3 `update_goal` references |
| Thinking is really off on the 35B | both smoke sessions contain **zero** `reasoning-delta` chunks and zero reasoning blocks — against 140 chunks in the Stage 2 dense-27B session. Positive absence across two sessions, not YAML |
| No reasoning warnings | 0 reasoning WARN lines in today's LM Studio log |
| All five aliases on disk | `gpt-oss-120b`, both coders, 35B, 27B under `.lmstudio\hub\models\halo\` |
| Pre-change backup exists | `.dsh\backups\halo-96gb-20260829-182512` |
| Services | DSH :3080 = 200, LM Studio :1234 = 200 |

## 2. Named blind spot

I could not read `C:\Users\scott\AppData\Local\HaloGate\runs\...` — my sandbox
virtualizes `AppData\Local`, the exact trap in the standing MSIX note. "Not
found" from my process is not evidence of absence. The gate receipt is instead
corroborated three ways: the durable DSH session log quoting the receipt path
and PASS marker, the LM Studio log showing the worker's generation window, and
live dual residency. Sufficient. A future audit from an unsandboxed shell can
read the receipt directly.

## 3. Findings (small, none blocking)

1. **Mission Control is down** (:3090 unreachable). The config doc lists it as
   live topology. Either start it in `Launch-Halo.ps1` or mark it manual-start
   in the doc. It is also the memory-history instrument — worth having up
   while real-use data is being collected.
2. **120B claims accepted as reported, not re-derived.** The two failed-load
   numbers (45.4 / 47.4 GiB peaks, Vulkan allocation error) match the failure
   class the community reports at this size. The doc's own label —
   "load-blocked, do not present as working" — is exactly right. Noteworthy:
   the failure at ~47 GiB dedicated suggests a **Vulkan-side allocation
   ceiling**, the same disease ROCm has at 64 GiB. Worth one line in the
   Research notes: the 120B may be blocked on BOTH backends until a driver
   moves.
3. **`keepModelInMemory: true` + `ttlMs: null`** — the daily pair never
   auto-evicts. Correct for the design, but it means a TownLight Sandbox or a
   heavy build now always contends with ~40 GiB of resident weights. §2 of the
   doc says coordinate; fine — just noting the old idle-TTL safety net is gone.

## 4. Stage 5 opinion — agree, with one instrument

Codex's "real use decides whether Stage 5 happens" is the right call and
matches the operator's instruction. One addition so the decision is made by
numbers instead of vibes: the gate already writes receipts per run. Make sure
each receipt (or a one-line ledger) captures **request→PASS wall-clock, rounds
used, and verifier failures**. Then "does Standard struggle?" answers itself
from the ledger after a week of real work, and Stage 5 runs — if ever — on an
actual failed unit. No new benchmark harness; just don't discard what the gate
already knows.

Stage 6 deferred unless endpoint symptoms appear: agree.
Stage 7 (gateway) as the next build: agree — Exa's anonymous quota is the
active constraint on research work.

## 5. Verdict

**Stage 4: PASS** as scoped — dual residency proven live, envelope held,
serialized generation observed, gate canary evidenced in durable logs, honest
no-thinking proof, fallbacks intact, rollback present. The deliberate absence
of a long soak is disclosed, per the operator's direction. Real use is now the
soak; the ledger in §4 turns that use into the Stage 5 decision.

## Verification ledger

VERIFIED: Both daily models resident at 32K parallel 1 via the sanctioned instrument | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-29.1.log:2080
UNVERIFIED: exact lms ps rows - captured live in-session (two rows, halo-brain-35b and halo-coder-q4km, both Q4_K_M ctx 32768 parallel 1); lms ps output is not a file I can cite by line
VERIFIED: Worker generated inside the canary window while the brain paused | C:\Users\scott\.lmstudio\server-logs\2026-08\2026-08-29.1.log:2131
UNVERIFIED: gate receipt verdict.json contents - AppData\Local is virtualized for my process; corroborated by the durable session log containing HALO_GATE_CANARY_PASS and the receipt path (session-halo-gate-canary6-20260829/session.jsonl.zstd, decompressed and searched this session)
UNVERIFIED: 120B failed-load peak memory figures (45.382 / 47.443 GiB) - reported by Codex, not re-derived; failure class matches community reports
UNVERIFIED: the 8/8 zero-model gate suite - not re-run this session
