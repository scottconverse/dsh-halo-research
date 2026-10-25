# Effort sweep on external coding tests

Does DeepSeek V4.1 Flash 1017 code differently at `off`, `low`, `high` and
`max`? This harness answers it on **HumanEval**, the most widely copied coding
suite in the field, rather than on fixtures written for this project.

## What is tested

| Suite | Source | Tasks | Why |
|---|---|---|---|
| `humaneval` | OpenAI HumanEval (`openai/human-eval`, MIT), 164 function-completion problems with official tests | 164 | The standard comparator: nearly every model card and leaderboard reports it, so results are checkable against published numbers |
| `humanevalplus` | EvalPlus HumanEval+ (stricter, generated edge-case tests) | 164 | Same tasks, much stricter oracle; catches solutions that pass the base tests by luck |

Downloaded, not rewritten:

```
data/HumanEval.jsonl.gz        https://raw.githubusercontent.com/openai/human-eval/master/data/HumanEval.jsonl.gz
data/HumanEvalPlus.jsonl       https://huggingface.co/datasets/evalplus/humanevalplus/resolve/main/test.jsonl
```

## Method

- One prompt: "complete this function, return the complete definition in one
  code block, no tests or explanations". Temperature 0.
- `think` is set per arm: `false` for off, `"low"`, `"high"`, `"max"` otherwise.
- `num_predict` is **65,536** for every arm, so no arm loses an answer to the
  cap. The requested cap, actual output tokens and the provider's stop reason
  are recorded per call.
- Completion is extracted from the code block(s) — **all** blocks are kept,
  because models often put helpers before the entry point.
- The official test file is appended and executed in a subprocess
  (`python -I -B`, 15 s timeout) in a temp directory.
- Pass@1 per arm, with Wilson 95% intervals.
- Every call is logged to `results.jsonl` with effort, tokens, thinking size,
  wall time, and the failure message.

## Run

```powershell
python bench.py run --suite humaneval --efforts off,low,high,max
python bench.py report
```

`--limit N` samples N tasks (seed 1024); `--tasks HumanEval/0,...` pins tasks.
Results are append-only and resumable; `--suite` keeps the two suites separate.

## Known limitations (learned the hard way)

- **The output cap is part of the run identity.** Each cap writes
  `results-cap-<N>.jsonl`, and the resume key includes the cap, so a 2K row can
  never cause a 64K case to be skipped. The current comparison uses
  **65,536** output tokens per call for all four arms.
- **Earlier caps are archived, not deleted.** `archive/earlier-capped-runs/`
  holds the 2K, 8K and 16K attempts. Their cap-exhausted rows are a fact about
  those budgets, not evidence that an arm cannot solve the task.
- **Outcomes are classified.** `passed`, `failed_tests`, `cap_exhausted`,
  `test_timeout`, `call_error`. The pass rate is computed over **completed
  answers only**; cap-exhausted and errored calls are reported separately and
  never folded into a failure rate.
- **Raw records are private.** `raw/cap-<N>/` keeps the prompt, answer,
  thinking text and stop reason for every call so a failure can be inspected.
  It is git-ignored.
- **One attempt per task.** HumanEval has no repeated sampling here; pass@1 is
  single-shot, so differences under ~3 points are noise at n=164.
- **Execution is local and unsandboxed** beyond `-I` and a timeout. Generated
  code runs as the current user. Do not point this at untrusted models.
- **Contamination.** HumanEval is old and public; a high score is partly
  familiarity. LiveCodeBench exists for that reason and is the natural next
  suite.

## Reporting

`bench.py report` prints per-suite, per-effort: n, passes, rate, Wilson CI,
median seconds, mean output tokens, mean thinking characters, and the failure
list. The point is not a single winner but whether the rung changes anything.
