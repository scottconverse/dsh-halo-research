# Halo Router direct reuse — September 7, 2026

Scope: DEV-only 0.2.0. Production is not being promoted or reconfigured. This
supersedes 0.1.0's simplified policy and its qualification-free recommendations.
The operator asked Codex to complete the reuse and execute the tests, not to
hand testing back to the operator.

Implementation committed locally as `6a003955` (direct donor reuse, DSH adapters,
DEV repair and automated acceptance tooling). Documentation and raw acceptance
evidence are retained in a separate scoped commit. No production promotion.

## What is reused

The running policy imports the byte-exact pinned DevHarmonics `fleet.mjs` and
calls its `selectCandidate`, `candidateFingerprint`, and `inferLocalTier`.
DevHarmonics' role qualifications, latest-result rule, tier fit, exclusions,
local-first preference and structured-write benchmark prerequisite govern the
recommendation. This is no longer a separate approximation of that selector.

Codex Factory's pinned selector, original tests and license are also retained.
Differential tests compare the two implementations on their common contract;
they do not claim identical fingerprint formats. See
[source provenance](halo-policy-deterministic/PROVENANCE.md).

The qualification adapter uses DevHarmonics' original analysis marker,
structured-reasoning question and `add.py` repair fixture/checker. DSH dispatches
the model; independent host code checks its result. A model's statement that it
passed is not a qualification. Actual gated work outcomes remain separate from
role qualification.

## DSH-specific glue

- One `ctx.haloRouting` seam and removable shadow policy; no new control plane.
- DSH candidate identities and measured configuration become the donor digest.
- Profile schema v2 distinguishes missing tools from an observed empty tool set.
- Qualification receipts join to exact post-terminal execution fingerprints.
- An opt-in DEV acceptance driver executes real DSH roots, children and the
  existing verified coder. Its requests and raw responses are retained under
  `stack/halo-router-dev/home/acceptance`; it is not a production service.
- No exact current qualification means no qualified recommendation. It does
  **not** stop DSH, restrict the picker or change the operator's route.

## Failures found during our tests

1. Earlier measurement rows lacked a post-terminal profile. The candidate
   projection threw on them. Added a regression and tolerated those legacy rows
   without treating them as configuration evidence.
2. Missing tools and a confirmed empty tool set had identical fingerprints.
   Profile v2 fixes this and invalidates ambiguous v1 qualifications.
3. CLI display banners caused correct native responses to fail the original
   exact-output checks. The adapter now reads the independently persisted native
   `result.final`, bound to the exact session/provider/model with its receipt
   hash. It does not strip arbitrary model text or loosen the checker. Both
   Claude and Codex passed fresh analysis and benchmark runs after this fix.
4. The first real DEV gated worker reached `glob`, then crashed with
   `Cannot read properties of undefined (reading 'prepare')`. Its failed gate
   and failed structured-write qualification are preserved. Investigation found
   two physical copies of DSH's tools module: the tool service and agent loop
   used different private scheduler Symbols. Repair is restricted to DEV
   dependency resolution; chat success alone is not coding acceptance. A fresh
   unchanged fixture subsequently passed through the repaired pipeline.
5. The final audit found retry attribution and reused-session receipt risks.
   Qualification now targets the actual top-level worker, not its auxiliary
   descendants or an earlier failed retry. Native receipt lookup also requires
   a completion timestamp no earlier than the qualification start. Prior
   failed gate outcomes remain preserved separately.

## Evidence and limits

Raw acceptance exports: `stack/halo-router-dev/evidence/reuse/`.
The full repeated-catalog record snapshot is losslessly compressed in
`evidence/records-snapshot.json.gz`; `records-snapshot.json` records its decoded
SHA-256, size and record count. The live original remains in DEV plugin storage.
Original selector tests: both donor directories under
`stack/halo-policy-deterministic/vendor/`.
Test prompts are explicit fixtures, not a claim of unprompted autonomy or model
quality across arbitrary projects. Tests use the existing local Q4_K_M worker
and signed-in Claude/Codex routes, not every catalog entry. Untested routes stay
unknown. No benchmark platform, automatic routing, residency controller,
adaptive v1 optimizer, Gateway integration or production promotion is added.

## Final live acceptance

Final deterministic suite: **95 passed, 0 failed, 0 skipped**, including the
unaltered original selector tests from both repositories. The acceptance-driver
protocol self-test adds four passing checks. Published-DSH observer/storage
checks also passed. Full deterministic output is retained in
`stack/halo-router-dev/evidence/focused-tests.txt`; test commands are in the
DEV runbook and the donor provenance ledger. Some initial fixture scaffolding
failed at import rather than an assertion; that is not counted as TDD RED proof.

All nine final qualification checks passed through real DSH dispatches:

| Route | Analysis | Reasoning benchmark | Original coding fixture |
|---|---|---|---|
| Local Qwen3 Coder 30B Q4_K_M | PASS | PASS | PASS through `subagent_coder`, independent gate and promotion |
| Claude CLI / sonnet | PASS | PASS | PASS through native CLI tools, independently checked |
| Codex CLI / gpt-5.6-sol | PASS | PASS | PASS through native CLI tools, independently checked |

Local coding run `f29aa497-abca-4306-98c0-38d43fbf15f4` took 19.284 seconds.
Its worker actually called `glob`, `read`, `edit`, `read`. Both the gate and the
original donor Python check passed. Codex coding took 38.923 seconds; Claude
25.505 seconds. These are whole fixture-run times, not decode speeds or a model
ranking benchmark.

The final local coding rerun after the retry-attribution fix also passed:
`2353e280-64fa-4a74-8c36-21174de3b109`, 16.598 seconds. Fresh Claude analysis and
benchmark runs passed after the native-receipt timestamp check was added.

The mounted selector demonstrated the actual admission sequence:

1. No coding PASS: no qualified coding recommendation (`14c7ab09…`).
2. Codex coding + benchmark PASS, local coding FAIL: recommends Codex (`8a78be81…`).
3. Local coding + benchmark PASS: recommends the local worker (`8d2321b8…`).

These are recommendations only. Actual dispatches stayed on the explicitly
requested provider/model. The validation script asserts those identities and
the nine qualifications; it does not ask the operator to judge whether it ran.

Unmount/restart/remount succeeded. Existing session history remained readable,
all observation IDs survived, all qualification records retained the same hash,
and both analysis/coding recommendations reproduced afterward. The current
picker contained 2,747 entries before and after the final restart cycle. Catalog availability is not a
claim of account entitlement or qualification for every entry.

Proof: `stack/halo-router-dev/evidence/reuse/validated-before.json` and
`validated-after.json`, plus `evidence/restart-{before,unmounted,remounted}.json`.
The test-only acceptance driver is unmounted after testing. DEV remains running
on port 3085 with the routing and policy plugins mounted. Production's 117
baseline files still hash identically. No models were loaded, unloaded or
retuned; the existing local worker remains 32K, one slot, Q4_K_M.

The dependency repair preserves the original DEV module directory and has an
explicit restore command. It changes a DEV junction, not shared package bytes.
The launcher now checks module identity before starting. No production repair,
Windows Sandbox run, reboot, service installation or credential change occurred.

Remaining boundary: execution snapshots record fields the provider actually
exposes. They do not attest an unobservable native runtime version, immutable
cloud backing model, or unchanged in-flight configuration. Unknowns are labeled,
not invented. The donor HTTP-specific `tool_use` harness has not been transported
as a new DSH harness; coding-tool operation is instead proven by the real
structured-write runs. No new optimizer or generalized benchmark system is built.
