# Local-change review and publication - October 19, 2026

## Published scope

Reviewed the remaining uncommitted DSH Halo files directly, without subagents or inference jobs. Replaced the stale root README with the current Web 0.2.1-alpha.2 setup, separate Desktop/profile boundary, DeepSeek 1017 cloud default with effort Off, retained local/account providers and research integrations, actual shortcut names, current Mission Control behavior, and explicit installed-session limitations. Removed the obsolete two-local-model startup/default claim. Current reports are linked; older settings and dated evidence are not presented as current installation instructions.

Included the existing two-line worker-launcher change that assigns a UUID invocation ID to each receipt, plus its regression. A resumed session can be shared across distinct invocations; a session ID is not an invocation identity. This repository change was not deployed over the installed helper and does not establish correct aggregate accounting by itself.

Included the corrected September 16 accounting report. Read the retained finalizer receipt: success/completed true, input 1,186,907 and output 44,365, total 1,231,272. The historical root total was not recomputed. The report retains the distinction between provisional recorded totals, completed receipts and useful-work/billing claims.

Published the September build reference and October 1 consolidated archive report as explicitly historical documents. Their old versions/defaults and old benchmark observations are not current recommendations or new tests. Local evidence links are provenance pointers, not files uploaded to GitHub. Fixed the historical plugin inventory's literal escaped line endings and labeled it a September 19 snapshot.

Included the pairing workflow/handoff and optional worker instructions, correcting obsolete model/default assumptions and adding explicit owner precedence. These are opt-in workflows, not permission to spawn agents for generic coding work or impose ratio targets, extra reviewers, repeated checks or repeat approval questions. No workflow was invoked for this review.

## Intentionally kept local

- `report_offload_usage.py` and its test: unpublished accounting prototype. Completed receipts and partial checkpoints are deduplicated in separate sets and then added together, so overlapping evidence can count the same invocation twice. Its independent external analyzer dependency and historical accounting targets are not a completed release feature. The accounting report now explicitly says not to rely on this prototype. This review did not rebuild it.
- Personal `scotts-local-voice-2` / `scotts-voice-v8-2` skill copies.
- Private `work/`, recovery `.bak` files and runtime-patch backup originals.

Added narrow ignore rules for these categories. The files are retained on disk; originals of edited drafts are backed up privately under `C:\Users\scott\Documents\Codex\2026-10-19\repo-publication-review`. No raw conversation logs, credentials, evidence dumps or private voice content are included.

## Actual checks and limits

The affected mock-based launcher suite initially ran 18 tests with three failures: hardcoded model/endpoint expectations no longer matched the checked-in worker profile. Updated those assertions to verify the profile-selected values independently through TOML parsing. Reran that same affected suite: all 18 passed in 0.112 seconds. No worker, cloud request or local inference was launched.

Screened the 12 candidate files for common literal credential formats and token-bearing URLs: no findings. Checked root README local link targets: none missing. `git diff --check` passed. These scoped checks are not a blanket security audit or a fresh verification of all historical claims. No deployment, service restart, provider/default change or model loading/unloading occurred.

Delegated and DSH generation usage for this task: zero. Coordinator token totals are unavailable from these task tools; none are invented. Publication consists of the scoped repository commit on master. The earlier v0.3.1 release tag is not moved or replaced.
