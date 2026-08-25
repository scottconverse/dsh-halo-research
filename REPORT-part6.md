# 19. Recommended architecture

## 19.1 The stack

```
┌──────────────────────────────────────────────────────────────────────┐
│  DeepSeek Harness 0.1.1-rc.2   ·   profile: web   ·   133 plugins    │
│  sandbox: workspace-write (default, unchanged)                       │
│  shell seam: tool-pwsh + pwsh-sandbox (tool-bash is win32-gated off) │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  @deepseek-ai/dsh-llm-pi-ai
                             │  api: openai-completions
                             │  baseURL: http://127.0.0.1:1234/v1
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LM Studio local server  :1234   (process: llama-server)              │
│  residency + quantization truth source: `lms ps --json`              │
└────────────────────────────┬─────────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  llama.cpp 2.29.1 — backend selectable without rebuild               │
│    · llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1   (installed)         │
│    · llama.cpp-win-x86_64-vulkan-avx2@2.29.1     (installed)         │
│    · llama.cpp-win-x86_64-avx2@2.28.2            (CPU fallback)      │
└────────────────────────────┬─────────────────────────────────────────┘
                             ▼
      AMD Adrenalin 26.7.1 / display driver 32.0.31035.1003
                             ▼
      Radeon 8060S (gfx1151, RDNA 3.5) — 20 WGPs / 40 CUs
                             ▼
      128 GB LPDDR5X-8000, ~256 GB/s
      VGM 64 GB dedicated  |  63.79 GB to Windows  |  47.79 GiB shared
```

**No middleware, no routing layer, no custom plugins.** The directive warns against
introducing middleware because middleware can be built; nothing found in this investigation
justifies any. DSH's provider seam, LM Studio's model management and LM Studio's runtime
switching cover every requirement identified.

## 19.2 What is deliberately absent

| Not recommended | Why |
|---|---|
| A custom routing layer | **Q33** — DSH already exposes per-session model selection in the UI (`dsh-client-ui-model-selection`, mounted) and subagents can carry their own model. Automatic routing would add a component with no measured benefit. Use manual selection plus subagent-specific models. |
| Ollama | LM Studio is already installed, is ahead on OpenAI-surface completeness **[community]**, and uniquely offers backend switching. |
| A second serving backend | Heterogeneity is permitted by the directive but must earn its place. One server that can switch backends achieves the same result with less to break. |
| Converting to Linux / making WSL primary | Explicitly out of scope, and unnecessary — §9 shows the needed ROCm components are supported natively. |
| ROCm HIP SDK installed system-wide | Not required. LM Studio's ROCm runtime is self-contained. Install the SDK only for building llama.cpp by hand. |
| Insider Windows builds | §15 — no identified gain, and the machine is already on AMD's certified build. |

---

# 20. Outstanding tests — what this report does not yet know

Listed so they are not mistaken for settled.

| # | Test | Question it settles |
|---|---|---|
| T-1 | Dense vs MoE decode: same ladder against `qwen3.6-35b-a3b` | Confirms or refutes §13.2's central portfolio argument |
| T-2 | `gpt-oss-120b` load + decode at reduced context | **Q29** — largest *usefully* runnable model |
| T-3 | Fill the 131 K window and observe shared-memory usage | Whether the preallocation in §8.4 holds at full occupancy |
| T-4 | Quantization sweep: `q3_k_xl` / `q4_k_xl` / `q5_k_xl` / `q6_k` on tool-call correctness | **Q21** with evidence rather than reasoning |
| T-5 | `llama-bench` microbenchmark isolating pure prefill | Removes TTFT overhead from §10's numbers entirely |
| T-12 | **Repeat the 64 KB and 256 KB rungs** on a quiesced machine, with the model loaded at a reduced context so ROCm's footprint stays safe | The only rungs still at `n = 1`, and the 256 KB ROCm result is confounded by memory pressure (§10.6) |
| T-6 | DSH Tier-2 agent tasks (§17.2) end to end | Whether the harness is actually *good* here, not just working |
| T-7 | Network-disconnected task completion | Proof that the work is local (§17.3 criterion 6) |
| T-8 | `tool-fs-search` behaviour without `rg` on PATH | Whether ripgrep is a hidden dependency |
| T-9 | `mcp-client`, `lsp`, `subagent-codex` on Windows | The **UNKNOWN** rows in §6.4 |
| **T-11** | **Install AMD's `device-gfx1151` PyTorch wheel** into a throwaway venv; confirm the 8060S is visible to torch and run a matmul; record the driver version it demands vs the installed 32.0.31035.1003 / Adrenalin 26.7.1 | §9.4 — turns a documentation-verified capability into a machine-verified one |
| **T-10** | **ROCm at a 32 K context limit**: reload on ROCm with `--context-length 32768`, re-measure GPU footprint, re-run the 8–32 KB rungs | Whether ROCm's real 1.85–2.92× prefill win can be had at a safe memory footprint — **the highest-value follow-up on this box** (§10.5) |

