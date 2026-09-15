# Halo DSH 0.1.6-alpha.1 upgrade

The normal Windows deployment now uses stock DeepSeek Harness `0.1.6-alpha.1`, upstream commit `0a15e36e7f82b6ed45af6fa9759f29b40dcd965d`. DSH remains on 3080 and Mission Control on 3090. The default remains local `halo-coder-q4km`, with `halo-brain-35b` available explicitly. Both retain the approved 131,072-token context and tuning.

## Use the five stock capabilities

| Capability | What to ask or click | Implementation |
|---|---|---|
| Previous-session recall | “Find the earlier session where we fixed this.” Use the same workspace. | Stock SQLite full-text index and five session query/read tools, scoped to the caller's exact workspace. |
| Code navigation | “Find this function's definition and references.” | Stock LSP service, stdio provider and `lsp` tool, with TypeScript/JavaScript and Python servers. Definitions, references, implementations and hover; no file editing. |
| Chrome interaction | “Open this page in Chrome and inspect it.” | Stock Chrome DevTools MCP via the browser service; tools named `mcp__chrome-devtools-mcp__*`. Launches a separate Chrome instance on demand. |
| Persistent PowerShell | Ask the agent to retain a shell, or open the right sidebar and click **New terminal**. | Stock `terminal_*` tools and graphical Terminal panel, configured for PowerShell 7. Existing one-shot `pwsh` remains. |
| Optional Codex | At new-session creation, select **Local + Codex (opt-in)**, then request Codex delegation. | Stock `subagent_codex`, using a real one-shot `gpt-5.6-luna` worker and native Codex authentication. Consumes Codex usage. Ordinary **Local models** does not expose it. |

Google Gemini is also available through the owner-selected **TownReporter** AI Studio key. Select **Gemini 3.6 Flash** in DSH's model picker for the verified route. The key stays in DSH's credential store, outside this repository and recovery documents. AI Studio showed the project on **Free tier**. This is Gemini API access, not an Antigravity agent connection or proof of subscription-funded API access. Gemini 2.5 Flash appeared in Google's catalog but rejected this project as a new user; 3.6 Flash completed successfully.

## Migration details

- Pinned DSH and its optional stock packages to the same alpha release. No replacement session, browser, terminal, search or delegation engine was written.
- Changed the retired `workflow-worker-thread` row to stock `workflow-ptc`. Preserved Ralph, memory MCP, skills, permissions, ordinary subagents, Wigolo and native search/fetch fallback.
- Enabled lazy history indexing at `C:/Users/scott/.dsh-stock/session-search.db`.
- Installed TypeScript language server 6.0.0, TypeScript 6.0.3 and Pyright 1.1.414. TypeScript 7 lacked the expected `tsserver.js`; the tested 6.0.3 server path is explicit. `tsserver.useSyntaxServer: never` ensures queries use the full semantic server; otherwise an immediate query could return an import binding before a nested project was ready.
- Added a full-copy `local-codex-preset`, following upstream's preset design. Its Codex tool is enabled; ordinary local retains `disabled: true`. Keep common preset changes synchronized.
- Updated Mission Control's version pin and retained all seven areas. Its live inventory reported 168 host entries: 141 active, 27 disabled, no failed/waiting/stuck entries.
- The launcher creates `.dsh-stock/node_modules` as a junction to the pinned deployment dependencies. Profiles and user presets outside the repository can then resolve optional stock packages through Node's normal lookup. Core profile packages retain their stock shared-store layout.

No Agent Teams, reminders, new local models, Antigravity bridge or Claude provider was added.

## Verification

First validated in an isolated Windows DSH home on port 3081, using real local-model tool calls:

- History search retrieved the prior tuning acceptance session and matching content.
- Python definition lookup returned `alpha-tools/definition.py:1:5`. The final live TypeScript lookup returned the actual cross-file definition at `alpha-tools/definition.ts:1:17`.
- Separate persistent terminal calls set 41 and returned 42. The original one-shot PowerShell tool separately returned its marker.
- Chrome navigated to DSH and read its authentication-required message. The automated browser was not given the user's interactive browser session.
- The stock graphical terminal visibly returned 42 from a variable set in an earlier command, using PowerShell 7.
- Native Codex read two supplied files and returned `haloSum`, parameter types `number, number`, and result `5`.
- Gemini 3.6 Flash returned `GEMINI_CONNECTION_OK` through DSH. Its authenticated models-list request returned HTTP 200.

Mission Control's installer passed syntax validation and its four mandatory contract suites. The updated package/picker/launcher suite passed all four checks. Live configuration validation returned `ok: true`, no warnings. This is functional integration acceptance, not a broad model-quality benchmark; every LSP operation and language extension was not separately tested.

Evidence: [staged tool results](evidence/dsh-alpha-acceptance-2026-09-15.json), [live deployment](evidence/dsh-alpha-deployment-2026-09-15.json).

The production frozen-lockfile install initially encountered pnpm's 24-hour release-age policy. Temporary exact exceptions for the 245 DSH alpha package versions allowed this owner-requested same-day release; pnpm verified the lockfile and installed successfully. Normal policy was restored immediately. See [pnpm release-age settings](https://pnpm.io/settings/dependency-resolution#minimumreleaseageexclude).

## Sessions, teams and other providers

A stock session is the saved conversation and work history: messages, tool calls, model choices and events DSH can restore. Mission Control displays that stock data; it is not another session engine. Stock session reminders can retain work for a live session, but are separate from a Windows scheduler.

Ordinary subagents handle bounded assignments. Workflows combine steps and tools. Agent Teams adds longer-lived teammates, shared tasks and messages between them. It is a valid upstream option when work needs that coordination; it is not required for these five features. If adopted later, use DeepSeek's implementation rather than a custom replacement.

Upstream also supplies `@deepseek-ai/dsh-subagent-claude-code`, using native Claude authentication and the Claude Agent SDK. It was not installed or tested here. Subscription eligibility and SDK billing follow Anthropic's current terms; a login alone does not prove ordinary chat allowance covers SDK calls. The reviewed DSH release has no dedicated Antigravity agent provider.

The [earlier stock capability review](DSH-STOCK-CAPABILITY-REUSE-REVIEW-2026-09-15.md) exists in the private GitHub repository. Its signed-out 404 was a visibility issue. Read the local copy or sign into GitHub with an account that has access.
