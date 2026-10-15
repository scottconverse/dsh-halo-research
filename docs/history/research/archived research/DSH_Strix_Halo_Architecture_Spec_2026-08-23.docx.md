> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../README.md).

# Text extraction: DSH_Strix_Halo_Architecture_Spec_2026-08-23.docx

Extracted from the original Word document. Images, formatting and embedded objects are not included. Original binary remains local.

DeepSeek Harness + Local Models

Best Architecture for a 128 GB AMD Strix Halo

Native Windows 11 Workstation — Clean-Room Research Specification

Research date: 23 August 2026  |  Evidence-driven, no prior architecture inheritance

1. Executive Summary / Conclusion

What is the best DeepSeek Harness + local-model architecture that can actually be built on this native Windows 11 Strix Halo machine today?

A reliable, production-usable workstation is achievable today on native Windows 11 without converting to Linux or making WSL primary:

DeepSeek Harness (current 0.1.x developer preview) as the primary agent harness, driven via its Web UI / headless / Python SDK and custom OpenAI-compatible providers.

Primary local serving layer: Lemonade Server (or LM Studio local server as the easiest alternative; direct llama-server for maximum control). Both expose solid OpenAI-compatible endpoints that DSH can consume.

Inference backends prioritized as Vulkan llama.cpp (default daily driver) + HIP/ROCm llama.cpp or ROCmFPX community builds (experimental long-context / high-prefill lane). NPU path via Lemonade/FastFlowLM for small helper models.

Primary coding/agent model: Qwen3.8-27B (dense multimodal, strong tool/agent scores, practical memory footprint). High-quality reasoning / larger tasks: quantized Qwen3.8-2.4T-A95B MoE or equivalent large open-weight models when VGM + free system RAM allow. Fast workers/subagents: smaller Qwen or DeepSeek distillates.

Memory: Treat the 128 GB LPDDR5X as physically unified. Use AMD Variable Graphics Memory (VGM) at 64–96 GB dedicated depending on workload; leave 24–40+ GB for Windows + DSH + overhead. 96 GB is not a hard technical ceiling.

DSH itself runs natively and is usable for serious work, but Windows sandbox (windows-acl) has known reliability and security-edge issues; treat sandbox mode carefully.

This is a heterogeneous, modular, native-Windows-first design. It exploits the hardware’s unified memory and current mature Vulkan path while keeping ROCm/HIP and NPU as experimental lanes. It is concrete enough for an implementation agent to build and has clear upgrade paths as AMD Windows software and DSH mature.

Direct DSH + Strix Halo firsthand reports remain sparse (ecosystem is only ~10 days old as of research date). Evidence is strong for the inference runtimes + OpenAI-compatible servers that DSH is designed to talk to.

2. What Is Actually Possible Today

Native Windows 11 DSH Web UI / CLI / Python SDK launches and drives tools, sessions, plugins, custom providers, and local models via OpenAI-compatible endpoints.

Large models (70B-class Q4 and selected larger MoE) load and run usefully under Vulkan or HIP on the Radeon 8060S with proper VGM.

Long-context agent loops, tool calling, PowerShell, filesystem, Git, and multi-file editing are functional (with Windows sandbox caveats).

Simultaneous or sequential multi-model use is practical within the 128 GB envelope.

NPU can run small models / embeddings / speech in parallel with GPU work via Lemonade.

Full production-grade reliability of every first-party DSH plugin under heavy sandbox isolation on Windows is not yet proven; some degradation and known bugs exist.

3. DSH Current-State Analysis

Pinned Baseline

