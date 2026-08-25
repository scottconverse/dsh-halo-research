# DeepSeek Harness on a 128 GB AMD Strix Halo Windows 11 Workstation

## A clean-room research report and initial build specification

**Research date:** 2026-08-23
**Target machine:** AMD Ryzen AI Halo Developer Platform (`RAH-001`), native Windows 11
**Status of this document:** research + specification. Nothing has been installed or
reconfigured on the target machine except where explicitly recorded in §16.3.

---

## Clean-room declaration

This investigation was conducted from first principles. No prior implementation of this
concept was read, searched for, inherited from, or used as evidence. Every number in this
report comes from one of:

1. the upstream source tree at a pinned commit,
2. the npm registry,
3. first-party vendor documentation,
4. a command executed on the target machine on 2026-08-23, or
5. a cited third-party source, labelled as such.

Where a claim is community evidence rather than vendor or source evidence, it is marked
**[community]**. Where something could not be established, it is marked **UNKNOWN** rather
than filled with speculation.

---

# 1. Executive summary

**The best DeepSeek Harness workstation that can actually be built on this machine today is a
four-layer stack in which DSH itself is left almost entirely stock.**

```
DeepSeek Harness 0.1.1-rc.2  (web profile, 133 plugins, workspace-write sandbox)
        │  dsh-llm-pi-ai, protocol "openai-completions", per-model baseURL
        ▼
LM Studio local server  :1234   (OpenAI-compatible, GET /models discovery)
        │
        ▼
llama.cpp 2.29.1  — Vulkan runtime as the default (measured, §10),
                    ROCm runtime installed as an experimental lane
        ▼
AMD Adrenalin 26.7.1 / driver 32.0.31035.1003  →  Radeon 8060S (gfx1151)
        ▼
128 GB LPDDR5X-8000 unified memory, currently split 64 GB VGM / 64 GB system
```

The five findings that decide the architecture:

**1. DSH already speaks to local OpenAI-compatible servers, out of the box, with no
middleware.** The stock `web` profile mounts `@deepseek-ai/dsh-llm-pi-ai`, which implements
the `openai-completions` and `openai-responses` protocols, accepts a per-provider and
per-model `baseURL` override, and discovers models by `GET {baseURL}/models`
(`packages/llm/llm-pi-ai/src/discovery.ts:39-232`, `provider.ts:25-187`). A local-model
workstation is a **configuration** exercise, not an engineering one.

**2. The plugin count that matters is 133, not 227.** The repository contains 227 packages;
the `dsh` CLI declares 62 direct dependencies; the composed default `web` profile mounts
**133** distinct packages. These are three different numbers and they are routinely
conflated. §5 gives all three with the method for each.

**3. Windows containment is already implemented, natively, and is on by default.** The stock
sandbox mode is `workspace-write`, resolved as
`process.env.DSH_PERMISSION_MODE ?? 'workspace-write'`. On Windows the enforcement is a real
restricted-token spawn with a capability-SID write allowlist, implemented in ~115 KB of Win32
FFI (`packages/sandbox/sandbox-windows-acl/`). There is nothing to build here, and one
environment variable can silently disable all of it — see §21.3.

**4. ROCm is now a legitimate native-Windows option for this exact machine — and it was
measured, and it loses.** ROCm 7.14.0 (released 2026-07-16) lists `gfx1151` as supported on
**Windows 11 25H2**, precisely this box's OS, and LM Studio ships
`llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1` — the *same llama.cpp version* as the Vulkan
runtime, which made a genuinely controlled comparison possible. The result, replicated at **n = 4** per rung (§10): ROCm is **2.93× faster to first token at
1.5 K tokens and 2.09× at 5.7 K** — the most solid measurements in this report — but it holds
**46.60 GiB of GPU memory at an ordinary 32 KB workload against Vulkan's 29.35 GiB (1.59×)**,
and unlike Vulkan its footprint **grows with prompt size** rather than staying flat, reaching
78.39 GiB and driving free system RAM to 1.55 GB on a long prompt. **Vulkan is the default —
decided on memory shape, not throughput.**

**5. The memory question has a precise answer, and it is not "96 GB".** See §8. The short
version: 96 GB is the maximum *VGM carve-out* AMD exposes on a 128 GB part, the current
setting is 64 GB, the GPU can already address ~99.8 GiB, and the binding constraint for a
single model is the **54.4 GiB maximum single allocation**, not the carve-out.

The single largest risk to this build is not technical. It is that DSH's own defaults point
at a cloud provider (`deepseek-official` / `deepseek-v4-flash`), so a workstation that
"works" can quietly be doing none of its work locally. §21.4 specifies the check.

---

# 2. What is actually possible today

