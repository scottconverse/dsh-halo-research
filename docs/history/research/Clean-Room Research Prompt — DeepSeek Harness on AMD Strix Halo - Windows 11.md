> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Deep Research Assignment: Design the Best DeepSeek Harness Environment Possible for a 128 GB AMD Strix Halo Windows 11 AI Workstation

## Mission

Conduct a **clean-room, current, evidence-driven technical investigation** into what can be built **today** around DeepSeek Harness (`dsh`) on a **native Windows 11 AMD Strix Halo machine with 128 GB unified memory and 2 TB storage**.

Do not begin with a preconceived architecture.

Do not assume a particular inference server, model format, AMD runtime, memory configuration, routing layer, or deployment architecture is correct.

Research the hardware, Windows software stack, DeepSeek Harness, available local models, AMD-supported runtimes, community-developed runtimes, and real-world Strix Halo experience first.

Then derive the architecture from the evidence.

The end goal is not merely to install DeepSeek Harness.

The goal is to design an initial production-quality specification for a **Windows-native local AI development workstation** in which:

- DeepSeek Harness is the primary agent harness.
- A range of local models can be used.
- DeepSeek Harness can use as much of its first-party plugin ecosystem as realistically possible.
- Different local models can be selected according to task, capability, context requirement, memory requirement, latency and quality.
- The AMD Ryzen AI Max+ / Strix Halo hardware is exploited as fully as the current Windows software stack permits.
- The machine's 128 GB physically unified memory is treated according to how the hardware actually works rather than as if this were an ordinary discrete-GPU PC.
- Vulkan, ROCm/HIP, llama.cpp, AMD-specific inference technologies, NPU paths and other credible options are compared empirically.
- Native Windows is the target operating environment.
- Linux and WSL results are studied when useful, but are never silently substituted for native-Windows evidence.
- The design has an upgrade path as AMD's Windows compute software improves.

This is a **research and architecture assignment first**.

Do not begin installing or building the final environment until the research and initial specification are complete.

---

# Clean-Room Requirement

Treat this as a new project.

Do not search for, inspect, rely upon, inherit from, compare against, or attempt to repair any previous user-created implementation of this concept.

Do not use prior architecture, source code, benchmark conclusions, implementation decisions, model selections or configuration files as evidence for the new design.

Derive every important decision independently from:

1. current upstream source code;
2. official documentation;
3. current release notes;
4. maintainers' discussions/issues;
5. reproducible benchmarks;
6. independent real-world testing;
7. your own technical analysis.

The purpose of this rule is to prevent previous assumptions from contaminating the new architecture.

Start from first principles.

---

# Target Machine

Assume the target is the AMD Ryzen AI Halo Developer Platform or essentially equivalent hardware:

- Windows 11 Pro
- AMD Ryzen AI Max+ 395 / Strix Halo
- Radeon 8060S-class integrated RDNA 3.5 GPU
- `gfx1151`
- 40 GPU compute units
- XDNA 2 NPU
- 16 Zen 5 CPU cores / 32 threads
- 128 GB LPDDR5X-8000 physically unified memory
- approximately 256 GB/s memory bandwidth
- 2 TB NVMe storage
- configurable AMD Variable Graphics Memory under Windows
- approximately 120 W-class platform power envelope

Verify all relevant specifications against current AMD documentation.

Do not assume this list is complete or current.

The implementation target is:

**NATIVE WINDOWS 11.**

Do not solve the assignment by recommending conversion of the machine to Ubuntu.

Do not make WSL the primary execution environment.

WSL and Linux should nevertheless be researched where necessary to:

- understand the hardware's performance ceiling;
- identify features Windows lacks;
- understand ROCm differences;
- compare inference runtimes;
- identify functionality likely to reach Windows later.

The resulting system specification must remain native-Windows-first.

---

# Research Date and Version Discipline

This ecosystem is changing extremely quickly.

At the beginning of the report, record:

