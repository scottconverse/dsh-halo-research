# The Halo Stack — operator guide

**Use the DeepSeek Harness web cockpit at `http://127.0.0.1:3080`.**

## What is running

| Part | Current choice | Job |
|:--|:--|:--|
| Cockpit | `halo/qwen3.6-35b-a3b` Q4_K_M, 32K | plan, coordinate, call tools, review |
| Worker | `halo/qwen3-coder-30b-a3b-q4km`, 32K | implement behind `subagent_coder` |
| Gate | Halo Verified Coder | stage, verify, promote or fail closed |
| Model host | LM Studio at `:1234` | local inference |
| Monitoring | Mission Control at `:3090` | services, models, memory, receipts |

The machine uses a 64 GB graphics / 64 GB Windows split. The 35B brain and
Q4_K_M coder were post-reboot verified resident together with one parallel
slot each. Only one generates at a time. The old dense 27B and Q4_K_S coder
remain fallbacks.

`parallel=1` is the accepted daily profile, not a hardware-wide rejection of
parallel inference. A future two-worker profile would leave the planner at one
slot and test a separate two-slot coder alias with two isolated, independently
verified units. That profile is proposed only; it is not installed or selectable
today.

## Start and use it

1. Start LM Studio.
   If loading models manually, serialize the loads and wait for each `lms load`
   command to report success. The early `idle` status can precede the backend
   health handshake.
2. Double-click `C:\Users\scott\Desktop\Halo Cockpit.lnk`.
3. Open a new task using the **Halo Orchestrator** preset.
4. Describe the software you want built in plain English.
5. Let the 35B inspect and create one bounded brief. It calls
   `subagent_coder` once with editable paths, protected paths, and a real test
   command.
6. The 30B implements with only six tools: `read`, `write`, `edit`, `glob`,
   `grep`, and `pwsh`. It cannot plan, create goals, delegate, browse the web,
   or manage background work.
7. Trust the gate receipt, not the worker's claim. Only PASS is promoted. A
   FAIL stops the unit; the 35B cannot retry or directly edit around it.

The model picker changes the model answering the current conversation. It
does not reproduce the planner/worker/verifier workflow by itself.

## What the gate guarantees

The worker edits a detached staging worktree under a reduced
`workspace-write` parent. DSH's native child filter exposes only the six coding
tools listed above. Temporary fixtures belong under gate-owned
`.halo-scratch`, which is ignored and never promoted. The gate
rejects protected-test and out-of-scope changes, verifies against an
independent baseline, allows one bounded repair, promotes with a
compare-and-swap check, reruns the verifier after promotion, and rolls back a
bad promotion. A crashed or timed-out verifier is FAIL. After a verdict the
same parent is mechanically barred from a second gate call or direct mutation.

Receipts are under:

`C:\Users\scott\AppData\Local\HaloGate\runs`

The real 2026-08-29 canary passed end to end. A 2026-08-30 Hardgate run then
proved the complete autonomous path on a real repository: one 35B brief, one
30B worker call, verified promotion, read-only review, and stop, with no Codex
steering. See `HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md` and
`HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`.

The receipt proves only what the protected verifier checks. The first Hardgate
proof exposed a weak string-only documentation contract. A second bounded
autonomous unit strengthened that contract, proved the expected RED, repaired
the README through the verified worker, and finished with 18/18 target tests
and 134/134 repository tests. Do not turn a green receipt into a broader
quality claim than its contract supports.

## Keys and accounts

Halo needs **no DeepSeek API key**. The DeepSeek picker catalog is disabled.
The launcher sets `LMSTUDIO_API_KEY=x` only because the OpenAI-compatible
client insists on a nonempty string; LM Studio ignores it. It is not a real
credential.

Codex and Claude use their signed-in subscription integrations as optional
subagent tools. They are not LM Studio picker models.

## Web research

Halo exposes anonymous Exa search/fetch and the installed Reddit RSS skill.
Anonymous Exa can be rate-limited. The full Halo Research Gateway is not yet
deployed.

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
- The local library now contains seven model directories totaling 136.300 GiB:
  the daily pair, both proven fallbacks, Qwen3-VL, Nemotron 3.5 Lightning, and
  the uncensored Qwen3.8 lane.
- Full local worker turns include a large coding/tool prefix and are slower
  than tiny direct prompts.
- Tonight's acceptance used short real smokes and one live gated edit, not a
  multi-hour soak. Real software use is the next evaluation.

## Key files

- Current full configuration: `stack\HALO-CURRENT-CONFIGURATION.md`
- Runtime evidence: `stack\HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md`
- Autonomous coding evidence:
  `stack\HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`
- Improvement/audition evidence:
  `stack\HALO-IMPROVEMENT-BASELINE-2026-08-30.md`
- Parallel-slot evidence: `stack\HALO-PARALLEL-SLOT-TEST-2026-08-30.md`
- Parallel review/correction:
  `stack\HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`
- Governing current specification: `DSH-Strix-Halo-Report-v3.2.md`
- Complete revisions 2.0–3.1 history: `DSH-Strix-Halo-Report-v3.0.md`
- Curated-library cleanup evidence:
  `stack\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md`
- DSH catalog: `stack\halo-settings.yaml`
- Halo preset: `stack\halo-orchestrator\agent.cordis.yml`
- Gate plugin: `stack\halo-verified-coder\index.mjs`
- Gate engine: `stack\halo-verified-coder\gate-core.mjs`
- Model aliases: `stack\lmstudio-models\halo\...\model.yaml`
- Launcher: `stack\Launch-Halo.ps1`
- User copy and recovery snapshot: `C:\Users\scott\Desktop\Halo Stack Research`
