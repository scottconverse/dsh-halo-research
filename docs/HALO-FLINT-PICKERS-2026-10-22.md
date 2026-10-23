# Flint in the normal DSH pickers — October 22, 2026

> Superseded limits: Flint is now configured for 256K context / 32K output. See the [October 23 correction](HALO-FLINT-LIMITS-2026-10-23.md). Acceptance below remains historical evidence at 32K context.

## Delivered
Flint UD-Q4_K_XL is selectable under **LM Studio downloaded** in both normal Web and Desktop catalogs as **Flint UD-Q4_K_XL (LM Studio Vulkan)**, provider `lmstudio-library`, model `flint`. It uses the existing LM Studio 0.4.26+4 OpenAI-compatible endpoint on loopback port 1234, with its Vulkan 2.63.0 backend. It does not depend on the earlier temporary llama.cpp server on port 8082.

Existing model entries and defaults are preserved. Final parsed comparison against the pre-task backups found exactly one catalog addition in each installed profile and no other configuration changes. The normal default remains Ollama DeepSeek V4.1 Flash 1017, Low effort; that model's 65,536 output allowance is unchanged. Wigolo, Reddit/Redlib, XERJ and existing presets were not modified or retested. No models were removed or downloaded.

## Configuration
- Flint-only operating envelope: 32,768 context, 8,192 maximum output, text input, one parallel prediction, full GPU offload. These are new Flint settings, not changes to other models. This task does not establish Flint's practical maximum context.
- No graduated reasoning control is advertised for Flint because LM Studio's model metadata does not advertise one. The model did emit reasoning; this is not a claim that thinking is off.
- Added Flint to the installed Web and Desktop profiles and their tracked recovery/source mirrors.
- Updated Desktop's catalog refresh script and its installed copy so future refreshes retain Flint's readable name and 32K context envelope. The existing Web catalog synchronization carries this library row through.
- Saved a Flint-only concrete-model load configuration at `C:/Users/scott/.lmstudio/.internal/user-concrete-model-default-config/unsloth/flint-GGUF/flint-UD-Q4_K_XL.gguf.json`. The source copy is [default-config.json](../stack/lmstudio-models/flint/default-config.json). LM Studio's existing just-in-time loading remains enabled. The final resident readback reports Flint alone at 32,768 context and parallel=1.

## Actual acceptance, serial execution
One short prompt was submitted in each normal profile through its visible picker. Web finished and its owned host was stopped before Desktop's verification host was started. Only Flint was loaded locally. No tools were called by either answer; no benchmarks, coding tests or subagents were used.

| App/profile | Full prompt | Actual answer | Turn duration | Reported turn usage |
|---|---|---|---|---|
| Web, Halo fast-first | Reply with exactly FLINT_WEB_OK. Do not use tools. | FLINT_WEB_OK | 44.408 seconds | 24,113 input; 33 output, including 26 reasoning |
| Desktop, Halo local | Reply with exactly FLINT_DESKTOP_OK. Do not use tools. | FLINT_DESKTOP_OK | 64.904 seconds | 16,932 input; 40 output |

Both session logs record `lmstudio-library/flint` and terminal reason `completed`. These are end-to-end turn times, including normal prompt assembly/processing and any queueing, not tokens-per-second benchmarks. Combined reported main-turn usage is 41,045 input and 73 output tokens. That is **not a complete runtime or Codex-account total**: normal DSH also automatically requested a title for each session (4,096-token request caps); their events do not report usage. Other LM Studio log requests cannot safely be attributed from the session ledger alone.

Sanitized acceptance evidence: [acceptance-2026-10-22.json](../stack/lmstudio-models/flint/acceptance-2026-10-22.json). Raw logs, authentication URLs and pre-change backups remain private under `C:/Users/scott/Documents/Codex/2026-10-22/flint-picker`.

### Desktop verification boundary
Windows automation timed out for both app and window enumeration. Desktop acceptance therefore used the **installed Desktop host entry point and normal Desktop home/profile**, with its interface opened in the in-app browser. This was not a copied or stripped-down test profile. Its picker visibly listed and selected Flint and its normal session persisted the completed answer. The native Electron window itself was not operated for the response. After this acceptance host was stopped, the normal Electron Desktop app was started with the same home/profile so it loads the catalog change.

## Corrections and operational findings
- Selecting a model on the opening screen writes the app-wide default. The verification temporarily selected Flint there; afterward both installed profiles were restored from their original backups with only the additive Flint row applied. Final comparison confirms DeepSeek/Low and every original catalog entry are retained. The two verification sessions keep their own Flint selection.
- The first Desktop-host launch passed the workspace where the host expected the profile project; it failed before any model request. Correcting the argument to the normal Desktop profile directory resolved it. The manual carrier also omitted Desktop's client-version telemetry field, producing a telemetry warning; the normal Electron launcher supplies that field. No telemetry or tool configuration was weakened.
- When checking saved load behavior after the two responses, a CLI load encountered an already-existing Flint identifier because LM Studio had reloaded it via JIT. The load command's exit status was 1; the subsequent resident inventory, rather than that command, establishes the final 32K/one-slot loaded state. No extra response was submitted.
- The earlier Flint report established only isolated-test behavior. This report adds normal-profile picker and response evidence; it does not establish long-document, multi-turn or tool-use quality.

## Use
Start LM Studio and the desired DSH app using the existing launchers. In the model picker, expand **LM Studio downloaded** and choose **Flint UD-Q4_K_XL (LM Studio Vulkan)**. Prefer changing the picker **inside an existing/newly created session** if you want a session-only selection; the opening-screen selection changes the default. Do not load a competing local model in Ollama or Gufo at the same time. Existing startup residency protections remain unchanged.

Flint remains the only loaded local model after acceptance, available to the normal app. Web's temporary verification host and the manual Desktop acceptance host were shut down by verified ownership. The normal Desktop Electron app was started afterward. All models and setup files remain in place. The new model entry and saved load configuration are included in the dated Halo recovery snapshot and manifest.
