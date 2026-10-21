# Halo v0.3.5 — Web and Desktop workspace and compaction fixes

Web and Desktop now match sessions in the same Windows workspace regardless of forward/backslash spelling. Search filtering and authorization use the same case-preserving Windows path normalization. Other folders remain excluded; stored session headers and normal settings are unchanged.

## Included since v0.3.4

- Windows workspace comparison repaired in core filtering, SQLite search and model-facing authorization for both apps. Web's shared tool dependency is documented accurately.
- DeepSeek 1017 uses Low effort with a 65,536-token output limit in Web and Desktop. Compaction summaries use Low too.
- Automatic compaction handles the oversized retained-response case, with the Desktop preset integration included.
- Actual Desktop LSP definition lookup and persisted session-query retrieval are documented. The earlier apparent dependency failure is explicitly corrected as an isolation-fixture problem, not an installed dependency defect.
- Exact prompts, selected public evidence, preservation checks, failures and limitations are retained in the linked reports.

## Existing verification and current state

No tests or model jobs were run to create this release. Existing affected verification found the slash-mismatched session after repair, retained other-folder exclusions, and verified installed runtime hashes and unchanged settings. Desktop has since been started with its approved existing home/profile and responsive window; Web was restarted idle and answered authenticated RPC. Both were left running from repaired files. These are recorded observations, not a new verification campaign.

- [Desktop workspace repair and startup confirmation](docs/HALO-DESKTOP-WORKSPACE-PATH-FIX-2026-10-20.md)
- [Web workspace repair and startup confirmation](docs/HALO-WEB-WORKSPACE-PATH-FIX-2026-10-20.md)
- [Real Desktop LSP and session query](docs/HALO-DESKTOP-REAL-TOOLS-2026-10-20.md)
- [Desktop dependency finding correction and full-tool compaction evidence](docs/HALO-DESKTOP-DEPENDENCY-CORRECTION-2026-10-20.md)
- [Retained-response compaction repair](docs/HALO-RETAINED-RESPONSE-FIX-2026-10-20.md)
- [64K output configuration](docs/HALO-DEEPSEEK-64K-2026-10-20.md)
- [Complete work history](docs/HISTORY.md)

## Distribution and limits

This is the machine-specific Halo deployment source release; the underlying Web/Desktop DSH version remains 0.2.1-rc.2. It is not a standalone installer and does not automatically update another installation. A DSH upgrade can overwrite the guarded runtime patches.

No private session dumps, credentials, runtime databases, downloaded models, installers or new backup files are attached. Existing historical runtime-patch backup files and the registry-path backup are excluded from source archives using export-ignore; their prior Git history is retained. Documentation and selected already-published evidence are included.
