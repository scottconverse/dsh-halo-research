# Halo stack — current installed configuration

**Status:** authoritative human-readable configuration record  
**Verified:** 2026-08-27 15:00 MDT  
**DSH:** `@deepseek-ai/dsh@0.1.1-rc.2`  
**Operator surface:** `http://127.0.0.1:3080`  
**LM Studio API:** `http://127.0.0.1:1234`

This document records how the Halo stack is actually installed and operating
on HALO. It supersedes older handoffs, morning reports, implementation plans,
and any statement that the local Coder is running the shipped DSH Code/PTC
preset.

## 1. Source-of-truth and copy policy

The executable, reproducible stack remains in:

`C:\Users\scott\Desktop\Code\dsh-halo-research\stack`

The live DSH installation remains in:

`C:\Users\scott\.dsh`

Scott's user-facing copy is always maintained in:

`C:\Users\scott\Desktop\Halo Stack Research`

Every material Halo configuration change must update both the canonical stack
record and the Research-folder copy in the same change. The Research folder's
`HALO-CURRENT-CONFIGURATION.md` is the first document Scott should read.

The Research folder also contains `Current Halo Configuration`, a recovery
snapshot of the exact configuration files described here. Historical reports
remain evidence, not current operating instructions.

## 2. Current topology

| Layer | Installed component | Purpose |
|:--|:--|:--|
| Cockpit | DSH web on port 3080 | Point-and-click operating surface |
| Default model | `halo/qwen3.8-27b` | Tuned 32K planning, coordination, review, and decisions |
| Local worker | `halo/qwen3-coder-30b-a3b` | Tuned 32K bulk implementation through `subagent_coder` |
| Model server | LM Studio on port 1234 | OpenAI-compatible local inference and JIT model loading |
| Optional cloud workers | Native DSH Codex and Claude integrations | Subscription-backed implementation, debugging, planning, or review |
| Search/fetch | Anonymous Exa MCP | Public-web discovery and readable-page retrieval without a DeepSeek or Exa key |
| Reddit | Installed `reddit-search` skill | Anonymous Reddit RSS research with shared pacing |
| Gate | DSH-native mechanical gate — Stage 3 pending | Will enforce frozen-test, anti-shrinkage, test execution, and fail-closed completion |
| Mission Control | Local service on port 3090 | Status and resource monitoring |

At verification time DSH returned HTTP 200 and LM Studio had no model
resident. The next real request JIT-loads the requested model.

## 3. Models and routing

### Default cockpit

- Provider: `lmstudio`
- Model: `halo/qwen3.8-27b`
- Base GGUF: `unsloth/qwen3.8-27b` Q5_K_XL
- Quantization on disk: Q5_K_XL
- Advertised context: 32,768
- Reasoning: LM Studio provider default `on`; DSH sends no fabricated graded effort
- Role: plan, coordinate, inspect, delegate, verify, decide, and report

LM Studio advertises this exact alias as `allowed_options: [on]`,
`default: on`. DSH's pi-ai profile cannot expose a selector literally named
`on`; its keys are graded levels. The route therefore omits
`reasoningEfforts` and the session default omits `reasoningEffort`. This leaves
the provider's real default intact and avoids relabeling boolean `on` as fake
`medium` or `high`. A fresh DSH request produced a separated reasoning block,
no conversion warning, and a normal completed turn. See
`STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md`.

### Tuned local implementation worker

- Provider: `lmstudio`
- Model: `halo/qwen3-coder-30b-a3b`
- Base GGUF: `unsloth/qwen3-coder-30b-a3b-instruct` Q4_K_S
- Quantization on disk: Q4_K_S
- Advertised context: 32,768
- Maximum generated tokens per child call: 8,192
- DSH tool: `subagent_coder`
- Dispatch mode: foreground, DSH-native verified composite
- Background execution: disabled