---

# 21. Risks

## 21.1 The software is nine days old

DSH's first commit is 2026-08-13 and the newest release is 2026-08-21. There are four releases
in total, all prereleases, and the repository README says breaking changes are expected. **Pin
`0.1.1-rc.2` and pin the commit.** Do not track `latest` automatically.

## 21.2 `npx` should not be used on this box

The README's quick start is `npx @deepseek-ai/dsh web`. Use **`pnpm dlx`** instead. This is a
machine-specific finding recorded in §3.2 and is not an upstream defect; DSH itself declares
`packageManager: pnpm@11.7.0`.

## 21.3 One environment variable disables all containment

`DSH_PERMISSION_MODE=danger-full-access` does not narrow the sandbox — it **bypasses** it:
*"A `danger-full-access` consumer spawns its original argv and does not call `ctx.sandbox`."*
The stock default is `workspace-write`. If containment matters, the check is not "is the
sandbox plugin loaded" — it is **"what is `DSH_PERMISSION_MODE` set to"**, because the plugin
is loaded and inert either way.

Related: on Windows the ACL runner self-reports **`partial`** enforcement (§18.2). Real, useful,
not absolute.

## 21.4 A local workstation that quietly runs in the cloud

The stock default model is `deepseek-official` / `deepseek-v4-flash`. Nothing about a working
DSH session proves it is local. §17.3 criterion 6 — disconnect the network and re-run — is the
only test that cannot be faked.

## 21.5 ~~`tool-bash` on this machine~~ — RETRACTED

This risk does not exist. `tool-bash` and `bash-sandbox` are `disabled` on `win32` at the base
bundle, the mode bundle, and the agent preset. The Windows agent gets `tool-pwsh` +
`pwsh-sandbox`. See §6.5 for the retraction and the methodological cause.

**The residual lesson is the one worth keeping:** a package appearing in
`--dump-default-config` output is *not* evidence that it is active. Read the `disabled` key on
the row. The same distinction that governs the plugin counts in §4.3 governs this.

## 21.6 Thinking tokens consume the output budget

Measured: `max_tokens: 8` produced empty content and 8 reasoning tokens. Under-budgeted output
limits will truncate tool calls before they are emitted.

## 21.7 Subagents can silently use the wrong provider — reported upstream, unfixed

Discussion 3377 reports that subagents use the model **snapshotted when the parent agent was
created**, not the currently selected one. The reporter's seven subagents all failed with:

```
UNKNOWN_MODEL: pi-ai provider "packyai" has no configured model "kimi-k3"
```

naming a provider/model combination that **had never been configured in that deployment**,
while the parent had already switched to a working provider.

**Why this matters here specifically.** The recommended build adds a *custom* provider
(`lmstudio`) and expects the user to switch to it in the UI. That is exactly the sequence the
bug punishes: switch model in the UI, spawn subagents, and they may still carry the stale
provider from session creation.

