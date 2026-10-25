# Halo v0.3.7 - DSH rc.3 upgrade and XERJ recovery

Web and Desktop are now on upstream DSH **0.2.1-rc.3**. XERJ's original
`halo-records-docs` index is restored, and startup now selects the same physical
data store from ordinary Windows and packaged-app contexts. Existing models,
defaults, plugins, skills, Wigolo and Reddit/Redlib are preserved.

## Included since v0.3.6

- Official Web and Desktop DSH 0.2.1-rc.3 upgrade, including dependency locks,
  recovery records and carried-forward Halo speed/workspace/compaction fixes.
  Upstream source: `1f81c047fc48fa190a683e469daa699857e9afe8`.
- Official Windows installer feed hash and Authenticode provenance recorded.
  The downloaded installer and private recovery backups are not distributed.
- Existing native `model_route` plugin, routing CLI and companion skill retained.
  Exact DeepSeek `deepseek-v4.1-flash:1017-cloud` remains Low effort with a
  65,536-token maximum output allowance. Other model choices remain unchanged.
- XERJ repair: Windows AppData redirection exposed two different stores. The
  original corpus was not deleted. Launcher and owned-stop helper now pin its
  physical Codex LocalCache location; readiness refuses a healthy server that
  fails to serve the retained index rather than silently accepting the wrong store.
- Original 14 records restored without reindexing or embedding recomputation.
  Existing MiniLM neural embeddings and all 55 segment/HNSW files were preserved.
- Dated upgrade/recovery reports, sanitized receipts, current README and history.

## Existing verification evidence; no new tests

The upgrade's earlier native ToolRuntime checks passed in both installed hosts:
one tiny model_route response each using DeepSeek 1017 Low/64K (76 provider tokens
total), a Wigolo page fetch and a Reddit listing through local Redlib. Four saved
profiles and all 70 skill files were unchanged. These were focused native checks,
not exhaustive UI or general regression testing. Reddit comments were not examined.

After XERJ recovery, one real Web MCP semantic retrieval returned three relevant
hits in 91 ms (84 ms engine time). A later ordinary-Windows startup/readiness check
adopted the same explicit physical store with its 14 records. No LLM generation,
reindex or model download was used for that repair. This is not a new Desktop
semantic-retrieval claim; both apps retain their shared XERJ connection.

No tests, benchmarks, model calls, installations or app restarts were performed
to prepare this release. Publication reuses the recorded evidence and checks
only source identity, release archive contents and delivered release metadata.

- [DSH rc.3 upgrade report](docs/HALO-DSH-UPGRADE-2026-10-25.md)
- [Upgrade acceptance receipt](docs/evidence/dsh-rc3-upgrade-2026-10-25/acceptance.json)
- [XERJ root cause, repair and recovery limits](docs/HALO-XERJ-INDEX-RECOVERY-2026-10-25.md)
- [XERJ repair receipt](docs/evidence/xerj-index-repair-2026-10-25/repair-receipt.json)
- [Native routing plugin and companion skill](stack/stock-dsh/skills/deepseek-harness-model-routing-1024/plugin/README.md)
- [Complete work history](docs/HISTORY.md)

## Distribution and remaining limits

This is the **Halo deployment source release v0.3.7**, not a standalone installer
or an upstream DSH version. Upstream DSH 0.2.1-rc.3 is a prerelease; routing plugin
version remains 0.1.0. GitHub's standard source ZIP/tar archives carry this snapshot;
there are no additional binary assets and no automatic migration of another machine.

The restored XERJ store remains in the Codex package LocalCache. Back it up before
resetting or uninstalling Codex; the repair report documents the physical path.
The separate empty ordinary-Windows store was left intact. Moving the entire store
elsewhere was outside this repair. The upgrade's earlier missing-index evidence is
preserved as historical, with the subsequent recovery linked.

Private sessions, raw thinking, runtime ledgers, credentials, personal voice skills,
caches, weights, downloaded installers, scratch work and the broken accounting
prototype are excluded. Historical tracked runtime-patch and registry-path backups
remain excluded from source archives with export-ignore; Git history is not rewritten.
