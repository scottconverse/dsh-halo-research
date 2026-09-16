# Optional lean coding preset

DSH now offers **Local coding — lean** (`local-lean`) alongside **Local models** and **Local + Codex (opt-in)**. Local models remains the default. This applies the useful Tau idea—less tool and prompt overhead—to the existing harness. Tau itself is not installed.

## Use it

In DSH, click **New session**, open the **Local models** preset selector above the message box, and choose **Local coding — lean**. Select your workspace and model as usual, then describe the coding task. No slash command or separate application is needed. The option was verified in Chrome's live DSH interface.

Use **Local models** for work needing Wigolo, Chrome interaction, persistent knowledge memory, history search, workflows or delegation. Choose **Local + Codex (opt-in)** when you explicitly want Codex delegation. Existing sessions retain their existing preset. To go back, start a session with Local models.

Lean provides 13 model-facing tools on Windows: `read`, `read_image`, `write`, `edit`, `glob`, `grep`, `pwsh`, `lsp`, `skill`, `ask_user_question`, `job_list`, `job_output`, and `job_kill`. Background-job controls let the model collect or stop work it started through PowerShell. Project instructions and skill discovery remain active. Stock compaction stays at 80%, retaining 55%, with an 8,192-token summary budget and the existing tool-result pruning settings.

The approved models, 131,072-token context, permissions, host services and existing presets are unchanged. The local model selected at test time was `halo-brain-35b` (Qwen3.6 35B-A3B), reasoning off. No model-selection setting was written by the test.

## What was implemented

- Canonical composition: `stack/stock-dsh/local-lean-preset/agent.cordis.yml`.
- Live directory: `C:/Users/scott/.dsh-stock/.agent-presets/local-lean/`.
- Display metadata: `preset.yml`.
- Small preset-local Cordis adapter: `tool-catalog.mjs`, using stock `system-prompt/assemble`.

The coding, shell, LSP, skill and compaction implementations are stock DSH plugins. The adapter removes MCP schemas and their prompt sections only from this preset's outgoing model request. Merely omitting MCP rows from a preset does not remove host-global tools; Chrome additionally registers its tools directly in each agent's scope. A first inherited-tool mask therefore left Chrome visible, and was replaced before final acceptance.

Native tool presentation is explicit, so a future host PTC setting cannot insert the full SDK catalog into the lean prompt. The adapter does not replace the tool registry or providers and is not a permission boundary. Hidden tools remain registered, and the shell still has the existing local access. Host MCP/browser infrastructure may still initialize; the measured saving is model-request overhead, not proof of lower daemon resource usage.

## Observed result

Both presets received the identical interval-merging bug-fix prompt, in fresh sessions, serially, with the same original files and selected local model. No follow-up coaching or manual patch assistance was supplied. The task required LSP lookup, file inspection/editing and PowerShell test execution.

| Measurement | Local models | Local coding — lean |
|---|---:|---:|
| Tool schemas sent | 91 | 13 |
| DSH estimated tool-definition tokens | 25,122 | 3,290 |
| Exact serialized tool-schema bytes | 100,658 | 13,174 |
| Completed task elapsed time | 149.366 seconds | 48.449 seconds |
| Model steps | 10 | 6 |
| Cumulative input tokens reported | 304,670 | 34,626 |
| Output tokens reported | 1,814 | 909 |
| Independent final test result | 4/4 pass | 4/4 pass |

The schema-token reduction is **86.9%**. The elapsed times are observations from one fixture, not a general speed claim. Cache and language-server warmth were not controlled. The full run also needed to correct its first patch after tests failed; lean's first patch passed. Cumulative input includes repeated context across model calls, not unique context length or Codex subscription consumption.

The final lean run resolved the definition to `ranges.ts:2:17`. All checks passed for numeric sorting, overlapping/touching/nested intervals, empty/disjoint input, and avoiding mutation or shared output arrays. The lead independently reran the tests.

A separate check uses the actual installed DSH registry and prompt service: only lean loses MCP schemas; the full/global catalogs and instructions remain; late registration is handled; rebinding the session to full restores its complete catalog. This check is `stack/stock-dsh/local-lean-preset/tool-catalog.test.mjs`, executable with Node against the installed DSH home. It is not a live research/browser call.

[Evidence and fixture](evidence/lean-preset-2026-09-15/results.json) preserve the prompt, session IDs, model identity, tools, LSP results, usage and outcomes. One Luna worker inspected stock APIs and reviewed the chosen hook. Worker token usage was not exposed; it is recorded as unknown.

## Recovery and maintenance

Copy the canonical `local-lean-preset` directory contents into `.dsh-stock/.agent-presets/local-lean`. Stock discovery picks up new preset directories without restarting DSH. The live services were not restarted for this addition. Existing sessions keep their mounted composition; use a new session for a changed preset.

The desktop research folder contains synchronized instructions and a recovery copy. Existing full presets and the host overlay are not edited by this feature. Future changes to compaction or common coding rows must also be deliberately applied to this separate composition; Mission Control's existing local-preset editor does not automatically synchronize it.
