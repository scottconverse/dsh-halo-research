# Halo verified research state

`halo-research-state` is the DSH-side integrity layer for long Halo Research
Gateway turns. It does not search the web itself. It observes the durable DSH
event stream, correlates real `mcp__halo_research__*` calls with successful
Gateway results, and makes that evidence authoritative when DSH compacts the
conversation.

## What it enforces

- Preserves discovered URLs, fetched source parts, exact continuation cursors,
  coverage state, warnings, and bounded request-relevant excerpts after a
  successful DSH compaction.
- Treats model-written summaries as non-authoritative for source, pagination,
  coverage, and research-call-count claims.
- Rejects further Gateway calls after an explicit call or elapsed-time budget.
- Checks an explicitly requested final-answer contract, including word count,
  paragraph shape, required URLs, citation placement, paraphrase-only output,
  and disclosure of unread continuations.
- Gives the same DSH turn at most two evidence-only revision attempts. Revision
  cannot expand the research because later Gateway calls are denied.
- Serializes source excerpts as escaped JSON and labels retrieved material
  untrusted, so page text cannot become agent instructions.

The plugin does not certify the truth of arbitrary prose and does not replace
human source review. Its reusable state builder is paired with a task-specific
acceptance verifier for the live Python documentation workflow used for this
release.

## Files

- `index.mjs` — DSH plugin, verified ledger builder, budget gate, and final gate.
- `acceptance.mjs` — independent acceptance evaluator for saved DSH history.
- `verify-history.mjs` — CLI wrapper for the release acceptance fixture.
- `test/research-state.test.mjs` — ledger, compaction, budget, security, and
  final-revision tests.
- `test/acceptance.test.mjs` — strict pass/fail acceptance tests.

## Verification

From the repository root:

```powershell
node --test stack/halo-research-state/test/*.test.mjs stack/halo-verified-coder/test/*.test.mjs stack/test/*.test.mjs
node _upstream/deepseek-harness/node_modules/vitest/vitest.mjs run packages/compaction/compaction-basic
node _upstream/deepseek-harness/node_modules/vitest/vitest.mjs run packages/compaction
node stack/halo-research-state/verify-history.mjs <saved-dsh-history.json>
```

The verifier returning `passed: true` proves only the stated fixture contract:
completed turn, research/time/word budgets, required source reads, real
pagination, citations near claims, honest coverage disclosure, and retrieved
text supporting the three named semantic claims. It also returns
`manualEvidenceReviewRequired: true`; a human or reviewing agent must still
compare the final answer with the actual excerpts.

## Deployment and rollback

The canonical preset loads this plugin from the canonical stack path. The live
preset is:

`C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\agent.cordis.yml`

The 2026-09-03 deployment backups are:

- `C:\Users\scott\.dsh\backups\halo-research-state-20260903-144834`
- `C:\Users\scott\.dsh\backups\halo-research-final-gate-20260903-145740`

Rollback means restoring the owned Halo Orchestrator preset from the selected
backup and restarting only the owned DSH cockpit. Do not restart or reconfigure
LM Studio or the Halo Research Gateway for this plugin rollback.
