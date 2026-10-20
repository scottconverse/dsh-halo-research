# DeepSeek 1017: 64K output — October 20, 2026

Changed only the exact DeepSeek 1017 model maxTokens from 32,768 to **65,536** in installed Web/Desktop profiles and both repository recovery profiles. Low effort, context window (1,048,576), provider/model selections, integrations and other model settings are preserved. Pre-change backups remain private.

## Ollama acceptance verification

Used the same OpenAI-compatible endpoint as DSH: http://127.0.0.1:11434/v1/chat/completions. Requested model: deepseek-v4.1-flash:1017-cloud; returned identity: deepseek-v4.1-flash:1017. Sent reasoning_effort=low and max_tokens=65536. Exact prompt: "Reply with exactly OK and nothing else." HTTP request succeeded; response OK; finish_reason=stop. Usage: 13 input and 45 completion tokens. A preceding boundary probe at 65,537 was also accepted and completed with OK (13 input, 14 completion tokens); it did not establish an upper boundary. Total verification usage: 26 input + 59 completion = 85 tokens.

This verifies acceptance of a 65,536-token request, not sustained generation of 65,536 tokens or the absence of a hidden provider clamp. No long-output test or benchmark was run. Ollama /api/show confirms the exact model supports thinking and completion and has a 1,048,576-token context; it does not publish a maximum output field. DeepSeek's own hosted API documents a 64K thinking-mode default, but that alone would not prove Ollama behavior.

## Preservation and application

All four profile readbacks differ from their backups in exactly one numeric maxTokens field. No application restart was performed. No identified DSH process was running at inspection; the saved configuration applies on next launch. Historical 32K records remain historical. Private acceptance receipt and backups: Documents/Codex/2026-10-20/deepseek-64k.

References: [Ollama model](https://ollama.com/library/deepseek-v4.1-flash:1017-cloud), [Ollama API compatibility](https://docs.ollama.com/api/openai-compatibility), [DeepSeek API parameters](https://api-docs.deepseek.com/api/create-chat-completion/).
