> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# DSH Halo: Codex, Claude Code, and Gemini Subagent Integration Guide

**Version:** 1.0  
**Date:** 2026-08-27  
**Status:** researched implementation guide; no integration changes have been applied  
**Target installation:** DeepSeek Harness (DSH) `@deepseek-ai/dsh 0.1.1-rc.2`, profile `web`, on Scott's Windows workstation

## 1. Decision

Yes: the Halo cockpit can delegate work to Codex, Claude Code, and Gemini while preserving the tuned local Qwen two-model system.

The correct design is not to replace either local model and not to point LM Studio at cloud models. DSH already has a subagent registry. The 27B Qwen cockpit calls static model-facing tools, and each tool is bound to one host-side provider:

```text
27B Qwen cockpit
  |
  +-- subagent_coder ----------> local in-process 30B Coder through LM Studio
  +-- subagent_codex ----------> DSH's native Codex provider
  +-- subagent_claude_code ----> DSH's native Claude Code provider
  +-- subagent_gemini ---------> DSH's generic ACP provider -> Gemini CLI --acp
```

Codex and Claude Code are first-party DSH integrations. Gemini is a plausible, clean integration through the open Agent Client Protocol (ACP), but the exact DSH `0.1.1-rc.2` to current Gemini CLI pairing must pass a disposable compatibility spike before it is exposed to the cockpit.

Antigravity's `agy` CLI is a separate alternative for Gemini-family models. It is installed on this machine, but it does not advertise ACP. It therefore needs a custom provider or MCP adapter and is not the first implementation choice.

## 2. Non-negotiable boundaries

This integration must not change:

- the LM Studio models, model files, context sizes, load order, GPU settings, or server endpoints;
- `C:\Users\scott\.dsh\settings.yaml` model/provider configuration;
- the dedicated worker `DSH_HOME` or any worker-pinning mechanism;
- the Halo launch scripts, VGM behavior, or validated local two-model topology;
- shipped DSH presets under the installed package or source checkout;
- tests in any target software repository;
- the local-Coder-first routing rule.

Cloud delegation is an additive cockpit capability. It must be enabled only in a copied user preset such as `halo-orchestrator`, never globally for every DSH agent and never in the local worker's Code preset.

Cloud agents receive the repository path and task content. They consume the signed-in account's quota or subscription allowance. Do not send a private repository, secrets, credentials, customer data, or proprietary artifacts to a cloud provider unless that is intentionally authorized for that repository.

## 3. What DSH actually implements

DSH separates the integration into two planes:

1. **Host plane:** a provider registers under a name in `ctx.subagents`. Installing a provider makes it available to the DSH host but gives the model no tool.
2. **Agent-preset plane:** a `@deepseek-ai/dsh-tool-subagent` row creates one static model-facing tool bound to one named provider. A copied preset controls which agents can see that tool.

This separation matters. Installing a bundle is not enough. Enabling a tool row is not enough if the provider is absent. Both must be present, and the DSH profile must be restarted after dependency changes.

### 3.1 Codex

Package: `@deepseek-ai/dsh-subagent-codex`

- The DSH profile bundle carries a pinned `@openai/codex@0.147.0` and launches its package-local app server over stdio.
- It deliberately does not run the `codex` found on Windows `PATH`.
- Native Codex account state and configuration remain authoritative through the inherited home, `CODEX_HOME`, project directory, and Codex configuration.
- Each call creates a fresh ephemeral Codex thread with one turn.
- The child receives the parent working directory and a standalone prompt, not the Qwen conversation or persona.
- Only the final Codex answer returns to Qwen. Intermediate tool calls, reasoning, and diffs are not returned through this seam.
- Supported permission modes are `never`, `approve-for-me`, and `dangerously-bypass-approvals-and-sandbox`.
- `approve-for-me` maps to Codex automatic approval review plus `workspace-write`; it is the appropriate first build-capable mode. Do not start with dangerous bypass.

### 3.2 Claude Code

Package: `@deepseek-ai/dsh-subagent-claude-code`

