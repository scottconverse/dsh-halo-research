---
name: deepseek-harness-model-routing-1024
description: Use the native model_route tool for explicitly authorized model calls, small batches, settings previews and routing receipts in DSH Web or Desktop.
---

# Model routing companion

Use the current session model for normal work. Do not change providers, launch
subagents, or make external calls without authorization covering that work.

The installed plugin exposes `model_route`:

- `operation: settings, model: <exact ID>` previews settings without inference.
- `operation: call, model: <exact ID>, prompt: <text>` makes one authorized call.
- `operation: batch, model: <exact ID>, promptFile: <JSONL path>` processes
  `{id,prompt}` items. Default concurrency is 2; these are independent calls.
- `operation: report` reads the local receipts.

Exact `deepseek-v4.1-flash:1017-cloud` defaults to **Low** and **65536 output
tokens** on both call and batch. Other models keep their own settings. Optional
`effort` and `maxTokens` are explicit overrides. Advertised 1M context remains
provider-managed; no `num_ctx` is sent. Only that cloud ID is allowed in batch.

Use `promptFile` for long inputs. For long authorized work set `background: true`,
then use DSH's native `job_output` / `job_kill`. DSH owns workspace, permissions,
cancellation and output limits. No automatic retry or model switching occurs.

The plugin delegates to the unchanged `scripts/route.ps1` CLI in this skill
directory. It does not govern normal chat settings or subagent defaults. If the
tool is unavailable, report that fact; the CLI remains available explicitly.
Receipts distinguish local weights from estimated cloud cost, not actual bills.
