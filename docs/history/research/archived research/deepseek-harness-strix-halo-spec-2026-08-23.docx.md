> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../README.md).

# Text extraction: deepseek-harness-strix-halo-spec-2026-08-23.docx

Extracted from the original Word document. Images, formatting and embedded objects are not included. Original binary remains local.

Clean-room research report

DeepSeek Harness on AMD Strix Halo Windows 11

DeepSeek Harness local-agent architecture for AMD Strix Halo on native Windows 11.

Prepared: 2026-08-23 | Output: DOCX conversion of the clean-room research directive

Research date: 2026-08-23

Target: native Windows 11 Pro on AMD Ryzen AI Max+ 395 / Radeon 8060S / gfx1151 / 128 GB unified LPDDR5X-8000 / 2 TB NVMe

Clean-room note: this report used the upstream DeepSeek Harness repository, official AMD/Microsoft/Qwen/DeepSeek material, and current public community benchmark evidence. It did not inspect or rely on any prior user-created implementation.

1. Executive summary

The best architecture that can realistically be built today is

DeepSeek Harness

  -> custom provider profiles

  -> local OpenAI-compatible endpoint(s)

  -> direct llama-server and/or LM Studio for daily GGUF serving

  -> Lemonade for AMD multi-engine/NPU/ROCm experiments

  -> Vulkan first for single-user GGUF decode, ROCm/TheRock for prompt-heavy, multi-engine, MTP, and experimental lanes

  -> AMD Adrenalin / ROCm / TheRock / Windows WDDM

  -> Radeon 8060S + Strix Halo physically unified memory



The daily driver should be DSH Web or Headless using a local OpenAI-compatible server, with model profiles rather than one universal model. Direct llama-server is the most controllable serving layer and the cleanest benchmark target. LM Studio is the easiest Windows-native UI and now explicitly supports Strix Halo through its llama.cpp runtime. Lemonade is valuable but should start as an experimental lane unless the workload needs its multi-engine, NPU, or AMD-curated stack.

There is strong public evidence that Strix Halo can run large local GGUF models well. There is also source-level evidence that DSH can configure custom OpenAI-compatible providers. I did not find solid public evidence of a complete DSH + Strix Halo workstation being demonstrated end to end. That gap is important: this is a high-confidence architecture, not a proven turnkey deployment.

2. What is actually possible today

Native Windows 11 can run DSH, local web UI, PowerShell-based tools, filesystem tools, Windows ACL sandboxing, skills, subagents, MCP client support, session persistence, plan/goal/todo/workflow tools, and custom OpenAI-compatible model endpoints.

Native Windows Strix Halo can run local inference through Vulkan and ROCm-backed paths. The most mature path for normal local LLM work is llama.cpp-derived GGUF serving. The fastest path depends on workload: Vulkan often wins single-user decode, while ROCm/HIP often matters for prompt processing, MTP, memory placement, and multi-engine workloads. Lemonade exposes an OpenAI-compatible API and supports Vulkan, ROCm, NPU modes, speech, image, and other engines, but its fastest/latest release state and AMD playbook validated state are not identical.

What should not be claimed yet: that DSH itself has been battle-tested on Strix Halo; that native Windows ROCm equals Linux ROCm; that 96 GB is a hard VRAM wall; that any one runtime wins universally; or that Qwen3-8B is the right primary coding agent just because the directive mentions it.

3. DSH current-state analysis

Pinned DSH baseline

Item

Current finding





Upstream repo

deepseek-ai/deepseek-harness





Default branch

master





Commit inspected

b150a551b8d465e31e418e1b2eaf5e79bbb7d28e





Commit date

2026-08-21





npm package

@deepseek-ai/dsh





npm current version

0.1.1-rc.2





npm publish date

2026-08-21





Node requirement

`^22.19.0



>=24.0.0`

Package manager

pnpm@11.7.0 in source





Status

Developer preview; compatibility-breaking changes expected







Architecture

DSH is a Cordis-composed plugin tree. The base bundle mounts model adapters, settings, credentials, filesystem/process/sandbox tools, agent loop, persistence, compaction, subagents, skills, web search, and tool registry. The web bundle adds the browser host, API proxy, client UI plugin roster, and per-session agent presets. The headless profile runs without the web server.

Important source-level facts

Capability

Source-grounded status

Model adapters

Native DeepSeek adapter plus pi-ai multi-provider adapter

Custom providers

Supported through llm-pi-ai.providers and UI custom-provider flow

OpenAI-compatible APIs

Supported; compatibility flags are needed for non-OpenAI gateways

Windows shell

PowerShell tool enabled on Windows; bash tool disabled on Windows

Sandbox

Local sandbox uses Windows ACL restricted-token runner on Windows

Windows sandbox caveat

Windows enforcement is explicitly partial

Web UI

Local web server on loopback by default

Code Mode

Implemented as tool-presentation mode over generated SDK/runtime

Skills

Registry plus filesystem-backed skill discovery and model-facing skill tool

MCP

Client package ships, but no MCP server enabled by default

Subagents

In-process spawn/fork included; Codex/Claude Code providers are optional bundles

Web fetch

