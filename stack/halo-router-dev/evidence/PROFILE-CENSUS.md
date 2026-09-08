# Halo Router — LM Studio execution-profile census

**Snapshot:** 2026-09-07 (read-only, point-in-time)  
**Scope:** the local LM Studio server and its local model/alias metadata only. No model was loaded, unloaded, reconfigured, prompted, or used for inference. No credential store was read.

## Result

LM Studio is live on loopback `127.0.0.1:1234`; `lms ps --json` found one loaded, idle LLM. The local observation lane is sufficient to bind the loaded alias, selected GGUF variant, quantization, active context window, parallel slots, several active load settings, and the selected global runtime package. It cannot, from the safe sources queried, bind an exact per-instance runtime package, model-file digest, prompt template, tool protocol/schema version, exact KV-cache type, adapter identity, or harness/fixture identity.

Those unavailable values are not being represented as permanent `unknown` fields. Per the v0.3 census rule, they are excluded from the 0.1.0 local execution fingerprint unless Phase 0 establishes a stable, inexpensive source.

## Current local runtime availability

| Check | Observed value | Source | Meaning |
|---|---|---|---|
| Server availability | Running, loopback listener `127.0.0.1:1234` | `lms server status`; listener census | Local metadata APIs were reachable; this is not a generation or readiness test. |
| Loaded LLM count | 1 | `lms ps --json` | Current daemon state, not the local model catalog. |
| Loaded state | `idle`, `queued: 0` | `lms ps --json[0]` | The one loaded instance was not observed serving a request. |
| Selected global GGUF runtime | `llama.cpp-win-x86_64-vulkan-avx2@2.33.0` | `lms runtime ls` selected row | A selected runtime package is observable. This command does **not** attest that this exact package started the already-loaded instance. |

## Exact loaded local identity

The loaded instance is the Halo daily-worker alias below. Its logical alias and underlying source artifact must remain distinct.

| Identity layer | Value | Evidence field/path |
|---|---|---|
| Loaded logical alias / loaded ID | `halo/qwen3-coder-30b-a3b-q4km` | `lms ps --json[0].modelKey` and `.identifier`; `GET /api/v1/models` entry `.key` and `.loaded_instances[0].id` |
| Selected variant | `halo/qwen3-coder-30b-a3b-q4km@q4_k_m` | `lms ps --json[0].selectedVariant`; catalog entry `.selected_variant` |
| Registry-resolved artifact | `lmstudio-community/Qwen3-Coder-30B-A3B-Instruct-GGUF/Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf` | `lms ls 'halo/qwen3-coder-30b-a3b-q4km' --json` variant `.indexedModelIdentifier`; alias `model.yaml` `base[0]` |
| Format / architecture | `gguf` / `qwen3moe` | `lms ps --json[0].format`, `.architecture`; API catalog entry `.format`, `.architecture` |
| Quantization | `Q4_K_M`, 4 bits | `lms ps --json[0].quantization.name`, `.bits`; API catalog `.quantization.name`, `.bits_per_weight` |
| Registered file size | `18,561,556,685` bytes | `lms ps --json[0].sizeBytes` and `lms ls` selected Q4 variant `.sizeBytes` |
| Local alias metadata file | `C:\\Users\\scott\\.lmstudio\\hub\\models\\halo\\qwen3-coder-30b-a3b-q4km\\model.yaml` | Direct local read of the alias metadata |
| File digest | Not supplied | No queried CLI/API/YAML field provides a content digest. Computing SHA-256 would require a full sequential read of the 18.56 GB artifact and is not appropriate for the request path or this read-only snapshot. |

`GET /v1/models` provides OpenAI-compatible logical IDs only. `GET /api/v1/models` is the useful local enrichment endpoint: it lists catalog metadata and `loaded_instances[].config`. A per-key `GET /api/v1/models/{key}` was checked for the loaded alias and returned HTTP 404, so it must not be assumed as a future source.

## Field census and source contract

`Observed` means present for the loaded instance now. `Configured alias metadata` means a static requested/default value in the alias's `model.yaml`, not an independent runtime attestation. `Not exposed` means absent from all safe sources queried; it is not an inference about the engine.

