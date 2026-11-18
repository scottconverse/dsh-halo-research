# Strata paired startup verification

| Test | Observed outcome |
| --- | --- |
| Previous real 20 versus 24 GiB Halo engine-cap comparison | Both crossed the 480-second startup deadline during cache fill. The server stayed at 20 GiB. Engine resident memory peaked at 10.97 and 17.77 GiB respectively. Starting physical RAM differed by 0.63 GiB and commit by 0.90 GiB. Windows file-cache contents were uncontrolled. |
| Previous real Windows prefetch comparison | A run that read 20.39 GiB from disk reached readiness in 122.3 seconds including prefetch. A warm repeat reached readiness in 41.4 seconds and returned `42`. Prefetch covered 20.31 GiB of ranked expert ranges. GPU fill was 9.4 seconds in the prefetch comparison. |
| Previous installed-profile check with real Halo inference | The capped Web request returned `42` in 50.415 seconds from request to completion. Desktop reused the same endpoint and returned `42` in 2.522 seconds. The engine filled 10,701 of 10,701 slots in 9.5 seconds. Both 20 GiB hard caps were verified. The owned engine and listener were cleaned up. The 5070 Ti was untouched in this test. |
| Previous installed-profile checks with mocks | Web and Desktop each selected both expected leads and sent lead and worker requests to different local mocks. The native delegation fixture requested parent delivery. The earlier full-memory real preflight refused to launch at the 56 GiB free-commit guard. |
| Source release verification, models unloaded | Copied Web and Desktop profiles staged, installed in the fixture, and rolled back byte-identically. Four native adapter/delegation cases passed on Node 24.21.0, including startup failure gating and separate lead and worker requests. The packaged supervisor passed a real read-only 5070 Ti preflight over SSH. |

The installed-profile prompt was `/no_think` followed by a newline and `Reply with only the number 42.` The 50.415-second time includes launcher startup and the first completion. It is a warm-cache observation. The integrated prefetch took 1.173 seconds and host disk-read counters rose by about 0.005 GiB in that step. The 2.522-second Desktop observation uses the already-running backend. Neither timing is a throughput benchmark. The test teardown and original settings-hash comparison passed.

The real inference measurements above are from the November 17, 2026 lab run (November 18 UTC), before the source overlay was packaged. This release's checks establish profile rendering, restoration, native tool and provider routing against mocks, and live worker prerequisite checks. Full-memory unattended inference and an attended or unattended remote model run were outside this release's model-free verification.

[Machine-readable evidence and private receipt fingerprints](verification.json)
