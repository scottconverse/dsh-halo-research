# Mission Control feature-parity contract

This ledger defines the feature surface carried from the preserved Mission
Control at Git tag `pre-stock-dsh-cleanup-2026-09-13` into the stock DSH
`0.1.5-rc.2` deployment. It is a review and test contract, not a claim that a
live deployment has passed. Static and fixture tests must pass before install;
the installed service, browser, DSH, LM Studio, and recovery task still require
the separate live acceptance procedure in `INSTALLATION.md`.

The canonical source is `mission-control.mjs` in this directory. The runtime
root is `%USERPROFILE%\.dsh-stock`; the repository recovery source is the parent
`stock-dsh` directory. Nothing in this port may silently fall back to the
retired `%USERPROFILE%\.dsh` tree.

## Operator tabs

All seven old tabs remain present and retain their operator purpose.

| Tab | Preserved surface | Stock DSH 0.1.5 adaptation | Contract evidence |
|---|---|---|---|
| Overview | Service summary, route and resident roles, current work, daily activity, throughput, alarms, quick actions | Uses authenticated DSH inventory/session data and exact LM Studio resident identity; stalled work is corroborated from durable activity | `ui-contract`: labels, activity semantics, stale validation, action outcomes |
| Models | Downloaded catalog, resident instances, origin, quantization, context, TTL, size, load/unload controls | Joins `lms ls --json` to `lms ps --json` without merging devices or duplicate instances; exact identifiers drive mutations | `data-contract`: catalog identity; `ui-contract`: model action and confirmation contracts |
| Sessions | Workspace grouping, titles/goals, token use, context pressure, performance, running/stalled state, stop-one-session | Primary source is `session/list`; fallback reads authoritative `cwd` from the session header and preserves undecodable bucket names | `data-contract`: Typert wire names, stale state, fallback path; `ui-contract`: session surfaces |
| Plugins | Full inventory, filters, Cordis phase, overrides, descriptions, failure/waiting/transition detail | Primary source is `pluginInventory/list`; stale retained inventory is labeled last-known and cannot produce green health | `data-contract`: RPC contract; `ui-contract`: stale inventory and empty states |
| System | RAM, GPU pools, disk, versions, validation, memory list, LM Studio log tail | GPU/disk failures remain unknown/degraded rather than zero; validation is version-pinned and freshness-aware | `data-contract`: GPU/history/validation; `ui-contract`: watched-light behavior |
| Memory | Interactive graph, list/detail, writer health, scheduled recovery status, snapshots | Reads `.dsh-stock\memory\memory.json`; missing memory is honest unavailability, malformed or inconsistent records fail closed | `data-contract`: absent/malformed graph; `ui-contract`: graph lifecycle and status |
| Settings | Effective values, sources, compaction math, refusal rules, editable safe subset, apply result | Targets exact keys in `.dsh-stock\settings.yaml` and `.dsh-stock\.agent-presets\local\agent.cordis.yml`; changes to either document must be staged, validated, backed up, and committed together | `installer-contract`: settings refusal math; `ui-contract`: schemas, editor and dual-document route |

## Master status strip

The strip has eight independently computed signals. A signal may be green only
from current, trustworthy evidence.

| Internal key | Operator label | Green evidence | Amber/red causes retained from the old console |
|---|---|---|---|
| `HARNESS` | HARNESS | Cockpit reachable, current inventory, no failed/stuck fibers, no stalled sessions | Cockpit down; stale inventory; failed or stuck plugin; broken preset; session claims running without durable progress |
| `MODELS` | MODELS | LM Studio query succeeded and the configured route resolves to exactly one local resident | CLI failure; unreadable/ambiguous route; no models; route absent; huge-context load; role profile mismatch; fleet contention |
| `MEMORY` | RAM | GPU counters available and Windows/shared memory inside bounds | Missing counters; low free RAM; excess shared GPU memory |
| `STORE` | STORE | Valid graph, current active writer inventory, healthy task, timely snapshots | Memory missing, invalid or unreadable; writer absent/stale; task absent/failed; snapshots absent/overdue |
| `CONTEXT` | CONTEXT | Session context pressure below warning threshold | Warning at 70%; critical at 85% |
| `DISK` | DISK | Disk query succeeded with at least 150 GB free | Warning below 150 GB; critical below 50 GB; query failure |
| `STREAM` | STREAM | Authenticated `session/control` stream connected | Remote mux disconnected or retained stream data stale |
| `CONFIG` | CONFIG | Latest validation succeeded and remains current | Never validated; stale result; validation error |

Clicking a light opens the relevant tab. The machine-memory key is rendered as
`RAM` so it cannot be confused with the persistent model-memory store.

## Mission Control HTTP surface

All API responses under `/api/` are `Cache-Control: no-store`. Read routes are
loopback-only through the Mission Control listener. Every mutation requires the
per-boot Mission Control token plus an exact loopback Origin or Referer.