Disabled by default in base bundle; search enabled through DeepSeek search



4. DSH Windows analysis

Windows support is real, but not identical to Linux/macOS

Area

Classification

Notes

Launching Web UI

CONFIRMED NATIVE WINDOWS

Official README path, Node-based web server

PowerShell tool

CONFIRMED NATIVE WINDOWS

tool-pwsh replaces tool-bash on Windows

Bash tool

WSL/LINUX ONLY by default

Disabled on Windows in base/preset config

Filesystem read/write/edit/search

CONFIRMED NATIVE WINDOWS

Routed through local/sandbox FS providers

Sandbox

FUNCTIONALLY DEGRADED ON WINDOWS

Windows ACL restricted-token enforcement is partial

Local provider endpoints

CONFIRMED NATIVE WINDOWS

Custom provider docs support self-hosted base URLs

Web browser UI

CONFIRMED NATIVE WINDOWS

Browser app served locally

Headless mode

EXPECTED NATIVE WINDOWS

Node CLI mode, but approval behavior needs policy care

MCP client

REQUIRES CONFIGURATION

No server enabled by default; each MCP command is trusted executable code

Subagent Codex/Claude Code providers

DEPENDENT ON EXTERNAL SOFTWARE

Optional bundles plus external tools/auth

Web fetch

REQUIRES CONFIGURATION

Disabled by default, intentionally conservative

Docker/E2B workflows

DEPENDENT ON EXTERNAL SOFTWARE

Useful but not baseline Windows-native

Long-session compaction

UNKNOWN / MUST TEST

Source mounts preset compaction; public discussions show prior local endpoint failures



5. DSH plugin/capability inventory

The repo does not support a single honest “plugin count.”

Source counts from the inspected checkout

Count

Meaning

256

package manifests in the repo

48

packages containing a dsh manifest

3

first-party bundles: base, web-app, headless

40

client/UI package directories

10

shell package directories

7

filesystem package directories

11

subagent package directories

6

web package directories



Meaningful runtime capability groups

Category

Examples

Windows-native assessment

Model/provider

DeepSeek adapter, pi-ai, custom provider

Good; local endpoints need compat flags

Agent loop

sessions, steps, tool calls, error handling

Good; model-dependent reliability

Filesystem

read, write, edit, image read, search

Good

Shell/process

PowerShell, subprocess, jobs

Good on PowerShell; bash disabled

Web

web search; fetch disabled

Search usable; fetch intentionally off

Skills

skill registry, filesystem skills, tool-skill

Good

Planning/goals/todos

plan mode, goals, todo

Good

Compaction

basic compactor, tool-result pruner

Must test with local endpoints

Subagents

spawn/fork in-process; optional external providers

In-process good; external requires setup

Code Mode

TypeScript tool-presentation runtime

Must test with target model

MCP

client package

Requires trusted server config

UI

web UI modules/settings/model picker

Good

Sandbox/security

policy, approvals, Windows ACL runner

Partial enforcement on Windows



Practical count estimate for the default standard/code agent surface: roughly 15 to 25 model-facing capability families depending on preset and optional bundles, not 200+ user-exercisable plugins.

6. Real-world DSH + Strix Halo evidence

Evidence classes

Class

Finding

A. Direct DSH + Strix Halo

No solid public end-to-end evidence found

B. Strix Halo inference applicable to DSH

Strong evidence for llama.cpp, LM Studio, Ollama, Lemonade, Vulkan, and ROCm/HIP endpoints

C. Architectural hypothesis

DSH should work against those endpoints because it supports custom OpenAI-compatible providers



DSH + local endpoint evidence

GitHub Discussions include local OpenAI-compatible llama.cpp provider use, long-context failures, compaction issues, custom-provider compatibility flags, and llama.cpp multimodal model discovery gaps. These are valuable because they show actual DSH local endpoint integration, but they are not Strix Halo-specific.

Strix Halo evidence

Multiple community benchmark repositories and reports show Radeon 8060S / gfx1151 / 128 GB UMA running Qwen, DeepSeek, GPT-OSS, MiniMax, Gemma, Nemotron, and other large GGUF models through llama.cpp-derived stacks. Treat these as applicable runtime evidence, not DSH validation.

7. Strix Halo hardware analysis

Verified target facts

Component

Finding

CPU

Ryzen AI Max+ 395, 16 cores / 32 threads, Zen 5

GPU

Radeon 8060S integrated RDNA 3.5, gfx1151, 40 CU class

NPU

XDNA 2

Memory

128 GB LPDDR5X-8000 physically unified

Bandwidth

about 256 GB/s

Storage

2 TB NVMe on AMD developer platform

Platform power

about 120 W class

OS

Windows 11 or Linux configurations available



The defining constraint is memory bandwidth, not just capacity. MoE models with low active parameters can be dramatically faster than dense models with similar disk size because each decode step reads less active weight data.

8. Windows memory architecture

The machine has physically unified LPDDR5X. CPU, GPU, and NPU share the same physical pool; the software stack presents that pool through Windows graphics memory categories and AMD VGM controls.

