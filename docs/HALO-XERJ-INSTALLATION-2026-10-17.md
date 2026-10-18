# XERJ neural retrieval for DSH Web and Desktop — October 17, 2026

## Delivered
Installed official Windows x64 XERJ v1.0.0-rc.96, enabled local neural embeddings, indexed four existing Halo reports, connected both DSH applications using their stock MCP clients, and completed exactly one real retrieval task in each, Web first and Desktop second. No benchmark, synthetic questions corpus, model sweep, reporting pipeline or new framework was run.

DSH versions remain Web 0.2.1-alpha.2 and Desktop 0.2.0-rc.2. Both were closed at the initial inventory. Supported Web startup also restored its existing Mission Control process. Desktop was launched with its actual evaluation DSH_HOME, without running a catalog refresh. No prior session was interrupted.

## Installation and neural evidence
Official release: https://github.com/xerj-org/xerj/releases/tag/v1.0.0-rc.96 . Downloaded xerj-1.0.0-rc.96-x86_64-pc-windows-msvc.zip and verified its published companion SHA-256 before extracting the executable. Archive SHA256: FC028193463D5014249295EDFB4745B5B25ED6692B177352B4725255EECDBA73. Executable SHA256: 69B3FD6B50DA7C6DC6B05139C368A966CD866C8264777139FBC37AF92D61ABD6.

Executable: C:\Users\scott\AppData\Local\Programs\xerj\xerj.exe. Persistent data/logs/PID: C:\Users\scott\AppData\Local\XERJ. No system PATH, Windows service, scheduled task, model catalog, existing AI runtime or global setting was changed. The vendor installer was downloaded and inspected, but installation used its manual verified-archive path.

The node starts with --embed-mode neural before ingestion, uses all-MiniLM-L6-v2 locally, and downloaded its tokenizer/config/90,868,376-byte model.safetensors to the Hugging Face cache. The model snapshot is 1110a243fdf4706b3f48f1d95db1a4f5529b4d41; actual file hashes are recorded in neural-cache.json. These hashes record downloaded bytes; they are not a separately published vendor checksum guarantee. No external embedding or reranking API is configured.

The actual ingestion created body: semantic_text, exited 0, indexed 4/4 files into 14 records, and reported semantic:true in 8.3 seconds. Sources are snapshots of the existing cache review, UI-plugin installation, Gufo coding report and Gufo work record. corpus.json maps snapshots to original repository paths and SHA256. This is a deliberately small initial corpus, not all documents on C:\ or an ongoing synchronization service. Original files were not altered. The index is halo-records-docs; explicitly use it when asking about these records because XERJ's generic search default is ax-*.

## Integration and lifecycle
Each profile gained only one top-level insert block, mcp-xerj, using @deepseek-ai/dsh-mcp-client, serverName xerj, stdio transport. It launches the existing Node executable with stack/xerj/mcp-launch.cjs. That small adapter only ensures the shared XERJ service is running, then runs the official xerj mcp command with inherited standard IO. It does not implement retrieval, alter prompts, call a model, transform tool results or replace MCP. A startup lock prevents two app connections from launching two service nodes simultaneously; concurrent-start stress testing was not performed.

One shared node serves both apps. Explicit --bind 127.0.0.1 --port 9200 keeps the API on 9200, native REST on 9201 and gRPC on 9202, all loopback-only. Explicit --port also avoids XERJ's otherwise-default native port 8080 colliding with Gufo. No LAN listener or firewall rule was added. --insecure disables XERJ TLS/auth on this single-user loopback deployment; local processes can access its indices. No cloud reranker or upstream field-report submission was used.

A single non-model lifecycle check stopped only the recorded, executable/path-verified XERJ service and restarted it through the adapter. Its health returned green and all 14 records survived. Double-click Start XERJ.cmd / Stop XERJ.cmd in the installed executable folder for manual recovery; equivalent canonical files are in stack/xerj. The service stays running when DSH closes so the other app can use it. Stopping it deliberately makes retrieval unavailable until Start XERJ or a fresh DSH MCP connection starts it again. A process killed while holding startup.lock can leave that lock behind: if startup times out and no node/startup process exists, inspect the lock before removing it. No login-startup task is needed for DSH-triggered startup.

## Exactly two real jobs
| App | Preset | Provider / requested model | Returned model | Turn elapsed | MCP call elapsed | Engine search took |
|---|---|---|---|---:|---:|---:|
| Web | Halo fast-first | Ollama / deepseek-v4.1-flash:cloud | deepseek-v4.1-flash | 1.787s | 0.033s | 14ms |
| Desktop | Halo local | Ollama / deepseek-v4.1-flash:cloud | deepseek-v4.1-flash | 1.58s | 0.027s | 15ms |