- research date;
- Windows current production build;
- relevant Windows preview/Insider builds;
- current AMD driver;
- current production ROCm release;
- current ROCm preview/nightly releases;
- current DSH release;
- current DSH master commit;
- current llama.cpp commit/release;
- current Lemonade release;
- current LM Studio release;
- current important model releases.

Treat information more than a few months old as potentially obsolete.

For every material technical claim determine, where possible:

1. software version;
2. publication/commit date;
3. operating system;
4. native Windows vs WSL vs Linux;
5. exact hardware;
6. inference backend;
7. model;
8. quantization;
9. context length;
10. official vs experimental vs community-supported status.

Never turn a Linux result into a Windows recommendation without proving applicability.

Never turn a WSL result into a native-Windows result.

Never say "ROCm supports X" without identifying:

- ROCm version;
- ROCm component;
- operating system;
- supported hardware.

---

# Phase 1 — Freeze the Current DeepSeek Harness Baseline

Start with:

https://github.com/deepseek-ai/deepseek-harness

Read the actual repository.

Determine the current:

- default branch;
- latest commit;
- current release/prerelease;
- npm package version;
- Node requirement;
- package manager requirements;
- Windows installation path;
- Web UI architecture;
- CLI architecture;
- Windows-native shell implementation;
- Windows sandbox implementation;
- provider architecture;
- custom-provider architecture;
- OpenAI-compatible API support;
- model configuration;
- model capability declaration;
- plugin architecture;
- plugin discovery/loading;
- tool execution;
- agent modes;
- Code Mode;
- Skills;
- MCP support;
- subagents/delegation;
- session management;
- persistence;
- context management;
- context compaction;
- multimodal support;
- reasoning controls;
- permissions;
- filesystem handling;
- Windows path handling;
- process execution;
- sandbox limitations;
- known Windows issues.

Read source code where documentation is insufficient.

Read:

- README
- architecture docs
- developer docs
- user guide
- provider docs
- Windows-specific code
- package manifests
- release notes
- important recent commits
- important open issues
- GitHub Discussions.

Pin the exact DSH commit used for the investigation.

---

# Phase 2 — Determine What the DSH Plugin Ecosystem Actually Contains

Do not repeat marketing-style counts.

Establish the actual current repository structure.

Determine:

- total packages;
- total plugins;
- actual runtime plugins;
- infrastructure libraries;
- internal framework packages;
- examples;
- tests;
- optional integrations;
- provider plugins;
- UI plugins;
- platform-specific components.

If someone claims DSH contains "200+" plugins, prove exactly what that number means.

Establish:

- what counts as a plugin;
- what ships in normal DSH;
- what is first-party;
- what users can directly exercise;
- what is primarily implementation infrastructure.

Group meaningful capability into categories such as:

- filesystem;
- code editing;
- shell/process execution;
- Git;
- GitHub;
- web;
- search;
- browser;
- documents;
- images/multimodal;
- memory;
- context;
- MCP;
- Skills;
- subagents;
- delegation;
- planning;
- Code Mode;
- data/storage;
- providers/models;
- session/replay/trajectory;
- sandbox/security;
- developer tooling;
- user interface;
- external integrations.

---

# Phase 3 — Windows Compatibility Audit of DSH

Produce a Windows compatibility matrix.

For each significant capability/plugin determine whether it is:

**CONFIRMED NATIVE WINDOWS**

**EXPECTED NATIVE WINDOWS BUT UNVERIFIED**

**REQUIRES CONFIGURATION**

**FUNCTIONALLY DEGRADED ON WINDOWS**

**DEPENDENT ON EXTERNAL SOFTWARE**

**WSL/LINUX ONLY**

**CURRENTLY BROKEN**

**UNKNOWN — MUST TEST**

Investigate dependencies on:

