# Halo stack takeover handoff — 2026-08-30

**Purpose:** transfer the Halo local-coding-stack work to a fresh AI, DSH
session, or human without relying on the conversation that created it.

## Read this first: evidence correction

Several prior runs were called “autonomous” even though Codex designed their
prompts, roles, tool restrictions, acceptance criteria, retry policy, and in
some cases intervened while they ran. They are useful evidence for a **guided
Halo workflow**. They do not prove what DSH or the local models can accomplish
from a plain user prompt on their own. Do not repeat the autonomy claim.

The first preserved direct-user-prompt trial is not a raw-model test either:
it inherited the installed Halo Orchestrator system prompt, and its root model
was the Q6 coder rather than the documented 35B planner. It is nevertheless
the best boundary evidence collected so far and is preserved in Git.

## 1. Scott's goal and operating rules

Scott wants DeepSeek Harness running locally on this Windows Strix Halo box so
local LLMs do most of the work needed to build and ship real software. The
desired experience is simple: open the cockpit, describe the software in
ordinary language, and receive working, independently verified changes with
minimal steering.

- DSH is the control plane; LM Studio serves the local models.
- Local models do the bulk of coding. Codex and Claude are optional specialists.
- The root may have Scott's broad Windows-user access. The gated worker is
  intentionally narrower while working in isolated staging.
- Verification is mechanical and fail closed. A model saying “done” is not
  evidence.
- Preserve raw logs, exact configuration, commands, hashes, and failures.
- Never guide a run and later describe it as autonomous.
- `C:\Users\scott\Desktop\Halo Stack Research` is Scott's primary reading
  location and must mirror material documentation/configuration changes.
- CivicCast owns Windows Sandbox activity. Halo does not need or own a Sandbox.
- Prefer short honest smokes and real use; no new multi-hour tuning campaign.

## 2. Evidence ledger

**Directly measured and still usable:** exact model files and aliases; context,
slot, memory, throughput, and runtime-log observations; file hashes; gate unit
tests; independently reproduced repository tests; Git identities; and the
prompt-only session's exact event stream and generated files.

**Guided-pipeline evidence only:** the Hardgate, canary, staged-TDD, and earlier
planner/worker trials show that a carefully designed 35B-planner / 30B-worker /
mechanical-gate workflow can produce bounded verified changes. They do not show
that an unassisted DSH session will invent that workflow or finish an arbitrary
application from a plain prompt.

**Withdrawn/reclassified:** “no Codex steering” and “complete autonomous path.”
The first to-do trial was also invalid as a capability benchmark because Codex
added hidden `AGENTS.md` constraints, protected tests, a fixed port, Docker
gating, mandatory delegation, and active intervention.

**First replacement prompt-only trial:** only Scott's plain to-do prompt was
the user message, but the standing Halo preset still shaped the model. The run
showed initiative but was incomplete and materially defective. Preserve it as
a failed baseline; do not repair it and retroactively score it green.

## 3. Current captured state

This is a handoff snapshot, not a promise that services remain unchanged.

| Item | Observed state |
|:--|:--|
| Canonical repository | `C:\Users\scott\Desktop\Code\dsh-halo-research` |
| Git HEAD before this handoff commit | `bf231004` |
| DSH | `@deepseek-ai/dsh@0.1.1-rc.2`; `:3080` refused connections when captured |
| Mission Control | `http://127.0.0.1:3090`; HTTP 200 |
| LM Studio API | `http://127.0.0.1:1234`; HTTP 200 |
| Memory split | 64 GB graphics / 64 GB Windows |
| Loaded brain | `halo-brain-35b`, Qwen3.6 35B-A3B Q4_K_M, 32K, slot 1, idle |
| Loaded candidate | `halo-coder-q6k`, Qwen3 Coder 30B-A3B Q6_K, 32K, slot 1, idle |
| Accepted baseline | 35B planner plus Q4_K_M worker |
| Unfinished audition | live default had been Q6; Halo preset worker now points to Q6 |
| Persistent memory | configured; live file exists; scheduled task needs reverification |
| Mission Control deployment | canonical is newer than live; deploy/restart/UI audit pending |

The live/default mismatch is unfinished experiment state, not a new accepted
configuration. Do not call Q6 the winner until it has an honest, predeclared
comparison against Q4_K_M.

## 4. Work now preserved in local Git

- `73176b55 Halo runtime: preserve Q6 audition and persistent memory`
  - Q6 candidate settings and LM Studio alias;
  - Q6 worker selection in the preset;
  - persistent-memory MCP and persona instructions;
  - `Snapshot-HaloMemory.ps1`.
