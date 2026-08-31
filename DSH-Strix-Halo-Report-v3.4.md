# DeepSeek Harness on a 128 GB AMD Strix Halo Windows 11 Workstation

## Current Halo Stack specification — Revision 3.4

**Effective date:** 2026-08-30

**Target:** AMD Ryzen AI Max+ 395 / 128 GB unified memory / native Windows 11

**DSH:** `@deepseek-ai/dsh@0.1.1-rc.2`
**Status:** governing current-build specification and recovery contract

## 0. Document lineage and authority

This document continues, but does not rewrite, the complete clean-room research
record in `DSH-Strix-Halo-Report-v3.0.md`. That 297 KB report preserves the
original investigation, all revisions from 2.0 through 3.0, the measurements
that later changed the architecture, and the embedded v3.1 restoration chapter.
It remains the historical evidence record.

Revision 3.4 is the concise normative layer for what is actually installed and
accepted now. Where an older recommendation conflicts with this document or
`stack\HALO-CURRENT-CONFIGURATION.md`, the current documents govern operation;
the old text remains evidence of what was known and decided at that time.

The source-of-truth order is:

1. Runtime evidence from the live DSH and LM Studio path.
2. Canonical deployable files under `stack\` in this repository.
3. `stack\HALO-CURRENT-CONFIGURATION.md` and this revision.
4. The recovery snapshot in Scott's Research folder.
5. Earlier reports and handoffs, as historical evidence only.

Nothing counts as live merely because YAML says it. Model identity, context,
slot count, routing, permission mode, and gate behavior require runtime proof.

## 1. Revision history carried forward

| Revision | Date | Durable contribution |
|:--|:--|:--|
| 2.0 | 2026-08-23 | Clean-room DSH, Windows, Strix Halo, Vulkan/ROCm, model, and storage investigation |
| 2.1 | 2026-08-23 | First-party corrections, native-Windows support findings, replicated benchmarks |
| 2.2 | 2026-08-23 | External corroboration; code-sandbox result; additional runtimes and community evidence |
| 2.3 | 2026-08-24 | Reconciliation pass and evidence-boundary corrections |
| 2.4 | 2026-08-25 | Context sweep, forced-cadence battery, two-resident pattern, recovered bench record |
| 2.5 | 2026-08-25 | Code/Standard 2x2, compaction proof, external-verifier requirement |
| 2.6 | 2026-08-25 | Built gated lanes, evidence rules, model-pinning lesson, operator launcher |
| 2.7 | 2026-08-25 | Reasoning-control investigation and external citation cross-check |
| 2.8 | 2026-08-25 | First conductor build, micro-unit law, test-first redesign |
| 2.9 | 2026-08-25 | Blind-feedback root cause and fail-closed harness requirements |
| 3.0 | 2026-08-26 | One-command cloud-conductor interface and frozen-specification defense |
| 3.1 | 2026-08-26–29 | DSH restored as control plane; native verified subagent gate; Mission Control |
| 3.2 | 2026-08-30 | 96/32 runtime, MoE daily pair, simplified mechanical gate, model-library curation, Hardgate proof, and corrected parallel-slot conclusion |
| **3.3** | **2026-08-30** | **64/64 post-reboot runtime proof, live DSH label/persona correction, and mixed-quant worker experiment contract** |

The full prose and source appendix for revisions 2.0–3.1 remain in
`DSH-Strix-Halo-Report-v3.0.md`; Revision 3.2 remains a separate historical
specification. Revision 3.3 does not delete or silently rewrite either record.

## 2. Product goal

Halo is a local-LLM-first software-building system:

- DSH is the user-facing control plane and orchestrator.
- A fast local MoE brain plans, delegates, and reviews.
- A local code-specialized MoE worker writes the bulk of implementation.
- A mechanical gate—not model confidence—decides whether changes are promoted.
- Codex and Claude are optional subscription-backed specialists, not required
  for an ordinary local build.
- The system has the same available machine access as Scott when the root
  session is in `danger-full-access`; the gated worker is deliberately narrower.

The success metric is verified software delivered with minimal cloud-model
dependence. Raw tokens per second, aggregate serving throughput, and a model's
claim of completion are secondary measurements, not acceptance evidence.

## 3. Current installed architecture

```text
Scott
  |
  v
