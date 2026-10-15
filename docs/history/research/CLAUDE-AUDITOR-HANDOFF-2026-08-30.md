> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Claude auditor session handoff — 2026-08-30 (pre-compaction anchor)

Written so a compacted or fresh Claude session can resume the auditor role
without re-deriving two weeks of context. Read this first, then the two
governing records it names.

## My role and standing method

I am the independent AUDITOR for the Halo stack. Codex implements; I verify.
Scott operates by point-and-click only; every deliverable for him gets a full
plain-text path.

Non-negotiable method, learned through failures this session:
1. **Raw artifacts FIRST, reports second.** Read the runtime log / session
   store / hashes before reading Codex's write-up, so its wording cannot steer.
2. **Any claim about what software does gets read in the source, or the
   sentence is not written.** My Stage 3 "Option B" failure came from skipping
   this; it cost trust and nearly got me pulled off the project.
3. **A negative probe is not a conclusion.** Name the instrument and its blind
   spot. My sandbox virtualizes `C:\Users\scott\AppData\Local` (MSIX) — gate
   receipts under `AppData\Local\HaloGate\runs` are INVISIBLE to me and "not
   found" there means nothing. Corroborate via `.dsh\sessions` (run-id-named
   staging dirs), the LM Studio log, and re-running test suites.
4. **`lms ps --json` is the only residency truth.** A completed `lms load`
   command, not `lms ps` idle status, proves readiness.
5. **The audit-citation-gate Stop hook is live** (`~/.claude/hooks/`,
   registered in settings.json, battery 15/15). Any .md I write named
   *audit/verdict/review/handoff/evidence/assessment/findings* must carry a
   `## Verification ledger` with `VERIFIED: claim | path:line` entries the
   transcript proves I read, or `UNVERIFIED:` lines. It also re-checks OLD
   documents each turn, so citations rot loudly when files change — fix by
   re-verifying, never by weakening the gate. Its tests:
   `~/.claude/hooks/audit-citation-gate.tests.ps1`.

## Where the project stands (agreed with Codex, word for word)

> Halo has a verified small-unit operational baseline. It has not yet proven
> medium-scale work, completed its research gateway, or shipped software.
> Next: medium-sized real work, receipts preserved, protected contracts
> strengthened when failures expose gaps.

Governing records (current, supersede everything older):
- `C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report-v3.2.md`
- `C:\Users\scott\Desktop\Halo Stack Research\HALO-CURRENT-CONFIGURATION.md`

Live stack: DSH cockpit :3080 · LM Studio :1234 · Mission Control :3090 (truth
sources repaired 08-30 pm). Daily pair DUAL-RESIDENT, serialized generation:
brain `halo/qwen3.6-35b-a3b` (Q4_K_M, 32K, parallel=1, thinking off) + worker
`halo/qwen3-coder-30b-a3b-q4km` (same envelope) via the `subagent_coder`
verified gate (`stack\halo-verified-coder`, zero-model suite 9/9). Fallbacks:
dense 27B Q5_K_XL, coder Q4_K_S. Memory split 96/32 (may be revisited — its
own stress data flagged Windows headroom; 120B is deleted). Model library
curated to 7 dirs / ~136 GiB. Settings hash starts `D91EA1AA`; manifest 96
entries; HEAD `67850b5c`.

## Audit trail this session (all in the Research folder)

Stage 1 PASS → Stage 2 PASS → Stage 3 design APPROVE-WITH-AMENDMENTS (then my
Option-B error, withdrawn; then the staging-parent finding that deleted the
DSH-fork plan) → Stage 4 PASS → project-state review + addendum accepting
Codex's seven corrections (`AUDIT-PROJECT-STATE-REVIEW-2026-08-30.md` — read
its addendum; it lists my claim-inflation corrections: "promoted twice" not
"shipped", planner-lock chronology, run-id correlation proved existence not
verdicts).

## Open items to watch

1. **Medium-scale real work** is the active evaluation. First multi-file
   attempt (Hardgate #23) FAILED honestly; receipts should accumulate
   time-to-PASS, rounds, verifier failures — that ledger decides if Stage 5
   (mode A/B) ever runs. Stage 5 is provisionally resolved: restricted
   Standard-derived worker.
2. **Hardgate change is promoted but UNCOMMITTED** — Scott's repo decision.
3. **Research Gateway (Stage 7)** not deployed; anonymous Exa quota is the
   constraint.
4. **96/32 vs less** — separate reversible decision; stress minimums were
   2.7-3.5 GiB but daily ops have more headroom.
5. **ROCm**: parked until stack work settles. ROCm 10 shipped (08-26), gfx1151
   Windows official, BUT 64GB dedicated cap open (lemonade #37, AMD engineer
   assigned) and testers pin ROCm 7.0-7.2. Ten-minute probe path exists:
   lemonade `llama-b1318-windows-rocm-gfx1151-x64.zip` portable, point at
   on-disk GGUFs. Vulkan stays until #37 closes.
6. **8m30s cold-load anomaly** — investigate only if it recurs.
7. Two-worker fan-out: proposed only, bounded retest contract in
   `HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`.

## Verification ledger

VERIFIED: The governing v3.2 spec and its evidence map exist as described | C:\Users\scott\Desktop\Halo Stack Research\DSH-Strix-Halo-Report-v3.2.md:1
VERIFIED: The current configuration record carries the dual-resident daily pair and gate contract | C:\Users\scott\Desktop\Halo Stack Research\HALO-CURRENT-CONFIGURATION.md:1
VERIFIED: My project review and its correction addendum are on disk | C:\Users\scott\Desktop\Halo Stack Research\AUDIT-PROJECT-STATE-REVIEW-2026-08-30.md:1
UNVERIFIED: live service/residency state at the moment a future session reads this - re-check :3080/:1234/:3090 and lms ps fresh; this file is an anchor, not live telemetry
