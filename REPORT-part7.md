# 25. The forty required questions, answered directly

Answers are short by design; each names the section holding the evidence.

| # | Question | Answer |
|---|---|---|
| 1 | Does current DSH run **well** natively on Windows 11, not merely launch? | **Yes.** Windows is a first-class target — 865 `win32` references, 555 `pwsh`, a real Win32-FFI sandbox, **zero** WSL references, and the shell seam is platform-gated at three independent layers (§6.5). One genuine caveat remains: Windows sandbox enforcement self-reports **`partial`**, not `full` (§18.2). |
| 2 | What DSH capabilities are weaker or unavailable on Windows? | `tmux-context` (tmux does not exist natively); sandbox enforcement is `partial`, not `full`. `lsp`, `mcp-client`, `e2b`, `subagent-codex` are **UNKNOWN** — none is in the stock composition. **`tool-bash` is not on this list**: it is deliberately `disabled` on `win32`, with `tool-pwsh` active in its place (§6.5, retracting an earlier claim). |
| 3 | How many actual first-party runtime plugins/capabilities does DSH contain? | **227** packages exist; the CLI declares **62** direct dependencies; the stock `web` profile composes **133**; `headless` composes **78**. §4.3. |
| 4 | How many work natively on Windows? | Of the 133 composed, **no Windows-specific failure was identified**. The two previously flagged (`tool-bash`, `bash-sandbox`) turned out to be correctly `disabled` on `win32` rather than broken (§6.5). Stated precisely: the profile composes and boots, and the high-risk packages were individually checked — **all 133 were not individually exercised**, so this is "none found", not "all verified". |
| 5 | Can DSH reliably use local OpenAI-compatible inference servers? | **Yes, out of the box.** `dsh-llm-pi-ai` implements `openai-completions`, `openai-responses` and `anthropic-messages`, takes a `baseURL` override per provider *and* per model, and discovers models via `GET {baseURL}/models`. §6, §11.1. |
| 6 | Which local server gives DSH the best experience on Strix Halo today? | **LM Studio.** §11.3. |
| 7 | Is LM Studio the best choice, or merely the easiest? | **Best, on the merits.** It is the only candidate that switches the llama.cpp execution backend without a rebuild — decisive on a platform where Vulkan-vs-ROCm is workload-dependent. §11.3. |
| 8 | Is Lemonade currently advantageous on this hardware? | **No, not for the primary path.** Its edge is NPU/hybrid execution, and §14 finds no NPU role today. **WATCH.** |
| 9 | Is direct llama-server preferable? | **No for serving; yes for measurement.** `llama-bench` isolates prefill far better than an HTTP ladder (§17.2, T-5). |
| 10 | Does Vulkan outperform ROCm on relevant Windows llama.cpp workloads? | **On decode, yes, but modestly** — +14.4 % at 8 K (only **2.2 sd**, suggestive) and +25.6 % at 32 K (5.3 sd, decisive), at n=4. Its bigger edge is **consistency**: decode cv **1.5 %** vs ROCm's **9.0 %**. And on **memory**: 29.35 GiB vs 46.60 GiB at a matched 32 KB workload, with Vulkan's footprint **flat** where ROCm's grows. §10. |
| 11 | Where does ROCm outperform Vulkan? | **Prefill, decisively** — **2.93×** to first token at 1.5 K tokens (179 sd) and **2.09×** at 5.7 K (98 sd), **+61.5 %** marginal throughput (23 sd), all at n=4. These are the most solid numbers in the report. The apparent fade to parity at 45 K tokens is **n=1 and confounded** by memory pressure — not relied upon. §10.6. |
| 12 | What portions of ROCm actually work natively on Windows today? | The **HIP runtime and HIP SDK for gfx1151 on Windows 11 25H2**, llama.cpp built against them (LM Studio runtime v2.29.1), **and PyTorch 2.12.0 via AMD's `device-gfx1151` wheels** (ROCm 7.14.0). §9.3–9.4. |
| 13 | What important ROCm components are still Linux-only? | The **ROCm Debugger is unsupported on RDNA 3.5**. **TensorFlow, JAX and ONNX are Windows-absent for this part** — AMD's matrix lists PyTorch as the only Windows framework for Ryzen APUs. **vLLM, SGLang and training remain UNKNOWN.** PyTorch itself is **no longer** on this list — see §9.4, which corrects an earlier error in this report. |
| 14 | What does AMD's Variable Graphics Memory setting actually do? | Moves the **firmware boundary** between memory Windows can see and memory presented to the GPU as dedicated VRAM. Applied before Windows boots. Creates no bandwidth. §8.2. |
| 15 | Is approximately 96 GB a real GPU-memory ceiling? | **No.** 96 GB is the maximum *carve-out*. With VGM at 64 GB this GPU already reports **99.84 GiB** of OpenCL global memory and **111.6 GiB** of total display memory. The ceiling that actually bites is the **54.40 GiB maximum single allocation**. §8.3. |
| 16 | Can workloads practically consume more than the configured VGM amount? | **Yes — proven on this machine.** VGM is 64 GB; OpenCL global memory is 99.84 GiB. §8.3. |
| 17 | What VGM setting should this 128 GB machine use? | **Keep 64 GB.** The resident model uses 26.73 GB with **zero** shared-memory spill; nothing measured is limited by the carve-out, and 96 GB would leave Windows only ~32 GB. §8.3. |
| 18 | How much memory should remain available to Windows and DSH? | Currently 63.79 GB visible, **25.51 GB free under load**. Treat **32 GB visible as the floor** — which is exactly what the aggressive 96 GB setting would leave. §8.3. |
| 19 | Which Qwen3.8 variants exist today? | **Qwen3.8-27B** (2026-08-14, dense 27.78 B, Apache 2.0), **Qwen3.8-2.4T-A95B** (2026-08-12, MoE), **Qwen3.8-Max** (GA 2026-08-03, hosted). Only the 27B is relevant here. §12.1. |
| 20 | Which Qwen3.8 configuration is best for DSH? | **Qwen3.8-27B, UD-Q5_K_XL, 131,072 context, `parallel: 1`** — the configuration already resident. §12.3. |
| 21 | Which quantization is the best quality/performance compromise? | **Q5_K_XL.** 21.15 GB, above the Q4 range where code-generation quality degrades, without paying Q6/Q8 bandwidth on a bandwidth-bound part. §12.3; confirm with T-4. |
| 22 | What context length is actually useful? | **131,072**, against a 262,144 maximum. The limit is prefill **time**, not memory — 45 K tokens already costs minutes to first token. §10, §12.3. |
| 23 | How much memory does the KV cache require at 32 K / 64 K / 128 K / 256 K? | **~5.58 GB total at 131,072, preallocated at load and confirmed not to grow during a 45 K-token prefill** (§8.4). A per-window table was **not** derived — **UNKNOWN**, T-3. |
| 24 | Does Flash Attention materially improve this workload? | **Partially answered.** Community evidence attributes ROCm's flat long-context behaviour to rocWMMA Flash Attention **[community]**; §10 measures the end-to-end consequence on this box but does not isolate FA as a variable. |
| 25 | Does MTP/speculative decoding materially improve this workload? | **Yes — measured.** Draft acceptance 5/5 observed, and decode of **14.8–16.4 tok/s** exceeds the ~12 tok/s naive bandwidth ceiling for a 21.15 GB model on ~256 GB/s. §12.4. |
| 26 | Are ROCmFPX or similar AMD-specialized runtimes ready for normal use? | **UNKNOWN.** No current, verifiable evidence was found. Not recommended. |
| 27 | What other local models should be installed? | An **A3B MoE worker** (`qwen3.6-35b-a3b` or `qwen3-coder-30b-a3b`), the existing **nomic embedding** model, and — experimentally — `gpt-oss-120b`. A **reranker is a gap**. §13.2. |
| 28 | What is the largest model this machine can technically run? | `gpt-oss-120b` at **63.39 GB** is the largest present; the addressable ceiling is ~99.8 GiB with a **54.40 GiB single-allocation** hazard. §13.2. |
| 29 | More importantly, what is the largest it can run **usefully**? | **Depends on *active* parameters, not file size** — a 63 GB dense model would decode near 4 tok/s and be useless interactively; a 63 GB MoE could be fine. **Not yet measured — T-2.** §13.2. |
| 30 | What makes the best primary local coding/agent model? | **Qwen3.8-27B UD-Q5_K_XL** — dense quality, native vision, `trainedForToolUse`, 262 K native context, and a hybrid architecture that makes long context affordable in memory. §12. |
| 31 | Which model should handle high-quality reasoning? | `gpt-oss-120b`, **EXPERIMENTAL** until T-2 runs. Today the 27B in thinking mode is the practical answer. |
| 32 | Which smaller model for fast worker/subagent tasks? | An **A3B MoE** — `qwen3.6-35b-a3b` or `qwen3-coder-30b-a3b`. Small active-parameter count means far less memory traffic per token on a bandwidth-bound part. §13.2, T-1. |
| 33 | Should DSH dynamically route among models? | **No.** DSH already ships user model selection (`dsh-client-ui-model-selection`, mounted) and per-subagent models. A routing layer would add a component with no measured benefit. §19.2. |
| 34 | Can several models remain loaded simultaneously? | **Yes.** LM Studio supports concurrent residency, and the headroom exists — 26.73 GB used of a 64 GB carve-out, with ~48 GiB of shared memory beyond it. §8.4, §11.2. |
| 35 | Does the XDNA 2 NPU provide a useful role? | **Not today.** No NPU runtime is offered by `lms runtime` on this box; the only four extensions available are CPU, Vulkan, ROCm and harmony. **WATCH.** §14. |
| 36 | Are recent Windows builds materially improving Strix Halo local AI? | The material fact is **alignment**: build 26200 / 25H2 is exactly the version AMD certifies for gfx1151 ROCm support. §15. |
| 37 | Are any Insider features compelling enough to justify testing? | **No.** Nothing identified changes GPU memory allocation, ROCm availability or throughput. **REJECT FOR NOW.** §15. |
| 38 | What is the best daily-driver configuration? | The §19.1 stack: stock DSH `web` profile → LM Studio `:1234` → llama.cpp 2.29.1 on **Vulkan** → Qwen3.8-27B Q5_K_XL @ 131 K, VGM 64 GB, sandbox `workspace-write`, shell seam left unpatched (`tool-pwsh` active, `tool-bash` win32-gated off). |
| 39 | What should be installed only experimentally? | A **ROCm profile at 32 K context** (T-10), a MoE worker model, `gpt-oss-120b`, `mcp-client`/`lsp`/`subagent-codex`, and `llama-bench`. §22. |
| 40 | What should we wait for? | An **NPU runtime in `lms runtime get -l`**; **PyTorch/vLLM on native Windows for gfx1151**; rocWMMA/Flash-Attention improvements for RDNA 3.5; and DSH reaching a non-prerelease. §26. |