- PowerShell;
- cmd.exe;
- Bash;
- POSIX utilities;
- Python;
- Node;
- Git;
- Docker;
- browsers;
- external executables;
- Unix filesystem semantics;
- symlinks;
- permissions;
- Windows ACLs;
- restricted tokens;
- localhost networking.

Determine how much of meaningful DSH functionality can actually be exercised on native Windows.

---

# Phase 4 — Find Actual DSH + AMD Strix Halo Experience

This is a very high-priority research area.

Search specifically for evidence involving:

- DeepSeek Harness + Strix Halo;
- DSH + Ryzen AI Max+ 395;
- DSH + Radeon 8060S;
- DSH + AMD Halo;
- DSH + 128 GB unified memory;
- DSH + LM Studio;
- DSH + Lemonade;
- DSH + llama.cpp;
- DSH + Vulkan;
- DSH + ROCm;
- DSH + local Qwen;
- DSH + Qwen3.8;
- DSH + native Windows;
- DSH + local OpenAI-compatible inference.

Search:

- DSH GitHub Discussions;
- DSH issues;
- DSH pull requests;
- DSH commits;
- DSH forks;
- `dsh-plugin` repositories;
- AMD repositories;
- ROCm repositories;
- TheRock;
- llama.cpp issues/PRs/discussions;
- Lemonade repositories;
- LM Studio community material;
- AMD developer forums;
- AMD Community;
- Framework forums;
- Reddit;
- Hacker News;
- Hugging Face discussions;
- technical blogs;
- benchmark repositories;
- YouTube videos and transcripts;
- other publicly reachable developer communities.

Relevant Reddit communities include, but are not limited to:

- r/StrixHalo
- r/LocalLLaMA
- r/AMD
- r/ROCm
- r/Qwen_AI

Search beyond these.

For every useful firsthand report capture:

- date;
- exact hardware;
- RAM;
- OS;
- Windows build;
- AMD driver;
- runtime;
- runtime version/commit;
- inference backend;
- model;
- model format;
- quantization;
- context size;
- memory configuration;
- prompt-processing speed;
- decode speed;
- TTFT where available;
- stability observations;
- tool-use observations.

Separate evidence into:

### A. Directly demonstrated DSH + Strix Halo

Someone actually ran DSH on this hardware.

### B. Demonstrated Strix Halo local inference applicable to DSH

The runtime/model combination works on Strix Halo and exposes an interface DSH should be capable of using.

### C. Architectural hypothesis

No one has demonstrated the complete combination yet, but evidence indicates it should work.

Never blur these categories.

If direct DSH + Strix Halo usage is sparse, explicitly say so.

Do not manufacture consensus where none exists.

---

# Phase 5 — Deep Investigation of AMD Strix Halo

Read AMD's first-party documentation extensively.

Include:

- Ryzen AI Max documentation;
- Ryzen AI Halo Developer Platform documentation;
- Ryzen AI Halo user guides;
- AMD AI Playbooks;
- ROCm documentation;
- Windows ROCm compatibility matrices;
- ROCm release notes;
- HIP SDK Windows documentation;
- TheRock;
- Radeon driver release notes;
- AMD Software: Adrenalin documentation;
- AMD developer blogs;
- Strix Halo optimization documentation;
- WSL ROCm documentation;
- AMD GitHub repositories;
- AMD GitHub issues;
- AMD developer/community forums.

Understand the hardware before recommending software.

---

# Phase 6 — Explain the 128 GB Memory Architecture Correctly

Give special attention to memory.

Explain clearly:

- physically unified LPDDR5X;
- CPU access;
- GPU access;
- GPU virtual memory;
- GPUVM;
- GART;
- GTT;
- firmware carve-outs;
- "dedicated GPU memory";
- "shared GPU memory";
- Variable Graphics Memory;
- Windows Task Manager reporting;
- WDDM allocation;
- dynamically available memory;
- why "VRAM" terminology is misleading on this architecture.

Determine what AMD's Variable Graphics Memory configuration actually changes.

Investigate available settings, including the maximum practical setting on a 128 GB machine.

