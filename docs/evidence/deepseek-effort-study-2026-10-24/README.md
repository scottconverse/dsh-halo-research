# Historical effort-study archive — October 24, 2026

This is a publication of existing evidence, not a new benchmark run. Nothing in
this folder was executed during the October 25 publication task. The runner is
archival and is not installed as an automatic DSH job.

- `bench.py`: unchanged runner from the DSH Desktop workspace.
- `results-cap-65536.jsonl`: final retained corrected 64K comparison, 656 receipts.
- `archive/earlier-capped-runs/`: 1,396 earlier receipts, kept separate, including
  the 656-row 64K run with the missing-prompt-prelude bug.
- `README.original.md` and `results.original.md`: original historical prose,
  preserved byte-for-byte. The qualifications below take precedence.
- `MANIFEST.json`: hashes and sizes of copied original files.
- `receipt-summary.json`: read-only aggregation at publication time.

## What the retained corrected receipts show

| Effort | Passed / all attempts | All-attempt success | Input tokens | Output tokens | Sum of call seconds |
|---|---:|---:|---:|---:|---:|
| Off | 159/164 | 96.95% | 27,402 | 30,675 | 100.30 |
| Low | 164/164 | 100% | 30,366 | 94,004 | 263.81 |
| High | 161/164 | 98.17% | 30,366 | 241,630 | 523.11 |
| Max | 161/164 | 98.17% | 30,366 | 313,630 | 704.99 |

High and Max each have two cap-exhausted calls. The original report's 99.4%
uses 161/162 completed answers; it is not all-attempt success. Low did best in
this retained single-attempt, public HumanEval sample; it is not a universal
coding or journalism ranking. The study did not find an optimal output budget
or validate a full 1M context window.

Important historical corrections:

1. A 64K limit is a fixed comparison budget, not a guarantee that no response
   will reach the cap. Four corrected-run calls did reach it.
2. A cap-exhausted response establishes failure at that allowance on that
   attempt. It does not prove the model cannot solve the problem, or that
   a larger allowance would never help. Claims in original prose that these
   are failures of the effort level rather than the budget are too strong.
3. The first full 64K sweep omitted starter helpers. DSH repaired the runner,
   made additional calls and launched a corrected sweep. These were newly
   generated responses, not merely re-scoring the same saved answers. Thus
   the original claim that the bug affected every arm equally and could not
   change the ranking is not established.
4. The raw output directory was reused, overwriting earlier raw responses.
   The earlier result receipts survive; complete original raw evidence does
   not. Do not claim an immutable full-raw archive.
5. `bench.py` retains its historical completed-only reporting policy. This
   publication does not change or rerun the runner; use the all-attempt table
   above when describing what the caller experienced.

The 656 retained corrected receipts total 118,500 input + 679,939 output =
798,439 tokens, with 1,592.21 summed call seconds. All six retained receipt files
have 2,052 attempts total, 372,851 input + 1,838,275 output = 2,211,126 tokens,
with 4,654.96 summed call seconds. These are model-call receipt totals, not
elapsed project time, coordinator usage, subscription invoices or a guarantee
that every historical call was retained. Earlier attempts remain separately
labelled and are not pooled into the corrected accuracy table.

## Inputs and deliberately excluded material

Dataset download locations recorded by the original workspace:

- HumanEval: https://raw.githubusercontent.com/openai/human-eval/master/data/HumanEval.jsonl.gz
- HumanEval+: https://huggingface.co/datasets/evalplus/humanevalplus/resolve/main/test.jsonl

Dataset bytes are not duplicated here. Their local hashes and sizes are in
`dataset-provenance.json`. Download presence is not evidence that HumanEval+
was run: these published receipts are HumanEval.

Private raw prompts, answers/thinking, session trajectories, runtime ledgers,
credentials, model weights, downloaded runtimes, caches and backups are not
published. No automatic run or deployment is added by this archive.