AMD’s RDNA3.5 optimization docs state that gfx1150/gfx1151/gfx1152 APUs use GPU Virtual Memory rather than a separate discrete VRAM pool. GART/GTT describe mapping limits, not separate physical memory types. On Linux, AMD recommends small firmware VRAM reservations and larger GTT-backed allocations for flexible AI workloads.

Windows differs because many applications still allocate against WDDM “dedicated GPU memory.” AMD’s VGM setting changes how much system RAM is reserved and reported as dedicated GPU memory. It is not a separate faster VRAM chip, but it is operationally important because many inference apps decide whether a model fits from the dedicated-memory bucket.

Required memory answers

Question

Answer

Is 96 GB a true hard model-memory ceiling?

No. It is primarily a firmware/Windows accounting reservation, plus practical WDDM/app allocation behavior.

Can workloads consume more than configured VGM?

Sometimes yes, via shared graphics memory, but support and performance depend on runtime/driver behavior. Do not plan production reliability around exceeding VGM.

What should this 128 GB machine use?

Use 96 GB VGM for large-model AI workstation profiles; keep a 64 GB VGM fallback for heavy Windows multitasking or smaller daily models.

How much remains for Windows/DSH?

At 96 GB VGM, roughly 32 GB remains for Windows, DSH, browser, tools, page cache, and background processes. This is enough but not luxurious.

Should maximum VGM always be used?

For the target “local AI workstation,” yes as the primary profile. For normal desktop work, no.



Practical guidance: keep model weights plus KV cache plus runtime overhead below about 85 to 90 GB for daily reliability when VGM is 96 GB. Treat community-reported 105 to 112 GB reachable graphics memory as a capacity experiment, not the default operating envelope.

9. Current Windows ROCm state

Current version discipline

Component

Current finding

Windows production build

Windows 11 25H2 latest GA build 26200.9168 as of 2026-08-11

Windows 24H2 latest GA build

26100.9168 as of 2026-08-11

Windows 26H1

GA for new early-2026 devices, not an in-place update path for existing 24H2/25H2 devices

AMD Adrenalin

26.8.1 WHQL released 2026-08-20

ROCm Windows versioning page

Windows joint releases listed through ROCm 7.2.0

ROCm Core SDK

7.14.0, 2026-07-15, applies to Linux and Windows, TheRock-based

llama.cpp Windows ROCm

Public discussion shows ROCm 7.14 Windows builds targeting gfx1150/gfx1151

Lemonade AMD playbook

validated Lemonade 10.5.1 with Windows and AMD Ryzen AI Halo in August 2026

LM Studio

0.4.21 latest classic app; Bionic 1.0.9 latest new line, August 2026



ROCm classification for native Windows Strix Halo

Component

Native Windows gfx1151 status

HIP runtime

SUPPORTED / EVOLVING via HIP SDK and TheRock

llama.cpp HIP

SUPPORTED PREVIEW / PRACTICAL, with version-specific breakage risk

PyTorch

SUPPORTED/PREVIEW for Ryzen APUs in ROCm-on-Radeon/Ryzen docs

rocBLAS / hipBLAS / hipBLASLt

AVAILABLE, but exact gfx1151 behavior must be tested per release

MIOpen

AVAILABLE in ROCm releases, but Windows Strix Halo workload support is not equivalent to Linux

vLLM

Linux/ROCm stronger; native Windows route not recommended

SGLang

Linux/ROCm stronger; native Windows route not recommended

TensorFlow/JAX

Do not assume native Windows Strix Halo support without a specific compatibility row

RCCL / multi-GPU

Not relevant to single Strix Halo Windows daily use

Flash Attention

Runtime/model/backend-specific; must benchmark

Training

Experimental/rough on gfx1151; not a daily Windows target



Do not confuse “ROCm exists on Windows” with “the full Linux ROCm AI stack exists on Windows.”

10. Vulkan vs ROCm vs other runtimes

Short version: Vulkan first for daily single-user GGUF decode on Windows, ROCm for experimental and prompt-heavy lanes, Lemonade when its integrated multi-engine value is wanted.

Runtime path

Build Now / Experimental

Why

Direct llama-server Vulkan

BUILD NOW

Most controllable, benchmarkable, OpenAI-compatible, strong Strix Halo evidence

LM Studio Vulkan

BUILD NOW

Easiest Windows UX, local server, Strix Halo support noted in changelog

Lemonade Server

BUILD NOW for convenience, EXPERIMENTAL for primary DSH backend

OpenAI-compatible and AMD-curated, but version/runtime behavior varies

Direct llama-server ROCm/HIP

EXPERIMENTAL LANE

Promising, especially MTP/prompt-heavy; Windows stack still moving

Ollama

BUILD NOW for casual chat, secondary for DSH

Easy, but often less controllable and sometimes slower

vLLM/SGLang on Windows

WATCH / REJECT FOR NOW

Stronger Linux story; not native Windows daily target

DirectML/ONNX Runtime

WATCH

Useful for smaller/NPU/ONNX workloads, not primary LLM agent backend

ROCmFPX/ROCmFP4 forks

EXPERIMENTAL LANE

Potentially large gains for specific models, not normal daily stack



Agent workloads should weight prompt processing, context reuse, tool-call correctness, JSON/schema reliability, and recovery behavior above raw decode tokens/sec.

