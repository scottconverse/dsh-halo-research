> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Codex, Ollama DeepSeek, and Halo Local Models: Final Handoff

Prepared September 16, 2026, after Scott stopped the delegation project.

**Purpose:** preserve the actual findings, working components, unfinished changes, failures, evidence, and a practical path a successor could take.

**Authority:** Scott requested this report. He did not authorize resuming the experiments. This document is analysis and a handoff, not permission to restart workers, spend subscriptions, change configuration, or publish pending changes.

## 1. Executive conclusion

The underlying capability exists. An Ollama-hosted DeepSeek model used the stock Codex CLI to inspect real repository files, edit code, execute tests, and return a finished answer without a premium model repairing its implementation. A later DeepSeek worker completed a correctness repair and committed and pushed it.

What failed was the operating arrangement around that capability. The premium coordinator repeatedly processed an enormous conversation merely to monitor work. DeepSeek was given overly broad ownership briefs and allowed to repeat inspections and delivery chores long after the implementation was ready. The work then expanded into building accounting machinery. Monitoring, documentation, and measurement became a substantial part of the job instead of supporting it.

**The requested 80% offload outcome was not achieved and verified.** The last narrower operating-trial checkpoint was 74.331958% DeepSeek by recorded input-plus-output tokens, included an interrupted worker, and excluded later activity. It was not a completed, successful 80% operating trial. The whole repair also remained below 80% in the available snapshots.

The correct conclusion is neither “DeepSeek cannot code” nor “the system is now solved.” It is:

- The cloud coding route and a useful launcher are worth preserving.
- The installed local helpers remain useful for bounded tasks.
- The coordination policy and progress handling need a much smaller, more deterministic execution structure.
- The latest accounting adapter is unfinished and should not be treated as the authority on success.
- More tokens, more agents, or more tests would not by themselves fix this problem.

Scott reported approximately 10% of his usage consumed over three hours. That is the user-visible failure. Account quota is shared and cannot be precisely attributed from raw token totals, but that limitation does not excuse the waste or the agent's judgment.

## 2. What Scott actually wanted

The original intent was to retain premium judgment while moving most execution off the premium subscription:

- Astra for a small amount of difficult judgment and coordination.
- Sol/Terra/Luna selectively for heavier checks, while allowance remained.
- Ollama Cloud DeepSeek and existing local models for the overwhelming majority of implementation and routine work.
- A working arrangement inside his normal agent workflow, without requiring Scott to operate terminals.
- Existing access and model tuning retained.
- No extra product, framework, polish, or adjacent scope without approval.

The target was initially described as approximately 90% cloud/local work and later set to at least 80%. The agent chose raw token share as an acceptance measure and repeatedly conflated it with the amount of useful work delegated. That was a measurement-design mistake.

A good operating arrangement must satisfy three separate questions:

1. Did the task finish correctly?
2. How much premium usage was required to finish it?
3. How much unnecessary work did every model perform?

A high offload percentage can coexist with terrible efficiency. Deliberately making DeepSeek do more unnecessary work would improve the fraction while making the product worse. That must never be an acceptance strategy.

## 3. Current repository and installed state

The following was checked during preparation of this report. No inference, benchmark, test rerun, configuration change, commit, or push was performed to prepare it.

### Repository

Repository: [dsh-halo-research](C:/Users/scott/Desktop/Code/dsh-halo-research)

