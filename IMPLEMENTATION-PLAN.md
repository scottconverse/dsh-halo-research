# Implementation Plan — Restore DSH as the Primary Coding Harness

**Written 2026-08-26 by the Bionic session (Qwen3.8-27B), informed by the
Claude handoff, Codex's independent analysis, the old HALO archive, and the
DSH-Strix-Halo-Report-v3.0 specification.**

---

## What the operator actually wants

Open DSH in the browser at `localhost:3080`. Describe real software work
normally. The tuned 27B model owns understanding, planning, coordination, and
reporting. The Coder-30B performs most implementation work. DSH runs tests,
repairs failures, commits verified changes, and leaves usable evidence. A cloud
model may optionally assist later, but none is required to operate the stack.

This is the architecture the clean-room prompt specified. The current system
inverted it — an external frontier model became the coordinator, DSH became a
backend command that requires someone else to provide briefs, verification
commands, frozen tests, and retry decisions. This plan restores the original
direction.

---

## Current state (what is real and verified)

**DSH web cockpit** at `:3080` runs the 27B on LM Studio's API. Its persona
contains a "don't build here" routing rule that tells the 27B to shell out to
`Gate-Build.ps1` instead of building in-session.

**Worker lane** has a separate `DSH_HOME` at `stack\dsh-home-worker\` that
pins the 30B coder at 32K in Code Mode. Proven working — gate smoke tests
confirmed the coder identity from LM Studio server logs.

**Gate machinery** (`Gate-Build.ps1`, `verify-generic.ps1`, `test-harness.ps1`)
is solid: 15/15 self-test, caught a real worker cheat, feeds real failure
output back. The logic is good but the architecture is inverted — the gate
replaces DSH's orchestration instead of being a tool DSH invokes.

**DSH's native subagent system** is completely unused. DSH ships
subagent-spawn-in-process, tool-subagent (mountable multiple times with
per-instance `agentOptions {provider, model}`), tool-subagent-control, and
tool-subagent-report — all present in the stock composition but never
configured for this stack.

**Loader defect confirmed:** `Halo-Code.ps1` loads models without
`--context-length`, so LM Studio uses the GGUF's 262K default. Two models
at 262K leave 1.1 GB free. `Launch-Halo.ps1` already uses `--context-length
32768` correctly and loads both. This is a script defect, not a hardware
limit. Earlier measured evidence showed both models resident at bounded
contexts without issues.

**Four units shipped** to `halo-research-gateway`: A-scaffold, B1-config-logging,
B2a-migrations, B2b-cache. **Two stalled at 9/11**: B8-envelope (char budget
fixed-point + cursor pagination) and B3-security (IP literal classification).
Best implementations preserved in
`dsh-halo-research\stack\gateway-conductor\incomplete-units\`.

**Repos:** `dsh-halo-research` (stack) and `halo-research-gateway` (product)
are both clean on their current branches, ready for work.

---

## Phase 0 — Verify and fix the loader (no inference, no config change)

**Goal:** Prove both models fit at bounded 32K, then assert that everywhere.

| Step | Action | Validates |
|------|--------|-----------|
| 0.1 | Record baseline: `lms ps --json`, free memory | current state |
| 0.2 | Unload all models, then load both with `--context-length 32768 --gpu max -y` | `Launch-Halo.ps1`'s proven path |
| 0.3 | Verify via `lms ps --json` that both show `contextLength: 32768` | correct loading |
| 0.4 | Check free GPU memory after both loaded | co-residency viability |
| 0.5 | If free ≥ ~4 GB: co-residency works. Fix `Halo-Code.ps1` lines ~86-91 to use `--context-length 32768` instead of unloading the other model. If free < ~4 GB: sequential swapping is the fallback — measured and documented. | hardware truth, not assumption |
| 0.6 | Update documentation: `Halo-Code.ps1` comments, `CONDUCTOR-STATE.md`, spec §31.5 | docs match reality |

**Acceptance:** `lms ps --json` shows both models at `contextLength: 32768`
with ≥ 4 GB free, or the fallback is documented with a measured number.

---

## Phase 1 — Wire the subagent dispatch (DSH config only)

**Goal:** The 27B cockpit can dispatch implementation work to the 30B coder
via DSH's native `tool-subagent` system, instead of shelling out to a
PowerShell script.

### 1.1 — Register the coder subagent

Add to `~\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: tool-subagent-coder
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: spawn
    toolName: subagent_coder
    agentOptions:
      provider: lmstudio
      model: unsloth/qwen3-coder-30b-a3b-instruct
      maxTokens: 32768