11. Local inference-server comparison

Server

Strength

Weakness

Recommendation

Direct llama-server

Transparent, fast, OpenAI-compatible, best for reproducible benchmark control

Manual model/process management

Primary daily driver once tuned

LM Studio

Excellent Windows UX, model discovery, OpenAI-compatible local server, Strix Halo support

Less transparent, endpoint shim overhead, bundled runtime cadence

Best first Windows validation path

Lemonade

AMD-curated, multi-engine, OpenAI-compatible, NPU/GPU/audio/image support

Latest GitHub release and AMD-validated playbook release differ; abstraction can hide backend issues

Use for AMD-specific experiments and multimodal/NPU

Ollama

Easy service, broad ecosystem, OpenAI-compatible-ish workflows

Less flag control; Strix Halo GPU placement must be verified

Secondary convenience path

LlamaStash

Promising thin llama-server manager/proxy

Newer/smaller ecosystem

Watch or evaluate later, not first spec baseline



DSH should be insulated from backend details by configuring multiple custom providers/endpoints rather than adding a heavy router at the beginning.

12. Qwen3.8 analysis

The directive’s “Qwen3.8” is not an official family name I could establish. The credible interpretation is Qwen3-8B.

Actual Qwen3-8B family

Variant

Status

Qwen/Qwen3-8B

post-trained dense 8.2B model

Qwen/Qwen3-8B-Base

base model

Qwen/Qwen3-8B-GGUF

official GGUF with q4_K_M, q5_0, q5_K_M, q6_K, q8_0

Qwen/Qwen3-8B-AWQ

official 4-bit AWQ



Qwen3-8B facts

Field

Value

Parameters

8.2B total, 6.95B non-embedding

Layers

36

GQA

32 Q heads, 8 KV heads

Native context

32,768 tokens

Extended context

131,072 with YaRN

Tool use

Strong claimed tool-calling ability; Qwen recommends Qwen-Agent

Local support

llama.cpp, Ollama, LM Studio, SGLang, vLLM



Qwen3-8B recommendation: install it as a fast worker and harness smoke-test model, not as the primary coding agent. Use GGUF Q6_K or Q8_0 for quality-sensitive small tasks; Q4_K_M for speed and memory-light tests.

Approximate Qwen3-8B KV cache

Context

FP16 KV

Q8 KV

Q4-ish KV

32K

~4.5 GB

~2.25 GB

~1.1 GB

64K

~9 GB

~4.5 GB

~2.25 GB

128K

~18 GB

~9 GB

~4.5 GB

256K

~36 GB

~18 GB

~9 GB



The 256K row is architectural sizing math, not an official Qwen3-8B target. Qwen3-8B is validated to 131K with YaRN; for agent work, 32K to 64K is usually the useful range unless repository ingestion is intentionally benchmarked.

13. Other recommended models

Initial 2 TB model portfolio

Stacked from source table with 8 fields for readable Word layout.

Primary local coding agent

Field

Value

Role

Primary local coding agent

Model

Qwen3-Coder-Next-GGUF

Quant

Q4_K_M or IQ4/UD Q4 where available

Backend

llama-server Vulkan first

Disk

~38 to 48 GB

Loaded RAM/graphics

~45 to 65 GB with KV

Context

128K to 256K

Reason

Current coding-agent model, 80B total / 3B active, 256K native context

Speed coding/general

Field

Value

Role

Speed coding/general

Model

Qwen3-Coder 30B-A3B

Quant

UD-Q4_K_XL or Q4_K_S

Backend

llama-server Vulkan

Disk

~17 to 23 GB

Loaded RAM/graphics

~25 to 40 GB

Context

64K to 128K

Reason

Strong Strix Halo community speed evidence

Fast all-rounder

Field

Value

Role

Fast all-rounder

Model

Qwen3.6 35B-A3B

Quant

UD-Q4_K_M / Q4_K_M

Backend

LM Studio or llama-server

Disk

~20 to 25 GB

Loaded RAM/graphics

~30 to 45 GB

Context

128K to 256K

Reason

Excellent speed/capability tradeoff on Strix Halo evidence

Qwen3-8B worker

Field

Value

Role

Qwen3-8B worker

Model

Qwen3-8B-GGUF

Quant

Q6_K or Q8_0

Backend

Any GGUF server

Disk

~6 to 9 GB

Loaded RAM/graphics

~10 to 25 GB with long KV

Context

32K to 64K

Reason

Fast helper/subagent/smoke model

FIM/autocomplete

Field

Value

Role

FIM/autocomplete

Model

Qwen2.5-Coder-14B or 32B

Quant

Q4/Q5 GGUF

Backend

llama-server/LM Studio

Disk

~9 to 20 GB

Loaded RAM/graphics

~15 to 35 GB

Context

32K to 128K

Reason

FIM/code-completion role; Qwen3 coder family is less focused on FIM

Vision smoke

Field

Value

Role

Vision smoke

Model

Qwen2.5-VL 7B or current small VLM GGUF

Quant

Q4/Q5

Backend

LM Studio/Lemonade

Disk

~5 to 10 GB

Loaded RAM/graphics