| Method and route | Purpose and response basis | Mutation/auth |
|---|---|---|
| `GET /` | Inline seven-tab app and per-boot action token | Read |
| `GET /api/status` | Consolidated current services, inventory, sessions, models, resources, validation, memory and build identity | Read |
| `GET /api/catalog` | Downloaded and resident model inventory | Read |
| `GET /api/settings` | Effective settings, sources, math and editable schema | Read |
| `GET /api/plugins` | Full plugin rows plus phase/freshness summary | Read |
| `GET /api/sessions?all=1` | Session list, source identity and daily aggregate | Read |
| `GET /api/memory-graph` | Parsed entities/relations or explicit unavailable/error state | Read |
| `GET /api/history?hours=N` | Bounded, timestamp-selected history for charts | Read |
| `GET /api/logtail?raw=1` | Newest LM Studio log tail; filtered unless `raw=1` | Read |
| `POST /api/validate-config` | Version-pinned DSH dump-config validation and freshness record | Required |
| `POST /api/action/load-model` | Validate catalog target, load, then corroborate residency | Required |
| `POST /api/action/unload-model` | Validate exact local resident, unload, then corroborate absence | Required |
| `POST /api/action/stop-session` | Cancel exactly one validated DSH session and require `{accepted:true}` | Required |
| `POST /api/action/apply-settings` | Validate/refuse unsafe changes and commit the settings/preset transaction with backups | Required |
| `POST /api/action/start-cockpit` | Start stock DSH while preserving Mission Control | Required |
| `POST /api/action/open-dsh` | Open the current authenticated DSH launch URL in explicit Chrome from the server; no launch token enters the Mission Control page or response | Required |
| `POST /api/action/load-q5` | Load the approved Brain profile | Required |
| `POST /api/action/load-worker` | Load the approved Worker profile | Required |
| `POST /api/action/unload-all` | Unload all LM Studio models after explicit confirmation | Required |

Unknown action names, including JavaScript prototype property names, must be
rejected rather than dispatched.

## DSH 0.1.5-rc.2 remote contract

Mission Control does not use the old unauthenticated/dot-named endpoints.

| Remote | Exact current wire shape used here |
|---|---|
| `pluginInventory/list` | Unary request with no arguments. Result is `{entries, agentPresets?}`. It is a point-in-time inventory, not a subscription. |
| `agentPresets/list` | Unary request with no arguments. Used for preset health and names. |
| `session/list` | Unary Typert payload `{args:{_request:{cursor?: string}}}`. Live verification established that omitting `_request` produces a missing-argument descriptor error. Result is `{items: SessionSummary[]}`. |
| `session/cancel` | Unary Typert payload `{args:{request:{sessionId}}}`. Success must contain `{accepted:true}`. |
| `session/control` | Logical stream opened over the authenticated `/api/remote.mux` WebSocket. The first frame is a baseline, followed by queue/job/projection deltas. |
| `session/follow` | Available current session stream; reserved for per-session follow detail when needed. |

Other current session remotes include `attachment`, `canOpenWorkspacePath`,
`create`, `fork`, `modelCatalog`, `openWorkspacePath`, `page`, `prompt`,
`rename`, `search`, `selectModel`, and `updateQueue`. They are not needed to
preserve this console's current feature set.

The current settings controller exposes `settings/describe`, `settings/update`,
`settings/replace`, `settings/mutate`, `settings/canOpenAgentPresetDirectory`,
`settings/openAgentPresetDirectory`, and `settings/openSettingsDocument`.
`settings/describe` returns namespace views with `schema`, `value`, layered
values, `applies` (`live` or `restart`), `secrets`, and `revision`. The DSH
controller redacts credential values. Mission Control's bounded two-file editor
is retained for compatibility and must not broaden its whitelist based on
untrusted schema fields.

## DSH authentication and secret handling

DSH 0.1.5 authenticates a browser process by accepting its launch token only
on `GET /?token=...`, then issuing an authority-bound, host-only, HttpOnly,
SameSite=Strict cookie. Query tokens on API routes and Authorization-header
tokens are not the current contract.

Mission Control therefore:

1. reads the current process launch URL from its environment or the current DSH
   launch log;
2. performs the root exchange server-side;
3. keeps the resulting cookie in memory;
4. sends it on every HTTP RPC and `/api/remote.mux` connection;
5. clears and re-exchanges it after a 401, disconnect, or DSH restart; and
6. redacts launch tokens and cookies from errors.

The DSH launch URL, cookie, `.credentials.yaml` contents, API keys and model
provider credentials must never enter the browser page, JSON APIs, history,
state, receipts, or logs. The only browser-visible authority is Mission
Control's own random per-boot mutation token.

## Settings write contract

The safe editable schema is explicit and bounded:

| Document | Keys |
|---|---|
| `.dsh-stock\settings.yaml` | default, Brain and Worker context windows; default, Brain and Worker maximum output; LM Studio stream idle timeout |
| `.dsh-stock\.agent-presets\local\agent.cordis.yml` | compaction threshold; retain ratio; summary maximum; compaction retries; overflow retries |

Every integer has a floor and ceiling; ratios must be strictly between zero and
one. The refusal math blocks a nonpositive window or summary budget, retain at
or above threshold, summary compression above 4:1, and stream idle timeout
below the machine's ten-minute lower bound. Unknown or inherited property names
are refused. Model-specific keys identify the exact approved alias, avoiding
the old first-match ambiguity when two `contextWindow` fields exist.

