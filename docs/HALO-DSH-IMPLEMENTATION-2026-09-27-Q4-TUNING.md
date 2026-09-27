# Native DSH Desktop Qwen27 Q4 tuning — September 27, 2026

The native DeepSeek Harness Desktop is the product configured here. LM Studio is its existing local inference server. Web DSH profiles, Web services, Windows security, drivers and the GPU carveout were not changed.

## Deployed configuration

| Setting | Final value |
|---|---|
| Desktop startup model | `lmstudio-library` / `halo/qwen3.8-27b-q4km` |
| Desktop startup effort | Medium |
| Effort menu / wire value | Off / `none`; Low / `low`; Medium / `medium`; Xhigh / `xhigh` |
| Q4 maximum output | 16,384 tokens; includes thinking and answer |
| Context | 131,072 tokens |
| Automatic compaction | Existing 70% threshold; unchanged |
| Backend | Existing LM Studio Vulkan 2.46.0 |
| mmap / memory lock | Explicitly disabled; actual backend `--load-mode none` |
| GPU offload / flash attention | Maximum / enabled |
| KV / parallel requests | f16 K and V / one lane |
| MTP | Enabled, depth 4, continuation minimum **0.5** |
| Idle TTL | One hour |

The saved Q4 alias retains its model-level Xhigh default. Desktop explicitly selects Medium. Other clients that omit effort continue to get the alias's own default; this task does not change their request policy. Off must send `none`; omission is not Off.

The live Q4 definition is `C:\Users\scott\.lmstudio\hub\models\halo\qwen3.8-27b-q4km\model.yaml`. Its saved SHA256 after the two memory-loading additions is `F294227174C1A82F658DCCA83A466CCA3A9106E26BB62B1481275D110D763832`. The actual loaded instance was checked after restoring probability 0.5: context 131072, parallel 1, f16/f16, flash attention, MTP depth 4, `--load-mode none`. Only this local model is loaded. LM Studio's GUI remains open.

## Request sampling

| Request mode | temperature | top_p | top_k | min_p | presence_penalty | repeat_penalty |
|---|---:|---:|---:|---:|---:|---:|
| Off (`none`) | 0.7 | 0.8 | 20 | 0 | 1.5 | 1 |
| Thinking (including omitted/default) | 1 | 0.95 | 20 | 0 | 0 | 1 |

The stock Desktop `dsh-llm-pi-ai` configuration does not expose these per-effort sampling fields. A small Desktop plugin reuses pi-ai's existing `onPayload` hook, preserving stock model routing, authentication, tool handling, streaming and retry behavior. It adds no model-facing tools and does not run a proxy.

Scope is exact: providers `lmstudio-library` and `lmstudio-qwen38`, endpoint `http://127.0.0.1:1234/v1`, and model IDs `halo/qwen3.8-27b-q4km`, `halo/qwen3.8-27b-q6`, `qwen/qwen3.8-27b`. Ollama, Claude, Codex, the Halo 35B brain and 30B coder are untouched. Other LM Studio clients are unaffected by this request plugin. The two Q4 memory-load keys are in the shared alias, so any client loading that alias receives those load settings.

**Maintenance limitation:** connecting the supported pi-ai payload hook to DSH uses DSH's internal `registration()` / `streamWithSnapshot()` seam. This is not a promise of upstream plugin API stability. Reverify Off and Medium after a DSH upgrade. The plugin checks the method shape and throws on incompatible targeted dispatch rather than silently pretending sampling was applied. No installed app archive or stock package was edited.

## Live Desktop verification

Native UI session: `session-31215a76-50a1-4bba-a3f2-0920650a5ef6`, displayed as **Q4 Off Verification Check**.

- Off: request/header seq13 records `reasoningEffort: off`, `maxTokens: 16384`, 27 tools. Assistant seq17 returns exactly `Q4_OFF_OK`, zero reasoning blocks/chars, 7,755 input and 5 output tokens. Turn/end seq19 is completed. The cold full-prompt call took about 41s; this is not a decode-speed benchmark.
- Medium: request/header seq27 records `reasoningEffort: medium`, `maxTokens: 16384`, 27 tools. The actual pre-dispatch wire diagnostic records `reasoning_effort: medium`, 16384 and the thinking sampling above. Assistant seq28 returns `Q4_MEDIUM_OK` with a reasoning block. Turn/end seq30 is completed.
- The saved Off wire diagnostic belongs to the separate stock title request (64-token allowance), not the main 16K request. Both use the same scoped sampling path. It confirms `none` and Off sampling; the main session trace independently proves no reasoning output. Do not confuse title allowance with the chat allowance.
- Three focused plugin tests pass: effort truthfulness and unchanged fields; unrelated endpoint/model isolation; simultaneous-call isolation, hook composition and disposal restoration.

