# Handoff — DSH context-window tuning + incident (2026-08-24)

## The experiment (this is the valuable thing)
Goal: tune DSH + local Qwen3.8-27B so it can code AUTONOMOUSLY, after a
7-hour unsupervised run spiraled (context bloated to 214K tok, decode collapsed
to 1.5 tok/s, never finished). Scott's thesis: it was a TUNING problem
(context window), not a model-capability problem.

Harness (all in `C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\`):
- `canary-task.txt` — fair, explicit single-file Flask notes app spec (NO cmd
  metacharacters — `<>` break the pnpm.cmd launcher; do not re-add them).
- `smoke_test.py` — deterministic grader; PROVEN 7/7 on a correct impl
  (`_grader_selftest/`). Fair.
- `extract_metrics.py` — reads REAL metrics from session logs
  (`~/.dsh/sessions/**/*.jsonl.zstd`); usage is `chunk.usage.inputTokens/outputTokens`.
- `Run-Tuning.ps1` — sweep runner. LAUNCH via `pnpm.cmd` full path (NOT the
  `pnpm` shim; Start-Process can't run it). Task is flattened to one line.
- Run: `.\Run-Tuning.ps1 -Sizes 65536,98304,131072 -TimeoutMin 30`

### RESULTS SO FAR (thesis CONFIRMED)
| ctx | result | wall | peak ctx | note |
|---|---|---|---|---|
| 8K | FAIL | 0.3m | — | CONTEXT_WINDOW_EXCEEDED — agent baseline is ~8.5K, so 8K unusable (floor) |
| 16K | 7/7 | 6.0m | 12,169 | bounded, no spiral |
| 32K | 7/7 | 4.2m | 10,630 | fastest |
| 48K | 7/7 | 5.7m | 11,124 | |
| 64K | 7/7 | 5.9m | 12,040 | resumed 2026-08-24 pm |
| 96K | 7/7 | 12.4m | 12,398 | slower, no spiral |
| 128K | 7/7 | 9.9m | 11,232 | **the 7-hour config — passes in 10 min headless** |

**FINAL FINDING (supersedes the interim one): every usable window 16K-128K
passes 7/7. Window size is ELIMINATED as the spiral's primary driver — the
same 131K that died 7h interactively completes in 9.9 min headless. Surviving
suspects (confounded): interactive-session framing vs headless one-shot
boundary, and task size (canary vs full TownReporter). T-C isolates them:
run the FULL TownReporter brief headless at 32K + 128K.**

### NEXT STEPS
1. Resume the big-window tiers 64/96/128K — the real test: do LARGE windows
   spiral (reproduce the failure) or complete anyway? (light GPU discipline:
   fewer reloads, don't stack monitors.)
2. Then T-C: apply the winning config to the full TownReporter build, unattended.
3. Broader: this is Phase 1 of the "Halo v1 stack" (DSH + local model, bare
   metal, danger-full-access). TownReporter = the test-run product (vertical
   slice: transcript -> local-LLM draft -> producer review/gate -> publish +
   search + corrections). A working hand-written version exists at
   `C:\Users\scott\Desktop\Code\townreporter\app.py` (Scott objected to me
   writing it; the real goal is the LOCAL model builds it, tuned).

## The incident (2026-08-24, ~10:01) — corrected by Scott's IT expert
- PRIMARY CAUSE: a known Claude Desktop Cloudflare/Turnstile crash bug
  (signature: Turnstile iframe, 403 challenge, GPU `reason:'crashed'`, exit
  `101457950`, build 26200). Reproducible in Anthropic's tracker; crashes even
  with `--disable-gpu`. NOT GPU saturation.
- My errors (owned): (1) claimed GPU saturation was "most likely cause" —
  overconfident, unmeasured, WITHDRAWN. (2) recommended `--disable-gpu` —
  refuted by the repro. (3) said 7 model reloads; actually ~19.
- **WORST: I blanket-killed all `node.exe` on the false claim "nothing else
  spawns node.exe here" — it killed a live MCP server (`./mcp/server.mjs`,
  Codex; it respawned 15:02). No PID/parent/cmdline captured first; timestamps
  didn't even match the sweep.** This is the recurring absence-claim failure,
  this time driving a destructive action. RULE: never kill by image name;
  capture PID+parent+cmdline and match to what I launched; never assert a
  negative without checking.

## Deliverable status
Report v2.3 at `C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report-v2.3.md`
(reconciliation pass done). Scott tracks his own copy as v2.2.1.

## T-C battery (2026-08-24 evening) — COMPLETE
See `tc/REPORT-TC.md` for the full matrix. Headline: small tasks 6/6 at any
window; big tasks stall 4/5 (emission pathology, stochastic breakout);
tc2b half-built the app with working LLM integration before dying at the 32K
window with compaction never firing. Reliable path = decomposition
(canary-sized units). Machine restored: 27B@131K, coder unloaded, no leftovers.
Next: (1) Ralph-decomposed TownReporter build, (2) low-temp tc2b replicate,
(3) investigate headless compaction, (4) spec v2.4 merge of sweep + T-C.
