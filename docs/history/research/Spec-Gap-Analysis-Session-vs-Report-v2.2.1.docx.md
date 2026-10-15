> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Text extraction: Spec-Gap-Analysis-Session-vs-Report-v2.2.1.docx

Extracted from the original Word document. Images, formatting and embedded objects are not included. Original binary remains local.

Spec Gap Analysis: Session Transcript vs DSH-Strix-Halo-Report v2.2.1

Prepared for Claude · Purpose: fix the spec so it matches what the session measured and decidedSources audited: SessionTranscript (with thinking), DSHStrixHaloReportv2.2.1.docxDate: 2026-08-23

1. Purpose of this document

This is an audit of whether DSH-Strix-Halo-Report v2.2.1 faithfully captures the discussion, findings, direction, and decisions from the full session transcript (including internal thinking). It is written so the missing items can be merged into the spec without re-deriving them.

Verdict up front: the report is a strong clean-room research baseline. It does not faithfully capture the session’s architecture decisions or its most important measured defaults. Several items the session locked with numbers are still marked “not yet measured” in the report.

2. What is already faithful — do not rework

These session results are already in the report, correctly framed. Leave them.

Session finding

Report location

Tools-on accuracy 28% → 100%, 5.1× faster wall-clock (36 graded runs)

§12.7

Planted-bug probe: refused to invent a bug; found Math.ceil→Math.floor; honored don’t-commit

§12.8

Unsloth Q5_K_XL vs bartowski Q5_K_M = dead heat; keep incumbent

§13.2 / T-26

DGX Spark same-model comparison (single-user parity; concurrency gap; capacity win)

§24.4b

Lucebox and Unsloth Studio as competing servers on this silicon

§11.2

User edits: danger-full-access paragraph removed; §21.3 → “this text deleted by user”; §18.2b de-walled to optional

§18.2, §18.2b, §21.3

pwsh-not-bash; “nothing to build” for the code sandbox

§6.5, §12.7

Config gotchas: API key cannot be blank; models by NAME not ID

§24.4b

ROCm vs Vulkan measurements; VGM 64 GB; memory architecture

§8–§10

