# DeepSeek automatic compaction across Web and Desktop - October 27, 2026

## Change

Every configured Web and Desktop preset now has an exact-route automatic-compaction override:

```yaml
modelPolicies:
  - provider: ollama
    model: deepseek-v4.1-flash:1017-cloud
    thresholdRatio: 0.7
```

The override is present in all four Web presets (`fast-first`, `local`, `local-codex`, `local-lean`) and all three Desktop presets (`local`, `local-codex`, `local-lean`). Installed profile patches, installed per-preset agent files, canonical source profiles and canonical per-preset templates were updated together: 18 configuration files, containing 28 compaction blocks across source and deployment copies. No historical snapshots or rollback configurations were rewritten.

DSH 0.2.1-rc.3's installed compaction implementation supports `modelPolicies` and merges exact provider/model overrides over preset defaults. The existing text-only compaction wrapper also reads the same exact-route threshold override. No engine code or dependencies were changed.

## Preserved settings and behavior

- DeepSeek remains the selected default in both installed profiles: `ollama / deepseek-v4.1-flash:1017-cloud`, Low effort, 1,048,576-token configured context and 65,536-token normal response limit.
- The 70% threshold is 734,003 tokens, rounded down. DSH checks context pressure between steps. Its output/headroom budget can impose an earlier trigger, but does not do so for the current DeepSeek context/output settings.
- Only this exact DeepSeek route receives the override. Web's other models keep their existing preset thresholds, including 80% in its three non-default presets; Desktop's other models keep their existing 70% thresholds. Those global `thresholdRatio: 0.8` lines remain intentionally present in Web and are overridden for DeepSeek only.
- Existing automatic-compaction enablement, headroom, retention ratios and 8,192-token summary caps were preserved. The summary cap does not change the model's 64K normal-response limit.
- Models, default selections, providers, permissions, plugins, skills, Wigolo, Reddit/Redlib, XERJ and application connections were not changed. No launcher or shortcut changes were needed.

## Evidence and scope

Read-only inspection confirmed the installed engine's supported override syntax before editing. Saved-file readback found four DeepSeek policies in Web and three in Desktop, with Low/1M/64K unchanged. The source diff adds only the four-line exact-model policy to each compaction block. Private original-file backups and the target mapping are retained in the dated Codex task folder outside Git.

Per Scott's instruction, no tests, compaction jobs, inference requests, benchmarks or subagents were run. Neither app was restarted and no active job was interrupted. This record establishes the installed and canonical saved configuration; it does not claim live compaction acceptance, nor prove that an already-mounted session has reloaded its preset. An existing session retaining an older mounted configuration needs its ordinary preset/application reload while idle before the new policy can be assumed active. No session history or saved session model was rewritten.

## Delivery and accounting

The change is documented in the repo history and current configuration records, with synchronized reading/recovery copies under Halo Stack Research. The scoped source/configuration/documentation update was pushed to `master` as `05219f2`; no new release or tag was requested. Private backups, diagnostics and runtime files are excluded.

No provider/model-generation tokens were used for this change. Exact coordinator input/output/cached token accounting is unavailable through this turn's tools; it is not reported as zero.
## Idle activation - October 27, 2026, 12:54 PM MDT

At Scott's request both applications were reloaded after confirming they were idle. Web's connected, current Mission Control stream showed no active jobs or queued inputs. Desktop's live runtime showed zero running agents, zero queued inputs and no running/stopping background jobs. No work was interrupted.

Web was stopped and started with the existing stock launcher scripts. New Web PID 10636 started at 12:54:13 MDT; Mission Control PID 50820 started at 12:54:19. The status stream reconnected and reported current data. Desktop quit gracefully through Electron app.quit (its background instance had no window-close handle), then launched through the existing Desktop shortcut. New application PID 22784 and host PID 47524 started at 12:54:59; the DeepSeek Harness window is responding. Startup logged the existing DeepSeek cloud default and unchanged local model residency.

Post-reload profile readback retains all four Web and three Desktop DeepSeek 70% policies, Low effort, contextWindow 1048576 and maxTokens 65536. Desktop's profile SHA-256 was identical before and after launch: 23F1CBF7A10777C30E7AB146B28803CFAABFBC0293D092F6D2276CC1FDA2952E. The new hosts started with the updated profile and preset files. No configuration, launcher, integration or session-history changes were made during activation.

No tests, model calls, synthetic sessions or compaction runs were performed. This is restart/configuration activation evidence, not a new end-to-end compaction test. Temporary runtime inspection was closed; no inspection listener was left behind.
