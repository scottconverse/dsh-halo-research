# 7. Strix Halo hardware analysis

| Property | Measured / documented value | Source |
|---|---|---|
| APU | AMD Ryzen AI Max+ 395 | `Win32_Processor` |
| CPU | 16 Zen 5 cores / 32 threads, 3.0 GHz base | `Win32_Processor` |
| iGPU | Radeon 8060S, PCI device `0x1586` | `Win32_VideoController` |
| gfx target | **gfx1151** (RDNA 3.5) | AMD ROCm compatibility matrix maps Ryzen AI Max to gfx1151 |
| Compute units | **20 reported by OpenCL** | `clinfo` |
| Memory | 8 × 16 GB LPDDR5X @ **8000 MT/s** = 128 GB | `Win32_PhysicalMemory` |
| Theoretical bandwidth | ~256 GB/s (256-bit × 8000 MT/s) | derived |
| Vulkan | device API **1.4.349**, AMD proprietary, LLPC **26.7.1** | `vulkaninfo` |
| OpenCL | driver 3679.0 (PAL,LC) | `clinfo` |

> **On the compute-unit count.** AMD markets the 8060S as 40 CUs; `clinfo` reports **20**.
> These are consistent: RDNA groups two CUs into one work-group processor, and the OpenCL
> runtime reports WGPs. Nothing is wrong with the part. Any tool that reports "20 CUs" on this
> machine is reporting WGPs, and a benchmark that scales by "CU count" must say which it means.

---

# 8. Windows memory architecture — the question answered properly

This is the section most often got wrong, so every number below is measured.

## 8.1 What the machine reports

| Reading | Value | Source |
|---|---|---|
| Physical DIMM capacity | **128 GB** | `Win32_PhysicalMemory` (8 × 16 GB) |
| Memory visible to Windows | **63.79 GB** | `Win32_OperatingSystem` |
| GPU **Dedicated** memory | **65,360 MB** ≈ 63.83 GiB | `dxdiag` |
| GPU **Shared** memory | **48,938 MB** ≈ 47.79 GiB | `dxdiag` |
| GPU **Display (total)** memory | **114,298 MB** ≈ 111.6 GiB | `dxdiag` |
| OpenCL global memory | **107,206,131,712 B** = **99.84 GiB** | `clinfo` |
| OpenCL **max single allocation** | **58,411,555,225 B** = **54.40 GiB** | `clinfo` |
| `Win32_VideoController.AdapterRAM` | 4,293,918,720 (~4 GB) | **ignore — 32-bit overflow artefact** |

`65,360 + 48,938 = 114,298`, exactly. Windows' "Display Memory" is simply dedicated plus
shared.

## 8.2 What is actually happening

The 128 GB is one physical pool. **VGM (Variable Graphics Memory) is currently set to 64 GB**,
which is why:

- Windows sees 63.79 GB rather than 128 GB — the carve-out is taken *before* the OS counts
  memory, at firmware level. It is not "reserved from Windows"; Windows never sees it.
- The GPU reports 63.83 GiB "Dedicated" — the carve-out.
- The GPU additionally reports 47.79 GiB "Shared" — a WDDM mapping over the *remaining*
  system RAM, which is the Windows analogue of Linux's GTT.

AMD's own Strix Halo optimization guidance says the opposite of what most Windows users do:

> "AI frameworks work more efficiently with GTT-backed allocations. GTT allows large, flexible
> mappings without permanently reserving memory, resulting in better overall system
> utilization." — AMD ROCm docs, Strix Halo system optimization

AMD recommends keeping the firmware VRAM reservation *minimal* (as low as 0.5 GB) and raising
the GTT limit instead. **But that entire page is Linux-only.** Its mechanism is the TTM
`pages_limit` sysfs knob and the `amd-ttm` helper. There is no TTM on Windows, no
`pages_limit`, and no `amd-ttm`.

**This is the single most important asymmetry in the whole investigation:** on Linux you tune
GTT and leave VRAM tiny; on Windows the carve-out *is* the tuning knob, because the flexible
half is not user-controllable.

## 8.3 Answering the required questions directly

**Q14 — What does Variable Graphics Memory actually do?**
It moves the firmware boundary between memory Windows can see and memory presented to the GPU
as dedicated VRAM. It is a firmware reservation, applied before Windows boots, adjustable in
AMD Software: Adrenalin (Performance → Tuning → System → Variable Graphics Memory) or in BIOS.
It does **not** change total installed memory and does not create bandwidth.

**Q15 — Is ~96 GB a real GPU-memory ceiling?**
**No — it is three different things being conflated.**
- 96 GB is the **maximum VGM carve-out** AMD exposes on a 128 GB part. That is a real product
  limit on the *carve-out*.
- It is **not** the GPU's addressable ceiling. On this machine, with VGM at only 64 GB, OpenCL
  already reports **99.84 GiB** of global memory and `dxdiag` reports **111.6 GiB** total.
- The ceiling that actually bites first is the **54.40 GiB maximum single allocation**.