Determine:

- whether maximum VGM should be used;
- what memory remains available to Windows;
- what remains available to DSH;
- what happens under memory pressure;
- whether inference workloads can use memory outside the configured VGM pool;
- how Vulkan allocations behave;
- how HIP/ROCm allocations behave;
- how llama.cpp behaves;
- how LM Studio behaves;
- how Lemonade behaves.

Explicitly answer:

**Is "96 GB VRAM on a 128 GB Halo" a true hard model-memory ceiling, a firmware reservation, a Windows accounting mechanism, or some combination of these?**

Use technical evidence.

---

# Phase 7 — Native Windows ROCm: Establish the Exact Current State

This section must be extremely precise.

Research:

- current stable ROCm;
- current Windows ROCm;
- HIP SDK;
- ROCm Core SDK;
- TheRock;
- preview/nightly releases;
- unreleased development work visible in public repositories.

Investigate all relevant 7.x development, including versions newer than current stable if public evidence exists.

For every relevant component establish native-Windows status for Strix Halo / `gfx1151`:

- HIP runtime;
- PyTorch;
- llama.cpp;
- rocBLAS;
- hipBLAS;
- hipBLASLt;
- MIOpen;
- RCCL;
- MIGraphX;
- Flash Attention;
- vLLM;
- SGLang;
- Transformers;
- training;
- inference;
- quantized inference;
- multi-GPU.

Classify each as:

**SUPPORTED PRODUCTION**

**SUPPORTED PREVIEW**

**TECHNOLOGY PREVIEW**

**NIGHTLY/DEVELOPMENT**

**COMMUNITY BUILD**

**UNSUPPORTED**

**NOT AVAILABLE**

Do not confuse "ROCm for Windows exists" with "the complete Linux ROCm software stack exists on Windows."

Identify the exact gaps.

Read source, issues, PRs and release notes.

---

# Phase 8 — Vulkan Versus ROCm Versus Other Inference Paths

Do not assume ROCm is automatically superior because the hardware is AMD.

Compare actual Windows Strix Halo evidence for:

- Vulkan llama.cpp;
- HIP/ROCm llama.cpp;
- ROCmFPX or successor work;
- AMD-optimized llama.cpp branches/builds;
- Lemonade;
- LM Studio;
- llama-server;
- ONNX Runtime;
- DirectML;
- Ryzen AI software;
- XDNA/NPU execution;
- other credible Windows-native runtimes.

Capture where available:

- model;
- quantization;
- context;
- prompt processing tokens/sec;
- decode tokens/sec;
- TTFT;
- model load time;
- memory consumption;
- GPU utilization;
- CPU utilization;
- power consumption;
- stability.

For agent workloads, emphasize:

- prompt processing;
- long context;
- tool output ingestion;
- model reload time;
- reliability;
- JSON generation;
- tool-call adherence.

Do not optimize the entire architecture around decode tokens/sec alone.

---

# Phase 9 — Qwen3.8 Deep Dive

Give Qwen3.8 special attention.

First establish the actual current Qwen3.8 family.

Do not invent nonexistent variants.

Use official Qwen sources and model cards.

For each relevant Qwen3.8 model establish:

- release date;
- parameter count;
- architecture;
- dense vs MoE;
- active parameters;
- modality;
- native context;
- extended context;
- reasoning/thinking behavior;
- tool calling;
- structured output;
- coding capability;
- agentic benchmark results;
- memory requirements;
- available quantizations;
- GGUF availability;
- AMD-specific optimized formats;
- MTP/speculative decoding support.

For this 128 GB machine investigate useful configurations including:

- BF16/FP16 where realistic;
- Q8;
- Q6;
- Q5;
- Q4_K_M;
- IQ formats if relevant;
- FP8;
- FP6;
- FP4;
- other hardware-specific formats;
- KV-cache quantization;
- Flash Attention;
- MTP/speculative decoding.

