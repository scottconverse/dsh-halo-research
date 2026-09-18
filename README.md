# DSH for the Halo workstation

This repository maintains the local DeepSeek Harness deployment used on the Halo Windows workstation. The supported runtime is stock DeepSeek Harness with a small, reviewable machine profile under `stack/stock-dsh`.

## Supported stack

- DeepSeek Harness `0.1.6-alpha.1`
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
7. opens Mission Control and the authenticated DSH page as two tabs in Google Chrome.

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

For Reddit and subreddit research, the local preset directs the agent to load the bundled `reddit-search` skill and follow its RSS/Redlib workflow. For other search, page retrieval, and research, Wigolo is the first provider. The agent makes at most one revised Wigolo attempt when a result is empty. It then uses DSH's native web tools after an MCP availability failure, timeout, or lack of usable evidence.

Native `web_fetch` is keyless. Native DeepSeek `web_search` requires a `DEEPSEEK_API_KEY`; without that credential, it remains visible but reports a structured credential error. Secrets belong only in the ignored local `stack/stock-dsh/.env` file or the DSH credential store.

## Reddit research skill

The local DSH preset discovers the repository-owned `reddit-search` skill from
`stack/stock-dsh/skills`. Ask DSH to use the Reddit research skill for community
experience or explicitly select it from the skill menu. Its instructions use
Reddit RSS for discovery and optional local Redlib for full posts and comments.
The skill is not an MCP server and does not change the general search provider.

The parser requires Python 3.10 or newer, uses only the standard library, and
handles UTF-8 on Windows. The optional native Redlib scripts use PowerShell 7;
on this machine Redlib is installed under `%LOCALAPPDATA%\RedditSearch\Redlib`
and listens at `http://127.0.0.1:18080`. Check both its local health and a
Reddit-backed request before treating it as usable. Installation and lifecycle
instructions are bundled in the skill's `references/windows-redlib.md`.
DSH's start/stop shortcuts do not manage Redlib.

The skill folder, parser, Windows lifecycle scripts, references, and regression
fixtures are versioned together. Run its checks with:

```powershell
python -m unittest discover -s stack/stock-dsh/skills/reddit-search/scripts/tests -v
```

For recovery, restore the repository to its documented Windows path and copy
`stack/stock-dsh/local-preset/agent.cordis.yml` into
`%USERPROFILE%\.dsh-stock\.agent-presets\local\agent.cordis.yml`.
If the repository is relocated, update `customSkillDirs` in that preset.
The repo copy takes priority over the shared user skill of the same name.

For substantial implementation tasks that benefit from separate coding and review roles, the repository also includes the [pairing-team skill](stack/stock-dsh/skills/pairing-team/SKILL.md) and its [coder handoff template](stack/stock-dsh/skills/pairing-team/references/HANDOFF.md). It uses DSH's existing delegation tools and does not enable providers or grant release authority.

## Deployment files

- `stack/stock-dsh/settings.yaml` — model identities and per-model capacities
- `stack/stock-dsh/cordis.patch.yml` — Wigolo MCP connection
- `stack/stock-dsh/local-preset/agent.cordis.yml` — agent tools and provider preference
- `stack/stock-dsh/skills/reddit-search/` — Reddit research instructions, parser, and optional native Redlib lifecycle
- `stack/stock-dsh/Start-StockDSH.ps1` — verified model and service startup
- `stack/stock-dsh/Stop-StockDSH.ps1` — scoped shutdown
- `stack/stock-dsh/mission-control/` — dashboard, installer, lifecycle helpers, acceptance checks, and feature-parity contract
- `stack/Launch-Halo.ps1` — compatibility entrypoint for the existing shortcut

Older research reports and inactive experiments are preserved in Git history and the pre-cleanup tag. The supported deployment boundary is `stack/stock-dsh`.

## September 15 stock upgrade

The [alpha upgrade guide](docs/DSH-ALPHA-UPGRADE-2026-09-15.md) covers history search, TypeScript/Python navigation, Chrome interaction, persistent PowerShell and the stock Terminal panel, optional native Codex delegation, and the optional Gemini connection. The existing local coder remains the default.

For the current provider and delegation options, including authentication and access caveats, see the [DSH provider setup guide](docs/DSH-PROVIDER-SETUP.md).
