# Claude provider repair - November 14, 2026

Claude Code was installed via Scoop/npm at version 2.1.322, but DSH's native executable finder searched only the older npm/user/Desktop locations. Added native executable discovery for Scoop, npm prefixes and absolute PATH directories. Shell wrappers remain unexecuted. Existing native permissions and authentication handling are unchanged.

Web and Desktop now declare the same four Claude entries: Opus 5.5, Sonnet 5.5, Haiku 4.5 and Haiku 5.5. Repaired the Desktop Haiku 4.5 label and updated picker curation so it retains these entries. Existing Opus/Sonnet effort metadata is retained; no new Haiku effort controls were invented. The default remains DeepSeek V4.1 Flash 1017 Cloud / Low.

Verification: 35 affected runtime/adapter tests passed, including native Scoop/PATH discovery and shell-wrapper exclusion. Real executable discovery succeeded; the read-only auth-status probe reported authenticated through claude.ai. Parsed before/after profiles prove all non-Claude blocks unchanged and identical Claude metadata across profiles. Neither working app was running; no apps were launched, no process was stopped and no model prompt was sent. Changes take effect on the next normal app launch. Model catalog entries do not prove account access to every model; inference and GUI acceptance were intentionally not run.

Recovery: exact pre-change live/profile copies and sanitized status/verification receipts are in the current chat outputs/claude-repair-2026-11-14 folder. Versioned source baseline is retained in Git. Current Halo Configuration/claude-repair-2026-11-14 contains changed source and installed profiles with SHA256 manifest. No installer/release asset was rebuilt or replaced.

Execution used the current Codex session only; no delegated or external model jobs. Authentication probe completed within 9 seconds; test suite completed in 323 ms.
