> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Halo Mission Control on stock DSH — implementation record

Date: September 14, 2026, America/Denver.

## Outcome being delivered

Mission Control is being restored as a first-class part of the supported stock DSH deployment. The port preserves the full earlier operator surface while replacing obsolete DSH paths, endpoints, authentication assumptions, and lifecycle behavior with the current `0.1.5-rc.2` contracts.

The canonical source is `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\mission-control`. The supported launcher promotes a tested copy to `C:\Users\scott\.dsh-stock\mission-control` and serves it on `127.0.0.1:3090`.

## Source choice

The source of truth is the preserved Git version at tag `pre-stock-dsh-cleanup-2026-09-13`, formerly under `stack\mission-control`. It was newer and more complete than the older installed archived file and included the installation and acceptance machinery needed to prove a deployment.

This is a compatibility port, not a dashboard rewrite. All seven tabs, eight status signals, model/session/plugin/system controls, settings workflow, history, validation, and optional memory/recovery surfaces remain in scope.

## Current runtime contract

| Component | Current contract |
|---|---|
| DSH | `0.1.5-rc.2`, home `C:\Users\scott\.dsh-stock`, loopback port 3080 |
| Models | `halo-coder-q4km` default and `halo-brain-35b` optional; both 32,768 context and one parallel slot |
| Research | Wigolo over MCP stdio first; DSH native web search/fetch as bounded fallback |
| Memory | `reference_memory` MCP over stdio; `C:\Users\scott\.dsh-stock\memory\memory.json` |
| Mission Control | Loopback port 3090; canonical/tested source promoted into the live DSH home |
| Browser | Google Chrome only |
| Stop scope | Mission Control, DSH, and exact Wigolo child tree; LM Studio/models remain resident |

## DSH API adaptation

The old console's unauthenticated and dot-named API assumptions are removed. The current port uses:

- `pluginInventory/list` for the point-in-time Cordis inventory;
- `agentPresets/list` for preset health and names;
- `session/list` with its required `_request` wire argument;
- `session/cancel` with an exact session request and accepted result; and
- `session/control` over the authenticated `/api/remote.mux` WebSocket for live queue and job state.

DSH accepts its launch token at the root page and returns an HttpOnly, authority-bound cookie. Mission Control performs that exchange server-side, keeps the cookie in memory, retries authentication after a restart or 401, and removes launch credentials from diagnostics. The browser receives only Mission Control's separate random action token.

## Preserved operator surface

| Surface | Preserved behavior |
|---|---|
| Overview | Current health, role/route summary, active and stalled work, daily activity, throughput, alarms, and quick actions |
| Models | Catalog/resident join, quantization, context, TTL, size, and exact guarded load/unload controls |
| Sessions | Workspace grouping from authoritative `cwd`, title/goal, tokens, context pressure, performance, activity, and one-session cancellation |
| Plugins | Full inventory, filters, Cordis phase, overrides, descriptions, failures, waiting, and transitions |
| System | RAM, GPU pools, disk, versions, validation, memory list, and LM Studio output |
| Memory | Graph/list/detail, writer health, recovery task, and snapshots, with explicit unavailable/error states |
| Settings | Effective values, sources, context/compaction math, refusal rules, bounded editing, validation, backup, and apply result |

The eight independent status signals remain Harness, Models, RAM, Store, Context, Disk, Stream, and Config. A signal cannot become green from missing, stale, ambiguous, or uncorroborated evidence.

## Lifecycle integration

The **DSH + Wigolo** desktop shortcut becomes the single startup path for the supported stack. Startup:

1. verifies the LM Studio API and CLI;
2. removes models outside the approved pair;
3. repairs wrong model key, context, or parallel-slot loads;
4. starts or reuses DSH and the DSH-owned Wigolo stdio child;
5. runs the Mission Control installation gate when canonical and installed bytes differ;
6. starts or reuses the exact installed Mission Control build; and
7. opens Mission Control and the authenticated DSH page as two tabs in Google Chrome.

Mission Control restarts when the DSH process is newer so it can obtain current authentication. Repeated desktop launches do not create duplicate listeners.

The stop path verifies exact process identity before termination, then checks ports 3080 and 3090. It also removes only an exact orphaned Wigolo MCP process. LM Studio and its approved models are deliberately left running.

## Settings and memory boundaries

