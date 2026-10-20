# DeepSeek 1017 output limit — October 20, 2026

Requested: set output to 32K in Web and Desktop, preserving Low effort and everything else.

Changed only the exact DeepSeek `deepseek-v4.1-flash:1017-cloud` model entry's `maxTokens` from 8,192 to **32,768** in both installed profiles and their repository recovery profiles. Low effort, the 1,048,576-token context window, model/provider selections, other model limits and integrations are unchanged. This is a per-response maximum, not a target response length.

Verification: read back all four files and verified each difference is exactly that one numeric field. Both applications had no identified running process at inspection; the saved setting applies when next launched. No application restart, model job or benchmark was run. Actual provider enforcement was not exercised.

Private pre-change backups: `Documents/Codex/2026-10-20/deepseek-32k`. Current recovery copies and SHA-256 entries were synchronized in Halo Stack Research. No credentials, session contents or private backups were published.