- The bundle carries the official Claude Agent SDK and its pinned, platform-specific Claude Code payload.
- It deliberately does not run the `claude` found on `PATH`.
- Native Claude settings and signed-in account state remain authoritative.
- Each call is a fresh, non-persisted query. It receives the parent working directory and a standalone prompt, not the Qwen conversation.
- Only the final Claude result returns to Qwen.
- Permission modes are `dontAsk`, `acceptEdits`, `auto`, `plan`, and `bypassPermissions`.
- Use `plan` for a planning-only tool and `auto` or `acceptEdits` for a separately named build tool. Do not start with `bypassPermissions`.

### 3.3 Gemini

DSH package: `@deepseek-ai/dsh-subagent-acp`  
Child product: official `@google/gemini-cli`, launched with `--acp`

- Gemini CLI's ACP mode is JSON-RPC over stdio.
- DSH's ACP provider starts a fresh child process per call, initializes it, creates a new session in the parent working directory, submits one standalone prompt, and collects committed final assistant text.
- DSH `0.1.1-rc.2` advertises no optional ACP client file-system or terminal capabilities and does not call ACP `authenticate`. Gemini must therefore be installed and logged in before DSH starts it.
- Current Gemini CLI source includes a local file-system fallback when its ACP client does not provide file operations, so compatibility is plausible. It is not yet proof that editing works correctly in this DSH release.
- DSH auto-answers all ACP permission requests using the provider's fixed `allow` or `reject` policy. It cannot surface an interactive permission dialog to Scott.
- Use `reject` for the compatibility spike. Add a distinct `allow` provider only after read/write, cancellation, and cleanup behavior are proved in disposable storage.

### 3.4 Background execution

Codex, Claude Code, and ACP tool rows can use DSH's one-shot background mode. An explicit background call returns a DSH Job ID; Qwen must use `job_output` to inspect it or `job_kill` to stop it. This is process concurrency, not conversation continuation. Every provider call still gets a fresh child session and a self-contained prompt.

## 4. Current machine facts found during this review

- DSH source inspected: `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness`
- Installed target profile: `C:\Users\scott\.dsh\profiles\web`
- Target package version: `@deepseek-ai/dsh 0.1.1-rc.2`
- Current `web` profile has no Codex, Claude Code, or ACP dependency.
- Current `web` bundle list is only `@deepseek-ai/dsh-base` and `@deepseek-ai/dsh-web-app`.
- Host `codex` is installed, version `0.147.0`, but DSH's Codex provider will use its own package-local copy.
- Host `claude` is installed, version `2.1.227`, but DSH's Claude provider will use its package-local pinned payload.
- Official `gemini` CLI is not currently on `PATH`.
- Antigravity wrapper exists at `C:\Users\scott\Tools\agy\bin\agy.exe`, version `1.1.13`. It supports noninteractive `--print`, model selection, planning/editing modes, JSON output, sandboxing, and permission bypass, but no ACP flag is advertised.
- No user agent-preset directory was found at `C:\Users\scott\.dsh\.agent-presets` during this review.

### 4.1 Existing Halo mismatch to fix separately

`C:\Users\scott\.dsh\profiles\web\cordis.patch.yml` says `subagent_coder` is the local 30B Coder "in Code Mode." The actual row uses DSH's in-process `spawn` provider with `agentOptions` that override provider, model, and token count. DSH's source says an in-process spawn child inherits the parent preset; this row does not pin the child's preset or Code-mode tool presentation.

Therefore:

- a Standard-mode parent creates a Standard-mode Coder child, despite the persona text;
- the model and token pin are real;
- the "in Code Mode" claim is not supported by this configuration.

Do not silently mix this repair into cloud-provider installation. Record it as a separate Halo configuration issue, decide the desired child composition, and validate it independently.

## 5. Recommended final architecture

The first useful release should expose three cloud tools only to the 27B cockpit:

| Tool | Provider mode | Intended use |
|---|---|---|
| `subagent_codex` | `approve-for-me` | Hard implementation, independent repair, or code review with workspace-write under Codex's automatic reviewer |
| `subagent_claude_plan` | `plan` | Architecture, threat modeling, decomposition, and a second opinion without edits |
| `subagent_gemini_review` | ACP `reject` | Read-only large-context or cross-check work after ACP compatibility passes |

After the first release is stable, add explicit build tools rather than weakening the safe tools:

