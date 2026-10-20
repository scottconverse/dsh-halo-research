# Web and Desktop upgrade — October 19, 2026

Both installed apps now run DSH **0.2.1-rc.2**, latest available when checked: Web upgraded from 0.2.1-alpha.2; Desktop from 0.2.0-rc.2. Halo source release v0.3.2 is separate from the upstream version.

## Provenance and preservation

Official release: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.2 ; commit 687f282e8625c6b8d11ff58211a90524be2e4317. Windows manifest https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml identified the signed installer https://download.deepseek.com/dsh-desk/bin/win-x64/deepseek-harness-0.2.1-rc.2-win-x64.exe (289385456 bytes). Published SHA512 base64 independently matched: 39POl5osl9PKMqrPXQA52dh/bCV0Z02vOV9cTjOJDHE6gsJwp5bv7lfgB3mVWAKspX7a/w1iTi+8Listdhq45g== . Authenticode Valid, Hangzhou DeepSeek Artificial Intelligence Co., Ltd. Installed executable signature remains valid.

Complete provider catalog and default-selection semantic comparisons passed: Web 9 providers/19 models; Desktop 7 providers/15 models. Both retain ollama/deepseek-v4.1-flash:1017-cloud, effort Off. Local Gufo, LM Studio, Ollama and account providers remain selectable. Context, output limits and effort maps were preserved. The existing cloud output limit is 8192, not 24576; model context 1048576, provider fallback context 131072. No local models were loaded for acceptance.

All 41 existing official Web direct dependencies and eight official Desktop profile plugin dependencies were aligned to rc.2, with locks updated. Community pins and pi-ai 1.0.2 override remain. Desktop recovery package/lock mirrors are checked in under stack/desktop-tuning.

## Compatibility corrections and installation failures

Existing Web adapter-integrity, evidence-schema and interrupted-command patches were reviewed/rebased against rc.2 source and exact hash guards. Strict validation remains enabled. The old interrupted-command patch attached a source-event reference forbidden on error completions; it now omits that reference. One regression executes the actual patched runtime closer. Output-budget behavior is unchanged.

Existing generation-speed corrections remain in Web and Desktop (stats, chat, trajectory). The helper now permits separate --web-only / --desktop-only use and an external backup directory. Desktop app.asar is customized; it is not claimed to be an untouched official archive. Original files and hashes are retained privately; the executable is unmodified.

Initial Desktop installer exited 2: Windows recovery left a nonempty installation folder without matching installer registration. Official installer preflight source confirmed the refusal. The old directory was preserved intact, then the signed installer succeeded into the original now-empty location and restored registration. No checks were bypassed. Installer-created Desktop and Start Menu shortcuts now use the existing preserved-home launcher.

Desktop's first verification failed in 27ms, before any provider call: rc.2 rejects the old persona variable {{cwd}}. Active profile and three preset/recovery sources now instruct use of the working directory supplied by runtime context. Historical deployed snapshots remain unchanged. After restarting Desktop, the same request succeeded.

## Installed acceptance

Apps were exercised serially. No subagents or benchmarks.

Web session session-eb5ec4ff-9963-4b97-86b6-1fe1814ea511: bounded library/Reddit/XERJ job completed in 5.558 seconds. Library HTTP200 explicitly used automatic Wigolo fallback; XERJ semantic retrieval returned HALO-DSH-UI-PLUGINS-2026-10-15.md. Generic Reddit listing fetch returned the bare Reddit shell and the model honestly reported failure. The existing adapter handles canonical post permalinks, not listings. One targeted post follow-up completed in 1.461 seconds, local Redlib HTTP200, Monday Market, adapter-reported 6/6 comments with no coverage warnings. Adapter scope was not expanded.

Desktop session session-5df32f02-ab7d-4051-a83f-cb21767e3ef5: successful retry completed in 3.111 seconds, with actual Wigolo library retrieval, local Redlib Monday Market post/comments (reported 6/6), and XERJ semantic retrieval. Visible picker showed DeepSeek1017 and Off; Activity View and Session Tabs remained present.

Exact Web prompt:

> Check the existing research connections once. Use web_fetch to read https://longmontcolorado.gov/library/ and https://www.reddit.com/r/Longmont/new/ (one post title only). Use XERJ xerj_semantic_search on index halo-records-docs, field body, query "Wigolo Reddit Redlib", k 1, max_tokens 500. No shell, skills, other tools, or retries. In under 80 words report library hours, one post title, one indexed filename, and any actual failures.

Exact targeted follow-up:

> Use web_fetch once on https://www.reddit.com/r/Longmont/comments/1x9w9rv/monday_market/ . In under 40 words report the post title, retrieval method, and any stated comment coverage limitation. No other tools or retries.

Exact Desktop prompt, unchanged on retry:

> Use web_fetch once each on https://longmontcolorado.gov/library/ and https://www.reddit.com/r/Longmont/comments/1x9w9rv/monday_market/ . Use XERJ xerj_semantic_search on index halo-records-docs, field body, query "Wigolo Reddit Redlib", k 1, max_tokens 500. No shell, skills, other tools, or retries. In under 80 words report library hours, the Reddit post title and comment coverage, one indexed filename, and any actual failures.

Affected existing Web checks: 34 passed, one skipped, zero failed, approximately32 seconds. The skipped opt-in live Wigolo fixture is not counted as a pass; real installed retrieval supplied that evidence. One additional interrupted-command actual-runtime regression passed. Dependency installation and Web configuration composition succeeded. Desktop plugin installation warned about core peer dependencies supplied by the app; installed acceptance succeeded. No broad provider certification or long-document test is claimed.

Mission Control validation 2026-10-20T00:40:45.602Z (October19 MDT) passed, zero warnings, freshness current. Final status: DSHrc.2,181 active/29 disabled/0 failed/0 waiting plugins, no jobs/local model residency. Cloud classification and saved-versus-last-used display remained correct. Fingerprint D34F5BA2931E6A1F0922E1CF0D79BDDBCF1903775E36414E7BBD3A4CC8868F01.

## Usage, limitations and recovery

Logged DSH assistant requests: Web107399 + Desktop39581 = **146980 tokens** (46725 uncached input,99456 cached input,799 output; cache counted once). Six responses had zero reasoning blocks, requests Off. Two automatic title requests occurred but usage was not logged. Coordinator Codex usage is unavailable in exposed accounting: this is not a complete all-system total or billing figure. First failed Desktop turn made no provider request.

Pre-existing archived Web session with missing workspace remains unavailable. Generic Reddit listing retrieval remains distinct from supported post/comment retrieval. Every provider/plugin UI and long-document workflow was not retested.

Private recovery/evidence: C:\Users\scott\Documents\Codex\2026-10-19\dsh-upgrade-v032. It retains old source/locks, both homes' configs and compressed original sessions, original dependency directories, original Desktop app/archive, installer provenance and raw acceptance evidence. For rollback stop the corresponding app with its scoped launcher, restore matching original source/dependencies/profile/app from that folder, then use its existing launcher. Keep Web and Desktop homes separate and preserve newer session work. Private backups, raw logs, credentials, model/installer binaries and the unreliable accounting prototype are excluded from GitHub.
