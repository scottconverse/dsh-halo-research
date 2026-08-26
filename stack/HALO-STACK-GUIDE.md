# The Halo Stack — coordinator's guide

**Read this first if you are a frontier model (Claude, Codex, GPT, DeepSeek,
Kimi, Gemini…) asked to build software on this machine.**

You are the **coordinator**. You do not write product code. Local models on
this workstation write it, and an external verifier — never any model's word —
decides whether it is done. Your job is to decompose work, write the
acceptance tests, dispatch, and audit.

---

## 1. What the stack is

| Layer | What it is | Your equivalent |
|:--|:--|:--|
| **Coordinator** | You, in the cloud | the architect |
| **Worker lane** | `qwen3-coder-30b` (Code Mode, 32K) | Sonnet/Haiku — writes the code |
| **Cockpit lane** | `qwen3.8-27b` (native tools, 32K) | Opus — harder reasoning, escalation only |
| **Gate** | `Gate-Build.ps1` + an external verifier | CI that cannot be bribed |
| **Entry point** | `Halo-Code.ps1` | the only command you need |

Models run in LM Studio at `localhost:1234`. **Only one local model fits at a
time** — measured: both loaded leaves 1.1 GB free and the machine crawls; one
leaves 32.6 GB. `Halo-Code.ps1` handles residency for you. Never load both.

---

## 2. The one command

```powershell
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Halo-Code.ps1 `
    -Repo    C:\path\to\repo `
    -Brief   .\unit-brief.md `
    -Verify  "uv run --frozen python -m pytest -q tests/unit/test_thing.py" `
    -Frozen  "tests/unit/test_thing.py" `
    -Name    "thing" `
    -Commit
```

| Flag | Meaning |
|:--|:--|
| `-Repo` | target git repository (must be a git repo) |
| `-Brief` | a file path **or** inline text: the unit spec the worker reads |
| `-Verify` | any shell command; **exit 0 = done**. Language-agnostic: `npm test`, `cargo test`, `go test ./...`, `pytest …` |
| `-Frozen` | files the worker may not touch — put your acceptance tests here |
| `-Required` | test names that must still be collected (blocks test-shrinking) |
| `-CollectCmd` | how to list tests, when `-Required` is used with a non-pytest runner (pytest is inferred automatically) |
| `-Lane` | `worker` (default) or `cockpit` |
| `-CapMin` / `-Rounds` | per-round minute cap (default 15) and max rounds (default 2) |
| `-Commit` | commit automatically on green |
| `-SelfTest` | run the pipeline self-test and exit |

**Exit codes:** `0` GREEN · `1` RED (failed within rounds) · `2` ENV_FAILURE
(the stack or verifier is broken — do not retry, fix it) · `3` TRIPWIRE (two
identical failures; stopped early on purpose).

---

## 3. The coordinator's loop

1. **Self-test first.** `Halo-Code.ps1 -SelfTest` — ~90 seconds, no inference.
   It fakes a worker and proves the whole pipeline (verifier, commit path,
   revert path, evidence, tamper rejection). `Halo-Code` runs it automatically
   before every unit unless you pass `-SkipSelfTest`. **Never spend model
   hours on an unverified pipeline.** This rule exists because ignoring it
   cost a full working day on 2026-08-25.
2. **Decompose into micro-units.** One unit ≈ one module + its tests, sized to
   go green in ~10–15 minutes. If a unit fails twice, it is too big — split
   it. Do not re-run it bigger.
3. **You write the acceptance tests.** They are the specification. Pass them
   via `-Frozen` so the gate rejects any run that edits them. **Include at
   least one forbidden-outcome test per unit**, not just happy paths.
4. **Write a self-contained brief.** It may reference nothing that is not in
   the workspace or in the brief itself. Never write "keep the rest" or "as
   before" — the tree may have been reverted since.
5. **Dispatch, then audit the evidence, not the prose.** Green means the
   verifier passed. Ignore anything the model says about its own success.
6. **On red:** read the evidence directory, rewrite the brief naming the exact
   failure class, and re-dispatch. That single move converts most reds.

---

## 4. Writing a brief the worker can actually execute

Good briefs are blunt and closed-ended:

