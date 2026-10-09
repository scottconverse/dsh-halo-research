# Ollama restoration and DSH reasoning defaults

## Ollama restored; reasoning defaults Off — October 9, 2026

Ollama 0.40.2 is installed and its surviving sign-in works. Cloud requests completed for DeepSeek V4.1 Flash, GLM 5.3, Kimi K3, MiniMax M3 and GLM 5.3 Flash. Both DSH profiles use the restored loopback Ollama endpoint. No local model is loaded.

New-session reasoning defaults to Off in Desktop and Web. The Ollama provider fallback is also Off. DeepSeek still offers Off, Low, High and Max; explicit session selections are preserved. The selected model, output limits and context sizes are unchanged. Four live/canonical/recovery YAML profiles passed semantic comparison: only the intended reasoning defaults changed. Web preset recovery mirrors passed their sync check. Apps were not restarted and no new DSH session was run for this settings-only change.

