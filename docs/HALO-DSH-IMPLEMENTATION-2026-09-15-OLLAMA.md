# Ollama Cloud for DSH and Codex

> The September 15 quota-first worker policy below is historical. The September 16 [Codex delegation update](HALO-DSH-IMPLEMENTATION-2026-09-16-CODEX-DELEGATION.md) replaces it with cloud/local workers from the start.

Implemented September 15, 2026. Model: `deepseek-v4.1-flash:cloud`.

## Using it

- DSH: use the model picker, **Ollama Cloud > DeepSeek V4.1 Flash (Ollama Cloud)**. The existing local default and presets remain. Ollama must be running and signed in; its local API forwards the request to the cloud. No local model weights are needed.
- Codex Desktop: Ollama's stock desktop integration adds DeepSeek alongside the native models. The existing default remains `gpt-5.6-terra`. Restart the desktop app when convenient to reload the model catalog; this task did not close the running app. The graphical picker after restart is not yet visually verified.
- Codex workers: the tested profile is `ollama-deepseek`, at `C:/Users/scott/.codex/ollama-deepseek.config.toml`. It uses Ollama's stock Codex desktop router and low reasoning. Agents operate it; Scott does not need a terminal.

## Usage routing

Keep Sol/Terra/Luna while at least 10% of the main Codex allowance remains. When the lowest available main Codex window falls **below** 10%, new implementation, diagnosis, test, and review work goes to DeepSeek. Astra coordinates only. Existing workers finish their bounded slice. A fresh quota reading after reset allows OpenAI workers again.

The global Codex AGENTS instructions and `openai-multi-agent` skill contain this policy. Use the live app `get_usage_limits` reader, not retrospective token totals. No exact `/usage` skill was installed. Read usage at substantial task start, before dispatch when older than five minutes, and at task boundaries approximately every 15 minutes during active work. Missing usage is unknown. This is persistent agent guidance, not an operating-system quota daemon or a hard provider-enforced switch. Astra's coordination still consumes Codex allowance and stops if OpenAI denies further usage.

The last setup reading was 66% main Codex weekly quota remaining. This is dated evidence, not a permanent value.

## Connections and files

| Item | Path or address |
| --- | --- |
| Ollama executable | `C:/Users/scott/AppData/Local/Programs/Ollama/ollama.exe`, version 0.34.1 |
| DSH OpenAI-compatible endpoint | `http://127.0.0.1:11434/v1` |
| Codex desktop router | `http://127.0.0.1:11434/api/codex/v1` |
| Codex native/default configuration | `C:/Users/scott/.codex/config.toml` |
| Combined model picker catalog | `C:/Users/scott/.codex/ollama-launch-models.json` |
| Ollama-only routing allow-list | `C:/Users/scott/.codex/ollama-launch-codex-routing.json` |
| Tested worker profile | `C:/Users/scott/.codex/ollama-deepseek.config.toml` |
| Worker routing policy | `C:/Users/scott/.codex/skills/openai-multi-agent/references/ollama-fallback.md` |
| Recoverable source copies | `stack/codex-ollama/` |

DSH reuses stock `dsh-llm-pi-ai`; Codex reuses Ollama's shipped router. No custom provider plugin, proxy, or agent runtime was built. Authentication remains in the existing signed-in Ollama and Codex installations; no API keys or auth files are committed. The worker profile calls its transport `openai` because it uses Codex's authenticated transport; the allow-listed DeepSeek model is forwarded to Ollama Cloud. Native OpenAI models retain their usual upstream through the router.

## Actual verification

1. The first official CLI-generated profile (`ollama-launch`, plain `/v1/`) performed file reads but ended without making the requested edit. This was a failed acceptance despite process exit 0. Reported usage: 533,086 input, 398,848 cached input, 406 output. It is not the configured fallback route.
2. Through the stock desktop router, DeepSeek read an isolated broken JavaScript fixture, corrected the function, ran Node tests, and reported **8 checks passed**. Reported usage: 93,452 input, 61,696 cached input, 898 output. No follow-up coaching was sent during the run.
3. The final `ollama-deepseek` profile separately ran the tests, computed SHA256, and wrote `verification.txt`. Reported usage: 93,336 input, 61,440 cached input, 1,244 output. This verifies the actual saved profile and tool execution.
4. DSH's visible **Ollama Cloud test and hash** session used the cloud model with the lean preset, made two PowerShell calls, and returned the same passing output and hash. DSH displayed about 5 seconds and 11.8K total tokens. This is a connection/tool check, not a quality or speed benchmark.
5. Root independently reran the Node test and hash. SHA256 of `usage.mjs`: `6798E96FE8BF984DD1C821601332AFDBC04D98927641B4F6BED474D2A3F64497`.
6. Native Luna returned `NATIVE_ROUTE_OK` through the installed desktop routing configuration. Native requests still work; no inference through Sol/Terra/Astra was additionally manufactured for this check.
7. Skill validation passed. Removed the pre-existing unsupported `api` product value from its UI metadata after the installed CLI reported it invalid.

Isolated originals and event logs are under `C:/Users/scott/Documents/Codex/2026-09-10/gi/outputs/ollama-worker-check`. Minimal source/test/result evidence is preserved with the repository. Cloud request token totals belong to Ollama model inference; the coordinating Codex task and native Luna check also consume OpenAI usage. These fixture runs do not establish model parity on larger projects.

## Integration details and limits

Ollama's desktop configurator initially added unrequested recommended models. The generated catalogs were narrowed to DeepSeek plus all original native entries. Native catalog rows missing `supports_parallel_tool_calls` were normalized with false so the installed standalone CLI could parse the combined catalog; all other fields remain. The original Terra default was restored after configuration.

The native test first attempted WebSocket and then successfully used HTTP, as supported by Ollama's router. Codex also emitted telemetry warnings about the colon in the DeepSeek model ID; these did not stop inference or tool execution. We did not modify upstream source to suppress either diagnostic.

## Recovery and removal

Ollama owns the generated catalogs and its restore metadata. Its documented desktop disconnect is **Ollama Apps > ChatGPT (Desktop) > Off**, or the agent-operated equivalent `ollama launch chatgpt --restore`. This restores the prior connection configuration. Do not remove a running installation merely to test rollback.

For recovery, see `stack/codex-ollama/README.md`. The stock desktop setup may require catalog normalization again after it regenerates files. Keep the existing native model choice when reconfiguring. Signing out of Ollama or stopping its service makes cloud requests unavailable; after desktop integration, its router is also in the native request path until disconnected.
