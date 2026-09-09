# Candidate model test plan (approved by Scott, 2026-09-09, Option A)

Author: Claude Fable 5.1 (session code-6c). Status: PREPARED, NOT STARTED. Starts only after the CivicCast session says "shipped" and Scott says go. Nothing in this plan changes production.

## Goal

Answer one question per candidate with a measured pass/fail: does this model do the two jobs the current pair does, on this box, at production settings, inside the same fixtures the production router was accepted with? Total wall clock about two hours, in units of at most 30 minutes, run one at a time by the agent. No tuning, no quantization sweeps, no context sweeps.

## Candidates and how each arrives

| Id | Model key (LM Studio) | Shape | Where it is now | Acquisition |
|---|---|---|---|---|
| C1 | `nvidia-nemotron-3.5-lightning-30b-a3b` | 30B-A3B, Q4_K_S, 24.47 GB | On this disk (Local) | none |
| C2 | `gemma-4-26b-a4b-it-qat@q4_k_xl` | 25B-A3.8B, Q4_K_XL QAT, 16.54 GB | LM Link peer NvideaBlackwell | copy the GGUF over the LAN into this box's LM Studio models folder (LAN-first rule; no GitHub, no re-download) |
| C3 | GLM 4.7 Flash 30B-A3B, Q4_K_M | 30B-A3B, about 18 GB | not on any device | `lms get` download after Scott's go; skip if no GGUF with Vulkan support exists |

Baseline (must be re-run the same day, first): worker `halo/qwen3-coder-30b-a3b-q4km`, planner `halo/qwen3.6-35b-a3b`. Recorded Sep 8 numbers: worker gate PASS in 29.488 s (request 50bd497e), planner Gateway workflow completed in 54.821 s (session 8421af6c).

## Where the tests run

In Router DEV, not production: home `stack\halo-router-dev\home`, port 3085. DEV shares LM Studio with production but has its own sessions and config. The production cockpit (3080) stays untouched and may stay down. The Gateway (8765) must be up for the planner test; it is.

Acceptance driver: mount it temporarily exactly as the DEV README says (stop DEV; append the `halo-acceptance-driver` row under `insert` in `home\cordis.patch.yml`; start DEV; run tests serially; finish with Stop, `node configure-dev.mjs`, Start so the driver is removed). The driver accepts `provider` and `model` per request, so a candidate is tested by sending its model key with `routingSettings: { mode: 'manual' }`. Manual mode bypasses the router's qualification table on purpose: this is a model test, not a router test.

## Fixtures (existing, unchanged prompts)

1. Worker fixture: `verified-coder` action with `STRUCTURED_WRITE_FIXTURE` from `stack\halo-routing\qualification.mjs` (editable `add.py`, protected `test_add.py`, verify with `python test_add.py`), as used by `stack\halo-router-production\smoke.mjs gate`. Pass = independent gate verdict `pass` and `status: completed` within 180 s.
2. Planner fixture: the Gateway connection prompt from `stack\halo-router-production\gateway-smoke.mjs` (web_search for the MCP documentation, web_fetch of https://example.com, report title and one URL, no shell or browser substitutes, under 80 words). Pass = `status: completed`, both tool calls `ok: true`, final answer contains "Example Domain" and a URL, no substitute tool used, within 180 s.

Each fixture runs twice per model. Both runs must pass. Time is recorded but is secondary; a pass slower than twice the baseline is noted, not failed.

## Runner script (to be written before the first run; Sonnet-sized, about 40 lines)

`stack\halo-router-dev\candidate-acceptance.mjs <gate|research> --model <key> [--provider lmstudio]`: a parametrized copy of `smoke.mjs` (gate branch, manual mode) and `gateway-smoke.mjs`, pointing `home` at the DEV home and writing evidence to `stack\halo-router-dev\evidence\candidates\<model>\<mode>-<timestamp>.json` plus `lms-ps.json` before and after. No change to `acceptance-driver.mjs`, the router, or any production file.

## Per-candidate procedure (30-minute box)

1. Check the box is free: `lms ps --json` shows nothing generating; no Windows Sandbox owned by another session; free RAM noted.
2. Unload everything else. Load the candidate with `lms load <key> --context-length 32768` and parallel 1; wait for `lms load` to report success (never infer readiness from `lms ps` idle).
3. Run `candidate-acceptance.mjs gate --model <key>` twice, then `candidate-acceptance.mjs research --model <key>` twice. Serially. No help, no prompt edits, no retries beyond the two runs.
4. Save evidence; record durations, tool-call counts, and any loop or format failure verbatim.
5. Unload the candidate.
6. If the box is needed elsewhere, stop here; the next candidate is a new unit.

Stop rule: if a candidate fails both runs of a fixture, it is out; do not tune it back in.

## Reporting

One table: candidate, worker run 1/2, planner run 1/2, durations, baseline durations, verdict. Failures and their transcripts stay in evidence. The report goes to `Desktop\Halo Stack Research\HALO-MODEL-CANDIDATE-RESULTS-<date>.md` and `stack\`.

## What a "winner" does and does not get

A candidate that passes is a proven manual route. It does NOT get Auto: Auto requires the router's exact-profile qualification (`recommend` and the ledger), which is a separate, later step with Scott's decision. Production defaults, residency, and the tuned pair stay as they are until then.

## Preconditions checklist

- CivicCast session has said "shipped" (no model loads or CPU-bound work before that).
- Scott's go for the day.
- LM Studio server up (1234), Gateway healthy (8765).
- DEV baseline mismatch from the Sep 8 promotion (`prepare.mjs --verify`, 4 files) is understood; it does not block DEV startup.
- Candidate files present (C1 yes; C2 after LAN copy; C3 after download).

## Verification ledger

VERIFIED: the acceptance driver accepts provider and model per request | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev\acceptance-driver.mjs:102
VERIFIED: driver actions include root-turn and verified-coder | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev\acceptance-driver.mjs:14
VERIFIED: remount steps and the halo-acceptance-driver row | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev\README.md:191
VERIFIED: removal steps (Stop, configure-dev.mjs, Start) | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev\README.md:226
VERIFIED: worker fixture definition and gate pass assertion | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-production\smoke.mjs:12
VERIFIED: planner fixture prompt and manual mode | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-production\gateway-smoke.mjs:6
VERIFIED: Sep 8 baseline durations and request ids | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-ROUTER-PRODUCTION-2026-09-08.md:64
VERIFIED: Sep 8 planner baseline duration and session | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-GATEWAY-RECONNECTED-2026-09-08.md:18
VERIFIED: client enqueues to <home>\acceptance\inbox and polls outbox | C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev\acceptance-client.mjs:17
MEASURED: candidate locations and sizes from `lms ls` (this session)
UNVERIFIED: GGUF availability and Vulkan support for GLM 4.7 Flash - not checked
UNVERIFIED: exact GGUF path of the Gemma 4 26B-A4B file on NvideaBlackwell - not checked