- `776fe4fe Halo Mission Control: reconcile data sources and responsive UI`
  - data-source reconciliation, reasoning parsing, and responsive UI work.
- `bf231004 Halo evidence: preserve prompt-only Q6 to-do trial`
  - exact compressed session, mechanical decode, live config snapshots,
    generated app source, and honest analysis.

Inspect `git log --oneline -10` and `git status --short` before changing more.

## 5. Installed architecture and paths

### DSH and launcher

- cockpit: `http://127.0.0.1:3080`
- launcher: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1`
- shortcut: `C:\Users\scott\Desktop\Halo Cockpit.lnk`
- canonical settings: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-settings.yaml`
- live DSH home: `C:\Users\scott\.dsh`
- accepted planner: `halo/qwen3.6-35b-a3b`, Q4_K_M, 32K, `parallel=1`
- accepted worker: `halo/qwen3-coder-30b-a3b-q4km`, Q4_K_M, 32K, `parallel=1`
- audition worker: `halo/qwen3-coder-30b-a3b-q6k`, Q6_K, 32K, `parallel=1`
- fallbacks: dense Qwen3.8 27B Q5_K_XL and Coder Q4_K_S

The two-slot test did not justify replacing daily `parallel=1`; it also did not
prove every parallel design is bad. The four-slot cell was invalid. See
`HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`.

### Mechanical gate

- plugin: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-verified-coder\index.mjs`
- engine: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-verified-coder\gate-core.mjs`
- receipts: `C:\Users\scott\AppData\Local\HaloGate\runs`

Tested mechanisms include isolated staging, protected/out-of-scope rejection,
independent baseline, bounded repair, compare-and-swap promotion,
post-promotion verification, rollback, crash/timeout failure, and a lock
against completion or mutation around a verdict. The gate proves only what its
verifier tests. A green receipt is not broader product proof.

### Search, research, and memory

- Anonymous Exa search/fetch is configured but rate limited.
- Reddit skill: `C:\Users\scott\.agents\skills\reddit-search`
- Crawl4AI skill: `C:\Users\scott\.codex\skills\crawl4ai-research`
- Gateway spec: `C:\Users\scott\Desktop\Halo Stack Research\HALO-RESEARCH-GATEWAY-SPEC-v1.3.md`
- partial gateway repo: `C:\Users\scott\Desktop\Code\halo-research-gateway`
- live memory: `C:\Users\scott\.dsh\memory\memory.json`
- snapshot script: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Snapshot-HaloMemory.ps1`
- memory command: `mcp-server-memory`
- observed probe: `HALO-MEMORY-PROBE-20260830 = cobalt-kestrel`
- scheduled task name was `HALO Memory Snapshot`, but its current state was not
  conclusively proved during handoff; reverify it.

### Mission Control

- canonical: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\mission-control.mjs`
- live: `C:\Users\scott\.dsh\mission-control\mission-control.mjs`

Canonical passed `node --check` and contains final data-source/UI fixes, but it
was newer than the running file. Back up live, deploy deliberately, restart
only Mission Control, and walk every tab/source. Do not claim it already ran.

## 6. Models and Q6 file identity

Model root: `C:\Users\scott\.lmstudio\models`

