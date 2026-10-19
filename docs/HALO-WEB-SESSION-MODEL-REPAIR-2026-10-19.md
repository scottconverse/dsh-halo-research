# Web existing-session model repair - October 19, 2026

Five saved Web sessions still selected the retired Ollama cloud ID after the picker/default change. They now select `deepseek-v4.1-flash:1017-cloud`, provider `ollama`, reasoning effort `off`. Local models and other providers were not changed. No subagents, model requests, benchmarks, installs, server restarts or provider changes were used.

## Changes and evidence

- Gufo cache review search: selected through Web's own picker; durable selection event 26.
- Ollama Cloud test and hash: selected through Web's own picker; durable selection event 32.
- /reddit-search this topic: Longmont Colo: selected through Web's own picker; latest durable selection event 1710.
- Report Local News Longmont Colorado: appended selection event 591 after repairing the stored-history blocker below. Reloaded Web successfully displayed the history and the actual picker showed DeepSeek V4.1 Flash 1017 (Ollama Cloud), effort Off.
- Archived Cloud repair check: deepseek-v4.1-flash:cloud: appended selection event 25. Its historical title was preserved. Its original workspace directory no longer exists, so this old archived session remains unavailable for normal interaction; its saved selection is migrated. Archive membership was restored and read back from durable workspace metadata after the temporary UI unarchive inspection. No replacement workspace was created.

Read all concatenated zstd frames in Web's stored session logs and checked the latest model-selection events. No remaining Ollama cloud selection event uses the retired ID. Projection-cache inventory agrees: all six effective Ollama selections, including the already-correct Reply exactly OK session, use 1017. Historical requests and titles can still mention the retired ID; these are not rewritten. No fresh inference was run, so this record proves saved selection migration and reporting-session UI loading, not a new provider response.

## History blocker and repair

The reporting session could not load because command/error event 582 contained sourceEventSeq 579 pointing to command/run. The installed validator rejects sourceEventSeq on an error completion; the other historical error completions omit it. Backed up the original compressed log and removed only that invalid optional reference. Kept the error, conversations, prior requests, sequence numbers and other content. Added the new model-selection event separately. Updated the two remaining sessions' derived model-selection cache rows to match their log events.

An initial rewrite incorrectly combined the header with event lines in one compressed frame. Web rejected that container structure. Corrected it from the intact original backup: retained original frames, recompressed only the frame containing event 582, and appended the selection as another frame. The subsequent actual Web reload succeeded. No claim that the initial attempt passed.

## Operational limitations and accounting

Automatic approval review rejected an initial API approach because it would have obtained an authentication token from a launch log. That action did not run. Used the already-authenticated UI for available sessions, then backed-up local metadata edits for the two inaccessible cases; no token extraction or cookie exchange was performed.

Original logs, original projections, archive metadata backup, scoped scripts and readback receipts remain private under `C:\Users\scott\Documents\Codex\2026-10-19\dsh-web-session-repair`. No private conversation dumps or credentials are committed. No persistent runtime code was added. The original archive filter was restored. Missing archived-workspace availability is an existing limitation, not repaired or represented as working.

Delegated usage: zero. DSH generation usage for this repair: zero (no requests). Coordinator token usage is not available from these tools; no numerical total is invented.
