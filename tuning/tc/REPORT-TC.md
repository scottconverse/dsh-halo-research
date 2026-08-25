# T-C — can the local model build the full TownReporter, unattended?

Running log + results. Started 2026-08-24. Operator away; executing end to end
per instruction.

## Design (from the record, §-cited)

**Question:** the context sweep proved the 27B builds a SMALL app headless at
every window 16K–128K. The 7-hour interactive failure was on the BIG app. T-C
isolates the two remaining suspects — task size vs interactive framing — and
tests the §12.7 computer-in-the-loop leverage on a real build.

| Run | Window | Mode | Cap | Isolates |
|---|---|---|---|---|
| T-C1 | 32K | write-only (like the sweep) | 45m | task-size effect alone |
| T-C2 | 32K | **build → run → self-test → fix loop** | 100m | §12.7 leverage on a real build |
| T-C3 | 128K | write-only | 45m | yesterday's exact window, big task |

**Corrections folded in (the six misses):**
- Brief delivered via **AGENTS.md** (native `agent-instructions` seam, §5.1) — task line stays metachar-free.
- **Slot contention killed by a second resident model** (§13.2/Q34): the app drafts on `unsloth/qwen3-coder-30b-a3b-instruct` @16K while the agent reasons on the 27B. No shared slot.
- **Grading = the §17.3-derived acceptance battery**, 15 deterministic checks matching the brief's contract 1:1.
- Grader **fairness-proven first**: reference implementation scored 15/15 before any model output is graded.
- T-21 descriptor check: N/A (no subagents in these variants).
- Storage Sense: ON on this box; runs use danger-full-access (sandbox not in path), so the #758 trap is not live for these runs. Noted, not changed.
- §17.3 criterion 6 (network-disconnect): NOT run — cutting the NIC would sever the operator session driving this. Recorded as untested, not waived silently.
- Post-crash GPU discipline: 2 model reloads total for all three runs; one monitor chain; kills only by recorded PID (never by image name); Codex processes/files untouched.

## Pre-run findings (already banked)

1. **Grader fairness: 15/15** on the reference app. Cleared to grade.
2. **Coder MoE drafts the article in 8.4 s** where the 27B took 414 s two days
   ago (~49×). Informal but same transcript + same prompt shape — the strongest
   signal yet for §13.2's worker thesis (T-1 will formalize).

## Run log
[16:28:10] tc1 : reloading 27B at ctx=32768 (coder stays resident)
[16:29:01] tc1 : resident = unsloth/qwen3-coder-30b-a3b-instruct@16384 + unsloth/qwen3.8-27b@32768
[16:29:02] tc1 : workspace ready (C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\ws-tc1), port 5151, cap 45m, writeOnly=True
[16:29:02] tc1 : agent launched (pid 7388)
[17:14:02] tc1 : hit 45m cap - killing recorded tree (pid 7388 only)
[17:14:07] tc1 : grading...
[17:14:07] tc1 RESULT: pass=False | wall=45.0m | timedOut=True | RESULT: 0/1 checks passed | peakCtx=0 tools=0 compactions=0 actionRatio=0
[17:14:34] tc2 : resident = unsloth/qwen3-coder-30b-a3b-instruct@16384 + unsloth/qwen3.8-27b@32768
[17:14:34] tc2 : workspace ready (C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\ws-tc2), port 5152, cap 100m, writeOnly=False
[17:14:34] tc2 : agent launched (pid 7384)
[17:41:10] design note: tc2 at T+25 shows the same zero-action reasoning stall as tc1 -> pathology localized to LARGE-SINGLE-ARTIFACT EMISSION. Staged T-C2b (incremental skeleton-then-extend, max ~80 lines/call) to test the fix; tc2 runs to cap untouched for a clean matched cell.
[18:22:21] tc2 : agent exited after 67.8 min (code 1)
[18:22:22] tc2 : grading...
[18:22:22] tc2 RESULT: pass=False | wall=67.8m | timedOut=False | RESULT: 0/1 checks passed | peakCtx=9599 tools=0 compactions=0 actionRatio=0
[18:23:02] tc2b : resident = unsloth/qwen3-coder-30b-a3b-instruct@16384 + unsloth/qwen3.8-27b@32768
[18:23:02] tc2b : workspace ready (C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\ws-tc2b), port 5155, cap 75m, writeOnly=False
[18:23:03] tc2b : agent launched (pid 34636)
[19:24:19] tc2b : agent exited after 61.3 min (code 1)
[19:24:22] tc2b : grading...
[19:24:32] tc2b RESULT: pass=False | wall=61.3m | timedOut=False | RESULT: 5/15 checks passed | peakCtx=32709 tools=24 compactions=0 actionRatio=0.039
[19:25:18] design note: tc2b died at the 32K window (peakCtx 32,709; compaction NEVER fired) with half the app built and working. Launching tc2c = same incremental strategy at 64K + one lean-context line. T-C3 demoted below tc2c: its expected result (stall) is already established by tc1/tc2, while tc2c answers the actionable question.
[19:25:27] tc2c : reloading 27B at ctx=65536 (coder stays resident)
[19:25:55] tc2c : resident = unsloth/qwen3-coder-30b-a3b-instruct@16384 + unsloth/qwen3.8-27b@65536
[19:25:55] tc2c : workspace ready (C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\ws-tc2c), port 5156, cap 75m, writeOnly=False
[19:25:56] tc2c : agent launched (pid 23492)
[20:40:56] tc2c : hit 75m cap - killing recorded tree (pid 23492 only)
[20:41:02] tc2c : grading...
[20:41:03] tc2c RESULT: pass=False | wall=75.0m | timedOut=True | RESULT: 0/1 checks passed | peakCtx=9829 tools=5 compactions=0 actionRatio=0.006
[20:41:35] tc2d : reloading 27B at ctx=32768 (coder stays resident)
[20:42:00] tc2d : resident = unsloth/qwen3-coder-30b-a3b-instruct@16384 + unsloth/qwen3.8-27b@32768
[20:42:00] tc2d : workspace ready (C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\ws-tc2d), port 5157, cap 75m, writeOnly=False
[20:42:00] tc2d : agent launched (pid 4808)
[21:56:57] tc2d : agent exited after 75.0 min (code 1)
[21:56:58] tc2d : grading...
[21:56:59] tc2d RESULT: pass=False | wall=75.0m | timedOut=False | RESULT: 0/1 checks passed | peakCtx=9893 tools=0 compactions=0 actionRatio=0

