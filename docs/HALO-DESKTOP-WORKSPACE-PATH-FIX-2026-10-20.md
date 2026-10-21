# Desktop Windows workspace path comparison — October 20, 2026

## Delivered behavior

Desktop session-query searches and authorization now treat forward/backslash spellings of the same fully qualified Windows workspace as equal. Existing session headers and database rows are not rewritten. Drive/UNC roots and trailing separators are handled consistently. Relative paths and non-Windows comparisons retain their existing behavior; path case is deliberately preserved for Windows folders that may be case-sensitive. This is lexical normalization, not junction/symlink alias resolution.

## Root cause and repair

The earlier real Desktop tool check found an indexed prior session hidden by an exact cwd-string comparison. Fixing only search SQL would still leave the tool's authorization rejecting the result. The repair therefore changes three package seams:

1. dsh-session-query: cwd filter predicate uses the Windows workspace key.
2. dsh-session-query-sqlite: a deterministic connection-local SQLite function normalizes both stored cwd and bound filter values. No database migration or schema change is needed.
3. dsh-tool-session-query: header authorization uses the same workspace key. All existing caller-workspace restrictions remain in place.

The helper applies only to fully qualified Windows paths on Windows, normalizing separators and lexical path components with node:path.win32.normalize while preserving case. Unknown/relative paths are not resolved against the process cwd.

Installed Desktop 0.2.1-rc.2 app.asar contains all three repaired packages; the profile-resolved tool package is repaired too. The exact-match, idempotent [patch](../stack/stock-dsh/workspace-path-patch.mjs) stops on an unexpected unpatched source seam. Backups of the pre-change archive and tool source are private under Documents/Codex/2026-10-20/workspace-path-fix/backups. This patch is Desktop-scoped; Web runtime files were not changed. A future Desktop update may replace the patched packages; reapply only if the patch's source checks still match.

## Verification

The focused [regression](../stack/stock-dsh/test/workspace-path.test.mjs) reads the existing prior Desktop history SQLite database read-only and executes the actual extracted filter/authorization functions from the runtime packages. It requires this local installed Desktop and the existing October 20 verification database; it is not a portable general test suite.

- Original exact SQL comparison: zero matches for slash-mismatched cwd.
- Repaired SQLite predicate: one expected session, session-326bc19c-34ad-4138-940f-d483d727e1ea; its known assistant event31 exists with the expected passage.
- Core cwd filtering and tool header authorization: pass for equivalent spellings.
- Other folder and child-folder controls: denied at all three layers.
- Drive/UNC roots, trailing slash, null, relative paths and case-preservation controls: pass.
- Patched module syntax and patch idempotence: pass.

The focused check passed on the prepared candidate, then once against installed sources. Readback confirmed all four deployed file hashes match the planned patch. This was direct SQL/function verification, not a new model-driven tool turn or GUI check. Desktop was not running at process inspection, so no application was interrupted or restarted. The repaired modules load on its next launch.

Six normal Desktop/Web profile, manifest and lock files retained their before hashes. Models, defaults, effort, output limit and integrations were not edited; session logs and the normal index were not modified. No subagents, model calls, benchmarks or compaction tests ran. Model inference token cost for this task: zero; coordinator usage is not exposed by this tool interface.

A readback helper initially used a Windows path instead of a file URL in an ESM import and failed before reading installed state. Correcting that helper import allowed the same readback to complete. The runtime patch itself applied without error.

## Evidence and recovery

[Selected installed hashes, settings preservation and regression result](evidence/workspace-path-fix-2026-10-20/installed-evidence.json). Recovery copies of the patch and all four changed module sources are synchronized under Halo Stack Research/Current Halo Configuration/workspace-path-fix-2026-10-20, with manifest hashes. Full archive backup stays outside Git. To undo, restore the backed-up archive and tool source while Desktop is stopped; normal settings and session history need no restoration.

## Web package-sharing correction

The subsequent Web inspection found that Desktop profile dsh-tool-session-query and Web resolve to the same pnpm file. Thus this task also changed Web's on-disk authorization package; the original statement that no Web runtime files changed was incorrect. Web's core and SQLite filtering were repaired and its idle server reloaded in HALO-WEB-WORKSPACE-PATH-FIX-2026-10-20.md.

## Both apps running with the repair — October 20, 2026, 9:12–9:15 PM MDT

Desktop was started directly with its existing DSH_HOME so catalog-refresh helpers could not rewrite settings. Its visible window is responding; main PID47568 launched host PID67772 from the patched app.asar with the approved desktop profile, listening on64926. Web PID47016 remains on3080 after its repair restart and authenticated session/list returned HTTP200/result.ok=true. All four Desktop and three Web runtime hashes match the verified installed patches; all eight normal configuration/manifest/lock hashes remain unchanged. This confirms fresh Desktop startup and continued Web operation from the repaired files, reusing the preceding focused behavioral evidence. No new model jobs, session-query regressions or compaction tests were run. Both apps were left running.
