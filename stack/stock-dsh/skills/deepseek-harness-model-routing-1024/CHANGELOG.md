# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is
[SemVer](https://semver.org/).

## [0.3.1] - 2026-10-25

### Added
- **`scripts/test_batch_offline.ps1`** — starts a local mock on 127.0.0.1, points
  `OLLAMA_BASE` at it, and captures the exact request bodies for one call and two
  batch items. Makes no model calls and never contacts Ollama. 22 assertions.

### Changed
- **`batch` now allows exactly one cloud model**, `deepseek-v4.1-flash:1017-cloud`,
  through the same shared resolver. Every other cloud tag is still rejected
  before any request is sent. Other models keep their settings and the
  local-weights behaviour.
- **Batch accounting no longer calls the 1017 model free.** Rows carry
  `execution` (`cloud` vs `local-weights`) and `transport` separately, plus
  `cost_basis`. The cloud model is priced from `config/prices.json` as
  `estimated-api-equivalent`; unpriced cloud work records `unknown`, never zero.
  Historical rows are untouched.
- **Batch results and ledger rows keep per-item identity**: unique `call_id`,
  requested and returned model, resolved effort and output allowance with
  sources, context handling, token counts, elapsed time and stop reason.
- Documentation updated: batch is no longer described as always local-only or
  free; the allowed cloud model is documented as consuming subscription/quota and
  defaulting to Low/64K.

### Tests
- 60 unit assertions (two new for the batch exception and preview) and 22 mock
  assertions.

## [0.3.0] - 2026-10-25

### Added
- **`config/model-settings.json`** — explicit request settings for
  `deepseek-v4.1-flash:1017-cloud`: `think: "low"`, `options.num_predict: 65536`,
  and a 1,048,576-token context recorded as **provider-managed**. `num_ctx` is
  not sent, because Ollama cloud models use their maximum context by default and
  sending `num_ctx` would not enforce the cloud context size.
- **`settings` verb** — resolve effort, output allowance and context handling
  without calling a model.
- **Ledger fields**: `requested_model`, `served_model`, `effort_source`,
  `max_tokens`, `max_tokens_source`, `context_handling`, `advertised_context`,
  `done_reason`. Receipts print the same values.
- Sixteen tests covering the resolver, overrides, validation, `off` as a boolean,
  and the call/batch request construction (58 total).

### Changed
- **One resolver for `call` and `batch`.** Per-call `-Effort` / `-MaxTokens`
  overrides are labelled `explicit`; a model without an entry keeps the
  provider's own settings, so no model inherits another's caps.
- **`SKILL.md`, manual and README corrected**: DSH *does* expose model reasoning
  effort; a direct HTTP call does not inherit DSH's model configuration;
  reasoning effort is separate from implementation verification; the mandatory
  E1 → E2 → E3 ladder is replaced by verification matched to the task and named
  risks; Low is the documented default for this model, with higher rungs by
  explicit choice only.
- **Evidence corrected to all-attempt rates**: high and max are 161/164 (98.2%),
  not 161/162. Cap-exhausted calls stay in the denominator.

### Notes
- Older ledger rows keep their original shape; missing settings fields mean
  unknown, never zero.

## [0.2.0] - 2026-10-25

### Added
- **Landing page** `docs/index.html` — self-contained, no external assets,
  dark/light aware, ready to serve from GitHub Pages `/docs`.
- **User manual** `docs/MANUAL.md` — mental model, install, full command
  reference, configuration, five recipes, ledger, troubleshooting, limits, FAQ.
- **Evidence summary** `docs/EVIDENCE.md` — the 164-task HumanEval effort sweep
  and the four-repository low/high comparison, with caveats.

### Changed
- README rewritten as the repository landing document: lanes, install, quick
  start, command table, verified results, design rules, links.

## [0.1.2] - 2026-10-24

### Added
- **`-Effort`**, passed to each lane in its own dialect: Ollama `think`, Claude
  `--effort`, Codex `-c model_reasoning_effort=`. Omitted means the provider
  default; the skill never picks a rung for you.
- **`effort` in the ledger** and **`report -ByEffort`**, so a cost or acceptance
  comparison across different rungs is at least visible.
- Five tests for effort pass-through and grouping (40 total).

### Changed
- **Corrected the effort evidence in `references/decision-rubric.md`.** The
  earlier text attributed self's exact-optimization failure to the LOW run. A
  rerun at HIGH matched 151/152 and 3/4 repairs, was 25.9% faster and 28.2%
  cheaper overall, and recovered cardinality — but still missed the optimum by
  3.06%. The gap is a capability/approach problem, not an effort problem, and
  the rubric now says so.

## [0.1.1] - 2026-10-24

### Added
- **`-Class` and `report -ByClass`.** Every event records a work class
  (default `uncategorized`), and the report can group by it, so promotion and
  demotion decisions read per task class instead of per model.
- Legacy entries without a `class` field fall back to `uncategorized` rather
  than breaking the report.
- **`prices -Model M`** reports how a model will be classified and what rate it
  will use, so "why is this cost blank?" is answerable without a model call.
- Four pricing tests (34 total).

### Fixed
- Cost estimation treated cloud tags ending in `-cloud` (e.g.
  `deepseek-v4.1-flash:1017-cloud`) as free, the same `:cloud$` mistake fixed
  earlier in `probe`. Model classification now lives in one `Get-ModelKind`
  helper used by both, and a test pins the behaviour.

### Verified
- First real local batch: 10 support messages through `qwen3.8:27b-q4_K_M` at
  parallel 2 — 10/10 valid labels, 9/10 matching expected, 23.3 s/item, 1,471
  tokens, $0.00, accepted by a command that inspected the artifact.

## [0.1.0] - 2026-10-24

First version, written for DSH Desktop.

### Added
- **The inversion.** Self is the default lane; local Ollama is the free batch
  lane; external calls are exception handlers gated by an escalation test.
- **`scripts/route.ps1`** with `probe`, `call`, `batch`, `accept`, `defer`,
  `report`. Provider inferred from the model name, prompts passed on stdin,
  every call appended to a JSONL ledger.
- **Acceptance as a command.** `accept -Cmd "pytest -q"` records the exit code
  and marks the task; `report` computes cost per accepted item.
- **`scripts/test_route.ps1`** — 28 offline checks, no network and no quota.
- **Cloud-tag guard.** `batch` refuses models whose tag ends in `cloud`, so the
  free lane cannot silently spend Ollama credits; `probe` counts local and cloud
  tags separately.
- **`references/decision-rubric.md`** — the escalation function, anti-triggers,
  worked examples, and dated evidence for the thresholds.
- **`references/external-calls.md`** — measured overheads (Codex ~22.5k tokens
  per call), Claude JSON usage receipts, and the failure modes seen in practice.
- **`references/worktree-protocol.md`** — isolated delegation and diff review.
- **`references/ledger.md`** — schema, report semantics, promotion/demotion rules.

### Known limits
- `batch` was verified in dry-run only; a real run requires loading a local
  model of 16.5 GB or more.
- Codex returns a total token count with no input/output split, so its cost
  stays blank unless a rate split is supplied.
- `-TimeoutSec` hard-stops Ollama HTTP calls but not native CLI processes; the
  harness timeout is the backstop there.