Calculate real memory requirements.

Do not merely ask whether a model "fits."

Ask whether it fits while leaving enough memory for:

- Windows;
- DSH;
- inference server;
- KV cache;
- context;
- multimodal projector;
- working files;
- other agent processes.

Determine sensible configurations for:

- 32K;
- 64K;
- 128K;
- 256K context where supported.

---

# Phase 10 — Evaluate Qwen3.8 Specifically as a DSH Agent

A model that benchmarks well as a chatbot may still be a poor harness model.

Investigate evidence for Qwen3.8 driving:

- DSH;
- other serious coding harnesses;
- tool-use frameworks;
- local agent environments.

Evaluate:

- PowerShell generation;
- tool-call correctness;
- JSON/schema adherence;
- plugin selection;
- code editing;
- multi-file work;
- repository navigation;
- long tool loops;
- error recovery;
- large tool outputs;
- context retention;
- compaction;
- subagent delegation;
- Code Mode;
- reasoning-mode interactions.

Look specifically for failures involving:

- truncated tool output;
- maximum output limits;
- context accounting;
- compaction;
- malformed calls;
- repeated loops;
- hallucinated tools.

---

# Phase 11 — Determine the Best Additional Local Model Portfolio

Do not turn the workstation into a random collection of model files.

Build a rational portfolio.

Potential roles include:

- primary software-development agent;
- high-quality reasoning model;
- fast coding worker;
- code review;
- planning;
- research;
- multimodal/vision;
- embeddings;
- reranking;
- small utility model;
- speculative/draft model.

Investigate current relevant open-weight families from:

- Qwen;
- DeepSeek;
- GLM;
- MiniMax;
- Kimi;
- Mistral;
- NVIDIA;
- Google;
- other credible current model developers.

For every recommended model give:

- exact model identifier;
- role;
- architecture;
- quantization;
- approximate disk footprint;
- approximate loaded memory;
- recommended context;
- inference backend;
- expected performance;
- tool/agent suitability;
- reason it deserves space on a 2 TB workstation.

Avoid redundant models.

---

# Phase 12 — Determine the Best Local Model Serving Architecture

DeepSeek Harness should ideally be insulated from unnecessary inference-backend details.

Investigate architectures where DSH talks to one or more local API servers.

Compare at least:

- llama-server;
- LM Studio local server;
- Lemonade Server;
- Ollama;
- other serious Windows-native alternatives.

Evaluate:

- OpenAI API compatibility;
- `/v1/models`;
- Chat Completions;
- Responses API if relevant;
- streaming;
- reasoning fields;
- multimodal input;
- tool calling;
- parallel tool calling;
- structured outputs;
- JSON schema;
- context reporting;
- usage reporting;
- model hot-swapping;
- model loading/unloading;
- simultaneous models;
- localhost binding;
- authentication;
- logging;
- telemetry/privacy;
- Vulkan support;
- ROCm support;
- AMD-specific optimizations.

Do not force a single serving backend if multiple backends provide meaningful advantages.

For example:

- Vulkan may be optimal for one model;
- ROCm may be substantially better for another;
- a specialized runtime may unlock a useful quantization unavailable elsewhere.

A heterogeneous architecture is acceptable if DSH can use it cleanly.

---

# Phase 13 — Model Selection and Routing

Determine whether DSH should use:

- manual model selection;
- automatic routing;
- task-specific profiles;
- subagent-specific models;
- or a hybrid.

Investigate whether DSH itself provides enough routing capability.

If not, determine whether a thin local routing layer is justified.

Do not introduce middleware merely because middleware can be built.

Any additional component must provide measurable value.

Possible routing considerations:

- coding;
- reasoning;
- vision;
- context size;
- speed;
- model currently loaded;
- memory availability;
- tool reliability;
- task complexity;
- privacy;
- cloud fallback.

Keep the architecture understandable.

---

# Phase 14 — Windows 11 Investigation

