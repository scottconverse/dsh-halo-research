# Halo v0.3.6 — Native model routing plugin, skills and evidence

DSH Web and Desktop now include the native `model_route` plugin, the retained
PowerShell routing CLI and a small companion skill. The exact DeepSeek 1017
route defaults to Low effort and a 65,536-token maximum output allowance in
both call and batch paths. Existing models, defaults and research integrations
are preserved.

## Included since v0.3.5

- Native routing plugin v0.1.0, explicit settings/call/batch/report operations,
  and reuse of DSH's own tool execution, PowerShell, permissions, cancellation
  and optional jobs. No separate agent loop or automatic provider switching.
- Full tracked plugin/CLI/skill source, configuration, architecture, user manual,
  landing page and existing focused offline checks. All 21 routing source files
  matched both installed copies at the October 25 reconciliation.
- Exact DeepSeek `deepseek-v4.1-flash:1017-cloud` batch exception, shared Low/64K
  defaults, request-setting receipts and cloud cost estimates distinguished from
  free local weights. Other cloud batch tags remain blocked by that CLI policy.
- Idle Web/Desktop activation records and two short live native-plugin coding
  calls: six code checks passed for each, with 983 model-reported tokens total.
- Historical October 24 effort-study runner, original reports and 2,052 result
  receipts. Earlier budgets and the flawed first 64K run remain separate;
  corrected all-attempt rates and known historical reporting flaws are explicit.
- Flint Windows investigation/integration/removal records and the auxiliary
  title-generation disablement. Flint is not a current picker/default entry.
- Updated setup README, work history, two-day publication index and recovery
  documentation. Existing v0.3.5 fixes remain included.

## Evidence reused; no new tests

No tests, benchmarks, model calls, installations or restarts were run to create
this release. The release reuses existing scoped evidence. Release preparation
checks source identity and archive contents only. The historical study was not
rerun, and its results do not establish a universal model/effort ranking.

- [Native routing architecture, installation and execution record](docs/HALO-ROUTING-PLUGIN-2026-10-24.md)
- [Plugin source and architecture](stack/stock-dsh/skills/deepseek-harness-model-routing-1024/plugin/README.md)
- [Companion skill](stack/stock-dsh/skills/deepseek-harness-model-routing-1024/SKILL.md)
- [CLI user manual](stack/stock-dsh/skills/deepseek-harness-model-routing-1024/docs/MANUAL.md)
- [October 24–25 publication reconciliation](docs/HALO-PUBLICATION-2026-10-25.md)
- [Historical effort-study archive and qualifications](docs/evidence/deepseek-effort-study-2026-10-24/README.md)
- [Live coding receipts and usage](docs/evidence/routing-plugin-2026-10-25/results.json)
- [Complete work history](docs/HISTORY.md)

## Distribution and limits

This is a machine-specific Halo deployment **source release**, not a standalone
installer or a new upstream DSH version. The recorded Web/Desktop DSH version
remains 0.2.1-rc.2; routing plugin version remains 0.1.0. The release does not
migrate another machine's accounts, models, sessions or runtime automatically.
The 1M catalog context is advertised; direct routing leaves context management
to Ollama Cloud. These records do not prove full-context or full-output-budget
acceptance. Background job forwarding has offline coverage; it is not a new
live background-job acceptance claim.

Private session dumps, raw thinking, runtime ledgers, credentials, personal
voice skills, caches, model weights, downloaded installers and private scratch
work are not added. Existing historical runtime-patch backups and registry-path
backup remain excluded from GitHub source archives using export-ignore. The
broken accounting prototype stays excluded. Historical backup Git history is
not rewritten. GitHub's standard source ZIP/tar archives carry this snapshot;
no installer or additional binary asset is published.
