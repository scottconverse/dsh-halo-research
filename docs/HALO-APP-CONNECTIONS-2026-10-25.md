# TextFlowKit, Siftwing and PatentForge connections — October 25, 2026

## Delivered
Three small skills in the existing watched skill roots, available to running DSH Web and Desktop without restart. Existing native skill/pwsh services execute the real installed programs. No new plugin/MCP server, model download, profile/provider edit or global PATH modification.

| Application | Installation | Native acceptance |
|---|---|---|
| TextFlowKit | Existing 0.1.19 private Windows runtime reused | Web transcribed bundled three-second synthetic speech; Desktop exported its timed JSON to Markdown |
| Siftwing | Existing dev.57 reused; supported lifecycle started service on 4310 | Both hosts retrieved one retained Longmont official-source passage |
| PatentForge | Official hash-verified Lean 0.5.0 installed in isolated tools directory | Web created synthetic project; Desktop retrieved it; five services healthy on 4320–4324 |

See [native acceptance receipts](evidence/app-connections-2026-10-25/acceptance.json) and [TextFlowKit skill](../stack/stock-dsh/skills/textflowkit/README.md), [Siftwing skill](../stack/stock-dsh/skills/siftwing/README.md), [PatentForge install/recovery/limits](../stack/stock-dsh/skills/patentforge/README.md).

## Failures corrected and limits retained
TextFlowKit's installed exe was not on PATH and its source-tree console trampoline failed; using the installed private Python plus its actual CLI entry point succeeded. Siftwing lifecycle writes initially failed in the restricted shell; its supported elevated lifecycle started successfully. Its launcher briefly exceeded startup deadline, but current RUNNING state and successful evidence retrieval supersede that intermediate failure. Existing MCP processes belonging to other clients were left intact.

PatentForge installer omitted the declared litellm dependency. Added 1.106.4 and dependencies solely to its private runtime. Restricted uv trampoline creation initially failed; completing with authorized elevated execution succeeded. First Python-service cold import exceeded the short readiness timer, then became healthy. The launcher now retains ownership and prevents duplicate still-starting services. An idempotent-start check exposed PowerShell ConvertFrom-Json converting saved ISO timestamps to DateTime values; display-string comparison rejected our running service. Comparing normalized executable paths and UTC ticks fixed it. One affected startup check then recognized all five existing processes without spawning any. Models/defaults remain unchanged. Port 3000's existing application was not touched.

A Siftwing jobs probe returned an unexpectedly large, multi-megabyte historical response; tool output was truncated. The skill was corrected to capture and project only brief metadata, and actual acceptance used evidence_search with limit 1. No new research was launched. Do not repeat full job dumps. Public evidence contains only the selected official passage and synthetic sample, not retained private run lists.

All four DSH profile SHA256 values match the before snapshot. Git changes are limited to these new skills and documentation. Wigolo, Reddit/Redlib, XERJ, model_route, LibreOffice, all existing skills and models were not edited. Temporary loopback inspectors were closed. No user jobs were stopped or apps restarted.

Important: PatentForge internal analysis uses its own configured provider; Lean needs cloud credentials. These were not supplied or copied, so its model-driven analysis remains unconfigured/unverified. DSH can research/draft using its current model and use PatentForge project storage, but that is not proof of a PatentForge internal pipeline. Siftwing routes similarly do not inherit DSH settings; no OCR/research/model run was tested here.

## Accounting and active services
Zero chat-model calls/tokens, subagents or benchmarks. One three-second CPU speech transcription used existing Whistle weights; native durations are in receipts. Codex coordinator token usage is separate and not available from DSH receipts. Installer ~78.7 MB plus isolated dependency downloads; retained locally for recovery, not published. No LLM prompts were submitted. Five PatentForge processes and Siftwing intentionally remain running; private ownership/lifecycle records provide identity-safe stop paths. No login autostart. No release/tag requested.
