> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Text extraction: DeepSeek Harness on AMD Strix Halo — Research Report and Build Specification (2026-08-23) rev2.docx

Extracted from the original Word document. Images, formatting and embedded objects are not included. Original binary remains local.

DeepSeek Harness on a 128 GB AMD Strix Halo Windows 11 Workstation

A clean-room research report and initial build specification

Research date: 2026-08-23 Target machine: AMD Ryzen AI Halo Developer Platform (RAH-001), native Windows 11 Status of this document: research + specification. Nothing has been installed or reconfigured on the target machine except where explicitly recorded in §16.3.





Clean-room declaration

This investigation was conducted from first principles. No prior implementation of this concept was read, searched for, inherited from, or used as evidence. Every number in this report comes from one of:



the upstream source tree at a pinned commit,

the npm registry,

first-party vendor documentation,

a command executed on the target machine on 2026-08-23, or

a cited third-party source, labelled as such.



Where a claim is community evidence rather than vendor or source evidence, it is marked [community]. Where something could not be established, it is marked UNKNOWN rather than filled with speculation.



Revision 2 — addendum merged, 2026-08-23

[Addendum] Three parallel clean-room reports were produced against the same directive on the same day — by Codex (OpenAI), Grok (xAI) and Gemini (Antigravity) — and compared against this report on 2026-08-23. Everything worth importing was checked against upstream before it was added; anything that could not be verified is labelled as such where it appears. Additions are tagged [Addendum]. No original content was removed. Where the addendum evidence made an original statement stale, the statement was revised in place and tagged [Revised]. What was deliberately not imported, and why, is recorded in §28 Tier 5 so the decision is auditable.



[Addendum] Verified against upstream on 2026-08-23 for this revision: DeepSeek Harness Discussion #758 (Windows sandbox failure after Temp cleanup, 2026-08-14); the DeepSeek-V4-Flash-0731 model card (open weights, MIT, evaluated with DeepSeek Harness); the Qwen3-Coder-Next model card (80 B total / 3 B active, 262,144 native context, Apache 2.0, GGUFs published); the FastFlowLM repository (XDNA 2 NPU runtime, Strix Halo listed by name, OpenAI-compatible API); AMD Adrenalin 26.8.1 release notes (2026-08-20).







1. Executive summary

The best DeepSeek Harness workstation that can actually be built on this machine today is a four-layer stack in which DSH itself is left almost entirely stock.



DeepSeek Harness 0.1.1-rc.2  (web profile, 133 plugins, workspace-write sandbox)



        | dsh-llm-pi-ai, protocol "openai-completions", per-model baseURL



        v



LM Studio local server  :1234   (OpenAI-compatible, GET /models discovery)



        v



llama.cpp 2.29.1  - Vulkan runtime as the default (measured, section 10),



                    ROCm runtime installed as an experimental lane



        v



AMD Adrenalin 26.7.1 / driver 32.0.31035.1003  ->  Radeon 8060S (gfx1151)



        v



128 GB LPDDR5X-8000 unified memory, currently split 64 GB VGM / 64 GB system



The five findings that decide the architecture:



1. DSH already speaks to local OpenAI-compatible servers, out of the box, with no middleware. The stock web profile mounts @deepseek-ai/dsh-llm-pi-ai, which implements the openai-completions and openai-responses protocols, accepts a per-provider and per-model baseURL override, and discovers models by GET {baseURL}/models (packages/llm/llm-pi-ai/src/discovery.ts:39-232, provider.ts:25-187). A local-model workstation is a configuration exercise, not an engineering one.



2. The plugin count that matters is 133, not 227. The repository contains 227 packages; the dsh CLI declares 62 direct dependencies; the composed default web profile mounts 133 distinct packages. These are three different numbers and they are routinely conflated. §5 gives all three with the method for each.



3. Windows containment is already implemented, natively, and is on by default. The stock sandbox mode is workspace-write, resolved as process.env.DSH_PERMISSION_MODE ?? 'workspace-write'. On Windows the enforcement is a real restricted-token spawn with a capability-SID write allowlist, implemented in ~115 KB of Win32 FFI (packages/sandbox/sandbox-windows-acl/). There is nothing to build here, and one environment variable can silently disable all of it — see §21.3.



4. ROCm is now a legitimate native-Windows option for this exact machine — and it was measured, and it loses. ROCm 7.14.0 (released 2026-07-16) lists gfx1151 as supported on Windows 11 25H2, precisely this box's OS, and LM Studio ships llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1 — the same llama.cpp version as the Vulkan runtime, which made a genuinely controlled comparison possible. The result (§10): ROCm is 1.85–2.92× faster to first token between 1.5 K and 11 K prompt tokens, at parity by 45 K tokens (164.5 vs 165.2 tok/s), 21–106 % slower on decode, and consumes 78.39 GiB of GPU memory against Vulkan's 29.35 GiB — driving free system RAM to 1.55 GB. Vulkan is the default. Had the benchmark stopped at 64 KB, this report would have recommended the wrong backend.



5. The memory question has a precise answer, and it is not "96 GB". See §8. The short version: 96 GB is the maximum VGM carve-out AMD exposes on a 128 GB part, the current setting is 64 GB, the GPU can already address ~99.8 GiB, and the binding constraint for a single model is the 54.4 GiB maximum single allocation, not the carve-out.



The single largest risk to this build is not technical. It is that DSH's own defaults point at a cloud provider (deepseek-official / deepseek-v4-flash), so a workstation that "works" can quietly be doing none of its work locally. §21.4 specifies the check.





2. What is actually possible today

Capability

Status on this machine, today

Run DSH natively on Windows 11

Yes — verified, §4

Drive DSH from a local model with no middleware

Yes — stock plugin, §6

User-visible model switching in the DSH UI

Yes — dsh-client-ui-model-selection is mounted by default

Enforced filesystem containment on Windows

Yes — restricted-token/ACL, on by default

ROCm on native Windows for gfx1151

Yes — ROCm 7.14.0, Windows 11 25H2

A 27B dense VL model at 128K context

Yes — currently resident, 21.1 GB

Speculative decoding / MTP

Yes — already active, measured, §12.4

Use the XDNA 2 NPU for the primary LLM

No — §14

Run an NPU-resident auxiliary model (embeddings, reranker, small helper) alongside the GPU-resident primary

[Addendum] Experimental — a runtime exists (FastFlowLM), value to DSH unmeasured, §14

PyTorch/vLLM/training on native Windows for gfx1151

Not established — §9





3. Version discipline — what exactly was measured

Every version below was read from the machine or the registry on 2026-08-23.

3.1 Target machine, as found

Item

Value

How obtained

System

AMD RAH-001, board Compal "AMD Ryzen AI Halo"

Win32_ComputerSystem, Win32_BaseBoard

CPU

AMD Ryzen AI Max+ 395 w/ Radeon 8060S, 16C/32T, 3.0 GHz base

Win32_Processor

Memory

8 × 16 GB Samsung K3KLALA0EM-MGCV @ 8000 MT/s = 128 GB

Win32_PhysicalMemory

Memory visible to Windows

63.79 GB

Win32_OperatingSystem

GPU

AMD Radeon 8060S, PCI VEN_1002&DEV_1586

Win32_VideoController

Display driver

32.0.31035.1003, dated 2026-07-23

Win32_VideoController

Adrenalin / LLPC

26.7.1

vulkaninfo driverInfo

BIOS

AMD 03.03, dated 2026-06-09

Win32_BIOS

OS

Windows 11 Pro 25H2, build 26200.9168

CurrentVersion registry key

System SSD

Micron 4600 MTFDLBA2T0THJ, 1905.6 GB, 852.5 GB free

Get-PhysicalDisk, Get-Volume

Secondary

Seagate One Touch Hub 7452 GB USB HDD (D:)

Get-PhysicalDisk



Note on the OS name. The registry ProductName still reads "Windows 10 Pro". This is a known Windows 11 registry artefact; DisplayVersion 25H2 and build 26200 are authoritative.



[Addendum] Driver currency. Adrenalin 26.7.1 was one release behind when these measurements were taken: AMD Software: Adrenalin Edition 26.8.1 WHQL was released 2026-08-20. Its release notes are game-support and bug-fix items with nothing specific to VGM, compute, or Strix Halo, so the update is not urgent — but every number in §10 was taken on 26.7.1, and §26 already requires re-measuring after a driver change. Decide the driver version before the §23 baseline is frozen, not after it.

3.2 Toolchain, as found

Tool

Version

Note

Node.js

25.9.0

satisfies DSH's >=24.0.0

npm

11.12.1

not used to run DSH — see §4.4

pnpm

11.22.0

DSH declares pnpm@11.7.0

Python

3.13.5



Git

2.55.0.windows.3



PowerShell

7.6.5

DSH ships a PowerShell tool seam

Vulkan

instance 1.4.341, device API 1.4.349

AMD proprietary driver

OpenCL

driver 3679.0 (PAL,LC)



LM Studio CLI

lms present

server live on :1234

ROCm / HIP SDK

not installed

C:\Program Files\AMD\ROCm absent, HIP_PATH unset

Ollama, llama-server standalone

not installed



LM Studio app

[Addendum] version not recorded

record at baseline alongside runtime 2.29.1; the Codex report cites 0.4.21 (classic line) and a new "Bionic" 1.0.x line — unverified here

3.3 Upstream software, as published

Component

Pinned value

Source

DSH repository

github.com/deepseek-ai/deepseek-harness, default branch master

GitHub API

DSH repo created

2026-08-13T11:56:32Z

GitHub API

DSH master commit (pinned for this report)

b150a551b8d465e31e418e1b2eaf5e79bbb7d28e (2026-08-21T12:03:37Z)

GitHub API + local clone

DSH latest release

dsh-v0.1.1-rc.2, 2026-08-21T12:35:08Z, prerelease

GitHub API

DSH on npm

@deepseek-ai/dsh@0.1.1-rc.2, latest and next, published 2026-08-21

npm registry

DSH licence

MIT

package manifest

DSH engines.node

^22.19.0 || >=24.0.0

root package.json

DSH packageManager

pnpm@11.7.0

root package.json

DSH stars / forks

185,833 / 20,587

GitHub API

ROCm current

7.14.0, released 2026-07-16

AMD compatibility matrix

llama.cpp (via LM Studio runtimes)

2.29.1 for both Vulkan and ROCm

lms runtime

Lemonade

v11.7.0, published 2026-08-19, not a prerelease

GitHub releases API

Qwen3.8-27B

released 2026-08-14, Apache 2.0

see §12

AMD Adrenalin (current)

[Addendum] 26.8.1 WHQL, released 2026-08-20; this box has 26.7.1

AMD release notes RN-RAD-WIN-26-8-1



Only four DSH releases exist in total (0.1.0-rc.7, 0.1.0-rc.8, 0.1.1-rc.1, 0.1.1-rc.2), all prereleases, all published within six days. This is nine-day-old software. Every recommendation in this report should be re-checked against upstream before it is treated as durable.





4. DSH current-state analysis

Pinned to commit b150a551b8d465e31e418e1b2eaf5e79bbb7d28e, read from a local clone.

4.1 Shape of the project

Property

Value

Monorepo layout

pnpm-workspace.yaml; workspaces vendor/*, packages/*/*, native/landlock-run, apps/*, website

Package root

packages/ contains 50 category directories, each holding packages

Build

tsdown, TypeScript project references, oxlint, lefthook, vitest (7 separate vitest configs incl. e2e, web-stress, perf, snapshot)

Plugin framework

Cordis 4.x (@deepseek-ai/cordis)

Native code

native/landlock-run — a Node addon, Linux-only by name

Python

a python/ directory and pytest.ini exist at root — a Python SDK surface



The packages/*/* double glob is the single most misread thing about this repository. A flat listing of packages/ returns 50 entries, which are categories, not packages.

4.2 Entry point and profiles

dsh is a launcher over "profiles": an ordered stack of plugin-bundle patch layers with the user's own overrides applied last.



Usage: dsh [options] [command] [args...]



  --profile <name>          the profile under $DSH_HOME/profiles to boot



  --patch <path>            extra patch-list overlay applied after the profile layer



  --dump-config             print the composed profile tree and exit



  --dump-default-config     print the profile tree without its user layer or --patch overlays



Three bundles ship: base, headless, web-app. The --dump-default-config flag is the authoritative way to answer "what is actually mounted", because it deliberately excludes the user layer. Every plugin count in this report was produced with it, or by parsing the bundle patch files directly. The two methods agree.

4.3 Composition, measured three ways

Question

Answer

Method

How many packages exist in the repo?

227 (225 published, 2 private)

walked packages/*/*/package.json

How many does the dsh CLI directly depend on?

62 (59 first-party + commander, js-yaml, node-addon-require-builtin)

npm packument for @deepseek-ai/dsh@0.1.1-rc.2

How many compose into the stock web profile?

133

dsh --profile web --dump-default-config

How many compose into the stock headless profile?

78

bundle patch parse (base 76 + headless 2)



So roughly 94 of the 227 packages are not in the stock web profile at all. They are alternates (a different sandbox backend, a different search provider, a different subagent driver), test support, or infrastructure.



On "200+ plugins". The claim is defensible only as "packages published under the @deepseek-ai scope". It is not the number of things a user can exercise, and it is not the number that load. When sizing work against this platform, 133 is the number that matters for the web profile.

4.4 Node and package manager

engines.node is ^22.19.0 || >=24.0.0. This box runs Node 25.9.0 — satisfied.



The repo declares packageManager: pnpm@11.7.0; the box has pnpm 11.22.0. The README's quick-start is npx @deepseek-ai/dsh web. On this machine pnpm dlx should be preferred over npx — see §21.2, which records a reproducible npm-resolver problem. This is a machine-specific finding, not an upstream defect.





5. DSH capability inventory

The 50 categories, with package counts, from the pinned tree:



Category

n

Category

n

Category

n

client

40

fs

7

attachment

2

session

13

util

7

boot

2

subagent

11

context

6

experimental

2

shell

10

examples

6

feedback

2

core

8

test-support

6

guard

2

host

8

web

6

preset

2

compaction

4

interaction

5

settings

2

goal

4

llm

5

subprocess

2

session-query

4

code-runtime

3

acp

1

sandbox

4

credentials

3

identity

1

skill

4

e2b

3

mcp

1

storage

4

hooks

3

plan

1

typert

4

jobs

3

runtime-diagnostics

1

workflow

4

lsp

3

schedule

1

extensions

4

sdk

3

todo

1

