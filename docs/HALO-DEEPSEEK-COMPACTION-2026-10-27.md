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

The change is documented in the repo history and current configuration records, with synchronized reading/recovery copies under Halo Stack Research. The scoped source/configuration/documentation update is to be pushed to `master`; no new release or tag was requested. Private backups, diagnostics and runtime files are excluded.

No provider/model-generation tokens were used for this change. Exact coordinator input/output/cached token accounting is unavailable through this turn's tools; it is not reported as zero.
