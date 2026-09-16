# Codex delegation defaults — September 16, 2026

## What changed

The existing global Codex instructions, openai-multi-agent skill, and Ollama worker profile now route implementation and tests to DeepSeek from the start. Local coder and brain requests use a small standard-library Python file client. Native Sol/Terra/Luna remain selective review/escalation options; Astra coordinates and makes difficult decisions. The workload targets are 90%+ cloud/local, 1–5% Astra, and 6–9% other premium work. They are preferences, not a quota-enforced scheduler or demonstrated savings.

No Opus integration, new model download, custom agent loop, background service, or new MCP registration was added. Native OpenAI model selection stays unchanged. The existing Codex CLI provides the cloud worker's file/command/test tools. The local helper produces bounded drafts and reviews, not autonomous file edits.

## How it is used

Scott gives Codex a normal development request. The lead reads the installed global instructions and skill, creates a concise file-based assignment, and operates the workers itself. Scott does not need a terminal. Current agents can use the installed files immediately; new tasks load the updated instructions. Existing tasks that already cached older instructions must reread them.

- Cloud: `python -B C:/Users/scott/.codex/skills/openai-multi-agent/scripts/run_ollama_code_worker.py --cwd <worktree> --prompt-file <brief> --result-file <result> --events-file <events> --stderr-file <stderr> --receipt-file <receipt>`. The launcher reads `ollama-deepseek-code-worker.config.toml`, uses the custom Responses provider at `http://[::1]:11434/v1`, and drives the stock `codex exec` tool loop. It is not a proxy or custom agent loop. Do not use the obsolete `--ignore-user-config --profile ...` combination. Require `"success": true` in the receipt; exit 0 alone is not success. Continue a stopped run with `--resume <SESSION_ID>` and a fresh short brief, not by replaying the coordinator conversation.
- Local: `C:/Users/scott/.codex/skills/openai-multi-agent/scripts/ask_local.py --role brain|coder --prompt-file <brief> --context-file <source> --output-file <answer>`. Context arguments can repeat. Python reads files directly; their full contents need not pass through the lead.
- Brain defaults to `reasoning_effort: high`. Explicit `--reasoning none` is a declared fast path. Coder rejects a reasoning argument and omits the field entirely.
- Brief, result, events, stderr and JSON receipt are saved to files. Read the compact receipt, actual diff and tests; do not replay whole worker transcripts through Astra. A process exit of zero is not sufficient: require `"success": true`, a nonempty authoritative `--output-last-message`, matching stdout `agent_message` when present, actual changes, and test evidence. The launcher rejects prompt/output path collisions before truncating files.
- Below 10% remaining main Codex quota, launch no new premium workers. Missing quota remains unknown. No automatic reset redemption or separately billed fallback.

## Live trial, including failures

The cloud task was real implementation of the local helper and its tests. Two Low-reasoning attempts stopped after inspection without delivering the code. A High continuation created both files and executed ten tests, with one failure. A Luna worker repaired that failure and reviewed error handling before deployment. This is a reviewed, repaired implementation, not an unassisted first-pass success. High is selected for subsequent cloud implementation work on the basis of this limited trial, not as a universal reliability finding.

The resident local coder processed 6,614 prompt tokens and returned 477 output tokens in 12.33 seconds. It reused `halo-coder-q4km`, sent no reasoning setting, and loaded no instance. Its suggested regression test was flawed and was not blindly accepted.

The first brain review used High with an 8,192-token response cap and exhausted the budget without a final answer. The helper returned failure instead of publishing a partial review. A narrower one-function review follows in the final verification record below. The failed broad review is retained as a limitation, not counted as success.

Cloud worker token counts are in `docs/evidence/codex-delegation-2026-09-16/cloud-worker-results.json`. They are Ollama-routed DeepSeek usage, not native OpenAI model usage. Cached input is included within input, not added again. Whole-task Codex savings and the requested workload proportions have not been established by this trial; lead coordination and Luna repairs still consume Codex allowance.

## Sharing and recovery

The helper resolves existing LM Studio instance IDs. It never alters model YAML files, global settings, or context settings. Loading, when needed, requests only the tuned alias key. It does not automatically unload models because another client can reuse them. It reports newly loaded identity for later coordinated cleanup. Both approved instances were already resident in this trial; none needed loading or unloading. DSH and Claude's MCP server were not edited.

Canonical recovery files: `stack/codex-ollama/`. Install its skill overlay into `C:/Users/scott/.codex/skills/openai-multi-agent/`, its profile into `C:/Users/scott/.codex/`, and merge `AGENTS-routing.md` into the existing global AGENTS file. Preserve unrelated access instructions, measurement scripts, credentials, and native model catalog. The research-folder recovery copy mirrors the canonical overlay.

## Final verification

- Root independently executed all **16 focused unit tests** successfully after Luna's repairs. They cover request payloads, reuse/load-without-overrides, load timeout, SSE failures, observed response identity, path collisions, and preservation of existing files on write failure.
- Installed skill/profile files match canonical files byte for byte; the global routing block matches its source. TOML parsing and `git diff --check` passed.
- Focused brain High review: **55.40 s**, 320 prompt tokens, 3,142 completion tokens including 3,053 reasoning tokens. It correctly identified the original partial-write problem. It reused `halo-brain-35b`, with no new instance.
- Final installed-helper coder call: **8.58 s**, 713 prompt tokens, 69 completion tokens, zero reasoning. The API response identified `halo-coder-q4km`; no duplicate was loaded. Its explanation of the repaired rollback was incorrect and contradicted the passing executable regression test. This is live connection evidence, not an accepted code review. Keep this coder on bounded drafts/mechanical work with executable checks; use brain/premium review for judgment.
- Both approved resident instance IDs/configurations match the pre-test snapshot. All tuned halo model YAML hashes and LM Studio global settings hash match the pre-test snapshot. No model was unloaded, no DSH service was restarted, and Claude's helper was left untouched.
- The cloud worker route performs actual repository reads/writes and test commands, but these trials required intervention. Do not claim unattended reliability, first-pass acceptance, or the desired cost/workload proportions. The persistent routing policy caps retries and requires checking artifacts and test results, then revising or escalating the assignment.

Detailed receipts, results, and installation checks are in `docs/evidence/codex-delegation-2026-09-16/`. Raw cloud execution logs remain under `C:/Users/scott/Tools/model-trial/codex-delegation-2026-09-16/`; compact evidence is committed so the result is not only local.

## Launcher repair and acceptance

The bounded launcher was implemented and live-tested after the initial delegation setup. DeepSeek implemented receipt reporting, path-collision rejection, result/event consistency checks, and supported `codex exec resume` continuation. A fresh DeepSeek acceptance worker in an isolated worktree found a real defect: resume mode could report `"success": true` when the observed session id differed from the requested `--resume` id. The master working copy now treats that as failure and includes the acceptance regression test. The final correctness check also found and fixed empty-authoritative-output and mismatched-`agent_message` acceptance defects. The launcher suite passes 17 tests and the combined focused discovery passes 34 tests. See [results and usage](HALO-CODEX-WORKER-REPAIR-2026-09-16.md).

The whole-task usage snapshot for this repair still missed the 80% DeepSeek/local target. Root/coordinator replay and the acceptance coordination consumed more premium tokens than the worker tasks. This is a measured limitation, not evidence that the delegation path is efficient at whole-repair scale. The future pattern is one compact root dispatch, one DeepSeek implementation through tests and docs, and at most one fresh acceptance worker without repeated root source review.