DSH web cockpit :3080
  |  Halo Orchestrator / Qwen3.6 35B-A3B Q4_K_M
  |
  +--> subagent_coder (one bounded unit)
          |
          v
       Qwen3 Coder 30B-A3B Q4_K_M
          |
          v
       detached staging worktree
          |
          v
       independent verifier + protected baseline
          |
          +--> PASS: compare-and-swap promotion + post-promotion verification
          `--> FAIL: no promotion; preserved receipt

LM Studio :1234       local model server
Mission Control :3090 runtime visibility and gate ledger
Anonymous Exa MCP     public web search/fetch
Codex / Claude        optional native DSH subagents
```

The current topology is **dual resident, serialized generation**. Both local
models may remain loaded, but only one generates at a time in the accepted
planner/worker flow.

## 4. Machine and memory policy

The current AMD Variable Graphics Memory allocation is:

- **64 GB graphics / 64 GB Windows**
- WSL is no longer part of the current Halo stack.
- Scott permits one Windows Sandbox at a time.
- Heavy non-Halo work must be coordinated rather than inferred from model
  residency alone.

The prior 96/32 split maximized contiguous model capacity, but the 120B route
that justified it failed and was removed. After rebooting at 64/64, the current
35B/30B pair loaded in 14.03 s and 9.71 s, remained dual resident at 32K and
`parallel=1`, completed a real DSH planner turn and a gated worker PASS, and
finished at 43.90 GiB dedicated plus 0.68 GiB shared GPU memory. Windows still
had 40.56 GiB free. This makes 64/64 the accepted daily split.

Memory split and inference slot count remain separate experiments. Halo does
not launch or validate CivicCast's Windows Sandbox; that project owns its own
lane. Any future VGM change is reversible, requires a reboot, and must be
measured against the actual Halo pair rather than inferred from model sizes.

## 5. Daily model pair

### 5.1 Planner and reviewer

- DSH model id: `halo/qwen3.6-35b-a3b`
- LM Studio identifier: `halo-brain-35b`
- Base: Qwen3.6 35B-A3B, Q4_K_M, approximately 20.55 GiB
- Architecture: MoE, approximately 3B active parameters
- Context: 32,768
- Parallel sessions: 1
- Flash Attention: on
- KV: unified, GPU-offloaded, F16
- Batch: 2048 evaluation / 512 physical
- Context checkpoints: 32
- GPU offload: maximum; strict VRAM cap
- mmap: off
- MTP/simple speculative decoding: off
- Keep in memory: true
- Daily thinking default: false

This model replaced the dense Qwen3.8 27B for the prompt-heavy planning role.
The visible no-thinking path and exact response were proved live. The dense 27B
remains a selectable rollback and reasoning-capable model, not the daily route.

### 5.2 Implementation worker

- DSH model id: `halo/qwen3-coder-30b-a3b-q4km`
- LM Studio identifier: `halo-coder-q4km`
- Base: Qwen3 Coder 30B-A3B Instruct, Q4_K_M, approximately 17.29 GiB
- Context: 32,768
- Parallel sessions: 1
- Same accepted load envelope as the brain
- Reasoning and speculative decoding: off
- Keep in memory: true
- DSH entry point: `subagent_coder`

Q4_K_M replaced Q4_K_S as the daily worker. The older Q4_K_S alias remains the
rollback route.

### 5.3 Preserved model fallbacks

- `halo/qwen3.8-27b`: dense Qwen3.8 27B Q5_K_XL, 32K, MTP enabled,
  boolean reasoning available.
- `halo/qwen3-coder-30b-a3b`: Qwen3 Coder Q4_K_S, 32K.

The retained raw library contains seven model directories totaling about
136.30 GiB. Fourteen redundant, incomplete, rejected, or nonessential model
directories were removed on 2026-08-30, reclaiming 246.984 GiB. The inventory
and removed-alias definitions are preserved in the recovery snapshot; removed
GGUFs require re-download.

### 5.4 Rejected operational candidates

- GPT-OSS 120B failed controlled mmap-off and mmap-on Vulkan loads at 32K under
  96/32 and was removed from disk with Scott's approval.
- GPT-OSS 20B failed to establish stable inference and was removed.
- Qwen3-Coder-Next 80B wedged LM Studio before usable inference and was removed.

These are operational results on this Windows/LM Studio path, not universal
model-quality rankings.

## 6. DSH provider, picker, and permissions

The active local provider is `lmstudio`:

- display: `LM Studio (HALO local)`
- API: OpenAI-compatible completions
- base URL: `http://127.0.0.1:1234/v1`
- key variable: `LMSTUDIO_API_KEY`
- local dummy value: `x`

