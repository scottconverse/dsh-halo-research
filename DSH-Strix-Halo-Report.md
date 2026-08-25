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


# 4. DSH current-state analysis

Pinned to commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`, read from a local clone.

## 4.1 Shape of the project

| Property | Value |
|---|---|
| Monorepo layout | `pnpm-workspace.yaml`; workspaces `vendor/*`, **`packages/*/*`**, `native/landlock-run`, `apps/*`, `website` |
| Package root | `packages/` contains **50 category directories**, each holding packages |
| Build | `tsdown`, TypeScript project references, `oxlint`, `lefthook`, `vitest` (7 separate vitest configs incl. e2e, web-stress, perf, snapshot) |
| Plugin framework | Cordis 4.x (`@deepseek-ai/cordis`) |
| Native code | `native/landlock-run` — a Node addon, Linux-only by name |
| Python | a `python/` directory and `pytest.ini` exist at root — a Python SDK surface |

The `packages/*/*` double glob is the single most misread thing about this repository. A flat
listing of `packages/` returns 50 entries, which are **categories**, not packages.

## 4.2 Entry point and profiles

`dsh` is a launcher over "profiles": an ordered stack of plugin-bundle patch layers with the
user's own overrides applied last.

```
Usage: dsh [options] [command] [args...]

  --profile <name>          the profile under $DSH_HOME/profiles to boot
  --patch <path>            extra patch-list overlay applied after the profile layer
  --dump-config             print the composed profile tree and exit
  --dump-default-config     print the profile tree without its user layer or --patch overlays
