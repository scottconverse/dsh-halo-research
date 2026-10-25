# DSH Web and Desktop rc.3 upgrade — October 25, 2026

> Follow-up: [XERJ index recovery](HALO-XERJ-INDEX-RECOVERY-2026-10-25.md) resolved the missing-corpus incident later on October25. The failed upgrade-time receipt below is retained as historical evidence.

Both applications were upgraded from **0.2.1-rc.2 to 0.2.1-rc.3**, Web first and Desktop second. Models, defaults, profiles, skills and community plugin pins were preserved. Actual native routing, Wigolo retrieval and Redlib listing operations succeeded in each app. XERJ's connection responds, but its previous document index is absent; that failure remains disclosed below.

## Release and deployment

Official upstream: [dsh-v0.2.1-rc.3](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.3), source commit `1f81c047fc48fa190a683e469daa699857e9afe8`. This is a prerelease, as explicitly requested. The upstream notes describe additional plugin menus, an unsent-draft fix and API-key model-list refresh behavior. No unrelated runtime or model update was performed.

Web's 41 direct official DSH dependency pins and lockfile now use rc.3; its existing pi-ai 1.0.2 override and non-DSH dependencies remain. Desktop uses the official Windows x64 rc.3 installer, plus its eight rc.3 profile tool dependencies. Its community Git pins remain exactly unchanged. The Desktop executable is official; its app.asar retains the existing scoped Halo speed/workspace customizations.

The installer came from the official [Windows feed](https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml), not a repackaged third party. Size: **289415960 bytes**. Published and downloaded SHA-512 matched:

`q5IGr2Bf+TvvCpagHj49Ypn/ZrqR7kqrYpLjqXP7VfDINmddlqZQmG+YfsdL3q3EdTRMRlKz/a3jDAEzdNdDOw==`

Windows Authenticode status was **Valid**, signer **Hangzhou DeepSeek Artificial Intelligence Co., Ltd.** The private original installer and before-upgrade dependencies/archive are retained for rollback and excluded from Git.

Web was stopped before its dependency change. Desktop's actual native runtime reported zero busy/queued agents and zero busy jobs before its normal app.quit. Its old main/host exited before installation. Desktop was reopened using the same preserved DSH_HOME, without running model-catalog refresh or resident-model selection helpers. The original custom Desktop shortcut is retained.

## Compatibility fixes carried forward

- Web's llm adapter, session recovery and web-fetch output-schema pristine modules are byte-identical to the reviewed rc.2 modules. Their rc.3 pristine hashes were recorded before patching; only the exact version guards changed. Hash verification and strict output validation remain enabled.
- Existing Web output-budget, adapter integrity, optional retrieval provenance and interrupted-command recovery patches were reapplied through their existing guarded helpers.
- Existing text-speed reporting and Windows workspace slash comparison fixes were reapplied to Web and Desktop. Desktop's profile session-query tool was patched along with its corresponding archive modules.
- Existing compaction overrides, title-generation disablement, research hook, model_route plugin and companion skill were retained. No new compaction run, model sweep, LSP suite or benchmark was added.

## Preservation evidence

All **four** source/live Web/Desktop cordis.patch.yml files have identical before/after SHA-256 hashes. All **70 skill files** in the two installed skill roots match their pre-upgrade hashes. All non-DSH direct dependency pins, including Activity View, Session Tabs, MCP Settings and dsh-xai, are unchanged. These are file/dependency preservation checks, not a claim that every plugin screen was exercised.

The saved DeepSeek 1017 default remains **Low**, maximum output **65,536**, advertised context **1,048,576**. Context remains provider-managed for the cloud route. Local Gufo/LM Studio/Ollama choices, other providers, selected defaults, presets and existing integrations were not rewritten. No model was downloaded, loaded, unloaded or removed.

The profile package/lock recovery mirrors in stack/desktop-tuning and Web's versions.json were updated to match the deployed rc.3 files.

## Focused installed acceptance

These checks used each **running application's actual native ToolRuntime**, an ordinary isolated session and the existing tools/services. They were direct native tool executions, **not** a normal model-driven chat loop or an exhaustive picker/UI test. The existing four profiles were not edited to run them.

| Check | Web | Desktop |
|---|---|---|
| Running version | rc.3 installed package, current host | rc.3 app.getVersion, current host |
| Surface | Authenticated HTTP 200 HTML | Visible, loaded native window; DOM readyState complete |
| model_route available | Yes | Yes |
| One short model_route call | RC3_READY; Low/65,536 | RC3_READY; Low/65,536 |
| Library web_fetch | HTTP 200, automatic Wigolo fallback, 3,067 ms | HTTP 200, automatic Wigolo fallback, 2,162 ms |
| Reddit listing web_fetch | HTTP 200, local Redlib, 840 ms | HTTP 200, local Redlib, 854 ms |

