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