| Candidate field | Current local value / status | Source field path | Read cost and refresh semantics | 0.1.0 local fingerprint disposition |
|---|---|---|---|---|
| `providerId` | `halo` (local catalog publisher) | `GET /api/v1/models`.models[*].publisher | Small local catalog read; refresh on each census or daemon/catalog change. | Ship only as local catalog provenance, alongside endpoint/transport. |
| `endpointIdentity` / `transport` | Loopback LM Studio HTTP API at `127.0.0.1:1234` | Listener census; `lms server status`; API base URL used | Cheap local status/read; recheck per observer initialization, not in the synchronous request listener. | Ship as normalized local endpoint class, not a credential-bearing URL. |
| `modelId` | `halo/qwen3-coder-30b-a3b-q4km` | `lms ps --json[0].identifier` | Cheap loaded-state read; point-in-time and changes on load/unload. | Ship. |
| `modelFile` | Registry artifact named in the identity table; no verified physical blob path from these APIs | `lms ls <alias> --json[*].indexedModelIdentifier`; alias YAML `base` | Small index/YAML reads; reread when alias metadata or selected variant changes. | Ship registry artifact identity, not an invented filesystem path. |
| `modelDigest` | Not exposed | No field in `lms ps`, `lms ls`, local API, or alias YAML | A true digest requires an offline full-file hash; high read cost (18.56 GB for current Q4 artifact). | Drop pending an explicit offline digest workflow. |
| `quantization` | `Q4_K_M`, 4-bit | `lms ps --json[0].quantization.{name,bits}`; API `.quantization.{name,bits_per_weight}` | Cheap loaded/catalog state; changes with selected artifact/variant. | Ship. |
| `runtimeName` / `runtimeVersion` | Globally selected: `llama.cpp-win-x86_64-vulkan-avx2@2.33.0`; exact per-loaded-instance binding not exposed | `lms runtime ls` selected row | Small installed-runtime list; selection can change independently of an existing instance. | Do not ship as exact instance runtime until an instance-bound source exists. |
| `adapterName` / `adapterVersion` | Not observable from LM Studio | Absent from queried LM Studio sources | Must come from the DSH/provider adapter actually dispatching the request. | Exclude from LM Studio census; Phase 0/provider-adapter owner. |
| `contextWindow` | Active `32768`; catalog maximum `262144` | `lms ps --json[0].contextLength`; API `.loaded_instances[0].config.context_length`; catalog `.max_context_length` | Cheap loaded-config read; active value changes on reload/configuration. | Ship active value, never substitute maximum. |
| `reasoningMode` | No active mode field. Alias metadata says `reasoning: false`; loaded API config has `reasoning_budget_message: "I have to answer now."`, which is not a mode. | Alias YAML `metadataOverrides.reasoning`; API loaded config | YAML is tiny/static; API reflects active config but does not label a reasoning mode. | Exclude until DSH dispatch/request data provides resolved mode. |
| `parallelSlots` | `1` | `lms ps --json[0].parallel`; API `.loaded_instances[0].config.parallel`; alias YAML `llm.load.numParallelSessions` | Cheap loaded-config read; changes on reload/configuration. | Ship. |
| `promptTemplate` | Not exposed | Absent from `lms ps`, `lms ls`, `GET /api/v1/models`, and target alias YAML | Would require a separate model/engine metadata source; none established here. | Drop. |
| `toolProtocol` / `toolSchemaVersion` | Not exposed | `trained_for_tool_use: true` is capability only; no protocol/schema fields | Capability catalog read is cheap but insufficient for protocol identity. | Drop; DSH adapter owns this class. |
| `kvCacheType` | Exact runtime type not exposed. Alias requests unified KV cache and FP16 KV cache; loaded API attests only GPU offload `true`. | YAML `llm.load.useUnifiedKvCache`, `llm.load.useFp16ForKVCache`, `llm.load.offloadKVCacheToGpu`; API `.config.offload_kv_cache_to_gpu` | YAML/API reads are small; static requested settings and observed offload must not be conflated with actual type. | Do not ship `kvCacheType`. The independently observable offload boolean may join a future load-config digest. |
| `flashAttention` | `true` | API `.loaded_instances[0].config.flash_attention`; YAML `llm.load.llama.flashAttention` | Cheap loaded-config read; refresh on reload/configuration. | Ship. |
| `speculativeMode` / MTP | `speculative_draft_mtp: false`; `speculative_draft_simple: false`; draft model empty | API `.loaded_instances[0].config.speculative_draft_*`; matching YAML draft-MTP / draft-simple fields | Cheap loaded-config read; refresh on reload/configuration. | Ship normalized disabled mode only after Phase 0 defines canonical representation. |
| Other observed load configuration | Eval batch `2048`; physical batch `512`; context checkpoints `32`; experts `8`; GPU KV offload `true` | API `.loaded_instances[0].config.{eval_batch_size,physical_batch_size,context_checkpoints,num_experts,offload_kv_cache_to_gpu}` | Cheap loaded-config read; values are point-in-time instance configuration. | Candidate ingredients for a canonical `loadConfigDigest`; no digest is implemented or claimed here. |
| Other alias-requested load configuration | `keepModelInMemory=true`, `tryMmap=false`, strict VRAM cap `true`, GPU acceleration offload ratio `max`, CPU expert ratio `off`, auto-fit `false` | Target alias YAML `config.load.fields` | Tiny direct file read; static metadata can change without proving a current loaded instance inherited it. | Do not hash until Phase 0 defines static-vs-active reconciliation. |
| `loadConfigDigest` | Not supplied by LM Studio; not calculated | No source field | Requires Phase-0-approved canonical field list and serialization. | Not implemented. |
| `harnessVersion` / `fixtureVersion` | Not an LM Studio concern; unavailable from this census | No LM Studio field | Must be attached by the verifier/harness that produced an outcome. | Exclude; verifier receipt owner. |