A successful apply requires unchanged source bytes, backups for every changed
document, staged writes, validation, and all-or-nothing replacement. A failure
must leave both originals intact. Repository copies remain recovery sources;
the UI must say when live values are ahead of the repository.

## Installer, launch, stop and recovery behavior

| Area | Preserved/adapted contract |
|---|---|
| Promotion | `Install-HaloMissionControl.ps1` hashes the exact source/tests, syntax-checks, runs the four canonical suites, rechecks hashes, stages the destination, preserves a verified backup, and writes an atomic receipt. |
| Reopen | `Launch-Status.ps1` verifies canonical/installed build identity, reuses a healthy service, refuses a wrong build, and explicitly opens Google Chrome. Repeated clicks do not start duplicate servers. |
| Startup | Stock DSH lifecycle supplies `.dsh-stock`, stock root and current launch authority to Mission Control. Mission Control startup never silently targets the retired tree. |
| Stop | Mission Control has its own narrow stop helper. The top-level DSH stop contract controls the stock DSH/Mission Control/Wigolo process set and does not unload LM Studio models unless that lifecycle explicitly says so. |
| Live acceptance | `Test-HaloMissionControlLive.ps1` validates receipt/source identity, auth rejection/acceptance, data parity, current evidence, and secret nonreflection. It is separate from fixture tests. |
| Memory snapshots | `Snapshot-HaloMemory.ps1` never creates a missing memory store, writes atomically, and retains the newest 168 canonical hourly snapshots. |
| Snapshot task | `Install-HaloMemorySnapshotTask.ps1` supports inert `-PlanOnly`, exact post-registration readback, hourly/startup triggers, missed-run recovery, overlap prevention and bounded retries under `.dsh-stock`. |
| Recovery | Mission Control keeps its bounded state/history and settings backups under `.dsh-stock`; install receipts and verified prior bytes provide rollback evidence. |

## Defect and migration ledger

| Defect from the preserved implementation or first port | Required resolution | Regression contract |
|---|---|---|
| Old `.dsh` paths could read another installation's sessions/settings/memory | All stock paths use `.dsh-stock`; no hidden fallback | `data-contract`, `memory-snapshot-contract` |
| DSH API calls lacked the 0.1.5 cookie exchange | Server-side root exchange, cookie retry and redaction | `data-contract` plus live auth acceptance |
| Session/plugin calls used old dot names or the obsolete events mux | Slash-named remotes and authenticated `/api/remote.mux` | `data-contract` |
| A hyphenated session storage bucket was decoded by replacing every hyphen with `\` | Read `cwd` from the session header; otherwise show the raw bucket identity | `data-contract` |
| Failed plugin refresh could leave a green last-known inventory | Retain diagnosis but label it stale and prevent green | `data-contract`, `ui-contract` |
| Missing memory could look like an empty healthy graph | Return explicit unavailable state and zero invented entities | `data-contract`, `ui-contract` |
| Settings UI implied one file owned all tunables | Name exact sources and apply settings/preset changes as one transaction | `ui-contract`, `installer-contract` |
| Generic context edit matched whichever model appeared first | Separate Brain and Worker keys with exact alias-scoped patterns | `installer-contract` |
| Retried/unsafe compaction values could recreate token storms | Bounded values plus refusal math and visible derived compression | `installer-contract`, Settings UI |
| Model actions returned before the process result or resident state was known | Await execution and corroborate resulting residency | `ui-contract` |
| Remote LM Link models could be unloaded from this box | Require exact local resident identity | `ui-contract` and live acceptance |
| Status could report a session as working after durable progress stopped | Separate upstream claim from corroborated movement and show STALLED | `data-contract`, `ui-contract` |
| Validation/history/plugin evidence could remain green after becoming stale | Every cached source carries sample time and freshness | `data-contract`, `ui-contract` |
| The retired picker override/package no longer matches stock DSH | Use stock 0.1.5 model catalog and the two settings aliases; carry no override archive | `picker-package-contract` |
| Desktop launch could use the default browser or start duplicates | Require explicit Chrome and healthy-service reuse | `reopen-contract` |
| Registration denial or mismatched task readback could be reported as success | Terminating errors and exact saved-task readback | `memory-snapshot-contract` |

## Known operational limits

- Fixture tests do not prove the live UI, current DSH cookie, LM Studio model
  state, GPU counters, or scheduled task. Use the live acceptance procedure
  after installation.
- Persistent memory and its recovery task are optional DSH capabilities. Their
  absence must remain visible as unavailable; Mission Control must not create a
  store just to turn the light green.
- Configuration validation runs the DSH version already installed in the stock
  deployment. It is an explicit operator action, never part of the five-second
  poll.
- `pluginInventory/list` is a snapshot. Mission Control refreshes it on a
  bounded cadence and labels retained data stale when refresh fails.
- Session disk scanning is a degraded fallback. It cannot prove current running
  state, so it never invents that state from file names.