The Coder inherits the parent Halo Orchestrator's Standard-derived tool
composition with a model override. It is **not** pinned to DSH's shipped
Code/PTC preset. “Code Mode” descriptions in older documents are stale.
The Halo-owned gate creates a detached staging worktree and a synthetic
`workspace-write` parent for each child. The cockpit remains
`danger-full-access`; that permission is not propagated into the staged Coder.
The gate rejects protected-test and out-of-scope changes, verifies against a
separate worktree containing the protected baseline, uses a compare-and-swap
check before promotion, and rolls back a promotion whose live verification
fails. Every run writes `verdict.json` below
`C:\Users\scott\AppData\Local\HaloGate\runs`.

### Sequential residency policy

Halo intentionally runs one large local model at a time:

1. A normal Halo request JIT-loads the 27B.
2. The 27B plans and dispatches one substantial implementation unit through
   `subagent_coder`.
3. LM Studio unloads the 27B and JIT-loads the Coder.
4. DSH waits for the foreground Coder child to complete.
5. When the parent resumes, LM Studio unloads the Coder and reloads the 27B.
6. The 27B inspects the work, runs the actual tests/gate, and decides the next
   step.

This exact 27B -> Coder -> 27B sequence was observed again through a fresh
live DSH child call after the tuned aliases were installed. Both load lines
reported `n_slots = 1`, `n_ctx_slot = 32768`, and unified KV. The child
returned `HALO-STAGE1-WORKER-OK`; the resumed parent reported the same reply.
The full receipt is `STAGE-1-RUNTIME-EVIDENCE-2026-08-27.md`.

The measured cold swap was slow: approximately 153 seconds to make the Coder
ready and approximately 182 seconds to make the 27B ready again. That is now
recorded evidence for the later two-resident soak, not a basis for changing
the residency policy before the soak passes.

The launcher must not manually load or pin a model. LM Studio controls
residency with:

- `developer.unloadPreviousJITModelOnLoad = true`
- `developer.jitModelTTL.enabled = true`
- `developer.jitModelTTL.ttlSeconds = 3600`
- default context length = 32,768

The Halo model definitions also set one parallel session, batches 2048/512,
Flash Attention, 32 context checkpoints, GPU KV offload, F16 KV, no mmap, and
a strict VRAM cap. The 27B additionally enables MTP at `n=4`, `p=0.5`; the
Coder leaves MTP off. LM Studio's runtime API directly exposed the context,
batches, parallel count, Flash Attention, checkpoints, MTP, and KV offload.
Its public runtime receipt does not expose F16 KV, mmap, or strict-cap fields,
so those three remain configuration evidence rather than independently
logged runtime claims.

The one-hour TTL controls idle retention. It does not prevent immediate
replacement when the other Halo model is requested.

### Picker catalog

DSH exposes 18 complete LLMs physically stored on HALO:

1. Qwen3.8 27B Q5_K_XL — Halo cockpit
2. Qwen3 Coder 30B-A3B Q4_K_S — Halo worker
3. Qwen3.8 27B Q5_K_M
4. Qwen3.8 27B Uncensored Q6_K
5. Nemotron 3.5 Lightning 30B-A3B Q4_K_S
6. Qwen3.8 27B Q4_K_M
7. Gemma 4 26B-A4B IT Q4_K_S
8. Gemma 4 12B QAT Q4_0
9. Gemma 4 31B QAT Q4_0
10. Gemma 4 12B Coder Fable5 Composer 2.5
11. Qwen3 VL 30B-A3B Instruct Q4_K_M
12. Qwen3 Coder Next 80B Q4_K_M — advertised at 16K
13. Muse Glimmer 30B Q4_K_XL
14. GPT-OSS 20B MXFP4
15. GPT-OSS 120B MXFP4 — advertised at 8K
16. Qwen3 Coder 30B-A3B Q4_K_M
17. Gemma 4 26B-A4B Q4_K_M
18. Qwen3.6 35B-A3B Q4_K_M

The catalog excludes remote LM Link entries, embeddings, CLIP/vision
projections, draft/MTP components, incomplete downloads, and the bundled
DeepSeek API catalog. No DeepSeek API key is expected.

## 4. Model picker versus Halo Orchestrator

