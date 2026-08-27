# The Halo Stack — DSH cockpit guide

**The DeepSeek Harness web cockpit at `localhost:3080` is the product surface.
This machine's operator is point-and-click only and never uses a CLI.**

---

## 1. What the stack is

| Layer | What it is | Role |
|:--|:--|:--|
| **Cockpit** | DSH web at `:3080`, 27B model (Qwen3.8-27B, Q5_K_XL) | planner, coordinator, gatekeeper |
| **Worker** | 30B coder (Qwen3-Coder-30B, Q4_K_S, Code Mode) | implementation — dispatched by cockpit via `subagent_coder` |
| **Gate** | `Gate-Build.ps1` + `verify-generic.ps1` | external verification — frozen tests, anti-shrinkage, evidence |
| **Mission Control** | status page at `:3090` | monitoring: services, models, memory, gate ledger |

Models run in LM Studio at `localhost:1234`. **Only one local model fits at a
time** — the 27B cockpit and 30B coder swap sequentially. Do not load both
simultaneously without warning the operator.

## 2. How a build works (the cockpit drives it)

1. **Operator opens DSH at `:3080`** and describes the work in plain language.
2. **The 27B cockpit** inspects the repository, identifies the test command
   (from `pyproject.toml`, `package.json`, `Makefile`, etc.), and constructs
   a plan.
3. **The cockpit dispatches implementation** to the `subagent_coder` tool
   (the 30B coder in Code Mode) with a self-contained brief naming exact
   files, test commands, and failing assertions.
4. **The cockpit runs verification itself** — never trusts the subagent's
   self-report. On failure, it reads the output, tightens the brief, and
   re-dispatches. On repeated failure, it splits the unit.
5. **On green, the cockpit commits.** Before committing, it invokes the
   external verifier for frozen-test enforcement:
   ```
   pwsh -File C:\Users\scott\Desktop\Code\dsh-halo-research\stack\verify-generic.ps1 -Workspace .
   ```
6. **A cloud model (Claude, Codex, GPT, etc.) may optionally assist as a
   DSH subagent**, but none is required to operate the stack.

## 3. The gate machinery

`Gate-Build.ps1` and `verify-generic.ps1` are verification tools the cockpit
invokes — not an external orchestrator. They enforce:

- **Frozen acceptance tests**: files the worker may never edit. The gate
  rejects any run that touches them.
- **Anti-shrinkage**: every required test name must still be collected.
  Deleting a failing test to get a green is caught.
- **Evidence**: every run writes `gate-log.txt`, `gate-verdict.txt`,
  `GATE-FEEDBACK.md`, and `SHA256SUMS.txt` outside the workspace.
- **Tripwire**: two identical failures stop the unit early.

## 4. Standing rules

1. **Self-test before model time.** `Halo-Code.ps1 -SelfTest` — ~90 seconds,
   zero inference. Run it before any batch.
2. **Never trust a model's self-report.** Only the verifier's exit code
   counts as evidence. This applies to the cockpit, the subagent, and any
   cloud model.
3. **The worker never writes or edits acceptance tests.** Frozen-test defense
   catches cheats. Three hollow passes on 2026-08-25 came from this.
4. **Units that fail twice are too big.** Split them; never re-run them
   bigger.
5. **Briefs must be self-contained.** Never say "keep the rest" — the tree
   may have been reverted since.
6. **One lane at a time.** Heavy batches only when the operator is not using
   the machine.
7. **Every capability needs a point-and-click face.** The cockpit at `:3080`
   and Mission Control at `:3090` are the operator's interfaces.

## 5. Key files

| Path | What it is |
|:--|:--|
| `localhost:3080` | DSH web cockpit — the product surface |
| `localhost:3090` | Mission Control — status monitoring |
| `stack\Halo-Code.ps1` | the gate entry point (for direct dispatch) |
| `stack\Gate-Build.ps1` | the gate loop |
| `stack\verify-generic.ps1` | language-agnostic verifier |
| `stack\gateway-conductor\test-harness.ps1` | pipeline self-test |
| `stack\gateway-conductor\LEDGER.csv` | scoring ledger |
| `stack\mission-control\mission-control.mjs` | Mission Control backend |
| `stack\mission-control\status.html` | Mission Control frontend |

## 6. Architecture note

The original clean-room specification (§1 of the governing report) called for
DSH to be the primary harness — the 27B owning planning, the 30B doing
implementation, and cloud models as optional subagents. This was restored in
v3.1 (2026-08-26). The prior v3.0 architecture inverted this: a cloud model
coordinated from outside and DSH was reduced to a model-inference endpoint.
The cockpit persona now tells the 27B to own the build; the gate is invoked
internally; and cloud models are optional DSH subagents.

Governing spec: `DSH-Strix-Halo-Report-v3.0.md` §31.
Continuation authority: `stack\gateway-conductor\CONDUCTOR-STATE.md`.
