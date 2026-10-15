> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Development picker — actual browser checks

UPDATE: search.3 opening-screen picker is now installed and visually observed before a workspace/session exists. The actual menu retains 2,747 catalog entries, including the native Claude/Codex groups, local models and OmniRoute. A browser selection of Claude/sonnet was persisted in development `agent-default-model` settings. See `CLI-INTEGRATION-STATUS-2026-09-02.md` and the current live evidence; earlier search.2 observations below are historical.

Date: 2026-09-02, America/Denver. Target: `http://127.0.0.1:3180` only.

The parent installed the built searchable picker into the independent development profile, restarted only its owned DSH process, and tested the actual browser UI. This supplements, not replaces, the component/mocked-hook tests in `dev/picker`.

## Observed

- The refreshed DSH model RPC reported 32 direct LM Studio choices and 2,705 gateway choices, with no model-directory errors. Browser status reported **2,737 of 2,737** after clearing the search with Ctrl+A and Backspace.
- Searches for Claude, Kimi and GLM showed relevant choices. DeepSeek search was checked on the immediately preceding 2,625-entry snapshot. An invented search returned `0 of 2737 models` and `No matching models. Try another search.`
- `Loaded local: halo-brain-35b [lmstudio; configured]` was selected in the menu and verified by DSH RPC as `omniroute` / `lmstudio/halo-brain-35b`.
- Arrow Down from search focused the matching Coder item; Enter selected it, and a subsequent RPC confirmed `omniroute` / `lmstudio/halo-coder-q4km`. Immediate DOM reads can precede the asynchronous selection update; the later RPC was the deciding evidence.
- Selecting the direct daily brain afterward was confirmed as `lmstudio` / `halo/qwen3.6-35b-a3b`. No prompt was sent during these picker checks.
- The page visibly retained **Full access** and the **Halo DEVELOPMENT** preset. The failed coding trajectory remained available rather than being discarded.
- A 1,280 by 720 browser screenshot showed a usable desktop cockpit and search menu, but long provider/account labels were clipped. That finding was returned to the picker workstream for correction; final layout acceptance is recorded below when completed.

## Limits and instrumentation notes

### Final desktop layout check

The parent installed `search.2`, restarted only development DSH (PID 35144 at 03:11:41 MDT), refreshed the browser, and viewed the menu again at 1,280 by 720. Claude labels now visibly wrap, including provider, `connect account`, and `context unverified`; the menu fits the desktop viewport and remains scrollable. Build SHA-256: `869637FA19D8A989CDB5FE72AC62D142882A5986D8F504C316915096E035B177`. No mobile-width rendering claim is made.

The old Coder session reopened after restart with its last executed gateway Coder route, while the saved **new-session default** in development settings remained the direct local brain. The pre-restart in-memory selection did not persist for that existing session. This is an observed session-selection continuity limitation; do not claim every pending selection survives restart. New-session default and an existing session's last model are separate states.

Typing an empty value through the browser automation fill helper did not immediately reset the filter in this run. Actual keyboard select-all/backspace did, and restored all 2,737 choices. Do not present the helper behavior as either a proven product bug or a successful clear-button test.

This pass did not certify mobile layouts, every reasoning-menu combination, every one of the thousands of catalog choices, or browser-console cleanliness. Cloud catalog visibility is not cloud authentication, subscription entitlement, actual provider availability, or coding acceptance. The large number includes many providers serving the same underlying model.

Evidence is the recorded browser/tool transcript plus development RPC checks. No fabricated automated browser-test report or saved screenshot file is claimed. Source/component test evidence is separately preserved in `dev/picker/evidence` and the combined capture in `dev/evidence`.