The Settings editor is limited to approved model context/output values, compaction threshold/retain/summary/retries, overflow retries, and LM Studio stream idle timeout. Unknown keys and unsafe math are rejected. When both DSH documents change, they are staged, validated, backed up, and replaced as one transaction.

Persistent Halo memory is configured through the `reference_memory` MCP and uses `C:\Users\scott\.dsh-stock\memory\memory.json`. Mission Control reads that exact store and validates the active writer, the complete `HALO Memory Snapshot` task definition, and current snapshots. The snapshot script still treats a missing store as an honest no-op and never creates or seeds one.

## Canonical files

- `stack\stock-dsh\mission-control\mission-control.mjs`
- `stack\stock-dsh\mission-control\FEATURE-PARITY.md`
- `stack\stock-dsh\mission-control\INSTALLATION.md`
- `stack\stock-dsh\mission-control\Install-HaloMissionControl.ps1`
- `stack\stock-dsh\mission-control\Launch-Status.ps1`
- `stack\stock-dsh\mission-control\Stop-MissionControl.ps1`
- `stack\stock-dsh\mission-control\Test-HaloMissionControlLive.ps1`
- `stack\stock-dsh\mission-control\Snapshot-HaloMemory.ps1`
- `stack\stock-dsh\mission-control\Install-HaloMemorySnapshotTask.ps1`
- `stack\stock-dsh\Launch-StockDSH.ps1`
- `stack\stock-dsh\Start-StockDSH.ps1`
- `stack\stock-dsh\Stop-StockDSH.ps1`

## Required release proof

The final release must record all of the following against the final committed bytes:

- final commit and `stock-dsh-v0.3.0` tag;
- Mission Control source SHA-256;
- deterministic test count and result;
- parse result for every lifecycle PowerShell script;
- install receipt path and SHA-256;
- installed-copy hash equality;
- live acceptance count and structured result;
- observed DSH, LM Studio, model, plugin, session, system, settings, and memory states;
- Chrome walkthrough result; and
- recovery-copy manifest result.

## Completed release evidence

- Focused contracts: 123 passed, 0 failed.
- Lifecycle PowerShell: every shipped script parsed successfully.
- Mission Control source SHA-256: `079729CF086E6C557EB79300BC076D4BD563D6B9D439BF9F416BC73B1D430437`.
- Installed-copy SHA-256: `079729CF086E6C557EB79300BC076D4BD563D6B9D439BF9F416BC73B1D430437`.
- Install receipt: `C:\Users\scott\.dsh-stock\mission-control\backups\install-20260914-135354-758-13e11178.json`.
- Receipt SHA-256: `6A7B91F29E0C2141DDBF8456DD05ED57D72CF002C5E2458F012B71E8BC11F7B4`.
- Required-memory live acceptance: 216 passed checks, 0 failures; evidence is `stack\stock-dsh\mission-control\live-acceptance-stock-dsh-v0.3.0.json`.
- Runtime: DSH `0.1.5-rc.2` on 3080, LM Studio on 1234, Mission Control on 3090, and the exact Wigolo MCP child active under DSH.
- Models: `halo-brain-35b` and `halo-coder-q4km`, each at 32,768 context and one parallel slot.
- Plugins and sessions: 157 plugin entries, 130 active, 0 failed, 0 stuck; 26 sessions read from the DSH API.
- Memory: a DSH session wrote the `Halo DSH Deployment` entity through `reference_memory`; a fresh session retrieved its two observations; Mission Control rendered them; the scheduled task produced a hash-matching recovery copy.
- Chrome walkthrough: the authenticated DSH page retrieved persistent memory in a fresh session, and Mission Control displayed the live entity and its observations.
- Release commit: `342d0a5ac782c731bdef16324c9a3f51ebb18281`.
- Release tag: `stock-dsh-v0.3.0`.
- Published release: https://github.com/scottconverse/dsh-halo-research/releases/tag/stock-dsh-v0.3.0

## Deliberate limits

- Mission Control is local workstation software and listens only on loopback.
- Memory recovery is healthy only when the real store, active DSH writer, exact task definition, and current snapshot all agree.
- Plugin inventory is a snapshot and is labeled stale when refresh fails.
- Disk session scanning is a degraded fallback and cannot independently prove current work.
- Settings that DSH marks restart-only still require a controlled DSH restart.
- A successful HTTP response is not full acceptance; cross-source and browser verification remain required.
