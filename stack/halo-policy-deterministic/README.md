# dsh-halo-policy-deterministic

Pure, deterministic shadow recommendations for Halo Router 0.1.0. The package filters and ranks candidate snapshots supplied by `dsh-halo-routing`, explains every candidate, and registers one advisory policy through `ctx.haloRouting`.

It has no routing or runtime authority. It performs no discovery, persistence, network, filesystem, provider, CLI, model, load/unload, retry, failover, permission, sandbox, or context mutation.

## Input

`recommend({ workload, candidates, policy })` accepts a prompt-free workload and a complete candidate snapshot.

- `workload`: `role`, optional `requiredCapabilities`, optional `requiredTier` (`economy | standard | premium`), and optional `requiredContextWindow`.
- each candidate: `candidateId`, `provider`, `model`, `executionClass`, `locality` (`local | remote | unknown`), `billing` (`free | paid | subscription | unknown`), `available` (`boolean | null`), `catalogState`, optional `contextWindow`, `capabilities`, optional `tier`, and `qualificationState` (`unknown | pass | fail`).
- `policy`: optional `preferLocal` boolean, default `true`.

Unknown availability, entitlement, tier, context, locality, and qualification are explicit caveats rather than silent exclusions. A `registered` catalog entry is membership evidence, not entitlement proof, so it receives the unknown-entitlement caveat. That rule is safe only because this release is shadow-only. Proven unavailability, catalog-only state, failed qualification, missing required capabilities, and known tier/context shortfalls reject a candidate.

Locality and billing are independent. Local-first ranking uses only `locality`; `billing` is reported but does not imply local or remote execution. Subscription-backed candidates carry a marginal-cost caveat rather than being mislabeled as free or per-call paid.

## Output

The result contains `recommendedCandidateId`, ranked `acceptedCandidateIds`, `rejectedCandidateIds`, one `evaluations` entry with reason codes and plain-language messages for every input candidate, and an advisory `explanation`. Stable candidate identity is the final tie-break, so input order cannot change the result.

## DSH registration

`apply(ctx, config)` injects `haloRouting` and registers:

```js
{
  id: "dsh-halo-policy-deterministic",
  version: "0.1.0",
  config: { preferLocal: true },
  recommend
}
```

The routing service retains actual selection and failure-isolation authority.

## Test

```powershell
npm test
```

See [PROVENANCE.md](./PROVENANCE.md) for the pinned source lineage and deliberate adaptations.