Investigate current Windows 11 changes relevant to Strix Halo.

Read Microsoft material, not merely commentary.

Investigate:

- WDDM;
- GPU memory management;
- shared memory;
- unified-memory behavior;
- heterogeneous compute;
- DirectX;
- DirectML;
- GPU scheduling;
- WSL GPU paravirtualization;
- ROCDXG;
- recent Windows production builds;
- Release Preview;
- Beta;
- Dev;
- Canary where relevant.

Determine whether recent Windows versions materially affect:

- GPU memory allocation;
- GPU/CPU memory sharing;
- ROCm;
- Strix Halo;
- local AI workloads.

Classify findings as:

**PRODUCTION RECOMMENDATION**

**OPTIONAL EXPERIMENT**

**WATCH**

Do not recommend an Insider build solely because one subsystem sounds promising.

---

# Phase 15 — XDNA 2 NPU

Investigate the NPU separately.

Do not assume it should run the primary LLM.

Determine what the XDNA 2 NPU can realistically contribute today.

Investigate:

- Ryzen AI Software;
- ONNX;
- Windows ML;
- NPU APIs;
- supported model formats;
- memory behavior.

Potential tasks:

- embeddings;
- reranking;
- classifiers;
- OCR;
- speech;
- transcription;
- vision preprocessing;
- small helper models;
- speculative/draft inference;
- background tasks.

Determine whether using the NPU simultaneously with the GPU creates meaningful practical value.

If it does not, say so.

---

# Phase 16 — Storage Architecture

The machine has 2 TB.

Develop a storage plan.

Account for:

- Windows;
- development tools;
- DSH;
- Node package caches;
- Python environments;
- Git repositories;
- model weights;
- multiple quantizations;
- multimodal projectors;
- model caches;
- benchmark data;
- logs;
- temporary inference files;
- free-space reserve.

Avoid filling the SSD with redundant quantizations.

Recommend an initial model storage budget.

---

# Phase 17 — Benchmark Architecture

Design a repeatable benchmark suite specifically for this workstation.

It must test more than raw inference.

## Raw inference

Measure:

- model load time;
- prompt processing;
- decode;
- TTFT;
- memory;
- context scaling;
- GPU utilization;
- CPU utilization;
- stability.

Use multiple prompt sizes, for example:

- small prompt;
- ~8K;
- ~32K;
- ~64K;
- ~128K where supported.

## DSH agent performance

Create fixed repeatable tasks involving:

- repository comprehension;
- multi-file edit;
- debugging;
- test/fix loop;
- Git operation;
- PowerShell operation;
- plugin use;
- web research;
- multimodal input;
- long-running agent task;
- large tool output;
- context compaction;
- recovery after tool error.

## Reliability

Measure:

- successful task completion;
- tool-call success rate;
- malformed calls;
- hallucinated tools;
- loops;
- context failures;
- truncation;
- failed recovery;
- incorrect edits;
- permission failures.

The fastest tokens/sec result does not automatically win.

---

# Phase 18 — Research Community Benchmarks Properly

For community benchmarks record the methodology.

Do not compare numbers that measured different things as if they were equivalent.

Distinguish:

- prompt processing;
- generation;
- average generation;
- peak generation;
- warm model;
- cold model;
- short context;
- long context;
- batch size;
- flash attention;
- KV-cache type;
- speculative/MTP decoding.

If benchmark methodologies differ, say so.

Do not invent normalized comparisons unsupported by the source data.

---

# Phase 19 — Produce the Initial Build Specification

After research, produce an initial technical specification that could be handed to an implementation agent.

The specification must include:

## 1. Executive Conclusion

Answer:

**What is the best DeepSeek Harness + local-model architecture that can actually be built on this native Windows 11 Strix Halo machine today?**

Give a direct answer.

---

## 2. Architecture Diagram

Show:

