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
5. starts or reuses DSH and its Wigolo MCP child;
6. promotes the tested Mission Control build into `C:\Users\scott\.dsh-stock\mission-control`; and
7. opens Mission Control at `http://127.0.0.1:3090` in Google Chrome.

Repeated launches reuse healthy DSH and Mission Control processes. The **Stop DSH + Wigolo** shortcut stops Mission Control, DSH, and the Wigolo child process. LM Studio and the approved models stay resident.

## Mission Control

Mission Control is the operator surface for the stock Halo deployment. Its seven tabs preserve the complete earlier console feature set:

- **Overview** shows stack health, active work, throughput, alerts, and common actions.
- **Models** joins the downloaded LM Studio catalog to the exact resident model instances and provides guarded load and unload controls.
- **Sessions** groups DSH sessions by workspace, shows context and activity, and can stop one selected session.
- **Plugins** shows the complete current Cordis inventory, phases, overrides, and failures.
- **System** shows RAM, GPU pools, disk, runtime versions, configuration validation, and recent LM Studio logs.
- **Memory** visualizes the optional Halo memory store, writer health, recovery task, and snapshots.
- **Settings** exposes a bounded editor for the approved model, compaction, retry, and stream-timeout settings.

The status strip treats missing or stale evidence as unavailable or degraded. Persistent Halo memory is not configured in the stock deployment today, so the Memory tab must report that fact; it does not create an empty store or present missing memory as healthy.

Mutation routes use a random per-launch Mission Control token and exact loopback-origin checks. DSH's launch token and authentication cookie stay on the local server side and are not returned through the dashboard, history, receipts, or logs.

## Search behavior

Wigolo is the first provider for search, page retrieval, and research. The agent makes at most one revised Wigolo attempt when a result is empty. It then uses DSH's native web tools after an MCP availability failure, timeout, or lack of usable evidence.

Native `web_fetch` is keyless. Native DeepSeek `web_search` requires a `DEEPSEEK_API_KEY`; without that credential, it remains visible but reports a structured credential error. Secrets belong only in the ignored local `stack/stock-dsh/.env` file or the DSH credential store.

## Active files

- `stack/stock-dsh/settings.yaml` — model identities and per-model capacities
- `stack/stock-dsh/cordis.patch.yml` — Wigolo MCP connection
- `stack/stock-dsh/local-preset/agent.cordis.yml` — agent tools and provider preference
- `stack/stock-dsh/Start-StockDSH.ps1` — verified model and service startup
- `stack/stock-dsh/Stop-StockDSH.ps1` — scoped shutdown
- `stack/stock-dsh/mission-control/` — dashboard, installer, lifecycle helpers, acceptance checks, and feature-parity contract
- `stack/Launch-Halo.ps1` — compatibility entrypoint for the existing shortcut

Older research reports and inactive experiments are preserved in Git history and the pre-cleanup tag. The supported deployment boundary is `stack/stock-dsh`.
