# DSH Activity View, Session Tabs and MCP Settings — October 15, 2026

## Result
Installed all three community plugins on the existing Web 0.2.1-alpha.2 and Desktop 0.2.0-rc.2. Verified their rendered interfaces in each application. DSH core versions, models, saved defaults and existing research configuration were preserved. No benchmark, model generation, new reporting task or tool-driven research job was run.

| Plugin | Version | Pinned source | Compatibility and observed behavior |
|---|---|---|---|
| Activity View | 0.1.0 | vec715/dsh-activity-view @ 4f6140ad0ef5e9a04354639461ac63ac00e9c9b4 | Declares DSH >=0.2.0-rc.2, Node >=22; both hosts show the activity switch and attention/today groups. Web switch restored the ordinary session tree and returned to Activity View. |
| Session Tabs | 0.1.0 | rifkyazizf/dsh-session-tabs @ f839aec07b276a94e79c44c7c33a22768e8ff022 | No manifest engine range; README targets Desktop 0.2.0-rc.2. Both hosts render the strip and clicking an existing tab switches the conversation. |
| MCP Settings | 0.3.0 | cyberofficial/dsh-plugin-mcp-settings @ 8573c29ac338b6f06442d7cb517260562d975a98 | Requires DSH >=0.1.7-rc.2 remote plugin-management services. Both hosts render Settings > MCP Servers and load the actual MCP inventory. |

## What changed
Web home: C:\Users\scott\.dsh-stock; profile web. Desktop home: C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval\home; profile desktop. The Desktop version was read from its installed executable and rendered Settings; Web version from its installed package/CLI and rendered Settings. The client platform named web in plugin manifests also applies to Electron's embedded DSH web client.

Added three pinned dependencies to each profile package.json. Activity View and MCP Settings were added to dsh.profile.bundles. Session Tabs does not declare a bundle, so each cordis.patch.yml gained one insert row, id ui-session-tabs, name dsh-session-tabs. Installation used shipped compiled files with lifecycle scripts disabled. No plugin source modifications or core harness rebuilds were needed.

Web installed with the existing local DSH CLI and loaded live on browser reload; its server was not restarted. Desktop was confirmed idle on an already-completed coding chat, its identified main process was stopped, and the same installed application was reopened with the correct DSH_HOME after installation. No model server was stopped or started. The model-catalog refresh launcher was deliberately not used, avoiding automatic catalog/default rewrites.

The CLI refuses profile desktop because Electron owns it. That attempt exited 1 without installing there. Installation then used the upstream Session Tabs README's supported manual profile method: add pinned dependencies/bundles, run pnpm install --ignore-scripts in that profile, append its loader row, reopen Desktop. Existing official Desktop package resolutions remained 0.2.0-rc.2.

## Preservation evidence
The saved before/after comparisons parsed package.json and cordis.patch.yml and removed only the three allowed additions before comparing. Both profiles matched their baselines. Every pre-existing lockfile importer dependency retained its exact specifier and resolved version. Evidence: docs/evidence/ui-plugins-2026-10-15/preservation.json and pins.json.

The first backup helper failed on YAML module resolution before copying files. The shell then continued to the Web install; this was an execution error. Before further changes, the original Web package was recovered from the existing canonical profile and verified semantically identical to the installed package after removing only the three new dependencies and two bundle entries. The original lockfile was recovered from the canonical pre-install copy. Web patch/workspace and all Desktop baseline files were backed up before editing. Local before.json explicitly records which two files were recovered; the failed backup is not represented as successful.

All prior provider definitions, model IDs, presets, effort/default values, context/output limits, Wigolo/Reddit/Redlib instructions and hooks inside the profiles passed preservation comparison. No runtime search/retrieval files were edited. This proves configuration preservation, not a fresh end-to-end research run. Existing completed conversations were opened only to verify navigation. Their per-session model selection can differ from the saved new-session default; no model picker selection was changed.

## UI observations and limits
Web MCP inventory showed mcp-wigolo Off/Disabled and memory-mcp-reference Connected/Enabled. Desktop showed both entries Off/Disabled. Those were existing states and were left intact. The deployed automatic research adapter is separate from the legacy disabled Wigolo MCP loader row. Reddit/Redlib is wired through the existing retrieval adapter/skill rather than a separately named MCP loader row, so its absence from this panel is expected. The panel lists MCP client loader entries, not every tool or adapter in a session preset.

MCP add/edit/remove/toggle/retry controls rendered; none were invoked against existing connections. Write operations, new-server creation, legacy SSE bridging and credential editing were not exercised. Activity View unread notifications were not tested by generating new responses. Session Tabs initially includes older engaged/nonempty sessions; Web therefore has a long horizontally scrollable row. Closing a tab dismisses it from the strip rather than deleting its conversation. Rename/delete behavior was not exercised. No claim of compatibility with future DSH releases is made.

## Recovery and operating instructions
Activity View: use its switch beside View options to return to the normal workspace tree. Session Tabs: select an existing tab to navigate; the row scrolls. MCP Settings: Web Settings > MCP Servers; Desktop account menu > Settings > MCP Servers. Leave existing disabled rows unchanged unless intentionally changing research routing.

Canonical Web dependency/lock files are stack/stock-dsh/web-profile. Canonical Desktop dependency/lock files are stack/desktop-tuning/ui-plugins-profile; its patch remains stack/desktop-tuning/cordis.patch.yml. Do not overwrite a live profile wholesale from these records. For recovery, stop the idle target app, merge only these three pinned dependencies and the two bundle names into its current package, install using its profile package manager, and ensure the single Session Tabs insert row exists. Keep the actual Desktop evaluation DSH_HOME. Removing these plugins reverses only those additions and reinstalls that profile; it does not require changing providers or deleting sessions.

Local original-profile backups and screenshots: C:/Users/scott/Documents/Codex/2026-10-15/dsh-ui-plugins. Private full profile baselines remain local and were not published. Reading/recovery copies are synchronized under Halo Stack Research. This was single-agent installation and UI verification, with zero new inference jobs or worker calls; no exact coordinator token total is exposed by this task's tool results.