bundle

3

spill

3

workspace

1

api

2

terminal

3





5.1 Capability map — what is genuinely there

Bold = mounted in the stock web profile.



Capability

Packages

Filesystem

fs-local, fs-sandbox, tool-fs, tool-fs-search, file-reference-local

Code editing

tool-str-replace-editor

Shell / process

tool-bash, tool-pwsh, bash-sandbox, pwsh-sandbox, bash-local, pwsh-local, tool-bash-persistent, tool-pwsh-persistent, shell-env, terminal, terminal-bash

Sandbox / security

sandbox-local, sandbox-policy, permission-presets, sandbox, sandbox-windows-acl

Providers / models

llm, llm-pi-ai, llm-deepseek, llm-retry, token-meter

Web / search

web-search-deepseek, web-search-exa, web-search-perplexity, web-fetch-http, tool-web

MCP

mcp-client — not mounted by default

Skills

skill, skill-filesystem, tool-skill, skill-badge

Subagents / delegation

tool-subagent, tool-subagent-control, subagent-claude-code, subagent-codex, subagent-acp, subagent-dsh-sdk, subagent-fork-in-process, subagent-spawn-in-process, tool-subagent-report

Planning / goals

plan-mode, goal, goal-round-driver, command-goal, tool-goal, tool-todo

Workflow / loops

tool-workflow, workflow-worker-thread, tool-ralph, workflow

Code Mode

code-runtime-worker-thread, code-runtime, code-runtime-python

Context / compaction

compaction-basic, compaction-tool-result-pruner, command-compact, agent-instructions, time-context, spill-local, spill-policy, tmux-context

Session / replay

session, session-projection, session-reference, session-log-export, session-stats, session-query-sqlite, session-title

Jobs / scheduling

jobs-local, tool-jobs, schedule

Storage

storage, storage-json, storage-domain

Host / UI

web-app, host-webserver, host-apiproxy, host-plugin-inventory, 38 client-ui-* packages

LSP

lsp ×3 — not mounted by default

Remote sandbox

e2b ×3 — not mounted by default

The notable ones

subagent-claude-code and subagent-codex exist. DSH can delegate to other harnesses as subagents. Not mounted by default.

code-runtime-python — Code Mode has a Python runtime, not just a worker thread.

session-query-sqlite is mounted: sessions are queryable, not just replayable.

tool-ralph — a dedicated loop-until-done driver.

spill-* — context spilling to keep large bodies out of the window.

token-meter — real token accounting, mounted by default.





6. DSH Windows compatibility audit

6.1 Windows is a first-class target in the source