| Capability | Status on this machine, today |
|---|---|
| Run DSH natively on Windows 11 | **Yes** — verified, §4 |
| Drive DSH from a local model with no middleware | **Yes** — stock plugin, §6 |
| User-visible model switching in the DSH UI | **Yes** — `dsh-client-ui-model-selection` is mounted by default |
| Enforced filesystem containment on Windows | **Yes** — restricted-token/ACL, on by default |
| ROCm on native Windows for gfx1151 | **Yes** — ROCm 7.14.0, Windows 11 25H2 |
| A 27B dense VL model at 128K context | **Yes** — currently resident, 21.1 GB |
| Speculative decoding / MTP | **Yes** — already active, measured, §12.4 |
| Use the XDNA 2 NPU for the primary LLM | **No** — §14 |
| **PyTorch on native Windows for gfx1151** | **Yes** — AMD ships a `device-gfx1151` wheel, ROCm 7.14.0 / torch 2.12.0, §9.4 |
| vLLM / SGLang / training on native Windows | **Not established** — §9.3 |
| TensorFlow / JAX / ONNX on native Windows for this part | **No** — AMD lists PyTorch only, §9.3 |

---

# 3. Version discipline — what exactly was measured

Every version below was read from the machine or the registry on **2026-08-23**.

## 3.1 Target machine, as found

| Item | Value | How obtained |
|---|---|---|
| System | AMD `RAH-001`, board Compal "AMD Ryzen AI Halo" | `Win32_ComputerSystem`, `Win32_BaseBoard` |
| CPU | AMD Ryzen AI Max+ 395 w/ Radeon 8060S, 16C/32T, 3.0 GHz base | `Win32_Processor` |
| Memory | 8 × 16 GB Samsung `K3KLALA0EM-MGCV` @ **8000 MT/s** = 128 GB | `Win32_PhysicalMemory` |
| Memory visible to Windows | **63.79 GB** | `Win32_OperatingSystem` |
| GPU | AMD Radeon 8060S, PCI `VEN_1002&DEV_1586` | `Win32_VideoController` |
| Display driver | **32.0.31035.1003**, dated **2026-07-23** | `Win32_VideoController` |
| Adrenalin / LLPC | **26.7.1** | `vulkaninfo` `driverInfo` |
| BIOS | AMD **03.03**, dated **2026-06-09** | `Win32_BIOS` |
| OS | Windows 11 Pro **25H2**, build **26200.9168** | `CurrentVersion` registry key |
| System SSD | Micron 4600 `MTFDLBA2T0THJ`, 1905.6 GB, **852.5 GB free** | `Get-PhysicalDisk`, `Get-Volume` |
| Secondary | Seagate One Touch Hub 7452 GB USB HDD (`D:`) | `Get-PhysicalDisk` |

> **Note on the OS name.** The registry `ProductName` still reads "Windows 10 Pro". This is a
> known Windows 11 registry artefact; `DisplayVersion 25H2` and build `26200` are
> authoritative.

## 3.2 Toolchain, as found

| Tool | Version | Note |
|---|---|---|
| Node.js | **25.9.0** | satisfies DSH's `>=24.0.0` |
| npm | 11.12.1 | not used to run DSH — see §4.4 |
| pnpm | **11.22.0** | DSH declares `pnpm@11.7.0` |
| Python | 3.13.5 | |
| Git | 2.55.0.windows.3 | |
| PowerShell | **7.6.5** | DSH ships a PowerShell tool seam |
| Vulkan | instance **1.4.341**, device API **1.4.349** | AMD proprietary driver |
| OpenCL | driver 3679.0 (PAL,LC) | |
| LM Studio CLI | `lms` present | server live on **:1234** |
| ROCm / HIP SDK | **not installed** | `C:\Program Files\AMD\ROCm` absent, `HIP_PATH` unset |
| Ollama, llama-server standalone | **not installed** | |

## 3.3 Upstream software, as published

| Component | Pinned value | Source |
|---|---|---|
| DSH repository | `github.com/deepseek-ai/deepseek-harness`, default branch `master` | GitHub API |
| DSH repo created | **2026-08-13T11:56:32Z** | GitHub API |
| **DSH master commit (pinned for this report)** | **`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`** (2026-08-21T12:03:37Z) | GitHub API + local clone |
| DSH latest release | `dsh-v0.1.1-rc.2`, 2026-08-21T12:35:08Z, **prerelease** | GitHub API |
| DSH on npm | `@deepseek-ai/dsh@0.1.1-rc.2`, `latest` **and** `next`, published 2026-08-21 | npm registry |
| DSH licence | MIT | package manifest |
| DSH `engines.node` | `^22.19.0 \|\| >=24.0.0` | root `package.json` |
| DSH `packageManager` | `pnpm@11.7.0` | root `package.json` |
| DSH stars / forks | 185,833 / 20,587 | GitHub API |
| ROCm current | **7.14.0**, released **2026-07-16** | AMD compatibility matrix |
| llama.cpp (via LM Studio runtimes) | **2.29.1** for both Vulkan and ROCm | `lms runtime` |
| Lemonade | **v11.7.0**, published 2026-08-19, not a prerelease | GitHub releases API |
| Qwen3.8-27B | released **2026-08-14**, Apache 2.0 | see §12 |

> Only four DSH releases exist in total (`0.1.0-rc.7`, `0.1.0-rc.8`, `0.1.1-rc.1`,
> `0.1.1-rc.2`), all prereleases, all published within six days. **This is nine-day-old
> software.** Every recommendation in this report should be re-checked against upstream
> before it is treated as durable.
