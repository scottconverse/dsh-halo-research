# Halo DSH: stock capability and duplication review

Reviewed September 15, 2026 against the live Mission Control inventory, installed packages, active local preset, Scott's supplied capability/build-gap report, and upstream release source. This review changes no runtime configuration, enables no plugins, removes no functionality, and performs no model inference.

## Version and publication

The completed tuning is committed and pushed as `82fbba07833c17630822ad5494845b08a44584c9`. The running deployment is **0.1.5-rc.2**, confirmed by its installed CLI package, `stack/stock-dsh/package.json`, `versions.json`, and Mission Control. It is **not** 0.1.6-alpha.1.

The newest published upstream release is [0.1.6-alpha.1](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.6-alpha.1), tag `dsh-v0.1.6-alpha.1`, commit `0a15e36e7f82b6ed45af6fa9759f29b40dcd965d`. npm published it on September 15 at 03:23 UTC. Registry tags at inspection: `alpha=0.1.6-alpha.1`, `next=0.1.5-rc.2`, `latest=0.1.5-rc.1`. Thus “newest release” and npm's literal `latest` tag differ. No upgrade was performed by this review.

The supplied engineering report examines master `0d1f50007f9bca3f52b06e1c3074fa14d5fb0720`, not the installed version or exact release commit. Our preserved upstream worktree is older still (`a040de5b`); this review fetched the release tag and read its Git objects without changing that checkout or the deployment.

## What the full inventory actually establishes

The live `/api/plugins` inventory contains **158 composition rows: 131 active, 27 host-disabled, zero failed, waiting, transitioning or stuck**. The [complete row-by-row appendix](DSH-HOST-PLUGIN-INVENTORY-2026-09-15.md) maps every row to its package, host state, and Halo-override flag. The [machine-readable evidence](evidence/dsh-catalog-review-2026-09-15.json) also records installed package versions and the release's source-package map.

The installed pnpm store has 240 distinct `@deepseek-ai/*` package names. The new release has 283 package manifests under `packages/`; these are different sets, not feature counts. Generated/bundle packages, multiple configured instances and opt-in modules prevent a simple count subtraction from identifying missing functionality. The evidence includes exact set differences. In particular, not every optional upstream module is installed locally.

The local preset separately mounts many tools shown as host-disabled. Files, PowerShell, skills, compaction, goals, planning, subagents, workflows, Ralph, TODOs and native web tools are configured there. Turning on all 27 disabled host rows would misunderstand the composition and could conflict with the preset's scoped services. Bash is also intentionally platform-gated on Windows. HMR and visual badges are not missing coding capabilities.

An active service does not prove its corresponding tool is exposed or configured to perform every operation. `session-query-sqlite` is active but the base config sets `openAt: never`; full-text search is off. Conversely, Ralph is host-disabled but enabled in the local preset with `maxRounds: 64`. Configured availability is not proof that Scott or a model has actually used it successfully.

## What we should use next, in order

These are recommendations for a later authorized implementation, not newly enabled features.

| Priority | Existing capability | Present state | Why it helps here | Reuse work and limits |
|---|---|---|---|---|
| 1 | Session-history search | Query service and SQLite provider installed; FTS disabled; `dsh-tool-session-query` not installed | Retrieve past decisions, failures and successful commands instead of repeatedly rediscovering them or carrying entire old conversations | Enable a dedicated derived index, preferably lazy `openAt: first-search`, and compose the stock query tool. The tool searches exact workspace identities; it is not a replacement for the external memory graph. Verify a saved-session retrieval. |
| 2 | LSP code navigation | `dsh-lsp`, `dsh-lsp-stdio`, `dsh-tool-lsp` absent locally, supplied upstream | Precise definitions, references, implementations and hover information can reduce large file dumps and mistaken edits | Install/compose the stock packages and the relevant language server for the project. This tool is read-only navigation, not a compiler/test replacement or a stock rename/diagnostics engine. |
| 3 | Chrome browser interaction | No browser-use provider in the active deployment | Research and development sometimes require rendered pages or inspecting an app, beyond search/fetch | On the target release, compose `dsh-browser-use` and one experimental Chrome DevTools MCP or Playwright MCP provider. Use Chrome as Scott requires. Start with an existing provider; do not build a browser engine. Stagehand uses a separately configured model and does not automatically inherit DSH routing/accounting. |
| 4 | Persistent PowerShell / stock terminal UI | Some persistent-shell pieces installed, but no active terminal composition; `dsh-tool-terminal` and the new sidebar/controller are absent | Preserve working-directory/process state and interact with development servers through the application | Use the stock terminal provider/tools and the new Web terminal UI after migration. The old installed store has persistent `pwsh` code but that alone is not a composed Windows terminal backend. Avoid duplicate tool names if both fresh and persistent shell tools are mounted. |
| 5 | Existing subagents, workflows and Ralph | Already configured in the local preset | These supply delegation, programmable coordination and fresh-agent iteration for future bounded improvement work | Use them before designing a separate orchestrator. They do not supply a trustworthy experiment score or independent correctness gate by themselves. Local models share hardware; more concurrent agents need not mean faster completion. Keep Ralph explicit and bounded; do not silently remove it because the new release defaults it off. |
| 6 | Native Codex subagent provider | Upstream package exists; not installed; matching local tool row disabled | Optional escalation from local DSH to a genuine Codex worker without writing another bridge | `dsh-subagent-codex` is already the integration. It returns the worker's final answer rather than replaying all commentary/tool activity to the parent. Uses native Codex auth/config and consumes Codex usage; not an automatic cost-saving setting. Keep cloud delegation an explicit choice. |
| 7 | Session reminders | `dsh-schedule` and UI package installed, but scheduler row absent and UI disabled | “Check this again in 20 minutes” in the same conversation | Compose stock schedule and UI. The new release's schedules are durable, but delivery requires a live root agent; closed-session reminders wait until resume. Not a substitute for Windows machine-start or memory-snapshot tasks. |
| Conditional | Experimental Agent Teams | Packages not installed | Shared teammate roster, mailbox and task board when a concrete task requires more than current subagents/workflows | Do not enable merely to have another orchestration layer. The new team mode changes the exposed delegation tools; preserve existing capabilities when designing any optional preset. |

