# DSH Ollama Cloud integration

Updated September 15, 2026.

## Deployment recommendation (not yet applied)

For cloud-only DSH users, prefer a direct connection to `https://ollama.com/v1` using their own Ollama API key. This removes the local Ollama process as a DSH dependency. Keep the local endpoint as an option for users who want local Ollama models or the existing signed-in-account route.

Codex's verified integration uses Ollama's local compatibility router. For a normal desktop, run the existing Ollama server invisibly at user sign-in so it uses that user's account and configuration. A Windows service is an advanced unattended-host option: it starts before sign-in, but requires service installation, account configuration, and an update procedure. Ollama documents using its standalone distribution with a wrapper such as NSSM; the Windows installer is not itself a one-click service installer.

Direct cloud access supports chat completions and stateless Responses, but does not support all Codex-style request features, including custom/freeform tool-call replay. Do not assume the working local Codex router can be replaced by a cloud URL.

Sources: [Windows installation and standalone service](https://docs.ollama.com/windows), [direct cloud API and compatibility limits](https://docs.ollama.com/api/openai-compatibility), [desktop integration](https://docs.ollama.com/integrations/chatgpt).

These are recommendations for packaging, not changes to this installation. The current tested DSH and Codex connections below still use the existing local Ollama server.

The stock `@deepseek-ai/dsh-llm-pi-ai` provider now includes an optional `ollama` route in the canonical and live DSH settings. It uses the existing OpenAI-compatible provider implementation:

```yaml
ollama:
  displayName: Ollama Cloud
  apiKeyEnv: LMSTUDIO_API_KEY
  api: openai-completions
  baseURL: http://127.0.0.1:11434/v1
  models:
    - id: deepseek-v4.1-flash:cloud
      name: DeepSeek V4.1 Flash (Ollama Cloud)
```

`LMSTUDIO_API_KEY` is already the deployment's non-secret placeholder for local OpenAI-compatible gateways. It is required by the stock adapter's credential seam; the local Ollama daemon accepts the resulting bearer header and uses its existing signed-in Ollama Cloud session. No Ollama API key is stored in DSH or this repository.

Verification on September 15, 2026 found Ollama `0.34.1` listening on `127.0.0.1:11434`. `GET /v1/models` returned `deepseek-v4.1-flash:cloud`, and Ollama `/api/show` reported `completion`, `thinking`, `tools`, and `vision` capabilities. The route advertises the stock adapter's text/image inputs, one-million-token context, and the verified `off`/`low` reasoning choices. A direct OpenAI-compatible request to `/v1/chat/completions` completed with HTTP 200. No local weights were loaded.

The route is selectable without changing the `halo-coder-q4km` default or existing presets. A fresh isolated DSH lean session selected `DeepSeek V4.1 Flash (Ollama Cloud)`, completed two PowerShell calls and eight checks, and produced SHA-256 `6798E96FE8BF984DD1C821601332AFDBC04D98927641B4F6BED474D2A3F64497` in five seconds (11.8K total tokens). DSH settings are re-read by the stock adapter on the next operation; restart is unnecessary for the settings change itself.
