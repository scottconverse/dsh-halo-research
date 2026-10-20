# Historical DSH stock plugin inventory

> September 19 snapshot; not a current capability or permission guarantee. Read the active session tool catalog when this optional workflow is explicitly requested. This inventory contains package/status metadata, not credentials or session content.

Captured from Mission Control /api/plugins at 2026-09-19T04:36:29Z.

- DSH deployment: `0.1.6-alpha.1`
- Live plugin entries: **169**
- Active entries: **141**
- Failed entries: **0**
- Non-active entries: **28**
- This is an inventory snapshot, not a promise that every installed package is mounted in every agent preset. Host entries and per-session preset entries are listed separately in the capability map below.

## Pairing-relevant stock capability map

| Guide need | Stock capability | Current placement | Enforcement strength |
|---|---|---|---|
| Dispatch one continuable coder | `dsh-tool-subagent` + spawn provider | Local preset | Hard child creation path; the skill still chooses one child and one worktree |
| Child status/control | `dsh-tool-subagent-control` + `list_agents` | Local preset | Hard status snapshot, message delivery, and interrupt; no automatic progress judgment |
| Child trajectory/evidence | `dsh-tool-session-query` over SQLite | Local preset plus host SQLite backend | Workspace-authorized reads of session/event data; hard read boundary |
| Human trajectory view | `dsh-client-ui-trajectory` | Host UI | Interactive event ledger and timing view; visual inspection only |
| Durable recovery | session persistence, checkpoint policy, session reference | Host | Checkpoints before requests and side effects; recovery is durable but not exactly-once |
| Context pressure | token meter, compaction, tool-result pruner, image offload | Local preset/host | Automatic compaction and bounded tool output; cannot shrink system/tool prefix |
| Loop pressure | repeat-tool-reminder | Host | Advisory reminders at configured repeats; does not stop a child |
| Tool deadlines | tool-call-timeout-policy | Host | Cooperative per-tool cancellation only; not a whole-child wall-clock cap |
| Scope planning | plan-mode, goal tools, todo tools | Local preset/host | Durable goal/todo state and plan mode; model/user still chooses scope |
| Repository grounding | fs, fs-search, persistent terminal, LSP | Local preset/host | Actual file/process/navigation evidence; no automatic red-to-green claim |
| Authority/approval | user-approval and permission presets | Host | Can fail closed when policy requires it; current local profile is full-access, so pairing rules remain explicit |
| Audit/reporting | session stats, turn outline, trajectory, event read | Host/local session | Evidence projections; coder completion is never independent proof |
| Large orchestration | workflow and Ralph | Local preset | Available, but deliberately not default for pairing because intermediate child output is hidden or foreground-only |

## What the pairing skill must use

For a bounded pairing task, the coordinator must:

1. Load this skill through `dsh-tool-skill` and create the written handoff.
2. Preflight `subagent`, `list_agents`, `send_message`, `interrupt_agent`, `session_trace`, `session_event_search`, `session_event_trace`, and `session_event_read`. If a required tool is unavailable, report `pairing unavailable` before editing.
3. Use `todo_write` for the pairing stages, keeping exactly one pairing assignment `in_progress`; use `get_goal`/`create_goal` only for a genuinely long-running objective.
4. Dispatch with `subagent` in `continuable` mode, then record the durable child id.
5. Supervise with `list_agents` plus `session_trace` and the event tools. Search literal `PAIRING_HEARTBEAT`, read the exact event, and use `session_event_trace` after compaction or event replacement.
6. Use `interrupt_agent` when the skill stop rule fires. Do not use another child to hide a stalled one.
7. Ground and audit with `fs-search`, `fs`, `terminal`, and `lsp`; let checkpoint, timeout, compaction, pruning, and repeat-reminder plugins do their stock work.
8. Treat workflow/Ralph as explicit alternatives only when the user asks for a workflow or fresh-agent loop; they are not substitutes for direct trajectory supervision.

## Limits that stock DSH does not enforce

- No stock plugin validates an arbitrary five-minute heartbeat contract.
- No stock plugin automatically measures “meaningful delta” in a child trajectory.
- No stock plugin knows whether a commit, push, merge, tag, or publication was authorized by the current user.
- Tool timeout is cooperative and per-tool; it is not a reliable whole-child wall-clock kill.
- `list_agents` is a snapshot and `send_message` returns acceptance, not the child result.
- The pairing skill remains the policy layer for those limits; a future native plugin would be justified only if hard enforcement of those items becomes necessary.