The first three address repeated context work, coding precision, and missing interaction capability. Their likely value is a hypothesis from the stock contracts, not a measured local speed or quality gain. No benchmark was run merely to justify this review.

## Existing capabilities to keep using, not rebuild

| Capability family | Current conclusion |
|---|---|
| Agent loop, retries, cancellation, sessions and persistence | Already stock. Our deployment does not replace these engines. |
| LM Studio model adapter and selection | Stock PI-AI adapter plus local configuration. No new LLM adapter required. |
| Files, searches, PowerShell, background jobs | Stock tools mounted by the local preset. Preserve the current Windows composition. |
| Compaction, token meter, result pruning, spill and checkpoints | Stock implementations already composed. Recent tuning changed values, not the algorithms. |
| Skills, goals, TODOs, plans and questions | Already provided by stock packages. Reddit research is custom skill content on the stock loader. |
| Web search/fetch and MCP tool execution | Wigolo and reference-memory use the stock MCP client. Native web tools are present as fallback; provider availability still matters. No generic MCP client is missing. |
| UI, deliverables, attachments, workspace, jobs, settings and plugin catalog | Stock Web supplies these. Reuse its APIs and extension points whenever another custom feature is proposed. |
| SDK, headless, ACP and SSH | Existing upstream integration surfaces. No second agent runner should be built to expose these protocols. Enable/install only for an actual use case. |
| Telemetry, approval, sandbox and permissions | Existing mechanisms, not a new work request. This review does not change access or add hardening/compliance work. |
| Dynamic Cordis and alternate providers/storage | Extension options, not reasons to build an additional runtime or enable everything. |

## Did we recreate something unnecessarily?

**Yes, some settings plumbing overlaps stock functionality. No, Mission Control as a whole is not a replacement implementation of DSH.**

The strongest verified overlap is in `mission-control.mjs:3881-3887`: seven edits to the live settings document (default/brain/worker context and output caps, plus provider idle timeout) use our line-oriented YAML editing. Stock settings services already provide namespace/schema-aware reads and mutations, including PI-AI user overrides. Those stock APIs should have been investigated first. A future internal refactor can consume them while preserving the interface.

However, the first reviewer recommendation to replace the whole Settings editor was too broad and was rejected during lead review. Five other values at `mission-control.mjs:3888-3892` belong to the preset composition: compaction threshold, retained fraction, summary cap, normal retries and overflow retries. Stock `settings.mutate` edits settings namespaces, not that preset YAML. It also does not synchronize our repository/recovery copies, manage LM Studio alias files, or supply the complete multi-file transaction. There is no established drop-in replacement for all of this page. Preserve its controls and those required behaviors.

