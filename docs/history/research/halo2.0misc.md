> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

Three auditors, three dual responses. Both are a review of your spec and an answer to the question: would the product be more? Here's their responses:

Read only, do not act. When you're done, give me your thoughts on their input and let's discuss what to actually do.

Audit1 **Yes — if implemented as written and the acceptance gates pass, this SPEC closes the exact gap between what halo-stack claims and what it currently delivers.**

### **What your site currently claims vs. what actually happens**

Your landing page and README present HALO as a **fully local, frontier-class coding agent stack**:

* “Frontier-class coding agents. No cloud required.”  
* Hardened agent cockpit with full-drive access.  
* The harness “owns orchestration.”  
* Subagents (Codex / Claude Code / OpenCode), skills, workflows, background jobs, automatic compaction.  
* Mission Control as the one-glance operator surface.  
* Measured performance numbers (TTFT, decode rates, task times) that are real.

Those claims are true for interactive sessions, short coding tasks, config/live-deploy discipline, privacy, and the budgeted-emit pipeline for large *outputs*. They are **not** true for unassisted large-input jobs (whole-repo review, corpus audit, multi-unit analysis). The 2026-08-20 failure evidence in the SPEC is decisive: one turn, 35 steps, 4 h 41 m, 2.4 M input tokens, compaction treadmill, subagents dying on a single decode lane, console lying that the run was still alive, and zero result. The only way large jobs previously succeeded was a frontier model (Claude) decomposing them by hand. That is the “operator illusion” the SPEC correctly names.

Your site is therefore currently making autonomy claims that the running system does not fulfill for the class of work that matters most for a serious local coding platform.

### **What the SPEC says it will do**

It is deliberately **not** a new orchestration layer. It is a thin, mostly-deterministic layer that finally *uses* the autonomy primitives DeepSeek Harness already ships:

* `dsh-subagent` \+ spawn (fresh context, shared workspace)  
* `dsh-workflow` \+ worker-thread \+ `tool-workflow` (model-written JS with `agent()`, `pipeline()`, `parallel()`, schema validation, `maxTotalAgents`, cancellation)  
* goals \+ round driver  
* Ralph (fresh-agent loops with workspace as memory)  
* headless one-shot runner  
* loop guards, spill/prune, compaction policies  
* jobs registry, etc.

The four concrete things HALO 2.0 builds:

1. **Deterministic scripts** — `halo-size`, `halo-plan`, `halo-coverage` (token estimation, unit packing under per-machine budgets, coverage accounting). Pure code, same input → same units, never silent drops.  
2. **One skill** (`large-job`) — selection rule \+ the five-phase Large-Job Protocol (SIZE → PLAN → MAP → REDUCE → COVERAGE) \+ a canonical, audited workflow template the model fills in rather than invents from scratch every time. Parent conversation stays \~20 K tokens; children are bounded; compaction during an LJP run is an alarm, not a mechanism.  
3. **Mission Control 2.0** — derived (not upstream-flag) liveness (STALLED when the durable session log stops advancing), per-session STOP, real workflow/jobs/LJP progress from artifacts on disk, and a Settings tab that is the actual config surface (live math, refusal of invalid states, comment-preserving line edits, drift tracking).  
4. **Config only** — summarization routed off the brain, routing table, `halo:` block for budgets/shape profiles/breaker K, engine concurrency \= number of machines, machine-profile scaling.

Everything else is either already in the harness or is deleted (`pipeline/repo-review/`, the external-driver design that reinvented what the harness already had).

Principles are sound and map directly to the measured failures (P1–P9, especially “harness is the platform,” “bounded by construction,” “one decode lane,” “corroborate everything,” “operator control is a product surface”).

### **Will it deliver what the site says it’s creating?**

**Yes, provided the verification matrix (V1–V10) is completed first and the eight acceptance gates (G1–G8) actually pass.**

* G1 is the decisive one: the exact 2026-08-20 review brief must complete unattended via LJP with zero compaction events, zero idle-timeout retries, parent context \< 25 K, and a real report \+ coverage.  
* G3/G7 give the operator the honest controls and truthful console the marketing already implies.  
* G4/G6 close the reasoning-burn and federation assumptions.  
* Soft SIZE enforcement (skill instruction rather than a hard guard plugin) is the main residual risk the SPEC itself flags for auditors; G1 is the proof that soft is enough for v2.0.

DeepSeek Harness (especially the workflow/subagent/Ralph/skill family visible in the current tree and docs) really does contain the primitives the SPEC relies on. HALO is currently pinned to rc.7; the SPEC correctly treats the rc.7 ↔ rc.8 delta as a gating verification item rather than assuming it.

### **Bottom line**

The SPEC is an honest, tightly scoped redesign that stops the overclaim. It turns the existing harness primitives into something that can actually run large, unassisted, bounded jobs on your local hardware without a frontier babysitter and without the console lying. Implement it, drive the gates to green, and the site’s language about frontier-class local agents and orchestration will finally match the measured behavior. Until then the gap remains exactly as the SPEC diagnoses it.

could the product be more? What else would you add to it to make it even better based on what Deepseek can actually do? See this list of capabilities

**Yes — the product can be more, but only by staying disciplined.**

The SPEC is already correctly scoped. It refuses to reinvent the harness and only fills the four verified gaps (deterministic sizing/planning/coverage, one skill \+ canonical template, truthful MC liveness \+ real Settings, config). That is the right posture. The full rc.8 headless composition (81 entries) confirms the primitives the SPEC relies on are real and richer than HALO 1.x ever used.

Here is what I would add or tighten, ranked by leverage, while still obeying P1 (“add a capability only after showing the harness lacks it”) and the non-goals.

### **1\. Make the Large-Job Protocol optionally goal-aware (high leverage, almost free)**

`dsh-goal` \+ `dsh-goal-round-driver` \+ the goal tools already exist.  
 Current SPEC treats “standing objective” as a separate lane.

**Better:** let an LJP run optionally arm a goal whose phase/round state is the coverage progress.

* The parent can pause/resume across sessions without losing the manifest/findings.  
* MC already plans to show goal phase; now the LJP run view and the goal view become the same object.  
* Round driver keeps the same conversation continuity for the reduce/synthesis child while the map children stay fresh-spawn.

This turns long multi-hour corpus jobs into first-class resumable work without new orchestration code.

### **2\. Optional Ralph fallback for stubborn units (uses an existing tool the SPEC already names)**

`dsh-tool-ralph` is present and exactly matches the “stubborn retry” lane.  
 In the canonical MAP template, after K consecutive failures on a unit, offer (or auto-trigger under a profile flag) one Ralph loop on that unit only, using the workspace as memory and the previous findings as the structured handoff.

Record-and-continue stays the default; Ralph becomes the measured escalation path instead of an entirely separate lane the operator has to invoke by hand.

### **3\. Surface more of the native projection and control surface in Mission Control**

The list gives you:

* `dsh-jobs-local` \+ `dsh-tool-jobs`  
* session-projection (goals, plans, todos, agents)  
* `list_agents` / `send_message` / `interrupt_agent` / `report`  
* workflow session events

SPEC already plans workflow/jobs/LJP panels and derived STALLED.  
 **Push further (still pure rendering):**

* Live agent tree with lineage, current tool, and report channel status.  
* Todo lists and plan-mode state as first-class tabs or side panels when they exist.  
* One-click “interrupt this child / send progress request” that just calls the existing control tools.

This makes the “operator control is a product surface” principle concrete without writing new backend logic.

### **4\. Context-pressure injection as a tiny local plugin (the one deferred item worth promoting)**

`dsh-token-meter` already measures; `dsh-system-prompt` assembles sections.  
 Nothing in rc.7/rc.8 injects the live pressure number into the model’s prompt.

A 50-line local plugin that adds a short “Current context pressure: X / Y (Z% of window)” section (or a skill-visible variable) closes the “model sees its own budget” gap.  
 The SPEC correctly flags this as v2.1. I would make it a hard candidate for the first post-G1 increment because it makes the soft SIZE instruction and the shape profiles (wide-sweep / deep-dive / synthesis) far more effective.

### **5\. Code Mode / worker-thread for the REDUCE phase**

`dsh-code-runtime-worker-thread` \+ the `run_code` path already exist.  
 The canonical template currently does a pure `agent()` reduce.

For large finding digests, the template can optionally emit a short Code Mode program that does the deterministic aggregation / coverage cross-check / markdown assembly inside the worker (with the same schema validation). This keeps the final synthesis child small and moves pure computation off the brain’s decode lane.

