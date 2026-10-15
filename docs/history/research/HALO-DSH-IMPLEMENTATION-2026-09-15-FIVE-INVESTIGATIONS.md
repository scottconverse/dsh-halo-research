> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Windows tuning: five investigations — September 15, 2026

This follows the initial [128K configuration change](HALO-DSH-IMPLEMENTATION-2026-09-15-128K-TUNING.md). The installed models and LM Studio Vulkan runtime 2.38.0 were retained. No DSH package, research integration, model weights, or available tool was removed or replaced.

## Selected settings

| Setting | Coder: Qwen3-Coder-30B-A3B Q4_K_M | Planner: Qwen3.6-35B-A3B Q4_K_M |
|---|---|---|
| Context / parallel slots | 131,072 / 1 | 131,072 / 1 |
| Logical batch / microbatch | 2,048 / **2,048** | 2,048 / 1,024 |
| Key and value cache | **Q8_0** | F16 |
| CPU threads | 12 | 12 |
| Temperature / top-p / top-k | 0.7 / 0.8 / 20 | 0.7 / 0.8 / 20 |
| Min-P | **Explicit 0.05** | **Explicit 0.05** |
| Repetition / presence penalty | 1.05 / 0 | 1 / 1.5 |
| Thinking | Non-thinking | Off by default; High remains selectable |

Flash Attention, full GPU offload, GPU KV cache, mlock, the 128K DSH capacity settings, and existing compaction settings remain in place. The coder remains the default. No new runtime or model download was needed.

Explicit Q8 key/value settings take precedence over the retained legacy `useFp16ForKVCache` field; the actual backend process arguments were checked. These changes are in the canonical aliases and the matching installed LM Studio aliases.

## 1. Conversation and reasoning cache reuse

Two fresh DSH sessions read files, edited a retry function, and used PowerShell. The coder's initial request processed approximately 21,157 tokens; four subsequent tool steps processed only 120, 108, 53 and 46 new tokens, despite total requests growing past 21K. The 35B model in High mode initially processed 19,509 tokens, then only 210, 55 and 42 new tokens on its tool follow-ups.

The 35B session log retained reasoning blocks with `thinkingSignature: reasoning_content`, and the installed pi-ai client replays that field. The observed incremental processing confirms that reasoning/tool history did not cause wholesale prefix reprocessing in these sessions. No client patch or cache workaround was needed.

Changing to an unrelated prompt after a large request can still be slow. For example, a short coder request following the 44K Q8 run took about 50 seconds including the transition. This is distinct from the well-performing cache reuse within a continuing conversation. This investigation did not eliminate that transition cost.

The coder's first retry-task check calculated the formula in PowerShell instead of executing the edited JavaScript; the 35B High session executed the actual module. The later acceptance tasks explicitly required running the supplied implementation tests.

## 2. Batch size

Each short comparison used real launcher/process-management source, a new prefix for each cold request, and a follow-up question. There were two cold repetitions per setting, with a runtime warm-up after each reload. These are practical comparisons, not statistically established universal speedups.

| Model | Microbatch | Logical batch | Mean prompt tokens/sec |
|---|---:|---:|---:|
| Coder | 1,024 | 2,048 | 1,078 |
| Coder | 2,048 | 2,048 | 1,147 |
| Coder | 2,048 | 4,096 | 1,153 |
| 35B | 1,024 | 2,048 | 730 |
| 35B | 2,048 | 2,048 | 662 |
| 35B | 2,048 | 4,096 | 660 |

Keep microbatch 2,048 for the coder: approximately 6% better prompt throughput in this comparison. Keep the 35B at 1,024; increasing it was approximately 9% slower. The 4,096 logical batch did not justify a change. Output lengths varied, so elapsed response time is not interchangeable with normalized prompt-processing speed.

## 3. Q8 versus F16 conversation cache

Both key and value cache types were verified in the actual llama-server process arguments. This changes conversation-cache precision, not the Q4 model weights.

| Model and input | F16 elapsed | Q8 elapsed | Full answer correct? |
|---|---:|---:|---|
| Coder, approximately 43,830 input tokens | 275.5 s | 107.5 s | No, with either cache |
| 35B, approximately 46,545 input tokens | 62.2 s | 62.9 s | No, with either cache |

The large fixture interspersed three proposed retry functions through actual project source. The required answer was candidate B with delays `[100, 200, 500]`. Both coder runs selected A and returned `[100, 200, 3200]`. Both 35B runs selected A but returned the correct delay values. The score required both the correct candidate and values, so **all four runs failed**. The 2.56x coder timing improvement is a processing improvement, not a speedup in obtaining a correct solution.