```

Three bundles ship: `base`, `headless`, `web-app`. The `--dump-default-config` flag is the
authoritative way to answer "what is actually mounted", because it deliberately excludes the
user layer. **Every plugin count in this report was produced with it, or by parsing the bundle
patch files directly. The two methods agree.**

## 4.3 Composition, measured three ways

| Question | Answer | Method |
|---|---|---|
| How many packages exist in the repo? | **227** (225 published, 2 private) | walked `packages/*/*/package.json` |
| How many does the `dsh` CLI directly depend on? | **62** (59 first-party + `commander`, `js-yaml`, `node-addon-require-builtin`) | npm packument for `@deepseek-ai/dsh@0.1.1-rc.2` |
| How many compose into the stock **web** profile? | **133** | `dsh --profile web --dump-default-config` |
| How many compose into the stock **headless** profile? | **78** | bundle patch parse (`base` 76 + `headless` 2) |

So roughly **94 of the 227 packages are not in the stock web profile at all.** They are
alternates (a different sandbox backend, a different search provider, a different subagent
driver), test support, or infrastructure.

> **On "200+ plugins".** The claim is defensible only as "packages published under the
> `@deepseek-ai` scope". It is not the number of things a user can exercise, and it is not the
> number that load. When sizing work against this platform, **133** is the number that matters
> for the web profile.

## 4.4 Node and package manager

`engines.node` is `^22.19.0 || >=24.0.0`. This box runs **Node 25.9.0** — satisfied.

The repo declares `packageManager: pnpm@11.7.0`; the box has pnpm 11.22.0. The README's
quick-start is `npx @deepseek-ai/dsh web`. **On this machine `pnpm dlx` should be preferred
over `npx`** — see §6.5, which records a reproducible npm-resolver problem. This is a
machine-specific finding, not an upstream defect.

---

# 5. DSH capability inventory

The 50 categories, with package counts, from the pinned tree:

| Category | n | Category | n | Category | n |
|---|---|---|---|---|---|
| client | 40 | fs | 7 | attachment | 2 |
| session | 13 | util | 7 | boot | 2 |
| subagent | 11 | context | 6 | experimental | 2 |
| shell | 10 | examples | 6 | feedback | 2 |
| core | 8 | test-support | 6 | guard | 2 |
| host | 8 | web | 6 | preset | 2 |
| fs | 7 | interaction | 5 | settings | 2 |
| compaction | 4 | llm | 5 | subprocess | 2 |
| goal | 4 | code-runtime | 3 | acp | 1 |
| session-query | 4 | credentials | 3 | identity | 1 |
| sandbox | 4 | e2b | 3 | mcp | 1 |
| skill | 4 | examples | 3 | plan | 1 |
| storage | 4 | hooks | 3 | runtime-diagnostics | 1 |
| typert | 4 | jobs | 3 | schedule | 1 |
| workflow | 4 | lsp | 3 | todo | 1 |
| extensions | 4 | sdk | 3 | workspace | 1 |
| bundle | 3 | spill | 3 | api | 2 |
| | | terminal | 3 | | |

## 5.1 Capability map — what is genuinely there

Grouped by the directive's categories. **Bold** = mounted in the stock web profile.

| Capability | Packages |
|---|---|
| Filesystem | **`fs-local`**, **`fs-sandbox`**, **`tool-fs`**, **`tool-fs-search`**, `file-reference-local` |
| Code editing | **`tool-str-replace-editor`** |
| Shell / process | **`tool-bash`**, **`tool-pwsh`**, **`bash-sandbox`**, **`pwsh-sandbox`**, `bash-local`, `pwsh-local`, `tool-bash-persistent`, `tool-pwsh-persistent`, `shell-env`, `terminal`, `terminal-bash` |
| Sandbox / security | **`sandbox-local`**, **`sandbox-policy`**, **`permission-presets`**, `sandbox`, `sandbox-windows-acl` |
| Providers / models | **`llm`**, **`llm-pi-ai`**, **`llm-deepseek`**, **`llm-retry`**, **`token-meter`** |
| Web / search | **`web-search-deepseek`**, `web-search-exa`, `web-search-perplexity`, `web-fetch-http`, `tool-web` |
| MCP | `mcp-client` — **not mounted by default** |
| Skills | **`skill`**, **`skill-filesystem`**, **`tool-skill`**, `skill-badge` |
| Subagents / delegation | **`tool-subagent`**, **`tool-subagent-control`**, `subagent-claude-code`, `subagent-codex`, `subagent-acp`, `subagent-dsh-sdk`, `subagent-fork-in-process`, `subagent-spawn-in-process`, `tool-subagent-report` |
| Planning / goals | **`plan-mode`**, **`goal`**, **`goal-round-driver`**, **`command-goal`**, **`tool-goal`**, **`tool-todo`** |
| Workflow / loops | **`tool-workflow`**, **`workflow-worker-thread`**, **`tool-ralph`**, `workflow` |
| Code Mode | **`code-runtime-worker-thread`**, `code-runtime`, `code-runtime-python` |
| Context / compaction | **`compaction-basic`**, **`compaction-tool-result-pruner`**, **`command-compact`**, **`agent-instructions`**, **`time-context`**, **`spill-local`**, `spill-policy`, `tmux-context` |
| Session / replay | **`session`**, **`session-projection`**, **`session-reference`**, **`session-log-export`**, **`session-stats`**, **`session-query-sqlite`**, **`session-title`** |
| Jobs / scheduling | **`jobs-local`**, **`tool-jobs`**, **`schedule`** |
| Storage | **`storage`**, **`storage-json`**, **`storage-domain`** |
| Host / UI | **`web-app`**, **`host-webserver`**, **`host-apiproxy`**, **`host-plugin-inventory`**, 38 `client-ui-*` packages |
| LSP | `lsp` ×3 — **not mounted by default** |
| Remote sandbox | `e2b` ×3 — **not mounted by default** |

### The notable ones

- **`subagent-claude-code` and `subagent-codex` exist.** DSH can delegate to other harnesses
  as subagents. Not mounted by default.
- **`code-runtime-python`** — Code Mode has a Python runtime, not just a worker thread.
- **`session-query-sqlite`** is mounted: sessions are queryable, not just replayable.
- **`tool-ralph`** — a dedicated loop-until-done driver.
- **`spill-*`** — context spilling to keep large bodies out of the window.
- **`token-meter`** — real token accounting, mounted by default.

---

# 6. DSH Windows compatibility audit

## 6.1 Windows is a first-class target in the source

Signal counts across `packages/**` at the pinned commit:

| Pattern | Matches |
|---|---|
| `win32` | 865 |
| `pwsh` | 555 |
| `landlock` | 177 |
| `bwrap` / `bubblewrap` | 148 |
| `process.platform` | 157 |
| `powershell` | 123 |
| `seatbelt` | 113 |
| `AppContainer` / restricted token | 87 |
| `icacls` | 23 |
| **`WSL`** | **0** |

Zero WSL references anywhere in `packages/`. DSH does not treat WSL as its Windows story.

## 6.2 The Windows sandbox is real

`packages/sandbox/sandbox-local/src/index.ts:2-3` documents the runner chain explicitly:

> "It selects the platform runner chain (Linux bwrap then Landlock; macOS Seatbelt; Windows
> the ACL restricted-token runner), functionally probes …"

Selection is a functional probe, not a platform guess — `SelectedRunner` is typed
`'bwrap' | 'landlock' | 'seatbelt' | 'windows-acl'`.

`@deepseek-ai/dsh-sandbox-windows-acl` describes itself as a *"Windows ACL write-restriction
sandbox backend (restricted-token spawn with capability-SID write allowlist)"*. It is ~115 KB
across 12 files including `ffi.ts` (23.1 KB), `win32-abi.ts` (13.2 KB), `token.ts` (11 KB) and
`acl.ts` (13.1 KB), calling `GetNamedSecurityInfoW` / `SetEntriesInAclW` and building
`EXPLICIT_ACCESS` entries against a capability SID.

**Verdict: CONFIRMED NATIVE WINDOWS.** This is a genuine implementation, not a stub.

## 6.3 Permission modes

From the composed default web tree:

```yaml
- id: sandbox-policy
  name: '@deepseek-ai/dsh-sandbox-policy'
  config:
    mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'
- id: permission
  name: '@deepseek-ai/dsh-permission-presets'
  # presets expose: read-only | workspace-write | danger-full-access
```

**The stock default is `workspace-write` — confined.** `danger-full-access` is an opt-out that
a single environment variable can set for every session. See §21.3.

## 6.4 Windows compatibility matrix

Applied to the **133** packages in the stock web profile, and to significant non-default ones.

| Status | Capabilities |
|---|---|
| **CONFIRMED NATIVE WINDOWS** | `sandbox-windows-acl` (Win32 FFI), `pwsh-sandbox`, `tool-pwsh`, `fs-local`, `fs-sandbox`, `tool-fs`, `tool-str-replace-editor`, `host-webserver`, `web-app` + all 38 `client-ui-*`, `session*`, `storage*`, `llm*`, `token-meter`, `jobs-local`, `schedule` |
| **REQUIRES CONFIGURATION** | `llm-pi-ai` — needs a provider block for any local server (§18); `web-search-deepseek` — needs a key |
| **DEPENDENT ON EXTERNAL SOFTWARE** | `session-query-sqlite` (SQLite binding), `code-runtime-python` (Python — present, 3.13.5) |
| **CORRECTLY PLATFORM-GATED** | `tool-bash` + `bash-sandbox` — present in the tree but **`disabled` on `win32`** at every layer; `tool-pwsh` + `pwsh-sandbox` are the active pair. See §6.5 |
| **NOT APPLICABLE ON WINDOWS** | `node-addon-landlock-run`, Landlock/bwrap/Seatbelt probes (correctly bypassed by the chain) |
| **UNKNOWN — MUST TEST** | `lsp` ×3, `mcp-client`, `e2b` ×3, `subagent-claude-code`, `subagent-codex`, `tmux-context` (tmux does not exist natively on Windows) |

## 6.5 The bash seam — a corrected finding

> **This section previously reported a high-severity containment defect (D-1). That finding was
> wrong, and it is retracted here rather than quietly deleted.**

### What was claimed, and why it was wrong

An earlier pass of this report asserted that `tool-bash` and `bash-sandbox` were *mounted* in
the stock web profile, and that because `bash` on this box resolved to a failing WSL alias, DSH
tool calls would either fail or — if WSL were ever repaired — silently escape the Windows ACL
sandbox into a Linux VM.

The error was methodological: the check matched **package names** in the composed plugin list
and never read the **`disabled` key on the row**. Presence in the tree is not the same as being
active, which is precisely the distinction §4.3 makes about plugin counts — applied to counting,
and then not applied to this.

### What the source actually says

`packages/bundle/base/cordis.patch.yml`:

```yaml
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
```

The web-app bundle then disables the *host-level* `tool-bash` and `tool-pwsh` rows outright
(`disabled: true`), because agent presets own the model-facing tool rows. And the agent presets
deployed on this machine repeat the same platform gate:

```yaml
# ~/.dsh/.agent-presets/halo-standard/agent.cordis.yml:44
- id: tool-bash
  name: '@deepseek-ai/dsh-tool-bash'
  disabled: !!js process.platform === 'win32'
```

**On Windows, the agent is given `tool-pwsh` backed by `pwsh-sandbox`, and no bash tool at all.
The gate holds at the base bundle, the mode bundle, and the preset.**

### Revised verdict

**There is nothing to fix, and nothing to disable.** DSH's Windows story here is more careful
than the earlier draft credited: the bash seam is platform-gated at three independent layers,
and the Windows-native PowerShell seam is the one that is actually wired up. This is a **point
in the platform's favour**, not a defect.

The state of `bash.exe` on the host is therefore irrelevant to DSH containment. It was still a
real machine fault in its own right — see §6.7.

### D-2 — `tmux-context` cannot work natively

`tmux` does not exist on native Windows. The package is **not** in the stock web composition,
so this is latent rather than live — but any profile that adds it will not function.

## 6.6 Missing supporting binaries

`rg` (ripgrep) and `fd` are **absent** from PATH. `tool-fs-search` is mounted; whether it
shells out to ripgrep or uses a bundled implementation is **UNKNOWN — MUST TEST**. Installing
ripgrep is cheap insurance either way (`scoop install ripgrep`).

## 6.7 A real machine fault, found while chasing the retracted finding — and fixed

Independent of DSH, this box had a genuinely damaged WSL installation.

**Symptom.** `bash` on PATH failed with *"The file cannot be accessed by the system."*

**First (wrong) reading.** That the `bash.exe` App Execution Alias stub was a broken 0-byte
reparse point. It is 0 bytes with no visible link target — but **so is every working alias**,
including `winget.exe`, `notepad.exe` and `wsl.exe`. Stub size proves nothing.

**Diagnosis that actually isolated it.** Invoke the alias stubs *directly by full path*, so PATH
order cannot mask the result:

| Alias stub | Owning package status | Result |
|---|---|---|
| `winget.exe` | `Microsoft.DesktopAppInstaller` — **Ok** | **works** |
| `wsl.exe` | `MicrosoftCorporationII.WindowsSubsystemForLinux` — **Modified, NeedsRemediation** | **fails** |
| `bash.exe` | same package | **fails** |

The alias *mechanism* was healthy. **Both aliases belonging to the WSL package were dead, and
Windows had already flagged that package `Modified, NeedsRemediation`.** `wsl` appeared to work
only because a real `C:\windows\system32\wsl.exe` exists and wins on PATH before the alias is
ever consulted — so the damage was invisible from the command that would normally reveal it.

**The fix that was rejected.** Putting `C:\Program Files\Git\bin` on PATH ahead of
`WindowsApps` so `bash` would resolve to Git Bash. It would have made the symptom disappear
while leaving the damaged package in place — and `Git\bin` carries ~40 msys binaries
(`find.exe`, `sort.exe`, `echo.exe`, `tee.exe`) that shadow Windows built-ins. Git's own
installer defaults to `Git\cmd` precisely to avoid this. **A symptom-level shim that introduces
a known footgun is not a fix.**

**The fix applied.** `wsl --update` — Microsoft's supported remediation path:

| | Before | After |
|---|---|---|
| WSL package version | 2.6.3.0 | **2.7.12.0** — latest stable (released 2026-08-18) |
| Package status | **Modified, NeedsRemediation** | **Ok** |
| **WSL2 kernel** | **6.6.87.2** | **6.18.33.2** |
| WSLg | 1.0.71 | 1.0.73.2 |
| `bash.exe` alias | fails | **works** |
| `bash` from a fresh shell | fails | **works** (WSL bash) |
| Ubuntu distro | Stopped, intact, **WSL version 2** | intact, **WSL version 2** |
| User `PATH` | — | **byte-identical, never modified** |

Distros are separate from the WSL system package, so nothing was lost. **This is the only
change made to the machine's configuration in this entire investigation** (see §16.3 for the
full list, including the reverted runtime experiment).

### An unplanned consequence worth recording

The repair moved the WSL2 kernel from **6.6.87.2 to 6.18.33.2** — a major jump, because the
damaged package had been stuck.

That crosses a threshold this report cares about. AMD's Strix Halo optimization guidance states
that **gfx1151 requires Linux `6.18.4` or later** on distributions without a vendor-patched
kernel (with packaged alternatives at Ubuntu 24.04 HWE `6.17.0-19.19~24.04.2`+ or OEM
`6.14.0-1018`+). The previous 6.6.87.2 kernel was far below every one of those floors; 6.18.33.2
clears the general one.

**This does not make ROCm-in-WSL a recommendation** — §19.2 still rejects making WSL the primary
execution environment, GPU access inside WSL goes through `/dev/dxg` paravirtualization rather
than the native driver path, and none of that was tested here. It does mean the *kernel* is no
longer the blocker if the Linux lane is ever wanted for comparison work. Recorded as an
observation, not a plan.

WSL is on the **stable** channel. A `2.9.4` pre-release exists (WSL Containers, public preview);
it is **not** recommended, on the same reasoning §15 applies to Windows Insider builds — no
identified gain for this workload.

## 6.8 `bash` made fully conformant — the second half of the fix

Repairing the WSL package (§6.7) made `bash` *run*, but it did not make it *correct*. A
conformance battery (`bench/Test-BashConformance.ps1`, 9 behaviours) found the Microsoft
`bash.exe` App Execution Alias failing two of them **silently** — returning empty rather than
erroring, which is the worse failure mode:

```bash
bash -c 'echo $1' _ hello      # printed nothing — trailing args dropped
echo hi | bash -c 'read x'     # x empty — piped stdin dropped
```

Both reproduce from PowerShell and from `cmd.exe`, and both work through `wsl -e bash`, so the
defect is the alias, not the harness. `WindowsApps\bash.exe` is Microsoft's **deprecated
WSL1-era entry point**, superseded by `wsl.exe`; this is a limitation of a legacy shim rather
than a configuration error.

### Candidates, measured rather than argued

| Candidate | Score | Outcome |
|---|:-:|---|
| MS `bash.exe` alias (as found) | **7/9** | drops `-c` trailing args and piped stdin |
| Git Bash (`Git\bin\bash.exe`) directly | **9/9** | correct, but different semantics — see below |
| `wsl -e bash` | **9/9** | correct |
| `.cmd` shim → `wsl -e bash` | **7/9** | fixes args and stdin, **breaks quoting** (`echo "a b"` → `a`) |
| Compiled shim → `WindowsApps\wsl.exe` | **3/9** | the `wsl` alias is a poor forwarder too |
| **Compiled shim → `Sysnative\wsl.exe -e bash`** | **9/9** | **installed** |

Two earlier instincts were wrong and the battery caught both. Putting `Git\bin` on `PATH` was
rejected for dragging ~40 msys binaries that shadow Windows built-ins — correct, but the
narrower objection is that it was never necessary. And the `.cmd` shim, which seemed the obvious
fix, **trades one silent failure for another**: it repairs arguments and stdin while corrupting
quoted strings.

### What was installed

```
C:\Users\scott\.local\bin\bash.exe    (compiled forwarder, 136 KB)
C:\Users\scott\.local\bin\bash.shim   path = "C:\Windows\Sysnative\wsl.exe"
                                      args = -e bash
```

Three deliberate choices:

- **`Sysnative`, not `System32`.** The forwarder is a 32-bit binary, so `System32` is
  WOW64-redirected to `SysWOW64`, where `wsl.exe` does not exist — the shim reported
  *"Could not create process"* until the path was changed. `Sysnative` is the documented escape
  hatch for exactly this.
- **`.local\bin`, not `scoop\shims`.** It sits on the user `PATH` at index 3, ahead of
  `WindowsApps` at index 9, and is **not** scoop-managed, so a scoop update cannot remove it.
  It is also outside `%LOCALAPPDATA%`, which matters on this box for reasons unrelated to WSL.
- **WSL bash, not Git Bash.** Both score 9/9, but they are not interchangeable: WSL bash sees
  `/mnt/c/...` and Git Bash sees `/c/...`. `bash` already meant WSL bash here, so preserving
  that avoids silently changing the filesystem namespace under anything that already calls it.
  Git Bash remains available at its own path.

**Verified:** `where bash` from a fresh shell resolves to the shim first; 9/9 conformance
against PATH-resolved `bash`; quoting, nested quotes, paths containing spaces, multi-argument
passing, exit codes and Windows-drive read/write all correct; `wsl`, Git Bash and the (now
shadowed, not deleted) MS alias all still work; and the user `PATH` is **byte-identical** to the
backup — nothing was added to it.

### One property worth knowing, which predates this change

`bash` runs as **root** (`uid=0`) inside the distro, because `/etc/wsl.conf` has no `[user]`
section — even though a `scott` account (uid 1000) exists. This is how `wsl -e bash` already
behaved and is **not** a consequence of the shim. It is recorded rather than changed: the
one-line fix is a `[user]\ndefault=scott` block in `/etc/wsl.conf`, but files already created
under `/root` would stop being reachable by default, and this distro reportedly hosts other
work. **That call belongs to the operator, not to this report.**


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


# 10. Vulkan versus ROCm — measured on this machine

This is the section the directive cares most about, and the one where secondary sources are
least trustworthy. Everything below was measured on the target machine on 2026-08-23.

## 10.1 Why this comparison is unusually clean

Both backends are the **same llama.cpp version, 2.29.1**, shipped as interchangeable LM Studio
runtime extensions. Only the backend changed between runs:

| Held constant | Value |
|---|---|
| Model | `unsloth/Qwen3.8-27B-GGUF/Qwen3.8-27B-UD-Q5_K_XL.gguf` |
| Quantization | Q5_K_XL (5-bit), 21.15 GB on disk, 19.69 GiB loaded |
| Context length | 131,072 |
| `parallel` | 1 |
| llama.cpp | **2.29.1 on both sides** |
| Sampling | `temperature = 0` |
| Output cap | 192 tokens |
| Machine state | VGM 64 GB, driver 32.0.31035.1003, nothing else driving the GPU |

Method: an HTTP ladder over the OpenAI-compatible endpoint, each rung prefixed with a **unique
GUID nonce** so no rung is served from a previous rung's prompt cache, preceded by a **discarded
warm-up** request so no rung pays a model reload inside TTFT. Both backends ran the identical
script, and nothing else touched the server during either run.

> **Three runs were discarded before these were accepted.** The first shared a prompt prefix
> across rungs and measured the prompt cache (inflating marginal prefill by ~71 %). The second
> and third were contended — interactive probes were issued against the same single-slot server
> mid-run. Only uncontended, cache-defeated, warmed runs appear below. The discarded CSVs are
> kept in `evidence/` deliberately.

## 10.2 Results

The 8 KB and 32 KB rungs were run **four times on each backend** (`n = 4`) and are reported as
mean ± sample standard deviation. The 64 KB and 256 KB rungs remain **`n = 1`** and are labelled
as such throughout — see §10.6.

### Time to first token (lower is better)

| Prompt | Prompt tokens | n | Vulkan | ROCm | ROCm advantage | Separation |
|---:|---:|:-:|---:|---:|---:|---:|
| 8 KB | ~1,488 | **4** | 22.600 ± 0.115 s | **7.715 ± 0.025 s** | **2.93×** | **179 sd** |
| 32 KB | ~5,654 | **4** | 44.392 ± 0.072 s | **21.218 ± 0.328 s** | **2.09×** | **98 sd** |
| 64 KB | ~11,211 | 1 | 76.884 s | **41.558 s** | 1.85× | *unreplicated* |
| 256 KB | ~44,531 | 1 | 278.536 s | 244.161 s | 1.14× | *unreplicated, confounded — §10.6* |

### Marginal prefill throughput

The slope between rungs, which removes the large fixed per-request overhead that contaminates a
naive `prompt_tokens ÷ TTFT`. **This is the honest prefill number.**

| Segment | n | Vulkan | ROCm | ROCm advantage |
|---|:-:|---:|---:|---:|
| **8 KB → 32 KB** | **4** | **191.1 ± 0.4 tok/s** (cv 0.21 %) | **308.7 ± 7.3 tok/s** (cv 2.36 %) | **+61.5 %, 23 sd** |
| 32 KB → 64 KB | 1 | 170.9 tok/s | 269.3 tok/s | +58 % *(unreplicated)* |
| 64 KB → 256 KB | 1 | 165.2 tok/s | 164.5 tok/s | −0.4 % *(unreplicated, confounded)* |

### Decode throughput (higher is better)

| Prompt | n | Vulkan | ROCm | Vulkan advantage | Verdict |
|---:|:-:|---:|---:|---:|---|
| 8 KB | **4** | **16.05 ± 0.24** (cv 1.5 %) | 14.03 ± 1.26 (cv **9.0 %**) | +14.4 % | **suggestive only — 2.2 sd** |
| 32 KB | **4** | **15.35 ± 0.67** (cv 4.3 %) | 12.23 ± 0.49 (cv 4.0 %) | +25.6 % | **decisive — 5.3 sd** |
| 64 KB | 1 | 16.2 | 11.9 | +36 % | *unreplicated* |
| 256 KB | 1 | 14.8 | 7.2 | +106 % | *unreplicated, confounded* |

> **A single-run claim that did not survive replication.** The first draft of this report stated
> that Vulkan wins decode at 8 KB "by 21 %", from one run of each. With `n = 4` the gap is
> **14.4 %** and only **2.2 standard deviations** — suggestive, not decisive. One ROCm repeat
> returned 15.9 tok/s, statistically on top of Vulkan's 16.05 mean. **The corrected claim is that
> Vulkan's decode is modestly faster and far more *consistent*, not that it is decisively faster
> at short context.**

## 10.3 What this says

**Q10 — does Vulkan outperform ROCm?**
**On decode, yes — but by less than first reported, and only decisively from 32 KB upward.**
At 8 KB the gap is 14.4 % at 2.2 sd (suggestive). At 32 KB it is 25.6 % at 5.3 sd (decisive).
Vulkan's larger and more reliable advantage is **consistency**: its 8 KB decode has a coefficient
of variation of **1.5 %** against ROCm's **9.0 %** — ROCm's decode is roughly six times noisier
run to run.

**Q11 — where does ROCm outperform Vulkan?**
**On prefill, decisively, and by a wide margin in the band an agent actually occupies.** At 8 KB
it is **2.93× faster** to first token (179 sd); at 32 KB, **2.09×** (98 sd); marginal prefill is
**+61.5 %** (23 sd). These are the most solid numbers in this report — the coefficient of
variation on Vulkan's marginal prefill is **0.21 %**.

**The advantage appears to fade at long context, but that measurement is not trustworthy.**
The 64 KB→256 KB segment shows 165.2 vs 164.5 tok/s — apparent parity — from **one run each**,
and the ROCm run executed with the machine at **1.55 GB of free RAM**. Memory pressure is a
plausible cause of that degradation, which means the "parity at 45 K" and "decode collapses to
7.2 tok/s" findings may be *consequences of the memory behaviour rather than independent
results*. **They are retained as observations and explicitly not relied upon.** §10.6.

Against community reports **[community]** (ROCm ≈ +20.6 % prompt processing, ≈ −24.6 %
generation): the decode penalty brackets their figure well at 32 KB, while the prefill advantage
measured here is **three times larger** than theirs. The claim that ROCm "uses less memory than
Vulkan" is contradicted at every workload measured here (§10.4).

## 10.4 The memory measurement

Sampled from the OS's own `\GPU Process Memory(*)` counters — **telemetry independent of
LM Studio and of the benchmark script** — at matched workloads on each backend.

| Workload | Vulkan | ROCm | Ratio |
|---|---:|---:|---:|
| Model loaded, idle | 26.73 GiB | — | — |
| **After the 32 KB rung** (n=1 Vulkan, **n=3 ROCm**) | **29.35 GiB** | **46.60 GiB** | **1.59×** |
| After the 45 K-token rung (n=1 each) | 29.35 GiB | **78.39 GiB** | 2.67× |
| Free system RAM, 45 K-token rung | 18.42 GB | **1.55 GB** | — |
| Shared (non-local) GPU memory | 0 GiB | 0 GiB | — |

The correct statement is not a single ratio. It is a difference in **shape**:

- **Vulkan's footprint is flat.** 29.35 GiB after a 32 KB prompt and 29.35 GiB after a 45 K-token
  prompt — because llama.cpp preallocates the whole KV cache at load (§8.4). Prompt size does not
  move it.
- **ROCm's footprint grows with the prompt.** 46.60 GiB at 32 KB, rising to 78.39 GiB at 45 K
  tokens, sampled mid-rung at 64.79 → 69.57 → 78.39 GiB, eventually exceeding the 63.83 GiB
  dedicated carve-out and driving free system RAM to **1.55 GB**.

**The 46.60 GiB figure was identical across all three ROCm repeats** — this is a reproducible
structural property, not a transient. And critically, **it appears at ordinary prompt sizes**, so
it is not an artefact of the extreme 256 KB rung.

Three consequences:

1. **This directly contradicts the community claim** that ROCm uses *less* memory than Vulkan.
   That claim almost certainly describes **Linux**, where AMD's GTT-based model applies (§8.2).
   On Windows the memory model is different, and the claim does not transfer. This is precisely
   the Linux→Windows substitution the directive warns against.
2. **It is a stability hazard on a working machine.** 1.55 GB of free RAM on a box also running
   a browser, an IDE and the harness is the edge of thrashing.
3. **It caps headroom.** A second resident model would not fit alongside ROCm's working set,
   which removes the multi-model portfolio §13.2 wants.

The mechanism was not isolated. The plausible cause is HIP compute-buffer sizing scaling with
batch; community evidence points at `GGML_HIP_NO_VMM=ON` as a related HIP VMM defect on this
GPU **[community]**, but LM Studio's runtime does not expose that flag, so it could not be
tested here. **Recorded as an open unknown (§27), not as an explanation.**

## 10.5 Verdict and the selected backend

**Vulkan is the default on this machine. ROCm is an experimental lane with a narrow, real use.**

| | Vulkan | ROCm | Confidence |
|---|---|---|---|
| Prefill, 1.5 K tokens | slower | **2.93× faster** | n=4, 179 sd |
| Prefill, 5.7 K tokens | slower | **2.09× faster** | n=4, 98 sd |
| Marginal prefill 8→32 KB | 191.1 tok/s | **308.7 tok/s (+61.5 %)** | n=4, 23 sd |
| Decode, 8 KB | **16.05 tok/s** | 14.03 tok/s | n=4, **2.2 sd — suggestive only** |
| Decode, 32 KB | **15.35 tok/s** | 12.23 tok/s | n=4, 5.3 sd |
| Decode consistency | **cv 1.5 %** | cv 9.0 % | n=4 |
| GPU memory at 32 KB | **29.35 GiB** | 46.60 GiB (**1.59×**) | ROCm n=3, identical each time |
| GPU memory at 45 K tokens | **29.35 GiB — flat** | 78.39 GiB, **growing** | n=1 |
| Free system RAM, long rung | **18.42 GB** | 1.55 GB | n=1 |
| Headroom for a second model | **yes** | no | — |
| **Verdict** | **BUILD NOW — default** | **EXPERIMENTAL LANE** | |

**The honest summary, after replication:** ROCm wins prefill decisively and by a large margin —
that is the most solid result in this report. It loses decode, though by less than first stated
and only decisively from 32 KB up, and its decode is six times noisier. It costs **1.59× the GPU
memory at ordinary prompt sizes**, and unlike Vulkan its footprint **grows with the prompt**
rather than staying flat.

**The deciding factor is memory shape, not throughput.** A backend whose working set scales with
prompt size, on a machine where the carve-out is fixed at 64 GB and other software is resident,
cannot be the default — however fast its prefill. Vulkan's flat 29.35 GiB is what leaves room for
a second model (§13.2) and for the rest of the desktop.

**The machine was returned to Vulkan.** Verified after restore: runtime
`llama.cpp-win-x86_64-vulkan-avx2@2.29.1` selected; `qwen/qwen3.8-27b` resident at Q5_K_XL,
`contextLength 131072`, `parallel 1`; 19.22 GB system RAM free; 29.25 GiB GPU local. See §16.3.

### Where ROCm would still be the right choice

Its band of advantage is real and matches a genuine workload shape: **many short-to-moderate
turns, each with a fresh 2–10 K prompt, where time-to-first-token dominates and total context
stays small.** A subagent fleet doing classification or triage looks exactly like that.

**T-10 — the highest-value follow-up on this box:** load the model on ROCm at a **32 K context
limit** rather than 131 K, re-measure the footprint, and re-run the 8–32 KB rungs. If the
working set stays under ~40 GiB, a ROCm profile becomes a legitimate second lane for
short-prompt work while Vulkan serves the long-context main thread. That is the one experiment
most likely to change this recommendation.

## 10.6 Statistical limitations — what is and is not established

An earlier draft of this section reported every figure from **a single run per rung per
backend**, with no variance and no confidence statement. That was not sufficient to support the
strength of the language used. This section records what replication changed.

### What was done

`bench/Bench-Local.ps1` was re-run to give **`n = 4` per backend** at the 8 KB and 32 KB rungs
(the original accepted run plus three repeats each). `bench/Compute-BenchStats.ps1` aggregates
the accepted CSVs, computes mean/sd/cv, and expresses each backend difference in **units of
measured noise** (pooled standard deviations), classifying anything under 2 sd as *within noise*
and under 3 sd as *suggestive only*. Both scripts are in the research directory; the discarded
runs are excluded by label and kept on disk.

The 256 KB rung was **deliberately not repeated**. On ROCm it drove a live machine to 1.55 GB of
free RAM, and re-running that on a box serving other work was not an acceptable trade.

### What replication changed

| Claim in the first draft | After `n = 4` |
|---|---|
| "ROCm 2.92× faster to first token at 8 KB" | **Held** — 2.93×, 179 sd |
| "+65 % marginal prefill" | **Slightly overstated** — +61.5 % (the single run had caught the high end, 315.7 vs a 308.7 mean) |
| "Vulkan wins decode by 21 % at 8 KB" | **Overstated** — 14.4 %, and only **2.2 sd**. Suggestive, not decisive |
| "ROCm uses 2.7× the GPU memory" | **Workload-dependent** — 1.59× at 32 KB, 2.67× at 45 K tokens. The real finding is *flat vs growing* |
| Decode reliability | **New finding** — ROCm's 8 KB decode cv is **9.0 %** against Vulkan's **1.5 %** |

### What remains unreplicated or confounded

1. **The 64 KB and 256 KB rungs are `n = 1` on both backends.** Every number derived from them —
   including the 1.85× at 64 KB, the "parity at 45 K tokens", and the "+106 % decode" — carries
   no error bar.
2. **The 256 KB ROCm rung is confounded.** It executed with the machine at 1.55 GB free RAM.
   Memory pressure plausibly caused the prefill parity and the decode collapse observed there,
   which would make them *effects of the memory behaviour rather than independent findings*.
   The first draft presented them as separate corroborating evidence. **They are not.**
3. **Memory figures are point samples**, not a time series. They are taken from the OS's
   `\GPU Process Memory(*)` counters — independent of LM Studio and of the benchmark — but
   sampled at the end of a rung rather than continuously. The mid-rung progression
   (64.79 → 69.57 → 78.39 GiB) is three opportunistic samples, not a trace.
4. **One machine, one model, one quantization, one driver.** Nothing here generalises to other
   Strix Halo units, other models, or other driver versions.
5. **TTFT is not pure prefill.** It includes request setup and scheduling. The marginal-slope
   method removes the fixed component but a `llama-bench` microbenchmark (**T-5**) would isolate
   prefill properly, and has not been run.

### What the verdict actually rests on

**Not** the long-context numbers, which are the weakest evidence in the section. It rests on two
results that replicated cleanly at `n = 4`:

- ROCm's prefill advantage in the 1.5 K–5.7 K band is real, large, and reproducible.
- ROCm's memory footprint at an **ordinary 32 KB workload** is 1.59× Vulkan's, identical across
  three repeats, and grows with prompt size where Vulkan's does not.

The second is what makes Vulkan the default. It was measured at a benign workload, so it does not
depend on the confounded long-context rung at all.


# 11. Local inference-server comparison

## 11.1 The requirement DSH actually imposes

From `docs/user/guide/providers.md` at the pinned commit, a server is usable by DSH if it:

1. answers OpenAI Chat Completions (`api: openai-completions`), OpenAI Responses, or
   Anthropic Messages;
2. accepts a bearer credential (which may be a dummy for a local server);
3. optionally answers `GET {baseURL}/models` for discovery — and DSH degrades gracefully
   without it ("enter models manually for endpoints that do not provide it").

DSH is explicit that most gateways get something wrong, and it ships two named switches for
the two most common failures:

> "A model that declares reasoning has its system prompt sent as `role: "developer"`, which
> many gateways reject outright, and the output cap is sent as `max_completion_tokens`, which
> a server that only knows `max_tokens` refuses."

**Both were tested against LM Studio on this machine, and both passed:**

| Probe | Result |
|---|---|
| `role: "developer"` accepted | **ACCEPTED** (`finish_reason: length`, 83 tokens) |
| `max_completion_tokens` honoured | **ACCEPTED** (`completion_tokens: 24`) |

**Therefore no `compat` block is required for LM Studio.** This is measured, not assumed.

## 11.2 Candidate comparison

| | **LM Studio** | **llama-server** | **Lemonade** | **Ollama** |
|---|---|---|---|---|
| Installed here | **yes**, serving :1234 | no | no | no |
| OpenAI Chat Completions | **verified on this box** | yes | yes | yes |
| `GET /models` | **verified — 34 models listed** | yes | yes | yes |
| `developer` role | **verified accepted** | UNKNOWN | UNKNOWN | UNKNOWN |
| `max_completion_tokens` | **verified accepted** | UNKNOWN | UNKNOWN | UNKNOWN |
| Vulkan backend on this GPU | **yes, running** | yes | yes | yes |
| ROCm backend for gfx1151 on Windows | **yes — v2.29.1 available** | build-it-yourself | yes | limited |
| Backend switching without rebuild | **yes — `lms runtime select`** | no, separate builds | yes | no |
| Model hot-swap / load / unload | **yes — `lms load`/`unload`** | one model per process | yes | yes |
| Multiple models resident | **yes** | multi-process only | yes | yes |
| Structured output / JSON schema | yes (grammar-based) **[community]** | yes (GBNF grammars) | yes **[community]** | weaker **[community]** |
| Tool calling | yes | yes | yes + MCP | weaker **[community]** |
| Authoritative residency query | **`lms ps --json`** | — | — | — |
| NPU path | no | no | **yes (hybrid)** **[community]** | no |

## 11.3 Recommendation

**Q6 / Q7 — LM Studio is the right choice here, and not merely because it is the easiest.**

The deciding factor is not convenience, it is that **LM Studio can switch the llama.cpp
execution backend without rebuilding anything**. On this machine:

```
llama.cpp-win-x86_64-vulkan-avx2@2.29.1     ← was selected
llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1   ← now installed
llama.cpp-win-x86_64-avx2@2.28.2            ← CPU fallback
```

Two backends at the **identical llama.cpp version**, swappable with one command. On a platform
where the Vulkan-vs-ROCm answer is workload-dependent (§10), that is a structural advantage
that llama-server cannot match without maintaining two builds, and it makes the comparison in
§10 methodologically clean.

Secondary reasons: `lms ps --json` is the only trustworthy residency/quantization readout found
in this investigation, and multiple models can stay resident — which §13's portfolio needs.

**Q8 — Is Lemonade advantageous here?** Not for the primary path today. Its distinguishing
feature is NPU/hybrid execution, and §14 concludes the NPU has no role in the primary LLM
workload. It belongs in the **EXPERIMENTAL LANE**, revisited if AMD's NPU story changes.

**Q9 — Is direct llama-server preferable?** No, for the workstation. It is the right tool for
a *microbenchmark* (`llama-bench` isolates prefill from TTFT far better than an HTTP ladder
can — see §10.4), and installing it for that purpose is recommended. It is not the right thing
for DSH to talk to.

---

# 12. Qwen3.8 analysis

## 12.1 The family, as it actually exists

Established from the Qwen model card and release records. Variants not listed here were not
found, and are not invented.

| Model | Released | Params | Type | Context | Licence |
|---|---|---|---|---|---|
| **Qwen3.8-27B** | **2026-08-14** | 27.78 B | **dense**, hybrid attention | **262,144** native, extensible to 1 M | **Apache 2.0** |
| Qwen3.8-2.4T-A95B | 2026-08-12 | 2.4 T total / ~95 B active | sparse MoE | — | open weights |
| Qwen3.8-Max | GA 2026-08-03 | undisclosed | hosted | 1 M | proprietary, hosted |

Only **Qwen3.8-27B** is relevant to this machine. The 2.4T-A95B is far beyond 128 GB at any
useful quantization, and Max is a hosted API.

## 12.2 Architecture — why this model suits this machine

> "64 layers … 16 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention → FFN))"

Three-quarters of the layers are **Gated DeltaNet** — linear attention with constant-size
state. Only 16 of 64 layers accumulate a growing KV cache.

Consequences, measured in §8.4:

- **KV cache at 131,072 context is ~5.6 GB**, against roughly 34 GB for a hypothetical
  conventional 27B with 64 full-attention layers.
- Long context is affordable *in memory* on a 128 GB box, and the constraint moves to prefill
  **time** rather than prefill **space**.
- It is a **native vision-language model** — text, images and video — under Apache 2.0.

## 12.3 The configuration on this machine

`lms ps --json`, the authoritative source:

```json
{ "identifier": "qwen/qwen3.8-27b",
  "path": "unsloth/Qwen3.8-27B-GGUF/Qwen3.8-27B-UD-Q5_K_XL.gguf",
  "sizeBytes": 21145786112, "architecture": "qwen35",
  "quantization": { "name": "Q5_K_XL", "bits": 5 },
  "contextLength": 131072, "maxContextLength": 262144,
  "vision": true, "trainedForToolUse": true, "parallel": 1 }
```

**Q21 — which quantization is the best compromise?** **Q5_K_XL**, and the current setting is
already right. At 21.15 GB it leaves the entire rest of a 64 GB carve-out free, decodes at the
speed measured in §10, and sits above the Q4 range where quality loss becomes visible in
code generation. Q6/Q8 would cost bandwidth — the binding constraint on this part — for a
smaller quality gain than Q4→Q5 delivers. The box also holds `q3_k_xl`, `q4_k_xl` and a `q6_k`
variant, so this is verifiable rather than theoretical.

**Q22 — what context length is actually useful?** **131,072 is the right operating setting**,
against a 262,144 maximum. Reasons: §8.4 shows the memory cost is affordable; §10 shows the
*time* cost of prefill is the real limit — a 45 K-token prompt already takes minutes. Raising
the window does not make long prompts affordable, it just permits them.

**Q23 — KV cache at 32 K / 64 K / 128 K / 256 K?** Measured total at 131 K is ~5.6 GB of
KV + compute buffers. Because 48 of 64 layers are constant-state, the growth is roughly linear
in the 16 attention layers only. A precise per-window table was **not** established — the
benchmark reached ~45 K tokens, not 256 K — and §20 lists the fill-the-window test that would
settle it. **Stated as UNKNOWN rather than extrapolated.**

## 12.4 Speculative decoding is already active — measured

A non-streaming request returned:

```json
"stats": { "total_draft_tokens_count": 5,
           "accepted_draft_tokens_count": 5,
           "rejected_draft_tokens_count": 0 }
```

**Q25 — does MTP/speculative decoding materially improve this workload? Yes, measurably.**
A 21.15 GB model on a ~256 GB/s bus has a hard decode ceiling near **12 tok/s** if every token
requires a full weight sweep. Measured decode on the accepted Vulkan runs is **14.8–16.4 tok/s**
(§10) — above that ceiling, which is only possible because multiple tokens are produced per
weight sweep. Draft acceptance was 5/5 on the sample observed.

This is important for the architecture: **the decode figure for this model is not
bandwidth-bound in the naive way**, and any capacity planning that assumes `bandwidth ÷ model
size` will understate it.

## 12.5 Agent-suitability notes

- `trainedForToolUse: true` and `vision: true` are asserted by the model metadata.
- **Thinking mode is on by default.** In a probe with `max_tokens: 8`, the response content was
  **empty** and `completion_tokens_details.reasoning_tokens` was **8** — the reasoning trace
  consumed the entire output budget. **Any DSH tool-calling configuration must budget output
  tokens well above the expected answer length, or tool calls will be truncated before they are
  emitted.** This is a concrete, measured failure mode.
- Qwen's own recommended sampling differs by mode: thinking `temperature=1.0, top_p=0.95,
  top_k=20`; instruct `temperature=0.7, top_p=0.80, top_k=20`. The benchmarks in §10 used
  `temperature=0` deliberately for reproducibility — that is a benchmark setting, **not** a
  recommended agent setting.
- Qwen documents max output of 262,144 tokens for reasoning content and 131,072 for the final
  response — far above anything a harness should actually allow.

---

# 18. DSH configuration for this machine

Config lives in `$DSH_HOME` (default `~/.dsh`): hand-written settings in
`$DSH_HOME/settings.yaml`, secrets in `$DSH_HOME/.credentials.yaml`. Model changes take effect
on the next request without restarting the server.

## 18.1 The provider block

Verified against `docs/user/guide/providers.md` and the two live compat probes in §11.1.

```yaml
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
```

Set `LMSTUDIO_API_KEY` to any non-empty string.

**No `compat:` block is needed.** §11.1 proves LM Studio accepts both `role: "developer"` and
`max_completion_tokens`. Add one only if a *different* server is introduced.

## 18.2 Containment

Leave the sandbox alone. The stock default is already `workspace-write`, resolved as
`process.env.DSH_PERMISSION_MODE ?? 'workspace-write'`.

**Do not set `DSH_PERMISSION_MODE=danger-full-access`.** Per
`docs/subsystems/sandbox.md`, that mode does not narrow confinement — it *bypasses* it
entirely: "A `danger-full-access` consumer spawns its original argv and does not call
`ctx.sandbox`." One environment variable silently disables every file-effect boundary for every
session, and nothing in the UI is obviously different afterwards.

**Known limitation, from upstream's own documentation:** on Windows the ACL runner reports
**`partial`** enforcement, not `full` — "the Windows ACL runner grants no explicit writable root
and reports partial enforcement for its ambient ACL gaps", with "Everyone/hard-link boundaries"
named as the current gaps. Windows containment here is real and worth having, but it is **not**
an absolute boundary and should not be treated as one.

## 18.3 The shell seam — leave it alone

**No patch is required here.** An earlier draft of this report instructed disabling `tool-bash`
and `bash-sandbox`; that instruction was based on a false finding and is **withdrawn**. See
§6.5.

Both rows carry `disabled: !!js process.platform === 'win32'` in the base bundle, the web-app
bundle disables the host-level rows outright, and the agent presets deployed on this machine
repeat the same gate. On Windows the agent receives **`tool-pwsh` backed by `pwsh-sandbox`**,
and no bash tool. Adding a user patch to disable something already disabled would only add a
row to maintain.

**Verify rather than assume**, using the same method that caught the original error — read the
row, not the package name:

```bash
pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config
```

Then confirm `tool-bash` carries a `disabled` key and `tool-pwsh` is the active shell row.

## 18.4 Verify the model is actually local

The stock composition sets a **cloud** default:

```yaml
- id: agent-default-model
  config:
    provider: deepseek-official
    model: deepseek-v4-flash
```

A workstation can therefore appear to work perfectly while doing none of its work locally.
After configuring, confirm with both of:

```bash
lms ps --json
```

```bash
pnpm dlx "@deepseek-ai/dsh@0.1.1-rc.2" --profile web --dump-config
```

The first proves which model is resident and at what quantization; the second proves what the
composed profile will actually use. **Neither can be replaced by looking at the UI.**


# 13. Model portfolio

## 13.1 What is already on the machine

`lms ls` reports **41 models, 549.14 GB**, against 852.5 GB free on the 2 TB system SSD. The
portfolio problem here is not acquisition — it is **pruning**. Several entries are duplicates
across quantizations or are tagged to other machines in a fleet (`NvideaBlackwell`, `R71`,
`TinyRyzen7`) rather than `Local`.

## 13.2 Recommended portfolio

Roles derived from the workload, not from the model list.

| Role | Model | Quant | Disk | Loaded (est.) | Context | Status |
|---|---|---|---|---|---|---|
| **Primary agent / coding / vision** | `unsloth/qwen3.8-27b` | UD-Q5_K_XL | 21.15 GB | **26.73 GB measured @131 K** | 131,072 | **resident — keep** |
| **Fast worker / subagent** | `qwen/qwen3.6-35b-a3b` | Q4/Q5 | 22.07 GB | ~24 GB | 32–64 K | present — **promote** |
| **Fast coding worker (alt.)** | `unsloth/qwen3-coder-30b-a3b-instruct` | Q4 | 17.46 GB | ~19 GB | 32–64 K | present |
| **Maximum-quality reasoning** | `gpt-oss-120b` | — | 63.39 GB | ~64 GB+ | reduced | present — **capacity-test before trusting** |
| **Embeddings** | `text-embedding-nomic-embed-text-v1.5` | — | 84 MB | <1 GB | — | present — keep |
| **Reranking** | — | — | — | — | — | **GAP** |
| **Draft / speculative** | *not needed as a separate model* | — | — | — | — | MTP is internal (§12.4) |

### Why this shape

**One dense primary, one sparse worker.** The decisive property of this machine is memory
bandwidth (~256 GB/s), not compute. Decode speed is governed by how many bytes must be swept
per token:

- A **dense** 27B at Q5 sweeps ~21 GB per token-step → measured **14.8–16.4 tok/s** (§10),
  held above the naive ~12 tok/s ceiling by MTP.
- An **A3B MoE** activates roughly 3 B parameters per token → a far smaller sweep, and should
  decode several times faster at comparable total size.

That asymmetry is the whole argument for a two-model portfolio: the dense model for quality on
the main thread, the MoE for subagents, batch classification and anything where latency matters
more than depth. **This claim is derived, and §20 lists the measurement that would confirm it
on this box.** It is not yet measured here and is not presented as though it were.

**No separate vision model.** Qwen3.8-27B is natively vision-language. Adding
`qwen3-vl-30b-a3b-instruct` (19.64 GB) is only justified if vision throughput becomes a
bottleneck.

**Q28 — largest model this machine can technically run.** `gpt-oss-120b` at 63.39 GB is the
largest present. With VGM at 64 GB it sits right at the carve-out boundary and would begin
using the shared path; the OpenCL **54.40 GiB maximum single allocation** is a real hazard for
any single buffer above that size, though llama.cpp allocates per-tensor rather than as one
block. Technically feasible; **verify, do not assume**.

**Q29 — largest it can run *usefully*.** Distinct question, and the honest answer is that it
depends on active parameters, not file size. A 63 GB *dense* model would decode near 4 tok/s
and be useless as an interactive agent. A 63 GB *MoE* with small active parameters could be
perfectly usable. §20 specifies the test.

**Q32 — which small model for fast worker/subagent tasks?** `qwen3.6-35b-a3b` or
`qwen3-coder-30b-a3b`, on the MoE-decode argument above.

## 13.3 Pruning

549 GB of models on a 1.9 TB drive with 852 GB free is not yet a problem, but it is heading for
one. Concretely: `qwen3.8-27b` exists locally at `q3_k_xl`, `q4_k_xl`, `q5_k_xl` (loaded) and
`q6_k`. Once §20's quantization comparison has run, **keep the winner and one fallback, delete
the rest** — that alone is ~35 GB.

---

# 14. XDNA 2 NPU analysis

**Q35 — does the XDNA 2 NPU provide a useful role? Not for this workstation today.**

| Finding | Status |
|---|---|
| NPU rated >50 AI TOPS | vendor claim |
| Used by llama.cpp / LM Studio for GGUF LLM inference | **No** — no NPU runtime is offered by `lms runtime` on this box |
| Targeted by Lemonade / Ryzen AI Software for specific models | yes, for named models **[community]** |
| Practical use today | Whisper, diffusion, background Copilot+ tasks **[community]** |
| Largely unused for general LLM inference as of mid-2026 | **[community]**, consistent with the runtime list here |

The runtime inventory on this machine is direct evidence: `lms runtime get -l` offers exactly
four extensions — `harmony`, `llama.cpp` CPU/AVX2, `llama.cpp` Vulkan, `llama.cpp` AMD ROCm.
**There is no NPU option to select.** The path to using the NPU at all would be Lemonade or
Ryzen AI Software with a specifically supported model, which is a different model portfolio
than the one this workstation wants.

Where it could earn a place later: embeddings, reranking, ASR, and OCR running *concurrently*
with the GPU-resident LLM, so they do not steal bandwidth from decode. That is a real
architectural benefit on a bandwidth-limited part — the NPU has its own execution resources.
But it is **WATCH**, not **BUILD NOW**, and it should not shape the initial build.

---

# 15. Windows 11 developments

| Item | Value on this machine |
|---|---|
| Build | **26200.9168**, `DisplayVersion 25H2` |
| Relevance | **This is the exact build AMD's ROCm 7.14.0 matrix names for Ryzen AI Max** |
| WDDM shared-memory behaviour | measured, §8.1 — 48,938 MB shared over 63.79 GB system RAM |
| WSL2 | installed, Ubuntu, **WSL version 2**; package repaired to 2.7.12.0 and kernel 6.18.33.2 during this investigation (§6.7). Not part of the recommended execution path — see §19.2 |
| Insider builds | **not recommended** |

**Q36 — are recent Windows builds materially improving Strix Halo local AI?** For this machine
the material fact is alignment rather than a new subsystem: 25H2 / build 26200 is the version
AMD certifies for gfx1151 ROCm support. That alignment is what makes §9 and §10 possible.

**Q37 — are any Insider features compelling enough to test?** **No.** Nothing found in this
investigation identifies an Insider-only capability that changes GPU memory allocation, ROCm
availability, or inference throughput on this part. The machine is already on the certified
build. Moving to Insider would trade a certified configuration for no identified gain.
Classification: **REJECT FOR NOW**.

---

# 16. Storage plan

## 16.1 Current state

| Volume | Size | Free |
|---|---|---|
| `C:` — Micron 4600 NVMe SSD | 1905.6 GB | **852.5 GB** |
| `D:` — Seagate One Touch Hub, USB **HDD** | 7451.8 GB | 4346 GB |

Models currently consume **549.14 GB**.

## 16.2 Recommended allocation

| Purpose | Budget | Notes |
|---|---|---|
| Windows + drivers + apps | ~200 GB | as-is |
| Dev toolchain, Node/pnpm store, Python envs, repos | ~150 GB | pnpm's content-addressed store grows quietly |
| **Model weights** | **≤ 700 GB** | a ceiling, not a target — currently 549 GB |
| DSH state, sessions, logs, spill | ~50 GB | `$DSH_HOME`; `session-query-sqlite` and `spill-local` both write |
| Benchmark data + evidence | ~20 GB | |
| **Free reserve** | **≥ 250 GB** | do not go below |

**Keep model weights on `C:` (NVMe).** `D:` is a USB **hard disk**, not an SSD. §8.4 showed
that a model falling out of residency costs a full reload inside the next request's TTFT —
paying that from spinning rust over USB would be severe. `D:` is correct for archives,
benchmark artefacts and GGUF files not in rotation; it is wrong for anything LM Studio may
need to page in.

## 16.3 Changes actually made to this machine during the investigation

Recorded here because the rest of the report asserts the machine was left alone.

| Change | Reason | Reversible |
|---|---|---|
| Downloaded LM Studio runtime `llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1` (210.73 MB) | required for the controlled backend comparison in §10 — it is not possible to compare ROCm against Vulkan without it | yes — `lms runtime remove` |
| Cloned `deepseek-harness` to `dsh-halo-research\_upstream\` | source reading for §4–§6 | yes — delete |
| Created `C:\Users\scott\Desktop\Code\dsh-halo-research\` | report, evidence, benchmark scripts | yes — delete |
| Ran inference requests against the already-running LM Studio server on `:1234` | benchmarks | no persistent effect |
| **Temporarily selected the ROCm runtime** and reloaded the model on it | the §10 comparison cannot be made any other way | **done — reverted, see below** |
| **`wsl --update`** — WSL package 2.6.3.0 → 2.7.12.0 | the package was `Modified, NeedsRemediation`; both its App Execution Aliases were dead (§6.7) | **intentionally permanent** — this repaired damaged system state |
| **Installed a `bash` shim** at `C:\Users\scott\.local\bin\bash.exe` + `.shim` | the MS `bash.exe` alias silently dropped `-c` arguments and piped stdin — 7/9 on the conformance battery (§6.8) | yes — delete the two files; the MS alias is shadowed, not removed |

### The runtime switch, and its restoration

To measure ROCm the selected runtime had to be changed and the model reloaded. Both were done
with the model's exact prior parameters recorded first
(`evidence/PRE-SWITCH-lms-ps.json`) and restored afterwards:

```
lms runtime select llama.cpp-win-x86_64-vulkan-avx2@2.29.1
lms load unsloth/qwen3.8-27b --identifier qwen/qwen3.8-27b \
         --context-length 131072 --parallel 1 --ttl 86400 -y
```

**Verified restored state:** selected runtime `llama.cpp-win-x86_64-vulkan-avx2@2.29.1`;
`qwen/qwen3.8-27b` resident at Q5_K_XL, `contextLength 131072`, `parallel 1`, `ttlMs 86400000`
— identical to the pre-investigation reading. System RAM free returned to 19.22 GB and GPU
local to 29.25 GiB.

**One incident worth recording.** During the ROCm long-context rung the machine reached
**1.55 GB of free system RAM** with the GPU process holding **78.39 GiB** (§10.4). The run
completed, and the state above was restored immediately afterwards. This was a live box running
other services; the ROCm long-context path should not be re-run on it without first reducing
the model's context length.

**No DSH configuration was written. No VGM setting was changed. No `PATH` entry was added or
removed — the user `PATH` is byte-identical to the backup taken at
`evidence/HKCU-Path-backup.txt`. The machine ends this investigation on the runtime and model
configuration it started with, plus two deliberate repairs: the WSL package is healthy (§6.7)
and `bash` is fully conformant (§6.8).**

---

# 17. Benchmark and acceptance-test architecture

## 17.1 Why the obvious benchmark is the wrong one

Decode tokens/sec is the number everyone quotes and the least useful one for this workload.
An agent turn is dominated by **prefill**: a repository file, a 4,000-line diff, a tool result,
a compaction pass. §10 measures a 45 K-token prompt taking minutes to first token while decode
sits comfortably around 20 tok/s. **Optimising this machine for decode would optimise the part
that is already fine.**

## 17.2 The suite

### Tier 1 — raw inference (scripted, repeatable)

`bench/Bench-Local.ps1` in the research directory implements this. Two methodological
requirements it enforces, both learned the hard way during this investigation:

1. **A discarded warm-up request.** LM Studio lets an idle model fall out of residency; the
   first request then pays a 21 GB reload *inside TTFT*. Without a warm-up the first rung is
   pure noise — observed as 22.8 s TTFT for a 274-token prompt.
2. **A unique nonce at the head of every prompt.** Without it, successive rungs share a prefix
   and are served from the prompt cache. Measured effect: apparent marginal prefill fell from
   **336.7 tok/s (cached)** to **196.6 tok/s (honest)** on the same rung — a 71 % overstatement.

A third requirement was learned by violating it: **nothing else may touch the server during a
run.** One benchmark pass in this investigation was discarded because interactive compat probes
were issued against the same single-slot server mid-run.

A fourth was learned by being challenged on it: **one run per configuration is not a
measurement.** Every rung must be repeated — `n = 4` proved sufficient here — and every
backend comparison must be expressed in **units of measured noise**, not as a bare ratio.
`bench/Compute-BenchStats.ps1` does this and refuses to call anything under 3 sd decisive.
Replication changed several conclusions in §10; see §10.6 for what it overturned.

### Tier 2 — DSH agent performance

Fixed, repeatable tasks against a real repository, scored on completion rather than speed:
repository comprehension; multi-file edit; a test/fix loop; a Git operation; a PowerShell
operation; use of a specific tool; a long-running task that crosses a compaction boundary; a
deliberately oversized tool output; recovery after a tool error.

### Tier 3 — reliability

Tool-call success rate, malformed calls, hallucinated tools, loops, context failures,
truncation, incorrect edits, permission failures. **This tier decides the model choice, not
Tier 1.** A model that is 30 % faster and emits one malformed tool call in twenty is worse than
a slower model that never does.

## 17.3 Acceptance criteria

The environment is **not** complete because DSH opens and a model answers "hello". Acceptance
requires all of:

1. `lms ps --json` shows the intended model **and quantization** resident.
2. `dsh --dump-config` shows the intended provider and model — not `deepseek-official`.
3. A DSH session completes a multi-file edit in a real repository, using the PowerShell tool
   seam, with the sandbox in `workspace-write`.
4. A tool call whose result exceeds 100 KB is ingested without breaking the turn.
5. A session survives at least one compaction and continues correctly.
6. The network is disconnected and the same task still completes — **the only real proof that
   the work is local**.
7. `--dump-config` shows `tool-bash` carrying a `disabled` key and `tool-pwsh` active — read the
   **row**, not the package name (§6.5).

Criterion 6 is the one that would have caught the failure mode §18.4 describes. Criterion 7 is
the one that would have caught the false finding retracted in §6.5.


# 24. Community and upstream evidence

## 24.1 Real-world DSH + Strix Halo evidence — the honest position

The directive asks for this to be separated into three categories and never blurred.

**Category A — directly demonstrated DSH on Strix Halo.**
**None found.** No firsthand report was located of DeepSeek Harness driven by a local model on
Ryzen AI Max / Radeon 8060S hardware. Given DSH is **nine days old** at the time of writing,
this is expected rather than surprising. It should not be papered over: **this report's
end-to-end architecture is not something the community has already validated.**

**Category B — demonstrated components that compose.**
This is where most of the evidence sits, and it is strong:
- DSH's OpenAI-compatible provider seam is verified **in source** and its two documented
  gateway incompatibilities were **tested live against LM Studio and both passed** (§11.1).
- llama.cpp on gfx1151 under both Vulkan and ROCm is verified **on this machine** (§10).
- Qwen3.8-27B at Q5_K_XL / 131 K context is verified resident and serving **on this machine**.

**Category C — architectural hypothesis.**
The MoE-worker argument in §13.2 and the `gpt-oss-120b` reasoning role in §13.2 are reasoned
from measured bandwidth behaviour but **not yet measured** (T-1, T-2).

## 24.2 Upstream project signals

Read from the repository and its Discussions on 2026-08-23.

| Signal | Finding |
|---|---|
| **Issues are disabled** | `has_issues: false`. There is **no public bug tracker**. All reports go through Discussions (4,117 of them, 816 watchers). |
| Release cadence | 4 releases in 6 days, all prereleases |
| Community plugin ecosystem | Already active — `dsh-session-export`, `dsh-local-ai` (an Ollama adapter), `dsh-budget`, `dsh-click` ("Windows first"), `dsh-fast`, migration tools from Claude Code / Codex / OpenCode |

The absence of an issue tracker matters for a workstation build: **when something breaks, there
is no canonical place to check whether it is known.** Discussions search is the substitute.

## 24.3 Upstream-reported defects relevant to this build

These were found in Discussions and are reported here with their status **verified against the
pinned commit where possible**, rather than repeated as-is.

| Report | Relevance | Status at `b150a551` |
|---|---|---|
| **Subagents use the model snapshotted at parent-agent creation, not the currently selected model** — 7 subagents failed with `UNKNOWN_MODEL` naming a provider/model never configured (discussion 3377) | **Direct.** A local-provider setup plus subagents can fail this way. | **Not verified as fixed.** Treat as live — see §21.7 |
| **All `POST /api/*` return 403** — trust-fence compared `new URL(origin).host` against the Host header, and WHATWG drops default ports (discussion 2009) | Would break the whole UI | **Appears FIXED.** `packages/client/connection/src/api-request-trust.ts` at the pinned commit uses canonical-authority comparison with explicit port semantics, not the naive `.host` equality |
| **Orphaned `dsh web` process holds port 3080; no stop/restart subcommand** (discussion 2933) | Operational friction; blocks restart | **Live.** The CLI at the pinned commit exposes no `--stop`/`--restart` |
| `sandbox-windows-acl` gates on `resolvePwshPath` but launches literal `pwsh`, "so escape-regression tests silently never run" | **Direct** — bears on §18.2's `partial` enforcement | Reported upstream; not independently verified here |
| Hook bridge suites mount `LocalBashExecutor` unconditionally, "testing a shell no Windows host runs hooks through" | A **test-coverage** gap, not a runtime one — it is consistent with §6.5, where the runtime rows are correctly `win32`-gated but the suites do not model that | Reported upstream |
| `DSH_SNAPSHOT=refresh` writes literal cwd paths on Windows | Windows path handling | Reported upstream |

## 24.4 Community benchmark evidence, and why this report measured its own

Community reports on Strix Halo backends, recorded with their claims **[community]**:

- ROCm ≈ **+20.6 % prompt processing** and ≈ **−24.6 % generation** versus Vulkan.
- ROCm with rocWMMA Flash Attention holds throughput "with almost no drop-off" past 8 K
  context, "while using less memory than Vulkan".
- `GGML_HIP_NO_VMM=ON` is described as necessary because HIP VMM misbehaves on this GPU.
- Dense 70B ≈ 5 tok/s; 7–13B ≈ 30–45 tok/s; 30B-A3B MoE ≈ 70–100 tok/s.

**Methodology warning, per the directive.** These figures come from different models,
quantizations, context lengths, llama.cpp versions and operating systems, and several do not
state whether they measured Linux or Windows. They are **not** directly comparable to each
other, and they are not comparable to §10 — which used one model, one quantization, one
llama.cpp version (2.29.1), one OS, and one machine, changing **only** the backend.

Where §10 and community evidence **agree**: ROCm wins prefill, Vulkan wins decode.

Where §10 and community evidence **disagree**: the claim that ROCm "uses less memory than
Vulkan" is **contradicted on this machine** — see §10.4. The likely explanation is that the
community claim concerns Linux, where AMD's GTT-based memory model applies; this box is
Windows, where §8.2 shows the memory model is materially different. **This is exactly the
substitution the directive warns against, and it is why the measurement was repeated locally.**


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



