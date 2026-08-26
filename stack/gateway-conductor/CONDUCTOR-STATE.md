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

- **FULL STOP by operator order, 08-25 ~23:45. NOTHING runs. Do NOT launch
  anything until the operator says so.** A7 was killed mid B2-v6 round 2
  (B3-v4 never ran); all DSH processes down; **both models UNLOADED**
  (`lms ps`: none loaded — reload them before any future lane run); shutdown
  verified by the 90-second silence watch. The operator is deciding how to
  proceed after a day he judged wasted — read spec v2.9 §30.6 (the failure
  record) FIRST.
- Next session, in order: (1) read §30.6; (2) wire the harness-green
  requirement INTO run-batch as a hard refusal; (3) await operator go;
  (4) reload models, run `test-harness.ps1`, then A7 remains the staged
  rerun (first sighted-feedback batch — B2/B3 seeds still in the working
  tree).
- Superseded context below (A7 launch rationale):
- **ROOT CAUSE FOUND for the all-day red grind:** Gate-Build's `Run-Verdict`
  captured the verifier with `2>&1`, but the verifier reports via Write-Host
  (stream 6) — so `gate-verdict.txt` and **GATE-FEEDBACK.md were EMPTY all
  day; every retry round ran blind.** Fixed to `*>&1`; proven by new harness
  check T4b (Gate-Build -VerifyOnly must produce a verdict file containing
  `RESULT:`). Harness now 11/11. A6's verdicts (B2-v5 RED 2r/24.3m, B3-v3
  RED 2r/20.5m) carry this asterisk — the units never saw their failures.
- Historical note (superseded): operator ordered STOP + pause 21:0x 08-25. Batch
  A5's final tally: B2-v4 RED 3r/54.7m (forensics preserved and salvaged),
  B3-v2 GREEN/committed `e72b9d6` **but hollow** (fails 9/11 gate-authored
  tests; classify_ip crashes on IPv6), B5-cockpit killed in round 1.
- **The method changed to TEST-FIRST (spec §30.4).** The conductor authored
  frozen acceptance tests, committed `36a2192` in the product repo
  (`test_cache.py`, `test_migrations.py`, `test_security.py`, 207 lines,
  ledger `A6-prep` row). The verifier enforces `UNIT_FROZEN` (no worker edits
  to tests) + `UNIT_REQUIRED` (anti-shrinkage). The pipeline dry-run
  `test-harness.ps1` passes 9/9 in ~90 s with zero inference — run it before
  ANY real batch.
- **Batch A6 is staged, NOT launched** (needs operator go + free machine):
  1. `B2-v5` — worker implements src against frozen tests; working tree
     seeded with the best B2-v4 forensic code (cache.py 7.5 KB etc.)
  2. `B3-v3` — fix shipped security.py against frozen tests (9 known failures
     listed in the brief)
  Both: 12-min caps, 2 rounds, worker lane, ONE lane at a time.
  Launch: `& run-batch.ps1 -Batch A6` (background), after `test-harness.ps1`
  is green and the machine is free.
- B5 reddit parser: rebrief test-first later (needs RSS fixture files
  authored by the gate first).

## Scoreboard so far

GREEN + committed + trusted: A-scaffold (3r/23m), B1-config-logging (2r/33m).
Committed but hollow, reopened: B3 (v3 staged). Open: B2 (v5 staged), B5.
All product code local; fable_code_lines 0; gate test lines 207 (own ledger
column, never counted as product). Pattern that works: tightened rebrief
naming the exact failure class → green. Pattern that does NOT: worker-authored
tests — three hollow/weak-test incidents (B2-v3, B2 6-test shrink, B3-v2).

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
6. Briefs must be fully SELF-CONTAINED. Never write "keep everything else" or
   reference prior attempts — the runner may have reverted the tree and the
   worker then rebuilds a minimal version that hollow-passes (B2-v3 incident).
7. For any unit where test coverage IS the contract, list the exact required
   test function names in the brief AND in the batch's `required=` field —
   `verify-pytest.ps1` fails the unit if any named test is not collected
   (anti-shrinkage; proven fail-closed 08-25 19:53).
8. Every gate-authored frozen test file MUST include adversarial /
   forbidden-outcome cases, not only happy paths — at least one per unit
   (examples already in force: `rate_state` survives evict; byte-identical
   file after SchemaTooNewError refusal; a max_age miss must not delete).
   An artifact existing is not the same as the task being done.
9. Escalation packet: every question to the operator states (a) the decision
   needed, (b) my recommendation and why, (c) alternatives already tried or
   rejected, (d) the cost of waiting. Never a bare "what should I do?".
10. Every verifier MUST print a `RESULT:` line on every exit path — the gate
   classifies a verdict with no RESULT line as ENV_FAILURE (exit 2, unit
   stops, conductor repairs; worker rounds are never spent on environment
   defects). Gate exit codes: 0 green, 1 fail-after-rounds, 2 ENV_FAILURE,
   3 TRIPWIRE (identical failure signature two rounds running — stop early,
   the feedback loop is not converging). Ledger verdicts mirror these:
   GREEN / RED / RED-ENV / RED-TRIPWIRE. Evidence for every unit is archived
   with SHA256 hashes under `runs\<batch>-<unit>-<time>\` (outside the
   worker-writable workspace); the ledger's `evidence` column points there.
   Trip-wire + ENV classification live in Gate-Build.ps1 and are parse-checked
   but not yet exercised by a real red — first live firing should be checked.

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
- Background batches DIE at compaction. On any resume: check gate-log.txt
  freshness + live processes before trusting "in flight"; audit leftover work
  (a green verifier on a shrunk test list is not a green unit).
- KILLING a batch: TaskStop + cmdline sweeps are NOT enough — the A5 runner
  survived both and ran 3 more units. Kill the process TREE rooted at the
  agent pid printed in gate-log.txt AND any pwsh whose cmdline mentions
  run-batch/Gate-Build, then verify death by a 90-second state-change watch
  (gate-log + report + ledger all static, `lms ps` idle). A quiet cmdline
  probe alone is a claim of absence — never report "stopped" from it.
- Never touch: `~\.dsh` model routes, worker home settings, LM Studio port,
  spec files. Operator is point-and-click only — no CLI instructions to him.
