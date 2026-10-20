# DeepSeek 1017 compaction summary effort repair — October 20, 2026

The custom text-only checkpoint wrapper now requests Low effort for the exact Ollama route `deepseek-v4.1-flash:1017-cloud`. It previously hardcoded Off for all models. Every other route retains its prior Off behavior. No model selections, defaults, output allowances, compaction thresholds, summary prompts, tools or integration settings changed.

Changed source: `stack/stock-dsh/compaction-text-only.mjs`, imported directly by the installed Web fast-first preset. Desktop uses stock `@deepseek-ai/dsh-compaction-basic`; its configuration does not import this wrapper, so no Desktop change was required for this defect.

Verification: Node syntax check passed. One focused before/after comparison checked the exact DeepSeek route, an unrelated Ollama Qwen route, and the same model name on another provider. Only the intended route's reasoningEffort changed; all other request fields compared equal. No inference, extra compaction, benchmarks or subagents were run.

Deployment: all 92 listed Web sessions were idle. Identified port 3080's owner as the original DSH node process 47408, verified its executable command, restarted that server using the normal existing launcher, and confirmed the authenticated session API returned 92 sessions with 0 active. New process 24048. No user session was cancelled. This verifies request construction and successful service reload; a new provider summary was intentionally not generated.

A private before-copy remains in the Codex task folder. The changed module, report and current configuration reading notes were synchronized to Halo Stack Research, with a SHA-256 recovery manifest entry. Private files and backups are excluded from Git.

## Plain-English result of the preceding stress test

The model solved the tricky ledger task in 2m 27s and passed all 24 independent hidden checks. Manual compaction worked: it reduced the next input by 61% and the model remembered the important details. The attempted 64K output test did not prove the ceiling because the model emitted one item and stopped on its own. Automatic threshold-triggered compaction was not tested. The summary-effort mismatch found during that test is repaired here.