| Optional tool | Provider mode |
|---|---|
| `subagent_claude_build` | `auto` or `acceptEdits` |
| `subagent_gemini_build` | ACP `allow`, only after a disposable edit gate |

Static, purpose-named tools are preferable to a model-selectable catch-all. The permissions are visible in the tool's identity, the 27B has fewer ambiguous choices, and a review call cannot accidentally become a write-capable call.

Local Coder remains the default implementation worker. Cloud calls are escalation, review, or specialist capacity, not the bulk path.

## 6. Proposed configuration shape

These snippets are a design target, not instructions to paste blindly. The implementer must first copy the active preset and preserve the existing Halo patch.

### 6.1 Install host providers into the `web` profile

Proposed commands, not executed:

```powershell
dsh plugin --profile web add @deepseek-ai/dsh-subagent-codex
dsh plugin --profile web add @deepseek-ai/dsh-subagent-claude-code
dsh plugin --profile web add @deepseek-ai/dsh-subagent-acp
```

The Codex and Claude Code packages are Profile Bundles; each adds a dormant provider row. ACP has no equivalent default provider bundle row, so its provider must also be inserted in the profile patch.

### 6.2 Host-plane provider rows

Use complete rows with unique provider names. Preserve every unrelated entry already present in `C:\Users\scott\.dsh\profiles\web\cordis.patch.yml`.

```yaml
- insert:
    - id: subagent-codex-halo
      name: '@deepseek-ai/dsh-subagent-codex'
      config:
        providerName: codex-halo
        permissionMode: approve-for-me
        env: {}
        disposeGraceMs: 3000

    - id: subagent-claude-plan
      name: '@deepseek-ai/dsh-subagent-claude-code'
      config:
        providerName: claude-plan
        permissionMode: plan
        env: {}
        disposeGraceMs: 3000

    - id: subagent-gemini-review
      name: '@deepseek-ai/dsh-subagent-acp'
      config:
        providerName: gemini-review
        command: 'C:\Program Files\nodejs\node.exe'
        args:
          - 'C:\ABSOLUTE\PATH\TO\@google\gemini-cli\DIST\ENTRYPOINT.js'
          - '--acp'
        permission: reject
        env: {}
        disposeEofGraceMs: 6000
        disposeGraceMs: 3000
```

Do not guess the Gemini JavaScript entrypoint. After installing the official CLI, resolve `npm root -g`, read the installed package's `bin` field, and record the actual absolute path. Launch `node.exe` plus that JavaScript file instead of relying on a Windows `.cmd` shim inside a stdio protocol integration.

Do not put access tokens in YAML. DSH's subprocess seam scrubs credential-shaped ambient variables. Use the products' native cached login where supported, or use an explicit, narrowly scoped environment overlay only when a deliberate API-key design is chosen.

### 6.3 Agent-preset tool rows

Copy the shipped `standard` preset to a user preset named `halo-orchestrator`. Do not edit the shipped file at:

`C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\apps\cli\config\agent-presets\standard\agent.cordis.yml`

The copied preset should enable or add rows equivalent to:

```yaml
- id: tool-subagent-codex-halo
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: codex-halo
    toolName: subagent_codex
    backgroundMode: one-shot
    maxDepth: provider-managed

- id: tool-subagent-claude-plan
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: claude-plan
    toolName: subagent_claude_plan
    backgroundMode: one-shot
    maxDepth: provider-managed

- id: tool-subagent-gemini-review
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: gemini-review
    toolName: subagent_gemini_review
    backgroundMode: one-shot
    maxDepth: provider-managed
```

The copied preset must also retain the existing cockpit tools, including local `subagent_coder`, and the required generic Job services. The exact mounted composition must pass DSH preset validation before a real session uses it.

## 7. Approach A: let the local Qwen cockpit prepare the integration

This approach is viable because DSH ships a Cordis-composition editing skill and preset-management tools. It is more error-prone than a careful external edit, so Qwen must work in gated phases and stop for approval before any state change.

### 7.1 Prompt to give Qwen

Give the following as one standalone instruction in a DSH session that has the Cordis preset-management tools. Attach or name this guide's absolute path.