## Alias configuration reconciliation

The targeted alias metadata declares a Q4_K_M reliability-floor worker at `32768` context and one parallel session. Its matching active values are currently observed through both `lms ps --json` and `GET /api/v1/models`. The catalog/loaded API additionally confirms active flash attention, batch sizes, context checkpoints, speculative-decoding disabled state, number of experts, and GPU KV offload.

The alias file contains several requested settings the active API does not return (`useUnifiedKvCache`, FP16 KV cache, keep-in-memory, mmap, strict VRAM cap, and some engine offload controls). They must remain *configured-alias* data, not evidence that an already-loaded runtime is using them. A future fingerprint implementation should either hash only instance-observed fields or record the two provenances separately; that design decision is reserved for Phase 0 and primary coordination.

## Candidate-class boundary

This census establishes only the **local LM Studio native-runtime enrichment** lane. It does not define the candidate universe.

| Candidate class | What this census can establish | What must establish execution identity |
|---|---|---|
| Local LM Studio native model | Alias/catalog identity plus current loaded-instance fields described above | LM Studio metadata/API plus the DSH dispatch identity verified in Phase 0. |
| Other native runtime or native subagent | Nothing merely because it is absent from LM Studio | The owning runtime/subagent registry and its request/dispatch seam; correlate it to a parent only if Phase 0 proves a stable relationship. |
| Cloud/API/subscription provider | Nothing; absence from the LM Studio catalog is not an absence from DSH | `ctx.llm` `listProviders()`, `listModels()`, and `resolveModelInfo()` plus the selected provider adapter's resolved request configuration. Catalog membership still does not prove credentials, quota, entitlement, or a successful execution. |

No cloud account metadata, tokens, credentials, or provider secret stores were read. A cloud/native taxonomy must be based on DSH's provider registry and actual dispatch source, not inferred from model names, local residency, or this LM Studio-only snapshot.

## Commands and endpoints used

All reads were local and non-mutating:

- `lms ps --json`
- `lms ls --llm --json` and `lms ls 'halo/qwen3-coder-30b-a3b-q4km' --json`
- `lms server status`
- `lms runtime ls`
- `GET http://127.0.0.1:1234/v1/models`
- `GET http://127.0.0.1:1234/api/v1/models`
- Direct read of the one alias metadata file named above

No inference endpoint was invoked. No load/unload/server/runtime-management command was invoked. No final fingerprint schema, hash, or mutation test is implemented by this evidence record.

## Phase 0 handoff

The primary implementation owner should use the following source paths as the initial LM Studio adapter contract:

```text
lms ps --json[0]
  .identifier .modelKey .selectedVariant .format .architecture
  .quantization.{name,bits} .sizeBytes .contextLength .parallel
  .status .queued

GET /api/v1/models
  .models[?(@.key == loaded alias)]
  .publisher .key .selected_variant .quantization.{name,bits_per_weight}
  .max_context_length .format .architecture
  .loaded_instances[0].{id,config}
  .loaded_instances[0].config.context_length
  .parallel .flash_attention .offload_kv_cache_to_gpu
  .eval_batch_size .physical_batch_size .context_checkpoints .num_experts
  .speculative_draft_mtp .speculative_draft_simple .speculative_draft_model

<LM Studio alias>/model.yaml
  .model .base .metadataOverrides
  .config.load.fields[{key,value}]
```

The bracketed API-filter notation above is descriptive, not an API query syntax. The endpoint returns the catalog list, so a future adapter must select the exact alias deterministically and treat zero/multiple loaded instances as an observation limitation. It must not make synchronous LM Studio I/O in the `agent/request` listener; use a refresh/cache path that preserves the v0.3 fail-open and timing requirements.

This document is evidence only. Final schema, fingerprint construction, mutation tests, and any integration are deferred until Phase 0 and primary coordination.
