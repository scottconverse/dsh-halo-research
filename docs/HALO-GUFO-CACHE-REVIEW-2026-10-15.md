# Installed Gufo cache review — October 15, 2026

## Outcome
No cache defect was confirmed in the existing installed-build logs. No repair or runtime/configuration change was made. Models, picker entries, defaults, launchers, cache options and loaded-model state were not changed by this task. No inference request, benchmark, restart, model load/unload, binary execution or new cache trial was performed.

The inspected installation remains the recorded pixmaate Windows release windows-2026-10-03. Its Q6 and recommended Q4/DFlash2 logs show successful memory-cache reuse. Community reports about other builds are not evidence this installation needs their source patches or cache flags.

## Sources and method
The two authoritative log snapshots were:
- Existing Q6 run: `C:\Users\scott\Documents\Codex\2026-10-15\gufo-install\gufo.stderr.log`, 135lines, 09:43:50–10:37:04 local time.
- Q4/DFlash2 launcher log: `C:\Users\scott\AppData\Local\Gufo\stderr.log`, 374lines at snapshot, 10:38:00–13:26:05 local time.

Times are October15 America/Denver as emitted by the existing logger. Historical copies under gufo-recommended were not counted as additional experiments. Snapshots and SHA-256 were preserved under `C:\Users\scott\Documents\Codex\2026-10-15\gufo-cache-review`. Parsed metadata and the analyzer are adjacent in the repository evidence folder. No prompts or answer text are included in that metadata.

The analyzer reads all lines, selects completed generation requests and separately identifies the small title-like requests. Main requests in these saved jobs have more than1000prompt tokens; the classification is specific to this data, not a general Gufo rule. Request identities/timings correspond to the previously documented library and coding jobs.

## Measured observations
| Existing run | Main requests | Memory-cache hits | Cached fraction on cache-hit requests | Longest main prompt |
| --- | ---: | ---: | ---: | ---: |
| Q6 library jobs |5|3|92.26%|20,113tokens|
| Q4 library/coding jobs |10|8|96.57%|11,390tokens|

Each configuration's two first main requests began separate jobs with a new prompt. The small title-generation requests are unrelated prompts, so their misses are not evidence of broken reuse. Q6 has one title-like request; Q4 has two.

For transparency, across ALL main requests including cold starts, Q6 reused42,419of70,991prompt tokens (59.75%); Q4 reused78,014of97,133 (80.32%). Those are aggregate input-reuse ratios, not the probability a request hits, billing savings, generation speed or a new token expense caused by this review.

The final Q4 coding request reused11,214of11,390prompt tokens:98.45%, leaving176to prefill. Three earlier coding requests each needed only58new prefill tokens. Their time to first token was approximately459–463ms. This is direct evidence the existing engine is not reprocessing the whole conversation on every step.

Q4 completed-generation RSS rose to approximately2042MiB, stayed around2040–2042during the coding sequence, and later GET records show1236MiB. Q6 completed-request RSS peaked at534MiB and later reached166MiB. RSS is the process resident working set; it does NOT represent total GPU/shared allocations, total committed memory or a measured snapshot-pool budget. Windows working-set trimming can reduce RSS without releasing every allocation. No conclusion of leak-free behavior at arbitrary context is made.

The largest logged cache_snapshot_bytes values were2,774,159,364forQ6 and1,969,057,884forQ4. This per-request snapshot-size field must not be interpreted as an aggregate RAM cache budget or proof all snapshots are retained simultaneously.

No byte_capacity, skipped-snapshot or eviction warning was present in these snapshots. No Q4 warning/error entry was found. Q6 contains oneHTTP400bad_request with blank method/path at09:54:41; it is not a generation-cache error. Other completed model requests in the reviewed record returned200.

## What this does and does not establish
- Confirmed: memory-cache reuse works on the saved short/medium-context jobs; repeated full-prefill failure is not present in these records.
- Not confirmed: the20–30GB snapshot-growth behavior from the Reddit report, zero-free-memory detection, a too-small snapshot budget, or a preserve-thinking mismatch. The saved jobs used thinking off.
- Unverified: sustained128K workloads, cache eviction across many independent conversations, disk persistence across restart, exact configured RAM snapshot capacity, and present total system/GPU memory. The log says disk_cache=off; that is a configuration choice, not a defect.
- The canonical Start-Gufo.ps1 does not specify a RAM cache cap. Absence of a cap is not itself evidence of failure, and no unverified CLI option or hypothetical optimization was added.

## Decision
Leave the working deployment alone. If an existing future job shows cache_snapshot skips, repeated cold continuation or excessive retained memory, that new evidence can justify a narrow fix. This task did not manufacture such a workload to extend verification.

## Records
[Parsed request/cache evidence](evidence/gufo-cache-review-2026-10-15/cache-evidence.json) and [analyzer used](evidence/gufo-cache-review-2026-10-15/analyze.py). The analyzer is machine-specific and reads saved logs; it is not an inference test or portable benchmark. Local source snapshots preserve exactly the bytes hashed in the evidence.