---

# 28. Source appendix

Evidence is ordered by the directive's precedence: source code first, community last.

## Tier 1 — source code, at a pinned commit

Repository `github.com/deepseek-ai/deepseek-harness`, commit
**`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`** (2026-08-21), cloned locally.

| Claim | File |
|---|---|
| OpenAI-compatible protocols and `baseURL` override | `packages/llm/llm-pi-ai/src/provider.ts:25-187` |
| `GET /models` discovery | `packages/llm/llm-pi-ai/src/discovery.ts:39-232` |
| Runner chain incl. Windows ACL backend | `packages/sandbox/sandbox-local/src/index.ts:2-3,141` |
| Windows restricted-token / capability-SID sandbox | `packages/sandbox/sandbox-windows-acl/src/` (12 files, ~115 KB) |
| Sandbox modes, `partial` enforcement on Windows | `docs/subsystems/sandbox.md` |
| Permission presets and their defaults | `docs/subsystems/permission-presets.md` |
| Provider/model configuration surface, `compat` switches | `docs/user/guide/providers.md` |
| Node/pnpm requirements, workspace layout | root `package.json`, `pnpm-workspace.yaml` |
| Composed profile trees | `packages/bundle/{base,headless,web-app}/cordis.patch.yml` |

## Tier 2 — registries and vendor APIs

