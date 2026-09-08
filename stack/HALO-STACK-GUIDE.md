# The Halo Stack — operator guide

## September 7: optional Router DEV experiment

Use **http://127.0.0.1:3085**, preset **Halo Router DEV**, for shadow routing
observations. This is separate from production; it does not switch your models.
Choose models normally. DEV has full access, not a filesystem sandbox, so use a
development worktree for experimental coding. Its own session/receipt records
are separate, while existing model services and signed-in accounts are shared.

Start/stop scripts and record-reading instructions are in
[the Router DEV runbook](halo-router-dev/README.md). Production is not promoted.
The Research Gateway is excluded from this DEV experiment; historical Gateway
sections below are not a claim that the Router depends on it or repairs it.

## September 3: verified long-form research in DSH

Halo Orchestrator now preserves an authoritative ledger of successful Halo
Research Gateway calls across DSH's automatic compaction. Ask for a research
budget and output contract in the prompt (for example, maximum calls, minutes,
words, required URLs, and citation placement). DSH enforces explicit call/time
limits, preserves real source parts and exact continuation cursors, and asks the
same turn to revise a non-compliant final answer without making more research
calls. Model-written summaries are not evidence that a source or page was read.

The live acceptance completed discovery, three source reads, continuation,
comparison, and a cited answer in 8 calls and 128,443 ms, with two automatic
compactions. It disclosed unread continuations rather than claiming complete
coverage. See `HALO-DSH-IMPLEMENTATION-2026-09-03.md`. This does not certify all
Gateway providers or remove the need to review important source claims.

## September 2: local and cloud models in the production picker

- Open the usual **Halo Cockpit** shortcut or **http://127.0.0.1:3080**.
- A fresh full startup still selects and preloads the tuned local pair.
  Reopening a running cockpit preserves the current selection.
- The opening screen and existing conversations have a searchable model
  picker. Search `Claude`, `Codex`, `DeepSeek`, `Kimi`, `GLM`, or a local model.
- **Claude Code — signed-in CLI** and **Codex — signed-in CLI** use your
  existing subscriptions through their official CLIs and native tools.
  Select the desired model; its account availability is checked on use.
- **OmniRoute** is the broad API/cloud catalog. Connect provider accounts at
  **http://127.0.0.1:20130** before expecting those routes to work. Catalog
  labels that say connect account are not a promise of free inference.
  The dashboard password is stored locally in
  `C:\Users\scott\.dsh\provider-runtime\credentials.json`; do not paste that
  file into a chat or commit it. No personal CLI credentials were imported.
- Model selection in an existing session survives a DSH restart, including
  selections made before sending another message. A deliberate fresh startup
  may still set the *new-session default* to the local brain.
- `/compact` on a native CLI conversation archives the DSH outer transcript
  and retains the exact native thread. CLI-owned auto-compaction remains
  enabled. These are distinct operations. Native accounting is shown in the
  composer footer; unreported first-token/decode timing is not invented.

No LM Studio, memory split, tuned-alias, or Mission Control runtime change was
part of this promotion. Read `HALO-PROVIDER-PROMOTION-2026-09-02.md` before
rollback or maintenance. The older operating history below remains preserved.

> **Mission Control shortcut repair (2026-09-02):** double-click **Halo Status**
> to open `http://localhost:3090`. Repeated clicks reuse the verified running
> server. No DSH or model restart is needed. The launcher also works with the
> shortcut's Windows PowerShell `-File` default paths. Repair evidence is in
> `HALO-DSH-IMPLEMENTATION-2026-09-02.md`.

> **Current correction (2026-09-01):** Halo Orchestrator has native tools and
> caller-inherited permissions. The verified-coder lane is optional, not a
> capability restriction. Model/residency figures below are historical baseline
> measurements; this repair did not retune them. See
> `HALO-DSH-IMPLEMENTATION-2026-09-01.md` for today's deployment evidence and
> remaining acceptance items. The native-access gate suite is 16/16; the reboot
> handoff's 13/13 count describes the older gate.

