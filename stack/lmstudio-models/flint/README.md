# Flint LM Studio model wiring

Model GGUF remains in the existing unsloth/flint-GGUF model directory. default-config.json is the Flint-only saved concrete-model load configuration; deploy to ~/.lmstudio/.internal/user-concrete-model-default-config/unsloth/flint-GGUF/flint-UD-Q4_K_XL.gguf.json. It sets 32768 context, one parallel prediction and full GPU offload. No operation/prediction settings or other model files are replaced. The DSH catalog row uses lmstudio-library/flint and 8192 output.

See [the dated report](../../../docs/HALO-FLINT-PICKERS-2026-10-22.md) for exact prompts, results, preserved defaults and verification limits. Acceptance JSON excludes raw prompts injected by DSH, tokens/credentials and unrelated conversations.
