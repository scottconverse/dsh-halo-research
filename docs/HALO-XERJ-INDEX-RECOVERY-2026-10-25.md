# XERJ retained-index recovery — October 25, 2026

## Outcome

The original **halo-records-docs** index is restored with all **14 records**. Its four original Markdown snapshots and **55 segment/HNSW files** retain their original hashes. No corpus reindexing, record replacement, model download or embedding-model change was needed. One real semantic retrieval through the existing DSH Web MCP tool returned three relevant passages. Web and Desktop continue to share the same endpoint and existing MCP clients.

## Confirmed cause: Windows packaged-app filesystem redirection

The apparent path C:/Users/scott/AppData/Local/XERJ meant different physical storage depending on whether the launching process carried Codex's Windows package context.

| Launch context / store | Observed state |
|---|---|
| Ordinary Windows process, unqualified AppData/Local/XERJ | PID file 16784; only XERJ system indices; no halo-records-docs directory |
| Original Codex package store, explicit LocalCache path | Original 14-record index, vector graph, autoindex catalog and corpus snapshots present |

The original physical store is:

`C:/Users/scott/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/XERJ`

This distinction was proved with a read-only Node process launched through Windows WMI outside Codex's package context. It could see **both different stores at once**. The original October 17 autoindex receipt had already canonicalized its corpus root into that same package LocalCache directory. The former API-owning process, PID16784 started October24, used the unqualified data-dir spelling and served the other, empty-of-corpus store. No evidence of deletion of the original index was found; its original files survived.

The lifecycle adapter compounded the problem: its healthy() check accepted any responding cluster_name xerj without verifying that the retained corpus was available. Thus an empty node in the other filesystem view looked ready to both DSH clients. This was a storage identity/readiness defect, not a DSH model, neural embedding or rc.3 index-format failure.

The prior rc.3 upgrade report correctly recorded the observed404 and did not claim the upgrade caused it. The discovery here explains that failure and supersedes the current-unavailable status, without rewriting the historical failed receipt.

## Repair

1. Preserved a private copy of the original data directory and logs before recovery. Logs and engine data can contain credentials or user state and are **not** committed.
2. Stopped only the path/command-line-verified XERJ server16784. DSH Web, Desktop and their two existing MCP clients stayed running.
3. Started the existing launcher in the context containing the original store. XERJ loaded halo-records-docs14records and autoindex-catalog6records from disk; no reindex operation ran.
4. Performed the single real MCP retrieval described below.
5. Pinned both stack/xerj/mcp-launch.cjs and its PID/command-line-checked Stop-XERJ.ps1 to the **explicit original physical store**. Normal app launches and Codex launches now name the same data, PID, lock and log directory. The other store remains in place; no files were merged or deleted.
6. Added a readiness guard: when the original retained snapshot exists, the launcher must also receive a successful index-metadata response. A responding node without that retained index now produces a clear error instead of being adopted or triggering a competing server. The guard never reindexes or terminates an unverified process.
7. Restarted only the transitional XERJ server38172 to apply the explicit physical --data-dir. The final server67040 uses that full path. A native ordinary-Windows --start-only invocation exited0 and reused server67040, confirming that the context split is removed. That check read readiness metadata; it did not run another semantic query or restart the node.

Both existing DSH profile MCP commands already point to the canonical launcher, so no DSH configuration edit or restart was required. The Start/Stop XERJ.cmd shortcuts already call these canonical files; no copied stale helper remains active.

## One real retrieval

Executed through the **running DSH Web 0.2.1-rc.3 native ToolRuntime and its existing XERJ MCP connection**, in isolated session `session-fd2ded04-e802-4548-b2e4-40be8f77fc96`. This was an actual MCP semantic search, not a mocked response or a model-generated answer.

`mcp__xerj__xerj_semantic_search({index:"halo-records-docs",field:"body",query:"What did the installed Gufo cache review conclude, and what could it not establish?",k:3,max_tokens:1800})`

The tool succeeded in **91ms**, with engine-reported search time **84ms**, returning three hits, including sections0and2 of **HALO-GUFO-CACHE-REVIEW-2026-10-15.md** and the Gufo work record. The passages state that no cache defect was confirmed and identify limits on disk snapshot growth, eviction, persistence and long-context evidence. Maximum similarity score was0.8688079. Section numbers are XERJ extraction ordinals, not original Markdown line numbers.

The semantic search occurred after the first recovery start; after pinning the equivalent explicit physical path, the native readiness/catalog readback confirmed the same14-record store. The semantic query was not repeated. This proves one real retained-corpus retrieval, not general document-search quality or every DSH interface.

Sanitized source passages, startup-context receipts and hashes: [repair-receipt.json](evidence/xerj-index-repair-2026-10-25/repair-receipt.json).

## Preservation, scope and accounting

- Four DSH configuration profiles and all 70 skill files match the saved pre-upgrade hashes. Models, defaults, Low effort,64K output, plugins, skills, Wigolo and Reddit/Redlib were not edited. Neither DSH app was restarted.
- All four original corpus snapshots and all 55 segment/vector files match the private before-repair copy. Original record IDs and vectors remain; no ingestion or recomputation was performed.
- XERJ remains v1.0.0-rc.96, using existing local all-MiniLM-L6-v2 neural embeddings. One query used those local embeddings; **zero LLM/chat generation calls** and no benchmark were made. No new model-token total or throughput claim is inferred from the semantic query.
- Both existing MCP client processes remained connected to the same loopback 9200 API. No port, bind, TLS/auth, DSH preset, provider, model selection or other integration was changed.
- No subagents, broad tests, corpus rebuild, software installation or unrelated repair was performed. One affected readiness check from a native Windows context was necessary to verify the path fix.

A read-only Windows PowerShell5.1 diagnostic initially failed because that host disallows script files. Its error was captured, and a native Node diagnostic was used instead; no execution-policy setting was changed. The earlier in-Codex filesystem view alone was insufficient to diagnose the two physical stores. Raw startup logs contain console-setup links and remain private.

## Operation and recovery

Keep using the existing Start XERJ.cmd and Stop XERJ.cmd. The canonical launcher and ownership-checked stop helper now use the explicit physical path above. Do not replace it with an unqualified AppData path unless migrating the complete store deliberately. The retained store is still inside Codex LocalCache; back it up before uninstalling or resetting Codex. Moving the complete store to another location was outside this repair. Do not copy system/identity indices between the two stores casually, or delete the original store before a backed-up migration.

If readiness reports a retained-index mismatch, inspect the9200owner and its --data-dir, then restart only the verified XERJ node. A healthy HTTP endpoint alone does not establish that the intended index is available. Reindexing was unnecessary for this incident.

Private rollback evidence is retained under C:/Users/scott/Documents/Codex/2026-10-25/xerj-index-repair/before. The source change is limited to launcher/stop storage identity, readiness validation and documentation. No tag/release was requested; the repair is committed and pushed to the Halo master branch.
