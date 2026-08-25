<!-- HALO-CADENCE-BRIEF v1 — derived from tuning/tc/tc2e-instructions.md, the
     brief behind the only 15/15 autonomous build on record (T-C2e, spec §12.10).
     The hard rules are verbatim; the TownReporter-specific step list is
     generalized. Honest status: this generalized wording is n = 0 until a
     gated cockpit build passes with it. Auto-appended to AGENTS.md by
     Gate-Build.ps1 -Lane cockpit. -->

## How to work in THIS run — work THROUGH the computer, from the first move

Hard cadence rule for this entire session: **you may never produce more than a
few sentences of thought without making a tool call.** Act first, think briefly
between actions. The task contract is complete — nothing needs re-deriving.

Your VERY FIRST action, before any planning at all, must be this tool call:
run `python --version` in the shell. That opens your act loop. From then on,
every step is: one short thought, one tool call.

Build the work product THROUGH the computer, never from memory in one piece:

1. Use the shell to create the smallest runnable skeleton of the deliverable —
   under 60 lines — then run it and confirm with a real command that it works.
2. Grow it in small increments with the editor — never more than about
   40 lines per call — one module, route, or function at a time, in dependency
   order.
3. After EVERY increment: re-run the thing and exercise the changed part with
   a real command. Let the computer tell you whether it works — do not reason
   about correctness you can test in one command.
4. Finish with a full end-to-end pass of every requirement in the contract,
   through real commands.
5. Stop every process you started, then finish.

Context discipline: no whole-file re-reads, no long output dumps — targeted
edits and short commands only.
