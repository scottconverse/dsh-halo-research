# Gufo-recommended 27B Q4 + DFlash2 trial — October 15, 2026

Downloaded the model configuration specified by the Windows Gufo guide, rather than Gufo-trained replacement weights. It consists of Unsloth Qwen3.8 27B UD-Q4_K_XL and a z-lab DFlash2 Q4_K_M speculative draft. Existing Q6 files and every original provider/default setting remain unchanged. Both pickers receive an additive, accurately named Q4 + DFlash2 entry. Only one real job was run, in Desktop; Web was refreshed to expose the entry but this new configuration was not separately exercised there.

## Files and integrity
Directory: C:\Gufo\models\qwen3.8-27b
- Qwen3.8-27B-UD-Q4_K_XL.gguf — 17559178144 bytes; SHA256 3f227079003add2511437e5b1e94812e363385225bf6a9b47b0054a72bc8b01e
- Qwen3.8-27B-DFlash2-Q4_K_M.gguf — 1143006816 bytes; SHA256 1a25c56858e1ebe93f2718ac1d49d1151f9323325c1bbfd6209370f4db131ebd
Both downloaded files independently matched their published Hugging Face LFS SHA256 and byte counts. Target revision 4ca720788d1e01f1bff70c033e0d0028fd02e502; draft revision 2d9571f8ce46e151f61c6499c99dee6079e1d610. Sources:
- https://huggingface.co/unsloth/Qwen3.8-27B-GGUF
- https://huggingface.co/z-lab/Qwen3.8-27B-DFlash2-GGUF
- https://github.com/pixmaate/gufo/blob/windows-2026-10-03/tools/windows/start.ps1

Runtime unchanged: pinned windows-2026-10-03. One session, context 131072, maximum output 24576, thinking off. DFlash2 enabled with draft-tokens 7 and process-local GUFO_QWEN27_LOOKUP=3, matching the Windows launcher's fastest documented 27B option. No global environment change. Existing idle Gufo Q6 process was stopped before Q4 loaded. No Ollama or LM Studio model was loaded or unloaded. Initial immediate restart correctly refused while the old port was still releasing; a subsequent start succeeded. Stop helper now waits for process exit. Q4+draft load took 4409 ms, GPU allocation 29562 MiB (28.9 GiB). It remains running.

## Actual job and comparison
Session: session-5ffa779c-6ea9-4f03-a2e4-32b1c1757b18, Desktop evaluation home.
Prompt, identical to earlier Q6 Desktop job:
> Use web_fetch to read https://longmontcolorado.gov/library/. In under 80 words, list its regular weekly opening hours with the source URL. Use only this page; no shell, skills, or files.

Start 2026-10-15T16:39:16.703Z; completed 16:39:39.816Z; **23.113 seconds**. One actual web_fetch through automatic Wigolo fallback, HTTP200. Correct final answer: Monday–Thursday 9am–8pm; Friday–Saturday 9am–5pm; Sunday 1–5pm, linked to the official source. UI visibly showed Completed in 23s.

| Observation | Existing Q6, plain decoding | Recommended Q4 + DFlash2 |
| --- | ---: | ---: |
| Same short Desktop task elapsed | 34.165s | 23.113s |
| First main pass decode | 8.5 tokens/s | 27.7 tokens/s |
| Final answer decode | 8.4 tokens/s | 26.9 tokens/s |
| First main pass prefill | 571.6 tokens/s | 561.4 tokens/s |
| Draft acceptance | not used | 88.9%, then86.3% |
| Final answer cache reused | 8185 tokens | 8188 tokens |

Observed overall time reduction about32%; final-answer decode about3.2 times faster. This is one real, short task, not a statistical benchmark or broad quality comparison. The two configurations differ in both weight precision and speculative decoding; these results do not isolate either contribution. No repeated benchmark, prompt padding, quality suite or tuning sweep was run. No claim is made that Q4 is equally accurate on harder work.

Main model passes: full prompt counts8155/8580; generated33/61; newly processed input8155/392; cache-read8188. Automatic session title: prompt169/generated6, decode13.0tokens/s. Total observed engine token traffic across all three requests17004, including cache; newly processed input8716 and generated100. Title generation queued the main request for1.554seconds. Source/runtime logs and decoded journal are saved with this report.

## Controls and preservation
Double-click C:\Gufo\Start Gufo Recommended Q4.cmd to start this configuration. C:\Gufo\Start Gufo.cmd retains the original ExistingQ6 behavior. First use C:\Gufo\Stop Gufo.cmd to switch between them; it verifies ownership and does not stop DSH, Ollama or LM Studio. Only one Gufo target is served at a time. Select the corresponding model entry in DSH; the unloaded alternative remains listed but requires the explicit runtime switch.

After the trial, restored Desktop's full original saved default block. Parsed all four live/canonical profiles: excluding only the added model row, their complete data trees equal the pre-trial backups. All existing models, defaults and unrelated settings are retained. No new worker or benchmark harness was created. Native Desktop window refresh initially hit a geometry error; supported activation and a fresh screenshot resolved it. Automatic approval rejected a broad process-close command before execution; only the verified completed-test Desktop window was closed through its own Close control instead.