```text
Read this guide completely:
C:\Users\scott\Desktop\Halo Stack Research\DSH-HALO-CLOUD-SUBAGENT-INTEGRATION-GUIDE-v1.0.md

Your task is to prepare a proposed, reversible integration of Codex, Claude Code,
and Gemini as DSH subagents for the 27B Halo cockpit. Do not modify anything yet.

First perform only a read-only inventory:
1. Read the installed editing-cordis-compositions skill completely.
2. Inspect the active web profile package.json and cordis.patch.yml.
3. Inspect the shipped Standard preset and current agent-preset registry.
4. Confirm installed DSH version and the exact provider package docs matching it.
5. Confirm Codex and Claude native login readiness without making model calls.
6. Confirm whether official Gemini CLI is installed and authenticated.
7. Explain the existing false claim that subagent_coder is in Code Mode.

Then produce:
- the exact files and package operations you propose;
- complete before/after YAML fragments that preserve unrelated Halo entries;
- a backup and rollback plan;
- the Phase 0 tests from this guide;
- a statement of every place that will change.

Stop and ask Scott for approval. Do not install packages, log into accounts, copy or
edit presets, restart DSH, or make any file change until Scott explicitly says go.

After approval, use ctx.agentPresets.copy to create a user preset named
halo-orchestrator from Standard. Never modify a shipped preset. Apply one phase at a
time, validate the mounted composition using the preset standing key, and report
evidence after every phase. Do not touch LM Studio settings, local model settings,
worker DSH_HOME, launch scripts, or the local two-model topology.
```

### 7.2 What Qwen must prove before asking to expose tools

Qwen's prose is not evidence. It must return concrete artifacts:

- resolved package versions and paths;
- the copied preset ID and standing key;
- loader/mount validation output;
- the exact model-visible tool list from a new `halo-orchestrator` session;
- the saved backup path and hashes of each changed file;
- Phase 0 transcripts and externally verified filesystem/test results;
- proof that all child process trees exit after success, failure, and cancellation.

If Qwen cannot access `ctx.agentPresets.copy` or cannot validate the composition, stop this approach and use Approach B. Do not fall back to editing shipped presets.

## 8. Approach B: have Codex implement it in a later session

This is the recommended implementation path. Codex can inspect the exact installed tree, make minimal reversible edits, run the gate, and leave a precise audit trail.

### Phase 0 — no persistent configuration

1. Snapshot current state: DSH version, running processes, active profile, package lock, `package.json`, profile patch, user preset registry, model-visible tools, and hashes.
2. Verify native Codex and Claude login readiness without changing product configuration.
3. Install official Gemini CLI only after approval, run it interactively once, and use **Sign in with Google** so credentials are cached. Do not put a Gemini key into the DSH patch.
4. Resolve the Gemini CLI's real Node entrypoint. Do not use a guessed path.
5. Build a disposable minimal DSH composition outside the Halo profile containing one harmless ACP tool.
6. Prove Gemini handshake, authentication reuse, a nonce response, read of a disposable workspace file, and complete process cleanup.
7. Repeat with a disposable file edit under ACP `allow`; verify the edit externally and verify cancellation cleanup. If any part fails, do not expose Gemini to Halo. Codex and Claude can still proceed.

### Phase 1 — copied cockpit preset

1. Back up `C:\Users\scott\.dsh\profiles\web\package.json`, the profile lockfile, and `cordis.patch.yml` with timestamped names outside the live file path.
2. Use DSH's preset API to copy `standard` to the user preset `halo-orchestrator`.
3. Preserve the existing Halo persona and local Coder tool in the copy.
4. Add the cloud tool rows only to the copy.
5. Validate the copy using `ctx.agentPresets.standingKeyFor(id)` and a real loader mount.
6. Confirm the original Standard and Code presets are byte-identical to their pre-change state.

### Phase 2 — providers

1. Add the Codex and Claude Code profile bundles.
2. Add the ACP dependency only if Phase 0 passed.
3. Add named provider rows to the profile patch, preserving every unrelated existing row.
4. Restart only the `web` DSH profile. Do not restart or reconfigure LM Studio.
5. Confirm provider registration in logs before opening a Qwen session.

### Phase 3 — read-only smoke tests

