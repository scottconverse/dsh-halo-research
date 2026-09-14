# DSH for the Halo workstation

This repository maintains the local DeepSeek Harness deployment used on the Halo Windows workstation. The supported runtime is stock DeepSeek Harness with a small, reviewable machine profile under `stack/stock-dsh`.

## Supported stack

- DeepSeek Harness `0.1.5-rc.2`
- LM Studio on `127.0.0.1:1234`
- Wigolo connected over MCP stdio as the primary research provider
- DSH native `web_search` and `web_fetch` exposed as fallback tools
- Full local Windows access through DSH's `danger-full-access` permission preset

The deployment uses two approved local models, each loaded at a verified 32,768-token context window with one parallel slot:

| Runtime identifier | Role | Input |
|---|---|---|
| `halo-coder-q4km` | Default coding and tool-using agent | Text |
| `halo-brain-35b` | Optional planning, synthesis, and vision | Text and image |

The 35B model is retained because its weights and 32K load envelope have passed earlier planner work. Stock-tool reliability has not been requalified on the simplified release, so the coder remains the automatic default.

## Start and stop

Use the **DSH + Wigolo** desktop shortcut. The launcher:

1. verifies the LM Studio server;
2. unloads resident models outside the approved pair;
3. reloads an approved model if its model key, context window, or parallel-slot count is wrong;
4. verifies the final two-model capacity envelope; and
5. starts DSH at `http://127.0.0.1:3080`.

The stop shortcut stops DSH and its Wigolo MCP child process. LM Studio and the approved models stay resident.

## Search behavior

Wigolo is the first provider for search, page retrieval, and research. The agent makes at most one revised Wigolo attempt when a result is empty. It then uses DSH's native web tools after an MCP availability failure, timeout, or lack of usable evidence.

Native `web_fetch` is keyless. Native DeepSeek `web_search` requires a `DEEPSEEK_API_KEY`; without that credential, it remains visible but reports a structured credential error. Secrets belong only in the ignored local `stack/stock-dsh/.env` file or the DSH credential store.

## Active files

- `stack/stock-dsh/settings.yaml` — model identities and per-model capacities
- `stack/stock-dsh/cordis.patch.yml` — Wigolo MCP connection
- `stack/stock-dsh/local-preset/agent.cordis.yml` — agent tools and provider preference
- `stack/stock-dsh/Start-StockDSH.ps1` — verified model and service startup
- `stack/stock-dsh/Stop-StockDSH.ps1` — scoped shutdown
- `stack/Launch-Halo.ps1` — compatibility entrypoint for the existing shortcut

Older research reports and inactive experiments are preserved in Git history and the pre-cleanup tag. The supported deployment boundary is `stack/stock-dsh`.