The runtime overwrites a single `last-request.json` beside the installed plugin containing only model ID, effort and sampling/limit fields. It contains no prompts, headers or credentials. Background title calls can overwrite it. The evidence snapshot distinguishes title from chat calls.

## MTP 0.5 vs 0.2 result

One model loaded at a time; same Q4 file and load settings apart from continuation probability. One warm-up per load discarded. Off mode, explicit nonthinking sampling, paired seeds 42–44, 768-token answer cap. All measured answers ended normally before the cap. The fixture asks for strict half-open interval merging, input validation and no mutation.

| Probability | Median request time | Median streamed output rate | Fully correct runs |
|---|---:|---:|---:|
| 0.5 | 17.286s | 29.52 tokens/s | 0/3 |
| 0.2 | 16.999s | 29.37 tokens/s | 0/3 |

All three paired output texts were identical. They failed either the non-touching-interval rule or required input validation. No reasoning output, truncation or looping occurred. The streamed rate is completion tokens divided by first-to-last content interval, not a runtime decoder counter or long-context performance claim. Arms ran sequentially, not randomized; six short requests do not prove equivalence for every workload.

**Decision: retain 0.5.** The 0.2 hypothesis did not produce a demonstrated benefit here. Both the saved alias and loaded process are back at 0.5. This is not evidence that Off is sufficiently reliable for difficult coding. Medium remains the Desktop daily default. No new quality benchmark was needed to verify the configuration.

Research basis: [AMD's Windows Qwen guide](https://www.amd.com/en/blogs/2026/run-qwen-3-8-27b-on-amd-ryzen-ai-max-and-radeon-graphics-cards-day-0.html), [Qwen model card](https://huggingface.co/Qwen/Qwen3.8-27B), and [yandaq's Linux tuning sweep](https://github.com/yandaq/qwen3.8-27b-strix-halo/blob/main/benchmark.md). Linux probability findings motivated a local comparison; they were not treated as a Windows measurement.

## Files and recovery

Source in `stack/desktop-tuning/`:

- `Refresh-Desktop-Model-Catalog.ps1`: preserves Q4's 16384 allowance at refresh.
- `Select-Resident-Desktop-Model.ps1`: startup Q4 / Medium selection.
- `curate_picker.py`: matching default and output allowance in the prior picker migration.
- `qwen27-sampling.mjs`: Desktop-only sampling plugin; `qwen27-sampling.test.mjs`: tests.
- `q4-mtp-probe.mjs`: bounded comparison harness; `evidence/q4-final-tuning/`: raw responses, comparison and sanitized Desktop evidence.
- `deployed-2026-09-27/cordis.patch.yml` and `q4-model.yaml`: final recovery snapshots.

Live Desktop root: `C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval`.
Profile: `home\profiles\desktop\cordis.patch.yml`.
Plugin: `home\plugins\qwen27-sampling\index.mjs`.
Launch helpers are in that root; launch with `Launch-DeepSeek-Harness-Evaluation.vbs` or the **DSH Halo Desktop** shortcut. The launcher refreshes the catalog and selects the default; it does not reload models.

Pre-change backups: `C:\Users\scott\Documents\Codex\2026-09-27\q4-final-tuning\before`. For rollback at an idle point, restore the backed-up profile and helper scripts, restore `q4-model.yaml` to the alias location, then restart Desktop and reload that alias. Disable/remove the plugin insert when restoring the earlier profile. Do not restore a whole Desktop profile over later user edits without comparing it first.

Human-readable copies and deployable recovery files are mirrored under `C:\Users\scott\Desktop\Halo Stack Research`, with SHA256 manifest. Nothing here needs a Windows reboot. Increased maximum output allows longer individual answers and thinking; it does not force every call to emit 16K tokens or change the allocated context. No paging or memory-saving claim is made without a separate before/after measurement.