Initial unpaired coding trials made Q8 look worse, but the outputs were stochastic and the baseline was inconsistent too. The difficult event-selection task was therefore repeated with identical prompts and seeds 42, 43 and 44:

| Coder configuration | Runs passing every event edge case |
|---|---:|
| F16, microbatch 1,024 | 1 / 3 |
| F16, microbatch 2,048 | 1 / 3 |
| Q8, microbatch 2,048 | 2 / 3 |

This small comparison does not show that Q8 improves intelligence. It does not support blaming all earlier failures on Q8 either. Keep Q8 for the coder's substantial measured processing benefit and the successful real DSH acceptance below. Keep F16 for the 35B: Q8 passed its three small coding tasks but did not improve the large-input timing.

## 4. CPU threads

Tested actual backend thread pools at 8, 12 and 16 threads. A prediction-level thread field initially left the backend at 12; those first purported coder 8/16 runs are marked invalid as thread comparisons in the evidence. They were repeated using a verified load-time argument override. Neither temporary override was promoted.

Mean coder prompt throughput was approximately 1,057 / 1,078 / 1,084 tokens/sec at 8 / 12 / 16 threads. The 35B results were approximately 746 / 730 / 747. These small differences did not establish a useful end-to-end advantage. Keep 12 for both. No process priority or Windows power setting was changed.

## 5. Sampling and thinking

The coding tasks covered interval merging without mutation, revision/deletion/tie handling, and weighted interval scheduling. Generated code was executed against fixed expected results, including a brute-force oracle for small scheduling instances. Errors were retained, not edited away. There were 36 coding generations across all investigated variants, including the paired event-task repeats; 24 passed their full task checks. This total describes the experiment, not the success rate of the selected production settings.

- The coder's initial current-sampling trial passed 3/3 tasks. Removing repetition penalty passed 2/3. Lowering temperature to 0.2 did not fix the event-task failure in the Q8 trial. Keep temperature 0.7 and repetition penalty 1.05.
- The 35B's current presence penalty 1.5 with thinking Off passed 3/3. Removing the presence penalty passed 2/3 with the same prompts and seed. Keep 1.5.
- High thinking passed the merge task but took 42.7 seconds versus 4.5 seconds with Off. The other two High trials exhausted the test's 4,096-token allowance entirely on reasoning before emitting code. Off passed all three. Production DSH still allows 8,192 output tokens; these results do not prove the High trials could never finish with a larger allowance. They support retaining Off as the routine default.
- Backend sampling inspection revealed that the previous unchecked Min-P alias field left the runtime using 0.05, despite the earlier record describing Min-P as disabled. Explicit zero was tested without a demonstrated benefit. Both aliases now explicitly pin **0.05**, preserving the effective value rather than relying on an implicit runtime default.

## Final DSH acceptance

After applying the selected aliases, each model received a fresh DSH task to repair an event-selection module, read the supplied requirements and tests, and execute `node events.test.mjs`. Neither model received corrective assistance. Both sessions completed, both implementations passed all eight event cases and input-nonmutation checks, and independent reruns exited 0. The supplied tests were unchanged (SHA256 `3be2afeef2b619b0d451469b9def7f5ef57b3d8f0b4a53ddf680d8321f43d46f`).

| Model | DSH session | Result |
|---|---|---|
| Coder, Q8 / microbatch 2,048 | `session-ff92e9c8-39c1-4e2a-b267-fe98e881ebdf` | Completed; all eight cases passed |
| 35B, F16 / microbatch 1,024, Off | `session-a74fcb19-7825-4bc8-8bb2-29cb7effc264` | Completed; all eight cases passed |

These acceptance sessions overlapped briefly, so their elapsed times are not a controlled performance comparison. They establish that the selected settings can complete these coding workflows through DSH; they do not establish general correctness. The coder was restored as the default model afterward.

## Scope and evidence limits

128K remains available on both models. Loading that capacity is not proof of accurate reasoning over a full 128K input. The failed 44–47K comparison is an unresolved model/workload limitation; this tuning does not claim to fix it. Likewise, three small coding tasks and three seeded repeats are not a broad model-quality benchmark.

Raw scripts, responses, timings and session evidence are retained locally in `C:\Users\scott\Documents\Codex\2026-09-10\gi\work\tuning-five`. A compact machine-readable record accompanies this document under `docs/evidence/windows-tuning-five-2026-09-15.json`.

Pre-change canonical and live model definitions are preserved in `C:\Users\scott\Desktop\Halo Stack Research\Tuning Backups\20260915-five-investigations-123822`, with `restore-map.json`. To roll back, restore those matching model definitions and reload the two approved model identifiers. The DSH settings, launcher, Mission Control implementation, model weights and research provider did not require changes for this follow-up.