From a new `halo-orchestrator` session:

1. Assert the exact expected tool names and assert that no cloud tools appear in the worker preset.
2. Ask each provider for a unique nonce plus the first line of a disposable file.
3. Confirm the returned nonce and content externally.
4. Run one background call per provider, collect it with `job_output`, cancel another with `job_kill`, and verify no child process tree survives.
5. Confirm that no tool invocation changed model configuration, launch configuration, or unrelated profile files.

### Phase 4 — build smoke tests

Use a disposable Git repository, never a real project for the first write test.

1. Create a one-file implementation task with frozen tests and an exact test command.
2. Give Codex a self-contained brief and let it edit through `approve-for-me`.
3. Add Claude build mode only if wanted; test it independently, not concurrently in the same worktree.
4. Add Gemini build mode only if its ACP read/write/cancellation gate passed.
5. Run the tests from the parent shell and inspect `git diff`; a child's report is not verification.
6. Verify no test file changed and no process survives.

### Phase 5 — Halo routing acceptance

Give the 27B controlled routing prompts and require at least 90% correct first-tool choice:

- ordinary implementation -> local `subagent_coder`;
- hard repair or independent implementation -> `subagent_codex`;
- architecture-only request -> `subagent_claude_plan`;
- requested Gemini cross-check -> `subagent_gemini_review`;
- direct simple action the cockpit can do -> no delegation.

Measure schema/token cost in the exact 27B Standard profile. If extra tools materially hurt routing or context, expose fewer tools and keep the rest in a separate preset.

## 9. Qwen routing contract after installation

Add a concise contract to the copied cockpit preset, not to global DSH configuration:

1. Use local `subagent_coder` for the bulk of implementation work.
2. Use Codex for a difficult implementation, a stuck repair, or an independent code-review pass.
3. Use Claude plan for architecture, decomposition, threat modeling, and adversarial review; use a separately named Claude build tool only when edits are intended.
4. Use Gemini only after ACP is validated, primarily for an explicitly requested independent perspective or capabilities proved during the gate.
5. Every cloud prompt must be self-contained: absolute repository path, objective, relevant files, constraints, allowed files, exact test command, known failure text, and requested final report.
6. Never send "continue," "fix it," or references to the parent conversation; these providers do not inherit it.
7. Never let two write-capable children edit the same working tree concurrently. Use separate Git worktrees/branches for parallel writes.
8. Treat child output as a claim. The cockpit runs tests, inspects the diff, and runs the repository gate itself.
9. After two failures on the same unit, stop repeating the same delegation. Reduce scope, change provider, or escalate to Scott.
10. Do not expose credentials in prompts, YAML, logs, or tool results.

Suggested brief template:

```text
Repository: C:\absolute\path\to\repo
Objective: <one bounded outcome>
Allowed files: <exact list>
Forbidden files: tests and all files not listed
Known state/failure: <exact evidence>
Required test command: <exact command>
Constraints: <compatibility, security, style, no refactor>
Deliverable: make the change, run the test, and return a concise summary plus
the exact files changed and test result. Do not claim success if the command fails.
```

## 10. Antigravity alternative

If Scott specifically wants to consume the existing Antigravity account or model catalog instead of official Gemini CLI, do not point DSH's ACP provider at `agy.exe`; `agy 1.1.13` does not advertise an ACP mode.

Two legitimate implementations exist:

1. **Custom DSH subagent provider (best integration):** write a small package that registers `ctx.subagents`, launches the absolute `agy.exe` with `--print`, `--output-format json`, explicit `--model`, working directory, and a conservative permission mode; parses only the final response; owns cancellation and the complete Windows process tree; scrubs credentials; and exposes a static DSH subagent tool.
2. **Local MCP adapter (less integrated):** write a localhost stdio or HTTP MCP server that wraps `agy`, then connect it with DSH's built-in `@deepseek-ai/dsh-mcp-client`. The model would see a name such as `mcp__gemini__ask`, not a native DSH subagent. This is simpler but loses DSH subagent lifecycle semantics.

Do not have Qwen invoke `agy` through a raw shell command as the permanent design. That gives weak output framing, poor cancellation/process ownership, and a larger credential/environment leak surface.