DeepSeek Harness  
↓  
provider/model selection  
↓  
local API server(s)  
↓  
model runtime(s)  
↓  
Vulkan / ROCm / other execution backend  
↓  
Windows AMD driver/runtime  
↓  
Strix Halo GPU + unified memory

Show other components only where justified.

---

## 3. Exact Recommended Software Stack

Where evidence permits, specify:

- Windows version;
- AMD driver;
- firmware/BIOS considerations;
- VGM setting;
- DSH version/commit;
- Node;
- pnpm/npm;
- PowerShell;
- Python;
- ROCm/HIP components;
- Vulkan components;
- llama.cpp build;
- Lemonade;
- LM Studio;
- any specialized AMD runtime;
- supporting tools.

Explain why each component is present.

---

## 4. Local Model Portfolio

Specify the initial models to install.

For each show:

| Role | Model | Quant | Backend | Disk | RAM | Context | Expected Speed | Reason |

Use real evidence where possible.

---

## 5. DSH Configuration

Specify:

- providers;
- endpoints;
- model IDs;
- capability declarations;
- context settings;
- output-token limits;
- multimodal settings;
- reasoning settings;
- sandbox;
- permissions;
- workspaces;
- plugins;
- Skills;
- MCP;
- subagents.

Show example configurations where useful.

---

## 6. DSH Plugin Compatibility Matrix

State:

- total meaningful first-party plugins/capabilities;
- confirmed Windows-compatible count;
- likely Windows-compatible count;
- degraded count;
- unsupported count;
- unknown count.

List significant blockers.

---

## 7. Memory Plan

Give practical operating profiles.

For example:

### Daily coding

DSH + primary model + normal Windows use.

### Large-context coding

Model + large KV cache.

### Maximum-quality model

Largest sensible model/quant.

### Multimodal

Model + vision projector + context.

### Multi-model

Primary model plus smaller helper model(s).

For each show approximate memory allocation.

---

## 8. Storage Plan

Provide initial SSD allocation.

---

## 9. Benchmark and Acceptance Test Plan

Provide concrete acceptance tests.

The environment should not be considered complete merely because DSH opens and a model answers "hello."

Acceptance must include actual autonomous development work.

---

## 10. Installation Sequence

Produce a high-level order of operations.

For example:

1. baseline/record machine;
2. update firmware/Windows where justified;
3. install AMD driver;
4. configure memory;
5. establish Vulkan baseline;
6. establish ROCm baseline;
7. install DSH;
8. install serving layer;
9. install first model;
10. connect DSH;
11. validate tools;
12. validate plugins;
13. benchmark;
14. add additional models;
15. compare backends;
16. freeze known-good configuration.

Do not provide destructive steps without rollback.

---

# Phase 20 — Architecture Decision Categories

Every important recommendation must be categorized:

## BUILD NOW

Reliable and useful enough for normal operation.

## EXPERIMENTAL LANE

Worth installing/testing but not the daily default.

## WATCH

Promising technology that is not ready enough yet.

## REJECT FOR NOW

Insufficient value, compatibility or reliability.

This classification should apply to:

- runtimes;
- ROCm features;
- Vulkan;
- model servers;
- quantization formats;
- models;
- NPU uses;
- Windows preview features;
- routing layers.

---

# Phase 21 — Upgrade Path

Explain what should change as Windows AMD software matures.

Track likely future developments in:

- ROCm Windows;
- TheRock;
- PyTorch;
- llama.cpp;
- Vulkan;
- Flash Attention;
- quantization;
- Strix Halo drivers;
- Windows GPU memory management;
- DSH;
- Qwen;
- other major model families.

Identify components that should intentionally remain modular so they can be replaced later.

---

# Evidence Standard

Use citations throughout.

Prefer evidence in this order:

1. source code;
2. commits;
3. official vendor documentation;
4. release notes;
5. maintainer issues/discussions;
6. reproducible benchmark repositories;
7. detailed firsthand community testing;
8. Reddit/forum reports;
9. technical journalism;
10. unsourced secondary claims.