~8 to 18 GB

Context

8K to 32K

Reason

Validate DSH image/modal settings

Capacity experiment

Field

Value

Role

Capacity experiment

Model

DeepSeek V4 Flash 0731 GGUF / DS4 route if available

Quant

very low-bit / specialized

Backend

experimental

Disk

90 GB+ to 180 GB+

Loaded RAM/graphics

near ceiling

Context

128K+

Reason

Important open-weight agent model, but not daily default on one 128 GB box

Embeddings/rerank

Field

Value

Role

Embeddings/rerank

Model

small BGE/Jina/Nomic embeddings, reranker

Quant

ONNX/GGUF

Backend

Lemonade/ONNX/CPU/NPU

Disk

<5 GB

Loaded RAM/graphics

low

Context

n/a

Reason

Search/RAG support without occupying the main GPU budget



Largest technically runnable model: community evidence shows 90 GB-class DeepSeek V4 Flash GGUF and 100 GB+ MoE capacity routes can load/generate on 128 GB Strix Halo. Largest useful daily model is smaller: roughly 30B to 80B total with low active parameters and Q4/UD quantization, leaving enough context and Windows headroom.

14. NPU analysis

The XDNA 2 NPU should not be the primary LLM engine. Its realistic role today is auxiliary:

Task

Recommendation

Small NPU-optimized LLMs

Experimental

Whisper/speech-to-text

Useful via Lemonade/AMD paths where supported

OCR/classification/rerank

Watch/build small prototypes

Embeddings

Possible but must beat CPU/iGPU convenience

Speculative decoding for main LLM

Watch; not proven as a daily DSH value

Primary coding agent

Reject for now



Lemonade is the cleanest way to evaluate NPU modes because it exposes them behind the same API family.

15. Windows 11 developments

Use Windows 11 25H2 GA unless the machine ships with a validated newer OEM image. Microsoft lists Windows 11 25H2 build 26200.9168 as the latest GA build on 2026-08-11. ROCm 7.14 release notes list Windows 11 25H2 support. Windows 26H1 exists, but Microsoft says it targets new early-2026 devices and is not an in-place feature update for existing 24H2/25H2 machines.

Classification

Item

Category

Windows 11 25H2 GA

PRODUCTION RECOMMENDATION

Windows 11 24H2 GA

Acceptable if OEM/driver validated

Windows 26H1

WATCH unless target hardware ships with it

Insider builds

OPTIONAL EXPERIMENT only after baseline

WSL ROCm

WATCH / comparative evidence, not primary



16. Benchmark evidence

High-signal public evidence

Evidence

What it supports

AMD RDNA3.5 docs

Unified-memory, GPUVM/GTT/GART, Linux optimization model

AMD Ryzen AI Halo guide

Target platform specs and VGM controls

ROCm release notes/versioning

Windows/Linux ROCm version mismatch and TheRock transition

LM Studio changelog

Strix Halo support through llama.cpp runtime

Lemonade playbook

Windows/Linux, OpenAI-compatible API, Vulkan/ROCm/NPU paths

Qwen official model cards

Qwen3-8B and Qwen3-Coder-Next properties

DeepSeek V4 Flash model card

agent benchmarks, 1M context, DSH minimal-mode evaluation note

Strix Halo benchmark repos

workload-dependent Vulkan/ROCm results and capacity/speed ranges



Community benchmark caveat: most Strix Halo high-performance rows are Linux or mixed backend evidence. They are essential for understanding the hardware ceiling, but Windows-native recommendations need their own acceptance tests.

17. Recommended architecture

Architecture

DSH Web / DSH Headless

  -> Provider profile: local-llama-vulkan

     -> localhost OpenAI-compatible llama-server

     -> GGUF models, Vulkan backend

  -> Provider profile: lmstudio

     -> LM Studio local server

     -> GGUF models, UI-managed

  -> Provider profile: lemonade

     -> Lemonade OpenAI-compatible endpoint

     -> Vulkan / ROCm / NPU / multimodal engines

  -> Optional provider profile: cloud-deepseek

     -> DeepSeek V4 Flash API for comparison/fallback



Do not start with a custom router. Add routing only after benchmarks show that manual provider/model selection is a real bottleneck.

18. Model portfolio

Initial install set

Priority

Model

Purpose

1

Qwen3-Coder-Next-GGUF Q4-family

Primary serious coding-agent candidate

2

Qwen3-Coder 30B-A3B or Qwen3.6 35B-A3B Q4/UD

Fast coding/all-rounder candidate

3

Qwen3-8B-GGUF Q6_K/Q8_0

Fast worker, smoke, subagent

4

Qwen2.5-Coder 14B/32B GGUF

FIM/autocomplete and code-specialized fallback

5

A small VLM GGUF

Multimodal DSH validation

6

Embedding + reranker models

RAG/search support

7

DeepSeek V4 Flash local route

Capacity experiment only



Avoid collecting every quant. Start with one balanced quant and one speed quant per primary model, then delete losers after acceptance testing.

19. Memory plan

Profiles

Stacked from source table with 5 fields for readable Word layout.

Daily coding

Field

Value

Profile

Daily coding

VGM

