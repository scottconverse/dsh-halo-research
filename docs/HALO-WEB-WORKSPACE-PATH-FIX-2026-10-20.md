# Web Windows workspace path comparison — October 20, 2026

## Outcome

Web had the same exact-cwd bug in its core session filter and SQLite search predicate. Both are now repaired on disk, and the idle Web server was restarted to load them. Authenticated session/list returned HTTP200, result.ok=true after restart. Normal settings, models, defaults and integrations were preserved.

Web's model-facing session-query tool was already patched: pnpm resolves it and Desktop's profile dependency to the same physical file. This corrects the earlier Desktop report's claim that no Web runtime file was changed. That earlier change affected Web's on-disk authorization package, while its core and SQLite packages remained unpatched. This task finishes those two layers and reloads Web.

## Changes

[workspace-path-web-patch.mjs](../stack/stock-dsh/workspace-path-web-patch.mjs) resolves the three real pnpm package paths from the CLI's physical package location and reuses the existing exact-match repair. Only two files required modification; the shared tool was left intact. Every changed file was backed up before writes. Installed hashes match the planned hashes for all three packages.

The common workspace rule applies to fully qualified Windows paths only: consistent forward/backslashes, lexical normalization and trailing separators, with case preserved. Relative paths, non-Windows comparisons and workspace authorization boundaries are retained. No stored session headers, configuration or database schema are rewritten. Symlink/junction aliases are outside this repair.

## Focused verification

The [Web regression](../stack/stock-dsh/test/workspace-path-web.test.mjs) uses an existing Web FTS-indexed session/event, read-only, and the actual Web SQL-builder, core-filter and tool-authorization functions extracted from installed sources. It requires this local installation and existing Web index. It does not create or prompt a model session.

- Before deployment: exact installed SQL returned zero hits for the opposite slash spelling; candidate repaired SQL returned the expected existing event.
- After deployment: installed SQL returned one hit for that same record. All three installed packages have the repair.
- Core filtering and authorization accept the equivalent workspace spelling.
- A sibling-name folder and a child folder remain denied by SQL, core filtering and authorization.
- Module syntax and patch idempotence pass.

The initial FTS probe used an arbitrary text slice that could end inside a token and returned no match even with the candidate path fix. It was corrected to use one complete indexed word; the focused check then passed. A PowerShell quote-escaping attempt to edit that probe failed before execution and was replaced with a direct file patch. No application repair retries were needed.

The live Web API listed92 sessions with none running immediately before restart. Exact process identity/argv were checked before stopping only Web PID41848. The existing detached startup script created PID47016. No model services or Mission Control were restarted. Post-start authenticated RPC succeeded. This is installed SQL/function verification plus server readiness, not a model-driven tool turn or a new broad test suite.

Eight normal Web/Desktop configuration, manifest and lock-file hashes are unchanged. No subagents, model requests, benchmarks or compaction tests. Inference tokens: zero. Codex coordinator token usage is not exposed by these tools. Private raw session lists and backups are excluded from Git.

## Evidence, recovery and scope

[Results, installed hashes and settings preservation](evidence/web-workspace-path-fix-2026-10-20/results.json). Private originals are under Documents/Codex/2026-10-20/web-workspace-path-fix/backups. Stop Web before restoring those two original module files; restart through its existing launcher. An upgrade may replace the modules; the exact-match patch can be reapplied only if its source seams match.

Recovery copies of the Web patch, shared normalization patch and three installed module sources are in Halo Stack Research/Current Halo Configuration/web-workspace-path-fix-2026-10-20, with manifest hashes. No defaults/provider settings were changed.
