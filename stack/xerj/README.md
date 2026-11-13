# XERJ for Halo DSH

Current recovery: [Windows storage identity repair](../../docs/HALO-XERJ-INDEX-RECOVERY-2026-10-25.md) pins the original physical store and restores all 14 records.

Read [installation, verification and recovery](../../docs/HALO-XERJ-INSTALLATION-2026-10-17.md). XERJ v1.0.0-rc.101 is an existing Apache-2.0 search engine; this folder contains only the Halo lifecycle adapter, scoped stop helper and MCP configuration.

The service starts on demand with neural embeddings when either DSH MCP connection opens. Use the Start/Stop XERJ.cmd files for manual recovery. Do not change DSH model defaults. Only four Halo Markdown snapshots are indexed in halo-records-docs. Ask: "Use XERJ to search index halo-records-docs for the installed Gufo cache review and cite the source."

Recovery: obtain the Windows x64 release ZIP and companion .sha256 from the pinned official GitHub release; verify SHA256 before extraction to C:\Users\scott\AppData\Local\Programs\xerj. Keep the active persistent data at C:\Users\scott\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\XERJ\data-rc101-20261112 outside the source corpus. Merge only mcp-row.yml into each actual profile; never replace an entire live profile with a recovery copy. Start the node in neural mode before ingestion.

To refresh the four-document snapshot, copy the corpus.json originals into C:\Users\scott\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\XERJ\corpora\halo-records, then use the official xerj autoindex command with --url http://127.0.0.1:9200 --prefix halo-records --state-dir C:\Users\scott\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\XERJ\autoindex\halo-records --workers 1 --bulk-mb 1 --no-graph --json. Reindexing is not automatic.


2026-11-12 upgrade: active data is C:\Users\scott\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\XERJ\data-rc101-20261112. Original data directory is retained untouched for rollback. The service was verified through the shared launcher and then stopped to unload the embedding model. Normal on-demand startup still loads XERJ MiniLM; no LLM is involved. Recovery executable, launcher and README: C:\Users\scott\Documents\Codex\2026-11-10\dsh-stack-rc1\xerj\neural-compat-20261113T064142Z\cutover-recovery.
