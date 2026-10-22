# Flint Q4 on Windows AMD Halo — October 22, 2026

## Result
Flint UD-Q4_K_XL works in a short native Windows Vulkan response and in one isolated DSH headless session using the installed Web-side DSH CLI. The DSH task completed one real file read and returned fixes for both intended bugs. This does not establish long-context reliability, sustained throughput, every tool, or Web/Desktop UI picker integration.

Classic LM Studio has been upgraded from 0.4.21+2 to 0.4.26+4 after Scott approved the Windows UAC prompt. Post-update readback on October 22 confirmed the installed executable version and the application running with --updated. Model files and saved settings were compared with the pre-update backups; preservation details are below. No additional inference or tests were run to finish this update.

## App release check
- Ollama API/executable: 0.40.8, already the latest stable GitHub release. The older Windows uninstall registry label says 0.40.2; it does not describe the running server version. No reinstall or prerelease upgrade performed.
- Windows Gufo: windows-2026-10-03, already the latest published release of pixmaate/gufo. Existing executable SHA-256: 24e62a491c85ff69133567a3f49fdb5d2694a884a969d8a58e4166e3fb7987c9. No rebuild or replacement performed.
- Classic LM Studio: upgraded from 0.4.21+2 to 0.4.26+4; installed executable version confirmed after Windows approval. Installer SHA-256: 6d307bc8c4c9fc92d4cb18508b4919beb1a76d2174165a95bef9e13b11317be9. Bionic was not installed.

## Downloaded and verified
- Model: https://huggingface.co/unsloth/flint-GGUF ; flint-UD-Q4_K_XL.gguf, 25,054,688,704 bytes.
- Model SHA-256 matched the Hugging Face LFS object: 63c2ecc461ca545134b670c660e76fa20f47240f8d39b6510bfd21c4dd6e072f.
- Model location: C:\Users\scott\.lmstudio\models\unsloth\flint-GGUF\flint-UD-Q4_K_XL.gguf.
- Runtime: https://github.com/ggml-org/llama.cpp/releases/tag/b11819 ; llama-b11819-bin-win-vulkan-x64.zip.
- Runtime ZIP SHA-256 matched GitHub's asset digest: c3b2484d18258425fe3f69d0b6d07dce01501d6e010578dad3e53150a30df557.
- Portable runtime: C:\Users\scott\Documents\Codex\2026-10-22\flint-dsh\runtime-b11819. Executable reports build 11819 / 0693dbfb9, Windows x86_64.
- GitHub ancestry confirms this build includes Flint architecture support (PR 30928) and required Jinja hexadecimal escapes (PR 30929). The pre-update LM Studio Vulkan backend 2.62.1 contained older b11776 and was not used for Flint. The LM Studio update subsequently advanced the selected Vulkan backend to 2.63.0; that backend was not tested in this task.

The earlier Ollama QAT package attempt failed before weight download because its required MLX runtime was unavailable. That was not an AMD-compatible package on this installation. MLX also has a Windows CUDA variant; calling MLX exclusively Apple-only was incorrect.

## Actual execution, one model resident
GPU: AMD Radeon 8060S, driver 32.0.31041.1004. Windows GPU process counters for the owned Flint server reported 25,821,671,424 bytes dedicated and 356,564,992 bytes shared allocation. This is actual GPU allocation, not inferred from a requested flag.

Trial server used loopback port 8082, alias halo-flint-q4, 99 GPU layers, one slot, 8,192 context tokens, bundled Jinja template, a 256-token reasoning budget, temperature 1, top-p .95, top-k 20 and min-p 0. No normal model's effort/output settings were changed. The direct request capped output at 512; isolated DSH requests capped output at 1,536. These small trial limits are separate from normal DeepSeek 1017 Low / 65,536 output settings.

Direct prompt, complete:
> What is 17 times 19? Give only the number.

Returned 323 with finish_reason stop in 5.965 seconds, 15 prompt tokens and 22 generated tokens. This tiny cold request is not a throughput benchmark.

DSH prompt, complete:
> Use the read tool once to inspect invoice.js in this working directory. Identify the two concrete correctness bugs and provide a corrected function. Answer in under 140 words. Do not use shell, web, skills, subagents, write tools or tests.

The seven-line file specified an average-invoice function that should return 0 for an empty list but divided by list length without a guard. It also accumulated numeric-string amounts with +=. Flint made one successful read call, identified both defects, and supplied an empty-list guard plus Number(invoice.amount) conversion. The proposed function was inspected; no additional tests were run. The answer loosely mentioned NaN/Infinity for the empty case; this exact implementation returns NaN.

Session: session-9912864a-ecab-41dd-bc9f-4fe6b3c04642. Turn 16:31:49.477–16:32:11.154 UTC: 21.677 seconds. Entire CLI process, including startup: 86.692 seconds. Two model passes, one tool call, completed exit 0. DSH used 1,322 newly processed input tokens, 1,343 cache-read tokens and 591 generated tokens. Combined with the direct request: 1,337 new input, 1,343 cached input, 613 output; 3,293 token occurrences including cache across three requests. These are local Flint usage counts, not Codex account usage.

## Preservation and shutdown
Post-update preservation readback at 23:31:09 UTC confirmed that both normal Web/Desktop profiles, LM Studio MCP configuration and Electron application preferences retain their pre-update SHA-256 hashes. LM Studio settings.json changed its byte representation but its parsed JSON contents are identical to the backup. All eight pre-existing GGUF files remain at their original paths and sizes; the downloaded Flint file remains 25,054,688,704 bytes. No large model files were rehashed or loaded for this confirmation. Internal conversation configuration, model data, CLI preferences and HTTP server configuration are byte-identical. The only parsed changes in the other backed-up internal files are the selected Vulkan backend version (2.62.1 to 2.63.0) and the server process ID (6276 to 8220). Normal defaults remain DeepSeek 1017 Low with 65,536 maximum output. Wigolo, Reddit/Redlib and XERJ configuration was not modified or retested. The DSH trial had a separate home/profile, with only file tools exposed and title generation disabled to avoid extra requests; no normal profile tools were disabled.

The owned Flint process was stopped after the two authorized checks. PID 38920 was verified by executable and model alias before stopping; process absent and port 8082 closed afterward. Ollama reported no loaded models. The LM Studio update has completed and the application is running. No installer exit code was captured, so completion is established by the installed 0.4.26+4 executable and updated application process, rather than an invented installer exit status.

Private backups and raw session/installer logs remain under C:\Users\scott\Documents\Codex\2026-10-22\flint-dsh and are not published. Public report contains no credentials, private conversations, installers or model binaries. No subagents or benchmarks were used.