- source: `C:\Users\scott\.lmstudio\models\lmstudio-community\Qwen3-Coder-30B-A3B-Instruct-GGUF\Qwen3-Coder-30B-A3B-Instruct-Q6_K.gguf`
- Halo link: `C:\Users\scott\.lmstudio\models\halo\qwen3-coder-30b-a3b-q6k-weights\Qwen3-Coder-30B-A3B-Instruct-Q6_K.gguf`
- size: 25,104,724,288 bytes
- alias: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\lmstudio-models\halo\qwen3-coder-30b-a3b-q6k\model.yaml`

The two Q6 paths are hard links to the same bytes, not two physical copies.
The uncensored Qwen's 0.9 GB vision projector was preserved. Enumerate actual
files and hard-link identities before citing counts or deleting anything.

Known failures: GPT-OSS 120B did not reach usable Windows Vulkan inference,
including at 96/32; GPT-OSS 20B failed to start stably; Qwen3-Coder-Next 80B
wedged LM Studio before inference. Their GGUFs were removed in the approved
cleanup. Reintroducing them is a new experiment and requires a download.

## 7. Prompt-only to-do trial

- session: `session-4dd98f2e-106d-4f4c-9721-d6b4e5b1493d`
- original log: `C:\Users\scott\.dsh\sessions\--C-Users-scott-Documents-HaloTodoPromptOnly--\session-4dd98f2e-106d-4f4c-9721-d6b4e5b1493d\session.jsonl.zstd`
- workspace: `C:\Users\scott\Documents\HaloTodoPromptOnly`
- Git evidence: `C:\Users\scott\Desktop\Code\dsh-halo-research\evidence\prompt-only-todo-20260830`
- compressed SHA-256: `8792A2F9820990A222B5BBD58D6AC52EF2725FFDBB37F0162B903C085C45AF51`
- decoded SHA-256: `B59446D87E824F9966D21918EDE1C314FB51CC085637218003E202A16DED15B7`

The request proves the root was Q6 coder, not 35B. The standing prompt ordered
one delegation, but it implemented directly. Calls: 11 writes, 9 PowerShell,
no read, no subagent. There is no `turn/end`; the last frame is a recursive
listing call without a result.

It chose Node/Express, created source/Docker/Compose/README, installed 100 npm
packages with 0 reported vulnerabilities, passed its structural self-test,
and tried a local server after Docker was absent. It still failed because:

1. persistence is an in-memory array; the Docker volume is unused;
2. README persistence claims are false;
3. Docker deployment was not proven because Docker/Compose were absent;
4. port 3000 was hardcoded without the required availability check;
5. `DELETE /api/todos/:id` shadows `DELETE /api/todos/completed`;
6. `node:18-alpine` likely lacks `curl`, but HEALTHCHECK invokes it;
7. tests check files/strings, not CRUD, persistence, restart, Docker, health, or port;
8. the server call hit DSH's 120-second tool timeout;
9. the run ended without a final answer or completion proof.

## 8. Failures to avoid

- **Evaluation contamination:** predeclare prompt, model, system-prompt/preset
  hash, tools, context, thinking, time, allowed intervention, and pass bar.
  Preserve the whole transcript. A cancellation, retry brief, new test, or edit
  makes the cell guided or invalid.
- **Configuration is not runtime proof:** four slots were live despite one-slot
  history; “medium” reasoning silently became boolean. Prefer runtime logs and
  request records to YAML labels.
- **Weak verifier:** Hardgate's first string check accepted a broken schema.
  Test behavior/structure and protect the verifier/baseline.
- **Advisory gate:** post-worker advice cannot prevent a bad promotion. Keep
  isolated staging and mechanical completion/mutation locks; do not resurrect
  the old PowerShell conductor.
- **Context mismatch:** every alias/profile must declare the context actually
  loaded. An old mismatch silently defeated compaction.
- **Throughput overclaim:** compare time to independently verified green, not
  only decode t/s. MoE speed, verbosity, and test quality all matter.
- **Memory overclaim:** current 64/64 supports the daily pair and CivicCast's
  one 16 GB Sandbox. The 96/32 trial left low Windows headroom and did not make
  120B usable. VGM capability alone is not a reason to switch.
- **Dashboard overclaim:** Mission Control previously showed stale catalog and
  missing memory data. Check each direct source, age, and provenance.

## 9. Canonical reading order

1. This handoff: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-TAKEOVER-HANDOFF-2026-08-30.md`
2. Current record: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-CURRENT-CONFIGURATION.md`
3. Guide: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-STACK-GUIDE.md`
4. Current spec: `C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report-v3.3.md`
5. Earlier spec history: `C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report-v3.0.md`
6. Independent audit: `C:\Users\scott\Desktop\Halo Stack Research\AUDIT-PROJECT-STATE-REVIEW-2026-08-30.md`
7. Post-reboot proof: `stack\HALO-64GB-POST-REBOOT-VALIDATION-2026-08-30.md`
8. Improvement record: `stack\HALO-IMPROVEMENT-BASELINE-2026-08-30.md`
9. Guided coder record: `stack\HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`
10. Parallel record and correction: `stack\HALO-PARALLEL-SLOT-TEST-2026-08-30.md` and `stack\HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`
11. Mission Control audit: `stack\HALO-MISSION-CONTROL-AUDIT-2026-08-30.md`
12. Quant/VGM review: `stack\HALO-STRIX-QUANTIZATION-AND-VGM-COMMUNITY-REVIEW-2026-08-30.md`

Primary history: `C:\Users\scott\Desktop\Halo Stack Research`

Old archive: `C:\Users\scott\Desktop\Halo Old Archive`