### **6\. Tighter integration of the existing guard family into the skill and MC**

* `dsh-repeat-tool-reminder` (already active)  
* `dsh-tool-call-timeout-policy`  
* spill \+ pruner

Make the large-job skill explicitly declare the thresholds it expects, and let MC Settings expose the repeat thresholds, tool-timeout defaults, and spill size as live-math controls (same comment-preserving write path). The script-level breaker stays; the harness-level guards become visible and tunable by the operator.

### **What I would not add**

* Any external driver or rival orchestrator (the previous design is correctly deleted).  
* Hard sandboxing of workflow scripts (harness already states the worker is containment, not a boundary).  
* Multi-operator / cloud / non-Windows scope.  
* A full hard SIZE guard plugin until G1 proves soft enforcement is insufficient.  
* Rebuilding todo, plan-mode, or job tracking — just surface them.

### **Practical next step after the verification matrix**

After V1–V10 and before any code:

1. Confirm which of the above (especially Ralph, timeout-policy, continuable subagent semantics under headless, context-pressure variables) are actually present and stable in the live rc.7 that HALO is pinned to.  
2. Decide whether any of 1–4 become part of the v2.0 skill/template or stay cleanly in a v2.1 “HALO Protocol extensions” skill.  
3. Keep the acceptance gates ruthless: G1 remains the only gate that matters for the original failure.

The SPEC already gets you 90 % of the way to what the site claims. The items above are the remaining 10 % that turn “thin deterministic layer on top of the harness” into a genuinely excellent local autonomy surface without violating the core doctrine. They are all expressible as skill content, config, MC rendering, or one tiny local plugin — exactly the shape the SPEC already endorses.

Audit 2

I read the specification, Halo Stack’s current site/repository, and DeepSeek Harness’s repository-level documentation.

Short answer: **the spec is directionally right and could produce a genuinely autonomous large-job system—but it does not yet justify Halo Stack’s broad autonomy claims.** It would deliver a bounded, unattended workflow for certain decomposable jobs, especially repository reviews and audits. It would not make Halo generally autonomous.

The most important distinction is:

> DeepSeek Harness provides autonomy primitives. Halo does not yet reliably assemble those primitives into an autonomous product.

## **Bottom-line assessment**

| Question | Verdict |
| ----- | ----- |
| Does DeepSeek Harness contain the primitives the spec relies on? | **Mostly yes, on current Harness master.** |
| Are those capabilities verified for Halo’s pinned rc.7 version? | **No. The spec correctly marks this as unresolved.** |
| Would implementing the Large-Job Protocol solve the failure you observed? | **Probably, if the verification gates pass.** |
| Would it make repository-scale reviews run unattended? | **Yes, for jobs that decompose cleanly into independent units.** |
| Would it make Halo a generally autonomous coding agent? | **No.** |
| Does the current Halo website overstate what is actually working? | **Yes. Several claims need qualification or removal now.** |
| Is the spec ready to implement exactly as written? | **No. It needs several corrections before implementation planning.** |

## **What DeepSeek Harness really provides**

The current Harness documentation confirms that its workflow system can:

* Run model-written JavaScript orchestration.  
* Start fresh subagents with independent prompts.  
* Use `pipeline()` and `parallel()`.  
* Enforce concurrency and total-agent caps.  
* Request schema-validated structured results.  
* Route individual children by provider and model.  
* Emit workflow start, phase, log, child-start, child-end, and completion events.  
* Cancel a workflow and its children through an internal `WorkflowRun.cancel()` interface.  
* Execute Ralph-style repeated fresh-agent attempts.  
* Run a headless one-task process.

These are real native primitives, not invented Halo features. See DeepSeek’s [workflow subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/workflow.md) and [tool catalog](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-catalog.md).

That means the spec is right to abandon the external LM Studio driver. Rebuilding orchestration outside Harness would discard its agents, permissions, session records, tools, cancellation semantics, and UI integration.

But the repository evidence I inspected is from current Harness `master`. Halo remains pinned to `0.1.0-rc.7`, while the spec repeatedly relies on capabilities described from rc.8/current master. **V1–V10 are therefore prerequisites, not paperwork.**

## **What the specification would genuinely deliver**

If completely implemented and if all verification gates pass, the spec would add:

1. A deterministic repository-sizing tool.  
2. A deterministic unit planner.  
3. A reusable large-job skill.  
4. A canonical Harness workflow for map/reduce jobs.  
5. Structured per-unit findings.  
6. Explicit failure and omission accounting.  
7. Deterministic coverage validation.  
8. Circuit breakers for repeated failures.  
9. Artifact-derived run progress.  
10. Stall detection based on actual log activity.  
11. Per-session stopping, if a usable host API exists.  
12. Operator-facing controls for relevant configuration.  
13. Model/machine routing, if LM Link proves it can provide the required behavior.  
14. Headless and scheduled execution surfaces.  
15. Acceptance tests demonstrating the system actually works unattended.

That is substantial. It could credibly support this narrower claim:

> HALO can execute bounded repository-scale reviews and audits unattended, decomposing work into fresh-context units, recording failures and coverage gaps, and producing a final report without requiring a frontier-model operator to manually drive every step.

That would be a real autonomy claim—with G1 through G8 evidence behind it.

## **What it would not deliver**

The specification does not create a general autonomous software engineer. It does not establish that Halo can autonomously:

* Understand any arbitrary large objective.  
* Construct a correct implementation plan for any project.  
* Implement extensive cross-cutting changes safely.  
* Coordinate multiple agents modifying overlapping code.  
* Resolve ambiguous product decisions.  
* Recover from every kind of model failure.  
* Validate semantic completeness of a review.  
* Decide when its work is actually good enough.  
* Run indefinitely without supervision.  
* Select the fastest available computer automatically.  
* Guarantee accurate conclusions merely because every file was “covered.”  
* Replace frontier-model judgment for complex planning or synthesis.

The Large-Job Protocol is primarily a **bounded map/reduce system for corpus work**. It is very appropriate for:

* Repository review.  
* Documentation audits.  
* File-by-file migration analysis.  
* Security or compliance sweeps.  
* Test inventory.  
* Cross-model adversarial review.  
* Large collections of mostly independent findings.

It is less naturally suited to:

* One complicated bug requiring evolving global understanding.  
* Large architectural implementation spanning many coupled modules.  
* Refactors where each child’s changes affect every later child.  
* UI implementation requiring repeated integrated visual evaluation.  
* Jobs where the correct decomposition must change as discoveries are made.

Those require a separate coding-job protocol, probably involving planning, dependency-aware task execution, integration testing, and controlled repair loops. The spec does not yet define that.

## **Where Halo’s current website overclaims**

The current site calls Halo:

> “Frontier-class coding agents. No cloud required.”

That is not supported by the evidence presented. The measurements show that particular local models completed particular coding probes at particular speeds. They do not establish “frontier-class” coding quality across realistic workloads. This should say something like:

> “Capable local coding agents. No cloud required for local-model work.”

The site says the worker:

> “runs subagent and fan-out work at 4.3× the brain’s task speed”

The reported 4.3× result is a single complete-task benchmark: 176 seconds versus 41 seconds. That establishes faster execution of that measured task. It does **not** establish successful autonomous fan-out or a 4.3× fan-out improvement. The failed large job is direct contrary evidence.

A defensible version would be:

> “Completed the measured coding benchmark 4.3× faster than the dense brain; autonomous large-job fan-out remains under development.”

The site also says:

> “one cockpit that orchestrates everything”

Harness can orchestrate these things, but Halo had not configured and validated the complete behavior needed for unattended large jobs. The cockpit exposed orchestration capabilities; it did not reliably orchestrate everything.

The Mission Control section says:

> “One screen that tells you the truth”

Your observed failed run—displayed as running for 4 hours and 41 minutes with no progress—disproves that as a current blanket claim. Mission Control reports some measured facts accurately, but its session-liveness representation was not truthful.

Until the redesign ships, it should say:

> “A local operational dashboard for the signals it currently measures. Derived stall detection and reliable per-session stopping are under development.”

The repository also claims:

> “fan-out to whichever box is fastest for the job”

LM Link making remote model identities callable does not by itself prove automatic fastest-machine selection, load-aware scheduling, simultaneous useful decoding, or deterministic machine placement. G6/V5 must prove the actual behavior. Until then, this should be removed or changed to:

> “Models on linked machines can be addressed through LM Link; parallel routing and scheduling are being validated.”