**Mitigation until fixed:**
1. Make the local model the **default** — selecting a model in the picker also makes it the
   default for new sessions (§18.1's source doc).
2. After changing models, **start a new session** before using subagents.
3. If subagents fail with `UNKNOWN_MODEL`, do not debug the provider block first — check the
   `subagent/descriptor` entries in the session log against the parent's `provider`/`model`.

## 21.8 There is no bug tracker

Issues are **disabled** on the DSH repository (`has_issues: false`). When something breaks
there is no canonical place to check whether it is already known; Discussions search (4,117
threads) is the only substitute. Budget for that.

## 21.9 No `dsh web` stop or restart

Reported upstream (discussion 2933) and confirmed against the pinned CLI: there is no
`--stop`/`--restart`. A closed terminal leaves an orphan holding port 3080, and the next launch
fails with "port in use". Keep a kill command handy:

```bash
Get-NetTCPConnection -LocalPort 3080 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

# 22. Build Now / Experimental / Watch / Reject

| Decision | Item | Rationale |
|---|---|---|
| **BUILD NOW** | DSH 0.1.1-rc.2, `web` profile, stock composition | 133 plugins compose cleanly; Windows is first-class |
| **BUILD NOW** | `dsh-llm-pi-ai` → LM Studio via `openai-completions` | verified working; no `compat` block needed |
| **BUILD NOW** | Sandbox left at `workspace-write` | already the default; Windows backend is genuine |
| **BUILD NOW** | Leave the shell seam **unpatched** | §6.5 — `tool-bash` is already `disabled` on win32 at three layers; the earlier "disable it" instruction was withdrawn |
| **BUILD NOW** | Qwen3.8-27B UD-Q5_K_XL @ 131,072 context | resident, measured, 26.73 GB, VL + tool use |
| **BUILD NOW** | LM Studio as the serving layer | only option offering runtime switching |
| **BUILD NOW** | **Vulkan** as the llama.cpp backend | §10 — better on the merits: wins decode everywhere, at prefill parity by 45 K tokens, 2.7× less memory |
| **BUILD NOW** | VGM left at **64 GB** | §8.3 — nothing measured is limited by it |
| **BUILD NOW** | `pnpm dlx`, never `npx`, on this box | §21.2 |
| **BUILD NOW** | Install ripgrep (`scoop install ripgrep`) | cheap insurance for `tool-fs-search` |
| **EXPERIMENTAL** | ROCm at a **32 K context limit** (T-10) | its 1.85–2.92× prefill win is real at 1.5–11 K tokens; the open question is whether the footprint stays safe |
| **EXPERIMENTAL** | MoE worker model for subagents | §13.2 argument is sound but unmeasured (T-1) |
| **EXPERIMENTAL** | `gpt-oss-120b` for deep reasoning | capacity and usefulness unverified (T-2) |
| **EXPERIMENTAL** | `mcp-client`, `lsp`, `subagent-codex` | not in stock composition; Windows status UNKNOWN |
| **EXPERIMENTAL** | `llama-bench` for clean microbenchmarks | measurement tooling, not production |
| **WATCH** | XDNA 2 NPU for embeddings / rerank / ASR | no runtime exists today; real bandwidth argument if it arrives |
| **WATCH** | Lemonade | NPU/hybrid path; revisit if the NPU story changes |
| **EXPERIMENTAL** | **PyTorch on native Windows** (`torch[device-gfx1151]==2.12.0+rocm7.14.0`) | §9.4 — AMD publishes it; documentation-verified but **not yet installed or run here** (T-11). Unlocks fine-tuning and PyTorch tooling without WSL |
| **WATCH** | vLLM / SGLang native Windows on gfx1151 | UNKNOWN; PyTorch's availability does not imply theirs |
| **WATCH** | VGM at 96 GB | only if a >55 GB resident model becomes worth it |
| **REJECT FOR NOW** | Custom routing middleware | no measured benefit; DSH already switches models |
| **REJECT FOR NOW** | Windows Insider builds | no identified gain; loses a certified configuration |
| **REJECT FOR NOW** | Converting to Linux / WSL-primary | out of scope and unnecessary |
| **REJECT FOR NOW** | Ollama | strictly worse here than what is installed |
| **REJECT FOR NOW** | Tracking DSH `latest` automatically | nine-day-old prerelease software |

---

# 23. Installation sequence

Non-destructive, in order, with a rollback for every step that changes anything.

| # | Step | Rollback |
|---|---|---|
| 1 | Record the baseline (`machine-baseline.txt`, `dxdiag`, `clinfo`, `vulkaninfo`, `lms ps --json`) | — |
| 2 | Confirm Windows 25H2 / build 26200 and driver 32.0.31035.1003 | — |
| 3 | **Leave VGM at 64 GB** — verify, do not change | Adrenalin → Performance → Tuning → System |
| 4 | Confirm **Vulkan** is the selected runtime (`lms runtime ls`) — §10's verdict | `lms runtime select` |
| 5 | *(optional, experimental)* Install the ROCm runtime for the T-10 experiment only | `lms runtime remove` |
| 6 | Re-run the §17.2 Tier-1 ladder to confirm the machine matches §10's baseline | — |
| 7 | `scoop install ripgrep` | `scoop uninstall ripgrep` |
| 8 | Launch DSH: `pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" web` | nothing persisted until settings are written |
| 9 | Write the §18.1 provider block into `$DSH_HOME/settings.yaml`; set `LMSTUDIO_API_KEY` | delete the provider entry |
| 10 | Confirm via `--dump-config` that `tool-bash` carries a `disabled` key and `tool-pwsh` is active — **no patch to write** (§18.3) | — |
| 11 | Select the local model in the DSH UI | re-select any other model |
| 12 | Run the §17.3 acceptance criteria **including criterion 6 (network disconnected)** | — |
| 13 | Run Tier-2 agent tasks; record tool-call reliability | — |
| 14 | Add the MoE worker model; re-run T-1 | `lms unload` |
| 15 | Freeze: record every version, commit the evidence directory | — |

**Do not perform step 9 before step 6.** Choosing a backend after configuring the harness means
re-validating the harness against a changed serving layer.

---

# 26. Upgrade path

| Component | What to watch | What would change here |
|---|---|---|
| **DSH** | Anything past `0.1.1-rc.2`; breaking changes are promised | Re-run `--dump-default-config` and diff the plugin set. **The composition is the contract**, not the version number. |
| **ROCm Windows** | **PyTorch already landed** (§9.4). Watch next for vLLM, SGLang, ONNX and training on gfx1151 | Each would remove another reason to keep a Linux lane; PyTorch already removed the biggest one |
| **llama.cpp** | rocWMMA / Flash Attention improvements for RDNA 3.5 | Directly moves the §10 prefill numbers |
| **LM Studio runtimes** | An NPU runtime appearing in `lms runtime get -l` | The single event that would move §14 from WATCH to BUILD |
| **Qwen** | Successors to Qwen3.8-27B keeping the hybrid DeltaNet design | The KV economics in §12.2 are the reason this model fits; a conventional successor would not |
| **AMD driver** | VGM granularity, shared-memory behaviour on Windows | Could change §8's conclusions; re-measure `clinfo` global + max-alloc after driver updates |
| **Windows** | WDDM changes to shared-memory limits | Re-run `dxdiag` and `clinfo` after feature updates |

**Deliberately modular seams** — keep these swappable:

1. **The provider block.** Changing serving layer should be a `baseURL` edit, nothing more.
2. **The backend.** `lms runtime select` — never bake a backend into a build.
3. **The model.** DSH's model picker; do not hard-code a model into agent instructions.
4. **The sandbox mode.** A knob, not a code path.

---

# 27. Known unknowns

Stated plainly, per the directive's evidence standard.

1. **Direct DSH + Strix Halo evidence is sparse.** No firsthand report was found of DSH
   specifically driven by a local model on Ryzen AI Max hardware. Given DSH is nine days old,
   this is expected. **This report is therefore mostly Category B (demonstrated components that
   compose) and Category C (architectural hypothesis), not Category A.** The DSH-side facts are
   strong because they come from source; the *combination* is not yet widely demonstrated.
2. ~~PyTorch on native Windows for gfx1151 — not established~~ — **RESOLVED, AND THE ORIGINAL
   ANSWER WAS WRONG.** AMD publishes `torch[device-gfx1151]==2.12.0+rocm7.14.0` for Windows.
   See §9.4 for the correction and why it was missed. **vLLM, SGLang and training remain
   unestablished**; TensorFlow/JAX/ONNX are Windows-absent for this part.
3. **Per-window KV cache table (32 K / 64 K / 128 K / 256 K)** — the preallocation behaviour is
   measured (§8.4) but a per-window breakdown was not derived.
4. **`tool-fs-search` without ripgrep** — untested (T-8).
5. **`mcp-client`, `lsp`, `e2b`, `subagent-codex` on Windows** — untested (T-9).
6. **Whether `hipBLASLt` / `MIOpen` / `RCCL` are Windows-available for gfx1151 specifically** —
   the matrix gives versions, not per-OS per-target status.
7. ~~Lemonade's current release number~~ — **RESOLVED**: `lemonade-sdk/lemonade` **v11.7.0**,
   published **2026-08-19T19:39:54Z**, not a prerelease (GitHub releases API).
8. **Long-run stability** — nothing here ran for hours. Thermal and stability behaviour under
   sustained agent load is unmeasured.
9. **Why ROCm's memory footprint grows as it does (§10.4)** — the mechanism was not isolated.
   The plausible cause is HIP compute-buffer sizing scaling with batch, and community evidence
   points at `GGML_HIP_NO_VMM=ON` as a related HIP VMM defect on this GPU **[community]** — but
   LM Studio's runtime does not expose that flag, so it was not testable here.
10. **Whether the subagent provider-snapshot bug (§21.7) is fixed at the pinned commit** — the
    report was not independently reproduced or refuted. Treated as live.