## FINAL MATRIX (battery complete, 2026-08-24 21:58)

| Run | Window | Strategy | Wall | Tool calls | Outcome |
|---|---|---|---|---|---|
| canary sweep (ref) | 16-128K | small task, one-shot | 4.2-12.4m | 1-2 | **6/6 PASS** |
| T-C1 | 32K | big, write-only | 45m (cap) | **0** | stall — 55K chars pure reasoning |
| T-C2 | 32K | big, test-loop | 67.8m (self-exit 1) | **0** | stall — 23K output tokens, all reasoning (§12.5 at agent scale) |
| **T-C2b** | 32K | big, **incremental ≤80 lines/call** | 61.3m (self-exit 1) | **24** | **HALF-BUILT, 5/15** — server ran, LLM drafting worked (7.5s via coder), died at the window (peakCtx 32,709/32,768); **compaction never fired** |
| T-C2c | 64K | big, incremental | 75m (cap) | 5 | glacial — acted but wrote nothing |
| T-C2d | 32K | big, incremental + 2-file + lean | 75m (cap) | **0** | stall — 87K chars reasoning |

## Conclusions

1. **Task size is the driver of the autonomous-coding failure** — proven by matched
   cells: the same model, window, framing, and harness that go 6/6 on a small task
   go 1-partial-in-5 on the big one.
2. **The stall is a large-single-artifact emission pathology**: the model reasons
   in place of emitting a big first artifact. §12.5's thinking-token exhaustion is
   the mechanism (T-C2 died exactly that way).
3. **Incremental instructions CAN unlock a real build loop** (T-C2b: 24 tool calls,
   act-verify cycles, working LLM integration) — **but the breakout is stochastic**
   (1 clean breakout, 1 glacial, 3 stalls across 5 attempts at temp-1.0 sampling).
   Prompt phrasing changes the odds, not the guarantee.
4. **Two system findings**: (a) compaction did not fire in the headless profile even
   as the session blew through the 0.8 threshold and died at the window — cause
   unisolated, must be investigated before any long headless run is trusted;
   (b) the two-resident-model pattern WORKS: the coder MoE drafted in 7.5-8.4s
   alongside the reasoning 27B, no contention (vs 414s/self-blocking before).
5. **The reliable recipe is structural, not prompt-level: decompose big jobs into
   canary-sized one-shot units** (each unit is in the 6/6 regime). DSH ships the
   mechanism (tool-ralph / workflow). That is T-C's successor experiment.

## Protocol notes (honest)
- T-C3 (big task @128K write-only) was NOT run: T-C1/T-C2 established the stall at
  32K one-shot; tc2c covered a large window; remaining time was spent on the
  actionable ladder (tc2b/c/d). Cell recorded as SKIPPED, reason stated.
- All cells n=1; the stochastic-breakout claim rests on 5 draws of the same class,
  not repeated draws of one cell.
- Temp: DSH default sampling (model thinking mode, temp ~1.0). A low-temperature
  replicate is the cheapest next discriminator.
- §17.3 criterion 6 (network disconnect) untested, as noted at design time.
- Machine restored: 27B@131K resident, coder unloaded, no leftover processes,
  no config changes outside ~/.dsh settings written earlier.
[22:39:25] tc2e : reloading 27B at ctx=32768 (coder stays resident)
[22:39:49] tc2e : resident = unsloth/qwen3-coder-30b-a3b-instruct@16384 + unsloth/qwen3.8-27b@32768
[22:39:50] tc2e : workspace ready (C:\Users\scott\Desktop\Code\dsh-halo-research\tuning\tc\ws-tc2e), port 5158, cap 75m, writeOnly=False
[22:39:50] tc2e : agent launched (pid 30940)
[23:29:33] tc2e : agent exited after 49.7 min (code 1)
[23:29:34] tc2e : grading...
[23:29:49] tc2e RESULT: pass=True | wall=49.7m | timedOut=False | RESULT: 15/15 checks passed | peakCtx=32671 tools=47 compactions=0 actionRatio=0.058
