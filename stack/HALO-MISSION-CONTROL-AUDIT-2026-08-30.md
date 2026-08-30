# Halo Mission Control telemetry audit — 2026-08-30

**Scope:** all operator-facing data contracts used by Mission Control after the
2026-08-30 model-library cleanup. This is a point-in-time verification record,
not a benchmark.

## Verdict

Mission Control was refreshing, but four contracts made refreshed data look
stale or false:

1. `lms ls --json` is an LM Link fleet merge. The Models tab presented all 31
   rows as one local catalog, left unloaded peer origins blank, and offered a
   local Load button for peer rows.
2. Brain/Worker labels and the local-origin allowlist still depended on two
   deleted legacy loader scripts. The actual daily aliases were therefore shown
   as empty slots and `FLEET/unknown-origin`.
3. The 97% global context alarm selected the fullest retained historical
   session even though DSH reported zero running sessions.
4. `C:\Users\scott\.dsh\memory\memory.json` does not exist. The UI converted
   that unavailable source to `0` entities.
5. The disk probe trusted an empty hidden-PowerShell result as a successful
   zero-byte drive after restart. It now uses Node's validated native `statfs`.

The source was corrected so these states cannot be confused again.

## Independent readings checked

| Surface | Authoritative source | Audit result |
|:--|:--|:--|
| Cockpit availability | TCP/HTTP `127.0.0.1:3080` | accurate: up |
| LM Studio availability | TCP/HTTP `127.0.0.1:1234` | accurate: up |
| Loaded models | `lms ps --json` | accurate values; origin labels were wrong |
| Daily model configuration | LM Studio `/api/v1/models` loaded instance config | accurate: Q4_K_M, 32K, `parallel=1`, two idle models |
| Generating now | count of `lms ps` rows with `status=generating` | accurate: zero during audit |
| Local model files | recursive bytes under `C:\Users\scott\.lmstudio\models` | 11 files, 136.300 GiB |
| LM Link catalog | `lms ls --json` grouped by `deviceIdentifier` | 13 local addressable rows; 12 NvideaBlackwell rows; 6 R71 rows |
| LM Link peers | `lms link status --json` | accurate: two connected peers, zero remote loaded models |
| Windows RAM | Node `os.totalmem()` / `os.freemem()` | matched Mission Control: 31.8 GiB total; free varied normally by poll |
| GPU memory | Windows GPU Adapter Memory counters | matched exactly at comparison: 48.9 GiB dedicated, 1.6 GiB shared |
| Disk C: | independent `Get-PSDrive C` versus Node `statfs` | initial values matched; restart exposed and fixed the empty-PowerShell-as-zero defect |
| Session inventory | DSH `session.list` RPC | source was live, but global context selection was historical; zero sessions claimed running |
| Queue | DSH events mux | the one queued input is real: a preserved steering message on `session-halo-hardgate-23-impl-20260829`, not a current generation |
| Presets | DSH `agentPreset.list` RPC | accurate: five |
| Plugins | DSH `pluginInventory/list` RPC | accurate at audit: 169 total, 139 active, 30 disabled, zero failed/stuck |
| Memory graph | `C:\Users\scott\.dsh\memory\memory.json` | unavailable/not configured; former zero was misleading |
| Versions | runtime/CLI and local version history | DSH pin rc.2, engine 2.31.2 and CLI commit were accurate; LM Studio app version is explicitly last-recorded, not live |

The 90.2 decode t/s card is deliberately labeled **last run**. It is historical
performance evidence, not a claim that a model is generating now.

## Corrections

- Models defaults to this device; an explicit checkbox reveals peer catalogs.
- Every model row has an origin. Peer rows say where they live and have no local
  Load action.
- The footer reports physical local disk separately from addressable aliases.
- Daily Brain and Worker roles use the current model.yaml aliases:
  `halo-brain-35b` and `halo-coder-q4km`.
- Load/Unload buttons now target the current Q4_K_M daily pair, not the retired
  dense-27B/Q4_K_S identities.
- The resident brain guard checks Q4_K_M, 32K, and `parallel=1` against the
  current alias definition.
- The global context alarm is limited to running or last-15-minute sessions.
- Missing memory state is `not configured`, not zero.
- Status totals read the complete DSH session list rather than the first 50.
- Disk totals use validated native filesystem statistics; a zero/invalid result
  cannot be labeled healthy.

## Uncensored Qwen vision companion

Both files survived cleanup in:

`C:\Users\scott\.lmstudio\models\JonathanColetti\Qwen3.8-27B-Uncensored-GGUF`

- `Qwen3.8-27B-Uncensored-noMTP-Q6_K.gguf`
- `mmproj-Qwen3.8-27B-Uncensored-F16.gguf`

The projector is optional for text but required for image input. The publisher
renamed it from `Qwen3.8-27B-Uncensored-vision-f16.gguf` to the standard
`mmproj-...` prefix for automatic discovery. Halo's retained former-name file
was byte-identical to the current artifact, so it was renamed in place. No
download or reconstruction occurred.

- Size: 927,606,912 bytes
- SHA-256: `5ac423f8a29059dc24e51bc6a43e9380dcd57a9347f28b62591e0b3f60b7081c`
- Publisher artifact:
  https://huggingface.co/JonathanColetti/Qwen3.8-27B-Uncensored-GGUF/blob/main/mmproj-Qwen3.8-27B-Uncensored-F16.gguf
- Publisher model card and pairing instructions:
  https://huggingface.co/JonathanColetti/Qwen3.8-27B-Uncensored-GGUF/blob/main/README.md

After the rename, LM Studio reports one `qwen3.8-27b-uncensored` model with
`capabilities.vision=true`; the former loose CLIP row is gone. DSH's picker key
was updated to the new paired key.

## Evidence boundary

This audit verifies source contracts and point-in-time values. RAM/free-space
numbers are expected to move between polls. The events stream can truthfully
retain queued input on an old session; that does not mean a model is generating.
The Sessions tab intentionally retains historical context values even though
the global alarm no longer treats them as live.