**Q16 — Can workloads use more than the configured VGM amount?**
**Yes, and this machine proves it.** VGM is 64 GB; OpenCL global memory is 99.84 GiB. The
surplus is the shared/GTT-equivalent mapping over system RAM. The caveat is that memory beyond
the carve-out is reached over the same physical bus but through WDDM's shared path, and is
subject to eviction under desktop memory pressure — so it is *available* rather than
*equivalent*.

**Q17 — What VGM setting should this machine use?**
**Leave it at 64 GB.** Reasoning, from this machine's own measurements:
- The resident 27B model uses **26.73 GB** of GPU-local memory total (§8.4) — well inside 64 GB.
- Raising VGM to 96 GB would drop Windows to ~32 GB visible. This box runs a browser, an IDE,
  Node processes and the harness itself; 32 GB is a real constraint, and DSH's own worker
  threads and Chromium-based UI are not free.
- Nothing measured here is currently limited by the carve-out.
- Raise it to 96 GB **only** for a specific experiment that needs a >55 GB resident model, and
  put it back afterwards. See §22 for the decision rule.

**Q18 — How much should remain for Windows and DSH?**
On this machine the current split leaves 63.79 GB to Windows, of which **25.51 GB was free**
with the model resident and the stack running. That is comfortable. Treat **32 GB visible to
Windows as the floor** — which is exactly what a 96 GB VGM setting would leave, i.e. the
aggressive setting has no headroom margin at all.

## 8.4 Measured memory behaviour with a real model

With `qwen/qwen3.8-27b` (UD-Q5_K_XL, 21.15 GB on disk) resident at **131,072 context**:

| Reading | Value |
|---|---|
| LM Studio process GPU-local memory | **26.73 GB** |
| All processes GPU-local | 28.89 GB |
| GPU **non-local (shared)** usage | **0 GB** |
| System RAM free | 25.51 GB of 63.79 GB |

Two conclusions:

1. **Weights 21.15 GB + ~5.6 GB of KV cache and compute buffers at 131 K context.** That KV
   figure is far smaller than a conventional 27B dense transformer would need.
2. **Nothing spilled to shared memory.** With VGM at 64 GB and a 27 GB workload, the shared
   path is not being exercised at all — which is why raising VGM would change nothing today.

The small KV figure is explained by the architecture, not by luck. Qwen3.8-27B is a **hybrid**:

> "16 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention → FFN))" — Qwen3.8-27B model card

Of 64 layers, only **16** carry full attention; the other 48 are Gated DeltaNet, whose state is
constant-size rather than growing with sequence length. A standard 27B dense model with 64
full-attention layers at 131 K context would need roughly six times the KV cache. **This model
is unusually well suited to long-context agent work on a memory-bandwidth-limited part**, and
that is an architectural property, not a quantization trick.

> **Caveat, stated honestly:** llama.cpp normally preallocates KV at load, but the benchmark
> runs in §10 reached ~11 K tokens, not 131 K. The 5.6 GB figure is therefore
> *allocated*, and confirmed not to grow into shared memory under the load tested. A dedicated
> fill-the-window test is listed in §20 as an outstanding acceptance test.

---

# 9. Native Windows ROCm — the exact current state

## 9.1 What is documented

| Fact | Value | Source |
|---|---|---|
| Current ROCm | **7.14.0**, released **2026-07-16** | AMD compatibility matrix |
| Operating systems | Linux **and Windows** | same |
| `gfx1151` listed | **Yes** | same |
| Windows version listed for Ryzen AI Max | **Windows 11 25H2** | same |
| Component versions named | hipBLASLt 1.4.1, MIOpen 3.5.2, RCCL 2.30.4 | same |
| HIP SDK for Windows | 7.2.0 documented; RDNA3.5 (`gfx1150`, `gfx1151`) **Supported** | AMD Windows install docs |
| AMD ROCm Debugger on RDNA3.5 | **Not supported** | same |

**This box runs Windows 11 25H2, build 26200.** It is the exact configuration AMD lists.

"Supported" is defined by AMD as: *"Official software distributions of the current HIP SDK
release fully support this hardware."*

## 9.2 What is installed here — nothing

| Check | Result |
|---|---|
| `C:\Program Files\AMD\ROCm` | **absent** |
| `C:\Program Files\AMD\HIP SDK` | **absent** |
| `HIP_PATH` environment variable | **unset** |
| `rocminfo` on PATH | **absent** |
| LM Studio ROCm runtime | **was not installed** (see §16.3) |

The machine has been running Vulkan the whole time.

## 9.3 Component status for gfx1151 on native Windows

Classified per the directive's scheme. Where AMD's matrix does not state a component's Windows
status, this report says so rather than guessing.

