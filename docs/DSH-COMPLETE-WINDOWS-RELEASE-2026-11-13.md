# Windows installer 0.1.2 release publication — November 13, 2026

Published [Halo v0.3.14](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.14) as GitHub **Latest**, at Scott's explicit instruction. The repository release version is v0.3.14; the installer is 0.1.2; Web/Desktop pins remain 0.2.2-rc.1 with embedded seven-tab Mission Control. This supersedes the earlier source-publication-only status, without rewriting historical acceptance records.

## Exact candidate and assets

The release tag points to source `ab3b2b32cf8ba6ef357dbc0cd73c11b3279ce07f`. The accepted installer was first delivered in source `b03d65ea1f6c177bf52db18de7dedd6676185ad9`; the ZIP is unchanged. This later documentation commit records publication and is not a new binary or bundle identity.

Four attached assets:

- `DSH-Complete-Windows-0.1.2.zip`
- `DSH-Complete-Windows-0.1.2.zip.sha256`
- `INSTALLATION.md` — guide copied from the accepted source.
- `VERIFICATION.json` — existing public payload verification receipt.

ZIP SHA-256: `41c395a0507cd36a22994a87398324946818e9f75789fc3c92362b7ee5bca4dd`.

## Executed verification

1. Reused prior installer, signature and headless acceptance; did not reinstall, rebuild or repeat model/runtime tests.
2. Verified the staged ZIP checksum and all 45 manifest entries before upload.
3. Created a draft at the explicit commit with all four assets. Read back draft identity and downloaded assets; every hash matched before publication.
4. Published that draft with Latest explicitly selected. GitHub's Latest API and unauthenticated `/releases/latest` redirect both identify v0.3.14.
5. Downloaded all four published assets, then independently downloaded each through its unauthenticated public URL. Every byte/hash matched the staged accepted files.
6. Compared before/after snapshots: all 18 older releases retained their IDs, tags, names, bodies, dates, release flags and asset identities/content metadata. All 38 pre-existing tag references retained their exact commit targets. Only the new v0.3.14 tag was added. The previous release ceased being Latest as explicitly requested.

[Machine-readable publication receipt](evidence/complete-windows-0.1.2-2026-11-13/release-publication.json) · [Accepted installer evidence and limitations](DSH-COMPLETE-WINDOWS-0.1.2-2026-11-13.md) · [Release notes](../RELEASE-NOTES-v0.3.14.md).

## Preservation, scope and recovery

No working installation, executable, profile, model setting, session, goal, shortcut or existing recovery material was modified. No app/model service, local inference, embedding model, computer input or subagent was used. This publication used the current Codex/OpenAI session, serially; no model job was dispatched. The existing upstream Desktop Authenticode verification remains the applicable executable signature evidence. The ZIP contains public setup scripts/locks, not a newly built user-owned executable, so no new signing run was performed.

No fresh-PC, account, model/GPU or additional integration acceptance is claimed. Setup is online and uses a new destination; keep the working installation and rollback files. Normal XERJ startup can load embeddings. Older release downloads remain available; no automatic installation/cutover or rollback was performed. The landing page remains on its accepted deployed bytes and already links the identical current installer.

No publication failures occurred. Initial lookup confirmed v0.3.14 did not exist before creation. Release snapshots, downloaded readbacks and publication receipt are retained locally. Human-readable Research and recovery records plus STATE.md are synchronized at delivery.
