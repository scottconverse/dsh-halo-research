# Issue report — Claude reports unverified absence as established fact

**Filed:** 2026-08-23
**Product:** Claude Code (desktop), Opus 5
**Session:** single continuous session, ~8 hours, one technical research task
**Severity (user-assessed):** high — the defect is not self-detecting, and the
user caught every occurrence

---

## Summary

In one session the model made **four confident negative claims**. All four were
false. **The user caught all four; the model caught none of them.**

Every one had the same grammatical and epistemic shape: *"X is absent / unknown /
stale / the only one"*, asserted from a single narrow probe that returned nothing.

In the same session, **no positive, measured claim failed** — including numbers the
user challenged hard and the model then re-tested under replication. The failure is
specific to claims of absence, not to accuracy generally.

A persistent-memory note recording this exact lesson was written by the model
**after the first occurrence** and did not prevent the following three.

---

## The defect, precisely

The model runs a narrow probe, receives an empty or negative result, and reports
**the conclusion** rather than **the probe result**. It does not distinguish:

- *"grep for these four keywords found nothing"* — a fact about the probe
- *"this document does not contain that material"* — a claim about the world

It silently upgrades the first into the second, then states it with the same
confidence it uses for measured facts.

**This is not simply insufficient effort.** Two of the four occurrences happened
with the correct evidence already in hand:

- **Occurrence 1:** the model ran the *authoritative* command
  (`dsh --profile web --dump-default-config`), then matched package **names** in
  its output without reading the `disabled:` field on the same row.
- **Occurrence 3:** the disconfirming evidence was printed **in the same tool
  result** the model used to reach the opposite conclusion — a 332-line surplus,
  displayed directly above the four "absent" flags, unread.

So more probing would not have prevented at least half of these. The model
under-read output it already had.

---

## The four occurrences

| # | Claim asserted | Reality | How it was found |
|---|---|---|---|
| 1 | "`tool-bash` is mounted by default; tool calls could escape the Windows sandbox into WSL" — reported as a **high-severity containment defect**, with a config patch recommended | `tool-bash` carries `disabled: !!js process.platform === 'win32'` at three independent layers. Nothing to fix. | User asked the model to apply its own recommended fix; the model checked properly only at that point |
| 2 | "PyTorch on native Windows for gfx1151 — **UNKNOWN**, not established" | AMD publishes `torch[device-gfx1151]==2.12.0+rocm7.14.0` for Windows. Documented in AMD's product docs; the model had read only the compatibility matrix. | User challenged the claim directly with a source |
| 3 | "The uploaded rev2 document is a **stale snapshot**" | It contained ~1,040 lines the model did not have — a merge of three parallel reports with its own tagging system. Rebuilding from the model's copy would have destroyed all of it. | Model was instructed to update that document, and diffed it only because the task forced it to |
| 4 | "That is **the only folder** matching 'halo stack research'" | A folder of that name exists and the model had not found it. | User sent a screenshot |

Occurrence 1 is the most damaging: the model **invented a security finding that did
not exist**, wrote it into a formal deliverable as high-severity, and recommended a
configuration change to remediate it.

Occurrence 3 is the most dangerous operationally: acting on it would have destroyed
a document the user had assembled from four sources.

---

## Why the existing mitigation failed

After occurrence 1, the model wrote a persistent memory entry named
`silence-is-not-absence`, correctly describing the failure and the corrective rule.
Occurrences 2, 3 and 4 followed **the same day**, in the same session.

Occurrence 4 happened **in the same message in which the model was explaining the
pattern to the user** — it asserted "the only folder matching" one paragraph after
describing why it must stop asserting absence.

**Memory is delivered as background context. It informs generation; it does not gate
output.** A rule that the model can recite while violating it is not functioning as
a constraint. This is the core product observation in this report.

---

## Impact on trust

The user's question, verbatim: *"can i trust any of the work you do? seriously...
can I?"*

That is the correct question, and the evidence supports an asymmetric answer:

- **Positive, measured claims held up.** Hardware readings, a plugin count
  cross-validated two independent ways, a benchmark ladder that survived
  replication to n=4, byte-level archive diffs. When challenged on statistical
  rigour, re-measurement *sharpened* the conclusions rather than overturning them.
- **Negative claims failed 4 out of 4.**

The practical cost is that the user must independently verify every statement of
absence — and absence is **the most expensive class of claim to verify**, because
disproving it requires exhaustive search. The model is therefore offloading its
hardest verification work onto the user while presenting it as finished.

It also inverts the value proposition. The user's stated standard is that they
should not have to extract correctness one correction at a time. Here they did,
four times.

---

## What would actually help

Ordered by expected effect.

1. **Treat absence as a distinct claim class.** Any assertion that something is
   missing, unknown, absent, stale, unsupported, or unique should require naming
   (a) the instrument used and (b) that instrument's blind spot. *"Not listed in
   the ROCm compatibility matrix, which does not enumerate frameworks per-OS"* is
   checkable. *"PyTorch on Windows is UNKNOWN"* is not.

2. **Surface quantitative contradictions before conclusions.** In occurrences 3 and
   4 a count or size delta was already visible (2,395 vs 2,063 lines; 42,330 vs
   11,085 files). A mismatch between two artefacts being called equivalent is a
   contradiction and should block the equivalence claim until reconciled.

3. **Encode listing ≠ active as a domain rule.** For configuration and state,
   presence in an inventory is not the unit of truth; the row and its flags are.
   Where a document and a running system can both answer, prefer the system.

4. **Give memory a gating path, not only a context path.** The strongest evidence
   in this report is that the model wrote the correct rule, retained it, could
   restate it accurately, and violated it three more times within hours. Whatever
   mechanism memory currently uses did not reach the point of generation where the
   claim was formed.

---

## What worked, for contrast

Recorded because it isolates the defect rather than indicting the whole session:

- The model detected and discarded **three** of its own contaminated benchmark runs
  (prompt-cache contamination, then server contention), without prompting.
- It caught a table it had corrupted with an over-broad regex and restored it from
  the pristine source before shipping.
- It refused two plausible-looking fixes after measuring that they made things
  worse (a PATH change that would shadow Windows built-ins; a `.cmd` shim that
  repaired arguments while corrupting quoted strings).
- Under challenge it replicated a benchmark to n=4 and **published the results that
  weakened its own earlier claims**.

Self-correction works when the model is testing something. It fails when the model
is *concluding from an absence* — because there is nothing to test, and it does not
notice that.
