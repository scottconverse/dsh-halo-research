# Existing-model Windows tuning — September 15, 2026

**Follow-up:** This is the initial deployment record. The later [five-investigation tuning report](WINDOWS-TUNING-FIVE-INVESTIGATIONS-2026-09-15.md) records the current coder microbatch of 2,048 and Q8 cache; the 35B retains microbatch 1,024 and F16. Both now explicitly set Min-P to 0.05. Runtime inspection found that the unchecked field described below as disabled had actually fallen through to a 0.05 default. Initial timings and checks below remain historical.

The approved models remain Qwen3-Coder-30B-A3B Q4_K_M (`halo-coder-q4km`) and Qwen3.6-35B-A3B Q4_K_M (`halo-brain-35b`). No model was downloaded or replaced. LM Studio selected its already installed Vulkan runtime 2.38.0 when the models were reloaded.

## Applied settings

| Setting | Value |
|---|---|
| Loaded context, both models | 131,072 tokens |
| DSH advertised context, both models | 131,072 tokens |
| Logical batch / physical microbatch | 2,048 / 1,024 |
| Parallel slots per model | 1 |
| Flash Attention / GPU offload / GPU KV cache | Enabled |
| KV cache precision | F16, unchanged |
| CPU threads | 12, unchanged |
| Model memory mode | mlock, unchanged |
| Speculative drafting | Disabled, unchanged |
| Compaction threshold / retained verbatim fraction | 0.80 / 0.55 |
| Compaction summary output cap | 8,192 tokens |
| Provider stream idle timeout | 600,000 ms |

The 80% threshold was already the stock default; it is now explicit. At 128K, a 55% retained tail gives approximately 32,768 tokens to summarize into at most 8,192 tokens, retaining approximately 72,090 tokens verbatim. Mission Control reports no configuration refusals. The provider's longer idle timeout accommodates slow long-prompt processing without premature retries. This is not an unlimited task budget.

Coder sampling uses temperature 0.7, top-p 0.8, top-k 20, repetition penalty 1.05. Coder remains non-thinking.

The 35B alias defaults to direct answers: temperature 0.7, top-p 0.8, top-k 20, min-p disabled, presence penalty 1.5, repetition penalty disabled. Its existing Enable Thinking control remains available. Preserve Thinking is now enabled so supplied reasoning history can remain in the template. DSH advertises Off (wire `none`) and High (wire `high`) for the 35B model, with provider default Off. These are the two locally checked modes, not a claim that several graded reasoning budgets were established. LM Studio's API respected `reasoning_effort`; sending `chat_template_kwargs.enable_thinking` did not override this alias in the direct probe.

The DSH persona asks for task-proportional planning and verification, reuse of established facts, and focused tool results. No tool or capability was removed. Model-specific sampling defaults apply unless a caller explicitly supplies its own values.

## Checks actually run

Both models loaded together at 128K with F16 cache. LM Studio's estimates were 24.40 GiB for the coder and 25.42 GiB for the 35B model. A later live Mission Control sample reported 56 GiB dedicated GPU usage, 1.1 GiB shared usage, and 36.5 GiB free OS-visible RAM. These readings fluctuate with other applications.

Small two-turn checks at the same 128K context:

| Model | Initial request, microbatch 512 | Initial request, microbatch 1024 | Follow-up, 512 / 1024 |
|---|---:|---:|---:|
| Coder | 4.400 s | 3.215 s | 0.605 / 0.157 s |
| 35B | 9.435 s | 7.502 s | 3.962 / 3.957 s |

Inputs were approximately 4,000 tokens; both answered the requested warehouse and quantity correctly. This is a single practical comparison, not a statistically controlled speed benchmark. Alias sampling/preservation settings also changed in the candidate, although the check explicitly used temperature zero.

Larger requests succeeded with 33,336 input tokens on the coder and 35,190 on the 35B model, exceeding the old 32K capacity. The coder's completed run reused a prefix from an earlier interrupted request, so its 0.362 s completion is not a cold-prefill measurement. The 35B run completed in 39.094 s. The earlier coder probe hit its test-client 100-second timeout while processing a longer input; it was canceled, and the follow-up used a 240-second limit. Loading at 128K and succeeding beyond 32K do not establish full-window 128K performance or retrieval quality.

A bounded 35B mode probe produced zero hidden reasoning tokens with `none` and 160 with `high`. The probes reached their 160-token output limit; they establish mode control, not completed reasoning-task quality.

All 133 existing Mission Control contract checks passed after updating capacity and reasoning assertions. The installer ran its required checks and promoted the changed Mission Control source. DSH, Wigolo, reference memory, and Mission Control restarted successfully. The dashboard reports both expected resident models at 128K, no brain profile mismatch, and no settings refusals.

## Use and recovery

Use the existing **DSH + Wigolo** desktop shortcut. Both the launcher and Mission Control's approved-model load actions now request 128K. The default model remains the coder. Select the 35B model for planning or vision; use Off for direct answers and High when thinking is warranted. Existing completed session projections may still show their historical 32K readings until new work produces a fresh capacity projection.

Canonical aliases are under `stack/lmstudio-models/halo/`; deployed aliases are under `%USERPROFILE%/.lmstudio/hub/models/halo/`. DSH settings and the local preset have matching canonical and `%USERPROFILE%/.dsh-stock` copies.

Pre-change files are preserved in `C:\Users\scott\Desktop\Halo Stack Research\Tuning Backups\20260915-113351`, with `restore-map.json` identifying their original paths. Restore the matching aliases, DSH settings, local preset, launcher, and Mission Control source/installed version together before reloading models; restoring only DSH's advertised capacity would create a mismatch. The current recovery copies and SHA-256 manifest are under `Halo Stack Research\Current Halo Configuration`.

This tuning uses the existing models and installed runtime; no new model or runtime package was installed.
