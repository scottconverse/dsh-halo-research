# Fix envelope.py — char budget fixed-point measurement

Implement ONLY: src/halo_research_gateway/envelope.py

One test is failing — fix it. Touch ONLY envelope.py. Do NOT create, edit,
or delete any test file.

## The failure

```
assert 2808 == 2838
```

The test expects `page.serialized_chars == len(json.dumps(env))` EXACTLY.
The current code hardcodes a value that's 30 chars off because writing the
number into the JSON changes the document length.

## The fix

Before returning the envelope, iterate to a fixed point:

1. Set `serialized_chars` to 0
2. Loop: measure `len(json.dumps(env))`, if it matches `serialized_chars`,
   break. Otherwise set `serialized_chars` to the actual length.
3. Cap the loop at 10 iterations.

Also apply this same fixed-point measurement when deciding how many items
fit within `char_budget` — the item count must be based on the actual
serialized size, not an estimate.

## Definition of done

Run EXACTLY this command:

    uv run --frozen python -m pytest -q tests/unit/test_envelope.py

THIS COMMAND IS THE ONLY CHECK THAT COUNTS. Do not write extra scripts,
validators, or scratch test runners. Edit the source file, run the command,
read the error, edit again. When the 10 previously-passing tests still pass
AND test_page_respects_char_budget passes, STOP.

The test_truncated_page_emits_cursor_and_warning test will still fail — that
is the NEXT unit. Do not try to fix it. Only fix the char budget assertion.


## Frozen files (gate-enforced)

These files are the specification. Do NOT create, edit, or delete them; any modification fails the gate automatically:
- `tests/unit/test_envelope.py`


## Definition of done

Run EXACTLY this command to check your work:

```
uv run --frozen python -m pytest -q tests/unit/test_envelope.py -k 'test_page_respects_char_budget or not test_truncated_page'
```

Working rules (these decide whether you finish in time):
- This command is the ONLY check that counts. Do NOT write extra scripts,
  debug files, validation harnesses, or scratch test runners - they waste the
  clock and are deleted. Edit the source file, run the command, read the
  error, edit again.
- Change the smallest thing that fixes the reported error, then re-run.
- When the command passes, STOP immediately and say you are done.
- You have 15 minutes. If time is short, make the most failing test pass
  first rather than refactoring.


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



## Frozen files (gate-enforced)

These files are the specification. Do NOT create, edit, or delete them; any modification fails the gate automatically:
- `tests/unit/test_envelope.py`


## Definition of done

Run EXACTLY this command to check your work:

```
uv run --frozen python -m pytest -q tests/unit/test_envelope.py -k 'test_page_respects_char_budget or not test_truncated_page'
```

Working rules (these decide whether you finish in time):
- This command is the ONLY check that counts. Do NOT write extra scripts,
  debug files, validation harnesses, or scratch test runners - they waste the
  clock and are deleted. Edit the source file, run the command, read the
  error, edit again.
- Change the smallest thing that fixes the reported error, then re-run.
- When the command passes, STOP immediately and say you are done.
- You have 15 minutes. If time is short, make the most failing test pass
  first rather than refactoring.