> **Evidence warning (2026-08-30):** the accepted daily baseline is the 35B
> planner plus Q4_K_M worker described below. A Q6 worker remains installed as
> a test candidate but is not routed. Prior Hardgate
> evidence was actively guided by Codex and must not be cited as unassisted
> autonomy. Read `HALO-TAKEOVER-HANDOFF-2026-08-30.md` before changing or
> evaluating the stack.

**Use the DeepSeek Harness web cockpit at `http://127.0.0.1:3080`.**

## Current route and installed components

| Part | Current choice | Job |
|:--|:--|:--|
| Fresh-launch default | `lmstudio/halo/qwen3.6-35b-a3b` | tuned 35B brain; picker remains operator-controlled |
| Worker | `halo/qwen3-coder-30b-a3b-q4km`, 32K | implement behind `subagent_coder` |
| Gate | Halo Verified Coder | stage, verify, promote or fail closed |
| Model host | LM Studio at `:1234` | local inference |
| Monitoring | Mission Control at `:3090` | services, models, memory, receipts |

Fresh DSH startup now selects and preloads the tuned 35B plus Q4_K_M coder.
Reopening an already running cockpit does not reset your model selection.
All advertised local/LM Link LLMs are added to the catalog; existing custom
and temporarily offline entries are retained. There were 32 choices in the
live picker during the evening check. These are selectable catalog entries,
not a claim that all are complete models or have passed inference tests.
Reasoning controls depend on the selected provider/model contract.

The recorded 2026-08-30 baseline used a 64 GB graphics / 64 GB Windows split.
The 35B brain and Q4_K_M coder were verified resident together with one
parallel slot each and serialized generation. Those are dated measurements,
and the same pair was reverified resident during the 2026-09-01 startup work.
The tuned 35B, tuned 27B, and
Q4_K_S fallback choices remain separate from the operator's current selection.

`parallel=1` is the accepted daily profile, not a hardware-wide rejection of
parallel inference. A future two-worker profile would leave the planner at one
slot and test a separate two-slot coder alias with two isolated, independently
verified units. No two-worker profile was promoted by this picker/Mission
Control repair.

## Start and use it

1. Use either LM Studio or Bionic as the local runtime host, not both apps
   simultaneously. The helper asks the CLI to start the local API if needed;
   this change's live proof used Bionic already running. A fully stopped
   daemon startup remains untested.
2. Double-click `C:\Users\scott\Desktop\Halo Cockpit.lnk`.
   A fresh DSH start waits for its plugins, refreshes the full model catalog,
   then loads the tuned pair sequentially before opening the browser. Already
   loaded, correctly configured models are reused. Startup logs are under
   `C:\Users\scott\.dsh\logs\halo-startup-*.log`. Reopening a running
   cockpit refreshes choices only; it does not force the pair back on you.
3. Open a new task using the **Halo Orchestrator** preset.
4. Describe the software you want built in plain English.
5. The selected model inspects the task and can call `halo_preflight`. If a hard premise is
   false (for example Docker is absent), it reports that instead of substituting
   a different delivery method and claiming success.
6. It can work directly or select `subagent_coder` with editable paths,
   protected paths, and a real verification command.
7. For a new non-Git directory, the selected planner also supplies independent verifier
   files under `.halo-acceptance`; the gate freezes them before the worker runs
   and never copies them into the finished project.
8. The worker inherits the native tool catalog and the caller's permission
   scope, including research, delegation, and background work where available.
9. Trust the gate receipt, not the worker's claim. Only PASS is promoted. A
   failed receipt must be reported honestly. Authorized work can continue,
   but subsequent changes need fresh verification.

Direct file/shell work, generic subagents, Codex, Claude Build, workflows, and
Ralph are available within Halo Orchestrator. No preset switch is needed.
Machine access remains separate from authorization for a particular action.

The model picker changes the model answering the current conversation. It
does not reproduce the planner/worker/verifier workflow by itself. On the
current package, a model with no reasoning controls opens the complete model
list on the first click. Models with reasoning controls still open the
Model/Effort menu.

