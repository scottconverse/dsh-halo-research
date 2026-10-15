# Gufo installation, real jobs and DSH speed correction — October 15, 2026

This index preserves the work and its limits in one place. Reports below record the full job prompts, model identities, timing, usage and findings. No new jobs were run to create this documentation.

## Work performed and reports
1. [Windows installation and integration](HALO-GUFO-WINDOWS-2026-10-15.md): pinned Windows Gufo release, checksum, existing 27B Q6 weights, additive providers in Web and Desktop, serialized real library lookups, startup protection, launchers, original defaults restored. Includes the failed initial Web provider setup and its correction.
2. [Recommended model configuration](HALO-GUFO-RECOMMENDED-MODEL-2026-10-15.md): downloaded Unsloth 27B Q4 target and z-lab DFlash2 draft, verified published hashes, added picker entries, one real Desktop lookup. These are recommended third-party weights, not Gufo-trained weights. Web exposes the entry but this Q4 configuration was not separately exercised there.
3. [Short coding job](HALO-GUFO-CODING-2026-10-15.md): verbatim prompt, four planted defects, unchanged visible tests, successful repair, 67.057-second elapsed duration, eight model passes and server-derived timing. It finished sooner than the requested few minutes; no work was added to prolong it.
4. [DSH speed-reporting repair](HALO-DSH-GENERATION-SPEED-2026-10-15.md): actual shared source bug, exact scope of the local Web/Desktop repair, saved-record verification, observed UI results, rollback and upgrade limitations.

## Why the numbers differed
The initial runtime rates came from Gufo server decode records. DSH's footer used its own stream-event timing. The coding job's original 76 tok/s and library job's 41 tok/s were not comparable engine measurements. Source inspection confirmed DSH counted buffered tool-call output tokens against almost no apparent streaming time. This explains the inflated footer without implying intentional inflation.

The early coding report described the denominator as final-answer streaming alone. The exact original projection also included tiny tool-call delivery intervals: approximately 15.415 seconds total, versus 15.398 seconds for the final text. The corrected text-only calculation is 352 / 15.398 = 22.86 tok/s. Gufo's approximately 28.35 tok/s combined engine decode estimate includes all main-pass output and remains a different metric.

## Saved evidence and reproducibility
- [Numeric before/after results](evidence/generation-speed-2026-10-15/replay-results.json): four existing jobs replayed through both apps' calculation code, eight results; these are replays, not eight new jobs.
- [Replay verifier](evidence/generation-speed-2026-10-15/verify-replay.mjs): the script actually used, with machine-specific paths retained. It requires the original local package copies and decoded journals; it is not a portable test suite and must not be presented as one.
- [Deployed repair script](../stack/stock-dsh/repair-generation-speed.mjs).
- Local raw evidence, original files and Desktop archive backup: `C:\Users\scott\Documents\Codex\2026-10-15\dsh-speed-reporting` and the `gufo-install`, `gufo-recommended`, and `gufo-coding-job` sibling folders. Full journals, runtime binaries and the archive backup remain local; this GitHub record does not claim they were all uploaded.

## Verified final state
Desktop visibly displayed 23 tok/s (text) for the completed coding job; Web displayed 8.3 tok/s (text) for its completed library job. The original Q4 library record recalculates to 26.43 text tok/s instead of 40.68. Usage counts and existing turn/step/model/tool timing were preserved. Defaults and model catalogs were not changed by the speed repair. Both idle apps were restarted to load the repair. No new inference, benchmark, model load or tuning sweep was performed for the reporting repair.

The shared bug can affect other providers with similarly buffered tool calls. Inflation was demonstrated on Gufo records only; LM Studio and Ollama rates were not independently verified. The replacement is client-observed text throughput, not exact engine throughput. It conservatively excludes every response containing tool calls, even where a provider streams them. Future DSH upgrades may overwrite these local runtime patches; no upstream merge or automatic reapplication is claimed.

## Publication and recovery
Repair and original receipt were published in commit `5b4178c711a85c31c12d9b582e77354a7c81c44d` on `scottconverse/dsh-halo-research`, verified against remote master. This follow-up adds the consolidated index and replay evidence. Human-readable records and recovery copies are synchronized under `C:\Users\scott\Desktop\Halo Stack Research`.
