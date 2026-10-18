# XERJ for Halo DSH

Read [installation, verification and recovery](../../docs/HALO-XERJ-INSTALLATION-2026-10-17.md). XERJ v1.0.0-rc.96 is an existing Apache-2.0 search engine; this folder contains only the Halo lifecycle adapter, scoped stop helper and MCP configuration.

The service starts on demand with neural embeddings when either DSH MCP connection opens. Use the Start/Stop XERJ.cmd files for manual recovery. Do not change DSH model defaults. Only four Halo Markdown snapshots are indexed in halo-records-docs. Ask: "Use XERJ to search index halo-records-docs for the installed Gufo cache review and cite the source."

Recovery: obtain the Windows x64 release ZIP and companion .sha256 from the pinned official GitHub release; verify SHA256 before extraction to C:\Users\scott\AppData\Local\Programs\xerj. Keep the persistent data at C:\Users\scott\AppData\Local\XERJ\data outside the source corpus. Merge only mcp-row.yml into each actual profile; never replace an entire live profile with a recovery copy. Start the node in neural mode before ingestion.

To refresh the four-document snapshot, copy the corpus.json originals into C:\Users\scott\AppData\Local\XERJ\corpora\halo-records, then use the official xerj autoindex command with --url http://127.0.0.1:9200 --prefix halo-records --state-dir C:\Users\scott\AppData\Local\XERJ\autoindex\halo-records --workers 1 --bulk-mb 1 --no-graph --json. Reindexing is not automatic.
