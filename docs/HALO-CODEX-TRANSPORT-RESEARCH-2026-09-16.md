# Codex / Ollama transport research — September 16, 2026

## Research before changing or retrying inference

Installed: Ollama 0.34.1 (also latest GitHub release at lookup); standalone Codex CLI 0.147.0. Repository baseline: 18ef7662. No LM Studio tuning or service changes are part of this repair.

Primary sources inspected:

- [Ollama Codex CLI documentation](https://docs.ollama.com/integrations/codex): dedicated profile and custom provider at the local `/v1/` endpoint with `wire_api = "responses"`; 64K or larger context recommended. This differs from routing a CLI worker as the authenticated OpenAI desktop provider.
- [Ollama issue 18411](https://github.com/ollama/ollama/issues/18411): merely advertising built-in web search enters a local converter path where reasoning and client tool calls can be emitted in the wrong order. Reporter reproduced incomplete final turns and validated a converter fix with DeepSeek across reasoning settings. [PR 18413](https://github.com/ollama/ollama/pull/18413) remains open/unmerged at lookup. This supports isolating code-only workers from that optional web-search path; it does not prove this defect caused every prior local failure.
- [Ollama issue 18419](https://github.com/ollama/ollama/issues/18419): previous_response_id follow-ups can silently complete empty; explicit full-conversation control works. [PR 18439](https://github.com/ollama/ollama/pull/18439) remains open/unmerged and would reject unsupported stateful input rather than implement a response store. Prefer the standard custom-provider stateless HTTP route; inspect actual behavior instead of assuming stateful replay works.
- [Ollama issue 18284](https://github.com/ollama/ollama/issues/18284): Responses namespace fields are flattened, breaking native nested-agent tools. A code worker should perform its own file/command/test task; coordinator delegation remains in the parent.
- [Official Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) and [schema](https://developers.openai.com/codex/config-schema.json): custom providers, explicit Responses transport, websocket support flag, per-profile model catalogs, skill instructions/catalog budgets, and optional app/plugin/memory features. Validate keys against the installed client because documentation can be newer.

## Existing settings relevant to the failure

The previous worker selected provider `openai`, Ollama's `/api/codex/v1` desktop compatibility router, and a DeepSeek catalog row advertising web search and parallel tool calls. It inherited the user's app/plugin/skill environment. This supplied irrelevant instructions and exposed compatibility paths unnecessary for a bounded coding job.

## Acceptance boundary

Use a fresh worker and an isolated worktree. Give one real helper bug with a clear expected behavior; do not hand it the implementation patch. Accept only an actual diff, executed passing tests, and a finished model reply. Preserve the original full profile as the selectable restoration path. Record failures, requested versus observed identity, and usage separately from whole-task coordinator overhead. A passing task is evidence for this path, not a universal model ranking or a proven 90% subscription saving.

The measured result and accepted operating path are recorded below.

## CLI compatibility findings during setup

These were pre-inference configuration errors, not model failures:

- Standalone Codex 0.147.0 with `--ignore-user-config --profile ...` did not load the named profile and fell back to the OpenAI provider, which rejected the DeepSeek model ID.
- Desktop-bundled 0.154.0-alpha.6.2 without isolation rejected an existing global `computer_use.windows.always_allowed_app_ids` key. The global desktop configuration was not edited to accommodate it.
- Standalone 0.147.0 rejected the current documented `skills.max_context_tokens` key.
- A reduced catalog must preserve required model metadata fields. A one-model copy of the existing row is safer than reconstructing the schema manually.

The accepted invocation, if the real task succeeds, must be reproducible without relying on these unsupported combinations. No model quality conclusion follows from these parsing errors.


## Measured result

The first inference run on the correctly configured custom provider completed in 114.432 seconds. DeepSeek alone changed `_canonical_path` from `abspath` to `realpath`, added the alias-collision regression, ran 17 passing tests, and returned a normal final answer. No premium worker repaired that patch. The coordinator reviewed the diff and reran the 17 tests after integrating it into the main repository; all passed. Windows denied actual symlink creation (WinError 1314), so the regression uses a standard-library mock for alias resolution.

Initial input was 4,926 tokens. Cumulative usage was 518,417 input (455,680 cached) plus 12,068 output = 530,485 tokens. Cached input is part of input, not an additional quantity. This met the small initial-context target but missed the <100,000 cumulative target. There were 28 shell commands and four suite executions; full-file reads, repeated verification, and cache cleanup inflated replay. The first and last prompt sizes were 4,926 and 36,849. The worker's own output and compact receipt are versioned under `stack/codex-ollama/evidence/2026-09-16-worker-transport/`; raw JSONL remains at the path recorded in the receipt.

This establishes one unassisted coding completion through the new route. It does not establish general reliability or the owner's 90%+ workload / low-premium-usage target. Research, configuration repair, and coordination in this already-long task still consume premium usage. Do not report worker-only token figures as whole-task usage.

The subsequent brief now directs bounded workers to read relevant sections, use `python -B`, run only necessary baseline/post-edit checks, and stop after a passing suite and clean diff check. This is grounded in the observed unnecessary operations; its savings have not been separately measured. No additional run was made merely to improve the reported score.

## Whole-task usage snapshot (before final packaging)

Owned per-response usage records, deduplicated by response and thread, show this repair still failed the intended premium/offload proportions:

- Astra root: 5,013,272 total tokens, including 4,859,776 cached input (45 recorded responses).
- Terra transport/configuration worker: 5,846,854 total tokens, including 5,629,696 cached input (50 recorded responses).
- Completed DeepSeek acceptance task: 530,485 total tokens, including 455,680 cached input.
- No local-model calls were made in this repair.

These are a snapshot before final packaging, not final task totals. Premium tokens are approximately 95.3% of the recorded total. Tokens are neither useful-work shares nor bill amounts; cached input is still counted once. Configuration compatibility problems and excessive coordinator/worker turns dominate this task. A fresh initial DeepSeek context alone does not fix the long parent conversation or premium-worker overhead. Therefore the overall low-premium-usage arrangement remains unproven and did not meet its target here. Do not repeat this repair as a model for routine delegation.


## Reusable invocation and recovery

The installed `C:/Users/scott/.codex/skills/openai-multi-agent/scripts/run_ollama_code_worker.py` reads `C:/Users/scott/.codex/ollama-deepseek-code-worker.config.toml` and launches the existing Codex executable with explicit supported overrides and `--ignore-user-config`. It is an argument/file adapter, not a provider proxy or agent loop. It preserves `danger-full-access` and approval policy `never`, accepts a brief from stdin or `--prompt-file`, and captures result, events and stderr paths. It uses the native executable to avoid `.cmd` quoting. The adapter passed compilation and dry-run argument validation; its underlying provider/settings completed the live task before packaging. The packaged adapter itself was not given another live inference task.

Copy the overlay skill files into the installed skill and both profiles plus the one-row model catalog into `~/.codex` for recovery. The original full profile is unchanged. The worker-only profile excludes optional search/app/plugin/memory/subagent surfaces; selecting the full profile restores them with the documented upstream limitations. No DSH, Claude, Ollama server installation, or LM Studio model settings were modified by this repair.