96 GB

Model budget

45 to 70 GB

System budget

~32 GB

Use

One primary model plus DSH/browser/dev tools

Large context

Field

Value

Profile

Large context

VGM

96 GB

Model budget

70 to 85 GB

System budget

~32 GB

Use

Long-context single model; no heavy multitasking

Maximum quality/capacity

Field

Value

Profile

Maximum quality/capacity

VGM

96 GB

Model budget

85 to 100 GB experimental

System budget

tight

Use

One large low-bit model; close apps first

Multimodal

Field

Value

Profile

Multimodal

VGM

64 or 96 GB

Model budget

40 to 75 GB

System budget

32 to 64 GB

Use

LLM plus vision/speech/image components

Multi-model

Field

Value

Profile

Multi-model

VGM

96 GB

Model budget

two smaller models totaling <75 GB

System budget

~32 GB

Use

Primary plus Qwen3-8B helper



DSH itself is not the memory hog; the inference server and model/KV are. However, agent loops create subprocesses, browser state, file reads, logs, and tool output, so leaving only a few GB for Windows is a reliability risk.

20. Storage plan

2 TB allocation

Use

Budget

Windows, drivers, restore

150 to 250 GB

Development tools and repos

250 to 400 GB

DSH home, sessions, logs

50 to 150 GB

Model weights

900 GB to 1.2 TB

Benchmarks/raw logs

100 to 200 GB

Python/Node caches

100 to 200 GB

Free reserve

250 to 400 GB



Keep model weights in a single non-cloud local directory. Track model ID, quant, source URL, checksum when available, backend, and benchmark status.

21. DSH configuration

Provider design

Provider

Endpoint

Models

local-llama-vulkan

direct llama-server local OpenAI-compatible endpoint

primary GGUF models

lmstudio

LM Studio local OpenAI-compatible endpoint

UI-managed GGUF models

lemonade

Lemonade OpenAI-compatible endpoint

AMD-curated local models

deepseek-api

official/cloud endpoint

comparison and fallback



DSH settings requirements

Setting

Recommendation

Provider ID

Stable lowercase IDs; do not rename after sessions exist

API protocol

Prefer OpenAI-compatible Chat Completions unless endpoint supports richer protocol correctly

Model context

Declare realistic context per model; do not overstate

Output tokens

Keep daily max moderate; high/max reasoning profiles can be separate

Compatibility

For non-OpenAI endpoints, set developer-role and max-token compatibility explicitly when needed

Vision

Declare input: [text, image] only for tested models

Web fetch

Leave disabled until SSRF/privacy policy is decided

MCP

Add only trusted local servers one by one

Subagents

Start with in-process spawn/fork; add external providers later

Code Mode

Benchmark separately from native tool mode



22. Plugin compatibility plan

Initial Windows compatibility counts by meaningful capability category

Category

Count

Confirmed native Windows

~12

Expected but must test

~5

Requires configuration/external software

~7

Functionally degraded

~2

WSL/Linux only

~2

Unknown/must test

~3



Significant blockers

Blocker

Impact

Windows sandbox partial enforcement

Do not treat as hard security boundary

Local endpoint compatibility flags

Incorrect roles/token fields can make models fail

Compaction/context accounting

Long DSH sessions can fail if token pressure is misestimated

Model tool-call quality

Harness success depends heavily on model formatting discipline

Web fetch disabled

Full browser/fetch research needs explicit enablement or external tool

MCP server trust

Server commands run as trusted external executables



23. Benchmark/acceptance plan

The environment is not accepted when the model says hello. Acceptance requires DSH-driven development tasks.

Raw inference benchmarks

Test

Measure

Cold load

load time, peak memory, errors

Warm chat

TTFT, decode t/s, stability

Prompt processing

512, 8K, 32K, 64K, 128K where supported

Context depth

decode speed after filled context

KV quant

q8/q4 KV quality and speed

Backend comparison

Vulkan vs ROCm vs LM Studio vs Lemonade

Concurrency

1, 2, 4 sessions if used



DSH agent acceptance

Task

Pass condition

Repo comprehension

Accurate summary with file citations

Multi-file edit

Correct patch, no unrelated changes

Debug/test loop

Runs failing test, fixes, reruns

PowerShell task

Correct Windows command generation

JSON/tool calling

No malformed tool calls over repeated tasks

Long tool output

No truncation confusion or loops

Context compaction

Long task survives past 50+ tool events

Code Mode

Completes same edit faster or at least reliably

Vision

Image attachment only if model profile declares and proves it

Recovery

Handles bad command/tool error without looping



24. Installation sequence

High-level order

Record exact machine baseline: Windows build, BIOS, AMD driver, VGM, firmware, available memory, device IDs.

Update through OEM/AMD Ryzen AI Developer Center where available; avoid Insider changes until baseline is frozen.

Set VGM profile: 96 GB for AI workstation validation, plus document a 64 GB fallback.

Install DSH prerequisites and pin DSH version/commit.

Validate DSH Web and Headless with the default/cloud provider first.

Establish LM Studio local server path and one small GGUF model.

Establish direct llama-server Vulkan path and the same model.

Add the primary coding model and benchmark Vulkan.