Recovery: `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration`

## 10. Related repositories and no-touch boundaries

- upstream DSH: `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness`
- Hardgate: `C:\Users\scott\Desktop\Code\hardgate`; observed HEAD
  `ba39b238...` with untracked `templates\read-nag-hook\...` and
  `tests\read_nag_hook_test.py`; preserve as user work.
- DevHarmonics: `C:\Users\scott\Desktop\Code\devharmonics`, remote
  `https://github.com/scottconverse/DevHarmonics`; dirty user work, no-touch.
- gateway prototype: `C:\Users\scott\Desktop\Code\halo-research-gateway`.
- CivicCast/TownLight is separate. Do not touch its Sandbox/processes.

## 11. External sources

- `https://github.com/deepseek-ai/deepseek-harness`
- `https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/feature/2026-07-10-parallel-tool-call-execution.md`
- `https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/1790`
- `https://www.amd.com/en/blogs/2025/faqs-amd-variable-graphics-memory-vram-ai-model-sizes-quantization-mcp-more.html`
- `https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/quantize.cpp`
- `https://huggingface.co/tensorblock/Qwen_Qwen3-Coder-30B-A3B-Instruct-GGUF`
- `https://huggingface.co/bartowski/Qwen_Qwen3.6-35B-A3B-GGUF`
- `https://huggingface.co/AesSedai/Qwen3.6-35B-A3B-GGUF/blob/main/README.md`
- `https://github.com/hogeheer499-commits/strix-halo-guide/blob/main/BENCHMARKS.md`
- `https://github.com/hogeheer499-commits/strix-halo-guide/blob/main/SERVER_SHOOTOUT.md`
- `https://github.com/botAGI/strix-halo-multislot`
- `https://github.com/LucRoot/Strix-Halo-Linux-Llama_cpp-ROCm/blob/main/docs/PITFALLS.md`
- `https://www.soothill.io/blog/2026/08/14/coding-model-benchmark-strix-halo/`
- `https://github.com/Nathanw1014/strix-halo-llamacpp`
- `https://github.com/fewtarius/CachyLlama/blob/master/STRIX_HALO_NOTES.md`
- `https://github.com/apellegr/Strix-Halo-Models/blob/main/README.md`
- `https://www.reddit.com/r/LocalLLM/comments/1uydqr8/i_made_claude_code_test_every_single_variant_of/`
- `https://www.reddit.com/r/StrixHalo/comments/1vn9kn4/i_benchmarked_nine_models_on_one_llamacpp_build/`
- `https://www.reddit.com/r/LocalLLaMA/comments/1m6b151/updated_strix_halo_ryzen_ai_max_395_llm_benchmark/`
- `https://www.youtube.com/watch?v=wCBLMXgk3No`
- Exa endpoint: `https://mcp.exa.ai/mcp`

External sources are context, not on-box proof. Verify primary claims against
this machine before changing the stack.

## 12. Recommended takeover sequence

1. Freeze and inventory Git, live DSH, loaded models, endpoints, hashes, disk.
2. Recompute recovery and prompt-only hashes; do not fix drift before recording it.
3. Unless Scott selects Q6, restore documented 35B root + Q4_K_M gated worker,
   leaving Q6 installed as a candidate. Prove with request and runtime logs.
4. Back up/deploy/restart/audit Mission Control deliberately.
5. Prove memory write/read/snapshot/task/graph end to end.
6. Define honest evaluation cells: raw model, stock DSH, installed Halo with no
   intervention, and actively guided Halo. Never merge their conclusions.
7. Compare Q4_K_M and Q6_K on identical predeclared work using time to
   independently verified correctness, tool reliability, memory, and output.
8. Use useful medium multi-file work; the stack has mostly proved bounded work.
9. Revise the spec only after evidence, separating baseline, candidates,
   history, and proposals.
10. Commit scoped changes and sync Research/recovery/manifest every time.

## 13. Completion criteria

The next owner should produce: exact clean Git identity; direct DSH/LM Studio/
Mission Control health; accepted 32K runtime-matched model pair; memory
write/read/snapshot proof; honest Mission Control sources; one fresh unsteered
predeclared real-work trial preserved in full; independent product verification;
an honest model-vs-harness-vs-environment-vs-verifier verdict; and synchronized
canonical docs, Research copy, recovery snapshot, and SHA-256 manifest.

If evidence is insufficient, say “unknown” or “failed.” That is better than
another confident configuration built on guided results described as autonomy.
