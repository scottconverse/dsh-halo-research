# Same-instance brain reasoning comparison — September 16, 2026

The clean comparison supports thinking High for this log-audit task: **6/6 fully correct with High versus 2/6 with Off**, using the same tuned Qwen3.6 35B A3B Q4_K_M instance. This isolates reasoning mode from the different model configurations in the earlier three-arm comparison.

| Mode | All three answers correct | Median completed response | Range | Reasoning tokens per response |
|---|---:|---:|---:|---:|
| Off (`reasoning_effort: "none"`) | 2/6 | 1.6405 s | 1.638–1.673 s | 0 |
| High (`reasoning_effort: "high"`) | 6/6 | 33.8005 s | 26.397–41.307 s | 1,488–2,255 |

The correct answers are ERRORS=5, CHROME=2, FIRST=10:10:26. Off undercounted total errors as four in four runs; both modes always got the other two answers right. Every measured response completed normally with `finish_reason: stop`; none reached the 8,192-token allowance. Exact three-line formatting also passed in all otherwise-correct responses.

## Individual paired results

| Seed | Off error count | Off seconds | High error count | High seconds |
|---|---:|---:|---:|---:|
| 42 | 5 | 1.640 | 5 | 26.397 |
| 43 | 4 | 1.641 | 5 | 33.855 |
| 44 | 4 | 1.638 | 5 | 33.746 |
| 45 | 5 | 1.655 | 5 | 41.307 |
| 46 | 4 | 1.639 | 5 | 31.338 |
| 47 | 4 | 1.673 | 5 | 35.098 |

## Method for Claude to compare

- Fresh model load, with no models resident before the trial. Earlier interrupted attempts are excluded.
- Alias: `halo/qwen3.6-35b-a3b`; trial identifier: `halo-brain-reasoning-trial-20260916`. Saved tuned settings were retained; loaded context was 131,072 and parallelism was 1.
- Direct LM Studio requests to `http://127.0.0.1:1234/v1/chat/completions`. This tested the model used by DSH, not an end-to-end DSH agent session.
- Exact `PROMPTS['t1']` and answer key from Claude's `C:\Users\scott\Tools\model-trial\run_trial.py`, using `inputs\t1_log.txt`. The answer key was independently checked with code before scoring and never supplied to the model.
- One unscored warmup per mode, seed 100. Then six paired seeds 42–47. Order alternated Off/High, High/Off across pairs. Each request contained the same single user message, with no accumulated chat history, tools, assistance or corrective feedback.
- Explicit sampling: temperature 0.7, top_p 0.8, top_k 20, min_p 0.05, presence_penalty 1.5, frequency_penalty 0, repeat_penalty 1.0; max_tokens 8192; streaming enabled with usage reporting. Within each seed pair, only reasoning_effort changed.
- Reported reasoning-token counts confirm that Off and High actually behaved differently. Rendered prompt usage was 17,757 tokens for Off and 17,755 for High despite identical user text.
- Timings cover the entire request through completed response. These are repeated-prompt timings after warmup, **not cold-prefill measurements**. No cache flush was performed between calls. The unscored Off warmup took 19.231 seconds and High warmup took 37.354 seconds; neither enters the results above.

Prompt SHA-256: `d84368a31fcfbd25ddaf8c6cee91ff02c90e51917270e4b3f7893e3bce1f52eb`.

Fixture SHA-256: `f6498223679b70776d4b74c2db880e2387509efded629c8b987080efa2808d8b`.

Saved model alias SHA-256 before and after: `4454832b0e8907fa9f6256e5a0875a37e2ef0695db6c1ad43cffd466d4955f2c`.

## Interpretation and cleanup

High fixed the observed counting failure in these six trials, at approximately 32 seconds of additional median latency. That supports using High for this kind of careful audit. It does not establish universal reliability from one fixture and six seeds, or justify changing every default. For exact mechanical counts, a script remains preferable when tools are available.

No model configuration was changed. The trial model was unloaded successfully after completion and `lms ps --json` returned an empty list. DSH was not launched for this comparison.

Local raw evidence and harness snapshots: `C:\Users\scott\Tools\model-trial\codex-reasoning-clean-20260916-105136`.

Runnable local harness, dependent on Claude's adjacent fixture files: `C:\Users\scott\Tools\model-trial\codex-reasoning-comparison-20260916.py`. The `runner.py` inside the evidence directory is an archival snapshot, not a standalone runnable bundle.

Repository evidence: `docs/evidence/brain-reasoning-2026-09-16/results.json`. This contains request settings, scores, final answers, timing, token counts and load/cleanup evidence. Raw private log contents and generated reasoning text are retained locally rather than published.