GitHub: [scottconverse/dsh-halo-research](https://github.com/scottconverse/dsh-halo-research)

Branch: master

Local HEAD and the remote master reference both resolved to:

    3fc8e83c349119c71a1ab3f2c8989c6afbd3b857

Relevant commits, newest first:

| Commit | Meaning |
|---|---|
| 3fc8e83c | Repair Codex worker final-text validation |
| 121a6ee1 | Isolate Ollama coding worker transport and record unassisted trial |
| 18ef7662 | Default Codex delegation to DeepSeek and tuned local helpers |

The repository is **not clean**. Five tracked files have pending changes:

- docs/HALO-CODEX-WORKER-REPAIR-2026-09-16.md
- stack/codex-ollama/skill/SKILL.md
- stack/codex-ollama/skill/references/ollama-fallback.md
- stack/codex-ollama/skill/scripts/run_ollama_code_worker.py
- stack/codex-ollama/skill/scripts/test_run_ollama_code_worker.py

Two files are untracked:

- stack/codex-ollama/skill/scripts/report_offload_usage.py
- stack/codex-ollama/skill/scripts/test_report_offload_usage.py

Those changes are preserved. They are not committed or pushed.

### Installed versus pending

Installed skill directory:

[C:/Users/scott/.codex/skills/openai-multi-agent](C:/Users/scott/.codex/skills/openai-multi-agent)

Recovery overlay:

[C:/Users/scott/Desktop/Halo Stack Research/Current Halo Configuration/codex-ollama](<C:/Users/scott/Desktop/Halo Stack Research/Current Halo Configuration/codex-ollama>)

Read-only comparisons established:

| Component | Installed/recovery state |
|---|---|
| Skill entrypoint and fallback reference | Match committed HEAD after normalizing line endings; differ from pending repository edits |
| Worker launcher and its test | Match committed HEAD after normalizing line endings; differ from pending repository edits |
| ask_local.py and its tests | Repository, installation, and recovery copies match by SHA-256 |
| Code-worker profile and model catalog | Repository, installation, and recovery copies match by SHA-256 |
| Original full Ollama profile | Repository, installation, and recovery copies match by SHA-256 |
| New accounting script and its tests | Exist only in repository working tree; absent from installed and recovery skill copies |

**Do not assume the latest working tree is what is installed.** The last published launcher remains the operating baseline. Do not overwrite it with the unfinished accounting work without explicit review and approval to resume.

The named long-running trial Codex processes were stopped earlier. A process-list check during this report found no codex.exe process whose command line matched the codex-offload-80-2026-09-16 trial paths. This was not a broad stop of Codex Desktop, Ollama, LM Studio, DSH, or unrelated work.

Current daemon health and loaded-model state were deliberately not probed in this report. Treat the endpoint descriptions below as configuration and historical working evidence, not a fresh health certificate.

## 4. The configuration that actually worked

### Cloud coding worker

The worker used:

- Model: deepseek-v4.1-flash:cloud
- Ollama endpoint: http://[::1]:11434/v1
- API: Responses
- Custom provider identifier: ollama-code-worker
- Reasoning setting: high
- A dedicated catalog containing the DeepSeek model
- Optional search/app/plugin/memory/nested-agent surfaces excluded from this coding invocation
- The existing signed-in Ollama installation, not a separately supplied OpenAI API key

Saved configuration:

[C:/Users/scott/.codex/ollama-deepseek-code-worker.config.toml](C:/Users/scott/.codex/ollama-deepseek-code-worker.config.toml)

Catalog:

[C:/Users/scott/.codex/ollama-deepseek-code-worker-models.json](C:/Users/scott/.codex/ollama-deepseek-code-worker-models.json)

The profile is:

    model = "deepseek-v4.1-flash:cloud"
    model_provider = "ollama-code-worker"
    model_reasoning_effort = "high"
    model_catalog_json = "C:/Users/scott/.codex/ollama-deepseek-code-worker-models.json"
    web_search = "disabled"

    [model_providers.ollama-code-worker]
    name = "Ollama code worker"
    base_url = "http://[::1]:11434/v1"
    wire_api = "responses"
    requires_openai_auth = false
    supports_websockets = false
    supports_standalone_web_search = false

    [features]
    apps = false
    memories = false
    multi_agent = false
    plugins = false

This is a worker-only configuration. The original fuller profile was retained at:

[C:/Users/scott/.codex/ollama-deepseek.config.toml](C:/Users/scott/.codex/ollama-deepseek.config.toml)

That older route uses http://[::1]:11434/api/codex/v1 and provider openai. Keeping it preserves a restoration option; it does not establish that its reported tool/search compatibility problems are fixed.

### How the worker is invoked

The installed entrypoint is:

[run_ollama_code_worker.py](C:/Users/scott/.codex/skills/openai-multi-agent/scripts/run_ollama_code_worker.py)

It is a Python standard-library adapter around the existing Codex CLI. It is not a new model server, provider proxy, or autonomous tool loop.

It reads the saved profile and supplies explicit CLI overrides with ignore-user-config. It invokes the native executable rather than relying on .cmd quoting:

    C:/Users/scott/AppData/Roaming/npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe

The installed launcher accepts:

- --cwd
- --prompt-file, or prompt text on stdin
- --result-file
- --events-file
- --stderr-file
- --receipt-file
- --profile and --codex overrides
- --resume SESSION_ID
- --dry-run

Fresh execution explicitly retains danger-full-access and approval_policy=never. Continuation uses the flags supported by the installed resume command. This preserves authorized capability; file ownership in a task brief narrows the task, not Scott's Windows permissions.

A successor should operate this entrypoint for Scott. There is no reason to ask him to type terminal commands.

### Version-specific traps encountered

At the time of the repair:

- Standalone Codex CLI was 0.147.0.
- The desktop-bundled executable tested was 0.154.0-alpha.6.2.
- Ollama was 0.34.1.

These are dated observations, not claims about today's latest releases.

Actual pre-inference failures included:

1. Combining ignore-user-config with a named profile caused the intended profile not to load in the tested invocation. The request fell back to OpenAI and rejected the DeepSeek model ID.
2. The bundled CLI rejected an existing computer_use.windows.always_allowed_app_ids global configuration key.
3. The standalone CLI rejected the newer documented skills.max_context_tokens setting.
4. A manually reduced model catalog omitted required fields, including support_verbosity. Copying the known working model row and changing only relevant capability flags was the sounder method.
5. .cmd argument quoting added unnecessary uncertainty; the adapter now uses the native executable.

These were configuration/client compatibility failures, not evidence that the model could not solve the coding task. Future work should resolve parsing through a cheap preflight before any paid inference attempt.

## 5. What the upstream research established

These sources were inspected during the earlier repair. Their issue and pull-request statuses have not been rechecked while preparing this report.

### Documented integration

[Ollama's Codex integration documentation](https://docs.ollama.com/integrations/codex) described a dedicated profile and a custom Responses provider at the local /v1 endpoint. That supported using the stock integration rather than writing another provider.

[Codex configuration documentation](https://learn.chatgpt.com/docs/config-file/config-reference) and the [configuration schema](https://developers.openai.com/codex/config-schema.json) described custom providers and capability settings. The locally installed CLI did not accept every option in the newer documentation. Local parser behavior was therefore essential evidence.

### Matching transport defects

[Ollama issue 18411](https://github.com/ollama/ollama/issues/18411) reported incorrect reasoning/tool-call ordering in the search path. Merely advertising built-in web search could engage the affected path. The reporter reproduced incomplete turns and tested a converter correction. [PR 18413](https://github.com/ollama/ollama/pull/18413) was open at lookup.

[Ollama issue 18419](https://github.com/ollama/ollama/issues/18419) reported empty completed responses after a previous_response_id tool follow-up. An explicit full-conversation control worked. [PR 18439](https://github.com/ollama/ollama/pull/18439) was open at lookup and proposed rejecting unsupported stateful requests, not implementing a response store.

[Ollama issue 18284](https://github.com/ollama/ollama/issues/18284) described flattened tool namespaces interfering with native agent-delegation calls. This supported making a coding worker self-contained and having its caller own delegation.

### Limits of that evidence

These upstream reports closely matched observed failure shapes. They did **not** prove the cause of every failed request on Scott's machine. A complete wire trace of every failed local run was not produced.

Likewise, selecting a custom provider and disabling websockets is not by itself proof that every HTTP request omitted previous_response_id. The route was selected to avoid the reported compatibility paths and then demonstrated one successful coding task. That is the claim supported by the evidence.

The earlier attribution of failures primarily to low reasoning effort was too confident. High reasoning also stopped prematurely before the transport changes. Later success changed several variables at once. It did not establish that High was the decisive fix.

## 6. What actually succeeded

### A. A real autonomous code change

On the correctly configured custom-provider route, DeepSeek:

- Inspected the local helper.
- Replaced abspath-based collision canonicalization with realpath-based canonicalization.
- Added an alias-collision regression.
- Ran the tests.
- Returned a normal final answer.

Measured duration: 114.432 seconds.

Initial input: 4,926 tokens.

Usage: 518,417 input + 12,068 output = 530,485 total. Cached input, already included in input: 455,680.

The worker ran 17 passing tests. The coordinator also verified the integrated suite. No premium model repaired the worker's patch.

Windows denied actual symlink creation with WinError 1314, so the regression simulated the alias mapping using the standard library. That is a real limit of the test, not proof that every Windows link case was exercised.

This run established useful coding capability. It was not efficient: 28 shell commands and four test executions were excessive for the size of the fix.

### B. A real launcher implementation and acceptance pair

A DeepSeek implementation worker added receipt handling, path-collision checks, failure handling, and continuation support.

A separate DeepSeek acceptance run exercised the packaged launcher in an isolated worktree. It found a genuine problem: a returned session ID different from the requested resume ID could still be called successful. The acceptance worker fixed that behavior and added the regression.

Its completed receipt reported:

- input: 796,007
- output: 31,027
- total: 827,034
- cached input: 568,090
- success: true

This was a real cloud invocation through the launcher. It was not proof that every continuation case had been live-tested.

### C. Final-answer truthfulness corrections

A later fresh DeepSeek finalizer found and fixed two additional defects:

- An earlier/nonempty agent_message could mask an empty authoritative output-last-message file.
- A nonempty but mismatched agent_message could still accompany a success claim.

The published contract now requires the nonempty output-last-message file as the final answer. Nonempty event text must agree with it after the allowed trailing-newline normalization.

That finalizer ran 34 combined tests and pushed commit 3fc8e83c. The final two corrections were checked with mocked child-process results, not another live cloud inference.

### D. The latest pending changes passed their suite

After stopping the second looping worker, the coordinator ran the combined suite once:

    python -B -m unittest discover -s stack/codex-ollama/skill/scripts -p "test_*.py" -q

Recorded result: 47 tests passed in 0.456 seconds.

Those tests covered the pending accounting additions as well as existing helper/launcher behavior. They do not override the implementation limitations found in source inspection, and they do not prove the accounting adapter is ready for deployment.

No tests were rerun to prepare this report.

## 7. What failed, and who was responsible

### Excessive premium coordination

This conversation was extremely large. Many coordinator responses required approximately 130,000 input tokens; some later records were larger. Most were cached, but they still appeared in reported input usage and were not free in the sense of being absent from consumption.

Waking the premium model every minute to say “still running” repeatedly replayed that context. The model was doing little useful judgment on many of those turns.

That was an execution-design error by the coordinating agent, not a failure of Scott's instructions.

### Worker briefs that were too broad

The first owner brief combined implementation, delegated acceptance, measurement, documentation, installation, recovery manifests, Git publication, and policy updates.

The worker completed useful work but kept revisiting old evidence and delivery questions. Long context, compaction, ambiguous completion boundaries, Windows quoting errors, and repeated reconsideration all contributed.

The coordinator should have recognized diminishing progress sooner. A worker should not spend dozens of further calls deciding how to mirror documents after the code and tests are already ready.

### Soft guidance instead of enforced boundaries

Instructions such as “20–30 operations should suffice” were suggestions. The launcher did not enforce a task deadline, a repeated-no-progress boundary, or a call budget. The workers could continue indefinitely.

The profile's High setting also remained in use without evidence that it was the best cloud setting for these routine jobs. The local brain's reasoning experiment did not justify applying that same default to an unrelated cloud model.

### Buffered output made supervision harder

The launcher captures stdout and stderr in memory with subprocess.run and writes them after exit. While a child is running, the precreated output files can be empty.

This complicates progress monitoring, loses convenient incremental evidence if the wrapper is killed, and encourages reading internal session logs instead. It is a practical defect for long tasks.

### Accounting became its own project

A short measurement requirement grew into another script, tests, documentation, and repeated source inspection. That consumed time while the central operating objective remained unmet.

Some of that code addresses legitimate accounting defects. The scope and duration were still disproportionate. More measurement infrastructure was not the next best way to prove low-overhead delegation.

### Mid-run snapshots were represented too strongly

A finalizer report initially used 203,788 tokens for its own run. The completed receipt actually showed 1,231,272. A model cannot know its eventual final-turn total before it finishes.

The initial report also contained the wrong finalizer session ID. The actual receipt identifies:

    01a0abc9-95b0-7800-aeba-998e08317d7b

The uncommitted report currently names a different ID. Use the receipt as the authority.

### Scope and metrics drift

The original aim was useful offloading. The agent moved toward making a percentage look acceptable, while also stating it would not pad tokens. That contradiction should have forced a stop and redesign much sooner.

No additional work should be created to enlarge the DeepSeek numerator. A low-cost failure and a high-token “80% success” are both failures if they do not deliver the intended work efficiently.

## 8. Usage evidence: what the numbers do and do not say

These are distinct phases and snapshots. **Do not add all rows together**: some overlap, use different cutoffs, or are subsets of another phase.

| Evidence scope | DeepSeek/local tokens | Premium tokens | Interpretation |
|---|---:|---:|---|
| Earlier transport-repair snapshot | 530,485 | 10,860,126 | Approximately 4.7% offload; premium coordination/configuration dominated |
| Worker-repair report with corrected finalizer total | 12,475,839 | 7,856,436 | Approximately 61.4%; still provisional root cutoff, not final whole-project usage |
| Later interrupted operating trial | 3,486,681 | 1,204,008 | 74.331958%; includes all root turns in the recorded window, but worker was interrupted and later responses are outside the checkpoint |

The later trial's recorded window began at 2026-09-16T20:01:56.911Z. The primary source is operating-trial/interruption-accounting.json. It explicitly says worker_interrupted=true.

The worker-repair DeepSeek subtotal consists of:

| Invocation | Total tokens | Status |
|---|---:|---|
| Long owner | 8,481,562 | Interrupted; one cumulative checkpoint |
| Implementation child | 1,935,971 | Completed |
| Acceptance child | 827,034 | Completed |
| Fresh finalizer | 1,231,272 | Completed |
| Total | 12,475,839 | Mixed completed and interrupted evidence |

No local-model calls were made during these later transport/80% repair phases. The combined label “DeepSeek/local” therefore means DeepSeek alone in those measurements.

Accounting rules that must survive the handoff:

- Total tokens here mean input plus output.
- Cached input is already part of input. Do not add it again.
- Reasoning output, when supplied separately, is a component of output.
- For modern root logs, deduplicate owned per-response records by thread and response ID.
- Do not sum cumulative snapshots of the same CLI invocation.
- For older standalone CLI logs lacking owned per-response records, a single latest cumulative checkpoint can preserve known spent usage, but label it partial if interrupted.
- A failed attempt can still have consumed tokens.
- A resumed session is not a new session ID, but it can be a distinct billable/model invocation.
- Raw tokens are not a conversion formula for subscription percentage or API dollars.
- A finished worker's own receipt is better than its earlier narrative estimate.
- A final user-facing reply that has not happened yet cannot be claimed as already measured.

### Why 80% alone is not a sufficient test

For offload tokens D and premium tokens P, the raw share is D/(D+P). Reaching 80% requires D to be at least four times P.

For illustration, if dispatch and final acceptance together require 260,000 premium tokens in an enormous conversation, an 80% raw ratio requires at least 1,040,000 offloaded tokens—even if a good worker could have finished in 100,000.

That is why deliberately extending worker activity to hit the ratio is wrong. The real improvements are a smaller coordinator context, fewer model wakeups, and correct completion with an absolute premium budget. Report the ratio too, but do not optimize it in isolation.

## 9. The unfinished accounting adapter: specific cautions

Source:

[report_offload_usage.py](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/codex-ollama/skill/scripts/report_offload_usage.py)

It is untracked and uninstalled. Passing tests are not a deployment recommendation.

Inspection during this report found limitations a successor must address or explicitly constrain:

1. **One root turn only.** The script requires root_turn and filters rows to exact equality. A continuing job can span multiple root turns when Scott asks a question or steers the work. Selecting only the latest turn would undercount coordination. Use an explicit job boundary covering all relevant turns, or a validated time window with a fixed end.
2. **Failed receipts discard known usage.** The receipt reader rejects unsuccessful/completed=false records before parsing their usage. It correctly blocks a final pass claim, but its numeric subtotals need not include all known spent tokens. Failure status and usage presence should be handled separately.
3. **Legacy deduplication is path-based.** Moving the same old receipt can duplicate its count; overwriting a path can hide distinct invocations. Preserve the limitations instead of calling legacy identity definitive.
4. **Invocation IDs are generated too late.** The pending launcher adds a UUID while creating the final receipt, after the child returns. An abrupt termination before that point leaves no durable start identity. A useful invocation ID should be created and recorded before launch.
5. **Current-turn and final-response treatment remains provisional.** Reserve tokens are estimates, not actual usage. Flags cannot turn a not-yet-emitted final answer into measured consumption.
6. **Receipts are not remote-model attestations.** Model and provider fields are copied from selected configuration. They identify the requested route, not cryptographic proof of what a remote service executed.
7. **A resume mismatch is detected, but missing identity is weaker.** The published launcher rejects a different reported session ID. Absence of an ID does not itself prove continuity.
8. **Interrupted workers remain an evidence gap.** Empty/buffered result files should not mean zero tokens. Preserve the native session log and checkpoint without pretending the task completed.

These findings were recorded, not fixed, because Scott requested a report after stopping the project.

## 10. Local models: preserve what already works

Scott's local tuning is a separate asset. It should not be disturbed to repair orchestration.

The existing handoff from Claude is:

[SETUP-local-models-for-another-agent-2026-09-16.md](C:/Users/scott/Tools/model-trial/SETUP-local-models-for-another-agent-2026-09-16.md)

Configuration and prior agreement:

| Role | Model key | Working convention |
|---|---|---|
| Brain | halo/qwen3.6-35b-a3b | Request reasoning_effort high by default |
| Coder | halo/qwen3-coder-30b-a3b-q4km | Do not send an unsupported reasoning field |
| Cloud worker | deepseek-v4.1-flash:cloud | Ollama Cloud; not GPU inference on this box |

LM Studio endpoint: http://127.0.0.1:1234.

Typical loaded identifiers: halo-brain-35b and halo-coder-q4km. Resolve actual loaded instances before calling rather than assuming the identifiers are presently resident.

The two independent reasoning comparisons on one counting fixture found 2/6 correct with none and 6/6 with high in each run. Matching fixture/prompt hashes supported that they tested the same inputs. This is useful evidence for the brain's default, not universal proof across all tasks or models.

Preserve these boundaries:

- User-facing Off maps to reasoning_effort none for the tested brain endpoint; off was rejected.
- Read reasoning_content as well as content when interpreting streamed results.
- Keep the approved 131,072 context configuration and alias files untouched.
- Do not change global LM Studio defaults to implement per-request reasoning.
- Never unload another application's model.
- Expect contention when sharing a single-session brain.
- Exact counts should come from code, with the model choosing and explaining the operation.
- Distinguish local inference from cloud inference even when both are accessed through localhost.

The existing ask_local.py helper supports bounded file-based prompts and returns output/receipt files. It is not an autonomous coding agent. It does not gain a tool loop simply because it can generate code. A cloud/native agent still needs to inspect and apply drafts and verify them.

Previous local reviews were mixed: one targeted brain review identified a real issue; a coder review gave an incorrect explanation and was rejected. Local role assignments should therefore stay task-specific. No evidence here justifies claiming that every review should be local, or that local models are unsuitable.

The Claude handoff includes performance, billing, and retention statements. Those were not independently re-established in this report and should not be adopted as current provider guarantees.

## 11. What should be retained

Retain, subject to Scott's decision to resume:

- The last published launcher at commit 3fc8e83c.
- The dedicated code-worker profile and known compatible model catalog.
- The original full profile as a restoration path.
- Existing credentials in their original stores; do not copy them into reports or repositories.
- The tested local helper and Scott's model tuning.
- The existing read-only per-response usage analyzer.
- The successful task diffs, receipts, and failure logs.
- The principle that the worker owns implementation through focused verification.

Do not automatically promote:

- The unfinished reporter and its percentage claims.
- Global policy edits merely because they mention an 80% target.
- A new agent framework, queue, service, dashboard, or policy engine.
- Broader audits and repeated tests without a new failure.
- More cloud/local model tuning as a substitute for fixing coordination.

The largest demonstrated problems were in execution control and supervision, not lack of another model or more hardware.

## 12. Recommended architecture if Scott authorizes a successor

### Preferred operating shape

A short-lived premium coordinator makes the few decisions that need it. A self-contained DeepSeek worker owns an adequately scoped job. A deterministic supervisor handles waiting, progress, process identity, exit status, and artifact collection. The premium coordinator reviews one compact result.

Conceptually:

    Scott's task
        -> short premium decision/brief, only when needed
        -> stock Codex CLI + Ollama DeepSeek worker
        -> local helper only for a suitable bounded subtask
        -> deterministic artifact/test collection
        -> one premium acceptance decision, only when needed

No new model tool loop is necessary. The existing CLI already supplies one.

The coordinator should receive a compact task brief and returned evidence, not the entire historical conversation, repeated full files, or every status event. A new short-context task is preferable to continually reusing this conversation. The current model cannot shrink its own charged input simply by promising to “think less.”

A DeepSeek-first operator with premium review only at explicit checkpoints may be a better long-term default than an Astra-first chat that delegates everything but still wakes continuously. Whether Codex Desktop exposes the necessary provider selection cleanly must be checked against its current supported controls. This report does not claim that configuration is already implemented.

### Deterministic supervision

The next narrow implementation, if authorized, should improve the existing launcher rather than add a framework:

- Create an invocation ID and a minimal start record before the child starts.
- Stream stdout/stderr to files so progress and partial evidence survive interruption.
- Keep process ownership explicit; never stop all codex.exe processes or shared model servers.
- Enforce a task deadline and a bounded repeated-no-progress policy.
- On exhaustion, preserve the diff and evidence and return incomplete.
- Never call an incomplete result successful.
- Allow a compact continuation for a recoverable tool failure.
- Use a fresh bounded handoff when the session is looping or has accumulated too much context.
- Keep the caller informed without generating a premium model response for each poll.

Tool-managed progress batching was tried late in this incident. It eliminated repeated premium inference between those checks. It was an orchestration technique in this session, **not** an installed background supervisor. It also introduces responsiveness concerns if implemented as one very long blocking call. A successor must support prompt cancellation and use host-native completion/progress mechanisms where available.

### Stop conditions that are concrete

Example starting policy, not a measured optimum:

- One relevant baseline check only when needed.
- One post-change focused suite.
- Repeat only after a new edit, failure, or unresolved material concern.
- Return after the diff and acceptance criteria are satisfied.
- If the same source inspection or delivery question repeats without changing an artifact, checkpoint rather than run another cycle.
- A bounded task has an explicit wall-clock/operation budget selected for that task.
- Larger work gets a larger authorized budget, not an unlimited default.

Do not confuse these operational budgets with a token minimum. The goal is to stop waste, not force DeepSeek to emit enough tokens.

### Reasoning policy

Keep the local brain's tested High policy separate from cloud-agent tuning.

High was selected for the cloud worker, but this incident did not establish it as the best setting. Investigate what the current provider actually supports before assuming that every accepted effort label produces a different budget. If a successor changes it, compare a small real task on the same code snapshot with the same checks; do not repeat a broad benchmark matrix.

Transport, prompt size, task scope, and reasoning are separate variables. Change one at a time when identifying causes.

## 13. How to prove the arrangement without repeating this incident

Before starting a trial, define the job, its acceptance checks, the measurement boundary, and its resource limits.

Use a real pending repository task that Scott already needs. Do not invent implementation work to create a large numerator. Give the worker the problem and acceptance criteria, not the solution patch.

Acceptance should require:

1. Correct behavior on the chosen task.
2. Actual changed artifacts.
3. Relevant tests executed successfully.
4. A real final answer and truthful failure handling.
5. No undisclosed premium repair.
6. Recorded input/output usage for every participating model and failed attempt.
7. A clear distinction between setup costs and the operating trial, reported side by side.
8. No assertion of a final share until post-run accounting exists.
9. An absolute premium-use ceiling as well as the offload percentage.
10. A reasonable elapsed-time bound.

One successful trial proves that path for that task. It does not guarantee the same proportion for every tiny edit, every long session, or every interruption. A small follow-up across ordinary work can establish repeatability after Scott approves it; an expanding benchmark project is not required.

If the target is missed, identify whether premium context, unnecessary polling, worker failure, or genuine expert work caused it. Do not simply launch another task or increase the DeepSeek token count.

If the application requires a premium model to repeatedly ingest this entire conversation for routine supervision, the application/workflow boundary must change. No instruction paragraph can remove that architectural cost.

## 14. Suggested order for a successor

This is a recommendation, not authorization.

1. **Read and preserve the baseline.** Confirm the repository status and installed version before touching pending changes.
2. **Agree on the metric.** Define useful completion, an absolute premium budget, and any requested raw-token-share threshold before work starts.
3. **Fix the supervision boundary.** Short coordinator context, deterministic progress, bounded workers. This is more important than additional accounting features.
4. **Review the pending adapter narrowly.** Correct the multi-turn and failed-usage issues only if the adapter is still useful. Do not install it just because 47 tests passed.
5. **Run one useful bounded job.** Use the existing route, real tests, and a compact final handoff.
6. **Count after completion.** Include failures and all coordinating turns in the defined boundary. Report setup separately without hiding it.
7. **Stop if the premise fails.** If this host/provider combination remains unreliable, prefer a simpler supported operating arrangement over another homemade compatibility layer.

The expected work is a small launcher/supervision adjustment plus a real task, not another model platform. No credible completion-time promise can be made from this incident: earlier estimates and progress assurances were repeatedly too optimistic. A successor should use a bounded first session and bring back evidence, not a multi-day plan or an open-ended experiment.

## 15. Evidence map and recovery references

Primary code:

- [Canonical overlay](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/codex-ollama)
- [Published/working launcher](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/codex-ollama/skill/scripts/run_ollama_code_worker.py)
- [Local helper](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/codex-ollama/skill/scripts/ask_local.py)
- [Existing usage analyzer](C:/Users/scott/.codex/skills/openai-multi-agent/scripts/measure_usage.py)

Evidence directories:

- [Earlier delegation trials](C:/Users/scott/Tools/model-trial/codex-delegation-2026-09-16)
- [First successful transport trial](C:/Users/scott/Tools/model-trial/codex-delegation-2026-09-16/code-worker-acceptance/attempt-2-direct-overrides-valid-catalog)
- [80% repair attempts](C:/Users/scott/Tools/model-trial/codex-offload-80-2026-09-16)
- [Worker checkpoints](C:/Users/scott/Tools/model-trial/codex-offload-80-2026-09-16/worker-checkpoint-usage.json)
- [Packaged live acceptance receipt](C:/Users/scott/Tools/model-trial/codex-offload-80-2026-09-16/acceptance-run/receipt.json)
- [Completed finalizer receipt](C:/Users/scott/Tools/model-trial/codex-offload-80-2026-09-16/finalizer/receipt.json)
- [Interrupted operating-trial accounting](C:/Users/scott/Tools/model-trial/codex-offload-80-2026-09-16/operating-trial/interruption-accounting.json)

Important session IDs:

| Session | ID |
|---|---|
| Premium root conversation | 01a08df2-e63f-7eb2-bc40-dc699bcdf778 |
| First successful narrow transport task | 01a0ab82-d043-7153-b30b-1a13926a6db8 |
| Interrupted long owner | 01a0ab95-6d35-7b72-ad6b-16bed9640e46 |
| Launcher implementation child | 01a0ab9b-3148-7a22-9439-242c2b3ea120 |
| Packaged acceptance child | 01a0aba5-0a85-77d0-a4ae-6176786bad3f |
| Successful finalizer | 01a0abc9-95b0-7800-aeba-998e08317d7b |
| Interrupted accounting worker | 01a0abd0-0888-7140-a0d7-e893f7bc57e5 |

Root log:

[C:/Users/scott/.codex/sessions/2026/09/10/rollout-2026-09-10T18-51-41-01a08df2-e63f-7eb2-bc40-dc699bcdf778.jsonl](C:/Users/scott/.codex/sessions/2026/09/10/rollout-2026-09-10T18-51-41-01a08df2-e63f-7eb2-bc40-dc699bcdf778.jsonl)

Standalone worker logs are under C:/Users/scott/.codex/sessions/2026/09/16; locate by the exact IDs above rather than scanning all history.

Earlier reports:

- [Transport research](C:/Users/scott/Desktop/Code/dsh-halo-research/docs/HALO-CODEX-TRANSPORT-RESEARCH-2026-09-16.md)
- [Worker repair](C:/Users/scott/Desktop/Code/dsh-halo-research/docs/HALO-CODEX-WORKER-REPAIR-2026-09-16.md)
- [Initial delegation implementation](C:/Users/scott/Desktop/Code/dsh-halo-research/docs/HALO-DSH-IMPLEMENTATION-2026-09-16-CODEX-DELEGATION.md)

These reports contain dated snapshots and, in the working tree, unfinished corrections. Use the receipts and current repository state when they disagree.

Recovery documents:

[C:/Users/scott/Desktop/Halo Stack Research](<C:/Users/scott/Desktop/Halo Stack Research>)

Manifest:

[C:/Users/scott/Desktop/Halo Stack Research/Current Halo Configuration/MANIFEST-SHA256.txt](<C:/Users/scott/Desktop/Halo Stack Research/Current Halo Configuration/MANIFEST-SHA256.txt>)

The top-level Research documents and the documents inside Current Halo Configuration are distinct copies. The prior worker wasted time comparing the wrong paths. A successor should copy and hash each intended target explicitly, without an elaborate recovery redesign.

## 16. Final assessment

This was principally a failure of supervision, scope discipline, and measurement judgment.

The successful code changes show that DeepSeek can perform useful autonomous work through the existing setup. They do not justify the amount of subscription usage spent, the repetitive progress messages, the prolonged worker loops, or the failure to satisfy the requested operating target.

The most promising path is simpler than what was attempted: keep the working model route, use small task contexts, make waiting and evidence collection non-model work, enforce completion boundaries, and spend premium judgment only where it changes the result.

That path is a recommendation for a successor. It has not been validated as the finished 80% system. Scott stopped the project, and this report does not restart it.

