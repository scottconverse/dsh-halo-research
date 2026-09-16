# Codex worker repair — September 16, 2026

## Result

The packaged `run_ollama_code_worker.py` repair is complete. DeepSeek owned implementation, the acceptance defect fix, the final correctness repair, and the focused test run. No premium repair worker was used.

The live packaged launcher acceptance before the last correction succeeded at `C:/Users/scott/Tools/model-trial/codex-offload-80-2026-09-16/acceptance-run/` and found a real resume-session truthfulness defect: the launcher could report success when the observed session ID differed from the requested `--resume` ID. That case now fails closed.

The final correctness check found two additional acceptance defects in the pre-fix code:

- A nonempty stdout `agent_message` could pass when `--output-last-message` was empty. This could accept commentary or an earlier status message as the final answer.
- A nonempty but mismatched `agent_message` could pass alongside different `--output-last-message` content.

The final contract makes the nonempty `--output-last-message` file authoritative. Empty authoritative output fails even if stdout contains an `agent_message`; nonempty stdout text must match the authoritative file after trailing CR/LF normalization. Existing resume-session mismatch behavior remains fail-closed.

## Verification

DeepSeek ran the focused combined discovery once from `stack/codex-ollama/skill/scripts`:

```text
python -B -m unittest discover -s . -p "test_*.py" -v
Ran 34 tests ... OK
```

This is 17 launcher tests plus the existing 17 `ask_local.py` tests. The launcher regressions include:

- `test_nonempty_agent_message_cannot_replace_empty_output_last_message`
- `test_agent_message_mismatch_with_output_last_message_fails`
- the existing resume-ID mismatch regression

`git diff --check` returned exit 0 with only CRLF conversion warnings. The final repair used mocked child output and made no additional cloud inference calls.

The earlier live acceptance receipt is `C:/Users/scott/Tools/model-trial/codex-offload-80-2026-09-16/acceptance-run/receipt.json`; its result is in `result.md`. It records `success: true`, the DeepSeek model/provider, and the receipt fields from the pre-correction launcher.

## Usage accounting

Worker totals are counted once per worker from `worker-checkpoint-usage.json`; cumulative snapshots are not added repeatedly:

- stopped owner: **8,481,562** total tokens
- implementation: **1,935,971** total tokens
- live acceptance: **827,034** total tokens
- finalizer/correctness repair: **203,788** total tokens
- DeepSeek/local total: **11,448,355** total tokens

The finalizer total is the latest `token_count` `total_token_usage` in session `01a0abc9-e8f8-7ae2-89ab-8c1a52c3dcdb`.

Using `measure_usage.py collect([exact root log])` and filtering the latest root turn `01a0ab94-2e64-7e20-80cc-d35a03b61e4e`, the root per-response total is **7,856,436** tokens, including **7,575,168** cached input. The previous handoff snapshot was 6.913M root and 11.245M DeepSeek; the finalizer changes the measured totals but does not change the conclusion.

Raw-token share is approximately **59.3%** for the DeepSeek/local workers (**11.448M** of **19.305M** recorded in these two accounting streams). It remains **below the 80% target**. This is a raw-token share, not a useful-work measurement, bill, or proof that the target was achieved.

The root still consumes roughly **130k cached input tokens per wakeup**. Progress polling should be batched in tools, using `notify()` in the primary orchestrator, instead of waking the root for each minute. The root follow-up pattern now does that.

## Installed and recovery copies

Canonical source: `C:/Users/scott/Desktop/Code/dsh-halo-research/stack/codex-ollama`.

The final synchronization copies the launcher and its test, skill, and reference into the installed openai-multi-agent skill and the canonical `~/.codex` profile/catalog locations, preserving the original full profile. The same docs are mirrored into `C:/Users/scott/Desktop/Halo Stack Research` and its `Current Halo Configuration` copies, and the canonical `codex-ollama` tree is mirrored into `Current Halo Configuration/codex-ollama` excluding caches. The Current Halo Configuration manifest is updated for copied files only.

## Limitations

- The final empty/mismatch contract is covered by passing mocked regressions; no additional live cloud call was made for it.
- The single successful live acceptance pair does not establish general reliability or first-pass autonomy.
- The 80% target remains unmet on the measured raw tokens. Future work should preserve the separation between raw-token share and useful-work value.