Add Lemonade and compare the same model through its OpenAI-compatible endpoint.

Add ROCm/TheRock lane only after Vulkan baseline is stable.

Configure DSH provider profiles for each endpoint.

Run raw inference suite.

Run DSH agent suite.

Add additional models only after the first model passes acceptance.

Freeze known-good versions, model hashes, settings, and benchmark evidence.

No destructive step is required for the initial spec. Rollback means retaining previous driver/runtime installers and keeping separate provider profiles rather than overwriting one global model path.

25. Build Now / Experimental / Watch / Reject

Item

Category

Rationale

DSH 0.1.1-rc.2 Web/Headless

BUILD NOW

Runs on Node/Windows, but preview

DSH custom local OpenAI providers

BUILD NOW

Supported and necessary

Direct llama-server Vulkan

BUILD NOW

Most transparent Strix Halo route

LM Studio

BUILD NOW

Best Windows UX validation

VGM 96 GB

BUILD NOW

Needed for large Windows models

Qwen3-Coder-Next / Qwen3.6 / Qwen3-Coder MoE

BUILD NOW

Better primary agent candidates than 8B

Qwen3-8B

BUILD NOW as worker

Good utility model, not primary

Lemonade

EXPERIMENTAL LANE / selective BUILD NOW

Valuable AMD stack; validate exact version

Direct ROCm/HIP llama-server

EXPERIMENTAL LANE

Strong potential, moving Windows stack

ROCmFPX/FP4

EXPERIMENTAL LANE

Model-specific gains; not mainstream

NPU LLM

WATCH

Useful for auxiliaries, not main coding

WSL/Linux ROCm

WATCH

Ceiling/comparison only

Insider Windows builds

REJECT FOR NOW

Not needed before baseline

vLLM/SGLang native Windows

REJECT FOR NOW

Linux route is stronger

One-size-fits-all router

REJECT FOR NOW

Manual profiles first; add only if value proven



26. Upgrade roadmap

Watch these replacement points

Component

Upgrade trigger

DSH

stable release, local-provider fixes, compaction maturity, richer model discovery

llama.cpp

gfx1151 Vulkan/ROCm fixes, MTP, DeepSeek/Qwen template fixes

ROCm/TheRock

Windows joint releases beyond 7.2, stable 7.14+ package behavior

LM Studio

newer engine packs with Strix Halo fixes

Lemonade

current stable release validated on Windows Halo, backend benchmarks

AMD driver

AI Bundle/VGM/Strix Halo fixes, avoiding known regressions

Qwen

newer coder/agent models and GGUF quants

DeepSeek V4

local 0731 runtime support, DS4/llama.cpp route maturity

Windows

production WDDM/GPU memory improvements only



Keep DSH, serving layer, model files, and benchmark harness modular so any one can be swapped without rebuilding the workstation.

27. Known unknowns

Unknown

Why it matters

DSH + Strix Halo full end-to-end stability

No direct public proof found

DSH compaction with long local llama.cpp sessions on current rc

Critical for agent loops

Best Windows-specific Vulkan vs ROCm on this exact machine

Community evidence is mixed and often Linux

Qwen3-Coder-Next quality on DSH specifically

Strong model-card evidence, but harness-specific behavior must be measured

DeepSeek V4 Flash 0731 local route quality/speed on 128 GB Windows

Capacity evidence exists, daily usefulness not proven

NPU usefulness for DSH sub-tasks

Lemonade supports NPU modes, but DSH value must be measured

Exact current AMD driver behavior with 96 GB VGM

Driver versions can regress allocation/reporting



28. Source appendix

Primary sources

DeepSeek Harness GitHub: https://github.com/deepseek-ai/deepseek-harness

DeepSeek Harness architecture docs: https://deepseek-harness.github.io/deepseek-harness/en/reference/

DeepSeek Harness provider docs: https://deepseek-harness.github.io/deepseek-harness/en/guide/providers

npm @deepseek-ai/dsh: https://www.npmjs.com/package/@deepseek-ai/dsh

AMD Ryzen AI Halo user guide: https://developer.amd.com/playbooks/user-guide/

AMD RDNA3.5 system optimization: https://rocm.docs.amd.com/en/latest/reference/system-optimization/rdna3-5.html

ROCm Core SDK 7.14 release notes: https://rocm.docs.amd.com/en/latest/about/release-notes.html

ROCm Windows release versioning: https://rocm.docs.amd.com/projects/install-on-windows/en/latest/about/release-versioning.html

AMD Adrenalin 26.8.1 release notes: https://www.amd.com/en/resources/support-articles/release-notes/RN-RAD-WIN-26-8-1.html

Microsoft Windows 11 release information: https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information

LM Studio changelog: https://lmstudio.ai/changelog/lmstudio

Lemonade GitHub: https://github.com/lemonade-sdk/lemonade

Lemonade AMD playbook: https://developer.amd.com/playbooks/lemonade-getting-started/

Qwen3 GitHub: https://github.com/QwenLM/Qwen3

Qwen3-8B model card: https://huggingface.co/Qwen/Qwen3-8B

Qwen3-Coder-Next model card: https://huggingface.co/Qwen/Qwen3-Coder-Next