LM Studio ignores the dummy credential; DSH's client requires a nonempty field.
No DeepSeek API key is needed. The bundled DeepSeek-only model catalog is empty.

The picker contains the four Halo aliases and raw routes backed by the seven
retained model directories. Codex and Claude are DSH tools/subagents, not LM
Studio picker models.

New Halo root sessions intentionally default to:

- sandbox: `danger-full-access`
- approval policy: `never`

That gives the root agent the same available machine access as Scott, subject
to Windows ACL/UAC and provider limits. It does not authorize unrelated actions.
The implementation worker is intentionally reduced to `workspace-write` inside
gate-owned staging.

## 7. Verified Coder contract

The current `subagent_coder` is the zero-dependency plugin under
`stack\halo-verified-coder`. For one bounded unit it must:

1. Create a detached staging worktree.
2. Establish explicit editable and protected path sets.
3. Create a synthetic DSH parent in staging with `workspace-write`.
4. Compose the real Halo preset into that parent.
5. Give the direct child only `read`, `write`, `edit`, `glob`, `grep`, and
   `pwsh`; no goal, plan, research, orchestration, or subagent tools.
6. Provide a gate-owned `.halo-scratch` directory excluded from policy diffs
   and promotion.
7. Permit at most two worker rounds.
8. Reject protected and out-of-scope changes.
9. Verify from an independent baseline with a bounded timeout.
10. Treat verifier crash, timeout, empty test suite, and malformed result as
    failure.
11. Compare live files before promotion so concurrent user work cannot be
    overwritten.
12. Promote only PASS, rerun the verifier after promotion, and roll back the
    promoted files if that post-check fails.
13. Preserve a structured receipt under
    `C:\Users\scott\AppData\Local\HaloGate\runs`.
14. Prevent the same parent from making a second gate call or mutating around
    the verdict. Read-only review remains allowed.
15. Refuse goal completion when the armed verdict is not PASS.

The gate proves only the protected contract. The Hardgate run passed its old
string-based documentation test while producing an invalid Claude hook example.
A semantic protected test was then added first, produced a genuine RED, and the
same autonomous Halo flow repaired only the README to 18/18 target tests and
134/134 full-suite tests. This is the standing lesson: stronger models do not
replace stronger specifications.

## 8. Evidence and acceptance contract

For a configuration claim:

- YAML is intent.
- DSH session state is route evidence.
- LM Studio engine/load records are model, context, and slot evidence.
- A completed `lms load` command is required; `lms ps` may report idle before
  the backend handshake is complete.

For a coding-unit claim:

- Worker output is advice.
- A gate receipt proves only the encoded protected contract.
- PASS requires isolated verification, safe promotion, and post-promotion
  verification.
- Independent target verification is preferred for release-sensitive work.
- A model's success claim never completes a unit.

For a benchmark claim:

- Record exact model, quant, context per slot, slot count, endpoint, prompt,
  output contract, run count, warm/cold state, and load completion.
- Distinguish server prompt/decode timing, client TTFT, per-request latency, and
  batch output throughput.
- Do not infer paging without page-fault/pagefile/disk evidence.
- Small differences from one run are directional only.

## 9. Parallelism decision

### 9.1 Installed daily profile

Both daily models remain at `parallel=1`. The accepted DSH path issues one
worker unit at a time. The 2026-08-30 one-slot/two-slot direct comparison had
one run per cell; two slots remained accurate but did not improve the measured
workload. Four-slot performance is **unmeasured** because the load was
interrupted at approximately 98% and later probes could be queued behind
outstanding work.

The revised evidence is in:

- `stack\HALO-PARALLEL-SLOT-TEST-2026-08-30.md`
- `stack\HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`

### 9.2 Optional two-worker profile — proposed, not installed

Public Linux/RADV results demonstrate that Strix Halo can scale aggregate
throughput with multiple slots. That justifies a bounded product experiment,
not a daily configuration change.

The candidate shape is:

- planner remains one slot;
- a separate coder alias uses two slots;
- DSH admits no more than two independent sibling coder units;
- each has a disjoint worktree, editable scope, verifier, and receipt;
- success is time to two independently verified green units.

Before this profile may be accepted, preserve the current 64/64 Windows
headroom, wait for authoritative completed loads, run repeated and alternated trials, compare both
fixed-total-context and 32K-per-slot cells, and record page-pressure telemetry.
Do not combine KV quantization with the slot experiment.

## 10. Web and external specialists

Enabled:

- `mcp__exa__web_search_exa`
- `mcp__exa__web_fetch_exa`
- PowerShell, Git, GitHub, and filesystem tooling
- installed `reddit-search` skill
- optional Codex and Claude DSH subagents

Anonymous Exa has a finite hosted quota. The DeepSeek-keyed bundled web search
and an unrestricted SSRF-unsafe direct fetch are not the Halo web solution.

The Halo Research Gateway remains specified but not deployed. Its staged
architecture remains: safe search, safe fetch, Reddit search, and Reddit thread
first; browser crawling only after a separate Windows reliability and SSRF gate.

## 11. Operator procedure

1. Start LM Studio.
2. Open `C:\Users\scott\Desktop\Halo Cockpit.lnk`.
3. The shortcut runs
   `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`.
4. The launcher supplies the dummy local credential, starts DSH on `:3080` only
   if absent, and opens the cockpit.
5. Use a new Halo Orchestrator task for normal work. Describe one bounded
   software outcome; let the 35B call `subagent_coder`.
6. A PASS may be reviewed with read-only tools. A FAIL ends that unit; start a
   new user-approved unit rather than editing around the verdict.
7. Use raw picker models only when intentionally bypassing orchestration.

Mission Control at `http://127.0.0.1:3090` is observational. "Models generating
now" is an instantaneous sampled inference count, not resident-model count.

## 12. Canonical, live, and recovery paths

### Canonical repository

`C:\Users\scott\Desktop\Code\dsh-halo-research`

Important files:

