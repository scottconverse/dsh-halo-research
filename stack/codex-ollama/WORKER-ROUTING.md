# Worker routing — October 19, 2026

## Scott routing override — October 19, 2026

All delegated/subagent work must use Ollama `deepseek-v4.1-flash:1017-cloud`, with thinking off (`model_reasoning_effort = "none"`). The parent acts as coordinator, planner and auditor. This overrides older helper/native-worker routing below. Do not silently fall back to another model or provider. Use the existing worker launcher and verify the returned model and receipt.

The live launcher uses the existing C:\Users\scott\scoop\shims\codex.exe path. The previous npm-vendored executable no longer exists. Scoped recovery profiles and catalog are stored beside this file.