- npm packument for `@deepseek-ai/dsh` — versions, dist-tags, 62 dependencies, MIT licence.
- GitHub API — repository metadata, releases, pinned commit.
- AMD ROCm compatibility matrix — ROCm **7.14.0** (2026-07-16), gfx1151 on Windows 11 25H2.
- AMD Windows install docs — HIP SDK 7.2.0, RDNA 3.5 support levels, debugger exclusion.
- AMD ROCm "Strix Halo system optimization" — GTT/GART/VRAM model; **Linux-only guidance**.
- Qwen3.8-27B model card — parameters, hybrid architecture, context, licence, sampling.

## Tier 3 — commands executed on the target machine, 2026-08-23

`Win32_*` CIM classes · `dxdiag` · `clinfo` · `vulkaninfo --summary` ·
`Get-Counter '\GPU Process Memory(*)'` · `lms version|ps|ls|runtime|load|unload` ·
`GET /v1/models` and `POST /v1/chat/completions` against `:1234` ·
`pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --help` and `--dump-default-config` ·
`bench/Bench-Local.ps1`.

Raw artefacts are in `dsh-halo-research/evidence/`.

## Tier 4 — community evidence, labelled as such

Used **only** for the claims marked **[community]** in the body, and never elevated to vendor
support: Vulkan-vs-ROCm split behaviour on Strix Halo; rocWMMA Flash-Attention long-context
flatness; `GGML_HIP_NO_VMM=ON`; NPU under-utilisation for LLM inference; Lemonade release
numbering; LM Studio structured-output/tool-calling completeness relative to Ollama.

Where community sources disagreed — notably Lemonade's current release number — the
disagreement is recorded in §27 rather than silently resolved.