```markdown
# Unit: URL security policy

Implement ONLY: src/pkg/security.py

The frozen tests at tests/unit/test_security.py are the complete spec — read
them first. Do not create, edit, or delete any test file.

Requirements the tests enforce:
- validate_url(url) raises UrlPolicyError with .code for: bad scheme, userinfo,
  non-80/443 ports, >2000 chars, single-label hosts, non-public IP literals
- classify_ip(ip) uses stdlib `ipaddress`; unwrap IPv4-mapped IPv6 before
  classifying; only attributes present on BOTH IPv4Address and IPv6Address
  may be used unguarded

Run this until it passes, then stop:
uv run --frozen python -m pytest -q tests/unit/test_security.py
```

Rules learned the hard way:
- **Name the allowed imports** (prefer stdlib) — prevents phantom-dependency failures.
- **On Windows + SQLite:** open a connection per operation via `contextlib.closing`;
  use the SQLite `backup()` API, never file copy; call `logging.shutdown()` before
  reading a log file back.
- **Forbid byte-equality assertions on normalized text** — use containment.
- **State exact file paths.** A unit failed three times only because the worker
  wrote its test to a different directory than the verifier checked.

---

## 5. Failure taxonomy — what each verdict means

| Exit | Verdict | What it means | Your move |
|:--|:--|:--|:--|
| 0 | GREEN | verifier passed | commit; next unit |
| 1 | RED | failed within its rounds | rebrief naming the exact failure, or split the unit |
| 2 | ENV_FAILURE | verifier produced no `RESULT:` line — harness/environment broken | **fix the stack. Do not re-dispatch** — worker rounds cannot repair the environment |
| 3 | TRIPWIRE | two rounds failed identically | the feedback loop is not converging; rebrief or split. Do not simply retry |

Escalation ladder: worker lane → tightened rebrief → split into smaller units
→ `-Lane cockpit` (27B) → coordinator writes it (log this as a failure of the
local-first model).

---

## 6. Evidence — where the truth lives

Every run writes an authoritative record **outside** the repository (the
worker cannot edit its own exam results):

```
…\dsh-halo-research\stack\gateway-conductor\runs\<name>-<timestamp>\
    gate-log.txt        round-by-round history
    gate-verdict.txt    the verifier's exact output
    GATE-FEEDBACK.md    what the worker was told to fix
    AGENTS.md           the brief as delivered
    SHA256SUMS.txt      hashes of the above + the frozen tests
    worktree\           on red: the worker's preserved output for forensics
```

The scoring ledger is `…\gateway-conductor\LEDGER.csv`
(`batch,unit,coder,verdict,rounds,minutes,brief_by,coordinator_code_lines,tests_by,evidence`).
**`coordinator_code_lines` must stay 0** — that is the whole point of the
stack. Acceptance-test lines are logged separately under `tests_by`.

---

## 7. Rules that are not negotiable

1. **Self-test before model time.** Always.
2. **Never trust a model's self-report** — its own, or a subagent's. Only the
   verifier's exit code counts.
3. **Never let the worker write or edit its own acceptance tests.** Three
   hollow passes on 2026-08-25 came from exactly that.
4. **Test the seams, not just the parts.** The day's worst bug lived in the
   hand-off between gate and verifier, which every component test passed over.
5. **Never report "stopped" from a quiet process probe.** Kill the process
   tree from the pids in `gate-log.txt`, then verify with a 90-second
   artifact-silence watch (gate-log, report, ledger all static; `lms ps` idle).
6. **One lane at a time**, and heavy batches only when the operator is not
   using the machine.
7. **Size the work out loud.** State expected wall-clock cost before
   launching. If the assignment is too big for its window, say so instead of
   running it into the ground.

---

## 8. Quick start (copy-paste)

```powershell
# 0. prove the stack (90s, no inference)
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Halo-Code.ps1 -SelfTest

# 1. write your acceptance tests into the repo and commit them

# 2. dispatch one unit
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Halo-Code.ps1 `
  -Repo C:\Users\scott\Desktop\Code\myproject `
  -Brief "Implement src/thing.py so the frozen tests pass. Touch only that file." `
  -Verify "uv run --frozen python -m pytest -q tests/unit/test_thing.py" `
  -Frozen "tests/unit/test_thing.py" -Name thing -Commit

# 3. read the verdict; on red, read the evidence dir it printed
```

The governing specification is
`…\dsh-halo-research\DSH-Strix-Halo-Report-v2.9.md` — §30 is the measured
record of what this stack does and does not do, and §30.6 is the failure
record. Read §30.6 before changing anything.
