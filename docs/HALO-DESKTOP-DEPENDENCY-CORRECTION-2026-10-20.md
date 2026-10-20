# Desktop dependency finding corrected; compaction verified without tool exclusions

October 20, 2026. Installed Desktop0.2.1-rc.2; Ollama DeepSeek1017, Low, max output65,536.

## Outcome and correction

**The reported LSP/session-query dependency failures were caused by the verification setup, not demonstrated defects in the installed Desktop profile.** The earlier report and chat attributed them to the normal installation without establishing that distinction. That attribution was wrong.

The previous isolated home linked its entire `profiles/desktop/node_modules` to the normal installation outside the isolated profiles tree. Desktop's existing `dsh-app-boot` module-resolution interception scopes importers to the active profile/profiles tree or recognized linked roots. Importers reached through this whole-tree junction lived outside that scope, so their native imports could not see the bundled runtime peers. Their apparent missing `@deepseek-ai/cordis` / `dsh-timeout` packages were artifacts of that layout.

The repair is to the isolation method: use a **physical copy of the original dependency tree inside the isolated Desktop profile**, copy the home-level host-service configuration, and redirect only the test SQLite path. No new runtime resolver, application patch or permanent dependency install is needed. No tools are disabled for the corrected run.

The normal Desktop configuration, model defaults, catalog, integrations, package.json, workspace policy and lockfile are all unchanged, verified by saved SHA-256 hashes. Its existing `autoInstallPeers:false` remains intact. The same installed dependency contents work when placed in the supported profile layout.

## Rejected candidate and preparation failures

Before identifying the scope issue, a separate staging folder used `pnpm install --ignore-scripts --no-frozen-lockfile`, with auto peers and strict peer checks enabled. It installed76 packages in2.2s, reused75 and downloaded1. The application/plugin pins were unchanged. This candidate was not deployed. Linking that separate peer closure into the isolated profile caused duplicate scoped-registry registrations; the session failed to resume before any model request. Source inspection then identified the profile-scope routing issue. The staged candidate is discarded rather than added to the deployment.

There was **one model turn** in the corrected isolated session, not a repeated benchmark. Earlier staged resume failure made no model request. No subagents, padding or new large-response generation ran.

## Actual Desktop-host acceptance

The installed Electron executable ran its packaged Desktop host and copied normal Desktop local preset, through Desktop session/prompt RPC. This was not the headless CLI carrier. No GUI click or visual-indicator claim is made.

- All normal tool states were preserved; no additional disabled entries were introduced. The resumed request registered **47 tools**, including **lsp** and **session_search, session_trace, session_event_search, session_event_read, session_event_trace**. Host logs contain no failed activation/import or never-started messages. This proves activation/registration and successful session resume, not a separate language-server request or history-search test.
- Restored the same immutable real session prefix through event15 with its already-generated40,206-token response. Exact short follow-up and fixture hash are in the evidence directory.
- Only isolated compaction threshold0.03 and retention0.001 were temporary. Effective threshold **31,457 tokens**; normal headroom8,192 and summary max8,192 preserved.
- One automatic start/summary/end at events20/21/23; range **8–13** includes the large response. Estimated shadowed content51,083 tokens. Duration **5.157 seconds**.
- Resumed input **18,528 tokens**, below31,457; turn completed at event33. Actual request header confirms **ollama/deepseek-v4.1-flash:1017-cloud**, **Low**, **65,536 output tokens**.
- Follow-up retained **LIME-AUTO-20**, the qualified cursor concern and “tests not run.” This is evidence of useful retained context, not a guarantee that future model summaries are perfectly faithful.
- Owned host PID8668 exited cleanly with code0 after IPC shutdown. Normal Desktop/Web processes were not stopped or restarted. The copied temporary profile is reset afterward; staged and copied test dependency folders are removed after preserving selected evidence.

## Usage, evidence and scope

Provider-reported traffic for the new checkpoint plus follow-up: **77,080 total tokens**, **75,533 input**, **1,547 output**. No cache-read tokens were separately reported for these requests; that does not establish lack of server-side caching. Historical fixture generation and Codex coordination are excluded. Exact coordinator accounting is unavailable here.

See [events and registered tools](evidence/desktop-dependency-correction-2026-10-20/EVENTS.json), [prompt](evidence/desktop-dependency-correction-2026-10-20/PROMPT.md), [preservation hashes](evidence/desktop-dependency-correction-2026-10-20/preservation.json), [usage](evidence/desktop-dependency-correction-2026-10-20/usage.json), and [redacted host log](evidence/desktop-dependency-correction-2026-10-20/host-redacted.log). No raw historical reasoning, credentials, dependency trees or private backups are published.