Signal counts across packages/** at the pinned commit:



Pattern

Matches

win32

865

pwsh

555

landlock

177

bwrap / bubblewrap

148

process.platform

157

powershell

123

seatbelt

113

AppContainer / restricted token

87

icacls

23

WSL

0



Zero WSL references anywhere in packages/. DSH does not treat WSL as its Windows story.

6.2 The Windows sandbox is real

packages/sandbox/sandbox-local/src/index.ts:2-3 documents the runner chain explicitly:



"It selects the platform runner chain (Linux bwrap then Landlock; macOS Seatbelt; Windows the ACL restricted-token runner), functionally probes …"



Selection is a functional probe, not a platform guess — SelectedRunner is typed 'bwrap' | 'landlock' | 'seatbelt' | 'windows-acl'.



@deepseek-ai/dsh-sandbox-windows-acl describes itself as a "Windows ACL write-restriction sandbox backend (restricted-token spawn with capability-SID write allowlist)". It is ~115 KB across 12 files including ffi.ts (23.1 KB), win32-abi.ts (13.2 KB), token.ts (11 KB) and acl.ts (13.1 KB), calling GetNamedSecurityInfoW / SetEntriesInAclW and building EXPLICIT_ACCESS entries against a capability SID.



Verdict: CONFIRMED NATIVE WINDOWS. This is a genuine implementation, not a stub.

6.3 Permission modes

From the composed default web tree:



- id: sandbox-policy



  name: '@deepseek-ai/dsh-sandbox-policy'



  config:



    mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'



- id: permission



  name: '@deepseek-ai/dsh-permission-presets'



  # presets expose: read-only | workspace-write | danger-full-access



The stock default is workspace-write — confined. danger-full-access is an opt-out that a single environment variable can set for every session. See §21.3.

6.4 Windows compatibility matrix

Applied to the 133 packages in the stock web profile, and to significant non-default ones.



Status

Capabilities

CONFIRMED NATIVE WINDOWS

sandbox-windows-acl (Win32 FFI), pwsh-sandbox, tool-pwsh, fs-local, fs-sandbox, tool-fs, tool-str-replace-editor, host-webserver, web-app + all 38 client-ui-*, session*, storage*, llm*, token-meter, jobs-local, schedule

REQUIRES CONFIGURATION

llm-pi-ai — needs a provider block for any local server (§18); web-search-deepseek — needs a key

DEPENDENT ON EXTERNAL SOFTWARE

session-query-sqlite (SQLite binding), code-runtime-python (Python — present, 3.13.5)

CORRECTLY PLATFORM-GATED

tool-bash + bash-sandbox — present in the tree but disabled on win32 at every layer; tool-pwsh + pwsh-sandbox are the active pair. See §6.5

NOT APPLICABLE ON WINDOWS

node-addon-landlock-run, Landlock/bwrap/Seatbelt probes (correctly bypassed by the chain)

UNKNOWN — MUST TEST

lsp ×3, mcp-client, e2b ×3, subagent-claude-code, subagent-codex, tmux-context (tmux does not exist natively on Windows) [Addendum] MSYS2 / Git-Bash binaries invoked from inside the restricted-token sandbox — the Gemini report asserts pipe-handle failures; unverified, but consistent with the CIM finding in Discussion #758 (§6.6, T-16)

6.5 The bash seam — a corrected finding

This section previously reported a high-severity containment defect (D-1). That finding was wrong, and it is retracted here rather than quietly deleted.

What was claimed, and why it was wrong

An earlier pass of this report asserted that tool-bash and bash-sandbox were mounted in the stock web profile, and that because bash on this box resolved to a failing WSL alias, DSH tool calls would either fail or — if WSL were ever repaired — silently escape the Windows ACL sandbox into a Linux VM.



The error was methodological: the check matched package names in the composed plugin list and never read the disabled key on the row. Presence in the tree is not the same as being active, which is precisely the distinction §4.3 makes about plugin counts — applied to counting, and then not applied to this.

What the source actually says

packages/bundle/base/cordis.patch.yml:



- id: bash-sandbox



  name: '@deepseek-ai/dsh-bash-sandbox'



  disabled: !!js process.platform === 'win32'



- id: tool-bash



  name: '@deepseek-ai/dsh-tool-bash'



  disabled: !!js process.platform === 'win32'



- id: pwsh-sandbox



  name: '@deepseek-ai/dsh-pwsh-sandbox'



  disabled: !!js process.platform !== 'win32'



- id: tool-pwsh



  name: '@deepseek-ai/dsh-tool-pwsh'



  disabled: !!js process.platform !== 'win32'



The web-app bundle then disables the host-level tool-bash and tool-pwsh rows outright (disabled: true), because agent presets own the model-facing tool rows. And the agent presets deployed on this machine repeat the same platform gate:



# ~/.dsh/.agent-presets/halo-standard/agent.cordis.yml:44



- id: tool-bash



  name: '@deepseek-ai/dsh-tool-bash'



  disabled: !!js process.platform === 'win32'



On Windows, the agent is given tool-pwsh backed by pwsh-sandbox, and no bash tool at all. The gate holds at the base bundle, the mode bundle, and the preset.

Revised verdict

There is nothing to fix, and nothing to disable. DSH's Windows story here is more careful than the earlier draft credited: the bash seam is platform-gated at three independent layers, and the Windows-native PowerShell seam is the one that is actually wired up. This is a point in the platform's favour, not a defect.



The state of bash.exe on the host is therefore irrelevant to DSH containment. It was still a real machine fault in its own right — see §6.7.

D-2 — tmux-context cannot work natively

tmux does not exist on native Windows. The package is not in the stock web composition, so this is latent rather than live — but any profile that adds it will not function.

6.6 Missing supporting binaries

rg (ripgrep) and fd are absent from PATH. tool-fs-search is mounted; whether it shells out to ripgrep or uses a bundled implementation is UNKNOWN — MUST TEST. Installing ripgrep is cheap insurance either way (scoop install ripgrep).



[Addendum] Native binaries only, inside the sandbox. Discussion #758 (§24.3) shows the restricted token blocking WMI/CIM queries issued from the sandboxed PowerShell tool. The Gemini report makes the related, unverified claim that MSYS2/Git-Bash executables cannot create pipe handles under the same token. Treat both the same way: every executable the sandboxed tool reaches for should be a native Win32 binary — rg.exe, fd.exe, git.exe, pwsh.exe — with Git\cmd rather than Git\bin on PATH, which §6.7 already argued for a different reason. The CIM query and an MSYS-binary call are both in the sandbox test (T-16).

6.7 A real machine fault, found while chasing the retracted finding — and fixed

Independent of DSH, this box had a genuinely damaged WSL installation.



Symptom. bash on PATH failed with "The file cannot be accessed by the system."



First (wrong) reading. That the bash.exe App Execution Alias stub was a broken 0-byte reparse point. It is 0 bytes with no visible link target — but so is every working alias, including winget.exe, notepad.exe and wsl.exe. Stub size proves nothing.



Diagnosis that actually isolated it. Invoke the alias stubs directly by full path, so PATH order cannot mask the result:



Alias stub

Owning package status

Result

winget.exe

Microsoft.DesktopAppInstaller — Ok

works

wsl.exe

MicrosoftCorporationII.WindowsSubsystemForLinux — Modified, NeedsRemediation

fails

bash.exe

same package

fails



The alias mechanism was healthy. Both aliases belonging to the WSL package were dead, and Windows had already flagged that package Modified, NeedsRemediation. wsl appeared to work only because a real C:\windows\system32\wsl.exe exists and wins on PATH before the alias is ever consulted — so the damage was invisible from the command that would normally reveal it.



The fix that was rejected. Putting C:\Program Files\Git\bin on PATH ahead of WindowsApps so bash would resolve to Git Bash. It would have made the symptom disappear while leaving the damaged package in place — and Git\bin carries ~40 msys binaries (find.exe, sort.exe, echo.exe, tee.exe) that shadow Windows built-ins. Git's own installer defaults to Git\cmd precisely to avoid this. A symptom-level shim that introduces a known footgun is not a fix.



The fix applied. wsl --update — Microsoft's supported remediation path:





Before

After

WSL package version

2.6.3.0

2.7.12.0 — latest stable (released 2026-08-18)

Package status

Modified, NeedsRemediation

Ok

WSL2 kernel

6.6.87.2

6.18.33.2

WSLg

1.0.71

1.0.73.2

bash.exe alias

fails

works

bash from a fresh shell

fails

works (WSL bash)

Ubuntu distro

Stopped, intact, WSL version 2

intact, WSL version 2

User PATH

—

byte-identical, never modified



Distros are separate from the WSL system package, so nothing was lost.

An unplanned consequence worth recording

The repair moved the WSL2 kernel from 6.6.87.2 to 6.18.33.2 — a major jump, because the damaged package had been stuck.



That crosses a threshold this report cares about. AMD's Strix Halo optimization guidance states that gfx1151 requires Linux 6.18.4 or later on distributions without a vendor-patched kernel (with packaged alternatives at Ubuntu 24.04 HWE 6.17.0-19.19~24.04.2+ or OEM 6.14.0-1018+). The previous 6.6.87.2 kernel was far below every one of those floors; 6.18.33.2 clears the general one.



This does not make ROCm-in-WSL a recommendation — §19.2 still rejects making WSL the primary execution environment, GPU access inside WSL goes through /dev/dxg paravirtualization rather than the native driver path, and none of that was tested here. It does mean the kernel is no longer the blocker if the Linux lane is ever wanted for comparison work. Recorded as an observation, not a plan.



WSL is on the stable channel. A 2.9.4 pre-release exists (WSL Containers, public preview); it is not recommended, on the same reasoning §15 applies to Windows Insider builds — no identified gain for this workload.





7. Strix Halo hardware analysis

Property

Measured / documented value

Source

APU

AMD Ryzen AI Max+ 395

Win32_Processor

CPU

16 Zen 5 cores / 32 threads, 3.0 GHz base

Win32_Processor

iGPU

Radeon 8060S, PCI device 0x1586

Win32_VideoController

gfx target

gfx1151 (RDNA 3.5)

AMD ROCm compatibility matrix maps Ryzen AI Max to gfx1151

Compute units

20 reported by OpenCL

clinfo

Memory

8 × 16 GB LPDDR5X @ 8000 MT/s = 128 GB

Win32_PhysicalMemory

Theoretical bandwidth

~256 GB/s (256-bit × 8000 MT/s)

derived

Vulkan

device API 1.4.349, AMD proprietary, LLPC 26.7.1

vulkaninfo

OpenCL

driver 3679.0 (PAL,LC)

clinfo



On the compute-unit count. AMD markets the 8060S as 40 CUs; clinfo reports 20. These are consistent: RDNA groups two CUs into one work-group processor, and the OpenCL runtime reports WGPs. Nothing is wrong with the part. Any tool that reports "20 CUs" on this machine is reporting WGPs, and a benchmark that scales by "CU count" must say which it means.





8. Windows memory architecture — the question answered properly

This is the section most often got wrong, so every number below is measured.

8.1 What the machine reports

Reading

Value

Source

Physical DIMM capacity

128 GB

Win32_PhysicalMemory (8 × 16 GB)

Memory visible to Windows

63.79 GB

Win32_OperatingSystem

GPU Dedicated memory

65,360 MB ≈ 63.83 GiB

dxdiag

GPU Shared memory

48,938 MB ≈ 47.79 GiB

dxdiag

GPU Display (total) memory

114,298 MB ≈ 111.6 GiB

dxdiag

OpenCL global memory

107,206,131,712 B = 99.84 GiB

clinfo

OpenCL max single allocation

58,411,555,225 B = 54.40 GiB

clinfo

Win32_VideoController.AdapterRAM

4,293,918,720 (~4 GB)

ignore — 32-bit overflow artefact



65,360 + 48,938 = 114,298, exactly. Windows' "Display Memory" is simply dedicated plus shared.

8.2 What is actually happening

The 128 GB is one physical pool. VGM (Variable Graphics Memory) is currently set to 64 GB, which is why:



Windows sees 63.79 GB rather than 128 GB — the carve-out is taken before the OS counts memory, at firmware level. It is not "reserved from Windows"; Windows never sees it.

The GPU reports 63.83 GiB "Dedicated" — the carve-out.

The GPU additionally reports 47.79 GiB "Shared" — a WDDM mapping over the remaining system RAM, which is the Windows analogue of Linux's GTT.



AMD's own Strix Halo optimization guidance says the opposite of what most Windows users do:



"AI frameworks work more efficiently with GTT-backed allocations. GTT allows large, flexible mappings without permanently reserving memory, resulting in better overall system utilization." — AMD ROCm docs, Strix Halo system optimization



AMD recommends keeping the firmware VRAM reservation minimal (as low as 0.5 GB) and raising the GTT limit instead. But that entire page is Linux-only. Its mechanism is the TTM pages_limit sysfs knob and the amd-ttm helper. There is no TTM on Windows, no pages_limit, and no amd-ttm.



This is the single most important asymmetry in the whole investigation: on Linux you tune GTT and leave VRAM tiny; on Windows the carve-out is the tuning knob, because the flexible half is not user-controllable.

8.3 Answering the required questions directly

Q14 — What does Variable Graphics Memory actually do? It moves the firmware boundary between memory Windows can see and memory presented to the GPU as dedicated VRAM. It is a firmware reservation, applied before Windows boots, adjustable in AMD Software: Adrenalin (Performance → Tuning → System → Variable Graphics Memory) or in BIOS. It does not change total installed memory and does not create bandwidth.



Q15 — Is ~96 GB a real GPU-memory ceiling? No — it is three different things being conflated.



96 GB is the maximum VGM carve-out AMD exposes on a 128 GB part. That is a real product limit on the carve-out.

It is not the GPU's addressable ceiling. On this machine, with VGM at only 64 GB, OpenCL already reports 99.84 GiB of global memory and dxdiag reports 111.6 GiB total.

The ceiling that actually bites first is the 54.40 GiB maximum single allocation.



Q16 — Can workloads use more than the configured VGM amount? Yes, and this machine proves it. VGM is 64 GB; OpenCL global memory is 99.84 GiB. The surplus is the shared/GTT-equivalent mapping over system RAM. The caveat is that memory beyond the carve-out is reached over the same physical bus but through WDDM's shared path, and is subject to eviction under desktop memory pressure — so it is available rather than equivalent.



Q17 — What VGM setting should this machine use? Leave it at 64 GB. Reasoning, from this machine's own measurements:



The resident 27B model uses 26.73 GB of GPU-local memory total (§8.4) — well inside 64 GB.

Raising VGM to 96 GB would drop Windows to ~32 GB visible. This box runs a browser, an IDE, Node processes and the harness itself; 32 GB is a real constraint, and DSH's own worker threads and Chromium-based UI are not free.

Nothing measured here is currently limited by the carve-out.

Raise it to 96 GB only for a specific experiment that needs a >55 GB resident model, and put it back afterwards.



Q18 — How much should remain for Windows and DSH? On this machine the current split leaves 63.79 GB to Windows, of which 25.51 GB was free with the model resident and the stack running. That is comfortable. Treat 32 GB visible to Windows as the floor — which is exactly what a 96 GB VGM setting would leave, i.e. the aggressive setting has no headroom margin at all.

8.4 Measured memory behaviour with a real model

With qwen/qwen3.8-27b (UD-Q5_K_XL, 21.15 GB on disk) resident at 131,072 context:



Reading

Value

LM Studio process GPU-local memory

26.73 GB

All processes GPU-local

28.89 GB

GPU non-local (shared) usage

0 GB

System RAM free

25.51 GB of 63.79 GB



Two conclusions:



Weights 21.15 GB + ~5.6 GB of KV cache and compute buffers at 131 K context. That KV figure is far smaller than a conventional 27B dense transformer would need.

Nothing spilled to shared memory. With VGM at 64 GB and a 27 GB workload, the shared path is not being exercised at all — which is why raising VGM would change nothing today.



Sampled again during a 45 K-token prefill, the figure was unchanged at 26.73 GB with zero shared usage — which proves llama.cpp preallocates the full 131 K KV cache at load and it does not grow with use.



The small KV figure is explained by the architecture, not by luck. Qwen3.8-27B is a hybrid:



"16 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention → FFN))" — Qwen3.8-27B model card



Of 64 layers, only 16 carry full attention; the other 48 are Gated DeltaNet, whose state is constant-size rather than growing with sequence length. A standard 27B dense model with 64 full-attention layers at 131 K context would need roughly six times the KV cache. This model is unusually well suited to long-context agent work on a memory-bandwidth-limited part, and that is an architectural property, not a quantization trick.





9. Native Windows ROCm — the exact current state

9.1 What is documented

Fact

Value

Source

Current ROCm

7.14.0, released 2026-07-16

AMD compatibility matrix

Operating systems

Linux and Windows

same

gfx1151 listed

Yes

same

Windows version listed for Ryzen AI Max

Windows 11 25H2

same

Component versions named

hipBLASLt 1.4.1, MIOpen 3.5.2, RCCL 2.30.4

same

HIP SDK for Windows

7.2.0 documented; RDNA3.5 (gfx1150, gfx1151) Supported

AMD Windows install docs

AMD ROCm Debugger on RDNA3.5

Not supported

same



This box runs Windows 11 25H2, build 26200. It is the exact configuration AMD lists.



"Supported" is defined by AMD as: "Official software distributions of the current HIP SDK release fully support this hardware."

9.2 What is installed here — nothing

Check

Result

C:\Program Files\AMD\ROCm

absent

C:\Program Files\AMD\HIP SDK

absent

HIP_PATH environment variable

unset

rocminfo on PATH

absent

LM Studio ROCm runtime

was not installed (see §16.3)



The machine has been running Vulkan the whole time.

9.3 Component status for gfx1151 on native Windows

Component

Native-Windows status for gfx1151

HIP runtime

SUPPORTED PRODUCTION — AMD lists gfx1151 on Windows 11 25H2

HIP SDK

SUPPORTED PRODUCTION

llama.cpp ROCm/HIP backend

SUPPORTED PRODUCTION — shipped as an LM Studio runtime, v2.29.1, measured in §10

hipBLASLt / MIOpen / RCCL

versions published in the matrix; per-OS status for gfx1151 not separately stated → UNKNOWN

ROCm Debugger

UNSUPPORTED on RDNA3.5

PyTorch on native Windows for gfx1151

UNKNOWN — not stated in the matrix consulted [Addendum] the Codex report asserts that AMD's ROCm-on-Radeon/Ryzen documentation lists PyTorch as supported/preview for Ryzen APUs on Windows; not checked here (§27 item 19)

vLLM on native Windows for gfx1151

UNKNOWN — community reports place vLLM work on Linux

SGLang, MIGraphX, training

UNKNOWN / NOT ESTABLISHED for native Windows

Flash Attention (rocWMMA)

present in llama.cpp ROCm builds [community]; not verified here as a separate library



Q12 — What portions of ROCm actually work natively on Windows today? The HIP runtime and HIP SDK for gfx1151, and llama.cpp built against them. That is enough to serve models, which is all this workstation needs.



Q13 — What is still Linux-only or unestablished? The debugger is explicitly unsupported on RDNA3.5. The full Linux ROCm framework stack — PyTorch, vLLM, SGLang, training paths — is not established for native Windows on this target by the sources consulted. Anyone needing those should expect to use Linux, and this report does not recommend converting the machine.



Discipline note. "ROCm supports Strix Halo" is true for the HIP runtime and SDK, on Windows 11 25H2, for gfx1151. It is not a statement about PyTorch or vLLM on Windows, and the two are routinely conflated in secondary sources.





10. Vulkan versus ROCm — measured on this machine

This is the section the directive cares most about, and the one where secondary sources are least trustworthy. Everything below was measured on the target machine on 2026-08-23.

10.1 Why this comparison is unusually clean

Both backends are the same llama.cpp version, 2.29.1, shipped as interchangeable LM Studio runtime extensions. Only the backend changed between runs:



Held constant

Value

Model

unsloth/Qwen3.8-27B-GGUF/Qwen3.8-27B-UD-Q5_K_XL.gguf

Quantization

Q5_K_XL (5-bit), 21.15 GB on disk, 19.69 GiB loaded

Context length

131,072

parallel

1

llama.cpp

2.29.1 on both sides

Sampling

temperature = 0

Output cap

192 tokens

Machine state

VGM 64 GB, driver 32.0.31035.1003, nothing else driving the GPU



Method: an HTTP ladder over the OpenAI-compatible endpoint, each rung prefixed with a unique GUID nonce so no rung is served from a previous rung's prompt cache, preceded by a discarded warm-up request so no rung pays a model reload inside TTFT. Both backends ran the identical script, and nothing else touched the server during either run.



Three runs were discarded before these were accepted. The first shared a prompt prefix across rungs and measured the prompt cache (inflating marginal prefill by ~71 %). The second and third were contended — interactive probes were issued against the same single-slot server mid-run. Only uncontended, cache-defeated, warmed runs appear below. The discarded CSVs are kept in evidence/ deliberately.

10.2 Results

Time to first token (lower is better)

Prompt

Prompt tokens

Vulkan

ROCm

ROCm advantage

8 KB

~1,486

22.539 s

7.718 s

2.92× faster

32 KB

~5,653

44.343 s

20.924 s

2.12× faster

64 KB

~11,211

76.884 s

41.558 s

1.85× faster

256 KB

~44,531

278.536 s

244.161 s

1.14× faster

Marginal prefill throughput

The slope between rungs, which removes the large fixed per-request overhead that contaminates a naive prompt_tokens ÷ TTFT. This is the honest prefill number.



Segment

Vulkan

ROCm

ROCm advantage

8 KB → 32 KB

191.0 tok/s

315.7 tok/s

+65 %

32 KB → 64 KB

170.9 tok/s

269.3 tok/s

+58 %

64 KB → 256 KB

165.2 tok/s

164.5 tok/s

−0.4 % — parity

Decode throughput (higher is better)

Prompt

Vulkan

ROCm

Vulkan advantage

8 KB

16.4 tok/s

13.5 tok/s

+21 %

32 KB

15.9 tok/s

11.6 tok/s

+37 %

64 KB

16.2 tok/s

11.9 tok/s

+36 %

256 KB

14.8 tok/s

7.2 tok/s

+106 %

10.3 What this says

Q10 — does Vulkan outperform ROCm? On decode, yes — consistently, and the gap widens sharply with context: +21 % at 8 K, +106 % at 45 K tokens. Vulkan's decode is also far more stable (16.4 → 14.8 tok/s across the whole ladder) where ROCm's collapses (13.5 → 7.2 tok/s).



Q11 — where does ROCm outperform Vulkan? On prefill, in a specific band: roughly 1.5 K to 11 K prompt tokens. There it is worth 1.85× to 2.92× on time-to-first-token and +58 % to +65 % on marginal throughput.



The advantage does not survive long context. Between 64 KB and 256 KB the two backends prefill at 165.2 and 164.5 tok/s — statistically indistinguishable. Whatever ROCm does well at moderate batch sizes, it has stopped doing by ~45 K tokens.



This partially reproduces community reports [community] (ROCm ≈ +20.6 % prompt processing, ≈ −24.6 % generation): the decode penalty brackets their figure at short context, and the prefill advantage measured here is larger than theirs in the band where it exists. The claim that ROCm "maintains high performance with almost no drop-off as the context window grows" is not reproduced on native Windows — here it is Vulkan that holds, and ROCm that degrades.

10.4 The memory measurement

Sampled from \GPU Process Memory(*) while each backend ran the identical 45 K-token rung:



State

Vulkan

ROCm

Model loaded, idle

26.73 GiB

—

During the 45 K-token rung

29.35 GiB

78.39 GiB

Free system RAM during that rung

18.42 GB

1.55 GB

Shared (non-local) GPU memory

0 GiB

0 GiB



ROCm consumed 2.7× the GPU memory for identical work, and drove free system RAM from ~19 GB to 1.55 GB. The footprint grew monotonically through the rung — 64.79 → 69.57 → 78.39 GiB on successive samples — exceeding the 63.83 GiB dedicated carve-out.



Three consequences:



This directly contradicts the community claim that ROCm uses less memory than Vulkan. That claim almost certainly describes Linux, where AMD's GTT-based model applies (§8.2). On Windows the memory model is different, and the claim does not transfer. This is precisely the Linux→Windows substitution the directive warns against.

It is a stability hazard on a working machine. 1.55 GB of free RAM on a box also running a browser, an IDE and the harness is the edge of thrashing.

It caps headroom. A second resident model would not fit alongside ROCm's working set, which removes the multi-model portfolio §13.2 wants.



The mechanism was not isolated. The plausible cause is HIP compute-buffer sizing scaling with batch; community evidence points at GGML_HIP_NO_VMM=ON as a related HIP VMM defect on this GPU [community], but LM Studio's runtime does not expose that flag, so it could not be tested here. Recorded as an open unknown (§27), not as an explanation.

10.5 Verdict and the selected backend

Vulkan is the default on this machine. ROCm is an experimental lane with a narrow, real use.





Vulkan

ROCm

Prefill, 1.5 K–11 K tokens

slower

1.85–2.92× faster

Prefill, ~45 K tokens

165.2 tok/s

164.5 tok/s — parity

Decode, short context

+21 %

slower

Decode, long context

+106 %

collapses to 7.2 tok/s

GPU memory for the same work

29.35 GiB

78.39 GiB

Free system RAM under load

18.42 GB

1.55 GB

Headroom for a second model

yes

no

Verdict

BUILD NOW — default

EXPERIMENTAL LANE



The earlier reading of this data — "ROCm wins the metric that matters most" — does not survive the full ladder. ROCm wins prefill only in a band, loses decode everywhere, loses badly at long context, and costs 2.7× the memory. On this machine, under native Windows, Vulkan is the better backend on the merits, not merely the safer one.



The machine was returned to Vulkan. Verified after restore: runtime llama.cpp-win-x86_64-vulkan-avx2@2.29.1 selected; qwen/qwen3.8-27b resident at Q5_K_XL, contextLength 131072, parallel 1; 19.22 GB system RAM free; 29.25 GiB GPU local. See §16.3.

Where ROCm would still be the right choice

Its band of advantage is real and matches a genuine workload shape: many short-to-moderate turns, each with a fresh 2–10 K prompt, where time-to-first-token dominates and total context stays small. A subagent fleet doing classification or triage looks exactly like that.



T-10 — the highest-value follow-up on this box: load the model on ROCm at a 32 K context limit rather than 131 K, re-measure the footprint, and re-run the 8–32 KB rungs. If the working set stays under ~40 GiB, a ROCm profile becomes a legitimate second lane for short-prompt work while Vulkan serves the long-context main thread. That is the one experiment most likely to change this recommendation.



[Addendum] How to run T-10 properly. The §10 comparison used LM Studio's packaged ROCm runtime, which exposes none of the HIP tuning knobs — and every tuned-ROCm number in the community comes from a build that sets them. T-10 should therefore run against a custom llama.cpp HIP build for gfx1151, not the LM Studio runtime, with three variables controlled explicitly: the rocWMMA Flash-Attention build option (GGML_HIP_ROCWMMA_FATTN=ON), the hipBLASLt path (ROCBLAS_USE_HIPBLASLT=1), and HIP virtual-memory management on and off (GGML_HIP_NO_VMM), which is the community's named suspect for the §10.4 footprint. Each is a real option in llama.cpp or rocBLAS; none was exercised here. The Gemini report's figures for such a build (≈950 tok/s prefill on a 27B) are unsourced and should not be planned against. Measure, then decide.





11. Local inference-server comparison

11.1 The requirement DSH actually imposes

From docs/user/guide/providers.md at the pinned commit, a server is usable by DSH if it:



answers OpenAI Chat Completions (api: openai-completions), OpenAI Responses, or Anthropic Messages;

accepts a bearer credential (which may be a dummy for a local server);

optionally answers GET {baseURL}/models for discovery — and DSH degrades gracefully without it ("enter models manually for endpoints that do not provide it").



DSH is explicit that most gateways get something wrong, and it ships two named switches for the two most common failures:



"A model that declares reasoning has its system prompt sent as role: "developer", which many gateways reject outright, and the output cap is sent as max_completion_tokens, which a server that only knows max_tokens refuses."



Both were tested against LM Studio on this machine, and both passed:



Probe

Result

role: "developer" accepted

ACCEPTED (finish_reason: length, 83 tokens)

max_completion_tokens honoured

ACCEPTED (completion_tokens: 24)



Therefore no compat block is required for LM Studio. This is measured, not assumed.

11.2 Candidate comparison



LM Studio

llama-server

Lemonade

Ollama

Installed here

yes, serving :1234

no

no

no

OpenAI Chat Completions

verified on this box

yes

yes

yes

GET /models

verified — 34 models listed

yes

yes

yes

developer role

verified accepted

UNKNOWN

UNKNOWN

UNKNOWN

max_completion_tokens

verified accepted

UNKNOWN

UNKNOWN

UNKNOWN

Vulkan backend on this GPU

yes, running

yes

yes

yes

ROCm backend for gfx1151 on Windows

yes — v2.29.1 available

build-it-yourself

yes

limited

Backend switching without rebuild

yes — lms runtime select

no, separate builds

yes

no

Model hot-swap / load / unload

yes — lms load/unload

one model per process

yes

yes

Multiple models resident

yes

multi-process only

yes

yes

Structured output / JSON schema

yes (grammar-based) [community]

yes (GBNF grammars)

yes [community]

weaker [community]

Tool calling

yes

yes

yes + MCP

weaker [community]

Authoritative residency query

lms ps --json

—

—

—

NPU path

no

no

yes (hybrid) [community]

no

11.3 Recommendation

Q6 / Q7 — LM Studio is the right choice here, and not merely because it is the easiest.



The deciding factor is not convenience, it is that LM Studio can switch the llama.cpp execution backend without rebuilding anything. On this machine:



llama.cpp-win-x86_64-vulkan-avx2@2.29.1     <- selected



llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1   <- now installed



llama.cpp-win-x86_64-avx2@2.28.2            <- CPU fallback



Two backends at the identical llama.cpp version, swappable with one command. On a platform where the Vulkan-vs-ROCm answer is workload-dependent (§10), that is a structural advantage that llama-server cannot match without maintaining two builds, and it makes the comparison in §10 methodologically clean.



Secondary reasons: lms ps --json is the only trustworthy residency/quantization readout found in this investigation, and multiple models can stay resident — which §13's portfolio needs.



Q8 — Is Lemonade advantageous here? Not for the primary path today. Its distinguishing feature is NPU/hybrid execution, and §14 concludes the NPU has no role in the primary LLM workload. It belongs in the EXPERIMENTAL LANE, revisited if AMD's NPU story changes.



Q9 — Is direct llama-server preferable? No, for the workstation. It is the right tool for a microbenchmark (llama-bench isolates prefill from TTFT far better than an HTTP ladder can), and installing it for that purpose is recommended. It is not the right thing for DSH to talk to.





12. Qwen3.8 analysis

12.1 The family, as it actually exists

Established from the Qwen model card and release records. Variants not listed here were not found, and are not invented.



Model

Released

Params

Type

Context

Licence

Qwen3.8-27B

2026-08-14

27.78 B

dense, hybrid attention

262,144 native, extensible to 1 M

Apache 2.0

Qwen3.8-2.4T-A95B

2026-08-12

2.4 T total / ~95 B active

sparse MoE

—

open weights

Qwen3.8-Max

GA 2026-08-03

undisclosed

hosted

1 M

proprietary, hosted



Only Qwen3.8-27B is relevant to this machine. The 2.4T-A95B is far beyond 128 GB at any useful quantization, and Max is a hosted API.

12.2 Architecture — why this model suits this machine

"64 layers … 16 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention → FFN))"



Three-quarters of the layers are Gated DeltaNet — linear attention with constant-size state. Only 16 of 64 layers accumulate a growing KV cache.



Consequences, measured in §8.4:



KV cache at 131,072 context is ~5.6 GB, against roughly 34 GB for a hypothetical conventional 27B with 64 full-attention layers.

Long context is affordable in memory on a 128 GB box, and the constraint moves to prefill time rather than prefill space.

It is a native vision-language model — text, images and video — under Apache 2.0.

12.3 The configuration on this machine

lms ps --json, the authoritative source:



{ "identifier": "qwen/qwen3.8-27b",



  "path": "unsloth/Qwen3.8-27B-GGUF/Qwen3.8-27B-UD-Q5_K_XL.gguf",



  "sizeBytes": 21145786112, "architecture": "qwen35",



  "quantization": { "name": "Q5_K_XL", "bits": 5 },



  "contextLength": 131072, "maxContextLength": 262144,



  "vision": true, "trainedForToolUse": true, "parallel": 1 }



Q21 — which quantization is the best compromise? Q5_K_XL, and the current setting is already right. At 21.15 GB it leaves the entire rest of a 64 GB carve-out free, decodes at the speed measured in §10, and sits above the Q4 range where quality loss becomes visible in code generation. Q6/Q8 would cost bandwidth — the binding constraint on this part — for a smaller quality gain than Q4→Q5 delivers. The box also holds q3_k_xl, q4_k_xl and a q6_k variant, so this is verifiable rather than theoretical.



Q22 — what context length is actually useful? 131,072 is the right operating setting, against a 262,144 maximum. Reasons: §8.4 shows the memory cost is affordable; §10 shows the time cost of prefill is the real limit — a 45 K-token prompt already takes minutes. Raising the window does not make long prompts affordable, it just permits them.



Q23 — KV cache at 32 K / 64 K / 128 K / 256 K? Measured total at 131 K is ~5.6 GB of KV + compute buffers, preallocated at load. Because 48 of 64 layers are constant-state, the growth is roughly linear in the 16 attention layers only. A precise per-window table was not established. Stated as UNKNOWN rather than extrapolated.

12.4 Speculative decoding is already active — measured

A non-streaming request returned:



"stats": { "total_draft_tokens_count": 5,



           "accepted_draft_tokens_count": 5,



           "rejected_draft_tokens_count": 0 }



Q25 — does MTP/speculative decoding materially improve this workload? Yes, measurably. A 21.15 GB model on a ~256 GB/s bus has a hard decode ceiling near 12 tok/s if every token requires a full weight sweep. Measured decode on the accepted Vulkan runs is 14.8–16.4 tok/s (§10) — above that ceiling, which is only possible because multiple tokens are produced per weight sweep. Draft acceptance was 5/5 on the sample observed.



This is important for the architecture: the decode figure for this model is not bandwidth-bound in the naive way, and any capacity planning that assumes bandwidth ÷ model size will understate it.

12.5 Agent-suitability notes

trainedForToolUse: true and vision: true are asserted by the model metadata.

Thinking mode is on by default. In a probe with max_tokens: 8, the response content was empty and completion_tokens_details.reasoning_tokens was 8 — the reasoning trace consumed the entire output budget. Any DSH tool-calling configuration must budget output tokens well above the expected answer length, or tool calls will be truncated before they are emitted. This is a concrete, measured failure mode.

Qwen's own recommended sampling differs by mode: thinking temperature=1.0, top_p=0.95, top_k=20; instruct temperature=0.7, top_p=0.80, top_k=20. The benchmarks in §10 used temperature=0 deliberately for reproducibility — that is a benchmark setting, not a recommended agent setting.

Qwen documents max output of 262,144 tokens for reasoning content and 131,072 for the final response — far above anything a harness should actually allow.





13. Model portfolio

13.1 What is already on the machine

lms ls reports 41 models, 549.14 GB, against 852.5 GB free on the 2 TB system SSD. The portfolio problem here is not acquisition — it is pruning. Several entries are duplicates across quantizations or are tagged to other machines in a fleet (NvideaBlackwell, R71, TinyRyzen7) rather than Local.

13.2 Recommended portfolio

Role

Model

Quant

Disk

Loaded (est.)

Context

Status

Primary agent / coding / vision

unsloth/qwen3.8-27b

UD-Q5_K_XL

21.15 GB

26.73 GB measured @131 K

131,072

resident — keep

Fast worker / subagent

qwen/qwen3.6-35b-a3b

Q4/Q5

22.07 GB

~24 GB

32–64 K

present — promote

Fast coding worker (alt.)

unsloth/qwen3-coder-30b-a3b-instruct

Q4

17.46 GB

~19 GB

32–64 K

present

Maximum-quality reasoning

gpt-oss-120b

—

63.39 GB

~64 GB+

reduced

present — capacity-test before trusting

[Addendum] Capacity experiment — the harness's home model

deepseek-ai/DeepSeek-V4-Flash-0731

lowest-bit GGUF that fits

≈90 GB+ (quant-dependent)

near ceiling

reduced

not present — the VGM-96 case (§8.3); T-2b

[Addendum] Primary-agent contender

Qwen/Qwen3-Coder-Next

Q4-family / UD-Q4

≈40–48 GB

≈45–65 GB est.

64–128 K (262 K native)

not present — add to T-1 (T-13)

Embeddings

text-embedding-nomic-embed-text-v1.5

—

84 MB

<1 GB

—

present — keep

Reranking

—

—

—

—

—

GAP

Draft / speculative

not needed as a separate model

—

—

—

—

MTP is internal (§12.4)

Why this shape

One dense primary, one sparse worker. The decisive property of this machine is memory bandwidth (~256 GB/s), not compute. Decode speed is governed by how many bytes must be swept per token:



A dense 27B at Q5 sweeps ~21 GB per token-step → measured 14.8–16.4 tok/s (§10), held above the naive ~12 tok/s ceiling by MTP.

An A3B MoE activates roughly 3 B parameters per token → a far smaller sweep, and should decode several times faster at comparable total size.



That asymmetry is the whole argument for a two-model portfolio: the dense model for quality on the main thread, the MoE for subagents, batch classification and anything where latency matters more than depth. This claim is derived, and §20 lists the measurement that would confirm it on this box. It is not yet measured here and is not presented as though it were.



No separate vision model. Qwen3.8-27B is natively vision-language. Adding qwen3-vl-30b-a3b-instruct (19.64 GB) is only justified if vision throughput becomes a bottleneck.



Q28 — largest model this machine can technically run. gpt-oss-120b at 63.39 GB is the largest present. With VGM at 64 GB it sits right at the carve-out boundary and would begin using the shared path; the OpenCL 54.40 GiB maximum single allocation is a real hazard for any single buffer above that size, though llama.cpp allocates per-tensor rather than as one block. Technically feasible; verify, do not assume.



[Addendum] Largest-present is not largest-possible. A lowest-bit DeepSeek-V4-Flash-0731 GGUF (≈90 GB+) is the real capacity test for this box, and it needs the 96 GB carve-out — T-2b.



Q29 — largest it can run usefully. Distinct question, and the honest answer is that it depends on active parameters, not file size. A 63 GB dense model would decode near 4 tok/s and be useless as an interactive agent. A 63 GB MoE with small active parameters could be perfectly usable. §20 specifies the test.



Q32 — which small model for fast worker/subagent tasks? qwen3.6-35b-a3b or qwen3-coder-30b-a3b, on the MoE-decode argument above.



[Addendum] Two candidates the other reports surfaced, both verified against their model cards. Qwen3-Coder-Next (Codex report): 80 B total / 3 B active, the same Gated DeltaNet + Gated Attention hybrid as Qwen3.8-27B but with MoE feed-forward blocks, 262,144 native context, Apache 2.0, GGUFs published. It is this section's own argument — a small active set for decode speed and a DeltaNet-heavy layout for cheap KV — applied to a coding-specialised model, and it belongs in T-1 as a third contender against the dense 27B and the 35B-A3B (T-13). DeepSeek-V4-Flash-0731 (Codex report): open weights under MIT, 304 B total with a far smaller active set, a speculative-decoding module attached, and a model card stating it was evaluated with DeepSeek Harness in minimal mode — it is the harness's home model. A lowest-bit GGUF of it is the ">55 GB resident model" case that §8.3 said would justify raising VGM to 96 GB, and it replaces gpt-oss-120b as the headline capacity experiment (T-2b). Neither changes the daily driver until it is measured.

13.3 Pruning

549 GB of models on a 1.9 TB drive with 852 GB free is not yet a problem, but it is heading for one. Concretely: qwen3.8-27b exists locally at q3_k_xl, q4_k_xl, q5_k_xl (loaded) and q6_k. Once the quantization comparison has run, keep the winner and one fallback, delete the rest — that alone is ~35 GB.





14. XDNA 2 NPU analysis

Q35 — does the XDNA 2 NPU provide a useful role? Not for this workstation today.



Finding

Status

NPU rated >50 AI TOPS

vendor claim

Used by llama.cpp / LM Studio for GGUF LLM inference

No — no NPU runtime is offered by lms runtime on this box

Targeted by Lemonade / Ryzen AI Software for specific models

yes, for named models [community]

Practical use today

Whisper, diffusion, background Copilot+ tasks [community]

Largely unused for general LLM inference as of mid-2026

[community], consistent with the runtime list here

A dedicated NPU runtime with an OpenAI-compatible API exists for this chip

[Addendum] Yes — FastFlowLM: Windows, XDNA 2, Strix Halo listed by name; Qwen3 / Gemma / DeepSeek families plus embedding and audio models (repository checked 2026-08-23)



The runtime inventory on this machine is direct evidence: lms runtime get -l offers exactly four extensions — harmony, llama.cpp CPU/AVX2, llama.cpp Vulkan, llama.cpp AMD ROCm. There is no NPU option to select. The path to using the NPU at all would be Lemonade or Ryzen AI Software with a specifically supported model, which is a different model portfolio than the one this workstation wants.



[Addendum] That inventory is LM Studio's, not the platform's. The Grok report pointed at FastFlowLM, and it checks out: a standalone NPU runtime for XDNA 2 that lists Strix Halo explicitly, serves an OpenAI-compatible endpoint, and supports the Qwen3, Gemma and DeepSeek families plus embedding and audio models. It does not change Q35's headline — the NPU is still not the engine for the primary model, and no DSH-on-NPU result exists anywhere — but it removes the "no runtime" premise. DSH can point a second provider profile at it exactly as it points at LM Studio (§18.1), and the lane is T-15.



Where it could earn a place later: embeddings, reranking, ASR, and OCR running concurrently with the GPU-resident LLM, so they do not steal bandwidth from decode. That is a real architectural benefit on a bandwidth-limited part — the NPU has its own execution resources. [Revised] With FastFlowLM available it is EXPERIMENTAL rather than WATCH — an embeddings / reranker / small-helper lane to stand up after acceptance (T-15) — but it still should not shape the initial build.





15. Windows 11 developments

Item

Value on this machine

Build

26200.9168, DisplayVersion 25H2

Relevance

This is the exact build AMD's ROCm 7.14.0 matrix names for Ryzen AI Max

WDDM shared-memory behaviour

measured, §8.1 — 48,938 MB shared over 63.79 GB system RAM

WSL2

installed, Ubuntu, WSL version 2; package repaired to 2.7.12.0 and kernel 6.18.33.2 during this investigation (§6.7). Not part of the recommended execution path — see §19.2

Insider builds

not recommended



Q36 — are recent Windows builds materially improving Strix Halo local AI? For this machine the material fact is alignment rather than a new subsystem: 25H2 / build 26200 is the version AMD certifies for gfx1151 ROCm support. That alignment is what makes §9 and §10 possible.



Q37 — are any Insider features compelling enough to test? No. Nothing found in this investigation identifies an Insider-only capability that changes GPU memory allocation, ROCm availability, or inference throughput on this part. The machine is already on the certified build. Moving to Insider would trade a certified configuration for no identified gain. Classification: REJECT FOR NOW.



[Addendum] Windows 26H1 exists, but Microsoft positions it for new early-2026 devices; it is not an in-place feature update for existing 24H2/25H2 machines, so it changes nothing here (Codex report, consistent with Microsoft's release-information page).





16. Storage plan

16.1 Current state

Volume

Size

Free

C: — Micron 4600 NVMe SSD

1905.6 GB

852.5 GB

D: — Seagate One Touch Hub, USB HDD

7451.8 GB

4346 GB



Models currently consume 549.14 GB.

16.2 Recommended allocation

Purpose

Budget

Notes

Windows + drivers + apps

~200 GB

as-is

Dev toolchain, Node/pnpm store, Python envs, repos

~150 GB

pnpm's content-addressed store grows quietly

Model weights

≤ 700 GB

a ceiling, not a target — currently 549 GB

DSH state, sessions, logs, spill

~50 GB

$DSH_HOME; session-query-sqlite and spill-local both write

Benchmark data + evidence

~20 GB



Free reserve

≥ 250 GB

do not go below



Keep model weights on C: (NVMe). D: is a USB hard disk, not an SSD. §8.4 showed that a model falling out of residency costs a full reload inside the next request's TTFT — paying that from spinning rust over USB would be severe.



[Addendum] Pagefile and hibernation. The ROCm rung in §10.4 took free system RAM to 1.55 GB, which is the regime where pagefile sizing decides whether the box stalls or recovers. Record the pagefile setting at baseline — system-managed on a 63.79 GB-visible machine is acceptable, a fixed small pagefile is not — and note that hiberfil.sys on this split is roughly 25 GB of SSD that can be reclaimed by disabling hibernation if the free reserve above ever becomes the constraint.

16.3 Changes actually made to this machine during the investigation

Change

Reason

Reversible

Downloaded LM Studio runtime llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1 (210.73 MB)

required for the controlled backend comparison in §10

yes — lms runtime remove

Cloned deepseek-harness to dsh-halo-research\_upstream\

source reading for §4–§6

yes — delete

Created C:\Users\scott\Desktop\Code\dsh-halo-research\

report, evidence, benchmark scripts

yes — delete

Ran inference requests against the already-running LM Studio server on :1234

benchmarks

no persistent effect

Temporarily selected the ROCm runtime and reloaded the model on it

the §10 comparison cannot be made any other way

done — reverted, see below

wsl --update — WSL package 2.6.3.0 → 2.7.12.0

the package was Modified, NeedsRemediation; both its App Execution Aliases were dead (§6.7)

intentionally permanent — this repaired damaged system state

The runtime switch, and its restoration

To measure ROCm the selected runtime had to be changed and the model reloaded. Both were done with the model's exact prior parameters recorded first (evidence/PRE-SWITCH-lms-ps.json) and restored afterwards:



lms runtime select llama.cpp-win-x86_64-vulkan-avx2@2.29.1



lms load unsloth/qwen3.8-27b --identifier qwen/qwen3.8-27b \



         --context-length 131072 --parallel 1 --ttl 86400 -y



Verified restored state: selected runtime llama.cpp-win-x86_64-vulkan-avx2@2.29.1; qwen/qwen3.8-27b resident at Q5_K_XL, contextLength 131072, parallel 1, ttlMs 86400000 — identical to the pre-investigation reading. System RAM free returned to 19.22 GB and GPU local to 29.25 GiB.



One incident worth recording. During the ROCm long-context rung the machine reached 1.55 GB of free system RAM with the GPU process holding 78.39 GiB (§10.4). The run completed, and the state above was restored immediately afterwards. This was a live box running other services; the ROCm long-context path should not be re-run on it without first reducing the model's context length.



No DSH configuration was written. No VGM setting was changed. No PATH entry was added or removed — the user PATH is byte-identical to the backup taken at evidence/HKCU-Path-backup.txt. The machine ends this investigation on the runtime and model configuration it started with, plus one deliberate repair: the WSL package is now healthy (§6.7).





17. Benchmark and acceptance-test architecture

17.1 Why the obvious benchmark is the wrong one

Decode tokens/sec is the number everyone quotes and the least useful one for this workload. An agent turn is dominated by prefill: a repository file, a 4,000-line diff, a tool result, a compaction pass. §10 measures a 45 K-token prompt taking minutes to first token while decode sits comfortably around 15 tok/s. Optimising this machine for decode would optimise the part that is already fine.

17.2 The suite

Tier 1 — raw inference (scripted, repeatable)

bench/Bench-Local.ps1 in the research directory implements this. Two methodological requirements it enforces, both learned the hard way during this investigation:



A discarded warm-up request. LM Studio lets an idle model fall out of residency; the first request then pays a 21 GB reload inside TTFT. Without a warm-up the first rung is pure noise — observed as 22.8 s TTFT for a 274-token prompt.

A unique nonce at the head of every prompt. Without it, successive rungs share a prefix and are served from the prompt cache. Measured effect: apparent marginal prefill fell from 336.7 tok/s (cached) to 196.6 tok/s (honest) on the same rung — a 71 % overstatement.



A third requirement was learned by violating it: nothing else may touch the server during a run. One benchmark pass in this investigation was discarded because interactive compat probes were issued against the same single-slot server mid-run.



[Addendum] Two Tier-1 additions. Concurrency: everything in §10 was measured at parallel 1 against a single-slot server, and DSH's mounted subagent tool will issue concurrent requests to that server — the runs discarded as "contended" in §10.1 are a preview of what that does. Re-run the 8 KB and 32 KB rungs with the model loaded at parallel 2 and parallel 4, recording TTFT, decode and GPU memory; llama.cpp preallocates the KV cache per slot, so memory scales with the slot count (T-11). KV-cache quantisation: one run each at q8_0 and q4_0 KV against the Tier-3 tool-calling tasks; the memory win is small here (§8.4) but the quality cost is unmeasured (T-17).

Tier 2 — DSH agent performance

Fixed, repeatable tasks against a real repository, scored on completion rather than speed: repository comprehension; multi-file edit; a test/fix loop; a Git operation; a PowerShell operation; use of a specific tool; a long-running task that crosses a compaction boundary; a deliberately oversized tool output; recovery after a tool error.



[Addendum] Add one task run twice — once in native tool mode and once in Code Mode (code-runtime-worker-thread is mounted by default and was never exercised) — scored on completion and tool-call reliability (T-12).

Tier 3 — reliability

Tool-call success rate, malformed calls, hallucinated tools, loops, context failures, truncation, incorrect edits, permission failures. This tier decides the model choice, not Tier 1. A model that is 30 % faster and emits one malformed tool call in twenty is worse than a slower model that never does.

17.3 Acceptance criteria

The environment is not complete because DSH opens and a model answers "hello". Acceptance requires all of:



lms ps --json shows the intended model and quantization resident.

dsh --dump-config shows the intended provider and model — not deepseek-official.

A DSH session completes a multi-file edit in a real repository, using the PowerShell tool seam, with the sandbox in workspace-write.

A tool call whose result exceeds 100 KB is ingested without breaking the turn.

A session survives at least one compaction and continues correctly.

The network is disconnected and the same task still completes — the only real proof that the work is local.

--dump-config shows tool-bash carrying a disabled key and tool-pwsh active — read the row, not the package name (§6.5).

[Addendum] A Get-CimInstance query issued through the sandboxed PowerShell tool returns data rather than an access error (Discussion #758 reports the restricted token blocking WMI/CIM).

[Addendum] After the per-session dsh-* directory under %LOCALAPPDATA%\Temp is deleted, the sandbox either recovers on its own or the recreate procedure in §18.2 restores it in one step.

[Addendum] The criterion-3 multi-file task completes with two subagents active against the server loaded at parallel 2, with no tool-call failures and no UNKNOWN_MODEL error.

[Addendum] One Tier-2 task completes in Code Mode as well as in native tool mode.

[Addendum] Every executable invoked from inside the sandbox is a native Win32 binary (rg.exe, fd.exe, git.exe, pwsh.exe), and Git\cmd — not Git\bin — is on PATH.



Criterion 6 is the one that would have caught the failure mode §18.4 describes. Criterion 7 is the one that would have caught the false finding retracted in §6.5.



[Addendum] Criteria 8–12 come from the other three reports' gaps: 8, 9 and 12 from Discussion #758 and the Gemini report's sandbox claims; 10 and 11 from the Codex report's concurrency and Code Mode tests.





18. DSH configuration for this machine

Config lives in $DSH_HOME (default ~/.dsh): hand-written settings in $DSH_HOME/settings.yaml, secrets in $DSH_HOME/.credentials.yaml. Model changes take effect on the next request without restarting the server.

18.1 The provider block

llm-pi-ai:



  providers:



    lmstudio:



      # LM Studio ignores the value but pi-ai requires a credential to exist.



      apiKeyEnv: LMSTUDIO_API_KEY



      api: openai-completions



      baseURL: http://127.0.0.1:1234/v1



      models:



        # Qwen3.8-27B is a native vision-language model, but a hand-entered



        # model is treated as text-only until it says otherwise. Without this



        # line, attaching an image is refused before it is ever sent.



        - id: qwen/qwen3.8-27b



          input: [text, image]



Set LMSTUDIO_API_KEY to any non-empty string.



No compat: block is needed. §11.1 proves LM Studio accepts both role: "developer" and max_completion_tokens. Add one only if a different server is introduced.



[Addendum] Provider IDs are sticky. Sessions and subagent descriptors record the provider ID — §21.7 is what happens when a recorded one no longer resolves. Choose stable lowercase IDs (lmstudio, flm) and never rename one once a session exists against it; add a new provider instead.



[Addendum] Optional second provider, for the NPU lane in §14 — add only when T-15 is being run, and leave it out of the daily profile until it passes:



    flm:                        # FastFlowLM NPU lane - EXPERIMENTAL

      apiKeyEnv: FLM_API_KEY    # dummy; pi-ai needs a credential

      api: openai-completions

      baseURL: http://127.0.0.1:<flm-port>/v1

      models:

        - id: <embedding-or-helper-model-id>

18.2 Containment

Leave the sandbox alone. The stock default is already workspace-write, resolved as process.env.DSH_PERMISSION_MODE ?? 'workspace-write'.



Do not set DSH_PERMISSION_MODE=danger-full-access. Per docs/subsystems/sandbox.md, that mode does not narrow confinement — it bypasses it entirely: "A danger-full-access consumer spawns its original argv and does not call ctx.sandbox." One environment variable silently disables every file-effect boundary for every session, and nothing in the UI is obviously different afterwards.



Known limitation, from upstream's own documentation: on Windows the ACL runner reports partial enforcement, not full — "the Windows ACL runner grants no explicit writable root and reports partial enforcement for its ambient ACL gaps", with "Everyone/hard-link boundaries" named as the current gaps. Windows containment here is real and worth having, but it is not an absolute boundary and should not be treated as one.



[Addendum] A Temp cleanup breaks the sandbox — permanently, until fixed by hand. Discussion #758 (2026-08-14, rated P0 by its reporter): the Windows ACL runner passes a per-session private temp directory (…\AppData\Local\Temp\dsh-xxxxxx) and never recreates it. Once Storage Sense, Disk Cleanup or a manual Temp purge removes it, every subsequent session fails with "sandbox mode 'workspace-write' is requested but no sandbox backend is usable on this host … --temp is not an existing directory". The same thread reports the restricted token blocking WMI/CIM queries, UAC elevation failing silently, and PowerShell restricted-language-mode initialisation errors. Mitigations: exclude the dsh-* temp directory from Storage Sense and any cleanup schedule; keep the recreate-the-directory step in the runbook; never rely on a CIM query inside the sandbox for anything that matters. Status at b150a551: not verified fixed — treat as live (§24.3, T-16).

18.3 The shell seam — leave it alone

No patch is required here. An earlier draft of this report instructed disabling tool-bash and bash-sandbox; that instruction was based on a false finding and is withdrawn. See §6.5.



Both rows carry disabled: !!js process.platform === 'win32' in the base bundle, the web-app bundle disables the host-level rows outright, and the agent presets deployed on this machine repeat the same gate. On Windows the agent receives tool-pwsh backed by pwsh-sandbox, and no bash tool. Adding a user patch to disable something already disabled would only add a row to maintain.



Verify rather than assume, using the same method that caught the original error — read the row, not the package name:



pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config



Then confirm tool-bash carries a disabled key and tool-pwsh is the active shell row.

18.4 Verify the model is actually local

The stock composition sets a cloud default:



- id: agent-default-model



  config:



    provider: deepseek-official



    model: deepseek-v4-flash



A workstation can therefore appear to work perfectly while doing none of its work locally. After configuring, confirm with both of:



lms ps --json



pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config



The first proves which model is resident and at what quantization; the second proves what the composed profile will actually use. Neither can be replaced by looking at the UI.





19. Recommended architecture

19.1 The stack

DeepSeek Harness 0.1.1-rc.2  ·  profile: web  ·  133 plugins



  sandbox: workspace-write (default, unchanged)



  shell seam: tool-pwsh + pwsh-sandbox (tool-bash is win32-gated off)



        |  @deepseek-ai/dsh-llm-pi-ai



        |  api: openai-completions



        |  baseURL: http://127.0.0.1:1234/v1



        v



LM Studio local server  :1234   (process: llama-server)



  residency + quantization truth source: lms ps --json



        v



llama.cpp 2.29.1 - backend selectable without rebuild



  · llama.cpp-win-x86_64-vulkan-avx2@2.29.1     (SELECTED - default)



  · llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1   (installed, experimental)



  · llama.cpp-win-x86_64-avx2@2.28.2            (CPU fallback)



        v



AMD Adrenalin 26.7.1 / display driver 32.0.31035.1003



        v



Radeon 8060S (gfx1151, RDNA 3.5) - 20 WGPs / 40 CUs



        v



128 GB LPDDR5X-8000, ~256 GB/s



VGM 64 GB dedicated | 63.79 GB to Windows | 47.79 GiB shared



No middleware, no routing layer, no custom plugins. The directive warns against introducing middleware because middleware can be built; nothing found in this investigation justifies any. DSH's provider seam, LM Studio's model management and LM Studio's runtime switching cover every requirement identified.



[Addendum] Optional experimental lane, not part of the stack until T-15 passes: a second provider profile (flm) pointing at a FastFlowLM endpoint that serves an embedding model and a small helper on the XDNA 2 NPU, concurrent with the GPU-resident primary. It is a provider entry on the same seam as lmstudio, not middleware.

19.2 What is deliberately absent

Not recommended

Why

A custom routing layer

Q33 — DSH already exposes per-session model selection in the UI (dsh-client-ui-model-selection, mounted) and subagents can carry their own model. Automatic routing would add a component with no measured benefit.

Ollama

LM Studio is already installed, is ahead on OpenAI-surface completeness [community], and uniquely offers backend switching.

A second serving backend

Heterogeneity is permitted but must earn its place. One server that can switch backends achieves the same result with less to break. [Addendum] The FastFlowLM NPU lane (§14) is the one candidate that could earn it, because it does not compete for the GPU.

Converting to Linux / making WSL primary

Explicitly out of scope, and unnecessary — §9 shows the needed ROCm components are supported natively.

ROCm HIP SDK installed system-wide

Not required. LM Studio's ROCm runtime is self-contained.

Insider Windows builds

§15 — no identified gain, and the machine is already on AMD's certified build.





20. Outstanding tests — what this report does not yet know

#

Test

Question it settles

T-1

Dense vs MoE decode: same ladder against qwen3.6-35b-a3b

Confirms or refutes §13.2's central portfolio argument

T-2

gpt-oss-120b load + decode at reduced context

Q29 — largest usefully runnable model

T-3

Fill the 131 K window and observe shared-memory usage

Whether the preallocation in §8.4 holds at full occupancy

T-4

Quantization sweep: q3_k_xl / q4_k_xl / q5_k_xl / q6_k on tool-call correctness

Q21 with evidence rather than reasoning

T-5

llama-bench microbenchmark isolating pure prefill

Removes TTFT overhead from §10's numbers entirely

T-6

DSH Tier-2 agent tasks (§17.2) end to end

Whether the harness is actually good here, not just working

T-7

Network-disconnected task completion

Proof that the work is local (§17.3 criterion 6)

T-8

tool-fs-search behaviour without rg on PATH

Whether ripgrep is a hidden dependency

T-9

mcp-client, lsp, subagent-codex on Windows

The UNKNOWN rows in §6.4

T-10

ROCm at a 32 K context limit: reload on ROCm with --context-length 32768, re-measure GPU footprint, re-run the 8–32 KB rungs [Addendum] Run on a custom HIP build with the §10.5 knobs, not the LM Studio runtime.

Whether ROCm's real 1.85–2.92× prefill win can be had at a safe memory footprint — the highest-value follow-up on this box (§10.5)

T-11

[Addendum] Concurrency: reload at parallel 2 and parallel 4; re-run the 8 KB / 32 KB rungs with two subagents active; record TTFT, decode, GPU memory

Whether a single-slot server is the real bottleneck under DSH's subagent tool (§21.11)

T-12

[Addendum] One Tier-2 task in Code Mode and again in native tool mode

Whether Code Mode is usable with this model (§17.2)

T-13

[Addendum] Qwen3-Coder-Next Q4-family through the §10 ladder and the Tier-3 tasks

Whether a coding-specialised 80B-A3B beats the dense 27B as primary (§13.2)

T-2b

[Addendum] DeepSeek-V4-Flash-0731 lowest-bit GGUF: VGM 96, reduced context; load, decode, memory, tool-call reliability; VGM back to 64 afterwards

Q28 / Q29 with the harness's own model — the VGM-96 case (§8.3)

T-15

[Addendum] FastFlowLM serving an embedding model and a small helper on the NPU, concurrent with the GPU-resident 27B

Whether the NPU lane earns its place (§14)

T-16

[Addendum] Sandbox: Get-CimInstance via the sandboxed pwsh tool; an MSYS/Git-Bash binary call; delete the dsh-* temp directory and observe recovery

The Discussion #758 failure modes on this build (§18.2)

T-17

[Addendum] KV cache at q8_0 and q4_0 against the Tier-3 tool-calling tasks

Whether KV quantisation costs tool-call quality (§17.2)





21. Risks

21.1 The software is nine days old

DSH's first commit is 2026-08-13 and the newest release is 2026-08-21. There are four releases in total, all prereleases, and the repository README says breaking changes are expected. Pin 0.1.1-rc.2 and pin the commit. Do not track latest automatically.

21.2 npx should not be used on this box

The README's quick start is npx @deepseek-ai/dsh web. Use pnpm dlx instead. This is a machine-specific finding and is not an upstream defect; DSH itself declares packageManager: pnpm@11.7.0.

21.3 One environment variable disables all containment

DSH_PERMISSION_MODE=danger-full-access does not narrow the sandbox — it bypasses it: "A danger-full-access consumer spawns its original argv and does not call ctx.sandbox." The stock default is workspace-write. If containment matters, the check is not "is the sandbox plugin loaded" — it is "what is DSH_PERMISSION_MODE set to", because the plugin is loaded and inert either way.



Related: on Windows the ACL runner self-reports partial enforcement (§18.2). Real, useful, not absolute.

21.4 A local workstation that quietly runs in the cloud

The stock default model is deepseek-official / deepseek-v4-flash. Nothing about a working DSH session proves it is local. §17.3 criterion 6 — disconnect the network and re-run — is the only test that cannot be faked.

21.5 tool-bash on this machine — RETRACTED

This risk does not exist. tool-bash and bash-sandbox are disabled on win32 at the base bundle, the mode bundle, and the agent preset. The Windows agent gets tool-pwsh + pwsh-sandbox. See §6.5 for the retraction and the methodological cause.



The residual lesson is the one worth keeping: a package appearing in --dump-default-config output is not evidence that it is active. Read the disabled key on the row. The same distinction that governs the plugin counts in §4.3 governs this.

21.6 Thinking tokens consume the output budget

Measured: max_tokens: 8 produced empty content and 8 reasoning tokens. Under-budgeted output limits will truncate tool calls before they are emitted.

21.7 Subagents can silently use the wrong provider — reported upstream, unfixed

Discussion 3377 reports that subagents use the model snapshotted when the parent agent was created, not the currently selected one. The reporter's seven subagents all failed with:



UNKNOWN_MODEL: pi-ai provider "packyai" has no configured model "kimi-k3"



naming a provider/model combination that had never been configured in that deployment, while the parent had already switched to a working provider.



Why this matters here specifically. The recommended build adds a custom provider (lmstudio) and expects the user to switch to it in the UI. That is exactly the sequence the bug punishes.



Mitigation until fixed:



Make the local model the default — selecting a model in the picker also makes it the default for new sessions.

After changing models, start a new session before using subagents.

If subagents fail with UNKNOWN_MODEL, do not debug the provider block first — check the subagent/descriptor entries in the session log against the parent's provider/model.

21.8 There is no bug tracker

Issues are disabled on the DSH repository (has_issues: false). When something breaks there is no canonical place to check whether it is already known; Discussions search (4,117 threads) is the only substitute. Budget for that.

21.9 No dsh web stop or restart

Reported upstream (discussion 2933) and confirmed against the pinned CLI: there is no --stop/--restart. A closed terminal leaves an orphan holding port 3080, and the next launch fails with "port in use". Keep a kill command handy:



Get-NetTCPConnection -LocalPort 3080 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }



21.10 The sandbox does not survive a Temp cleanup — [Addendum]

[Addendum] Discussion #758: the Windows ACL runner's per-session temp directory is never recreated, so one Storage Sense pass disables workspace-write on every later session until the directory is rebuilt by hand. Detail and mitigations in §18.2; reproduction is T-16. This is the kind of fault that looks like a harness regression and is actually housekeeping.



21.11 A single-slot server under a multi-agent harness — [Addendum]

[Addendum] Everything measured here was parallel: 1. DSH mounts tool-subagent and tool-subagent-control by default, and a parent plus two subagents is three concurrent requests against one slot — serialised, with the §10.2 time-to-first-token figures stacking. Raising parallel multiplies the preallocated KV (§8.4) by the slot count, which is affordable on Vulkan for this model (≈5.6 GB per slot at 131 K) and not on ROCm (§10.4). T-11 measures it; until then, subagent-heavy sessions should expect latency rather than failures.





22. Build Now / Experimental / Watch / Reject

Decision

Item

Rationale

BUILD NOW

DSH 0.1.1-rc.2, web profile, stock composition

133 plugins compose cleanly; Windows is first-class

BUILD NOW

dsh-llm-pi-ai → LM Studio via openai-completions

verified working; no compat block needed

BUILD NOW

Sandbox left at workspace-write

already the default; Windows backend is genuine

BUILD NOW

Leave the shell seam unpatched

§6.5 — tool-bash is already disabled on win32 at three layers

BUILD NOW

Qwen3.8-27B UD-Q5_K_XL @ 131,072 context

resident, measured, 26.73 GB, VL + tool use

BUILD NOW

LM Studio as the serving layer

only option offering runtime switching

BUILD NOW

Vulkan as the llama.cpp backend

§10 — better on the merits: wins decode everywhere, at prefill parity by 45 K tokens, 2.7× less memory

BUILD NOW

VGM left at 64 GB

§8.3 — nothing measured is limited by it

BUILD NOW

pnpm dlx, never npx, on this box

§21.2

BUILD NOW

Install ripgrep (scoop install ripgrep)

cheap insurance for tool-fs-search

BUILD NOW

[Addendum] Windows pre-flight: LongPathsEnabled=1, git config core.longpaths true; Developer Mode only if pnpm reports symlink failures

cheap, Windows-specific, absent from the original sequence (Gemini report)

BUILD NOW

[Addendum] Exclude the dsh-* temp directory from Storage Sense and cleanup schedules

Discussion #758 — a Temp purge disables the sandbox until repaired by hand (§18.2)

BUILD NOW

[Addendum] Native Win32 binaries only inside the sandbox (rg.exe, fd.exe, git.exe); Git\cmd on PATH

#758 CIM finding; the Gemini report's MSYS claim is unverified (T-16)

EXPERIMENTAL

ROCm at a 32 K context limit (T-10)

its 1.85–2.92× prefill win is real at 1.5–11 K tokens; the open question is whether the footprint stays safe

EXPERIMENTAL

MoE worker model for subagents

§13.2 argument is sound but unmeasured (T-1)

EXPERIMENTAL

gpt-oss-120b for deep reasoning

capacity and usefulness unverified (T-2)

EXPERIMENTAL

[Addendum] DeepSeek-V4-Flash-0731 lowest-bit GGUF (T-2b)

the harness's home model; the VGM-96 case; open weights and GGUFs verified

EXPERIMENTAL

[Addendum] Qwen3-Coder-Next as primary-agent contender (T-13)

80B-A3B hybrid, 262 K native, Apache 2.0 — §13.2's argument applied to a coder

EXPERIMENTAL

[Addendum] FastFlowLM NPU lane for embeddings / reranker / helper (T-15)

runtime verified to exist for Strix Halo; value to DSH unmeasured

EXPERIMENTAL

[Addendum] parallel 2–4 server profile for subagent sessions (T-11)

single-slot server versus a multi-agent harness (§21.11)

EXPERIMENTAL

mcp-client, lsp, subagent-codex

not in stock composition; Windows status UNKNOWN

EXPERIMENTAL

llama-bench for clean microbenchmarks

measurement tooling, not production

EXPERIMENTAL [Revised] 

XDNA 2 NPU for embeddings / rerank / ASR

[Revised] a runtime now exists (FastFlowLM, §14); the bandwidth argument stands; value to DSH unmeasured (T-15)

WATCH

Lemonade

NPU/hybrid path; revisit if the NPU story changes

WATCH

PyTorch / vLLM native Windows on gfx1151

UNKNOWN today; would unlock fine-tuning

WATCH

VGM at 96 GB

only if a >55 GB resident model becomes worth it

REJECT FOR NOW

Custom routing middleware

no measured benefit; DSH already switches models

REJECT FOR NOW

Windows Insider builds

no identified gain; loses a certified configuration

REJECT FOR NOW

Converting to Linux / WSL-primary

out of scope and unnecessary

REJECT FOR NOW

Ollama

strictly worse here than what is installed

REJECT FOR NOW

Tracking DSH latest automatically

nine-day-old prerelease software





23. Installation sequence

Non-destructive, in order, with a rollback for every step that changes anything.



#

Step

Rollback

0

[Addendum] Pre-flight: set LongPathsEnabled=1 and git config core.longpaths true; enable Developer Mode only if pnpm reports symlink failures; record pagefile and hibernation settings; exclude the dsh-* temp directory from Storage Sense

revert the registry value and git setting; remove the exclusion

1

Record the baseline (machine-baseline.txt, dxdiag, clinfo, vulkaninfo, lms ps --json)

—

2

Confirm Windows 25H2 / build 26200 and driver 32.0.31035.1003 [Addendum] Decide here whether to move to Adrenalin 26.8.1 (2026-08-20); if so, update before step 6 so the ladder re-baselines on the new driver.

—

3

Leave VGM at 64 GB — verify, do not change

Adrenalin → Performance → Tuning → System

4

Confirm Vulkan is the selected runtime (lms runtime ls) — §10's verdict

lms runtime select

5

(optional, experimental) Install the ROCm runtime for the T-10 experiment only

lms runtime remove

6

Re-run the §17.2 Tier-1 ladder to confirm the machine matches §10's baseline

—

7

scoop install ripgrep

scoop uninstall ripgrep

8

Launch DSH: pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" web

nothing persisted until settings are written

9

Write the §18.1 provider block into $DSH_HOME/settings.yaml; set LMSTUDIO_API_KEY

delete the provider entry

10

Confirm via --dump-config that tool-bash carries a disabled key and tool-pwsh is active — no patch to write (§18.3)

—

11

Select the local model in the DSH UI

re-select any other model

12

Run the §17.3 acceptance criteria including criterion 6 (network disconnected)

—

13

Run Tier-2 agent tasks; record tool-call reliability

—

13a

[Addendum] Run T-11 (parallel 2 / 4 with subagents), T-12 (Code Mode), T-16 (the #758 sandbox modes)

—

14

Add the MoE worker model; re-run T-1

lms unload

14a

[Addendum] Contender and capacity experiments: T-13 Qwen3-Coder-Next; T-2b DeepSeek-V4-Flash-0731 at VGM 96; T-15 FastFlowLM

lms unload; VGM back to 64 GB

15

Freeze: record every version, commit the evidence directory

—



Do not perform step 9 before step 6. Choosing a backend after configuring the harness means re-validating the harness against a changed serving layer.





24. Community and upstream evidence

24.1 Real-world DSH + Strix Halo evidence — the honest position

Category A — directly demonstrated DSH on Strix Halo. None found. No firsthand report was located of DeepSeek Harness driven by a local model on Ryzen AI Max / Radeon 8060S hardware. Given DSH is nine days old at the time of writing, this is expected rather than surprising. It should not be papered over: this report's end-to-end architecture is not something the community has already validated.



Category B — demonstrated components that compose. This is where most of the evidence sits, and it is strong:



DSH's OpenAI-compatible provider seam is verified in source and its two documented gateway incompatibilities were tested live against LM Studio and both passed (§11.1).

llama.cpp on gfx1151 under both Vulkan and ROCm is verified on this machine (§10).

Qwen3.8-27B at Q5_K_XL / 131 K context is verified resident and serving on this machine.



Category C — architectural hypothesis. The MoE-worker argument in §13.2 and the gpt-oss-120b reasoning role are reasoned from measured bandwidth behaviour but not yet measured (T-1, T-2).

24.2 Upstream project signals

Signal

Finding

Issues are disabled

has_issues: false. There is no public bug tracker. All reports go through Discussions (4,117 of them, 816 watchers).

Release cadence

4 releases in 6 days, all prereleases

Community plugin ecosystem

Already active — dsh-session-export, dsh-local-ai (an Ollama adapter), dsh-budget, dsh-click ("Windows first"), dsh-fast, migration tools from Claude Code / Codex / OpenCode

24.3 Upstream-reported defects relevant to this build

Report

Relevance

Status at b150a551

Subagents use the model snapshotted at parent-agent creation, not the currently selected model (discussion 3377)

Direct. A local-provider setup plus subagents can fail this way.

Not verified as fixed. Treat as live — see §21.7

All POST /api/* return 403 — trust-fence compared new URL(origin).host against the Host header, and WHATWG drops default ports (discussion 2009)

Would break the whole UI

Appears FIXED. packages/client/connection/src/api-request-trust.ts at the pinned commit uses canonical-authority comparison with explicit port semantics

Orphaned dsh web process holds port 3080; no stop/restart subcommand (discussion 2933)

Operational friction

Live. The CLI at the pinned commit exposes no --stop/--restart

sandbox-windows-acl gates on resolvePwshPath but launches literal pwsh, "so escape-regression tests silently never run"

Direct — bears on §18.2's partial enforcement

Reported upstream; not independently verified here

Hook bridge suites mount LocalBashExecutor unconditionally

A test-coverage gap, not a runtime one — consistent with §6.5, where the runtime rows are correctly win32-gated but the suites do not model that

Reported upstream

DSH_SNAPSHOT=refresh writes literal cwd paths on Windows

Windows path handling

Reported upstream

[Addendum] Windows ACL sandbox permanently unusable after a Temp cleanup; restricted token blocks WMI/CIM; UAC elevation fails silently; PowerShell restricted-language-mode init errors (discussion 758, 2026-08-14)

Direct. §18.2, §21.10; acceptance criteria 8–9; T-16

Not verified as fixed. Treat as live

24.4 Community benchmark evidence, and why this report measured its own

Community reports on Strix Halo backends, recorded with their claims [community]:



ROCm ≈ +20.6 % prompt processing and ≈ −24.6 % generation versus Vulkan.

ROCm with rocWMMA Flash Attention holds throughput "with almost no drop-off" past 8 K context, "while using less memory than Vulkan".

GGML_HIP_NO_VMM=ON is described as necessary because HIP VMM misbehaves on this GPU.

Dense 70B ≈ 5 tok/s; 7–13B ≈ 30–45 tok/s; 30B-A3B MoE ≈ 70–100 tok/s.



Methodology warning. These figures come from different models, quantizations, context lengths, llama.cpp versions and operating systems, and several do not state whether they measured Linux or Windows. They are not directly comparable to each other, and they are not comparable to §10 — which used one model, one quantization, one llama.cpp version (2.29.1), one OS, and one machine, changing only the backend.



Where §10 and community evidence agree: ROCm wins prefill, Vulkan wins decode.



Where §10 and community evidence disagree: the claim that ROCm "uses less memory than Vulkan" is contradicted on this machine — see §10.4. The likely explanation is that the community claim concerns Linux, where AMD's GTT-based memory model applies; this box is Windows, where §8.2 shows the memory model is materially different.



[Addendum] Where the community evidence lives. The [community] claims above were recorded without links. The Codex report carried the source list; it is reproduced in §28 Tier 4 so each claim can be re-checked: the strix-halo-guide, strix-benchmarks and strix-halo-llm-perf repositories; llama.cpp discussion 27047 (Windows ROCm builds for gfx1150/gfx1151) and issue 26929; ROCm issue 5339 (gfx1151 support); AMDVLK issue 420; and the lilting.ch Lemonade-on-Strix-Halo verification.





25. The forty required questions, answered directly

#

Question

Answer

1

Does current DSH run well natively on Windows 11, not merely launch?

Yes. Windows is a first-class target — 865 win32 references, 555 pwsh, a real Win32-FFI sandbox, zero WSL references, and the shell seam is platform-gated at three independent layers (§6.5). One genuine caveat remains: Windows sandbox enforcement self-reports partial, not full (§18.2). [Addendum] Second caveat, from Discussion #758: the sandbox does not survive a Temp cleanup (§18.2).

2

What DSH capabilities are weaker or unavailable on Windows?

tmux-context (tmux does not exist natively); sandbox enforcement is partial, not full. lsp, mcp-client, e2b, subagent-codex are UNKNOWN — none is in the stock composition. tool-bash is not on this list: it is deliberately disabled on win32, with tool-pwsh active in its place (§6.5). [Addendum] From Discussion #758: the sandbox is disabled by a Temp cleanup until repaired by hand, and the restricted token blocks WMI/CIM from the sandboxed PowerShell tool (§18.2).

3

How many actual first-party runtime plugins/capabilities does DSH contain?

227 packages exist; the CLI declares 62 direct dependencies; the stock web profile composes 133; headless composes 78. §4.3.

4

How many work natively on Windows?

Of the 133 composed, no Windows-specific failure was identified. The two previously flagged (tool-bash, bash-sandbox) turned out to be correctly disabled on win32 rather than broken (§6.5). Stated precisely: the profile composes and boots, and the high-risk packages were individually checked — all 133 were not individually exercised, so this is "none found", not "all verified".

5

Can DSH reliably use local OpenAI-compatible inference servers?

Yes, out of the box. dsh-llm-pi-ai implements openai-completions, openai-responses and anthropic-messages, takes a baseURL override per provider and per model, and discovers models via GET {baseURL}/models.

6

Which local server gives DSH the best experience on Strix Halo today?

LM Studio. §11.3.

7

Is LM Studio the best choice, or merely the easiest?

Best, on the merits. It is the only candidate that switches the llama.cpp execution backend without a rebuild — decisive on a platform where Vulkan-vs-ROCm is workload-dependent.

8

Is Lemonade currently advantageous on this hardware?

No, not for the primary path. Its edge is NPU/hybrid execution, and §14 finds no NPU role today. WATCH.

9

Is direct llama-server preferable?

No for serving; yes for measurement. llama-bench isolates prefill far better than an HTTP ladder.

10

Does Vulkan outperform ROCm on relevant Windows llama.cpp workloads?

On decode, yes — everywhere, and the gap widens with context: +21 % at 8 K, +106 % at 45 K tokens. Vulkan also holds steady across the ladder (16.4 → 14.8 tok/s) where ROCm collapses (13.5 → 7.2). And it uses 29.35 GiB against ROCm's 78.39 GiB for identical work. §10.

11

Where does ROCm outperform Vulkan?

Prefill, in a band: roughly 1.5 K–11 K prompt tokens, worth 1.85–2.92× on time-to-first-token and +58–65 % on marginal throughput. The advantage does not survive long context — at ~45 K tokens the two are at parity (164.5 vs 165.2 tok/s). §10.

12

What portions of ROCm actually work natively on Windows today?

The HIP runtime and HIP SDK for gfx1151 on Windows 11 25H2, and llama.cpp built against them (shipped as an LM Studio runtime, v2.29.1). §9.3.

13

What important ROCm components are still Linux-only?

The ROCm Debugger is explicitly unsupported on RDNA 3.5. PyTorch, vLLM, SGLang, MIGraphX and training paths on native Windows for gfx1151 are UNKNOWN / not established. §9.3.

14

What does AMD's Variable Graphics Memory setting actually do?

Moves the firmware boundary between memory Windows can see and memory presented to the GPU as dedicated VRAM. Applied before Windows boots. Creates no bandwidth. §8.2.

15

Is approximately 96 GB a real GPU-memory ceiling?

No. 96 GB is the maximum carve-out. With VGM at 64 GB this GPU already reports 99.84 GiB of OpenCL global memory and 111.6 GiB of total display memory. The ceiling that actually bites is the 54.40 GiB maximum single allocation. §8.3.

16

Can workloads practically consume more than the configured VGM amount?

Yes — proven on this machine. VGM is 64 GB; OpenCL global memory is 99.84 GiB. §8.3.

17

What VGM setting should this 128 GB machine use?

Keep 64 GB. The resident model uses 26.73 GB with zero shared-memory spill; nothing measured is limited by the carve-out, and 96 GB would leave Windows only ~32 GB. §8.3.

18

How much memory should remain available to Windows and DSH?

Currently 63.79 GB visible, 25.51 GB free under load. Treat 32 GB visible as the floor — which is exactly what the aggressive 96 GB setting would leave. §8.3.

19

Which Qwen3.8 variants exist today?

Qwen3.8-27B (2026-08-14, dense 27.78 B, Apache 2.0), Qwen3.8-2.4T-A95B (2026-08-12, MoE), Qwen3.8-Max (GA 2026-08-03, hosted). Only the 27B is relevant here. §12.1.

20

Which Qwen3.8 configuration is best for DSH?

Qwen3.8-27B, UD-Q5_K_XL, 131,072 context, parallel: 1 — the configuration already resident. §12.3.

21

Which quantization is the best quality/performance compromise?

Q5_K_XL. 21.15 GB, above the Q4 range where code-generation quality degrades, without paying Q6/Q8 bandwidth on a bandwidth-bound part. §12.3; confirm with T-4.

22

What context length is actually useful?

131,072, against a 262,144 maximum. The limit is prefill time, not memory — 45 K tokens already costs minutes to first token. §10, §12.3.

23

How much memory does the KV cache require at 32 K / 64 K / 128 K / 256 K?

~5.58 GB total at 131,072, preallocated at load and confirmed not to grow during a 45 K-token prefill (§8.4). A per-window table was not derived — UNKNOWN, T-3.

24

Does Flash Attention materially improve this workload?

Partially answered. Community evidence attributes ROCm's long-context behaviour to rocWMMA Flash Attention [community]; §10 measures the end-to-end consequence but does not isolate FA as a variable — and notably, the flat-long-context claim was not reproduced here.

25

Does MTP/speculative decoding materially improve this workload?

Yes — measured. Draft acceptance 5/5 observed, and decode of 14.8–16.4 tok/s exceeds the ~12 tok/s naive bandwidth ceiling for a 21.15 GB model on ~256 GB/s. §12.4.

26

Are ROCmFPX or similar AMD-specialized runtimes ready for normal use?

UNKNOWN. No current, verifiable evidence was found. Not recommended.

27

What other local models should be installed?

An A3B MoE worker (qwen3.6-35b-a3b or qwen3-coder-30b-a3b), the existing nomic embedding model, and — experimentally — gpt-oss-120b. A reranker is a gap. §13.2. [Addendum] Plus two verified candidates from the other reports: Qwen3-Coder-Next (80B-A3B, primary-agent contender, T-13) and DeepSeek-V4-Flash-0731 (capacity experiment, T-2b). §13.2.

28

What is the largest model this machine can technically run?

gpt-oss-120b at 63.39 GB is the largest present; the addressable ceiling is ~99.8 GiB with a 54.40 GiB single-allocation hazard. §13.2. [Addendum] Largest present is not largest possible: a lowest-bit DeepSeek-V4-Flash-0731 GGUF (≈90 GB+) is the real capacity test (T-2b).

29

More importantly, what is the largest it can run usefully?

Depends on active parameters, not file size — a 63 GB dense model would decode near 4 tok/s and be useless interactively; a 63 GB MoE could be fine. Not yet measured — T-2. §13.2.

30

What makes the best primary local coding/agent model?

Qwen3.8-27B UD-Q5_K_XL — dense quality, native vision, trainedForToolUse, 262 K native context, and a hybrid architecture that makes long context affordable in memory. §12.

31

Which model should handle high-quality reasoning?

gpt-oss-120b, EXPERIMENTAL until T-2 runs. Today the 27B in thinking mode is the practical answer. [Addendum] DeepSeek-V4-Flash-0731 local is the second experimental candidate (T-2b).

32

Which smaller model for fast worker/subagent tasks?

An A3B MoE — qwen3.6-35b-a3b or qwen3-coder-30b-a3b. Small active-parameter count means far less memory traffic per token on a bandwidth-bound part. §13.2, T-1.

33

Should DSH dynamically route among models?

No. DSH already ships user model selection (dsh-client-ui-model-selection, mounted) and per-subagent models. A routing layer would add a component with no measured benefit. §19.2.

34

Can several models remain loaded simultaneously?

Yes. LM Studio supports concurrent residency, and the headroom exists — 26.73 GB used of a 64 GB carve-out. Note this headroom exists on Vulkan; ROCm's working set removes it. §8.4, §10.4.

35

Does the XDNA 2 NPU provide a useful role?

Not today. No NPU runtime is offered by lms runtime on this box; the only four extensions available are CPU, Vulkan, ROCm and harmony. WATCH. §14. [Addendum] A runtime now exists outside LM Studio — FastFlowLM — so the NPU moves from WATCH to EXPERIMENTAL for embeddings / reranking / a small helper (T-15). Still not the primary engine. §14.

36

Are recent Windows builds materially improving Strix Halo local AI?

The material fact is alignment: build 26200 / 25H2 is exactly the version AMD certifies for gfx1151 ROCm support. §15.

37

Are any Insider features compelling enough to justify testing?

No. Nothing identified changes GPU memory allocation, ROCm availability or throughput. REJECT FOR NOW. §15.

38

What is the best daily-driver configuration?

The §19.1 stack: stock DSH web profile → LM Studio :1234 → llama.cpp 2.29.1 on Vulkan → Qwen3.8-27B Q5_K_XL @ 131 K, VGM 64 GB, sandbox workspace-write, shell seam left unpatched (tool-pwsh active, tool-bash win32-gated off).

39

What should be installed only experimentally?

A ROCm profile at 32 K context (T-10), a MoE worker model, gpt-oss-120b, mcp-client/lsp/subagent-codex, and llama-bench. §22. [Addendum] Also: a parallel 2–4 server profile (T-11), Code Mode (T-12), Qwen3-Coder-Next (T-13), DeepSeek-V4-Flash-0731 local (T-2b), FastFlowLM (T-15).

40

What should we wait for?

An NPU runtime in lms runtime get -l; PyTorch/vLLM on native Windows for gfx1151; rocWMMA/Flash-Attention improvements for RDNA 3.5; and DSH reaching a non-prerelease. §26. [Addendum] The first item is partly answered — FastFlowLM exists today outside lms (§14); what remains open is whether it earns its place (T-15).





26. Upgrade path

Component

What to watch

What would change here

DSH

Anything past 0.1.1-rc.2; breaking changes are promised

Re-run --dump-default-config and diff the plugin set. The composition is the contract, not the version number.

ROCm Windows

Components moving from UNKNOWN to supported on gfx1151 — especially PyTorch

Would open fine-tuning and vLLM natively; today those need Linux

llama.cpp

rocWMMA / Flash Attention improvements for RDNA 3.5

Directly moves the §10 prefill numbers

LM Studio runtimes

An NPU runtime appearing in lms runtime get -l

The single event that would move §14 from WATCH to BUILD [Revised] FastFlowLM already provides an NPU path outside lms (§14); an lms-native runtime would fold it into the same server.

Qwen

Successors to Qwen3.8-27B keeping the hybrid DeltaNet design

The KV economics in §12.2 are the reason this model fits; a conventional successor would not

AMD driver

VGM granularity, shared-memory behaviour on Windows

Could change §8's conclusions; re-measure clinfo global + max-alloc after driver updates

Windows

WDDM changes to shared-memory limits

Re-run dxdiag and clinfo after feature updates

[Addendum] FastFlowLM

Model coverage, embedding/reranker support, Strix Halo fixes

Moves the NPU lane from EXPERIMENTAL to BUILD if T-15 passes

[Addendum] DeepSeek V4 / llama.cpp

Local V4-Flash GGUF route maturity in llama.cpp

Whether the harness's home model becomes a daily option rather than a capacity experiment



Deliberately modular seams — keep these swappable:



The provider block. Changing serving layer should be a baseURL edit, nothing more.

The backend. lms runtime select — never bake a backend into a build.

The model. DSH's model picker; do not hard-code a model into agent instructions.

The sandbox mode. A knob, not a code path.





27. Known unknowns

Direct DSH + Strix Halo evidence is sparse. No firsthand report was found of DSH specifically driven by a local model on Ryzen AI Max hardware. Given DSH is nine days old, this is expected. This report is therefore mostly Category B (demonstrated components that compose) and Category C (architectural hypothesis), not Category A.

PyTorch / vLLM / SGLang / training on native Windows for gfx1151 — not established.

Per-window KV cache table (32 K / 64 K / 128 K / 256 K) — the preallocation behaviour is measured (§8.4) but a per-window breakdown was not derived.

tool-fs-search without ripgrep — untested (T-8).

mcp-client, lsp, e2b, subagent-codex on Windows — untested (T-9).

Whether hipBLASLt / MIOpen / RCCL are Windows-available for gfx1151 specifically — the matrix gives versions, not per-OS per-target status.

Lemonade's current release number — RESOLVED: lemonade-sdk/lemonade v11.7.0, published 2026-08-19T19:39:54Z, not a prerelease (GitHub releases API).

Long-run stability — nothing here ran for hours. Thermal and stability behaviour under sustained agent load is unmeasured.

Why ROCm's memory footprint grows as it does (§10.4) — the mechanism was not isolated. The plausible cause is HIP compute-buffer sizing scaling with batch, and community evidence points at GGML_HIP_NO_VMM=ON as a related HIP VMM defect on this GPU [community] — but LM Studio's runtime does not expose that flag, so it was not testable here.

Whether the subagent provider-snapshot bug (§21.7) is fixed at the pinned commit — the report was not independently reproduced or refuted. Treated as live.

The DSH web UI was not booted. Ports 3080 and 3090 are occupied by an existing deployment on this machine, and starting a second instance would have disturbed it. The CLI was verified (--version → 0.1.1-rc.2, --help, --dump-default-config against a clean DSH_HOME), which is what every plugin-count claim rests on. End-to-end UI verification remains outstanding.

[Addendum] Behaviour at parallel > 1 — every number in §10 is single-slot; subagent contention and the per-slot KV cost are unmeasured (T-11).

[Addendum] Code Mode with this model — mounted by default, never exercised (T-12).

[Addendum] Headless-profile approval behaviour — the 78-plugin headless composition was counted, but how approvals are handled without the web UI was not established; settle it before any unattended use.

[Addendum] FastFlowLM's usefulness to DSH — the runtime exists; model quality, embedding throughput and coexistence with the GPU-resident primary are unmeasured (T-15).

[Addendum] DeepSeek-V4-Flash-0731 local feasibility — open weights and GGUFs exist; whether a low-bit quant loads, decodes usefully and tool-calls reliably on this box is unmeasured (T-2b).

[Addendum] Recovery after a Temp cleanup — Discussion #758's failure is reported upstream, not reproduced here (T-16).

[Addendum] The Gemini report's claim that MSYS2/Git-Bash binaries fail under the restricted token — unverified (T-16).

[Addendum] Whether PyTorch on native Windows for gfx1151 is now supported or preview — the Codex report asserts AMD's ROCm-on-Radeon/Ryzen documentation lists it; not checked here. Would resolve item 2.





28. Source appendix

Evidence is ordered by the directive's precedence: source code first, community last.

Tier 1 — source code, at a pinned commit

Repository github.com/deepseek-ai/deepseek-harness, commit b150a551b8d465e31e418e1b2eaf5e79bbb7d28e (2026-08-21), cloned locally.



Claim

File

OpenAI-compatible protocols and baseURL override

packages/llm/llm-pi-ai/src/provider.ts:25-187

GET /models discovery

packages/llm/llm-pi-ai/src/discovery.ts:39-232

Runner chain incl. Windows ACL backend

packages/sandbox/sandbox-local/src/index.ts:2-3,141

Windows restricted-token / capability-SID sandbox

packages/sandbox/sandbox-windows-acl/src/ (12 files, ~115 KB)

Sandbox modes, partial enforcement on Windows

docs/subsystems/sandbox.md

Permission presets and their defaults

docs/subsystems/permission-presets.md

Provider/model configuration surface, compat switches

docs/user/guide/providers.md

Platform gating of the shell seam

packages/bundle/base/cordis.patch.yml, packages/bundle/web-app/cordis.patch.yml, ~/.dsh/.agent-presets/*/agent.cordis.yml