```

This uses DSH's in-process spawn provider. The subagent runs in the same
process, shares the filesystem, and returns its result through the subagent
seam. The `agentOptions` pin it to the coder via LM Studio. The tool name
`subagent_coder` is what the 27B calls.

### 1.2 — Verify tool-subagent-control is enabled

The control tools (`list_agents`, `send_message`) are in the stock
composition. Confirm they are not disabled — this lets the 27B see running
subagents and interrupt long work.

### 1.3 — Verify the composition

Start a DSH web session. Confirm the trajectory view shows `subagent_coder`
as an available tool. Do not dispatch yet — verify the tool exists and the
coder model identity is confirmed in the LM Studio log when called.

**Risk:** §21.7 — the subagent provider-snapshot bug. Mitigated by making the
coder the local default and starting fresh sessions after config changes.

**Acceptance:** DSH web cockpit starts, trajectory view shows `subagent_coder`
as an available tool.

---

## Phase 2 — Replace the "don't build here" persona

**Goal:** The 27B cockpit owns the build process. It inspects the repo,
understands the task, plans the work, dispatches to the coder, runs
verification, interprets failures, and commits.

### 2.1 — Write the new cockpit persona

Replace the content of `~\.dsh\profiles\web\cordis.patch.yml` `system-prompt`
persona. The new persona:

- Keeps the LM Studio model identity and working directory
- Replaces "do not perform the build inside this session" with build-capable
  instructions:
  - Inspect the repository structure before building
  - Identify the test command from the project's own config (pyproject.toml,
    package.json, Makefile, etc.)
  - For implementation work: dispatch to `subagent_coder` with a
    self-contained brief naming exact files and quoting the test command
  - After subagent returns: run the exact test command yourself to verify
  - On failure: read the output, write a tighter brief naming the specific
    failure, re-dispatch
  - On success: commit with a descriptive message
  - Keep units small — if a subagent fails twice on the same task, split it
  - If dispatching to a repo with gate-authored tests, include explicit
    instructions not to modify test files
- References the gate scripts as verification tools the cockpit invokes,
  not as the orchestrator

### 2.2 — The gate stays as a tool

`Gate-Build.ps1`, `verify-generic.ps1`, and the test harness remain
unchanged. The difference is *who calls them*: the 27B cockpit calls them
as part of its build workflow, rather than a cloud model calling them from
outside. The persona instructs the cockpit to invoke verification directly
and use `verify-generic.ps1` for frozen-test enforcement.

### 2.3 — Update the canonical copy

Copy the new persona to `stack\web-cockpit.patch.yml` in the dsh-halo-research
repo (the canonical copy).

**Risk:** The 27B may not be capable enough as a full coordinator. This is
the honest unknown — the cockpit lane was tested as a route-through and as a
direct builder (15/15 cadence brief), never as a planner + dispatcher +
verifier. If it fails: escalation path is to configure `subagent-codex` or
`subagent-claude-code` so the 27B can call a cloud model for planning help —
but only as a subagent of DSH, not the other way around.

**Acceptance:** From a fresh DSH web session, asking "build X in repo Y"
results in the 27B inspecting the repo, dispatching to the coder, running
verification, and reporting the result — without shelling out to
`Halo-Code.ps1` or requiring an external brief.

---

## Phase 3 — Prove it with one real DSH-only build

**Goal:** Ship one unit end-to-end through DSH's web cockpit, with no cloud
model involved in writing product code.

### 3.1 — Choose the target

The envelope unit stalled at 9/11. Two small, well-defined remaining defects:
char budget fixed-point measurement and cursor pagination. Best implementation
preserved at `incomplete-units\envelope.BEST-9of11.py`. The brief at
`briefs\B8-envelope-final.md` already names the exact defects and quotes the
failing assertions.

### 3.2 — Seed the best implementation

Copy `envelope.BEST-9of11.py` to `src\halo_research_gateway\envelope.py` in
the halo-research-gateway repo. Run the test suite to confirm 9/11 pass.

### 3.3 — Dispatch from the cockpit

Open DSH web cockpit at `:3080`. Describe the task in plain language, then
let DSH do the work: inspect the repo, identify the test command, read the
failures, dispatch the coder with a specific brief, verify, retry if needed,
commit if green.

### 3.4 — Verify independently

After DSH claims success: manually run the test suite. Check the commit in
git log. Confirm the frozen test file was not modified.

**Acceptance:** 11/11 tests pass, the envelope unit is committed to
halo-research-gateway, the test file is untouched, and the entire loop
happened through DSH — no cloud model wrote product code or manually
shepherded units.

---

## Phase 4 — Reproduce Mission Control (lightweight, useful core only)

**Goal:** A monitoring surface at `:3090` showing the state relevant to the
current stack: model residency, gate ledger, free memory, active DSH sessions,
context pressure. Based on the proven backend from the old halo-stack project
but stripped of the overbuilt inline UI.

### What the old Mission Control was

A 3,270-line single-file Node.js app (zero dependencies) at
`mission-control.mjs` in the archived halo-stack repo. It polled every
surface on the machine — `lms ps`, `lms ls`, DSH sessions, GPU carveout from
the Windows registry, plugin catalogue, LM Studio logs, memory graph — and
exposed a single `/api/status` JSON endpoint at `127.0.0.1:3090`.

The backend was solid engineering: safe subprocess execution (shell:false
with resolved executables), CSRF protection (boot token + Origin/Referer
check), accurate GPU carveout detection, stall detection (5 min without log
advancement), brain config mismatch detection.

The problem was the embedded UI: 2,208 of 3,270 lines were an inline
hand-rolled single-page app with tabs, a force-directed memory graph
renderer, drag-and-drop, zoom/pan, and tooltips. It was built for the old
project and referenced that project's loader scripts, model names, and state
files.

### 4.1 — Extract the backend core

Build a new `mission-control.mjs` (or `halo-status.mjs`) in the
dsh-halo-research repo that:

- Binds to `127.0.0.1:3090` (same port, next to DSH at `:3080`)
- Exposes `/api/status` returning a JSON snapshot of:
  - **Models:** what's loaded, quantizations, context lengths, local vs
    remote origin (carried forward from the old MC)
  - **Gate ledger:** last N rows from
    `stack\gateway-conductor\LEDGER.csv` — what shipped, what's red,
    what's in progress
  - **Memory:** free RAM, GPU carveout, free GPU memory (carried forward
    from the old MC's registry-based carveout detection)
  - **DSH sessions:** active sessions with context fill percentages and
    stall detection (carried forward)
  - **Cockpit/worker:** are both models resident, is the cockpit serving,
    brain config mismatch check
- Keeps the safe subprocess pattern (shell:false, resolved executables)
  and CSRF protection from the old code
- Does NOT embed the inline UI — serves a separate, simple HTML status
  page as a static file

### 4.2 — Build a simple status page

A single HTML file (separate from the server, not a string literal) that
hits `/api/status` and renders:

- A status strip: models loaded, cockpit up/down, gate ledger summary
- Model residency: which models, quants, context lengths, origin
- Recent gate activity: last 5 ledger rows with verdicts

No tabs, no force-directed graph, no drag-and-drop. Readable at a glance.
The DSH web cockpit at `:3080` is the product surface; this is monitoring.

### 4.3 — Add a desktop shortcut

`Halo Status` — opens the status page at `:3090` in the default browser,
same pattern as the existing `Halo Cockpit` shortcut. Point-and-click only.

### Size estimate

~400 lines for the backend (data collection from lms, sessions, GPU, ledger),
~200 lines for the HTML status page. Total: ~600 lines vs the old 3,270.

**Acceptance:** Open `:3090` — see which models are loaded, free memory, the
last gate verdicts, and whether any DSH session is stalled.

---

## Phase 5 — Cleanup and hardening

| Step | Action |
|------|--------|
| 5.1 | Remove `Halo-Console.ps1` and its desktop shortcut. The cockpit at `:3080` is the surface; the status page at `:3090` is the monitor. The standalone GUI is redundant. |
| 5.2 | Rewrite `HALO-STACK-GUIDE.md`: currently describes cloud-model-as-coordinator. Replace with: how DSH drives the stack, how the gate works as an internal verification tool, and how a cloud model can be used as a DSH subagent (the original direction). |
| 5.3 | Update `DSH-Strix-Halo-Report-v3.0.md` §31: record the architecture restoration. |
| 5.4 | Update `CONDUCTOR-STATE.md`: keep the standing rules (self-test, frozen tests, unit sizing) but state that the 27B cockpit is the conductor. |
| 5.5 | Dispatch the second incomplete unit (B3-security) through the same DSH-only pipeline. |

---

## What this plan does NOT do

- Build another GUI. DSH's web cockpit is the surface.
- Build an MCP coding wrapper. That's secondary — useful only after DSH can
  build independently, and only as a convenience bridge from other chat apps.
- Modify the gate's verification logic. Frozen tests, anti-shrinkage, and
  evidence preservation are correct. They stay.
- Touch the Halo Research Gateway spec or implementation. Separate project.
- Rebuild the old Mission Control's inline UI. The useful monitoring core is
  extracted; the 2,200-line embedded SPA is left in the archive.

---

## Honest risks

- **The 27B may not be capable enough as a coordinator.** Untested. If it
  fails at planning + dispatch: configure a cloud model as a DSH subagent
  (via `subagent-codex` or `subagent-claude-code`) for planning help only.
  The 30B coder still does the implementation.

- **The subagent provider-snapshot bug** (§21.7 of the spec). Mitigated by
  using the coder as the local default and starting fresh sessions.

- **Co-residency may genuinely not work.** Phase 0 determines this. If both
  models don't fit at 32K, sequential swapping is the fallback.

- **The envelope unit may still not converge.** 9/11 tests already pass.
  The remaining two defects are named and small. If the coder still breaks
  the module, escalate to the cockpit lane (27B direct build) or split
  further.