Finally, “No cloud required” and “fully local” need a qualifier because the site also advertises Codex, Claude Code, OpenCode cloud routes, and Exa web search. The local inference core may be cloud-independent, but every advertised capability is not.

A more precise statement is:

> “Core coding and orchestration can run entirely locally. Optional cloud agents and web-search integrations are available.”

## **Problems inside the specification**

### **1\. “HALO builds four things” is inaccurate**

The specification says:

> “The honest total: HALO 2.0 builds four things.”

But it actually proposes at least:

* `halo-size`  
* `halo-plan`  
* `halo-coverage`  
* Large-job skill  
* Canonical workflow template  
* Failure breaker logic  
* Run artifact format  
* Mission Control liveness  
* Workflow panel  
* Jobs panel  
* LJP progress view  
* Per-session STOP  
* Settings editor  
* Validation engine  
* Backup/rollback handling  
* Audit log  
* Repo/live drift workflow  
* Headless job launcher  
* Task Scheduler integration  
* Federation routing configuration

Some are small and some reuse Harness, but this is not four pieces. That understatement makes implementation risk look artificially low.

### **2\. The parent-context guarantee is not yet “by construction”**

The spec says the parent never grows past roughly 20–25K tokens. That is only true if:

* `halo-size`, `halo-plan`, and `halo-coverage` return compact summaries.  
* Workflow output is strictly bounded.  
* Child summaries are bounded structurally, not merely requested in prose.  
* Large manifests and findings are never returned through the tool result.  
* Errors cannot dump huge payloads back into the parent.  
* The parent does not decide to inspect numerous child artifacts itself.

Those need explicit output-size gates.

### **3\. `chars / 3.5` is only an approximation**

It may be acceptable as a conservative first pass, but unit fit must include:

* System prompt.  
* Loaded skill.  
* Tool definitions.  
* Unit instructions.  
* File contents.  
* Expected reasoning usage.  
* Expected answer.  
* Structured-output overhead.  
* Tool-call transcripts generated while reading files.

A file-only estimate does not prove a child fits. The planner needs a reserved-overhead budget and preferably tokenizer-backed measurement for known models.

### **4\. Coverage is not correctness**

`halo-coverage` can prove that:

* Every planned file was assigned.  
* Every unit has a success/failure status.  
* Truncations and omissions were reported.  
* The final report mentions recorded gaps.

It cannot prove:

* The model actually understood every file.  
* Findings are correct.  
* Cross-file interactions were recognized.  
* Important behavior was not missed.  
* The synthesis accurately represents the findings.

The documentation must call this **mechanical coverage**, not audit completeness.

### **5\. Soft enforcement remains a serious hole**

The design depends on the model remembering to load the `large-job` skill and obeying its verdict. An `AGENTS.md` sentence helps, but it does not enforce the protocol.

Given that Halo’s entire problem was a model making the wrong orchestration choice, this should not be deferred casually. At minimum:

* The system prompt must explicitly identify tree-scale work.  
* The skill must be automatically loaded or injected when possible.  
* Acceptance testing must include adversarial prompts attempting to bypass sizing.  
* The public claim must remain limited until bypass frequency is measured.

I would strongly consider the read-accumulation guard part of 2.0, not 2.1.

### **6\. Per-session STOP is not established**

Harness internally exposes `WorkflowRun.cancel()`, but its lifecycle events deliberately contain observation-only snapshots. They do not expose cancellation authority to Mission Control.

Therefore, “Mission Control gets per-session STOP” is not a configuration task. It depends on discovering an existing host API or building a carefully authorized bridge. If V7 finds no API, the spec must either:

* Add a local control plugin/API, or  
* Remove per-session STOP from the 2.0 promise.

A “documented fallback” is insufficient for G3.

### **7\. Federation may not work the way the spec assumes**

The design assumes:

* A model identity reliably maps to a particular machine.  
* Two identities decode simultaneously.  
* The worker machine remains available.  
* Routing does not silently land on the wrong machine.  
* Summarization can be isolated from the brain lane.  
* Concurrency can be set to the number of available machines.

Those are not guaranteed by the existence of LM Link. V5/G6 must be completed before this architecture is treated as real. The system also needs fallback behavior when the second machine disappears during a run.

### **8\. The breaker definition is incomplete**

The spec mentions identical error text, but failures can be equivalent while differing in:

* Timestamps.  
* Request IDs.  
* Token counts.  
* File names.  
* Stack-line numbers.  
* Whitespace.  
* Model-generated wording.

The breaker needs normalized failure signatures, plus separate counters for:

* Consecutive unit failure.  
* Consecutive timeout.  
* No artifact progress.  
* Repeated identical normalized failure.  
* Global failure rate.  
* Reduce-stage failure.

### **9\. Reduce can still become the new monolith**

A fresh reducer reading only findings is a good design. But if every unit produces a 3K-token result, even 40 units can create another 120K-token job.

The hierarchical-reduce decision therefore needs to be based on actual serialized finding sizes, not merely the planner’s expected output budget. I would make hierarchical reduction the default beyond a low threshold.

### **10\. “One file’s worth of reading” is the wrong trigger**

This proposed `AGENTS.md` language is too broad:

> “for any job over one file’s worth of reading, load the large-job skill first.”

Many ordinary coding tasks legitimately require five or ten small files and should remain interactive. Trigger on estimated tokens, repository breadth, or task type—not file count.

## **My recommended verdict on the spec**

**Approve the architecture, but do not approve implementation from this draft unchanged.**

Before it becomes an implementation plan, I would require these corrections:

1. Rename the deliverable internally from “autonomy redesign” to **Bounded Large-Job Execution**.  
2. Separate repository-analysis autonomy from autonomous implementation.  
3. Complete V1–V10 against the exact pinned version.  
4. Decide rc.7 versus rc.8 before coding.  
5. Count the real implementation scope honestly.  
6. Add strict parent and child output caps.  
7. Add full prompt-overhead allowances to planning.  
8. Define coverage as mechanical coverage.  
9. Make hierarchical reduction size-driven.  
10. Specify normalized breaker signatures.  
11. Resolve STOP as a real API/design item.  
12. Define federation failure and degradation behavior.  
13. Strengthen protocol enforcement.  
14. Add adversarial clean-context audits at design, implementation, and acceptance checkpoints.  
15. Change the public site before implementation so it describes current reality.

## **Final answer**

**Yes, this spec can get you the core thing Halo was supposed to provide but did not: unattended, bounded, repository-scale work performed by local models using DeepSeek Harness’s native workflow and subagent system.**

**No, it will not by itself make Halo a generally autonomous coding platform, and it does not validate the site’s current broad claims.**

The proper product claim after successful G1–G8 acceptance would be:

> HALO is a reproducible local-agent workstation built on DeepSeek Harness. It can run verified, bounded repository-scale reviews and audits unattended, with deterministic decomposition, fresh-context workers, explicit failure accounting, mechanical coverage checks, truthful progress reporting, and operator-controlled limits.

That is still a strong product. More importantly, it would finally be an honest one.

could the product be more? What else would you add to it to make it even better based on what Deepseek can actually do? See this list of capabilities

Yes. Halo could become substantially more than a repository-review runner. DeepSeek Harness already contains most of the machinery for a **local agent operations platform**. What it lacks is a coherent product layer that selects the right machinery, makes it controllable by a nontechnical operator, independently verifies results, and proves what happened. That is where Halo could become valuable.

## **The larger product**

I would position it as:

> **HALO is a local AI work platform that plans, executes, verifies, and documents complex computer-based jobs across one or more machines—under explicit operator controls.** That is broader and more defensible than “autonomous coding agent.” Coding would be its strongest initial workload, but the architecture could also support:

* Repository audits.  
* Software implementation.  
* Test and repair cycles.  
* Documentation maintenance.  
* Research and synthesis.  
* Scheduled recurring work.  
* Cross-model review.  
* Batch processing.  
* Local private workflows.  
* Multi-machine model routing. DeepSeek Harness supplies the agent runtime. Halo becomes the **appliance, policy, workflow, verification, and operations product** around it.

## **What I would add**

### **1\. A real job router**

Today, the model must decide whether to use an ordinary turn, subagent, workflow, goal, Ralph, plan mode, or headless. That is too important to leave entirely to model judgment. Add a deterministic or rules-assisted intake layer:

| Job characteristic | Selected Harness capability |
| ----- | ----- |
| Small, immediate request | Ordinary agent turn |
| One bounded delegated task | Fresh subagent |
| Multiple independent units | Workflow |
| Same objective across retained rounds | Goal |
| Repeated clean attempts | Ralph |
| Human approval required before changes | Plan mode |
| Unattended one-shot job | Headless |
| Repository-scale corpus | Large-Job Protocol |
| Coupled multi-file implementation | Coding-Job Protocol |
| Mission Control could show: |  |

> Detected: repository-wide audit Estimated: 14 units, 83 minutes Selected: Large-Job Protocol Models: 5070Ti sweep → HALO synthesis Approval: not required Maximum runtime: 2 hours The operator could override the choice before launch. This turns a bag of Harness tools into an understandable product.

---

### **2\. A Coding-Job Protocol**

The current specification primarily solves analysis and review. Add a separate protocol for actual software implementation:

flowchart TD  
    A\["Inspect and size"\] \--\> B\["Create reviewed plan"\]  
    B \--\> C\["Build dependency graph"\]  
    C \--\> D\["Implement bounded tasks"\]  
    D \--\> E\["Integrate changes"\]  
    E \--\> F\["Run tests and UI checks"\]  
    F \--\> G\["Independent audit"\]  
    G \--\> H{"Pass?"}  
    H \--\>|No| D  
    H \--\>|Yes| I\["Deliver evidence"\]

It should include:

* Deterministic repository inventory.  
* Human-reviewable implementation plan.  
* Task dependency graph.  
* Explicit file ownership for each child.  
* Separate git worktree or branch per concurrent implementer.  
* No concurrent edits to overlapping files.  
* Per-task tests.  
* Integration after each dependency layer.  
* Full-project test gate.  
* Separate clean-context reviewer.  
* Bounded repair cycles.  
* Final diff and evidence package.  
* No commit, push, or release without the configured operator policy. Harness supplies plan mode, subagents, workflow, Ralph, shells, filesystem tools, permissions, session history, and cancellation. Halo supplies the tested coding protocol and integration discipline. This would move Halo much closer to what people mean by “autonomous coding.”

---

### **3\. Independent verification as a first-class stage**

This may be the most valuable addition. Do not let the agent that performed the work declare that its own work is correct. Every substantial job should support separate roles:

* Planner  
* Implementer  
* Test runner  
* Adversarial reviewer  
* Evidence auditor  
* Final synthesizer The reviewer should run:  
* As a fresh agent.  
* On a different model where possible.  
* Without the implementer’s reasoning history.  
* With only the objective, resulting artifacts, diff, and audit instructions.  
* Under a read-only permission profile.  
* Before the work can be marked complete. Possible verification modes:  
* Code correctness audit.  
* Requirement-by-requirement audit.  
* Security review.  
* UI/visual review.  
* Documentation-versus-code comparison.  
* Citation verification.  
* “What did we claim that the evidence does not prove?” audit.  
* Regression-risk review. Mission Control should distinguish:  
* **Agent says complete**  
* **Tests passed**  
* **Independent audit passed**  
* **Operator accepted** Those are not the same state.

---

### **4\. Evidence-backed completion**

Every unattended job should produce a standard evidence package:

runs/\<job-id\>/  
    REQUEST.md  
    PLAN.md  
    manifest.json  
    events.jsonl  
    artifacts/  
    findings/  
    tests/  
    reviews/  
    COVERAGE.json  
    FINAL.md  
    RECEIPT.json

The job receipt should answer:

* What was requested?  
* What protocol ran?  
* Which model did each stage use?  
* Which machine ran it?  
* What files were read?  
* What files changed?  
* What tests were executed?  
* Which tests passed or failed?  
* What was omitted or truncated?  
* Which agents failed?  
* Were any retries, compactions, or stalls recorded?  
* Did the independent review pass?  
* What claims remain unverified?  
* Was operator approval required and obtained? This would give Halo something most agent products lack: **auditability**.

---

### **5\. An Agent Operations console**

Mission Control should evolve from a hardware dashboard into an actual operations center. The central object should be a **job**, not merely a session. Each job should show:

* Objective.  
* Protocol selected.  
* Current phase.  
* Agents and descendants.  
* Current model and machine.  
* Files owned by each agent.  
* Units completed, failed, and remaining.  
* Tests passed and failed.  
* Context pressure.  
* Last meaningful progress.  
* Estimated completion time.  
* Breaker state.  
* Current approvals.  
* Final verification status. Operator controls should include:  
* Pause after current unit.  
* Resume.  
* Stop one agent.  
* Stop the complete job.  
* Retry a failed unit.  
* Retry with a different model.  
* Lower or raise reasoning.  
* Reassign a unit to another machine.  
* Exclude a path.  
* Add an instruction.  
* Require approval before writing.  
* Require independent review.  
* Open generated evidence. DeepSeek already provides lifecycle events, session projections, agent lineage, jobs, goals, workflows, and cancellation seams. Halo should organize these around the operator’s actual mental model.

---

### **6\. Reusable job recipes**

Harness skills teach procedures, but Halo could productize them as visible, tested recipes. Examples:

* Review an entire repository.  
* Implement an issue.  
* Diagnose a failing test suite.  
* Upgrade a dependency.  
* Audit documentation against code.  
* Generate or update a user manual.  
* Check a release candidate.  
* Perform a clean installation test.  
* Audit accessibility.  
* Research a subject with citations.  
* Compare two repositories.  
* Run an adversarial product-claims audit.  
* Inspect a repository for unimplemented claims.  
* Prepare a release.  
* Monitor documentation drift.  
* Nightly regression scan. Each recipe would define:  
* Appropriate Harness lane.  
* Required inputs.  
* Permissions.  
* Planning rules.  
* Model routing.  
* Maximum runtime.  
* Maximum agent count.  
* Required tests.  
* Required independent audits.  
* Output contract.  
* Completion definition. These should be versioned and acceptance-tested. The model can fill in job-specific parameters without inventing the operating procedure every time.

---

### **7\. Durable unattended automation**

Harness’s local background-job registry is process-local and cannot recover active work after a restart. Halo should add a small durable job controller for real unattended operation. It should provide:

* Persistent job queue.  
* Scheduled jobs.  
* Restart recovery.  
* Dependency-aware execution.  
* Maximum concurrent jobs.  
* Per-job time and token budgets.  
* Machine-availability checks.  
* Retry policies.  
* Notification on completion, failure, stall, or approval request.  
* “Quiet success” versus “always report” policies.  
* Windows Task Scheduler integration.  
* Run history. Headless Harness remains the worker. Halo owns the durable queue and job lifecycle. That would allow jobs such as:  
* Audit CivicCast documentation every Sunday.  
* Re-run a test matrix after new commits.  
* Check whether project claims still match implementation.  
* Perform nightly repository health checks.  
* Produce a weekly change report.  
* Re-run a previously failed unit when the second machine returns.

---

### **8\. A benchmark-aware multi-machine scheduler**

Halo already has the beginnings of a fleet. Make it real. For every available model identity, record:

* Actual machine.  
* Model and quantization.  
* Context window.  
* Current availability.  
* Prefill speed.  
* Decode speed.  
* Memory cost.  
* Vision support.  
* Structured-output reliability.  
* Tool-use reliability.  
* Coding evaluation results.  
* Maximum safe unit size.  
* Whether simultaneous decoding has been proven. Then route by workload: | Workload | Routing preference | | \------------------------ | \-------------------------------- | | Fast file sweep | High-prefill MoE worker | | Difficult synthesis | Strongest reasoning model | | Compaction summary | Idle secondary machine | | Screenshot inspection | Vision-capable model | | Adversarial audit | Different model family | | Small interactive edit | Already-loaded low-latency model | | Huge-context inspection | Largest verified window | | Deterministic extraction | Cheapest reliable model | This should not be an LLM guessing which machine is fastest. Halo should use measured profiles. It also needs degradation rules:  
* Secondary machine unavailable → reduce concurrency.  
* Assigned model missing → pause or use an approved fallback.  
* Smaller context → re-plan units.  
* Remote generation already active → queue rather than overload.  
* Routing proof absent → do not claim parallel federation.

---

### **9\. A model evaluation laboratory**

Halo’s existing performance benchmarks are useful, but speed is not capability. Add repeatable evaluations for:

* Correct tool selection.  
* Instruction following.  
* Coding correctness.  
* Repository navigation.  
* Structured-output reliability.  
* Long-context retrieval.  
* Patch minimality.  
* Test discipline.  
* Hallucination resistance.  
* False-premise resistance.  
* Loop susceptibility.  
* Autonomous completion.  
* Reviewer effectiveness.  
* Reasoning-token usage.  
* Recovery after tool failure. Mission Control could then show:

> Qwen Coder worker Fastest for repository sweep: yes Reliable structured output: 97% Successful autonomous coding tasks: 14/20 Best use: bounded implementation and scanning Not approved for final compliance synthesis This would replace “frontier-class” with a much more convincing claim: “Measured against the work you actually use it for.”

---

### **10\. Operator policy profiles**

The product should offer understandable control levels:

| Profile | Behavior |
| ----- | ----- |
| Observe | Read and report only |
| Plan | Inspect and propose; no mutation |
| Safe Edit | Write within workspace; approval before consequential actions |
| Autonomous Workspace | Implement and test within an isolated worktree |
| Release Candidate | May prepare commits and artifacts; cannot publish |
| Full Operator | Explicitly authorized external and destructive actions |
| Policies should govern: |  |

* Filesystem reach.  
* Shell access.  
* Network access.  
* Maximum runtime.  
* Model routes.  
* Maximum agents.  
* Whether cloud models are permitted.  
* Whether external services are permitted.  
* Whether commits are permitted.  
* Whether pushes/releases are permitted.  
* Required verification stages. Harness already has sandbox, permissions, approvals, workspace observation-before-mutation, and tool execution policies. Halo’s contribution is making those usable and visible.

---

### **11\. Human questions and approval inbox**

Harness has a user-question service. Halo should centralize all blocked decisions:

* Five jobs need no attention.  
* One job needs permission to modify a protected file.  
* One found two plausible implementation choices.  
* One needs the operator to identify the correct repository.  
* One has completed its plan and awaits implementation approval. Mission Control should have a single **Needs You** inbox with:  
* The decision required.  
* Why it matters.  
* Recommended option.  
* Consequences of each choice.  
* Whether the job can continue elsewhere while waiting. That is more useful than forcing the operator to inspect several agent conversations.

---

### **12\. End-to-end installation and release certification**

For a product claiming to be an appliance, Halo should be able to certify itself. A release recipe should:

1. Start with a clean Windows Sandbox or disposable VM.  
2. Download the signed installer.  
3. Install Halo.  
4. Walk through every installer screen.  
5. Launch every user-facing component.  
6. Exercise every tab, button, link, and control.  
7. Run a small local-model job.  
8. Run a subagent job.  
9. Run a workflow job.  
10. Test stop, failure, stall, and recovery behavior.  
11. Verify privacy/network expectations.  
12. Uninstall.  
13. Confirm expected files, services, tasks, and shortcuts were removed.  
14. Produce screenshots, logs, and a release certificate.  
15. Send the evidence through a separate clean-context audit. This would make “tested, reproducible workstation distribution” much stronger.

## **What I would not add yet**

I would avoid:

* A custom agent reasoning loop.  
* A second workflow engine.  
* A proprietary replacement for Harness sessions.  
* A general visual workflow builder.  
* Unlimited agent teams.  
* Automatic publishing or deployment by default.  
* Complex cloud infrastructure.  
* A bespoke memory system before proving the existing one inadequate.  
* Swarms merely because Harness can spawn many agents.  
* A marketplace before the built-in recipes are reliable. Harness is already the runtime. Halo should not become a competing harness.

## **Recommended product roadmap**

### **HALO 2.0 — Truthful autonomous jobs**

Build what the current spec promises, after correcting it:

* Exact rc.8 capability verification.  
* Large-Job Protocol.  
* Mechanical coverage.  
* Independent review.  
* Honest liveness.  
* Reliable stopping.  
* Settings controls.  
* Evidence receipts.  
* Remove unsupported website claims. This creates the trustworthy foundation.

### **HALO 2.1 — Autonomous coding**

Add:

* Coding-Job Protocol.  
* Plan approval.  
* Dependency-aware task graph.  
* Worktree isolation.  
* File ownership.  
* Integration and test gates.  
* Clean-context code audit.  
* Bounded Ralph repair.  
* Final diff and evidence package. This is where Halo becomes meaningfully more than a repository auditor.

### **HALO 2.2 — Unattended operations**

Add:

* Durable job queue.  
* Headless scheduling.  
* Restart recovery.  
* Approval inbox.  
* Recipe catalog.  
* Recurring goals.  
* Notifications.  
* Job-level Mission Control.

### **HALO 2.3 — Measured local fleet**

Add:

* Benchmark-derived routing.  
* Multi-machine concurrency.  
* Model capability cards.  
* Automatic re-planning for different context windows.  
* Secondary-model reviews.  
* Graceful loss-of-machine behavior.  
* Reproducible evaluation suite.

## **The strongest realistic vision**

Halo can become:

> **A private, evidence-driven local AI workforce for software and knowledge work—built on DeepSeek Harness, operated from one screen, using bounded agents, independent verification, measured model routing, and explicit human control.** That is genuinely more ambitious than the current specification, while still matching what DeepSeek Harness can actually support. The critical product innovation would not be “more agents.” It would be: **Every job is planned, bounded, observable, interruptible, independently checked, and delivered with evidence.** That is a product people could trust—and a much better differentiator than claiming general autonomy.

Audit 3

