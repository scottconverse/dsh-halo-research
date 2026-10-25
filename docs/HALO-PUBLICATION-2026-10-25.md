# DSH October 24–25 publication reconciliation

This record reconciles the two days of DSH work requested by Scott on October
25, 2026 (America/Denver). It distinguishes source publication, installation,
observed execution and historical evidence. No model calls, benchmarks, new
tests, installations, restarts or settings changes were made for this task.

## Published deliverables

| Work | Source / record | Status |
|---|---|---|
| DeepSeek CLI, per-model settings, exact-1017 batch exception and cloud accounting | [Routing repo main](https://github.com/scottconverse/deepseek-harness-model-routing-1024/tree/main), commit `2900b9c` and predecessors | Already on main before reconciliation |
| Native `model_route` plugin v0.1.0, CLI and short companion skill | [Routing source `657dd92`](https://github.com/scottconverse/deepseek-harness-model-routing-1024/commit/657dd92ce2e10b702ef00c0e8e765ed5df8be807) | All 21 tracked source files already on main |
| Web skill install, native plugin install and Web/Desktop preset wiring | Halo commits `c42ac609`, `1df5bdff`; [deployment source](../stack/stock-dsh/skills/deepseek-harness-model-routing-1024/) | Already on master; current installed source hashes match |
| Offline call/batch Low/64K proof, preserved settings and idle activation | [Plugin implementation report](HALO-ROUTING-PLUGIN-2026-10-24.md), Halo commit `1e05e11e` | Existing evidence reused, not rerun |
| One short live coding call in each actual application | [October 25 evidence](evidence/routing-plugin-2026-10-25/), Halo commit `fe56cbba` | Already on master; six code checks each, 983 model tokens |
| October 24 effort study, earlier attempts, runner and original reports | [Historical archive](evidence/deepseek-effort-study-2026-10-24/) | Missing from Halo before this task; now archived with qualifications |

The complete native plugin, companion SKILL.md, CLI, model-settings.json,
pricing, manuals, architecture, landing page and existing offline checks are
included in the tracked Halo deployment copy as well as their dedicated source
repo. No source code is replaced by a report-only description.

The source repository's `main` was verified against GitHub at
`657dd92ce2e10b702ef00c0e8e765ed5df8be807`. Halo's starting master was
`fe56cbba0ae2e7b91cadfaf226d21990e10dccf7`, also verified against GitHub.
Neither repository had an open pull request. The sole older local Halo branch,
`web-dsh-model-parity`, has zero unique commits outside master. There was no
pending branch change to merge; the missing records are committed directly to
master under the existing repository workflow. No tag/release is created by
this publication request.

## Installed versus published source

[Source inventory](evidence/publication-2026-10-25/routing-source-inventory.json)
records SHA-256 hashes for every one of the 21 tracked routing files. All match
between source, Web's installed copy and Desktop's installed copy. Local
`.state` directories are deliberately not part of the tracked source inventory.
Current config remains DeepSeek 1017 Low/65,536 in both applications. The 1M
catalog context is advertised; direct routing leaves it provider-managed.

This publication does not claim new acceptance for Wigolo, Reddit/Redlib,
XERJ, Mission Control or upstream compatibility. Existing settings/integrations
were not edited. Activation and short coding evidence remain scoped to the
actual operations recorded in the linked reports.

## Historical evidence and limits

The effort-study archive retains 656 final corrected receipts and 1,396 earlier
receipts separately. It includes the original runner and original prose
unchanged, with a new archive README explaining completed-only versus all-attempt
rates, the missing-prelude bug, regenerated answers and overwritten old raw
outputs. It does not repeat the original report's unsupported claim that the
bug could not change the ranking or that hitting a cap proves intrinsic
inability. There is no new model evaluation in this publication.

Retained effort-study receipts total 2,211,126 input-plus-output tokens; the two
short plugin calls separately total 983. These are historical receipt totals,
not a full subscription bill or Codex coordinator token total. Private raw
conversations/thinking and runtime ledgers remain local. Other product work,
credentials, backups, weights, downloaded runtimes and the retired broken
accounting prototype remain outside this commit.

## Delivery

The dated record, evidence index and README are updated in this Halo repo.
Halo Stack Research's reading copy and recovery manifest are synchronized.
The final commit identity is available from this file's Git history; the push
must be verified against origin/master before completion is reported.
