# Gufo Windows installation and DSH integration — October 15, 2026

## Result
Installed the pinned Windows Gufo release. The existing Qwen3.8 27B Q6_K completed one short real Longmont job in DSH Web, followed by one in DSH Desktop. No competing local model was loaded, no model was downloaded, and no tuned model or speculative draft was installed. All existing provider catalogs and saved defaults were preserved, verified by parsing all four live/canonical profiles and comparing their full original trees after excluding only the new Gufo provider.

## Installed runtime
- Source: https://github.com/pixmaate/gufo/releases/tag/windows-2026-10-03
- Source commit: 2eb0778ac15d9e1c18c5b2f9e5dbbecc19e20ec2
- ZIP SHA-256 verified: 0596235a186d197ac727fdc7a574b914e152d4033414cd2afda54467207c2854
- Installation: C:\Gufo\gufo-windows-2026-10-03
- Existing weights: C:\Users\scott\.lmstudio\models\lmstudio-community\Qwen3.8-27B-GGUF\Qwen3.8-27B-Q6_K.gguf
- API: http://127.0.0.1:8080/v1 ; OpenAI Chat Completions, streaming and native tool calls.
- Served ID: halo-gufo-qwen38-27b-q6
- Context 131072; output allowance 24576; thinking off; one session; speculative decoding off.
- Bundled ROCm runtime is private to this portable installation. Global ROCm, Ollama and LM Studio installations were not changed.
- Model load: 7488 ms; GPU allocation reported by Gufo: 32617 MiB (31.9 GiB).

## Actual jobs, sequential
Web session: session-91807d02-071d-456d-9102-fdd542df8dd7.
Prompt verbatim:
> Use web_fetch to read https://longmontcolorado.gov/library/. Tell me the library address and phone number in under 80 words, with the source URL. Do not use shell, skills, or files.

The first attempt failed before inference because the new provider omitted apiKeyEnv. Corrected it to the existing local-provider placeholder LMSTUDIO_API_KEY, restarted the idle Web service, then sent:
> Retry the same library lookup now.

Successful turn: 15:54:04.673–15:55:12.710 UTC, **68.037 seconds**. Three model passes, two web_fetch calls (library page and city contact page), both automatic Wigolo fallback HTTP 200. Returned 355 Emery St., Longmont CO 80501 and 303-651-8470. Both values occur in the tool evidence. Model usage: 20028 newly processed input tokens, 169 generated tokens, 34234 cache-read tokens across the three passes. Gufo full prompt counts: 16862, 17287, 20113. First prefill 517.9 tokens/s; decode 8.5, 8.5, 8.3 tokens/s. Cache reuse 16895 then 17339 tokens. No benchmark submitted.

Desktop session: session-b63cad8b-d9cb-4995-a0d2-7ffd37aa3f39.
Prompt verbatim:
> Use web_fetch to read https://longmontcolorado.gov/library/. In under 80 words, list its regular weekly opening hours with the source URL. Use only this page; no shell, skills, or files.

Turn: 15:57:09.341–15:57:43.506 UTC, **34.165 seconds**. Two model passes, one web_fetch through automatic Wigolo fallback HTTP 200. Returned Monday–Thursday 9 am–8 pm, Friday–Saturday 9 am–5 pm, Sunday 1–5 pm; all match fetched evidence. Usage: 8544 newly processed input tokens, 94 generated tokens, 8185 cache-read tokens. Gufo full prompt counts: 8152 and 8577. Initial prefill 571.6 tokens/s; decode 8.5 and 8.4 tokens/s. Desktop also automatically generated a five-token session title, with 170 prompt tokens, in 2.866 seconds; that request briefly queued the main request. UI visibly confirmed Completed in 34s.

Measured speed is functional but modest: approximately 8.3–8.5 generated tokens/s with the existing dense Q6 model. This does not establish an improvement over Ollama or LM Studio: no comparison benchmark was run. Tuned weights/drafts remain a separate next decision.

## Operation and preserved settings
Both saved defaults remain ollama/deepseek-v4.1-flash:cloud, reasoning off, exactly as found before installation. UI model selection temporarily changed each saved default during verification; the original complete default blocks were restored afterward. Existing models and presets were not removed or rewritten. Completed verification sessions retain Gufo identity in their request evidence.

Start Gufo using stack\gufo-windows\Start-Gufo.ps1 before selecting **Gufo Windows ROCm → Qwen3.8 27B Q6_K (Gufo Windows ROCm)** in either picker. The helper reuses an already running matching server, refuses competing Ollama/LM Studio local residents, and never unloads models. It does not alter the default or run at login. Initial evidence logs are under C:\Users\scott\Documents\Codex\2026-10-15\gufo-install; later helper launches log under %LOCALAPPDATA%\Gufo.

The existing startup preflight recognizes Gufo and refuses competing local startup routes while it is resident. This is launcher-time protection; it does not intercept every manual model change inside other applications. Close Gufo before deliberately loading another local runtime. Web and Desktop share this one Gufo model server; their jobs were serialized. Cloud defaults do not require unloading Gufo.

Wigolo worked in both real jobs. Reddit/Redlib, Mission Control and other provider definitions are unchanged; Reddit was not separately exercised because these were deliberately short official-source jobs. Mission Control started with the supported Web launcher. These jobs establish short text/tool operation and caching, not image handling, grammar constraints, long-context reliability or every MCP tool.

## Recovery and files
Four profiles receive only an additive Gufo provider. Changed startup preflight and new start helper are in the repository. Pre-change files, exact decoded journals, runtime logs, verified ZIP and Desktop result screenshot remain in C:\Users\scott\Documents\Codex\2026-10-15\gufo-install. No binaries or credentials are committed.

Double-click controls: C:\Gufo\Start Gufo.cmd and C:\Gufo\Stop Gufo.cmd. Stop affects only the pinned Gufo process owning loopback port 8080; it intentionally ends any active Gufo reply. The initial installation left Gufo running for use. The actual guard refused the installed competing Ollama Q6 route without loading it, and the start helper reused the running Gufo.