Temp-cleanup sandbox break (Discussion #758)

§18.2, §21.10

Method failure pattern (silence ≠ answer) recorded as §27 item 24

§27



3. Required fixes — ordered by consequence

3.1 FIX A — Close T-1: MoE worker was measured (highest priority)

The report still says the two-model / MoE-worker claim is derived and not measured. The session measured it on this machine and locked defaults from the numbers.

Report language that is wrong (verbatim):

“That asymmetry is the whole argument for a two-model portfolio… This claim is derived, and §20 lists the measurement that would confirm it on this box. It is not yet measured here and is not presented as though it were.” — §13.2

Session numbers that close it (Phase 2 bench day):

Metric

Q5 dense (brain)

Coder MoE (worker)

Fresh prefill (19.6K prompt)

181 tok/s · TTFT 108.6 s

615 tok/s · TTFT 31.8 s

Cached TTFT

13.4 s (8.1×)

0.28 s (115×)

Decode solo

26.9 tok/s

90.9 tok/s

Decode concurrent (both generating)

19.0 tok/s (−29%)

87.8 tok/s (−3%)

Full harness coding task wall-clock

176 s

41 s Standard · 65 s Code mode

Correctness

4/4 tests, staged, no commit

Same, both modes

Resident memory

19.7 GB

+16.3 GB (free RAM 35.7 → 19.0)



Locked verdicts from the session (write these into the report as measured defaults):

 Cockpit: Q5 dense, Standard mode — best reporting discipline; prefix cache neutralizes prefill pain.

 Fan-out / subagent work: Coder MoE on demand — 4.3× wall-clock at equal correctness.

 Residency: worker on demand with TTL (Load-Worker-Coder.mjs, 2 h TTL was written); not permanent dual-resident. Unload after use.

 Code mode: not default — correct but slower on normal task sizes (65 s vs 41 s).

 Concurrent decode contends on one iGPU; co-residency buys swap-free worker turns, not doubled throughput.

Action: Rewrite §13.2 two-model paragraph as measured. Close T-1 (or retarget T-1 if it meant something else). Update any “EXPERIMENTAL / unmeasured” labels that depend on this claim. Keep the honesty that concurrent decode is contended and residency is bench-gated.

3.2 FIX B — Record Hermes retirement

Session decision (explicit): retire Hermes as a separate ops plane. Jobs, skills, goals, and Ralph loops already ship in the stock composition. The one real gap is durable scheduling (dsh-schedule: after/at/fixed-rate) — not mounted; composition row only.

Action: Add a short decision note (e.g. under §19.2 “deliberately absent” or §22 Reject/Watch). Do not leave Hermes as an open Phase 5. State that unattended durable cron is the remaining gap if needed, not a parallel harness.

3.3 FIX C — Record Mission Control outcome

Session path: Mission Control was designed as a late thin observability layer, then built, then found defective (WT-1: status page reported model resident while LM Studio was down). Operator direction leaned toward either a minimal status page reading what plugins already expose, or dropping it as not worth a second control plane.

Action: Do not leave Mission Control as an open Phase 6 with no decision. Record it as optional thin status page (read-only, no second control plane) or explicitly deferred/rejected. Note WT-1 if status UI is retained as a requirement.

3.4 FIX D — Prefix-cache harness numbers (design-closing measurement)

The report correctly describes prompt-cache methodology for the §10 HTTP ladder (nonce, warm-up, avoiding inflated prefill). It does not carry the harness-session TTFT numbers that closed the design bet for HALO:

 Q5 brain, long session prompt: fresh TTFT 108.6 s → cached 13.4 s (8.1×).

 Coder: fresh 31.8 s → cached 0.28 s (115×).

 Session insight: harness prefix stability + LM Studio contextCheckpoints pairs with bandwidth-limited hardware; this is why the architecture fits HALO, not only high-bandwidth cards.

Action: Add a short measured subsection (or extend §12 / §13) with the harness-session TTFT table. Scope correctly: cache kills repeated prefill only; decode stays bandwidth-bound. Do not re-inflate to “buys back most of a 7× bandwidth gap.”

3.5 FIX E — Operational permission posture

User direction in session was explicit and repeated: full-drive access is intentional; do not babysit machine risk; trust the model and the system; remove preachy containment language from the deliverable.

What the report already did correctly (keep):

 Removed the “Do not set DSH_PERMISSION_MODE=danger-full-access” paragraph from §18.2.

 Replaced §21.3 body with “this text deleted by user”.

 Reframed §18.2b from “counterweight / removal is the stronger control” to “Optional: a command-guard plugin.”

 Kept operational facts: default is workspace-write; ACL enforcement is partial; Temp cleanup breaks the sandbox.

What is still missing:

 Recommended stack (§19.1 / exec summary) still centers workspace-write as the posture without stating the session’s operational choice: full reach (danger-full-access + launch from desired root) is a legitimate daily mode on this machine.

 Spectrum of postures (full host / workspace-write / container) with real capability costs was discussed; container was correctly judged a bad fit for this workflow. That spectrum is not in the report.

Action: In §19.1 (or a short §18 note), state that the stock default remains workspace-write for general readers, but this build’s intentional operational mode is full host access when the operator chooses it, with no second-guessing. Do not restore removed warning paragraphs. Optional: one table of posture vs cost vs what it stops (full / workspace-write / container).

4. Deliberately not required in the spec

Do not expand the report to include these unless the operator asks:

 Full Phase 1–3 install narrative (launcher scripts, smoke-test lab repo, here.now publish). Report is research+spec, not a build log.

 Claude vs Codex vs Grok design-comparison history.

 397B / GLM / Kimi review — operator chose skip (option B).

 Cross-references that still point at §21.3 — operator said “let it.”

5. On clean-room framing vs session measurements

The report declares clean-room research and “nothing installed except §16.3.” The session did install, configure, bench, and partially archive a halo-stack deployment. Framing the report as a post-cleanup research baseline is a valid document choice.

It does not justify leaving measured results as “not yet measured,” or leaving architecture decisions (Hermes, Mission Control, permission posture, prefix-cache design bet) unrecorded. Those are facts about this machine and this session, not install artifacts.

6. Completeness claim in the session was wrong

Near end of session, Claude stated variations of “nothing outstanding,” “everything verified present,” and “the spec captures everything we discussed.” An audit then found the build-comparison result told in chat but not written into §13.2. The Phase 2 MoE bench was never surfaced in that audit as a missing T-1 close. Treat “ready” claims as unverified until the fixes in §3 of this document are applied.

7. Acceptance checklist for the fixed spec

The revised report is acceptable when all of the following are true:

☐  1. §13.2 (or equivalent) states the two-model portfolio as measured, with the Phase 2 table or equivalent numbers; T-1 closed or retargeted.

☐  2. Locked defaults appear in recommended architecture: Q5 Standard cockpit; Coder MoE on-demand with TTL; Code mode not default.

☐  3. Hermes is recorded as retired; only durable schedule (dsh-schedule) called out as remaining gap if at all.

☐  4. Mission Control is not an open undirected phase — optional thin status or explicitly deferred/rejected; WT-1 noted if UI retained.

☐  5. Harness-session prefix-cache TTFT numbers appear once, scoped to prefill only.

☐  6. Operational permission posture states full host access as intentional when chosen; no restoration of deleted warning paragraphs.

☐  7. All items in §2 of this document remain intact (no regressions of already-faithful content).

☐  8. No new caution/sermon language about “removal is the stronger control” or similar walls the operator already struck.

8. Suggested merge order

Do these in order to avoid thrash:

 A — Close T-1 / rewrite §13.2 two-model section with Phase 2 numbers and locked defaults.

 D — Add harness-session prefix-cache TTFT (pairs with A; same measurement day).

 B — Hermes retirement note.

 C — Mission Control decision note.

 E — Permission posture sentence + optional spectrum table; do not restore deleted text.

 Rebuild .docx; re-verify all 40 questions and §21 numbering still intact.



End of gap analysis. Source of numbers: session Phase 2 bench day and related verification turns in SessionTranscriptwiththinking. Report quotes taken from DSHStrixHaloReportv2.2.1.docx as audited 2026-08-23.