# Conductor state — Halo Research Gateway build (written pre-compaction, 2026-08-25)

**Mode (operator-ordered):** LOCAL-MOST. Fable = conductor only (briefs, dispatch,
triage, ship). DSH local models write 100% of product code behind
`stack\Gate-Build.ps1`. Fable-authored product code = logged exception, target 0
(currently **0**). Claude spend must stay minimal: operator is ~94% of weekly cap
(resets ~20:40 MDT today); the CivicCast-vs-Codex race owns the budget; this
project is measured on % done by local models. Scoring lives in `LEDGER.csv`
(columns incl. fable_code_lines).

**Deliverable:** Halo Research Gateway per
`C:\Users\scott\Desktop\Halo Stack Research\HALO-RESEARCH-GATEWAY-SPEC-v1.3.md`
(read in full pre-compaction; v1.3 = v1.2 + staleness fixes + repo quality-gate
requirements). Product repo: `C:\Users\scott\Desktop\Code\halo-research-gateway`
(git; greens auto-committed by the batch runner). Full proving campaign was
SHELVED — this is a real build, not a test program.

## Live right now

- **Batch A4 running in background** (task id `bj0rdhja6`), sequential gated units:
  1. `B2-v3` — cache/migrations, surgical brief (two named defects; lock class already cured)
  2. `B3-v2` — SSRF/URL policy, path-hammered brief (prior failure: file never at required path)
  3. `B5-cockpit` — reddit parser **escalated to the 27B cockpit lane** (`lane='cockpit'`) after 6 coder rounds
- On its notification: read `LEDGER.csv` tail + grep the task output for
  `FAILED|RESULT|MISSING` signatures ONLY (never full transcripts). Greens are
  already committed by the runner. Reds: rebrief (v+1 file in `briefs\`) or move
  up the ladder: coder → tightened rebrief → 27B lane → split smaller → Fable
  codes (logged failure of the experiment). Red work is preserved under
  `reds\<unit>-<time>\` for forensics.

## Scoreboard so far

GREEN: A-scaffold (3r/23m), B1-config-logging (retry, 2r/33m). RED in flight:
B2 (x2), B5 (x2), B3 (x1). All code local. Pattern that works: tightened
rebrief with the exact failure class named → green next attempt.

## Briefing rules learned (apply to every new brief)

1. Name allowed imports explicitly (stdlib-only where possible) — prevents
   phantom-dependency reds.
2. Windows SQLite: per-operation connections via `contextlib.closing`, SQLite
   `backup()` API never file-copy, `logging.shutdown()` before reading logs back.
3. Forbid byte-equality assertions on normalized text — contract/containment
   assertions only; exact-equality only for short structural fields.
4. State the verifier's EXACT required file paths in the brief and require
   creating them first.
5. Every brief ends: run the verifier's exact pytest command until green before
   stopping; touch only named files.

## Remaining units to brief and queue (specs sections in v1.3)

B4 coordinator+injectable clock (queues, singleflight, circuit; fake-clock
tests) · B6 http_fetch provider + extraction gate (respx fixtures; corpus per
§13.2) · B7 exa provider (mocked MCP client) · B8 result envelope + cursor
pagination (§9.6) · B9 MCP app wiring + /health + /stats (§7.2, §19) · B10 repo
quality gate + pre-commit red/green proof (v1.3 addition) · then Phase 0
diagnostic server + DSH-lane measurements. Verifier for all: `verify-pytest.ps1`
with `UNIT_TESTS` env; batches defined in `run-batch.ps1` (`lane=` field
optional, per-unit).

## Cautions

- Effort battery: VOIDED (conductor cwd bug); medium stands as cockpit default.
  No more test programs — operator is done with tests.
- Transcript-grep-first rule before ANY new experiment (see memory: 4 incidents).
- Never touch: `~\.dsh` model routes, worker home settings, LM Studio port,
  spec files. Operator is point-and-click only — no CLI instructions to him.