The model picker changes the model answering the current conversation. It is
the driver's-seat selector.

The Halo Orchestrator is the workflow and tool configuration around that
model. It plans the job, decides when to use a child, constructs the child
brief, waits for completion, verifies the result, retries or splits work, and
reports evidence.

Selecting the Coder in the picker makes the Coder the root model for that
conversation; it does not reproduce the deliberate 27B-plans/Coder-builds/
27B-reviews workflow. Normal software builds should begin with the Halo
Orchestrator and its default 27B route.

## 5. DSH tools and delegation

The Halo Orchestrator exposes the normal DSH filesystem, filesystem-search,
PowerShell, skills, planning, goals, jobs, todos, workflow, and subagent
controls, plus these named worker lanes:

- `subagent_coder`: tuned local Coder behind the Halo verified composite;
  foreground-only, maximum two repair rounds, no overlap with the resumed 27B
  parent, and no live-workspace promotion without a passing verifier.
- `subagent_codex`: native Codex integration using the signed-in Codex
  subscription and `dangerously-bypass-approvals-and-sandbox`.
- `subagent_claude_build`: native Claude integration using the signed-in
  Claude subscription and `bypassPermissions`.
- `subagent_claude_plan`: native Claude read-only planning lane.

Codex and Claude are tools, not LM Studio picker models. Their provider
sessions are one-shot and receive self-contained briefs.

Generic `subagent`, `subagent_fork`, workflows, and Ralph remain available,
but the tuned local implementation path is specifically `subagent_coder`.

## 6. Permissions and modes

New Halo sessions default to:

- DSH permission preset: `danger-full-access`
- Approval policy: `never`

This grants the local agent the Windows user's available machine access. It
does not itself authorize unrelated actions; the user's request still defines
the work.

Permission mode, model choice, and DSH agent mode are different controls:

- Permission mode controls what the agent may access.
- The model picker controls which model answers.
- Standard/Plan and other DSH agent modes control behavior and tool use.
- The current local Coder child is Standard-derived, not Code/PTC mode.

Existing DSH sessions retain the permission preset with which they were
created; this default governs new sessions.

## 7. Web and research access

### Enabled now

The host profile connects DSH to `https://mcp.exa.ai/mcp` using DSH's
Streamable HTTP MCP client. It exposes:

- `mcp__exa__web_search_exa`
- `mcp__exa__web_fetch_exa`

This endpoint was tested without an Exa account or API key. A real 27B DSH
session called the search tool and retrieved the official DeepSeek Harness
GitHub repository.

GitHub research can use Exa for discovery and page retrieval, then the normal
DSH shell with `git`, `gh`, and PowerShell. Private access depends on the
credentials already available to the signed-in Windows user.

The installed DSH-visible Reddit skill is:

`C:\Users\scott\.agents\skills\reddit-search\SKILL.md`

It uses Reddit RSS and requires its documented machine-wide pacing. Exa/Jina
are not substitutes for Reddit content.

### Deliberately disabled

- Bundled `web-search-deepseek`: requires a DeepSeek API key.
- Bundled direct HTTP fetch: its current upstream implementation does not
  provide adequate private-network/SSRF protection for a full-machine agent.

### Not yet part of DSH

The Codex-side Crawl4AI skill at
`C:\Users\scott\.codex\skills\crawl4ai-research\SKILL.md` is not
automatically installed into DSH.

The Halo Research Gateway specification is not the live search path. Its
repository was partially built but never completed as a usable MCP server.
The durable next step is to finish its four safe core tools—search, fetch,
Reddit search, and Reddit thread retrieval—then gate browser crawling
separately on Windows security and reliability. Anonymous Exa is the working
immediate path.

This gives DSH strong public-web search and retrieval, but it is not literally
the private OpenAI-hosted Codex Desktop web service or its specialized
finance/weather/sports/PDF/browser functions.

## 8. Launch and operation

Desktop shortcut:

`C:\Users\scott\Desktop\Halo Cockpit.lnk`

Launcher:

`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`

The launcher:

1. Leaves model loading to LM Studio JIT.
2. Checks whether DSH is healthy on port 3080.
3. Reaps only a verified dead DSH-owned process holding that port.
4. Starts `pnpm dlx @deepseek-ai/dsh@0.1.1-rc.2 web` when needed.
5. Sets `DSH_PERMISSION_MODE=danger-full-access` for the new service.
6. Opens the cockpit in the default browser.

LM Studio must be running with its local API service enabled.

## 9. Verification and gate behavior

The 2026-08-27 installation pass verified through live DSH calls:

- Default Halo Orchestrator roster entry healthy.
- One `lmstudio` provider group with 18 picker models and zero catalog
  failures.
- 27B local response.
- Local Coder child response.
- Codex child response.
- Claude Plan response.
- Claude Build response.
- Direct picker switch to the Coder.
- Anonymous Exa search from the 27B.
- Sequential exclusive 27B -> Coder -> 27B residency.
- No lingering Codex or Claude child process after completed calls.

The cockpit must verify child work itself. A child result is advice, not
proof. For substantive builds the parent should inspect changed files and run
the real repository test command. The external generic verifier is:

`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\verify-generic.ps1`

Historical gateway-conductor failures show why acceptance tests must remain
frozen and why model self-reports cannot be treated as evidence.

This is still an advisory operating rule, not yet the agreed mechanical
completion boundary. Stage 3 will attach a DSH-native gate that makes a failed
or crashed verifier impossible to report as completed. `Halo-Code.ps1` and
`Gate-Build.ps1` are now explicitly labeled legacy external conductors; their
verifier logic is reference material, not the current Halo control plane.

## 10. Exact configuration paths

### Live installation

- `C:\Users\scott\.dsh\settings.yaml`
- `C:\Users\scott\.dsh\profiles\web\package.json`
- `C:\Users\scott\.dsh\profiles\web\pnpm-lock.yaml`
- `C:\Users\scott\.dsh\profiles\web\cordis.patch.yml`
- `C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\preset.yml`
- `C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\agent.cordis.yml`
- `C:\Users\scott\.lmstudio\settings.json`
- `C:\Users\scott\.lmstudio\hub\models\halo\qwen3.8-27b\model.yaml`
- `C:\Users\scott\.lmstudio\hub\models\halo\qwen3-coder-30b-a3b\model.yaml`

### Canonical reproducible copies

- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-settings.yaml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\web-cockpit.patch.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-orchestrator\preset.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-orchestrator\agent.cordis.yml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\lmstudio-models\halo\qwen3.8-27b\model.yaml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\lmstudio-models\halo\qwen3-coder-30b-a3b\model.yaml`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\STAGE-1-RUNTIME-EVIDENCE-2026-08-27.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md`

### Scott's Research-folder copies

- `C:\Users\scott\Desktop\Halo Stack Research\HALO-CURRENT-CONFIGURATION.md`
- `C:\Users\scott\Desktop\Halo Stack Research\HALO-STACK-GUIDE.md`
- `C:\Users\scott\Desktop\Halo Stack Research\HALO-DSH-IMPLEMENTATION-2026-08-27.md`
- `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration\`

## 11. Known limitations and next work

- The one-hour LM Studio idle TTL may be shortened if idle residency harms
  desktop responsiveness.
- Graded reasoning is intentionally unavailable on the tuned 27B route. Stage
  2 proved boolean reasoning `on` through the real DSH path; any future graded
  claim requires a new runtime comparison.
- The current Exa MCP tools have provider-qualified names rather than the
  eventual gateway's stable five-tool names.
- JavaScript-heavy crawling is not yet safely exposed to DSH.
- The Halo Research Gateway is partial and must not be described as deployed.
- The canonical Git repository contains pre-existing unrelated uncommitted
  work; it was not committed or reset during this configuration pass.

## 12. Supersession rule

For current operation, this document and the files in `Current Halo
Configuration` supersede contradictory operational statements in older
handoffs, reports, transcripts, and gateway build records. Those older files
remain useful historical evidence.