Reddit and forums are important for this investigation because much Strix Halo experimentation occurs there.

However, identify community evidence as community evidence.

Do not elevate anecdote to official support.

Where credible sources disagree:

- show both;
- explain the likely cause;
- do not silently choose the preferred answer.

If something cannot be established, write:

**UNKNOWN**

Do not fill evidence gaps with speculation.

---

# Required Questions

The final report must explicitly answer every question below.

1. Does current DeepSeek Harness run **well** natively on Windows 11, not merely launch?

2. What DSH capabilities are currently weaker or unavailable on Windows?

3. How many actual first-party runtime plugins/capabilities does current DSH contain?

4. How many of them work natively on Windows?

5. Can DSH reliably use local OpenAI-compatible inference servers?

6. Which local server gives DSH the best experience on Strix Halo today?

7. Is LM Studio the best choice, or merely the easiest?

8. Is Lemonade currently advantageous on this hardware?

9. Is direct llama-server preferable?

10. Does Vulkan outperform ROCm on relevant Windows llama.cpp workloads?

11. Where does ROCm outperform Vulkan?

12. What portions of ROCm actually work natively on Windows today?

13. What important ROCm components are still Linux-only?

14. What does AMD's Variable Graphics Memory setting actually do?

15. Is approximately 96 GB a real GPU-memory ceiling?

16. Can workloads practically consume more than the configured VGM amount?

17. What VGM setting should this 128 GB machine actually use?

18. How much memory should remain available to Windows and DSH?

19. Which Qwen3.8 variants exist today?

20. Which Qwen3.8 configuration is best for DSH?

21. Which quantization is the best quality/performance compromise?

22. What context length is actually useful?

23. How much memory does the KV cache require at 32K, 64K, 128K and 256K?

24. Does Flash Attention materially improve this workload?

25. Does MTP/speculative decoding materially improve this workload?

26. Are ROCmFPX or similar AMD-specialized runtimes ready for normal use?

27. What other local models should be installed?

28. What is the largest model this machine can technically run?

29. More importantly, what is the largest model it can run **usefully**?

30. What model currently makes the best primary local coding/agent model?

31. Which model should handle high-quality reasoning?

32. Which smaller model should handle fast worker/subagent tasks?

33. Should DSH dynamically route among models?

34. Can several models remain loaded simultaneously?

35. Does the XDNA 2 NPU provide a useful role?

36. Are recent Windows builds materially improving Strix Halo local AI?

37. Are any Insider features compelling enough to justify testing?

38. What is the best daily-driver configuration?

39. What should be installed only experimentally?

40. What should we wait for?

---

# Final Deliverable Structure

Produce the final work in this order:

1. Executive summary
2. What is actually possible today
3. DSH current-state analysis
4. DSH Windows analysis
5. DSH plugin/capability inventory
6. Real-world DSH + Strix Halo evidence
7. Strix Halo hardware analysis
8. Windows memory architecture
9. Current Windows ROCm state
10. Vulkan vs ROCm vs other runtimes
11. Local inference-server comparison
12. Qwen3.8 analysis
13. Other recommended models
14. NPU analysis
15. Windows 11 developments
16. Benchmark evidence
17. Recommended architecture
18. Model portfolio
19. Memory plan
20. Storage plan
21. DSH configuration
22. Plugin compatibility plan
23. Benchmark/acceptance plan
24. Installation sequence
25. Build Now / Experimental / Watch / Reject table
26. Upgrade roadmap
27. Known unknowns
28. Source appendix

---

# Most Important Principle

Do not design the system we assume should exist.

Determine what the **current hardware and software can actually do**, then design the best system around that reality.

The objective is:

**the most capable, reliable, flexible DeepSeek Harness workstation that can realistically be built today on a 128 GB AMD Strix Halo machine running native Windows 11.**

The final specification must be concrete enough that a separate implementation agent can take it and build the system without having to redo the architectural research.