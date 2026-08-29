# The Halo Stack — DSH cockpit guide

**The DeepSeek Harness web cockpit at `localhost:3080` is the product surface.
This machine's operator is point-and-click only and never uses a CLI.**

---

## 1. What the stack is

| Layer | What it is | Role |
|:--|:--|:--|
| **Cockpit** | DSH web at `:3080`, tuned alias `halo/qwen3.8-27b` (Qwen3.8-27B Q5_K_XL) | planner, coordinator, gatekeeper |
| **Worker** | tuned alias `halo/qwen3-coder-30b-a3b` (Qwen3-Coder-30B Q4_K_S) | implementation — dispatched as a foreground one-shot child via `subagent_coder` |
| **Gate** | Halo Verified Coder plugin (Stage 3 installed) | isolated staging, protected tests, fail-closed verification, promotion/rollback evidence |
| **Mission Control** | status page at `:3090` | monitoring: services, models, memory, gate ledger |

Models run in LM Studio at `localhost:1234`. Halo intentionally keeps **one
local model resident at a time** for desktop responsiveness. LM Studio JIT
swaps the 27B cockpit and 30B coder sequentially.

Both Halo aliases carry their load envelopes with them. A 2026-08-27
DSH-native proof showed one 32K slot on both models, 2048/512 batches, Flash
Attention, 32 checkpoints, GPU KV offload, and MTP `n=4 / p=0.5` on the 27B.
The receipt is `STAGE-1-RUNTIME-EVIDENCE-2026-08-27.md`. Do not replace the
aliases with the raw model ids in normal Halo routing; doing so drops the
enforced load envelope.

The 27B route uses LM Studio's real boolean reasoning default, `on`. DSH shows
no graded effort selector for this alias because relabeling `on` as `medium`
would be false. `STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md` proves a real DSH
request produced a separated reasoning block with no conversion warning.

## 2. How a build works (the cockpit drives it)

1. **Operator opens DSH at `:3080`** and describes the work in plain language.
2. **The 27B cockpit** inspects the repository, identifies the test command
   (from `pyproject.toml`, `package.json`, `Makefile`, etc.), and constructs
   a plan.
3. **The cockpit dispatches implementation** to `subagent_coder` with a
   self-contained brief, explicit editable paths, protected test/verifier
   paths, and an executable-plus-argument verification command.
4. **The tool, not the model, owns acceptance.** It runs the Coder in an
   isolated staging worktree, rejects protected or out-of-scope changes, and
   verifies in a second worktree built with the protected baseline. A failed,
   timed-out, or crashed verifier is a failure. One repair round is allowed.
5. **Only a green unit is promoted.** The gate refuses promotion if the live
   editable paths changed concurrently, backs up each promoted file, reruns
   verification in the live workspace, and restores the backup on failure.
6. **A cloud model (Claude, Codex, GPT, etc.) may optionally assist as a
   DSH subagent**, but none is required to operate the stack.

The model picker changes which model answers the current DSH conversation. It
does not create a plan, choose a worker, wait for that worker, or verify the
result. The Halo Orchestrator is the configured agent preset that performs
those jobs and owns the `subagent_coder`, Codex, and Claude delegation tools.

## 2.1 Web research

The Halo Orchestrator has anonymous public-web discovery and retrieval through
`mcp__exa__web_search_exa` and `mcp__exa__web_fetch_exa`. These use the same
keyless hosted Exa MCP endpoint used by OpenCode. Reddit research uses the
installed `reddit-search` skill and its machine-wide RSS pacing rules. The
bundled DeepSeek-keyed search provider and the unsafe direct HTTP fetch
provider remain disabled.

## 3. The gate machinery

`halo-verified-coder\index.mjs` is the DSH-native gate tool and
`halo-verified-coder\gate-core.mjs` is its zero-dependency gate engine.
`verify-generic.ps1` remains available as one verifier command.
`Halo-Code.ps1` and `Gate-Build.ps1` are legacy external conductors retained
for history only; they are not the control plane. Once a gated unit starts,
the plugin also denies `update_goal(action=complete)` for that parent until
the latest verdict is `PASS`.

The verifier logic covers:

- **Frozen acceptance tests**: files the worker may never edit. The gate
  rejects any run that touches them.
- **Anti-shrinkage**: every required test name must still be collected.
  Deleting a failing test to get a green is caught.
- **Evidence**: every run writes a structured `verdict.json` outside the
  workspace, including rounds, changed paths, verifier output, and terminal
  state.
- **Bounded repair**: the worker receives at most one repair turn (two total
  rounds); failure remains failure and is never promoted.

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
8. **Coordinate heavy windows with Townlight.** Before loading either large
   Halo model, get `HALO-CLEAR` from the `Townlight STATION dev` task. Unload
   all Halo models and send `HALO-RELEASED` when the window ends.

## 5. Key files

| Path | What it is |
|:--|:--|
| `localhost:3080` | DSH web cockpit — the product surface |
| `localhost:3090` | Mission Control — status monitoring |
| `stack\Halo-Code.ps1` | LEGACY external orchestrator; reference only |
| `stack\Gate-Build.ps1` | LEGACY external conductor; reference only |
| `stack\verify-generic.ps1` | language-agnostic verifier |
| `stack\gateway-conductor\test-harness.ps1` | pipeline self-test |
| `stack\gateway-conductor\LEDGER.csv` | scoring ledger |
| `stack\mission-control\mission-control.mjs` | Mission Control backend |
| `stack\mission-control\status.html` | Mission Control frontend |
| `stack\lmstudio-models\halo\...\model.yaml` | tuned JIT load envelopes for the two Halo aliases |
| `stack\STAGE-1-RUNTIME-EVIDENCE-2026-08-27.md` | DSH-native slot/config/swap receipt |
| `stack\STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md` | DSH-native boolean-reasoning receipt |

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
