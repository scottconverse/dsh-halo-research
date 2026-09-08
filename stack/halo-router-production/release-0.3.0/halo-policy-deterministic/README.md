# dsh-halo-policy-deterministic

DEV-only, deterministic shadow recommendations for Halo Router. Version 0.2.0 calls the pinned DevHarmonics `selectCandidate` implementation directly through a thin DSH candidate adapter. It does not contain a second optimizer.

The policy has `authority: none` through `ctx.haloRouting`. It performs no discovery, persistence, inference, filesystem or network I/O, route mutation, model loading, retry, failover, permission, sandbox, or context change.

## Input

`recommend({ workload, candidates, qualifications, excludedCandidateIds, policy })` accepts:

- `workload.role`: a donor role (`analysis`, `benchmark`, `structured_write`, or `tool_use`); root planner/reviewer work maps to `analysis`, gated worker work maps to `structured_write`, and benchmark fixtures use `benchmark`.
- `workload.requiredTier`: optional `economy | standard | premium`, default `economy`.
- `candidates`: the DSH candidate snapshot. A selectable candidate must carry a nonempty current `executionFingerprint`. Optional known availability, catalog, capability, and context failures become explicit donor exclusions.
- `qualifications`: the unmodified qualification-record array. Records match only when `candidateId`, role, and the donor fingerprint are exact; the latest exact record must have `passed: true`. `structured_write` additionally requires a current benchmark PASS.
- `excludedCandidateIds`: optional caller exclusions, forwarded to the donor selector. Policy configuration may also supply `excludedCandidateIds`.

No records means no qualified recommendation. Legacy `candidate.qualificationState: "unknown"` does not make a candidate eligible and is not treated as donor evidence. Unknown availability alone does not exclude an otherwise exactly qualified candidate; known unavailability does.

## Exact donor projection

`toDonorCandidate(candidate, role)` projects to DevHarmonics' candidate shape:

```js
{
  id: candidate.candidateId,
  lane,
  provider: candidate.provider,
  model: candidate.model,
  tier,
  runtimeVersion,
  digest: candidate.executionFingerprint,
  paid
}
```

The current Halo execution-profile fingerprint is the donor `digest`, so any change to the observed execution configuration invalidates earlier role and benchmark qualifications. Runtime falls back to the pinned `DSH/0.1.1-rc.2` string when no more specific observed value exists. HTTP/local model tiers reuse `inferLocalTier` (30B is standard, above 30B is premium); non-HTTP candidates default to the donor-documented premium tier unless the operator supplies one. The donor's `paid` score bit represents its local-first lane preference, not Halo billing metadata.

The package publicly exposes `toDonorCandidate`, `candidateFingerprint`, `currentQualification`, `tierFit`, `selectCandidate`, `inferLocalTier`, `QUALIFICATION_HARNESSES`, and `TIER_RANK` for qualification integration and differential tests.

## Output and registration

The result preserves `recommendedCandidateId`, ranked `acceptedCandidateIds`, `rejectedCandidateIds`, per-candidate evaluations and reasons, and a plain-language explanation containing the donor's selected factors. It never returns a route or performs the recommendation.

`apply(ctx, config)` registers policy id `dsh-halo-policy-deterministic`, version `0.2.0`, through `ctx.haloRouting`. The service and policy have `authority: none`; DSH retains all actual execution and selection authority. This package is mounted only by the isolated DEV composition and implies no production behavior change.

## Test

```powershell
npm test
```

The default suite includes the byte-exact original DevHarmonics and Codex Factory selector tests plus Halo differential and adapter tests. See [PROVENANCE.md](./PROVENANCE.md), [vendor/README.md](./vendor/README.md), and [evidence](./evidence/).
