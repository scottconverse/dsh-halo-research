> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# The citation gate — installed, tested, fails closed

**Built:** 2026-08-27, by Claude, after recommending a design based on an
unread code path.
**Replaces:** a promise. Promises from me have failed on this project before,
and the standing rule is: on the second occurrence, write a gate that fails the
build and prove it fails closed.

---

## 1. What it does

A Claude Code **Stop hook**. It runs when I try to end a turn. I do not invoke
it and I cannot skip it — the harness runs it.

If I wrote any document this session whose name contains *audit, verdict,
review, handoff, evidence, assessment,* or *findings*, the hook opens it and
requires a `## Verification ledger` section. Every claim in that ledger must be
one of:

```
VERIFIED: <claim> | <path>:<line>
UNVERIFIED: <claim> - not checked
```

For each `VERIFIED:` line the hook checks three things:
1. the cited file exists;
2. the cited line number is inside the file;
3. **the session transcript contains a tool call that actually read that file.**

Any failure blocks the turn (exit 2) and the reason is fed back to me. I then
have to either go read the source, or downgrade the sentence to `UNVERIFIED`.

`UNVERIFIED` is always accepted. The gate does not forbid uncertainty. It
forbids **silence** — stating a behavioural claim without saying whether I
checked it.

## 2. Why check 3 is the one that matters

My Stage 3 failure was not a false claim. "The gate can point the worker at
staging" was a *plausible* claim I never checked. A citation-format rule alone
would not have caught it, because I could have written a real file and a real
line number from memory.

Check 3 catches exactly that: the transcript is written by the harness, not by
me. If I did not run a tool that read the file, no wording gets me past it.
Test case 5 below is that exact scenario.

## 3. Proof it fails closed

`C:\Users\scott\.claude\hooks\audit-citation-gate.tests.ps1`, run 2026-08-27
(re-run from this durable location after being moved out of session temp):

```
[OK  ] no ledger, has verdict                     expected exit 2, got 2
[OK  ] ledger empty, has verdict                  expected exit 2, got 2
[OK  ] citation to missing file                   expected exit 2, got 2
[OK  ] citation line out of range                 expected exit 2, got 2
[OK  ] valid line but file never read             expected exit 2, got 2
[OK  ] valid citation, file was read              expected exit 0, got 0
[OK  ] UNVERIFIED escape hatch                    expected exit 0, got 0
[OK  ] blank-line file, valid last line           expected exit 0, got 0
[OK  ] numbered ledger heading                    expected exit 0, got 0
[OK  ] numbered heading, unread file              expected exit 2, got 2

[OK  ] example inside code fence ignored          expected exit 0, got 0
[OK  ] fence present, bad citation outside        expected exit 2, got 2
[OK  ] all claims hidden in a fence               expected exit 2, got 2
[OK  ] memory-path note excluded                  expected exit 0, got 0
[OK  ] same name outside memory blocked           expected exit 2, got 2

RESULT: 15/15 cases behaved correctly
```

Nine of the fifteen are red cases. Every one of them blocked.

## 3a. The gate's first live run blocked its own author — and found a bug

Dry-run against this session's real transcript, before the turn ended. It
returned exit 2 on two items:

1. **A false block.** It rejected a citation to `settings.yaml:102`, claiming
   the file had 98 lines. The file has 102 (`wc -l`, `grep -c ''`, and
   `grep -n` all agree, CRLF throughout). Cause: PowerShell's
   `Measure-Object -Line` counts lines *within* each string and returns 0 for
   an empty one, so the four blank lines vanished. Fixed to
   `@(Get-Content).Count`. Test case 8 is the regression.
   This mattered: a gate that falsely blocks gets switched off.
2. **A true block.** This document's ledger heading was `## 4. Verification
   ledger` and the pattern required an unnumbered heading. Relaxed to allow an
   optional section number — cosmetic only. Test case 10 proves it still fails
   closed with the relaxed pattern.

3. **A third defect, on the next live run.** It read the ledger *syntax
   example* in this document — inside a code fence — as a real citation. Audit
   documents will always contain examples. Fixed by stripping fenced blocks
   before parsing. Test 12 proves a bad citation outside a fence still blocks,
   and test 13 proves that hiding every claim inside a fence does not bypass
   the gate: the document then has zero ledger entries, which the
   verdict-without-entries rule blocks.

4. **A fourth defect, on the real Stop event.** The hook fired for real and
   blocked the turn over `memory/audit-citation-gate.md` — a Claude memory
   note, not a deliverable, caught because its filename contains "audit" and
   memory notes have a fixed frontmatter format a ledger would break. Fixed by
   excluding files whose **path** contains a `memory` directory. Test 14 proves
   the exclusion works; test 15 proves it is path-scoped only — the identical
   filename outside a memory directory is still blocked, so this is a scoping
   fix and not a hole.

All four defects were found by running it for real, not by reading it. That is
the same lesson the gate exists to enforce, applied to the gate itself. Three
of the four were false blocks — the failure mode that gets a gate switched off,
which is why each one got a regression test rather than a loosened rule.

## 4. Verification ledger

VERIFIED: A Stop hook receives `last_assistant_message` and `transcript_path`, and exit code 2 blocks the turn | C:\Users\scott\.claude\hooks\audit-citation-gate.ps1:14
VERIFIED: The gate is registered ahead of the existing notification hook and the JSON is valid | C:\Users\scott\.claude\settings.json:12
VERIFIED: The in-process child hard-codes the parent's cwd with no override | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent\src\child-agent.ts:110
VERIFIED: CreateAgentOptions.meta exposes a caller-settable cwd | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\core\agent\src\index.ts:95
VERIFIED: subagents.start takes a caller-supplied parent Agent | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent\src\index.ts:430
VERIFIED: setup runs pre-publication and appends policy to the child session | C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\subagent\subagent-in-process-driver\src\index.ts:120
UNVERIFIED: whether the spawn provider's assertCapabilities rejects anything relevant - not checked
UNVERIFIED: whether the staging-parent approach actually works at runtime - not executed; that is step 0 of the Codex handoff

## 5. What this gate does NOT do — read this before trusting it

- **It governs documents, not chat.** If I state a behavioural claim only in
  the terminal and write no governed file, the hook has nothing to open. My
  Stage 3 error appeared in both, so this covers the case that mattered — but
  it is a real gap.
- **It proves I opened a file, not that I understood it.** I could read a file
  for one reason and cite it for another. It raises the floor; it is not a
  comprehension check.
- **Filename-triggered.** A verdict written into a file named something else
  escapes it. Widen the pattern if that happens.
- **Fail-open on infrastructure faults only** — no stdin, unreadable
  transcript. Never on a failed citation check.

## 6. Files

- Hook: `C:\Users\scott\.claude\hooks\audit-citation-gate.ps1`
- Registration: `C:\Users\scott\.claude\settings.json` (Stop, first in order)
- Regression battery: `C:\Users\scott\.claude\hooks\audit-citation-gate.tests.ps1` — 15/15
- Re-run it after ANY edit to the hook. Nine of the fifteen cases are red cases;
  if a change makes a red case pass, the gate has been weakened.
- To inspect what is live: type `/hooks` in an interactive Claude Code terminal.
- To remove it: delete the first entry in `hooks.Stop[0].hooks`.
