# DSH Web Ollama Qwen 27B Q6 installation — October 10, 2026

DSH Web now defaults to Ollama local Qwen3.8 27B Q6_K, route `ollama-local / qwen3.8:27b-q6_K`. Desktop was excluded by Scott's final instruction and its profile SHA-256 is unchanged.

## Configuration

- Existing DSH Web 0.2.1-alpha.2 retained; no DSH package upgrade.
- Existing Ollama 0.40.2 on loopback 11434 retained. Actual inference loaded `rocm_v7_1/ggml-hip.dll` and `amdhip64_7.dll`; no Vulkan module was observed for this runner. Backend selection remains Ollama's existing automatic discovery; no global environment variables changed.
- Imported the original `Qwen3.8-27B-Q6_K.gguf` from LM Studio's existing model library. Native renderer qwen3.8 and parser qwen3.5 match the pre-existing Ollama Q4 recipe. Original weights and the Q4 model remain.
- Context 131,072; output allowance 24,576; parallel request count 1 observed. Thinking default Off; existing effort choices retained. The new default is text-only because no vision projector was imported; existing vision-capable picker routes remain available.
- All 30 pre-change UI picker entries preserved, with one added entry, total 31. Includes LM Studio, Ollama local/cloud, signed-in Claude Code, and signed-in Codex routes. No existing credentials, model definitions, or session selections rewritten.
- Saved default updated in the installed Web profile, its repository recovery profile, and deployment settings. Startup preserves the operator selection. Older sessions retain their own selected models.
- Wigolo, Reddit/Redlib, Mission Control, preset composition, permissions, and output-budget opt-out unchanged. Four preset recovery mirrors passed their existing synchronization check.

## Verification

A fresh Web session visibly selected Qwen 27B Q6 and Off. The job fetched Longmont's official homepage with web_fetch; automatic Wigolo fallback returned HTTP 200. The final response linked View All Services and Longmont Library, both present in the fetched evidence. Session completed in 1m 11s, two agent steps, no delegation and no file changes. The request header confirms maxTokens 24,576. No reasoning blocks were emitted. Ollama reported the single loaded Q6 model at 131,072 context with size_vram equal to size (30,037,591,980 bytes, including runtime allocations). LM Studio had zero loaded models and Desktop was not running.

This was one brief installation check, not a completed news scan, 24K generation, or independent quality comparison. Reddit/Redlib and other providers were preserved, not individually retested.

Evidence: `C:\Users\scott\Documents\Codex\2026-10-10\dsh-web-ollama-27b` (configuration receipt, rollback copies, backend evidence, streamed session events, verification and cleanup receipts).

## Comparison cleanup

Removed only the inventoried standalone llmster 0.0.25-1 install, bootstrap-added CPU engine 2.41.0, extracted package, downloaded ZIP, and `codex-runtime-compare:q6` Ollama test model. Confirmed the disposable 35B blob was removed. Original LM Studio GUI, original HIP/Vulkan engines, all original models, the new production Q6 model, benchmark evidence, and rollback backups remain. The earlier original CLI/server configuration restoration is retained.

## Recovery

Production Modelfile: `stack/stock-dsh/ollama-models/Qwen3.8-27B-Q6_K.Modelfile`. Recreate with `ollama create qwen3.8:27b-q6_K -f <Modelfile>` when the original GGUF path exists. Web start/stop desktop shortcuts still target the existing supported launcher scripts. A fresh request loads the selected Ollama model on demand; the server may unload it after its existing idle timeout.
