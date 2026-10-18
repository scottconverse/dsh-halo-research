# XERJ embedding model review — October 17, 2026

Research and source inspection only. No embedding models were installed, loaded, run or benchmarked; no XERJ/DSH settings or indices changed.

## Finding

MiniLM was XERJ's built-in neural default, not the outcome of a comparison for Scott's journalism collection. The installed model came automatically from Hugging Face sentence-transformers/all-MiniLM-L6-v2, snapshot 1110a243fdf4706b3f48f1d95db1a4f5529b4d41. The previous installation receipt records its file hashes.

For a quality-first next candidate on this Windows Halo, recommend Qwen3-Embedding-8B via the existing local Ollama /v1/embeddings endpoint. Prefer an explicitly chosen precision: Ollama publishes 8b-fp16 (15GB download), 8b-q8_0 (8GB) and 8b-q4_K_M (4.7GB); bare 8b currently selects Q4_K_M. Download size is not total running memory. Q8 is a resource-conscious candidate, not demonstrated quality-equivalent to FP16. These are candidates, not a proven winner on the user's material. The same Ollama runtime is already installed, but its current inventory contains none of the shortlisted embedding models.

## Actual XERJ compatibility

Checked installed version v1.0.0-rc.96 source, rather than assuming arbitrary Hugging Face model compatibility:

- Native neural.rs uses Candle BertModel, CPU inference, attention-masked mean pooling and a 512-token safety cap. embedding.neural_model/local_model_dir permit compatible model assets, not arbitrary decoder or XLM-R models. The earlier explanation's 256-wordpiece number is the Sentence Transformers model-card default, not the installed XERJ backend's actual 512 cap.
- Proxy mode sends OpenAI-style JSON containing model and input to the configured full endpoint. Local Ollama supports this contract. Its proxy returns the provider vector width; it is not restricted to MiniLM's 384 dimensions. Default configured vector maximum is 16,384. End-to-end operation with a replacement model remains untested.
- The proxy request has no input_type, task, query/document prefix or dimensions fields. Both document ingestion and semantic queries call the same embed_batch path. Do not assume it automatically applies model-specific retrieval instructions.
- Qwen recommends an instruction on queries, with unprefixed documents. A DSH caller can explicitly format the semantic-search query; reliable application of that convention is part of a future integration, not already configured.
- Switching models requires re-embedding into a separate/rebuilt collection and using the same model for ingestion and queries. Existing MiniLM vectors must not be mixed with a different model, even if their dimensions match.

## Shortlist

| Candidate | Documented properties | XERJ integration / limits |
|---|---|---|
| Qwen3-Embedding-8B | 32K model context; up to 4096 dimensions; multilingual; strong published English retrieval results | Local Ollama proxy. First quality-first candidate; handle query instructions explicitly. Published evaluation is not proof for the default Q4 package or this collection. |
| Qwen3-Embedding-4B | 32K; 2560 dimensions; same retrieval instructions | Same proxy path; smaller alternative with slightly lower retrieval scores in Qwen's same published evaluation. |
| BGE-M3 | 8192-token model input; 1024 dense dimensions; multilingual; Ollama FP16 package about 1.2GB | Practical smaller document-search candidate through proxy. This connection consumes dense vectors only; BGE's learned sparse/ColBERT outputs do not automatically become available in XERJ. |
| Jina embeddings v5 text small retrieval | Newer retrieval-specialized 677M model; 32K; 1024 dimensions; published OpenAI endpoint usage | Protocol-level candidate through suitable Windows-serving runtime; Query:/Document: formatting required. Weights marked CC-BY-NC-4.0. Not established as an existing Ollama drop-in on this machine. |
| EmbeddingGemma 2 | Newly listed in Ollama; text-only variant plus multimodal variants; 768 dimensions | Text embeddings are an endpoint-level candidate, subject to installed runtime support and task prefixes. XERJ's text-only proxy cannot send PDF page images/audio/video. Ollama tag labels say 256K, but its README/model table says 8192; do not promise 256K. Not recommended ahead of the better-understood shortlist yet. |

Nomic Embed Text v1.5 and original EmbeddingGemma can use the same proxy transport, but have query/document formatting requirements too. They are not automatically correctly configured by selecting a model name.

Model context limits are not proof the existing XERJ chunker will use that full context. Longer windows do not justify embedding a complete meeting packet as one vector. For journalism, retain page/section citations and keyword retrieval for exact names, dates, amounts, ordinance numbers and quotations; combine with semantic retrieval for paraphrases. Neither embeddings nor this review establish OCR quality or factual verification.

## Source references

- https://github.com/xerj-org/xerj/blob/v1.0.0-rc.96/engine/crates/xerj-ai/src/neural.rs
- https://github.com/xerj-org/xerj/blob/v1.0.0-rc.96/engine/crates/xerj-ai/src/embed.rs
- https://github.com/xerj-org/xerj/blob/v1.0.0-rc.96/engine/crates/xerj-engine/src/index.rs (proxy_config; make_embedder; semantic query embedding)
- https://github.com/xerj-org/xerj/blob/v1.0.0-rc.96/engine/crates/xerj-common/src/config.rs (EmbeddingConfig; VectorConfig)
- https://docs.ollama.com/api/openai-compatibility
- https://huggingface.co/Qwen/Qwen3-Embedding-8B
- https://huggingface.co/Qwen/Qwen3-Embedding-4B
- https://ollama.com/library/qwen3-embedding/tags
- https://huggingface.co/BAAI/bge-m3
- https://huggingface.co/jinaai/jina-embeddings-v5-text-small-retrieval
- https://registry.ollama.com/library/embeddinggemma-2
- https://huggingface.co/nomic-ai/nomic-embed-text-v1.5

Wigolo remains complementary: its documented web search/fetch/browser escalation/crawl/extraction and acquisition workflows are not replaced by XERJ's indexed retrieval. No tool was removed or disabled.
