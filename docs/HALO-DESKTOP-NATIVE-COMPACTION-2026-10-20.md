# Desktop-host automatic compaction verification — October 20, 2026

> **Correction:** The dependency-failure attribution below was caused by the test whole-node_modules junction crossing Desktop’s profile-resolution boundary, not a confirmed installed dependency defect. A corrected Desktop-host run with a physical dependency copy passed compaction with LSP and all five session-query tools enabled. See [HALO-DESKTOP-DEPENDENCY-CORRECTION-2026-10-20.md](HALO-DESKTOP-DEPENDENCY-CORRECTION-2026-10-20.md). The earlier results and failures remain below as historical evidence.

## Result

**Automatic compaction passed in the installed Desktop host and Desktop local agent preset.** This was not the headless CLI carrier used previously. The installed Electron executable ran its own packaged Desktop host with a separate DSH home and copied Desktop profile. The follow-up was submitted through Desktop's session/prompt RPC, the same host API used by the client. No GUI clicks or visual indicator check is claimed.

One isolated session replayed the existing real failure history, including its already-generated 40,206-token response. There was no padding, benchmark or fresh large-response generation. One new model follow-up ran. No subagents or tools were called by the model.

## Observed evidence

- Temporary threshold: **31,457 tokens** (0.03 × 1,048,576); temporary retention0.001. Normal profiles were not edited.
- Automatic compaction events20/21/23: one start, one summary and successful end; **5.769 seconds**. Shadowed range **8–13**, including the oversized response; estimated shadowed size51,083 tokens.
- The resumed request used **17,229 input tokens**, below31,457, and the turn completed at event33. The larger input than the earlier headless check includes Desktop's tools and prompt context.
- Durable request header: provider **ollama**, model **deepseek-v4.1-flash:1017-cloud**, effort **low**, max output **65,536**. Summary max output8,192; shared summary implementation selects Low for this exact model.
- Task code **LIME-AUTO-20**, the cursor-review concern and the fact that tests were not run survived compaction. However, the follow-up incorrectly broadened a test gap to include malformed-cursor cases, which the original supplied tests covered. Mechanical pressure recovery passed; perfect semantic fidelity is not claimed. The checkpoint's test-coverage wording was also less precise than the original source.
- SHA-256 checks confirm the normal Desktop and Web profiles remained unchanged for this task. No installed model, default, normal threshold, integration or dependency was changed.

## Important isolation and installed-integration limitations

The initial copied profile lacked the home-level LSP registrations; that omission was corrected by copying the installed home patch and redirecting its SQLite path into the isolated home. Three pre-inference resume attempts failed, including an unchanged retry after a shell quoting error prevented the preparation command from running. They made no model requests. These are recorded preparation failures, not successful tests.

The full Desktop preset still could not start its LSP and session-query consumers. Logs showed external profile packages unable to resolve **@deepseek-ai/cordis**, and the Codex subagent package unable to resolve **@deepseek-ai/dsh-timeout**. The subagent model-settings plugin also reported a missing dependency. This evidence concerns the installed packages resolved by the copied Desktop profile; no claim that their full user-visible workflows are healthy is justified.

To finish this compaction-only verification, **tool-lsp and tool-session-query were disabled only in the isolated copy**. The same Desktop host, local preset, provider and compactor then completed the one model turn. These exclusions do not exercise or repair those integrations. Their normal installed configuration was preserved. No live setup repair was attempted under this verification request.

The owned host received IPC shutdown after the completed turn. It had not exited after the two-second cleanup wait, so the runner terminated that owned host (PID66392); its recorded process signal is SIGTERM, not a clean exit0. The completed model turn and compaction were already durable before cleanup. The temporary copied profile was reset to its original policy afterward.

## Prompt, usage and records

Exact [follow-up prompt](evidence/desktop-native-compaction-2026-10-20/PROMPT.md), [selected events](evidence/desktop-native-compaction-2026-10-20/EVENTS.json), [temporary policy](evidence/desktop-native-compaction-2026-10-20/POLICY.json), [normal-profile hashes](evidence/desktop-native-compaction-2026-10-20/preservation.json) and [usage](evidence/desktop-native-compaction-2026-10-20/usage.json) are retained. Raw historical reasoning, full private logs and launch tokens are not published.

New provider traffic: **76,456 tokens**, including **56,876 cached input**, **17,358 uncached input**, and **2,222 output**. These figures include the checkpoint and follow-up only; historical generation and Codex coordination are excluded. Exact coordinator token accounting is unavailable here and is not invented.
