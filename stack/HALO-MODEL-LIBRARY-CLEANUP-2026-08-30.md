# Halo model-library cleanup — 2026-08-30

> **Post-cleanup pairing correction (2026-08-30):** the retained uncensored
> Qwen vision projector was present and byte-identical to the publisher's
> current artifact. It was renamed in place from
> `Qwen3.8-27B-Uncensored-vision-f16.gguf` to
> `mmproj-Qwen3.8-27B-Uncensored-F16.gguf` so LM Studio auto-discovers it with
> the Q6_K no-MTP weights. Physical storage is unchanged. LM Studio now exposes
> one vision-capable `qwen3.8-27b-uncensored` entry instead of separate language
> and CLIP rows; the DSH picker was updated to that paired key.

## Result

Scott approved the balanced curated-library proposal. Fourteen LM Studio model
directories were permanently deleted, reclaiming **246.984 GiB**. Seven model
directories remain, totaling **136.300 GiB**.

The deletion bypassed the Recycle Bin. The removed GGUF files can be recovered
only by downloading them again. Before deletion, the existing inventories,
DSH catalog, and three retired Halo alias definitions were preserved under:

`C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration\evidence\model-library-cleanup-20260830`

No retained model directory was deleted or modified.

## Permanently removed

| Publisher/model directory | GiB | Reason |
|---|---:|---|
| `ggml-org/gpt-oss-120b-GGUF` | 59.034 | Failed both controlled Vulkan load modes |
| `lmstudio-community/Qwen3-Coder-Next-GGUF` | 45.157 | Wedged LM Studio before inference |
| `lmstudio-community/gpt-oss-20b-GGUF` | 11.278 | Failed to establish stable inference |
| `lmstudio-community/Laguna-S-2.1-GGUF` | 13.598 | Incomplete `.part` download |
| `unsloth/gemma-4-12b-it-GGUF` | 0.628 | Assistant/MTP components, not the full advertised model |
| `meshllm/Qwen3.5-35B-A3B-UD-Q4_K_XL-layers` | 0.010 | Metadata-only incomplete directory |
| `bartowski/Qwen3.8-27B-GGUF` | 19.328 | Redundant Q5_K_M copy |
| `lmstudio-community/Qwen3.8-27B-GGUF` | 16.523 | Redundant Q4_K_M copy |
| `unsloth/gemma-4-26B-A4B-it-GGUF` | 17.489 | Redundant/nonessential Q4_K_S model |
| `lmstudio-community/gemma-4-31B-it-QAT-GGUF` | 17.557 | No established Halo role |
| `lmstudio-community/gemma-4-26B-A4B-it-GGUF` | 16.755 | No established Halo role |
| `unsloth/Muse-Glimmer-30B-GGUF` | 16.092 | No required coding role |
| `yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF` | 6.874 | Superseded by the proven 30B worker |
| `lmstudio-community/gemma-4-12B-it-QAT-GGUF` | 6.660 | No established Halo role |

The four empty publisher directories left by the deletion (`bartowski`,
`ggml-org`, `meshllm`, and `yuxinlu1`) were also removed after each was verified
empty.

## Retained curated library

| Publisher/model directory | GiB | Role |
|---|---:|---|
| `unsloth/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-GGUF` | 22.788 | Alternative MoE candidate |
| `JonathanColetti/Qwen3.8-27B-Uncensored-GGUF` | 21.430 | Unique uncensored lane |
| `lmstudio-community/Qwen3.6-35B-A3B-GGUF` | 20.554 | Daily planner |
| `unsloth/Qwen3.8-27B-GGUF` | 19.694 | Proven dense planner fallback |
| `lmstudio-community/Qwen3-VL-30B-A3B-Instruct-GGUF` | 18.291 | Local vision capability |
| `lmstudio-community/Qwen3-Coder-30B-A3B-Instruct-GGUF` | 17.287 | Daily Q4_K_M worker |
| `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF` | 16.257 | Previous Q4_K_S worker fallback |

## Alias and picker cleanup

The following stale aliases were removed from both live LM Studio and the
canonical stack:

- `gpt-oss-120b`
- `gpt-oss-20b-reviewer`
- `qwen3-coder-next-80b`

Their live and canonical definitions were copied into the evidence directory
before removal. The DSH catalog was reduced to the four retained Halo aliases
plus raw routes backed by the seven retained model directories. Removed GGUFs
no longer appear as selectable models.

The synchronized DSH settings SHA-256 is:

`C4CC3974031734CE95C2D60B35BD705B6E081C950A206F786314D92036E92385`

## Post-cleanup verification

- Remaining model directories: 7
- Remaining model bytes: 136.300 GiB
- Reported free space on `C:` after cleanup: 1,077.8 GiB
- Live aliases: daily 35B, daily Q4_K_M coder, dense 27B fallback, Q4_K_S coder fallback
- `halo-brain-35b`: Q4_K_M, 32K, one slot, returned `OK.` in 0.51 s
- `halo-coder-q4km`: Q4_K_M, 32K, one slot, returned `OK` in 0.05 s
- DSH: HTTP 200

## Preserved evidence

The evidence directory contains:

- the full pre-cleanup grouped inventory;
- the model-directory CSV;
- the per-file inventory CSV;
- the pre-cleanup live DSH settings;
- retired live alias definitions;
- retired canonical alias definitions.

The large removed GGUF files themselves were not copied. Preserving them would
have defeated the purpose of reclaiming disk space.