| Component | Native-Windows status for gfx1151 |
|---|---|
| HIP runtime | **SUPPORTED PRODUCTION** — AMD lists gfx1151 on Windows 11 25H2 |
| HIP SDK | **SUPPORTED PRODUCTION** |
| llama.cpp ROCm/HIP backend | **SUPPORTED PRODUCTION** — shipped as an LM Studio runtime, v2.29.1, measured in §10 |
| **PyTorch** | **SUPPORTED PRODUCTION** — AMD publishes a `device-gfx1151` wheel for Windows. See §9.4 |
| hipBLASLt / MIOpen / RCCL | versions published in the matrix; **per-OS status for gfx1151 not separately stated → UNKNOWN** |
| ROCm Debugger | **UNSUPPORTED** on RDNA3.5 (explicit ❌) |
| vLLM on native Windows for gfx1151 | **UNKNOWN** — community reports place vLLM work on Linux |
| SGLang, MIGraphX, TensorFlow, JAX, ONNX | **NOT AVAILABLE on native Windows** — AMD's Radeon-and-Ryzen matrix lists **PyTorch only** for Windows; the wider framework set is Radeon-on-Linux |
| Training | **UNKNOWN** — PyTorch being present does not establish that training paths are supported on this APU |
| Flash Attention (rocWMMA) | present in llama.cpp ROCm builds **[community]**; not verified here as a separate library |

## 9.4 PyTorch on native Windows — a corrected finding

> **An earlier version of this report recorded PyTorch on native Windows for gfx1151 as
> UNKNOWN. That was wrong. AMD publishes it, and the correction is recorded here rather than
> silently patched.**

AMD's framework install documentation gives the command directly:

```bash
python -m pip install --index-url https://repo.amd.com/rocm/whl-multi-arch/ \
    "torch[device-gfx1151]==2.12.0+rocm7.14.0" \
    "torchvision[device-gfx1151]==0.27.0+rocm7.14.0" \
    "torchaudio==2.11.0+rocm7.14.0"
```

| Fact | Value |
|---|---|
| Wheel extra | **`device-gfx1151`** — the target is named explicitly |
| ROCm version | **7.14.0** — the same release §9.1 already identified as current |
| PyTorch version | **2.12.0** (Windows options are shown for 2.12.0; 2.11.0/2.10.0 are not) |
| Windows gfx targets listed | gfx1030, gfx1100–1103, **gfx1150, gfx1151, gfx1152, gfx1153**, gfx1200, gfx1201 |
| Alternative documented path | ROCm **7.2.1**, `torch 2.9.1+rocm7.2.1`, from `repo.radeon.com/rocm/windows/rocm-rel-7.2.1/`, requiring the **26.2.2** graphics driver |
| AMD product-doc framing | "Ryzen APUs (AI Max 300 Series, select AI 400 Series & select AI 300 Series)"; the Windows column lists **PyTorch only** |

**Why this report got it wrong.** The ROCm *compatibility matrix* and the HIP SDK *Windows
system-requirements* page — the two sources originally consulted — carry no PyTorch row for
Windows/gfx1151. That silence was recorded as UNKNOWN instead of being chased into AMD's
Radeon-and-Ryzen product documentation and framework install pages, where it is published.
**"Not stated in the source I consulted" is not the same as "not established", and this report
conflated them.** It is the same error pattern as §6.5: concluding from one surface's silence.

In partial mitigation, the ambiguity is real and acknowledged upstream — ROCm issue **#5339,
"Confusing rocm support for gfx1151"**, is open and marked *Under Investigation*, raised by a
user who found ROCm 7 announcements claiming Ryzen AI Max support while the compatibility
matrix showed no gfx1151 entry. That explains the confusion; it does not excuse the conclusion.

**What this changes for the build.** Not the recommended stack — §19 serves models through
LM Studio and does not need PyTorch. What it changes is the **ceiling**: fine-tuning,
quantization work, custom kernels, and any PyTorch-based evaluation harness are now available
*natively on Windows on this machine*, without WSL and without converting to Linux. That moves
PyTorch out of "WATCH" (§22) and removes the main reason someone would have argued for a Linux
lane on this box.

**Verify before relying on it.** This is documentation-verified, **not installed or run on this
machine**. Added as test **T-11** in §20: install the `device-gfx1151` wheel into a throwaway
virtualenv, confirm `torch.cuda.is_available()` and a matmul on the 8060S, and record the driver
version it demands against the installed 32.0.31035.1003 / Adrenalin 26.7.1.

**Q12 — What portions of ROCm actually work natively on Windows today?**
The HIP runtime and HIP SDK for gfx1151, llama.cpp built against them, **and PyTorch 2.12.0 via
AMD's `device-gfx1151` wheels**.

**Q13 — What is still Linux-only or unestablished?**
The debugger is explicitly unsupported on RDNA3.5. **TensorFlow, JAX and ONNX are Windows-absent
for this part** — AMD's own matrix lists PyTorch as the only Windows framework for Ryzen APUs.
vLLM and SGLang on native Windows for gfx1151 remain **UNKNOWN**, and training support is
**UNKNOWN** even though PyTorch itself is present.

> **Discipline note.** "ROCm supports Strix Halo" is true *for the HIP runtime and SDK, on
> Windows 11 25H2, for gfx1151*. It is not a statement about PyTorch or vLLM on Windows, and
> the two are routinely conflated in secondary sources.