- `stack\halo-settings.yaml`
- `stack\halo-orchestrator\agent.cordis.yml`
- `stack\halo-verified-coder\`
- `stack\lmstudio-models\halo\`
- `stack\Launch-Halo.ps1`
- `stack\HALO-CURRENT-CONFIGURATION.md`
- `stack\HALO-STACK-GUIDE.md`
- `DSH-Strix-Halo-Report-v3.3.md`

### Live installation

- DSH home: `C:\Users\scott\.dsh`
- Live Halo LM Studio aliases: `C:\Users\scott\.lmstudio\hub\models\halo`
- Gate receipts: `C:\Users\scott\AppData\Local\HaloGate\runs`

### Scott's required readable and recovery copy

- `C:\Users\scott\Desktop\Halo Stack Research`
- Snapshot: `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration`
- Manifest: `Current Halo Configuration\MANIFEST-SHA256.txt`

Every material change updates canonical files, live deployment when applicable,
the current configuration record, the Research-folder copies, snapshot contents,
and manifest in the same task.

## 13. Recovery and rollback

The snapshot is a versioned reference, not an instruction to overwrite blindly.
Before restoration:

1. Capture current live files and user work.
2. Compare hashes and versions.
3. Restore only the intended surfaces.
4. Install the locked DSH profile dependencies if the profile is replaced.
5. Validate DSH route/provider state.
6. Wait for authoritative LM Studio load completion.
7. Run one brain response, one structured coder tool call, the zero-model gate
   suite, and one bounded gated canary.
8. Regenerate and verify the snapshot manifest.

Known pre-change backup:
`C:\Users\scott\.dsh\backups\halo-96gb-20260829-182512`

## 14. Current evidence map

- Current human-readable state:
  `stack\HALO-CURRENT-CONFIGURATION.md`
- 64/64 post-reboot planner and gated-worker proof:
  `stack\HALO-64GB-POST-REBOOT-VALIDATION-2026-08-30.md`
- 96/32 runtime and live gate canary:
  `stack\HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md`
- Autonomous real-repository proof:
  `stack\HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`
- Stronger Hardgate contract and model auditions:
  `stack\HALO-IMPROVEMENT-BASELINE-2026-08-30.md`
- Library cleanup:
  `stack\HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md`
- Parallel measurement and correction:
  `stack\HALO-PARALLEL-SLOT-TEST-2026-08-30.md`
- Outside-review reconciliation and future test contract:
  `stack\HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`
- Quantization and VGM community reconciliation:
  `stack\HALO-STRIX-QUANTIZATION-AND-VGM-COMMUNITY-REVIEW-2026-08-30.md`
- Full revisions 2.0–3.1 research history:
  `DSH-Strix-Halo-Report-v3.0.md`

## 15. Known boundaries and next work

1. The Halo Research Gateway is not deployed.
2. Parallel coder fan-out is proposed, not installed.
3. The 64/64 split is accepted for the retained daily pair. CivicCast Sandbox
   coexistence is not Halo acceptance evidence and belongs to CivicCast.
4. The present gate serializes implementation units and intentionally permits
   only one gate call per parent unit.
5. No multi-hour soak is required for tonight's acceptance; real work is the
   continuing evaluation surface.
6. DSH, LM Studio, model templates, and Windows GPU drivers remain versioned
   dependencies. Re-verify after upgrades rather than carrying performance or
   behavior claims forward silently.
7. Anonymous Exa availability and quota are external dependencies.
8. Full machine access is an intentional operator capability; the protected
   verifier and staging boundary remain necessary because prompt rules alone do
   not enforce correctness or scope.

## 16. Mixed-quant next experiment

The Q4_K_M planner/worker pair remains the known-good daily baseline. The next
quality experiment is a separate Qwen3 Coder 30B-A3B Q6 worker alias with the
same 32K context, one slot, template, KV policy, batches, and six-tool gated
surface. Do not overwrite the daily Q4 worker and do not move both models to
Q6.

Compare one known small gated unit and one medium multi-file unit. Record valid
tool calls, first-pass gate result, retries, verified time-to-green, tokens,
wall time, dedicated/shared GPU memory, and minimum Windows free memory. Promote
Q6 only for a meaningful correctness or reliability improvement without paging
or a material time-to-green regression when quality is equal. If quality is
equal, Q4_K_M remains preferred; Q5_K_M is the intermediate candidate if Q6 is
better but too tight for the 64 GB graphics allocation.

## 17. Primary external sources carried into Revision 3.4

- AMD VGM behavior and system-memory trade-off:
  https://www.amd.com/en/blogs/2025/faqs-amd-variable-graphics-memory-vram-ai-model-sizes-quantization-mcp-more.html
- Strix Halo server concurrency shootout:
  https://github.com/hogeheer499-commits/strix-halo-guide/blob/main/SERVER_SHOOTOUT.md
- Reproducible multi-slot benchmarks and methodology:
  https://github.com/botAGI/strix-halo-multislot
- Unified-memory pressure and mmap pitfalls:
  https://github.com/LucRoot/Strix-Halo-Linux-Llama_cpp-ROCm/blob/main/docs/PITFALLS.md
- DSH parallel tool-call execution:
  https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/feature/2026-07-10-parallel-tool-call-execution.md
- LM Studio issue 1790, one reported Windows allocation failure—not a universal
  confirmed ceiling:
  https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1790

## 18. Revision 3.4 autonomy and observability amendment

The first unassisted prompt-only greenfield trial invalidated the assumption
that the prior guided Hardgate proof described prompt-to-software autonomy. The
trial bypassed the gate, ran on the Q6 experiment route rather than the accepted
Q4_K_M worker, substituted a local Node server after discovering Docker was
absent, and ended when the hidden DSH backend disappeared after an unbounded
recursive PowerShell call. No compaction occurred. The old launcher discarded
the evidence needed to attribute the exit cause.

Revision 3.4 therefore makes these requirements normative:

1. Daily routing is the 35B planner and Q4_K_M worker. Q6 remains a named
   candidate until separately promoted by evidence.
2. The strict Halo Build root may inspect, search, run the read-only
   `halo_preflight`, define acceptance, and call `subagent_coder`. It may not
   directly write/edit/shell or use an ungated implementation child, workflow,
   or Ralph loop.
3. Non-Git greenfield work must use gate-owned acceptance files under
   `.halo-acceptance`. They are created before the implementation worker,
   protected from that worker, verified from an independent baseline, and not
   promoted into the user's project.
4. A false environmental premise is an unmet precondition, not permission to
   silently substitute a different product contract. Docker work requires both
   a present CLI and a reachable daemon.
5. Worker PowerShell policy rejects unbounded recursive enumeration and
   foreground development servers. Long-lived servers use bounded background
   jobs and collected output.
6. DSH must run under the Halo supervisor with preserved stdout, stderr, child
   and supervisor PIDs, health state, exit code, and at most one automatic
   restart. Hidden unsupervised launch is no longer accepted. pnpm dependency
   builds use an explicit package allow-list, never an invisible interactive
   prompt, and DSH receives `--no-open` so the operator launcher owns browser
   behavior.

The zero-model acceptance suite is 13/13. It includes greenfield promotion,
greenfield acceptance-test tampering, planner mutation and bypass denial,
worker shell guards, launcher evidence wiring, existing Git promotion,
protected-test tampering, and fail-closed verifier crash/timeout behavior.
Detailed failure and repair evidence is in
`stack\HALO-AUTONOMY-REPAIR-2026-08-30.md`.
