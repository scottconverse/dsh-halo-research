> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Halo Web DSH implementation


## Active Web DSH configuration — 2026-10-01

Web DSH now starts with Fast-first local: Qwen3.6 35B UD-Q6_K implements directly, High reasoning by default; Qwen3.8 27B Q6_K is the one permitted fallback, Medium reasoning, after observed failure. Both use 65,536 context and one lane, with 16,384 maximum output tokens. The fallback uses MTP depth 4 and continuation 0.2; the 35B uses no MTP. Both use maximum GPU offload, flash attention, F16 KV, 512 logical/physical batch, mmap and keep-in-memory disabled.

New aliases: halo/qwen3.6-35b-a3b-q6 and halo/qwen3.8-27b-q6-fast. Resident identifiers: halo-fast-35b-q6 and halo-fallback-27b-q6. Old aliases, old picker routes and Desktop DSH configuration remain available/unchanged. New Web sessions use web-fast; saved sessions retain their selections. Standard Web launcher loads this pair. It retains the pre-existing behavior of replacing unrelated resident local models when launched in local mode; cloud startup preserves residency.

This is a usable deployment, not a proven coding-quality winner. Both models passed effort/tool qualification; 35B Q6 passed all 18 near-8K/32K/60K cold/warm engine calls. Baseline pairing failed both bounded coding tasks; candidate coding tasks were not run because Scott stopped the benchmark and requested immediate deployment. No compaction or two-lane claim follows.

Rollback and exact change list: C:\Users\scott\Documents\Codex\2026-10-01\dsh-windows-study\deployment-backup and deployment-changes.json. Pilot evidence: PILOT-REPORT.md in that same directory. No Windows security, driver, BIOS or Desktop changes.

## Web and Desktop cleanup — 2026-10-01

This section supersedes the earlier October 1 full-tool Web deployment description.

| Setting | Web fast-first | Desktop local |
|---|---|---|
| Default | Qwen3.6 35B Q6, High | Qwen3.8 27B Q4, Off |
| Context | 65,536 per resident model | 131,072 |
| Default output limit | 16,384 | 16,384 |
| Optional Q6 | 27B fallback, Medium, 24,576 output | Tuned 27B Q6, Medium provider default, 24,576 output |
| Fresh-session tools observed | 25 | 27 |
| Compaction threshold | 70% | 70% |
| Retention | 55% | 25% for local; other presets retain their own values |
| Explicit headroom | Unsupported by installed Web version; 70% leaves about 19.7K below 64K | 8,192 |
| Summary output limit | 8,192 | 8,192 |

Web reuses the existing lean preset and stock subagent spawn/control/list plus session search/trace/read tools. The fallback is for observed failure, not automatic delegation on every task. Basic web_search/web_fetch are loaded; an available schema does not guarantee search-provider credentials. Wigolo MCP is disabled in Web host composition and remains available through the optional-tools skill/CLI. Desktop keeps its existing reduced tools and on-demand Wigolo. No computer-use installation was made.

Desktop launch refresh now preserves Q4 Off instead of writing Medium. The generic Q6 route and temporary study aliases are hidden from its generated picker; the tuned Q6 route remains. No weights were deleted. Desktop launch does not load or unload models. Web's existing local launcher still establishes its two-model pair, so do not launch that local loader during another application's active local generation. Cloud-default Web startup preserves residency.

Model load tuning is preserved: Q4/Q6 131K aliases use one lane, maximum GPU/KV offload, flash attention, F16 KV, no mmap or memory lock, MTP depth 4. Q4 retains continuation 0.5: the saved paired comparison found no meaningful benefit at 0.2. Q6 retains 0.2. Qwen Off maps to none; Low/Medium/Extra High retain low/medium/xhigh. Scoped sampling uses Off 0.7 temperature / 0.8 top-p / 1.5 presence penalty; thinking 1.0 / 0.95 / 0; top-k 20. Three existing sampling checks passed.

Shared Qwen route policy: stack/desktop-tuning/model-policy.json. Desktop catalog refresh reads its Q4 output limit; Web cleanup reads its fallback output limit. Separate defaults are intentional. Preserve the tuned Q6 provider block when refreshing. Other provider effort mappings were preserved, not invented or re-benchmarked in this cleanup.

Verification evidence: C:\Users\scott\Documents\Codex\2026-10-01\dsh-windows-study\cleanup-verification.json. Both checks are fresh sessions in the actual running Web and native Desktop hosts, not separate benchmark servers. They repair a one-line function and run two assertions. This establishes route/tool/edit/test operation, not coding superiority or compaction endurance. Web exposes 24,616 serialized schema characters; Desktop 20,754. The larger Web tool count than the historical 13 is intentional: it includes basic web and stock supervision/history tools.

Rollback originals and deployment list: cleanup-backup and cleanup-changes.json in that study directory. Recovery copies below include every changed deployed file. No driver, BIOS, Windows security, global LM Studio preference, or model-weight change.