Both library fetches returned the page's regular hours: Monday–Thursday 9 am–8 pm, Friday–Saturday 9 am–5 pm, Sunday 1–5 pm. Both Redlib results identified the local instance 127.0.0.1:18080 and returned **25 posts** with **partial listing coverage**. Comments and additional pages were not examined. Optional evidenceFile/coverage fields passed their actual output schemas.

Exact retrieval inputs, once per app:

`web_fetch({url:"https://longmontcolorado.gov/library/"})`

`web_fetch({url:"https://www.reddit.com/r/Longmont/new/"})`

Exact model call, once per app, with no effort/output override:

`model_route({operation:"call",model:"deepseek-v4.1-flash:1017-cloud",prompt:"Reply with exactly RC3_READY and nothing else.",task:"rc3-<web|desktop>-acceptance"})`

Both receipts recorded effort low and max_tokens 65536 from model-default, requested model deepseek-v4.1-flash:1017-cloud, served model deepseek-v4.1-flash:1017, and done_reason stop. Each used **16 input + 22 output tokens**. Web native execution took **1,472 ms**, provider wall **510 ms**; Desktop **1,801 ms**, provider wall **570 ms**. Total provider-reported usage for this upgrade's two response checks: **76 tokens**. This is not a throughput benchmark or proof that the 64K limit was exhausted. The receipt cost_usd values are API-equivalent estimates from the routing price table, not subscription invoices. Codex coordinator token accounting is separate and is not supplied by these model receipts.

Sanitized receipts, profile hashes and release provenance: [acceptance.json](evidence/dsh-rc3-upgrade-2026-10-25/acceptance.json). Private raw fetches/caches, conversation histories, credentials and installers are not published.

## Confirmed limitation: XERJ corpus absent

Web's existing MCP semantic tool returned **HTTP 404 index_not_found_exception** for halo-records-docs. The shared XERJ process is alive at the existing loopback endpoint and uses the expected C:/Users/scott/AppData/Local/XERJ/data directory. Read-only index enumeration returned only internal/system indices; the former 14-record document corpus is absent. The same shared service is wired to both apps.

The DSH upgrade did not alter XERJ binaries, configuration or data. This corpus was not checked before the upgrade, so this report does **not** establish when or why it disappeared or claim that rc.3 caused it. No silent reindex, deletion or recovery operation was performed, and Desktop did not repeat the known-failing query. XERJ registration is preserved; working retrieval from that corpus is **not** verified and is currently unavailable.

## Corrections and limits during execution

The first speed-helper invocation found its new private backup directory absent and failed before speed files were written. The directory was created, --apply was then supplied explicitly, and the Web process was restarted before acceptance. No model job was interrupted.

The initial HTTP-only Web probe followed DSH's token redirect without retaining its cookie and returned 401. Source inspection confirmed the 303 token-to-cookie exchange. Retaining that cookie produced HTTP 200. A helper's initial Node module-mode error and an incorrect 302 expectation were corrected; no authentication controls or settings were changed.

Dependency installation reported peer-dependency warnings. Loaded native tools and the focused checks above worked. These checks do not establish every optional provider, every community UI control, Reddit thread-comment coverage, fresh compaction behavior or XERJ corpus recovery. No broad test suite or benchmark was run. No subagents were used. Temporary inspectors were closed after use.

## Recovery and delivery

Private rollback material is under C:/Users/scott/Documents/Codex/2026-10-25/dsh-rc3-upgrade/before: original package/lockfiles, four profiles, Web/Desktop dependency directories and the pre-upgrade customized Desktop app.asar. The prior official rc.2 Desktop installer is retained in the October 19 upgrade folder. Stop only idle, identity-verified application processes before restoring; restore a coherent rc.2 package/lock/dependency set and matching guarded helpers, not mixed rc.2/rc.3 files. Prefer the prior official Desktop installer with its matching saved archive and profile dependencies. No rollback was needed or performed.

Current reading/configuration records and allowlisted recovery files are synchronized under Halo Stack Research. The Git change contains deployment pins/locks, guard updates, current metadata, Desktop recovery manifests, this report and sanitized evidence. It excludes private files, backups, node_modules, model files and installers. This update is a master-branch push; no additional release/tag was requested. The earlier v0.3.6 remains the already-published immutable snapshot.