Node/pnpm requirements, workspace layout

root package.json, pnpm-workspace.yaml

Tier 2 — registries and vendor APIs

npm packument for @deepseek-ai/dsh — versions, dist-tags, 62 dependencies, MIT licence.

GitHub API — repository metadata, releases, pinned commit, Discussions.

AMD ROCm compatibility matrix — ROCm 7.14.0 (2026-07-16), gfx1151 on Windows 11 25H2.

AMD Windows install docs — HIP SDK 7.2.0, RDNA 3.5 support levels, debugger exclusion.

AMD ROCm "Strix Halo system optimization" — GTT/GART/VRAM model; Linux-only guidance.

Qwen3.8-27B model card — parameters, hybrid architecture, context, licence, sampling.

Microsoft WSL releases API — 2.7.12 latest stable (2026-08-18).

[Addendum] DeepSeek Harness Discussion #758 — Windows sandbox failure after Temp cleanup and related issues (github.com/deepseek-ai/deepseek-harness/discussions/758, 2026-08-14).

[Addendum] DeepSeek-V4-Flash-0731 model card (huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) — MIT, open weights, 304 B total, DeepSeek Harness minimal-mode evaluation note.

[Addendum] Qwen3-Coder-Next model card (huggingface.co/Qwen/Qwen3-Coder-Next) — 80 B total / 3 B active hybrid, 262,144 native context, Apache 2.0, GGUFs published.