## Live plugin entries

| Entry | Module | State | Description |
|---|---|---|---|
| `ca29a7a5` | `@deepseek-ai/cordis-plugin-hmr` | active | Hot Module Replacement Plugin for Cordis · instance: ca29a7a5 |
| `include:hmr` | `@deepseek-ai/cordis-plugin-hmr` | disabled | Hot Module Replacement Plugin for Cordis · instance: hmr |
| `include:timer` | `@deepseek-ai/cordis-plugin-timer` | active | Timer service for cordis |
| `include:agent` | `@deepseek-ai/dsh-agent` | active | Agent interface, registry, initiator scope, and event vocabulary for the DeepSeek Harness |
| `include:agent-default-model` | `@deepseek-ai/dsh-agent-default-model` | active | Default model selection shared by Agent entry points |
| `include:agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | disabled | Workspace context loader for AGENTS.md/CLAUDE.md instruction files |
| `include:agent-loop` | `@deepseek-ai/dsh-agent-loop` | active | The concrete agent loop plugin for the DeepSeek Harness |
| `include:agent-presets` | `@deepseek-ai/dsh-agent-presets` | active | Per-session agent composition from preset cordis.yml files for the DeepSeek Harness |
| `include:typert-gateway` | `@deepseek-ai/dsh-api-gateway` | active | Typert Remote Host dispatcher and Client API endpoint |
| `include:api-remotes` | `@deepseek-ai/dsh-api-remotes` | active | Remote BFF assembly for application-selected Host capabilities |
| `include:session-controller` | `@deepseek-ai/dsh-api-session-controller` | active | Session Remote commands, cold reads, and live control transport |
| `include:settings-controller` | `@deepseek-ai/dsh-api-settings-controller` | active | Remote owner for the configuration surfaces over the settings-domain seams |
| `include:terminal-controller` | `@deepseek-ai/dsh-api-terminal-controller` | active | Session-owned interactive terminals with shell discovery, screen recovery and typed Remote control |
| `include:workspace-controller` | `@deepseek-ai/dsh-api-workspace-controller` | active | Workspace Remote commands and reconnect-safe state transport |
| `include:workspace-files` | `@deepseek-ai/dsh-api-workspace-files` | active | Workspace file service and Client resource provider: bounded reads, directory listing, and live metadata over the workspaceFiles Remote namespace |
| `include:attachment-local` | `@deepseek-ai/dsh-attachment-local` | active | Private content-addressed DSH_HOME attachment storage |
| `include:bash-sandbox` | `@deepseek-ai/dsh-bash-sandbox` | disabled | Sandbox-consuming implementation of the DeepSeek Harness bash executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) |
| `include:browser-use` | `@deepseek-ai/dsh-browser-use` | active | Exclusive named browser-use provider registration |
| `include:connection` | `@deepseek-ai/dsh-client-connection` | active | Authenticated RPC transport and generation lifecycle |
| `include:file-upload` | `@deepseek-ai/dsh-client-file-upload` | active | Agent-scoped browser file upload, streaming intake, and staged receipt service |
| `include:client-hmr` | `@deepseek-ai/dsh-client-hmr` | active | Dev-only hot-reload driver for script-loaded client entries: SSE rebuilt frames → invalidate/prefetch → fiber swap through the vendored Loader entry |
| `include:locale` | `@deepseek-ai/dsh-client-locale` | active | Locale plugin: Host-backed preference, extensible language catalog, browser fallback, and typed built-in dictionaries |
| `include:modules` | `@deepseek-ai/dsh-client-modules` | active | Client module system, dual-face: node half composes the __DSH_BOOT__ entry graph (incremental dsh.client scan, bundle route, index tap, webPlugins service); browser half is the lazy-CJS module table the vendored cordis Loader consumes as its internal seam |
| `include:resources` | `@deepseek-ai/dsh-client-resources` | active | Unified client resource model: protocol-registered providers turn URL addresses into live values, consumed through the useResource global standard hook |
| `include:ui-agent-preset` | `@deepseek-ai/dsh-client-ui-agent-preset` | active | Agent-preset surfaces: the default for later sessions, this session's seat, and the composition editor |
| `include:ui-approval` | `@deepseek-ai/dsh-client-ui-approval` | active | Approval composer takeover over the scoped Remote Event waterfall |
| `include:ui-attachment` | `@deepseek-ai/dsh-client-ui-attachment` | active | Dynamic attachment presentation plugin for conversation input, message-image, and trajectory image slots |
| `include:ui-brand-official` | `@deepseek-ai/dsh-client-ui-brand-official` | active | Official DeepSeek Harness brand occupants for the Web client's sidebar slots |
| `include:ui-chat` | `@deepseek-ai/dsh-client-ui-chat` | active | Chat Conversation target, node definitions, renderers, and details surface |
| `include:ui-commands` | `@deepseek-ai/dsh-client-ui-commands` | active | Client command surface: global directory cache, '/' source, three command UI kinds, popupSelect registry |
| `include:ui-conversation` | `@deepseek-ai/dsh-client-ui-conversation` | active | Target-neutral Conversation assembly, shell, composer, queue, and view navigation |
| `include:ui-cordis` | `@deepseek-ai/dsh-client-ui-cordis` | active | Cordis dynamic-plugin definition card: the keyed cordis_define tool row with its run/stop switch |
| `include:ui-deliverables` | `@deepseek-ai/dsh-client-ui-deliverables` | active | Produced-files turn tail and clickable final-response file references for Web |
| `f77d318d` | `@deepseek-ai/dsh-client-ui-directory-picker-native` | active | Native directory-picker surface: the renderless workspace directory-flow occupant driving the host's OS chooser |
| `include:ui-goal` | `@deepseek-ai/dsh-client-ui-goal` | active | Session goal surface: GoalBar docked above the composer, read from the goal session projection |
| `include:ui-input-trigger` | `@deepseek-ai/dsh-client-ui-input-trigger` | active | Input trigger pipeline: '/' and '@' detection, candidate menu, pick routing to registered sources |
| `include:ui-jobs` | `@deepseek-ai/dsh-client-ui-jobs` | active | Session-header background-job list: live registry state mirrored from session/jobs frames |
| `include:ui-layout` | `@deepseek-ai/dsh-client-ui-layout` | active | Shell plugin: three-column AppFrame with drag handles, ctx.layout viewing-state service (navigation + panels) |
| `include:ui-message-feedback` | `@deepseek-ai/dsh-client-ui-message-feedback` | active | The Web feedback surface: per-message Like/Dislike in the assistant-message action strip and the feedback dialog behind both ratings and /feedback, backed by the messageFeedback and sessionFeedback Host Remotes |
| `include:ui-model-selection` | `@deepseek-ai/dsh-client-ui-model-selection` | active | Model selection over the shared model catalog, Session projection, and session.selectModel |
| `include:ui-open-in-app` | `@deepseek-ai/dsh-client-ui-open-in-app` | active | Web Session-header "Open In..." split button opening the session workspace directory in a locally installed application |
| `include:ui-permission` | `@deepseek-ai/dsh-client-ui-permission-presets` | active | Permission surfaces: a new-session default in General settings and a current-session /permission popup over the permissions projection |
| `include:ui-plan` | `@deepseek-ai/dsh-client-ui-plan` | active | Plan-mode composer control: the conversation.input.plan seat over the plan projection and the /plan command channel |
| `include:ui-reference` | `@deepseek-ai/dsh-client-ui-reference` | active | Unified Web @file and @session reference source |
| `include:ui-renderer` | `@deepseek-ai/dsh-client-ui-renderer` | active | Browser UI renderer: React slot bindings, ctx.uiRenderer, and the assembled application root |
| `include:ui-schedule` | `@deepseek-ai/dsh-client-ui-schedule` | disabled | Read-only active Schedule catalog in the Web Session header |
| `include:ui-session` | `@deepseek-ai/dsh-client-ui-session` | active | Session Controller adapter for React and session-scoped slots |
| `include:ui-settings` | `@deepseek-ai/dsh-client-ui-settings` | active | Settings domain base plugin: the settings-namespace scope service and the canonical settings slot-type contract |
| `include:ui-settings-general` | `@deepseek-ai/dsh-client-ui-settings-general` | active | Settings ownerless-copy and product onboarding plugin: the General section, shell trigger/header chrome content, settings dictionaries, and the versioned welcome notice |
| `include:ui-settings-models` | `@deepseek-ai/dsh-client-ui-settings-models` | active | Models settings and shared product-onboarding dialogs over existing settings and credential joins |
| `include:ui-settings-plugin-inventory` | `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | active | Read-only Cordis Loader inventory tab in Web Plugins settings |
| `include:ui-settings-plugins` | `@deepseek-ai/dsh-client-ui-settings-plugins` | active | Plugins settings section with feature-owned tabs and configurable host-plane plugin cards |
| `include:ui-settings-unarchive-sessions` | `@deepseek-ai/dsh-client-ui-settings-unarchive-sessions` | active | Archived-session settings page: the registry-global archive set with one Unarchive action per row |
| `include:ui-sidebar` | `@deepseek-ai/dsh-client-ui-sidebar` | active | Sidebar plugin: session multi-level tree, search, grouping, state dots |
| `include:ui-sidebar-documentpreview` | `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` | active | Extensible document previews for Sidebar files: Markdown, highlighted code, images, PDF, HTML, and plain text |
| `include:ui-sidebar-files` | `@deepseek-ai/dsh-client-ui-sidebar-files` | active | Workspace file tree tab type for the right Sidebar: lazy directory listing over the workspaceFiles Remote namespace, opening files into the Sidebar |
| `include:ui-sidebar-right` | `@deepseek-ai/dsh-client-ui-sidebar-right` | active | Right Sidebar: the docking surface's session-bound state, its panel and header expand control, and the navigation service over it |
| `include:ui-sidebar-terminal` | `@deepseek-ai/dsh-client-ui-sidebar-terminal` | active | Interactive shell tabs for the right Sidebar |
| `include:ui-skill` | `@deepseek-ai/dsh-client-ui-skill` | active | Web skill references and the dedicated skill tool row |
| `include:ui-subagent` | `@deepseek-ai/dsh-client-ui-subagent` | active | Subagent conversation catalog, continuation routing UI, and '@' reference source |
| `include:ui-theme` | `@deepseek-ai/dsh-client-ui-theme` | active | Theme plugin: Host bootstrap for the pre-plugin palette; DOM-free ThemeRuntime for light/dark/system state; --dsw-* token styles and Appearance settings row |
| `include:ui-tool` | `@deepseek-ai/dsh-client-ui-tool` | active | Client Tool call-tree renderer and keyed per-tool presentation slot |
| `include:ui-trajectory` | `@deepseek-ai/dsh-client-ui-trajectory` | active | Trajectory event ledger with an interactive timing overview: pure-consumer plugin registering into the conversation ViewMap (no service) |
| `include:ui-user-questions` | `@deepseek-ai/dsh-client-ui-user-questions` | active | Web ask_user_question composer takeover and plan-review presentation UI |
| `include:ui-workflow-run` | `@deepseek-ai/dsh-client-ui-workflow-run` | active | Durable workflow-run Conversation Node and nested member disclosure for dsh web |
| `include:ui-workspace` | `@deepseek-ai/dsh-client-ui-workspace` | active | Workspace picker plugin: one WorkspacePicker registered into the sidebar and empty-state workspace slots |
| `include:command-compact` | `@deepseek-ai/dsh-command-compact` | disabled | Human-facing slash command for explicit session compaction |
| `include:command-feedback` | `@deepseek-ai/dsh-command-feedback` | active | Log-only session feedback: the record event, the sessionFeedback Host Remote, and the human-facing slash command |
| `include:command-goal` | `@deepseek-ai/dsh-command-goal` | disabled | Human-facing slash command for persisted same-session goals |
| `include:commands` | `@deepseek-ai/dsh-commands` | active | Plugin-owned human command registry for DeepSeek Harness UIs |
| `include:compaction-basic` | `@deepseek-ai/dsh-compaction-basic` | disabled | Token-meter-driven compaction policy and LLM summarization backend for the DeepSeek Harness |
| `include:image-offload` | `@deepseek-ai/dsh-compaction-image-offload` | active | Durable image offload for image-capable routes: replace over-budget request images with placeholders and retry |
| `include:tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner` | disabled | Replay-safe model-free head/middle/tail pruning for tool-result surface nodes |
| `include:cordis-client-runner` | `@deepseek-ai/dsh-cordis-client-runner` | active | Browser half of dynamic dual-half plugin packages: event subscription, closure evaluation, guard facade, and loader entries |
| `include:cordis-host-runner` | `@deepseek-ai/dsh-cordis-host-runner` | active | Dynamic package definition registry, host-half sandbox lifecycle, and invoke handler table for model-mounted dual-half packages |
| `include:credentials` | `@deepseek-ai/dsh-credentials-local` | active | File-backed credentials provider ($DSH_HOME/.env under the live process environment) for the DeepSeek Harness |
| `include:deepseek-llm-api-extensions` | `@deepseek-ai/dsh-deepseek-llm-api-extensions` | active | Additive request-field registry for the official DeepSeek LLM API adapter |
| `include:chrome-browser` | `@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp` | active | Experimental per-Session Chromium browser tools through chrome-devtools-mcp |
| `include:file-reference-local` | `@deepseek-ai/dsh-file-reference-local` | active | Local-filesystem ctx.fileReferences provider with bounded fuzzy indexes |
| `include:fs-observation-policy` | `@deepseek-ai/dsh-fs-observation-policy` | active | File-context policy plugin for the DeepSeek Harness — observed-state, read-before-edit, and version-guarded write/edit added over the ctx.fs provider seam through the fs/* event gate (no service API) |
| `include:fs-sandbox` | `@deepseek-ai/dsh-fs-sandbox` | active | Sandbox-enforcing implementation of the DeepSeek Harness filesystem seam: fences write/edit by the per-call sandbox mode (read-only denies mutation, workspace-write contains it to the workspace + temp roots) while reads pass through |
| `include:goal` | `@deepseek-ai/dsh-goal` | active | Event-sourced same-session goal state and lifecycle service for the DeepSeek Harness |
| `include:goal-round-driver` | `@deepseek-ai/dsh-goal-round-driver` | active | Race-fenced same-session goal-round driver |
| `include:directory-picker` | `@deepseek-ai/dsh-host-directory-picker-auto` | active | Adaptive chooser of the directory-picker seam: resolves the host situation at boot and mounts the native or browse backend for the DeepSeek Harness web GUI host |
| `efa9f769` | `@deepseek-ai/dsh-host-directory-picker-native` | active | Native-OS-chooser backend of the directory-picker seam for the DeepSeek Harness web GUI host |
| `include:open-in-app` | `@deepseek-ai/dsh-host-open-in-app` | active | Host half of open-in-app: resolved application catalog, icons, and the launch endpoint as three webServer routes |
| `include:plugin-inventory` | `@deepseek-ai/dsh-host-plugin-inventory` | active | Read-only Remote projection of current Cordis Loader plugin state |
| `include:webserver` | `@deepseek-ai/dsh-host-webserver` | active | Web route-registration plugin: HTTP and upgrade routes, index transform taps, and static dist fallback; knows no harness concepts |
| `include:jobs` | `@deepseek-ai/dsh-jobs-local` | active | Process-local implementation of the DeepSeek Harness background job registry seam |
| `include:llm` | `@deepseek-ai/dsh-llm` | active | Provider-neutral LLM service interface for the DeepSeek Harness |
| `include:llm-deepseek` | `@deepseek-ai/dsh-llm-deepseek` | disabled | DeepSeek adapter with Chat Completions and Messages protocols |
| `include:llm-pi-ai` | `@deepseek-ai/dsh-llm-pi-ai` | active | pi-ai-backed DeepSeek adapter for the DeepSeek Harness LLM seam (design-verification twin of dsh-llm-deepseek) |
| `include:llm-retry` | `@deepseek-ai/dsh-llm-retry` | active | Provider-routed LLM request retry policy for the DeepSeek Harness |
| `include:lsp` | `@deepseek-ai/dsh-lsp` | active | Abstract LSP capability seam (ctx.lsp) for the DeepSeek Harness — language-server provider registry keyed by branded id and extension mapping, order-independent per-query selection, normalized definition/references/implementation/hover requests and results, and the LspError taxonomy |
| `include:lsp-stdio` | `@deepseek-ai/dsh-lsp-stdio` | active | Generic stdio language-server provider for the DeepSeek Harness LSP capability seam (ctx.lsp) — spawns configured servers, translates JSON-RPC, and serves transient-open goToDefinition/findReferences/goToImplementation/hover queries in the host filesystem namespace |
| `include:mcp-wigolo` | `@deepseek-ai/dsh-mcp-client` | active | MCP client bridge: connects to MCP servers and registers their tools on ctx.tools · instance: mcp-wigolo |
| `include:memory-mcp-reference` | `@deepseek-ai/dsh-mcp-client` | active | MCP client bridge: connects to MCP servers and registers their tools on ctx.tools · instance: memory-mcp-reference |
| `include:mcp-resources` | `@deepseek-ai/dsh-mcp-resources` | active | Scoped MCP resource discovery and reading through shared model tools |
| `include:message-feedback` | `@deepseek-ai/dsh-message-feedback` | active | Canonical Session-log ratings and notes for finalized assistant messages |
| `include:permission` | `@deepseek-ai/dsh-permission-presets` | active | User-facing permission presets (ctx.permissionPresets) for the DeepSeek Harness: one product-level Permissions select bundling the sandbox-mode and approval-policy knobs, written through to their own session events |
| `include:plan-mode` | `@deepseek-ai/dsh-plan-mode` | disabled | Logged per-agent plan mode with deployment guidance, a direct slash command, and a user-reviewed exit |
| `include:plugin-package-inventory-deepseek` | `@deepseek-ai/dsh-plugin-package-inventory-deepseek` | active | Active Loader-backed plugin package inventory for official DeepSeek LLM API requests |
| `include:ptc-runtime` | `@deepseek-ai/dsh-ptc-runtime-node` | active | Sandboxed Node process implementation of the DeepSeek Harness PTC execution capability |
| `include:pwsh-sandbox` | `@deepseek-ai/dsh-pwsh-sandbox` | active | Sandbox-consuming implementation of the DeepSeek Harness PowerShell executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) |
| `include:repeat-tool-reminder` | `@deepseek-ai/dsh-repeat-tool-reminder` | active | Repeat-tool-call guard plugin: advisory reminders when an agent loops on identical tool calls |
| `include:sandbox` | `@deepseek-ai/dsh-sandbox-local` | active | Local process-sandbox backends for the DeepSeek Harness sandbox seam: bwrap, the npm-distributed landlock-run launcher, macOS Seatbelt, or the Windows ACL restricted-token runner — functionally probed, fail-closed |
| `include:sandbox-policy` | `@deepseek-ai/dsh-sandbox-policy` | active | Per-call sandbox policy resolver and current model context: deployment fallbacks plus each session's mode and workspace root, shared by every enforcing capability family |
| `include:session` | `@deepseek-ai/dsh-session` | active | Event-sourced session store for the DeepSeek Harness |
| `include:session-checkpoint-policy` | `@deepseek-ai/dsh-session-checkpoint-policy` | active | Semantic session durability checkpoints before model requests and tool side effects |
| `include:session-log-deepseek` | `@deepseek-ai/dsh-session-log-deepseek` | active | Incremental lossless session-log request extension for the official DeepSeek LLM API |
| `include:session-log-download` | `@deepseek-ai/dsh-session-log-export` | active | Web Session-log export command and shared download dialog |
| `include:session-persistence-jsonl` | `@deepseek-ai/dsh-session-persistence-jsonl` | active | JSONL durable session persistence backend for the DeepSeek Harness |
| `include:session-projection` | `@deepseek-ai/dsh-session-projection` | active | Session-projection seam: the merge-extensible projection type table, the provider contract, and the ctx.sessionProjections registry serving whole current values of log-derived per-session state |
| `include:session-projection-cache` | `@deepseek-ai/dsh-session-projection-cache` | active | Persisted projection cache (ctx.sessionProjectionCache): durable per-session checkpoint records on the session_projcache storage domain (per-record layout), throttled write-behind, and the cached listing read |
| `include:session-query-sqlite` | `@deepseek-ai/dsh-session-query-sqlite` | active | Concrete ctx.sessionQuery backend with SQLite FTS5 search |
| `include:session-reference` | `@deepseek-ai/dsh-session-reference` | active | Cross-session snapshot references and durable untrusted model context (ctx.sessionReferenceResolver) |
| `include:session-stats` | `@deepseek-ai/dsh-session-stats` | active | Whole-log conversation counts and wall times projection (sessionStats) for the DeepSeek Harness |
| `include:session-telemetry-otel` | `@deepseek-ai/dsh-session-telemetry-otel` | active | OpenTelemetry backend for the DeepSeek Harness telemetry seam: hands captured session records to the OTel JS SDK's log pipeline |
| `include:session-title` | `@deepseek-ai/dsh-session-title` | active | Log-backed session title service and provider registry for the DeepSeek Harness |
| `include:session-title-llm` | `@deepseek-ai/dsh-session-title-first-prompt-llm` | active | First-message LLM provider plugin for DeepSeek Harness session titles |
| `include:session-turn-outline` | `@deepseek-ai/dsh-session-turn-outline` | active | Whole-log turn outline projection (turnOutline) for the DeepSeek Harness |
| `include:settings` | `@deepseek-ai/dsh-settings-file` | active | File-backed settings provider (settings.yaml) for the DeepSeek Harness |
| `include:shell-env` | `@deepseek-ai/dsh-shell-env` | active | Tool-independent managed DSH_* shell environment registry |
| `include:skill` | `@deepseek-ai/dsh-skill` | active | Agent skill provider registry for the DeepSeek Harness |
| `include:skill-badge` | `@deepseek-ai/dsh-skill-badge` | disabled | Bundled dsh badge skill provider for DeepSeek Harness |
| `include:skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | disabled | Local filesystem skill provider for the DeepSeek Harness |
| `include:spill-local` | `@deepseek-ai/dsh-spill-local` | active | Local-filesystem implementation of the DeepSeek Harness spill storage seam (private session-scoped files) |
| `include:spill-policy` | `@deepseek-ai/dsh-spill-policy` | active | Tool-result spill policy for the DeepSeek Harness — replaces oversized plain-text tool results with a retained preview plus a spill-file path (no service API) |
| `include:storage` | `@deepseek-ai/dsh-storage` | active | Storage hub (ctx.storage): named backend registry plus mounted data-form facilities for the DeepSeek Harness |
| `include:storage-domain` | `@deepseek-ai/dsh-storage-domain` | active | Domain data form (ctx.storage.domain): schema-validated, event-emitting KV domains over storage backends for the DeepSeek Harness |
| `include:storage-json` | `@deepseek-ai/dsh-storage-json` | active | JSON file KV storage backend for the DeepSeek Harness storage hub |
| `include:subagent` | `@deepseek-ai/dsh-subagent` | active | Abstract subagent seam (ctx.subagents): named-provider registry for delegating to child agents |
| `include:subagent-codex` | `@deepseek-ai/dsh-subagent-codex` | active | One-shot Codex subagent provider over the official app-server protocol |
| `include:subagent-fork-in-process` | `@deepseek-ai/dsh-subagent-fork-in-process` | active | In-process fork subagent backend: runs a child agent seeded with a prefix of the parent's log |
| `include:subagent-spawn-in-process` | `@deepseek-ai/dsh-subagent-spawn-in-process` | active | In-process spawn subagent backend: runs a fresh child agent on ctx.agents |
| `include:subprocess` | `@deepseek-ai/dsh-subprocess-local` | active | Local-subprocess implementation of the DeepSeek Harness subprocess seam |
| `include:system-prompt` | `@deepseek-ai/dsh-system-prompt` | active | System prompt assembly registry for the DeepSeek Harness |
| `include:token-meter` | `@deepseek-ai/dsh-token-meter` | active | Replay-aware token measurement service (ctx.tokenMeter) for the DeepSeek Harness |
| `include:tool-bash` | `@deepseek-ai/dsh-tool-bash` | disabled | Model-facing bash tool with optional generic background-job and sandbox-escalation support |
| `include:timeout-policy` | `@deepseek-ai/dsh-tool-call-timeout-policy` | active | Tool-call timeout policy: a tools/execute wrapper that arms a per-tool deadline on exec.signal and returns TOOL_TIMEOUT when it wins |
| `include:tool-fs` | `@deepseek-ai/dsh-tool-fs` | disabled | Model-facing filesystem tools (read, write, edit) over the DeepSeek Harness filesystem seam (ctx.fs) |
| `include:tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | disabled | Model-facing filesystem discovery tools (glob, grep) backed by the packaged ripgrep binary (@vscode/ripgrep) |
| `include:tool-goal` | `@deepseek-ai/dsh-tool-goal` | disabled | Model-facing same-session goal tools with execution-time authority checks |
| `include:tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | disabled | Model-facing background job control tools (job_output, job_list, job_kill) over the ctx.jobs registry |
| `include:tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | disabled | Model-facing pwsh tool over the bash executor seam |
| `include:tool-ralph` | `@deepseek-ai/dsh-tool-ralph` | disabled | Model-facing fresh-agent Ralph loop over the workflow and subagent seams |
| `include:tool-skill` | `@deepseek-ai/dsh-tool-skill` | disabled | Model-facing skill loading tool for the DeepSeek Harness |
| `include:tool-subagent` | `@deepseek-ai/dsh-tool-subagent` | disabled | Model-facing subagent delegation tool over the ctx.subagents seam · instance: tool-subagent |
| `include:tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent` | disabled | Model-facing subagent delegation tool over the ctx.subagents seam · instance: tool-subagent-fork |
| `include:tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control` | disabled | Globally named send_message, interrupt_agent, and list_agents tools over ctx.subagents continuations |
| `include:tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | disabled | Globally named send_message, interrupt_agent, and list_agents tools over ctx.subagents continuations · export: list-agents |
| `include:subagent-model-selection-settings` | `@deepseek-ai/dsh-tool-subagent/model-selection-settings` | active | Model-facing subagent delegation tool over the ctx.subagents seam · export: model-selection-settings |
| `include:tool-todo` | `@deepseek-ai/dsh-tool-todo` | disabled | Model-facing todo_write tool over the DeepSeek Harness event-sourced session log |
| `include:tool-web` | `@deepseek-ai/dsh-tool-web` | disabled | Model-facing web tools (web_search, web_fetch) over the DeepSeek Harness web capability seam (ctx.web) |
| `include:tool-workflow` | `@deepseek-ai/dsh-tool-workflow` | disabled | Model-facing workflow tool: run a JavaScript orchestration script over ctx.workflowEngine |
| `include:tools` | `@deepseek-ai/dsh-tools` | active | Tool registry and execution pipeline for the DeepSeek Harness |
| `include:typert-loader` | `@deepseek-ai/dsh-typert-loader` | active | Loader integration for generated Typert package contributions |
| `include:typert` | `@deepseek-ai/dsh-typert-registry` | active | Runtime registry for generated package reflection and Zod schemas |
| `include:approval` | `@deepseek-ai/dsh-user-approval` | active | User-approval seam (ctx.approval) for the DeepSeek Harness: one-shot permission decisions dispatched to composed answerers over the approval/request waterfall, fail-closed by default |
| `include:user-questions` | `@deepseek-ai/dsh-user-questions` | active | Abstract user-questions seam (ctx.userQuestions) for asking the human during agent runs |
| `include:web` | `@deepseek-ai/dsh-web` | active | Abstract web access capability seam (ctx.web) for the DeepSeek Harness — search/fetch provider registry, registration-order-independent selection, request/result vocabulary, and the WebError taxonomy |
| `include:web-runtime` | `@deepseek-ai/dsh-web-app` | active | The dsh browser-surface bundle: the web patch layer over dsh-base plus the runtime glue plugin (frontend dist serving, web-surface prompt, bash runtime variables, URL line) |
| `include:web-startup` | `@deepseek-ai/dsh-web-app/startup` | active | The dsh browser-surface bundle: the web patch layer over dsh-base plus the runtime glue plugin (frontend dist serving, web-surface prompt, bash runtime variables, URL line) · export: startup |
| `include:web-fetch-http` | `@deepseek-ai/dsh-web-fetch-http` | active | Anonymous public HTTP(S) fetch provider for the DeepSeek Harness web capability seam (ctx.web) |
| `include:web-search-deepseek` | `@deepseek-ai/dsh-web-search-deepseek` | active | DeepSeek-backed search provider (native web_search via the Anthropic-compatible API) for the DeepSeek Harness web capability seam (ctx.web) |
| `include:workflow-ptc` | `@deepseek-ai/dsh-workflow-ptc` | disabled | Workflow orchestration in the shared sandboxed Node PTC runtime |
| `include:workspace` | `@deepseek-ai/dsh-workspace` | active | Workspace entity registry (ctx.workspaceRegistry): durable workspace records with validated session attachment over the domain data form for the DeepSeek Harness |
| `include` | `cordis:include` | active | Composition include: mounts a config subtree |
| `include:llm-xai-oauth` | `dsh-xai` | active | — |