## 11. Failure and rollback contract

At every phase, failure means restoring the previous working cockpit before more experimentation.

Rollback order:

1. Launch/select the original Standard cockpit preset.
2. Remove or disable only the new cloud tool rows in the copied user preset.
3. Remove only the newly inserted named provider rows from the profile patch.
4. Remove `@deepseek-ai/dsh-subagent-acp` if added.
5. Remove the Codex and Claude bundles if the goal is full rollback:

```powershell
dsh plugin --profile web remove @deepseek-ai/dsh-subagent-codex
dsh plugin --profile web remove @deepseek-ai/dsh-subagent-claude-code
dsh plugin --profile web remove @deepseek-ai/dsh-subagent-acp
```

6. Restore the timestamped pre-change patch and package files only after comparing the intended target and hashes.
7. Restart the `web` profile and assert the original tool list and local two-model build smoke test.

Do not use `git reset --hard`, delete the profile, replace the entire `.dsh` directory, or restore a broad archive over live state.

## 12. Definition of done

The integration is complete only when all applicable statements are true:

- Codex and Claude providers resolve from their DSH profile-local packages, not host `PATH`.
- Gemini ACP compatibility has passed, or Gemini is explicitly recorded as deferred while Codex and Claude remain functional.
- Only the copied `halo-orchestrator` preset exposes the cloud tools.
- The exact new-session tool list matches the design.
- The 27B routes the benchmark prompts with at least 90% correct first-tool choice.
- Read-only, write, background, cancellation, authentication, failure, and process-tree cleanup tests pass as applicable.
- Parent-run tests and diffs verify every write-capable smoke task.
- The tuned LM Studio/local-model configuration and dedicated worker infrastructure are unchanged by hash or documented semantic comparison.
- The existing local Coder path still passes its pre-integration smoke test.
- Backup and rollback have been rehearsed once.
- A durable handoff records versions, exact paths, tool names, permission modes, login assumptions, test evidence, and known limitations.

## 13. Known limitations

- Codex and Claude calls are one-shot. There is no continuation of their hidden child conversation through this DSH provider.
- All three cloud providers receive only a standalone prompt and cwd, so prompt quality is part of system correctness.
- Parent Qwen receives final text, not the complete child trace.
- Provider permission policy is static per named instance; use separate safe/build instances.
- DSH pins its own Codex and Claude payload versions. An independently updated host CLI does not update these providers.
- Gemini ACP file behavior is version-sensitive and unproved on this exact DSH build until Phase 0.
- ACP `allow` automatically grants a permitted option without showing Scott an interactive dialog.
- Cloud model availability, account terms, quotas, rate limits, and provider-side behavior can change.
- The installed Antigravity wrapper is not a substitute for ACP without an adapter.

## 14. Authoritative resources

### Local, version-matched DSH source

- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\docs\subsystems\subagent.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent-codex\README.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent-claude-code\README.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent-acp\README.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\tool-subagent\README.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\apps\cli\config\agent-presets\standard\agent.cordis.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\apps\cli\config\agent-presets\cordis\skills\editing-cordis-compositions\SKILL.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\.agents\notes\implemented\feature\2026-08-04-claude-code-and-codex-subagent-backends.md`

### Official web documentation

- DeepSeek Harness subagent subsystem: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/subagent.md
- DeepSeek Codex/Claude provider implementation note: https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/feature/2026-08-04-claude-code-and-codex-subagent-backends.md
- Gemini CLI ACP mode: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/acp-mode.md
- Gemini CLI installation: https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/index.md
- Gemini CLI authentication: https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/authentication.mdx
- Gemini CLI ACP file-system implementation: https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/acp/acpFileSystemService.ts

## 15. Bottom line

Do not build a new orchestration system. DSH already has the correct seam.

Install the native Codex and Claude provider bundles, expose them only through a copied cockpit preset, and treat Gemini as an ACP compatibility-gated addition. Keep the 30B local Coder as the bulk implementation worker. Let Qwen coordinate and verify; use cloud agents for escalation and independent review. If Qwen performs the setup, require a read-only proposal and explicit approval gate first. If Codex performs it later, use the phased, reversible implementation and acceptance sequence in this guide.