These are observed completion timings for two tasks, not throughput benchmarks or proof of general search quality. Both calls were mcp__xerj__xerj_semantic_search, body field, k=3, max_tokens=1800. Both returned relevant source sections and reached turn/end completed. The model prompts did not load a skill or request shell/web actions. Neither job called Wigolo or Reddit because the questions concerned retained local documents.

Web prompt, verbatim:
> Use XERJ’s xerj_semantic_search tool on index halo-records-docs, field body, query "What did the installed Gufo cache review conclude, and what could it not establish?", k 3, max_tokens 1800. Answer in under 100 words and cite the retrieved filename and passage or line location. Do not use shell, web, skills, or other tools.

Web answer:
> The review found no confirmed cache defect: Q6 hit cache on 3 of 5 main requests (92.26% cached) and Q4 on 8 of 10 (96.57%). It could not verify the reported 20–30GB snapshot growth, eviction, disk persistence across restart, sustained 128K workloads, or configured RAM capacity. No changes were made.
>
> Source: `HALO-GUFO-CACHE-REVIEW-2026-10-15.md`, section 2 (locator `s2`), "What this does and does not establish".

Desktop prompt, verbatim:
> Use XERJ’s xerj_semantic_search tool on index halo-records-docs, field body, query "Why is the legacy Wigolo MCP entry disabled, and how are Wigolo and Reddit/Redlib still connected?", k 3, max_tokens 1800. Answer in under 100 words and cite the retrieved filename and passage or line location. Do not use shell, web, skills, or other tools.

Desktop answer:
> **HALO-DSH-UI-PLUGINS-2026-10-15.md**, section 2 ("UI observations and limits"): the legacy Wigolo MCP loader row is left Off/Disabled as a pre-existing state, and the live automatic research adapter is separate from it. Reddit/Redlib runs through that existing retrieval adapter/skill, not a named MCP loader row — so its absence from the panel is expected; the panel lists only MCP client loaders.

The answers agree with the retrieved reports on the substantive conclusions. Locators s0/s2/s3 are XERJ extraction-section identifiers, not source Markdown line numbers. The citation's wording section 2 should be read as that extraction ordinal; the filename, heading and retained source text allow verification. Results returned section text plus metadata, not an original PDF-page viewer. The semantic tool response suggested the lower-level _passage projection for tighter snippets, but that projection is not exposed by this semantic tool's argument schema. The 1800 budget uses XERJ's word-oriented tokenizer and is not a model-BPE guarantee.

Retrieval and embeddings were local. Answer generation used the existing cloud default, so retrieved excerpts were sent to Ollama's cloud model. This is not an entirely offline workflow.

## Preservation and accounting
Both live profile patches passed exact-byte comparison against their pre-change copies plus only the new XERJ block, and parsed old entries remained identical. package.json and pnpm-lock.yaml also remained byte-identical. This preserves model/provider definitions, defaults, effort values, output/context limits, presets, UI plugins and Wigolo/Reddit/Redlib instructions and hook mounts. No existing model was downloaded, loaded, unloaded, replaced or removed. This task did not rerun external research checks; preservation does not establish fresh Reddit comment coverage or public-web availability.

Main-turn usage reported in journals:
| App | Newly processed input | Cache-read input | Generated output | Total token traffic |
|---|---:|---:|---:|---:|
| Web | 27,337 | 25,216 | 268 | 52,821 |
| Desktop | 19,955 | 17,920 | 248 | 38,123 |
| Combined | 47,292 | 43,136 | 516 | 90,944 |

Traffic includes repeated cached input, not 90,944 generated tokens. Each task used two main model passes. Automatic title generation is outside this journal accounting; no authoritative title-token count was captured. Coordinator usage is not exposed by these tools; no full cross-system token total or dollar cost is claimed. No worker model calls were made. The initial task inventory was at 22:33:32 MDT on October 17; exact job timestamps are UTC in retrieval-receipt.json. Session zstd evidence was streamed across all concatenated frames with the existing reader, not just its first frame. Only sanitized receipts, public report excerpts and metadata were published, not private profiles or raw request headers.

## Remaining limits
Only these four Markdown reports and two questions were exercised. PDF/OCR, larger corpora, other models, memory-write tools, Corpus Hub tools, web acquisition and Windows reboot/login behavior were not tested. XERJ emitted a Windows total-RAM-detection warning; this small ingestion used one worker and 1MB bulk batches, not all cores. The Console owner/passkey setup was not enrolled because DSH MCP retrieval does not require it. The shared local service has no external reranker configuration. Future corpus additions should be explicit and scoped; do not index engine data, model caches, credentials or the entire user profile by default.
