# Halo DSH verified research workflow — 2026-09-03

## Outcome

The complete bounded DSH research workflow now passes live acceptance:
discovery, three distinct source reads, real continuation reads, comparison,
and a final cited answer were completed through the local Halo Research Gateway
without losing authoritative evidence across two automatic DSH compactions.

This is a DSH workflow result, not blanket certification of every Gateway
provider or every possible research claim. The installed Gateway remains
version 0.2.0. No LM Studio model, model setting, Gateway configuration, user
session, or research connection was changed.

## Failure repaired

DSH compaction formerly allowed a model-written summary to replace the source
record. A plausible summary could claim that a page was read, that pagination
was complete, or that a cursor remained even when the durable tool history did
not support it. The earlier request-retention repair preserved the active user
request and tool progress but did not make research evidence authoritative.

The repair has two layers:

1. DSH compaction commits `a040de5` and `f709c7b` retain the active request and
   reject tool-call summaries before they replace durable evidence.
2. `stack\halo-research-state` reconstructs a verified ledger from real Gateway
   calls/results, injects it after compaction and at an exact call cap, enforces
   explicit call/time limits, and checks the requested final-answer contract.

The ledger records only successful Gateway envelopes. It preserves exact URLs,
source parts, cursors, coverage, warnings, and bounded excerpts. Retrieved text
is JSON-escaped and marked untrusted. Model summaries remain useful prose but
cannot establish source, cursor, completion, or call-count facts.

## TDD and regression evidence

The implementation began with the existing DSH compaction suite green at
134/134. New tests then failed as intended: the first plugin tests were 0/4,
the first acceptance tests were 0/2, and composition initially failed until the
service was wired into the Halo Orchestrator preset.

Final local verification, rerun from the current checkout:

- 26/26 combined Halo research-state, verified-coder, and startup tests passed.
- 134/134 focused DSH `compaction-basic` tests passed.
- 206/206 tests across all 13 DSH compaction test files passed.
- Node syntax checks passed.
- `git diff --check` passed.
- Falsification checks covered forged summary claims, exact call caps,
  duplicate injection, hostile page markup, two-revision limits, no research
  after revision, and compliant-answer pass-through.

## Live deployment

Only the owned DSH cockpit was restarted. The canonical and live Halo preset
SHA-256 is:

`FBAD76E200F8845954A5EF79562F276A90CBBE4CB97DF9B103C86CFD42249306`

The unchanged DSH settings SHA-256 is:

`788778116EF982AB7D85976896AB5ED96C7FF45168355108A19DC3F6E566463D`

The selected live model remained `lmstudio / halo/qwen3.6-35b-a3b`. Existing
DSH sessions were retained. The pre-final deployment check reported 132 saved
sessions and zero actively running sessions; zero running meant idle, not lost.

Backups:

- `C:\Users\scott\.dsh\backups\halo-research-state-20260903-144834`
- `C:\Users\scott\.dsh\backups\halo-research-final-gate-20260903-145740`

## Live acceptance

The first live run passed the older structural harness but the new strict
verifier correctly rejected it: 324 words exceeded the 250-word contract and
the PEP citation was not near its grouping claim. The final-answer gate was
therefore added and redeployed rather than treating the broad harness as proof.

The second live run used session
`session-e041fd09-6d55-498a-85e5-8733e8ec9e0d` and completed with:

- 8 Gateway research calls and 8 successful Gateway results, within the stated
  maximum of 12 calls;
- 128,443 ms elapsed, within the stated six-minute limit;
- 139 final-answer words, within the stated 250-word limit;
- all three required canonical URLs fetched and cited near their claims;
- real continuation reads;
- honest disclosure that two sources still had unread continuations;
- a completed turn with no tool calls in the final answer;
- zero research calls after the final-revision instruction.

The strict verifier returned `passed: true`. Manual excerpt review found direct
support for sibling cancellation/waiting, re-raising `CancelledError`, and
grouping multiple failures; no unsupported claim was identified.

Saved evidence:

`C:\Users\scott\Documents\Codex\2026-09-01\is-this-tool-plugin-real-https\outputs\dsh-verified-final\dsh-after-resolution-history.json`

The failed first live run is retained at:

`C:\Users\scott\Documents\Codex\2026-09-01\is-this-tool-plugin-real-https\outputs\dsh-verified-ledger\dsh-after-resolution-history.json`

## Evidence boundary

This acceptance proves the named DSH workflow and contract against the exact
saved history. It does not prove every Gateway tool/provider, authenticated or
imported-profile path, paid provider, arbitrary semantic question, long soak,
or general factual correctness. `manualEvidenceReviewRequired: true` remains an
intentional verifier result. The Gateway itself owns its broader provider and
browser acceptance.

## Recovery

The readable recovery copy contains the preset and the complete
`dsh\halo-research-state` plugin. Its `MANIFEST-SHA256.txt` must match the copied
files before restoration. Restore only the owned preset/plugin, compare hashes,
and restart only DSH; this repair does not require changing the Gateway or LM
Studio.