| Custom area | Honest assessment | Direction |
|---|---|---|
| Settings editing | Partial avoidable implementation overlap, plus necessary Halo-specific preset/recovery work | Use stock settings APIs internally where they actually cover the values. Retain the interface, compaction edits, validation and synchronization. No removal authorized. |
| Sessions page | Additional presentation over `session/list` and stock cancellation, not another session engine | Keep the requested dashboard. Do not implement another persistence/agent lifecycle underneath it. Reuse stock API fields and native session detail. |
| Plugins page | Additional presentation over `pluginInventory/list`, with Halo override and machine-health annotations | Keep the full requested inventory. Reuse stock inventory/configuration APIs; improve scope labeling if later authorized. Do not add another plugin registry. |
| Local model load/unload, residency, GPU/RAM, LM Link and role checks | Distinct machine integration; stock model-route settings do not load LM Studio weights or describe Halo hardware | Preserve. |
| Unified Chrome launcher, DSH/Wigolo/Mission Control lifecycle | Distinct deployment integration; DSH's launcher does not manage the whole Halo process set | Preserve the thin orchestration around stock startup. |
| External memory graph and Windows snapshots | Distinct view and recovery mechanism for the MCP memory server | Preserve. DSH session recall and same-session schedules do not replace it. |
| Reddit RSS/Redlib skill | Source-specific procedure/parser, not a second skill framework | Preserve stock discovery/execution and the custom research content. |
| Model tuning | Uses runtime settings and stock compaction/preset configuration | Necessary configuration work; no rewritten inference engine. |

Nothing was deleted or disabled in response to this assessment. This review does not retroactively validate all retired work or every historical commit; its duplication findings apply to the active deployment and canonical integration code.

## Corrections to the supplied engineering report

1. Its core compose-before-build principle is right, but its revision is not the running deployment. Repository counts cannot substitute for the live host/preset inventory.
2. The MCP tool-client uncertainty is incorrect as a build gap for this machine. Two active `@deepseek-ai/dsh-mcp-client` rows already connect Wigolo and reference memory. The alpha adds resource functionality and updates the client protocol handling; it does not make our existing tool invocation a missing capability.
3. Browser use is broader than Stagehand in the released alpha: stock experimental Chrome DevTools MCP and Playwright MCP providers exist. Computer-use providers also exist. Do not build substitutes because the report's matrix omitted them.
4. External Codex delegation is already an upstream package and a dormant preset option here. “Cross-product delegation” is not automatically a new provider project.
5. Ralph's upstream disabled default is not our active local-preset setting. Workflows and local subagent controls likewise already exist here. Availability is not proof of actual use or successful work.
6. Session-local scheduling does not mean no persistence: the new release documents durable reminders, with live-root-agent delivery and no external notification channel.
7. Package presence does not establish a Windows provider, configured credentials, exact tool visibility, or tested success. Persistent shell pieces illustrate this distinction.

## Upgrade implications before enabling more

An upgrade is worthwhile to evaluate because it brings browser/terminal integration, session restoration improvements, MCP updates and subagent fixes. It is not an unqualified version-string change.

- The local preset currently names `@deepseek-ai/dsh-workflow-worker-thread` at lines 234-237. The new release replaces that executor with `@deepseek-ai/dsh-workflow-ptc`, renames the PTC runtime family and changes execution semantics. Migrate the preset using the release's own composition.
- Preserve the deliberately configured local Ralph capability; do not inherit a silent removal from a new default. Experimental team mode changes delegation tool names and is a separate optional choice.
- Check our read-only session projections and recovery readers against the changed session/event contracts. An old fallback decoder working on old logs is not new-release compatibility proof.
- Use stock settings/model APIs for the settings fields they cover. Preserve preset editing, LM Studio profiles and recovery guarantees that are outside those namespaces.
- Keep both approved models, context settings, Wigolo, reference memory, Reddit skill, launchers, and every requested Mission Control function. Verify representative operations after a later authorized migration rather than rebuilding those functions.

## Delegation, review and usage

The OpenAI multi-agent skill was applied in `OPENAI_ONLY` / `OPEN_MULTI_AGENT` mode. Runtime logs confirmed Astra (`gpt-6-astra`, high) as lead, Luna (`gpt-5.6-luna`, medium) for the inventory, and Terra (`gpt-5.6-terra`, medium) for duplication review. Workers received fresh, bounded briefs, not the full conversation. No local model was called by this review.

Luna delivered the complete live host inventory and useful scope distinctions. Lead review accepted these, but replaced its stale-checkout package comparison with an independently generated exact-release comparison (283 source package manifests, not the older checkout's 236). Terra identified real settings overlap; lead review required one focused correction because a wholesale editor/page replacement would lose requested functionality and exceeded stock API coverage. The final recommendations above incorporate that correction; the uncorrected removal recommendations were not adopted.

Serial GPU tests in the prior tuning work had a legitimate reason not to compete for the same inference resources. That did not require every inventory, documentation and source-analysis step to remain on the lead. The workflow should have delegated suitable bounded work earlier. More agents do not automatically save usage: review, context, retries and coordination still count. The skill's read-only usage analyzer was used; a timestamped checkpoint is retained with the evidence, without converting tokens into account-quota or price claims.

No broad runtime regression suite was repeated for a documentation/source review. Checks performed: live inventory retrieval; installed package/version comparison; release-tag source inspection; settings API scope review; full 158-row export; completed-tuning Git diff check and successful push verified against the remote. The later review/standing-rule commit is recorded in Git history. Plugin activation and upgrade acceptance remain future work, not claims made by this report.
