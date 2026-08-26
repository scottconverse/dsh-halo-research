# Gateway build ledger — conductor: Fable, code: DSH local models only

Mode: local-most. Fable plans/briefs/audits/ships; DSH worker lane (coder-30b,
Code Mode, 32K) writes 100% of product code behind Gate-Build; tests are the
only definition of done (Check-Done). Every Fable-authored product-code line
is a logged exception (target: 0).

Note: effort-sizing battery VOIDED on a conductor-harness defect (sessions ran
without cd into their per-run workspace - launcher-trap class). Trusted column
only: reasoning tokens (off=0, low/med/xhigh 12-16K). Medium stands as cockpit
default on prior evidence. No rerun - building instead.

[08-25 10:29:12] === batch A start: 4 units, repo=C:\Users\scott\Desktop\Code\halo-research-gateway ===
[08-25 10:52:23] unit A-scaffold: GREEN in 3 round(s), 23.2 min - committed
[08-25 11:59:09] unit B1-config-logging: RED after 3 round(s), 66.8 min - left uncommitted for triage
[08-25 11:59:09] unit B1-config-logging is foundational - stopping batch
[08-25 11:59:09] === batch A end: 1 green, 1 red ===
[08-25 12:00:41] === batch A2 start: 3 units, repo=C:\Users\scott\Desktop\Code\halo-research-gateway ===
[08-25 12:33:22] unit B1-retry: GREEN in 2 round(s), 32.7 min - committed
[08-25 13:37:29] unit B2-cache: RED after 3 round(s), 64.1 min - left uncommitted for triage
[08-25 14:27:24] unit B5-reddit-parser: RED after 3 round(s), 49.9 min - left uncommitted for triage
[08-25 14:27:24] === batch A2 end: 1 green, 2 red ===
[08-25 14:29:33] === batch A3 start: 3 units, repo=C:\Users\scott\Desktop\Code\halo-research-gateway ===
[08-25 15:08:25] unit B2-retry: RED after 3 round(s), 38.9 min - left uncommitted for triage
[08-25 16:20:41] unit B5-retry: RED after 3 round(s), 72.3 min - left uncommitted for triage
[08-25 17:12:16] unit B3-security: RED after 3 round(s), 51.6 min - left uncommitted for triage
[08-25 17:12:16] === batch A3 end: 0 green, 3 red ===
[08-25 17:14:27] === batch A4 start: 3 units, repo=C:\Users\scott\Desktop\Code\halo-research-gateway ===
[08-25 19:54:52] === batch A5 start: 3 units, repo=C:\Users\scott\Desktop\Code\halo-research-gateway ===
[08-25 19:55:00] batch A4 post-mortem: background task died at compaction (~17:17, during B2-v3 round 2). B3-v2 and B5-cockpit never ran.
[08-25 19:55:00] B2-v3 leftover audit: pytest 6/6 green BUT cache.py is a 37-line stub (eviction = comment). Hollow pass - NOT committed. Cause: v3 brief said 'keep everything else' against an already-reverted tree.
[08-25 19:55:00] reds\ is empty - A3 red work was wiped by the pre-preservation runner. Fuller B2 implementation lost; rebuilt via self-contained v4 brief.
[08-25 19:55:00] gate hardened: verify-pytest now enforces UNIT_REQUIRED (named test functions must be collected). Proven fail-closed against the stub tree.
[08-25 20:49:33] unit B2-v4: RED after 3 round(s), 54.7 min - preserving work for forensics, then reverting repo
[08-25 21:02:26] unit B3-v2: GREEN in 2 round(s), 12.9 min - committed
[08-25 21:15:00] A5 post-mortem: TaskStop + cmdline sweep did NOT kill the batch (blind spot); it ran on. B2-v4 RED 3r/54.7m (forensics preserved -> salvaged as v5 seed). B3-v2 GREEN/committed but HOLLOW: fails 9/11 gate-authored tests (classify_ip crashes on IPv6). B5-cockpit killed in round 1 by process-tree kill; death verified by 90s state-change watch.
[08-25 21:15:00] Dry-run harness test-harness.ps1: 9/9 PASS (verifier fail-closed x3, pass-open, green commit, red forensics+revert, exit codes) - zero inference, ~90s.
[08-25 21:15:00] A6 staged test-first (B2-v5 seeded from forensics, B3-v3 vs frozen tests, 12-min caps). NOT launched - operator pause. Ledger col9 (tests_by) applies to rows written by the updated runner.
[08-25 22:18:37] === batch A6 start: 2 units, repo=C:\Users\scott\Desktop\Code\halo-research-gateway ===
[08-25 22:42:52] unit B2-v5: RED after 2 round(s), 24.3 min - preserving work for forensics, then reverting repo
[08-25 23:03:25] unit B3-v3: RED after 2 round(s), 20.5 min - preserving work for forensics, then reverting repo
[08-25 23:03:25] === batch A6 end: 0 green, 2 red ===
[08-25 23:05:42] === batch A7 start: 2 units, repo=C:\Users\scott\Desktop\Code\halo-research-gateway ===
[08-25 23:25:00] ROOT CAUSE: Run-Verdict 2>&1 never captured Write-Host output -> GATE-FEEDBACK.md was EMPTY all day; all retry rounds ran blind. Fixed (*>&1), proven by harness T4b (11/11). A7 launched: B2-v6 + B3-v4, seeded from A6 forensics, fixed gate live (tripwire + ENV now armed with real text).