Developer preview. Everything-is-a-plugin architecture on Cordis. Default entry: npx @deepseek-ai/dsh web (http://127.0.0.1:3080). Source: clone + pnpm. Node requirement: ^22.19 or ≥24. Supports custom providers (OpenAI-compatible), model capability declarations, Skills, MCP, subagents, Code Mode, session persistence/compaction, multimodal (recent improvements), sandbox policies, permissions, profiles/bundles.

Current release at research date: 0.1.1-rc.2 (master commit ~b150a55, 2026-08-21). Rapid iteration with compatibility-breaking changes expected.

Windows Compatibility

Runs natively. Recent RCs added persistent PowerShell sessions in the PTY terminal and other Windows polish. Known issues (community Discussions):

windows-acl sandbox (workspace-write) can permanently fail after Temp cleanup; requires recreation of the private temp directory.

ACL inheritance / tempfile.mkdtemp writability problems.

Some PowerShell 5.1 vs 7 (pwsh) differences; restricted tokens block certain WMI/CIM queries.

Occasional large session.jsonl.zstd loading deadlocks reported.

Security notes around path handling (/tmp literal resolution on Windows).

Community desktop wrappers exist but are unofficial.

Plugin / Capability Inventory

Core monorepo packages under packages/ number ~55 (core session/agent/llm/tools/sandbox/fs/shell/terminal/subagent/skill/mcp/web/etc. + UI + support). “Everything is a plugin” means many of these are themselves plugins or bundles. Community indexes list thousands of tagged repos, but usable first-party + high-quality plugins that ship with or are directly exercised by a normal install are far fewer (stock installs report ~150+ plugins/capabilities visible).

Significant categories that work or are expected to work on native Windows: filesystem, shell/process (PowerShell emphasis), Git, code editing, web, documents, session/compaction, Skills, MCP, subagents, providers, UI. Degraded or higher-risk: heavy sandbox isolation, some POSIX-oriented assumptions, certain browser/automation paths without extra configuration.

Majority of core agent capabilities are CONFIRMED or EXPECTED NATIVE WINDOWS. Sandbox and some process isolation paths are FUNCTIONALLY DEGRADED / REQUIRES CONFIGURATION / MUST TEST. No evidence of wholesale WSL-only design. Direct DSH + Strix Halo usage reports are sparse → Architectural hypothesis for the full combination, but strong for the serving layer.

DSH can reliably use local OpenAI-compatible servers (custom provider support is first-class).

4. Strix Halo Hardware & Memory Architecture

Hardware (verified against AMD docs)

Ryzen AI Max+ 395 (Strix Halo), gfx1151, 16 Zen 5 / 32 threads, Radeon 8060S (40 CU RDNA 3.5), XDNA 2 NPU (~50 TOPS), 128 GB LPDDR5X-8000 physically unified (~256 GB/s theoretical), ~120 W platform, 2 TB NVMe. Configurable VGM under Windows via Adrenalin.

128 GB Memory Architecture — Critical Clarification

Physically unified LPDDR5X. CPU and GPU both access the same pool. “Dedicated GPU memory” via Variable Graphics Memory is a firmware/OS reservation that makes a slice appear as dedicated VRAM to Windows/WDDM and most applications. Shared/GTT/GPUVM paths still exist.

On a 128 GB machine, VGM can be set up to ~96 GB dedicated (leaving ~32 GB system). Applications can often still draw on additional shared memory beyond the VGM carve-out, but behavior is backend- and driver-dependent. 96 GB is primarily an OS accounting / reservation mechanism, not a hard silicon ceiling.

Under pressure, Windows + DSH + inference server + KV cache + working set must all fit in the remaining real physical memory.

Recommendation: start at 64–80 GB VGM for balanced daily use; raise to 96 GB only for maximum-size models when system headroom is confirmed.

5. Native Windows ROCm, Vulkan, and Local Servers

ROCm / HIP on Windows

HIP SDK 7.2.0 officially lists Ryzen AI Max+ 395 / gfx1151 as supported. This is a subset of the full Linux ROCm stack (runtime, selected libraries, tooling). Full training stacks, every library (MIOpen, RCCL, etc.), and bleeding-edge features remain stronger or exclusive on Linux. Community and AMD builds of llama.cpp with HIP exist and work on Strix Halo Windows. Specialized ROCmFPX-style forks target Windows Strix Halo for better quantized performance.

Vulkan vs ROCm/HIP (Windows Strix Halo evidence)

Vulkan (RADV / Adrenalin) is the more reliable, zero-friction daily path for most quantizations and normal context lengths. Decode often competitive or better.

ROCm/HIP frequently stronger on long-context prompt processing / prefill. Specialized forks can deliver substantial gains.

Stability and ease: Vulkan wins for daily driver. ROCm is EXPERIMENTAL LANE on Windows today for this hardware.

Local Servers for DSH

Lemonade: Strongest overall for this hardware (Vulkan + ROCm + NPU backends, OpenAI/Anthropic/Ollama compatibility, model management). Advantageous.

LM Studio: Easiest path, good local server, Vulkan/ROCm selectable. Excellent starting point; not necessarily the absolute best once tuned.

llama-server (direct): Maximum control and often best raw performance; more manual.

Heterogeneous use is fine: DSH talks to whatever OpenAI-compatible endpoint is up.

6. Qwen3.8 Analysis & Recommended Model Portfolio

Qwen3.8 Family (official)

Qwen3.8-Max / open-weights Qwen3.8-2.4T-A95B (MoE, ~2.4 T total / ~95 B active, long context, strong coding/agent/reasoning). Qwen3.8-27B (dense multimodal, 262 K native context extendable, excellent practical coding + vision + agent scores under Apache-style license). Smaller siblings and prior 3.5/3.6 lines remain relevant.

Best for DSH primary agent today: Qwen3.8-27B at Q5_K_M / Q4_K_M or high-quality IQ (or equivalent) under Vulkan, 32 K–128 K context depending on workload. Leaves substantial headroom. Larger MoE configurations for high-quality reasoning when memory allows. KV-cache quantization and Flash Attention (where available) help. MTP/speculative decoding shows material decode gains in community Strix Halo tests when supported.

Initial Model Portfolio

Role

Model

Quant (ex.)

Backend

Context

Notes

Primary agent

Qwen3.8-27B

Q5/Q4_K_M

Vulkan

32–128K

Best practical fit

High-quality

Qwen3.8-2.4T-A95B

Aggressive

Vulkan/ROCm

Moderate

When quality > speed

Fast worker

Smaller Qwen/DS

Q4/Q5

Vulkan/NPU

8–32K

Cost/speed

Multimodal

27B + projector

Matching

Vulkan

As needed

Built-in vision

Utility/embed

Small dedicated

—

NPU

—

Free the GPU

Largest technically runnable is a heavily quantized very large MoE that still fits in ~100+ GB working set; largest usefully runnable for agent work is the 27B high-quality quant or a carefully managed larger MoE at moderate context.

7. XDNA 2 NPU & Windows 11 Developments

XDNA 2 NPU is useful today for small models, embeddings, speech/Whisper, classifiers, and background helpers via Lemonade/FastFlowLM/Ryzen AI paths. It does not replace the GPU for primary LLM agent work. Concurrent GPU + NPU use has practical value for multi-model setups.

Windows 11 production 25H2 (~build 26200.9168 as of August 2026 Patch Tuesday) is the recommendation. Insider features are WATCH only; no compelling enough change currently to force a non-production build for this workload. WDDM / unified memory behavior is already usable.

8. Recommended Architecture

DeepSeek Harness (native Windows)

  → custom OpenAI-compatible provider(s) / model selection / optional light routing

    → Lemonade Server (or LM Studio / llama-server)

      → Vulkan llama.cpp (daily) + HIP/ROCm or ROCmFPX (experimental) + NPU backends

        → Adrenalin + HIP SDK

          → Strix Halo GPU + unified memory (+ NPU)

Exact Recommended Software Stack (BUILD NOW unless noted)

Windows 11 25H2 production (current Patch Tuesday).

Adrenalin 26.8.1+.

VGM: start 64–80 GB; profile and raise toward 96 GB only when needed.

Node 24 LTS, pnpm, PowerShell 7.

DSH 0.1.1-rc.2 (or current master at freeze time); pin commit.

Lemonade (primary server) + LM Studio (ease) + optional native llama-server.

HIP SDK 7.2 for ROCm lane.

Python environments as needed for SDK / tools.

Git, modern browser, etc.

9. Memory & Storage Plans

Memory Operating Profiles

Daily coding: DSH + primary 27B model + normal Windows use — comfortable under 64–80 GB VGM.

Large-context coding: raise context, monitor KV cache; may need higher VGM or lower concurrent load.

Maximum-quality model: largest sensible quant + higher VGM; drop concurrent models.

Multimodal: model + vision projector + context overhead.

Multi-model: primary + smaller helper(s), preferably NPU-resident for the helpers.

Storage Plan

Reserve ~200–400 GB for models (selective quants only), generous free space, separate areas for DSH home, caches, workspaces, benchmarks, logs. 2 TB is ample if disciplined. Avoid filling the SSD with redundant quantizations.

10. DSH Configuration & Plugin Compatibility

Custom providers pointing at localhost OpenAI endpoints; declare capabilities (tools, vision, long context, reasoning); sensible max_tokens / context; workspace + session roots on fast NVMe; sandbox mode chosen after testing (workspace-write with known workarounds or reduced isolation for daily); enable Skills/MCP/subagents as needed; PowerShell-centric shell.

Core capabilities largely usable. Significant blockers mainly around full sandbox isolation reliability. Test every critical plugin under the chosen isolation level.

11. Benchmark / Acceptance Plan & Installation Sequence

Acceptance Criteria

Raw inference (load, PP, decode, TTFT, memory, context scaling) + fixed agent tasks (repo comprehension, multi-file edit + test, PowerShell, large tool output, recovery, compaction). Success = reliable autonomous development work, not just “hello”.

High-Level Installation Sequence (non-destructive)

Baseline/record machine (drivers, VGM, Windows build, free space).

Update Windows (production) + Adrenalin; set VGM; reboot; verify.

Install Node 24, PowerShell 7, Git, Python as needed.

Establish Vulkan baseline (llama.cpp / LM Studio / Lemonade).

Optionally install HIP SDK and test ROCm lane.

Install/pin DSH; verify Web UI.

Stand up Lemonade (or LM Studio) server; load first model; confirm OpenAI endpoint.

Configure DSH custom provider; validate chat + simple tools.

Expand tools/plugins/Skills; test sandbox carefully.

Add model portfolio; measure memory and speed.

Run acceptance suite; freeze known-good config + versions.

Experimental lanes last.

12. Build Now / Experimental / Watch / Reject

Item

Category

Notes

DSH 0.1.x + custom providers

BUILD NOW

Core usable

Vulkan llama.cpp / Lemonade / LM Studio

BUILD NOW

Daily driver

Qwen3.8-27B high-quality quant

BUILD NOW

Primary

VGM 64–80 GB

BUILD NOW

Balanced

HIP SDK 7.2 + ROCm llama.cpp / ROCmFPX

EXPERIMENTAL

Long-context gains, more friction

NPU via Lemonade

EXPERIMENTAL

Useful helpers, not primary LLM

96 GB VGM max

EXPERIMENTAL

Profile first

Insider Windows builds

WATCH

Not required

Full Linux ROCm feature parity on Windows

REJECT FOR NOW

Subset only

Assuming perfect Windows sandbox isolation

REJECT FOR NOW

Test & mitigate

13. Upgrade Roadmap

Remain modular: serving layer, backends, and model files are swappable. Watch: deeper Windows ROCm / TheRock maturity, llama.cpp FlashAttention / MTP improvements for gfx1151, better VGM/WDDM accounting, DSH Windows sandbox hardening, new Qwen / DeepSeek releases, Adrenalin compute improvements. Re-evaluate ROCm as default when prefill + stability clearly dominate Vulkan for agent workloads.

14. Known Unknowns

Exact long-term reliability of every first-party DSH plugin under heavy Windows ACL sandbox.

Precise working-set numbers for every recommended quant + context + multimodal combination on this exact hardware (must measure).

Whether community ROCmFPX-style optimizations land in upstream or remain forks.

Future DSH breaking changes (preview status).

Optimal simultaneous multi-model residency limits under real agent load.

15. Selected Source Appendix

deepseek-ai/deepseek-harness (README, releases, packages/, Discussions #758 and related Windows sandbox reports, architecture docs).

AMD official Ryzen AI Max+ 395 / Halo Developer Platform pages and user manual (VGM, specs).

AMD HIP SDK for Windows 7.2.0 system requirements and release notes (gfx1151 support).

AMD Variable Graphics Memory FAQs and Adrenalin documentation.

Lemonade SDK / GitHub (backends, Strix Halo mentions).

Community Strix Halo benchmarks and ROCmFPX/Windows forks (llama.cpp issues/PRs, Reddit r/StrixHalo / r/LocalLLaMA, specialized repos).

Qwen official model cards and announcements for 3.8 family (2026-08).

Microsoft Windows 11 release information (25H2 builds).

Adrenalin 26.8.1 release notes.



This specification is derived strictly from current upstream documentation, source structure, release notes, and real-world reports as of the research date. It prioritizes what the hardware and Windows software stack can actually deliver today while remaining extensible. An implementation agent can proceed from the installation sequence and acceptance criteria without re-deriving the architecture.

Clean-room research — no prior user architecture inherited.