Qwen3-Coder repository: https://github.com/QwenLM/Qwen3-Coder

DeepSeek V4 Flash 0731 model card: https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731

DeepSeek V4 technical report: https://arxiv.org/html/2606.19348

Community and benchmark evidence

Strix Halo guide: https://github.com/hogeheer499-commits/strix-halo-guide

Strix benchmarks: https://github.com/slb350/strix-benchmarks

Strix Halo llama.cpp performance notes: https://github.com/visorcraft/strix-halo-llm-perf

Lemonade on Strix Halo verification: https://lilting.ch/en/articles/lemonade-strix-halo-verification

Windows ROCm llama.cpp discussion: https://github.com/ggml-org/llama.cpp/discussions/27047

llama.cpp Strix Halo ROCm issue examples: https://github.com/ggml-org/llama.cpp/issues/26929

ROCm gfx1151 support discussion: https://github.com/ROCm/ROCm/issues/5339

AMDVLK gfx1151 discussion: https://github.com/GPUOpen-Drivers/AMDVLK/issues/420

Required questions: direct answers

Does DSH run well natively on Windows 11? It appears functionally Windows-native, but “well” requires target-machine acceptance testing.

Weaker Windows capabilities: bash disabled, sandbox partial, external UNIX tooling absent, some MCP/Docker paths external, compaction/local-provider behavior must be tested.

Actual first-party runtime plugins/capabilities: about 15 to 25 meaningful model-facing capability families; 48 packages carry dsh manifests; 256 package manifests total.

Native Windows working count: roughly 12 confirmed meaningful categories, with several requiring config.

Can DSH use local OpenAI-compatible servers? Yes, by custom provider.

Best local server today? Direct llama-server after tuning; LM Studio for first validation.

Is LM Studio best or easiest? Easiest, not necessarily best.

Is Lemonade advantageous? Yes for AMD multi-engine/NPU/ROCm experiments; not automatically the daily default.

Is direct llama-server preferable? Yes for benchmarkable daily inference.

Does Vulkan outperform ROCm? Often for single-user GGUF decode, but not universally.

Where does ROCm outperform Vulkan? Prompt-heavy, MTP, memory-placement, and some concurrency/backend-specific cases.

What ROCm works on Windows? HIP/ROCm Core/TheRock and llama.cpp-derived paths; PyTorch support exists/preview per AMD docs.

Linux-only gaps? Much of vLLM/SGLang/full framework maturity, training, and advanced ROCm ecosystem.

What does VGM do? Reserves/reports part of unified memory as dedicated GPU memory for Windows/apps.

Is 96 GB a real ceiling? No, but it is a practical app-allocation ceiling for many Windows paths.

Can workloads use more? Sometimes through shared graphics memory; do not rely on it for daily operation.

VGM setting? 96 GB for this AI workstation, 64 GB fallback for desktop-heavy work.

Memory left to Windows/DSH? About 32 GB at 96 GB VGM.

Which Qwen3.8 variants exist? No “Qwen3.8” family found; use Qwen3-8B variants listed above.

Best Qwen3-8B config for DSH? GGUF Q6_K/Q8_0 worker at 32K to 64K.

Best quant compromise? Q4/UD-Q4 for large MoE; Q6_K or Q8_0 for small 8B quality.

Useful context? 32K to 64K daily; 128K+ only after benchmarked.

Qwen3-8B KV cache? See table in section 12.

Flash Attention? Worth enabling/testing; benefit is backend/model specific.

MTP/spec decoding? Material for models with native MTP heads; benchmark by context depth.

ROCmFPX ready? Experimental, model-specific, not normal use.

Other models? Qwen3-Coder-Next, Qwen3-Coder/Qwen3.6 MoE, Qwen2.5-Coder, small VLM, embeddings/rerank.

Largest technical model? 90 to 100 GB+ low-bit MoE routes appear possible.

Largest useful model? 30B to 80B total, low-active-parameter MoE/Q4 family.

Best primary local coding/agent model? Qwen3-Coder-Next first candidate; Qwen3-Coder/Qwen3.6 MoE as speed alternative.

High-quality reasoning? DeepSeek V4 Flash API/local experiment, or larger Qwen Coder/Next profile after testing.

Smaller worker? Qwen3-8B-GGUF.

Dynamic routing? Not initially; use manual profiles, add thin router only if benchmarks justify it.

Several models loaded simultaneously? Yes for smaller models; large primary plus helper can work under 96 GB VGM if total memory is managed.

XDNA 2 NPU useful? Yes for auxiliary tasks; no for primary LLM.

Recent Windows builds improving AI? Production 25H2 is recommended; ROCm/driver stack matters more than Insider features.

Insider features compelling? No.

Best daily driver? DSH + direct llama-server Vulkan + Qwen3-Coder-Next/Qwen3.6 profile + 96 GB VGM.

Experimental installs? ROCm/TheRock lane, Lemonade ROCm/NPU, ROCmFPX, DeepSeek V4 local capacity.

What to wait for? Stable DSH, Windows ROCm maturity, current llama.cpp Strix Halo fixes, proven DSH+Strix Halo reports.