Gave me both answers in one document (combined the audit and the what could be added, without asking and against my directions.. guess who. \-\_- no.. don't)

HALO 2.0 spec — external review Reviewer: Claude (Opus 5\) Date: 2026-08-21 Sources read: SPEC.md; github.com/scottconverse/halo-stack @ 80683bd (v0.5.0, PR \#41 merged); github.com/deepseek-ai/deepseek-harness @ tags dsh-v0.1.0-rc.7 and dsh-v0.1.0-rc.8.

1. Short answer The spec is correct in its main judgement. The harness has the autonomy primitives. HALO 1.x did not use them. The four build items are real gaps. I verified all four against the upstream source.

But the spec has seven defects. Two of them are factual errors about the harness. Two of them mean failure F4 is still armed in your live config today, by two separate doors. One of them means principle P9 cannot be enforced as written. One of them leaves the true mechanism of failure F2 untouched.

The spec will make most of your site true. It will not make the fan-out claim true. That claim is wrong on physics, not on code. Delete it from the site.

Verdict: approve after the seven corrections in §4.

2. Your site claims against the measured evidence The site is site/index.html. These rows are the claims that touch autonomy.

Site text Status today Does the spec fix it? "runs subagent and fan-out work at 4.3× the brain's task speed" False on one machine. F4: 5 children queued on a 1-slot model, 3 died. No. The spec retires the claim (P5). Change the site. "fan-out to whichever box is fastest for the job" Unproven. V5 is still open. Two lanes were never measured together. Only after G6 passes. Until then, remove or mark it. "One screen that tells you the truth" False. F6: Mission Control showed a dead run as running for 4 h 41 m. Yes. §4.6 derived liveness. "131,072 token context ... with proven continuity across forced compaction" False at 131,072. F3: 5 failed compactions, \~95 minutes of no progress. Partly. PR \#41 makes compaction converge. P3 makes it an alarm. Add the window to the claim. "the harness owns orchestration" / "one cockpit that orchestrates everything" True of the config, false of the use. Your preset already loads tool-workflow, tool-ralph, tool-subagent, tool-goal. HALO 1.x called none of them. Yes. The large-job skill makes the model use them. "$0 marginal cost per token for all daily coding" False for large jobs. Every large job needed a frontier assistant to plan it by hand. Yes, if you also close defect E5 below. "two desktop icons, zero terminals" (operator) False. F8: every tunable needed an assistant to edit YAML. Yes. §4.7 Settings tab. "Every session can delegate to Codex, Claude Code, and OpenCode as subagents" True. Verified in dsh/cordis.patch.yml and the preset. Not changed. But see E5 — this is also the hole in P9. "A 5-tab operator console" ... later "serving six tabs" Inconsistent on one page about honesty. Not in scope. Fix the text.

The core problem in one sentence: your site describes a capability set, and readers hear a behaviour. The harness has the capability. HALO 1.x did not do the behaviour.

3. What the spec gets right (verified upstream) I checked each claim in the §3 capability map against the source.

Gap \#1 and gap \#2 are real. There is no native pre-flight token sizing, and nothing chunks input to a token budget. packages/llm/token-meter is replay-only. Its own README states: "nothing in the harness makes decisions from it." Byte limits exist (tool-fs.readLimit, spill-policy.maxInlineBytes); token limits do not. halo-size and halo-plan are justified. agent(prompt, { label, phase, schema, model }) is the exact hook set. model exists. Reasoning effort does not. §4.4 and §4.8 are both correct. summarizationProvider / summarizationModel exist in compaction-basic. The §4.4 summarization route is possible as pure config. V7 is answered: the STOP endpoint exists. POST /api/session.cancel with { sessionId }, at packages/host/apiproxy/src/fetch/handler.ts. The model-facing interrupt\_agent tool also exists. No fallback is needed. V10 is answered: skills load from \~/.dsh/skills/\<name\>/SKILL.md. You already deploy delta-scan-halo there. skills/large-job/ will be found. Headless works as described. dsh \--profile headless "\<task\>" runs one task, prints the last assistant text, and exits. It carries the workflow and subagent tools. The goal round driver has no resource policy. Confirmed in its README: "Round cap, not resource budget." §4.5 is correct. Record-and-continue is supported. A child that fails normally returns null to the script. Only fatal engine errors escape.

4. Seven defects. Fix these before you build. E1 — maxTotalAgents cannot be set from the script. §4.2.3 is wrong. The spec says: "maxTotalAgents set from the manifest — the native hard cap backs the soft plan."

The engine README says the opposite: "These are engine-level policy, not script hooks or model-facing options; the ordinary workflow tool leaves both unset." I confirmed it in packages/workflow/tool-workflow/src/index.ts. The tool sends only meta, script, args, parent, and signal.

Fix: set maxTotalAgents on the workflow-worker-thread row in the preset. Then delete that sentence from §4.2.3. E2 — The concurrency default is CPU count, not 1\. F4 is still armed. workflow-worker-thread config: maxConcurrentAgents, default 0, and "0 resolves from available CPU parallelism."

Your live preset (dsh/agent-presets/halo-standard/agent.cordis.yml) sets only provider: spawn. So on Strix Halo the engine will start roughly one child per core against a model that serves one prediction. That is failure F4, exactly, waiting for the first workflow call.

Fix, today, before any of HALO 2.0:

* id: workflow-worker-thread

   name: '@deepseek-ai/dsh-workflow-worker-thread'

   config:

   provider: spawn

   maxConcurrentAgents: 1 \# one decode lane per machine (P5)

   maxTotalAgents: 64 \# E1: the cap lives here, not in the script

Also make the canonical template loop sequentially in plain JavaScript. Do not depend on the config alone. Config is a ceiling. The script must be correct on its own.

Second door onto the same failure. jobs-local.maxConcurrentJobsPerOwner defaults to 10\. Your preset does not set it, and it sets backgroundMode: continuable on subagent, which defaults every delegation to background. So the brain can start ten background children in one turn, with no workflow tool involved at all. That is F4 again, by a different door.

Set maxConcurrentJobsPerOwner: 1 on the jobs-local row, or set backgroundMode: one-shot on the subagent instance. One decode lane is a machine fact. Every concurrency default in the composition has to agree with it. E3 — The rc.7 / rc.8 delta in V2 is factually wrong. The spec says rc.8 "adds at least Ralph and timeout-policy naming." It does not. I diffed the two tags. workflow/tool-ralph, guard/timeout-policy, guard/repeat-tool-reminder and subagent/tool-subagent-control are all present in rc.7. V3 is answered: yes, all present.

The real rc.8 additions are:

Added in rc.8 Why it matters to HALO 2.0 experimental/agent-team \+ tool-agent-team Durable roster, durable peer mailbox, and a shared task board written to the session log. This is the journalling the workflow engine does not have. See E4. context/file-reference \+ file-reference-local A path-reference grammar that attaches no file bodies. This is §4.2.2's "references, not bodies" idea, native. shell/tool-pwsh-persistent Your three scripts run through the pwsh tool. A persistent shell removes per-call start cost. code-runtime/code-runtime-python Not needed. ui-renderer, ui-reference, ui-brand-official Not needed.

Removed in rc.8: client/schema-form, client/web-react.

Fix: correct §2.3 and V2. Then answer open question 8 with this data. E4 — There is no resume. G1 is not reachable after a crash. The workflow engine README states two limits the spec does not carry:

"No journaling or resume — scripts, child progress, and intermediate values are not checkpointed, so a process restart cannot continue a run." "The parent turn blocks until the whole workflow settles — there is no background start/poll API, and cancellation discards partial output as an error."

So a 2-hour LJP run is one blocking tool call with no checkpoint. If the harness restarts, the run is lost. If the operator presses STOP, the tool result is an error.

Your design already saves you in part: children write findings/unit-NNN.json to disk. Build on that.

Fix: add resume to the protocol. It is cheap.

The MAP template skips any unit that already has a valid findings file. halo-coverage runs on the artifacts on disk, not on the tool result. It already does. Re-running the same run id continues instead of restarting.

Also add one line to §4.6: after a STOP, the run's findings on disk are still valid, and COVERAGE reports the partial state. E5 — P9 is unenforceable. A child can call a frontier model. This is the defect closest to the problem you described.

spawn children get the parent's full global tool set. The workflow agent() hook has no tool filter. toolFilter exists, but it is config on the tool-subagent row, and the workflow engine does not use that row.

Your preset enables subagent\_codex, subagent\_claude\_code, and subagent\_opencode, all with maxDepth: provider-managed. So an LJP child can delegate to a cloud frontier model, and the report will look local and autonomous.

Nothing in the harness detects this. Nothing in the spec detects it either.

Fix, two parts:

Prevent. Run LJP under a second preset or profile whose delegation group omits the three frontier subagent tool rows. Keep the interactive preset as it is. Prove. Extend halo-coverage: read each child session log, and fail non-zero if any frontier subagent tool was called. This converts P9 from a standing mandate into a machine-checked gate. Add it to G1.

Without part 2, G1 can pass while a frontier model did the work. That is the same class of error as F6. E6 — The workflow tool tells the model not to use it. dsh-tool-workflow registers its own system-prompt section:

"Use the workflow tool ONLY when the user explicitly asks for a workflow or for large multi-agent orchestration ... For one or two delegations, prefer plain subagent calls."

Your LJP wants the model to choose workflow after SIZE says decompose, with no explicit user request. The tool's own guidance argues against that. A skill can win, but it is a soft instruction fighting a soft instruction.

Fix: state the override in the skill text, in one explicit line. Then measure it. Answer open question 6 with the measurement, not with an opinion.

Also correct the template format. The dsh contract is not the same as other harnesses: meta is a tool parameter, and the script body must contain no export const meta statement. Source: the tool description string in packages/workflow/tool-workflow/src/index.ts. E7 — F2's real mechanism is still at its default. F2 was 13 identical idle timeouts and 2,396,400 input tokens on one turn. The spec's countermeasure is "kept PR \#41 config \+ small contexts by construction." That treats the symptom.

The mechanism is the retry policy. llm-pi-ai takes a retryPolicy field per provider profile. Its README states: "omission resolves to normal mode with five retries." Your settings.yaml tunes streamIdleTimeoutMs on that same profile and never sets retryPolicy. So every failed step still re-prefills the whole context up to five times.

A longer idle timeout makes the storm rarer. It does not bound it. At 131,072 tokens, one avoidable retry is minutes of prefill.

Fix:

llm-pi-ai:

providers:

lmstudio:

  streamIdleTimeoutMs: 1200000

  retryPolicy:

    mode: normal

    maxRetries: 1      \# was an unstated 5

Add retryPolicy to the §4.7 Settings scope. Add "zero retries in map" to G1 as a measured value, not a hope. dsh-llm-retry logs every attempt as an llm/retry event, so the gate can read it from the session log.

5. Smaller items maxResultChars defaults to 50000 on tool-workflow. That is about 14K tokens of tool result in the parent. Set it low (2000). Your §4.2 budget of "\<25K parent context" assumes this. timeout-policy protects almost nothing here. It is zero-config and enforces only the budget a tool declares. Only web\_fetch and web\_search declare one. pwsh, bash, and workflow declare none. So your SIZE, PLAN and COVERAGE scripts and the whole map phase have no tool-level deadline. Put the timeouts inside the scripts. Reasoning control (§4.8, open question 4). The spec lists four candidates. Two more exist, and both are cheaper to test: GenerateOptions.reasoningEffort is replaceable per conversation step through the agent/request waterfall, and the resolved value is logged in request/header. A very small local plugin can set it for LJP children only. The logging gives you the G4 measurement for free. A second pi-ai model entry with a remapped reasoningEfforts table, selected per child by agent(..., { model }). Your settings already remap high: medium, so the mechanism is proven on this box. Test 1 first. It is the only candidate that also produces the evidence. agent-team is the honest answer to open question 9\. It is the one thing in the composition that this design needs and does not use: a durable task board with claim, complete, and revision fencing, persisted in the session log. It is the missing resume from E4. It is experimental, capped at 8 members, and needs continuable subagents plus durable session storage. Do not adopt it for v2.0. Name it in §6 as the v2.1 path for LJP durability, and let it decide V2.

6. Answers to the verification matrix, from source You can close five rows now, with no probe.

V Answer V1 rc.7 has 372 package directories, rc.8 has 383\. Full delta in E3. V2 The stated reason for the bump is wrong (E3). The real reason is agent-team \+ file-reference. Decide after E4. V3 All present in rc.7. tool-ralph, timeout-policy, tool-subagent-control, and its list-agents entry. All already mounted in your preset. V4 Key is maxConcurrentAgents on workflow-worker-thread, default 0 \= CPU count. maxTotalAgents default 1000, engine-level only. See E1, E2. V5 Still open. Measure it. V6 No. contextPressure appears only in token-meter and the browser UI. Nothing injects it into a prompt. The spec is correct. V7 POST /api/session.cancel with { sessionId }. Also subagent.interrupt for continuable children. One-shot subagent addresses are not cancellable on their own; cancelling the parent turn aborts them through the shared signal. V8 Still open, but note your preset sets backgroundMode: continuable on subagent. Probe with that value. V9 agent-default-model gives the child the parent's provider and model. spawn inherits the parent model unless agent() overrides it. Reasoning is not part of that inheritance path. V10 \~/.dsh/skills/\<name\>/SKILL.md, rank 400\. One level deep only; nested \*\*/SKILL.md is excluded.

7. What to change on the site now Do this before the build. The site is the claim; the spec is only the plan.

Delete "fan-out" from the worker card. Replace with "runs delegated subagent work at 4.3× the brain's task speed, one job at a time." One decode lane is the truth. Qualify the fleet paragraph. Say that cross-machine parallel decode is designed and not yet measured. Restore the claim when G6 passes. Qualify the compaction claim. "Proven continuity across forced compaction at 65,536. At 131,072 compaction is a safety net, not a workflow." That is what PR \#41 actually says. Add a line to "Honest status". Say plainly that large jobs in v1.x were decomposed by a frontier assistant, and that HALO 2.0 is the work to remove that. This is the sentence that ends the problem you described. It costs you nothing and it makes every other claim on the page more credible. Fix "5-tab" against "six tabs."

8. Where the spec is too much (open question 10\) P1 says build only the verified gap. Held to that standard, three items survive without argument: halo-size, halo-plan, and derived liveness. Two need trimming.

halo-coverage should grow, not shrink. Add the P9 check from E5. It is the only gate that proves the headline claim. The Settings tab (§4.7) is the largest build item and the weakest gap. It fixes F8, which is a workflow problem, not a runtime failure. Comment-preserving line edits into a live YAML file, with machine-profile validation and a drift record, is a lot of new code holding a live config. Consider a smaller v2.0: a read-only Settings view with the live math and the refusal checks, plus a generated diff the operator applies with the existing Deploy-ToLive path. G7 still passes — the operator changes the values without an assistant. You get the honesty and the arithmetic, and you do not put a text editor inside Mission Control.

That is my answer to open question 5 as well: neither risk is worth taking in v2.0. Do not write into the file yet.

9. Could the product be more? Yes. Much more. But not by flipping the switches I listed last time — that was a tuning list, not a product answer.

Start with three numbers.

Packages in the rc.8 repository 226 (185 of them host-side) Rows in the stock headless composition 81 Plugins HALO ships 0

The 81-entry list is what DeepSeek turns on by default, for its own cloud models, in a one-shot run. It is not the harness. Roughly 100 host-side packages sit in the repository and appear in no composition at all. Several of them are built for exactly the problem HALO has.

And HALO ships nothing into a kernel whose entire thesis is that everything is a plugin. Your site states that as a feature: "Deliberately not included … any custom plugins (nothing shipped has failed yet)." That sentence is the product ceiling. It is why every answer I gave you was a YAML key.

A. Mount what is already on the disk Seven capabilities exist in rc.8 and appear nowhere in the base composition. I checked each against packages/bundle/base/cordis.patch.yml.

1. LSP — packages/lsp. Zero mentions in base, and absent from the 81-entry list entirely.

Four operations, on a real seam: goToDefinition, findReferences, goToImplementation, hover. A generic stdio backend drives any language server. No JSON-RPC escape hatch, so the model contract does not change when the provider does.

This is the highest-leverage unmounted capability for what HALO actually is. Your product is a coding stack, and your bottleneck is decode at 11–27 tok/s with TTFT of 259–403 s at depth. Today, "who calls this function" costs a grep, three read calls, and a guess — four turns, each paying prefill and decode. findReferences costs one call and returns the exact answer.

Every token the model does not have to spend reading is a token it does not have to decode. On this hardware that is worth more than any engine tuning you have benchmarked so far. It is also the only item here that improves ordinary daily coding, not just large jobs.

2. packages/extensions — the agent modifies its own runtime.

Five model-facing tools: cordis\_inspect, cordis\_define, cordis\_run, cordis\_stop, cordis\_undefine. The model writes a Cordis package against the live runtime, both host and browser halves. The definition is syntax-checked and shown to the operator as a card with a start control. Nothing runs until the operator runs it. cordis\_stop disposes the host half to quiescence and withdraws the browser half. Dynamic packages create no file, change no configuration, and vanish on restart.

Read that against your own audit. You quoted the confluence theorem, you set an architecture bar preferring Cordis-native components for "guaranteed-clean removal and runtime capability limits", and you then wrote "no custom plugins." The harness has a sanctioned, sandboxed, operator-gated, retractable way to have them — with a UI panel. It is the safest possible place to let a local model build the tools it needs, because the removal guarantee is the thing the paper proves.

This is how HALO 2.0's own tools should be prototyped: the brain defines halo-size as a dynamic package, you run it, you watch it, you retract it. Then you promote what survives to a real plugin. No deploy, no PowerShell, no second web server.

3. subagent-dsh-sdk — a child that is a whole peer harness.

Your site says the two boxes are a fleet. LM Link pools weights: box B's model is callable from box A. Box B's harness sits idle.

The SDK provider runs each subagent as a complete DeepSeek Harness runtime in its own subprocess — "own cordis.yml-decided composition, session persistence, model route, and tools." Point it at the 5070Ti and you have two full agents, two tool sets, two filesystems, two decode lanes.

That is the answer to the fan-out claim. You cannot make it true on one box; P5 and F4 settle that. You can make it true across two boxes, and this is the mechanism — not LM Link. It also gives real process isolation, which spawn does not, which matters the moment an unattended child is writing to disk.

4. packages/hooks — Claude Code and Codex hook bridges.

Point a bridge at an existing hooks.json and external shell hooks run at the harness's typed interception points.

This is the cheap path to the guards the spec defers to v2.1. Your read-accumulation guard can be a PowerShell hook this week, not a Cordis plugin next quarter. It also answers open question 6 with something better than "soft is acceptable": soft for v2.0, hard via a hook, measured, then promoted to a plugin if it earns it.

5. packages/terminal — persistent PTY, owner-scoped, state across tool calls.

Your world is lms commands, Deploy-ToLive.ps1, benchmark sweeps, and MTP sweeps. Every one of those currently pays process start on each call and can hold no state between them. A persistent terminal holds an environment, a working directory, and an interactive stdin. For a Windows appliance whose entire operational surface is PowerShell, this is not a nicety.

6. packages/acp — the ACP server.

You already use ACP outbound, to drive OpenCode. The harness can also serve it: a JSON-RPC stdio ACP server that lets any programmatic client create harness agents, prompt them with text and images, and cancel work.

Turn it on and the HALO brain becomes an agent that other tools drive, instead of only a cockpit you open. That is distribution with no UI work.

7. user-questions plus schedule — supervised autonomy.

dsh-user-questions is a provider-neutral service for pausing work and getting a structured human answer. packages/schedule holds session-local reminders whose state lives in the session log; due work re-enters the same conversation through the follow-up queue.

Your site parks the Hermes operations plane "until the need justifies a second always-on gateway." The need is here. An overnight run that hits a real ambiguity has exactly two options today: guess, or fail. With a question service and a notification path it has a third — ask, park, and resume when you answer. That is the difference between unattended and autonomous with an operator on call, and the second one is the honest product.

Note the inverse as well: you currently mount tool-ask-user in a preset that also runs unattended work. In a headless run there is no interaction provider, so a child that asks a question waits forever.

B. Ship plugins. This is the actual product change. Everything above is still someone else's code. The product change is that HALO starts producing its own.

You have knowledge nobody else has. DeepSeek built this harness for its own cloud models: fast prefill, many slots, a small window, cheap retries. You have measured what happens when those defaults meet one iGPU, one memory bus, one decode lane, and a 131,072-token window. Every failure in your F-table is that collision.

That knowledge currently lives as prose in AGENTS.md and as tuned scalars in settings.yaml. Prose does not enforce anything — that is why F1 through F8 happened with the right values already in the file. As plugins, the same knowledge becomes mechanical, and it becomes installable by anyone.

Five plugins, each on a seam the harness already exposes:

Plugin Seam What it makes mechanical halo-decode-lane tools/pre-execute Refuses a second concurrent model-bound delegation against a one-slot endpoint. P5 stops being a principle you have to remember in three separate config keys. Kills F4 at the seam. halo-read-budget tools/post-execute Accumulates read tokens per turn and injects the protocol reminder at the threshold. This is the hard SIZE enforcement §4.2.1 makes soft. halo-context-pressure dsh-system-prompt section Injects the token meter's own number into the prompt. V6 confirms nothing does this today. The model cannot budget what it cannot see — that is the root of F1, and it is about forty lines of code. halo-liveness session-projection consumer Derives STALLED from log progress. As a plugin every surface gets the truth, not only Mission Control. halo-machine-profile settings layer machines/\*.yml as a real settings layer instead of a deploy-time text render. Then the \#39 class of bug cannot exist.

Note what happens to your own build list. Three of HALO 2.0's four items are plugins in disguise, currently specified as PowerShell scripts plus a bolt-on web server on port 3090\. Mission Control itself is an external process — which your own architecture bar, written after the Cordis audit, argues against. MC 2.0 should be ui-mission-control, a client plugin contributing slots into the cockpit, not a second server.

C. What HALO becomes Today HALO is a reproducible configuration for one machine, with a port to a second. The items above turn it into three things, and each has an audience.

1. The local-inference distribution of dsh. DeepSeek will not ship the physics layer, because DeepSeek is not running this harness against a 27B model on an iGPU. Anyone with a Strix Halo, a 5090, or an M-series box hits your exact eight failures on day one, and there is no existing answer. Your F-table is the most valuable artifact in the repository and it is currently formatted as a post-mortem instead of as a product.

2. A cluster, not a fleet. LM Link pools weights. subagent-dsh-sdk plus agent-team pools agents — durable roster, durable mailbox, a shared task board with revision fencing, all persisted in the session log. That is also the journalling the workflow engine does not have, which is defect E4. One capability closes the resume gap and makes the fan-out claim true at the same time.

3. A self-extending appliance. cordis\_define plus permission-presets plus the confluence guarantee: the local model writes a plugin, the operator sees a card, runs it, watches it, and retracts it with clean removal. You have already read and audited the paper that makes that safe. Nobody else on this kernel is positioned to build it, and it is the only item here that is genuinely novel rather than merely unmounted.

D. The price, stated honestly Becoming a plugin distribution means publishing packages against a harness in developer preview that says it expects breaking changes. That is real, recurring maintenance, and it is why "config only" is a defensible position today rather than a failure of nerve.

So the question is not whether the harness can support more. It plainly can. The question is whether HALO wants to be an appliance for one operator or a layer other people install. Right now the repository is built as the first and the site is written as the second. Pick one, and the roadmap follows.

If the answer is the first, do A1 (LSP), A5 (terminal), and A7 (questions), and stop. Those three make your own daily use better and cost you nothing downstream.

If the answer is the second, B is the work, and it starts with halo-context-pressure — forty lines, on a seam that already exists, closing the root cause of the failure that started all of this.

—-----------------------------

Here's the coders response:

Read all three. No actions taken — nothing run, nothing edited. Here's my honest read.

## **Scorecard**

**Audit 1** approves and adds polish. It took my spec largely on faith — useful sequencing ideas (promote the context-pressure plugin, surface more native state in MC), nothing load-bearing.

**Audit 2** has the best *product* thinking. Two things I fully accept: coverage must be renamed **mechanical coverage** — it proves every file was processed, not that the findings are right — and **the site gets fixed before we build anything**, because right now the site is the claim and the spec is only a plan. Its big roadmap (coding protocol, evidence receipts, approval inbox, eval lab) is a good 2.1/2.2 map. Swallowing it into 2.0 would be a scope bomb.

**Audit 3 is the one that matters.** It's the only auditor that read source, and it found seven real defects in my spec — two of them factual errors, and it closed 8 of my 10 verification rows with citations. It also earns the most trust *structurally*: it's the only one that told you things you didn't want to hear with file paths attached.

## **The part that can't wait**

Audit 3 says **the original failure is still armed in our live config, by three separate doors:**

1. Workflow engine concurrency defaults to **CPU count** — the first real workflow call would fan \~16 children onto a 1-slot model. F4, again, waiting.  
2. Background subagent jobs default to **10 concurrent per owner**, and our preset defaults delegation to background. F4 by a second door, no workflow needed.  
3. The LLM retry policy silently defaults to **5 retries** — my PR \#41 lengthened the timeout but never bounded retries. The 2.4M-token re-prefill storm is still possible.

And the worst one: **an LJP child inherits the full tool set, including the Codex/Claude/OpenCode subagents.** A "fully local, autonomous" run could quietly delegate to a frontier model and the report would look clean. G1 could pass with Claude secretly in the loop — the exact crime I just confessed to, rebuilt one layer down. The fix is a restricted preset **plus** a coverage check that reads child session logs and fails the run if a frontier tool was called. That turns P9 from a mandate into a machine gate.

**One caveat, and it's today's whole lesson:** I have *not* verified any of audit 3's claims against the actual rc.7 source yet. Every one is checkable locally in minutes. I'm not swapping one unverified authority for another — verification is step zero when you say go.

## **Where I push back**

* **MC as a cockpit plugin (audit 3):** No. The liveness monitor must live *outside* the thing it monitors. We diagnosed the 4h41m stall from MC precisely because MC wasn't inside the wedged harness. External watchdog is load-bearing. A thin in-cockpit panel can come later.  
* **Settings as read-only \+ manual diff (audit 3):** Your requirement stands. The synthesis: the tab is fully interactive — values, live math, refusal — and the Apply button drives the *existing* deploy machinery (backup, validate, rollback) under the hood. No new text editor inside MC, no terminal for you, G7 unchanged.  
* **Goal-arming and Ralph-fallback (audit 1):** Defer. Audit 3's resume-from-artifacts (skip any unit that already has a findings file on disk) covers durability more simply — and catching that the workflow engine has **no resume at all** on a 2-hour blocking call is the miss in my spec I'm most embarrassed by.  
* Two of my own errors to own: my rc.7/rc.8 delta claim was factually wrong (Ralph and timeout-policy are already in rc.7), and "HALO builds four things" was honest-sounding but undercounted — audit 2 is right that it's \~20 sub-items and the count should say so.

## **The question only you can answer**

Audit 3 ends on the real fork: **is HALO an appliance for you, or a layer other people install?** You've been *building* the second (public repo, landing page, port box, releases) while *running* it as the first.

My read: you're building the second. If so, the product isn't more YAML — it's shipping the F-table as enforcement: five small plugins (decode-lane, read-budget, context-pressure, liveness, machine-profile), starting with **context-pressure** (\~40 lines, closes the root cause of F1, and gives us the G4 measurement for free). If it's the first, we mount LSP \+ persistent terminal \+ user-questions and stop there. I'd pick the second, sequenced — but that's an identity call, not an engineering one.

## **What I'd actually do, in order, when you say go**

1. **Verify audit 3 against rc.7 on disk** (minutes).  
2. **T0 config fixes** — concurrency cap, retry bound, background cap, result-chars cap. Small PR, deployed same day. Kills the live bombs independent of everything else.  
3. **Site truth pass** — delete fan-out, qualify fleet and compaction, add the honest-status line about v1.x. Both audits demand it; it's the publication-gate lesson again.  
4. **SPEC v2** — fold in E1–E7 plus audit 2's corrections, close the verification rows, leave V5/V8 as the only open probes.  
5. **Implementation plan**, then one more external pass on spec+plan together, then build.

Two decisions from you: **go on that order?** and **appliance or layer?**

Here