[Addendum] FastFlowLM repository (github.com/FastFlowLM/FastFlowLM) — XDNA 2 NPU runtime, Strix Halo listed, OpenAI-compatible API.

[Addendum] AMD Software: Adrenalin Edition 26.8.1 release notes (RN-RAD-WIN-26-8-1), 2026-08-20.

[Addendum] Microsoft Windows 11 release information — 24H2 / 25H2 GA builds and 26H1 positioning (as cited by the Codex report; not re-fetched here).

Tier 3 — commands executed on the target machine, 2026-08-23

Win32_* CIM classes · dxdiag · clinfo · vulkaninfo --summary · Get-Counter '\GPU Process Memory(*)' · lms version|ps|ls|runtime|load|unload · GET /v1/models and POST /v1/chat/completions against :1234 · pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --help / --version / --dump-default-config · Get-AppxPackage · wsl --version|--status|--list|--update · bench/Bench-Local.ps1.



Raw artefacts are in dsh-halo-research/evidence/.

Tier 4 — community evidence, labelled as such

Used only for the claims marked [community] in the body, and never elevated to vendor support: Vulkan-vs-ROCm split behaviour on Strix Halo; rocWMMA Flash-Attention long-context flatness; GGML_HIP_NO_VMM=ON; NPU under-utilisation for LLM inference; LM Studio structured-output/tool-calling completeness relative to Ollama.