The reviewed picker package is pinned by `stack\web-profile.package.json` and
installed with `stack\Install-HaloPickerOverride.ps1`. The installer works
offline with lifecycle scripts disabled, verifies the immutable tgz, all three
runtime bundles, and its lockfile integrity binding, and reports a
backup-specific rollback command. It also verifies the standalone package's
license and resolved dependencies, and supports an alternate `-DshHome`
without assuming the live profile's folder layout. It deliberately fails if the reviewed tgz
is absent; restore that versioned artifact rather than rebuilding it. Do not
hand-edit pnpm's global store. After install or rollback, restart only the owned
DSH cockpit tree and use `stack\Launch-Halo.ps1 -NoBrowser`; leave LM Studio,
the Research Gateway, Mission Control, and Ollama running.

The 2026-09-01 browser check selected the 35B and then restored the original
raw 27B selection successfully. No generation was requested during that check;
it proves model selection, not inference quality or throughput.

## Mission Control operation and evidence

Mission Control is separate from the cockpit. Its canonical installation
contract is `stack\mission-control\INSTALLATION.md`. Promote a source candidate
with `Install-HaloMissionControl.ps1`, then start the installed copy with
`Launch-Status.ps1 -NoBrowser`. A source edit alone is not deployment, and
restarting the cockpit alone does not update Mission Control.

The final deployed 2026-09-01 candidate passed 118/118 combined Mission Control
tests; its installer separately ran the exact four required suites, 83/83.
Those test results are not a substitute for live acceptance. The dated
implementation report records the candidate/receipt hashes and the actual
live result: 199 live checks passed against the final candidate, followed by
the browser walkthrough and narrow-width memory-graph check. Counts vary with
the current model inventory; the report preserves the intermediate 201-check run.

The dashboard distinguishes unavailable data from zero. It checks model origin
and instance identity, reports stale plugin data, preserves missing decode
measurements as missing, and labels memory writer/task/snapshot availability.
`Test-HaloMissionControlLive.ps1` checks the actual installed candidate and
its receipt, authenticates validation, checks data against local evidence,
and refuses to label degraded GPU telemetry a healthy pass. That acceptance
result does not restrict model or tool access.

The replacement `HALO Memory Snapshot` task was installed with Scott's UAC
approval at 20:47 MDT on 2026-09-01. It runs as Scott with normal privileges,
keeps the latest 168 canonical snapshots, runs hourly, and has startup
catch-up and retry settings. A real scheduled-task run at 20:49 produced a
snapshot identical to the source memory file. Its Interactive principal
requires Scott's user session; unattended pre-login execution is not proven.
Missing `memory.json` is reported honestly; neither the dashboard nor snapshot
script invents memories. No reboot was performed for this verification.

## What the gate guarantees

For an existing Git repository, the worker edits a detached staging worktree
with the caller's permissions and native tools. For greenfield work, the gate first creates its own Git
baseline and independent protected acceptance files, then uses the same
worktree flow. Temporary fixtures belong under gate-owned
`.halo-scratch`, which is ignored and never promoted. The gate
rejects protected-test and out-of-scope changes, verifies against an
independent baseline, allows one bounded repair, promotes with a
compare-and-swap check, reruns the verifier after promotion, and rolls back a
bad promotion. A crashed or timed-out verifier is FAIL. A verdict does not
lock the parent or worker's capabilities. Full-access staging is not a
security sandbox or a tamper-proof boundary against that same user's access.

Receipts are under:

`C:\Users\scott\AppData\Local\HaloGate\runs`

The real 2026-08-29 canary passed end to end. A 2026-08-30 Hardgate run then
proved the complete **guided Halo path** on a real repository: one 35B brief,
one 30B worker call, verified promotion, read-only review, and stop. Codex
designed and constrained the workflow, so this is not evidence of unassisted
autonomy. See `HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md` and
`HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`.

The receipt proves only what the protected verifier checks. The first Hardgate
proof exposed a weak string-only documentation contract. A second bounded
guided unit strengthened that contract, proved the expected RED, repaired
the README through the verified worker, and finished with 18/18 target tests
and 134/134 repository tests. Do not turn a green receipt into a broader
quality claim than its contract supports.

## Keys and accounts

Halo needs **no DeepSeek API key**. The DeepSeek picker catalog is disabled.
The launcher sets `LMSTUDIO_API_KEY=x` only because the OpenAI-compatible
client insists on a nonempty string; LM Studio ignores it. It is not a real
credential.

