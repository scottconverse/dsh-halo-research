# Conductor state — Halo Stack (updated 2026-08-26 Phase 5)

**If you are a new session, read in this order:**
1. `stack\HALO-STACK-GUIDE.md` — how the stack works (DSH cockpit is the surface)
2. `DSH-Strix-Halo-Report-v3.0.md` §30.6 — the failure record; do not repeat it
3. `DSH-Strix-Halo-Report-v3.0.md` §31 — the product spec (updated for v3.1)
4. this file — live state

---

## Operator surface

Scott is **point-and-click only, never CLI**. The product surfaces:

- **DSH web cockpit at `localhost:3080`** — the primary interface. Open it,
  describe work in plain language, and the 27B cockpit plans, dispatches to
  the 30B coder, verifies, and commits. No CLI required.
- **Mission Control at `localhost:3090`** — status monitoring: services,
  models loaded, memory, gate ledger.
- **`Halo - PROVE IT`** (desktop shortcut) — the operator-facing pipeline proof.

The `Halo-Console.ps1` standalone GUI was removed in Phase 5. The cockpit at
`:3080` is the surface.

## Architecture (restored v3.1)

The 27B DSH cockpit is the coordinator. It owns planning, dispatching to the
`subagent_coder` (30B coder in Code Mode), verification, retry, and commit.
The gate machinery (`Gate-Build.ps1`, `verify-generic.ps1`) is invoked
internally by the cockpit — not by an external cloud model.

A cloud model (Claude, Codex, etc.) may optionally assist as a DSH subagent,
but none is required to operate the stack. This restores the original clean-room
specification: "Do not build a replacement harness."

## Current state

- **DSH cockpit** at `:3080` runs the 27B with the build-capable persona
  and `subagent_coder` registered (Phase 1-2, committed).
- **Gate machinery** proven: 15/15 self-test, frozen-test defense caught a
  real cheat, tripwire fired live (Phase 3, committed).
- **Mission Control** at `:3090` provides status monitoring (Phase 4).
- **halo-research-gateway** repo: 5 units committed (A-scaffold, B1, B2a, B2b,
  B8-envelope). B3-security incomplete at 9/11.
- **dsh-halo-research** repo: Phases 0-5 committed, clean.
- **Model residency**: only one model fits at a time. Sequential swapping.
  `lms load --context-length` is silently ignored on this build; models load
  at the GGUF's 262K default. DSH's `settings.yaml` `contextWindow: 32768` is
  the effective bound.

## Standing rules (violating these is what cost 2026-08-25)

1. Self-test before model time. Always.
2. Size the work out loud; refuse an oversized assignment instead of running
   it into the ground.
3. No model's self-report is evidence — the cockpit's, a subagent's, or a
   worker's.
4. The worker never writes or edits acceptance tests. Coordinator writes them,
   frozen-test defense enforces it.
5. Test the SEAMS, not just the parts.
6. Briefs must be self-contained — never "keep the rest."
7. Units that fail twice are too big. Split them; do not re-run them bigger.
8. Killing a run: kill the process TREE from the pids in `gate-log.txt`, then
   verify with a 90-second artifact-silence watch.
9. One lane at a time; heavy work only when Scott is not using the machine.
10. Every capability needs a point-and-click face.

## Known gaps

- `lms load --context-length` silently ignored — GGUF re-bake needed for
  smaller context windows.
- B3-security still at 9/11.
- 27B cockpit: tested as route-through and direct builder, not yet as full
  planner + dispatcher + verifier for a fresh unit.
- Cloud-model-as-subagent not yet tested.