Where community sources disagreed, the disagreement is recorded in §27 rather than silently resolved.



[Addendum] Community sources behind the [community] claims, taken from the Codex report's appendix: github.com/hogeheer499-commits/strix-halo-guide · github.com/slb350/strix-benchmarks · github.com/visorcraft/strix-halo-llm-perf · github.com/ggml-org/llama.cpp/discussions/27047 · github.com/ggml-org/llama.cpp/issues/26929 · github.com/ROCm/ROCm/issues/5339 · github.com/GPUOpen-Drivers/AMDVLK/issues/420 · lilting.ch/en/articles/lemonade-strix-halo-verification.



Tier 5 — the parallel reports, and what was not imported [Addendum]

[Addendum] Three reports against the same directive were compared with this one on 2026-08-23. deepseek-harness-strix-halo-spec-2026-08-23 (Codex / OpenAI; desk research, no machine access): accurate on Windows-capability classification, version currency and sources; it treated "Qwen3.8" as a typo for Qwen3-8B, so its model portfolio and KV table were not imported. DSH_Strix_Halo_Architecture_Spec_2026-08-23 (Grok / xAI; desk research): directionally right and the source of the Discussion #758 and FastFlowLM leads; Lemonade-as-primary and the Qwen3.8-2.4T-A95B option were not imported — the latter cannot fit in 128 GB at any useful quantisation (§12.1). DeepSeek_Harness_AMD_Strix_Halo_Architecture_Report (Gemini / Antigravity): its repository layout, plugin names, configuration schema, benchmark table and KV-cache formula do not match the pinned source tree or the model card and were not imported; its Windows 24H2 recommendation contradicts AMD's compatibility matrix (§9.1). Only the ROCm tuning-knob names, the Windows pre-flight items and the sandbox/native-binary claim (flagged unverified) were taken from it. Everything imported is tagged [Addendum] in the body and was independently verified unless stated otherwise.