Codex and Claude use their signed-in subscription integrations as optional
subagent tools in Halo Orchestrator. Claude Plan is a separately named
planning-mode option; Claude Build retains native implementation access.
They are not LM Studio picker models.

## Web research

Halo exposes the local Halo Research Gateway 0.2.0 at `127.0.0.1:8765`.
It supplies research-only tools for web discovery and retrieval, crawling,
documents, GitHub evidence, transcripts, communities, and bounded research
jobs, including shared anonymous search and Reddit pacing. The DSH
`halo-research-state` plugin preserves successful Gateway evidence through
compaction and enforces explicit research/output budgets. Anonymous providers
remain rate-limited. Installed tools and the bounded 2026-09-03 workflow pass
are not proof that every authenticated, imported-profile, or paid-provider path
has passed live acceptance.

## Heavy-work rule

Only one Windows Sandbox is allowed. Before a Sandbox, installer build, or
other large workload overlaps the resident model pair, check current memory
and coordinate the single heavy lane. Do not kill or adopt another task's
Sandbox or model process.

## Current limits

- GPT-OSS 120B did not load on the Windows Vulkan backend even at 96/32.
  GPT-OSS 20B failed to start a stable engine, and Qwen3-Coder-Next 80B wedged
  the LM Studio load service before inference. Their GGUFs and active aliases
  were removed in the approved 2026-08-30 curated-library cleanup; restoring
  one requires a new download and new runtime proof.
- The accepted cleanup baseline contained seven model directories totaling
  136.300 GiB. A Q6 coder file and Halo hard-link alias were subsequently
  added for an unfinished audition. Enumerate actual files and hard-link
  identities before citing a current count or physical-byte total.
- Full local worker turns include a large coding/tool prefix and are slower
  than tiny direct prompts.
- Historical coding acceptance used short real smokes and a live gated edit,
  not a multi-hour soak. Today's picker selection check made no generation
  request and must not be recast as a new autonomous coding result.

## Key files

- Current full configuration: `stack\HALO-CURRENT-CONFIGURATION.md`
- Verified research workflow evidence:
  `stack\HALO-DSH-IMPLEMENTATION-2026-09-03.md`
- Native-access deployment evidence:
  `stack\HALO-DSH-IMPLEMENTATION-2026-09-01.md`
- Takeover and evidence correction:
  `stack\HALO-TAKEOVER-HANDOFF-2026-08-30.md`
- Runtime evidence: `stack\HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md`
- Historical guided coding evidence:
  `stack\HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`
- Improvement/audition evidence:
  `stack\HALO-IMPROVEMENT-BASELINE-2026-08-30.md`
- Parallel-slot evidence: `stack\HALO-PARALLEL-SLOT-TEST-2026-08-30.md`
- Parallel review/correction:
  `stack\HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`
- Governing current specification: `DSH-Strix-Halo-Spec-v3.5.md`
- Complete revisions 2.0–3.1 history: `DSH-Strix-Halo-Report-v3.0.md`
- Curated-library cleanup evidence:
  `stack\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md`
- DSH catalog: `stack\halo-settings.yaml`
- Halo preset: `stack\halo-orchestrator\agent.cordis.yml`
- Research-state plugin: `stack\halo-research-state\index.mjs`
- Research-state operation/tests: `stack\halo-research-state\README.md`
- Gate plugin: `stack\halo-verified-coder\index.mjs`
- Gate engine: `stack\halo-verified-coder\gate-core.mjs`
- Model aliases: `stack\lmstudio-models\halo\...\model.yaml`
- Launcher: `stack\Launch-Halo.ps1`
- Supervisor: `stack\Run-HaloCockpit.ps1`
- Picker profile manifest: `stack\web-profile.package.json`
- Picker install/rollback: `stack\Install-HaloPickerOverride.ps1`
- Immutable picker package:
  `stack\packages\deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz`
- Mission Control installation/live checks: `stack\mission-control\INSTALLATION.md`
- User copy and recovery snapshot: `C:\Users\scott\Desktop\Halo Stack Research`
