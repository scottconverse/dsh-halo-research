# Halo Stack Compaction Handoff — 2026-08-30

## Scope and user intent

Scott wants DeepSeek Harness (DSH) to run local LLMs as a practical software-building stack on this Windows Strix Halo machine. DSH is the control plane, a local planner/reviewer delegates implementation to a local coder, and a mechanical gate—not model self-report—decides whether a unit passed. Keep tests short and practical; real use supplies longer-term evidence. Copy every material configuration/report update to `C:\Users\scott\Desktop\Halo Stack Research`, which is Scott's primary reading location.

Do not launch or manage CivicCast's Windows Sandbox. CivicCast owns that lane. Halo work is DSH and local-model tuning.

## Governing/current records

- Current configuration: `C:\Users\scott\Desktop\Halo Stack Research\HALO-CURRENT-CONFIGURATION.md`
- Operator guide: `C:\Users\scott\Desktop\Halo Stack Research\HALO-STACK-GUIDE.md`
- Governing spec: `C:\Users\scott\Desktop\Halo Stack Research\DSH-Strix-Halo-Report-v3.3.md`
- Post-reboot proof: `C:\Users\scott\Desktop\Halo Stack Research\HALO-64GB-POST-REBOOT-VALIDATION-2026-08-30.md`
- Quant/VGM review: `C:\Users\scott\Desktop\Halo Stack Research\HALO-STRIX-QUANTIZATION-AND-VGM-COMMUNITY-REVIEW-2026-08-30.md`
- Recovery snapshot: `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration`

## Verified machine and runtime state

- AMD memory split is now 64 GB graphics / 64 GB Windows.
- Windows visible RAM was verified at 63.79 GiB after reboot.
- LM Studio API: `http://127.0.0.1:1234`
- DSH: `http://127.0.0.1:3080`
- HALO Mission Control: `http://127.0.0.1:3090`
- Daily planner: `halo-brain-35b`, Qwen3.6 35B-A3B Q4_K_M, 32K, `parallel=1`.
- Daily worker: `halo-coder-q4km`, Qwen3 Coder 30B-A3B Q4_K_M, 32K, `parallel=1`.
- Both use eval batch 2048, physical batch 512, Flash Attention, 32 checkpoints, GPU KV offload, and no speculative/MTP draft.
- Both models co-resided successfully after reboot. Load times were 14.03 s (brain) and 9.71 s (worker).
- Final measured headroom after real DSH tests: 43.90 GiB GPU dedicated, 0.68 GiB GPU shared, 40.56 GiB Windows free, 75.5% commit.

## Verified functional proof

- Real DSH planner turn returned `HALO-64-64-PLANNER-OK`.
- Planner performance: 10,375 input tokens, 14 output tokens, 16.6 s TTFT; LM Studio reported 647.2 prompt t/s and 62.16 decode t/s.
- Real `subagent_coder` gated round trip passed after a first honest fail-closed Git ownership result.
- Passing verdict: `C:\Users\scott\AppData\Local\HaloGate\runs\2026-08-30T20-09-30-812Z-aa79467e\verdict.json`
- Verifier result: `HALO-64-64-WORKER-VERIFY-OK`.
- Worker changed only the editable fixture and did not change the protected verifier.
- Worker decode was about 66–69 t/s; the main worker turn prefilling 4,168 tokens ran at 1047.18 t/s.
- Temporary evidence fixture remains at `C:\Users\scott\Documents\Codex\2026-08-24\rea\halo-post-reboot-smoke-20260830`.

## Repository and recovery state

- Canonical repo: `C:\Users\scott\Desktop\Code\dsh-halo-research`
- HEAD after the 64/64 work: `937960ec`
- Recent scoped local commits:
  - `bcc8cf88` — Halo docs: add Strix quantization and VGM review
  - `7b63487d` — Halo: validate and record 64/64 daily stack
  - `937960ec` — Halo spec: govern the verified 64/64 configuration
- Working tree was clean after those commits. They were not pushed.
- Recovery manifest had 98 entries and zero failures.
- Manifest SHA-256: `ECB30A98293B331916756D2983208508C468AB1BCACF011A58AFBA244D324362`.

## Current open defect: Mission Control memory graph

Scott reported that `http://localhost:3090/#memory` displays:

- `Memory Graph — not configured`
- `No graph is shown because the backing memory file is not available.`

The page says the expected file is `C:\Users\scott\.dsh\memory\memory.json`, claims sessions can populate it with `remember this:`, and claims an hourly scheduled task named `HALO Memory Snapshot` snapshots it. At the same time, the global health banner shows MEMORY green and says all six signals are nominal.

This has not yet been diagnosed or changed. Treat it as two possible defects until verified:

1. The DSH persistent-memory feature/file/plugin or scheduled snapshot task is absent or not wired into the active preset.
2. Mission Control health semantics are dishonest: an unavailable/unconfigured backing store must not be displayed as nominal green.

Do not create a dummy `memory.json` merely to make the dashboard green. First perform a read-only audit of:

- existence and contents of `C:\Users\scott\.dsh\memory\memory.json`;
- active DSH preset/plugin/tool configuration for persistent memory;
- installed DSH packages/plugins that provide memory support;
- Windows Scheduled Task `HALO Memory Snapshot`;
- Mission Control memory endpoint and health-signal implementation;
- whether the feature is intended, obsolete, or only partially configured.

If Scott authorizes a fix, make the feature real and test an actual write/read/render path, or label it disabled/unconfigured and make the health signal yellow/disabled. Synchronize live, canonical, Research, recovery, manifest, and a scoped commit.

## Next tuning work after the dashboard issue

The known-good daily pair remains Q4_K_M/Q4_K_M. The next model experiment is a separate Q6 worker candidate, preserving the daily Q4 alias and using the same 32K context, `parallel=1`, template, load envelope, and tool surface. Compare one known small gated unit and one medium multi-file unit. Promote only for meaningful quality/tool reliability improvement without paging or a material time-to-green regression. If equal, Q4 wins; consider Q5_K_M only if Q6 is better but too memory-tight.

Do not start that experiment merely because this handoff exists; obtain Scott's go after the Mission Control issue is resolved or explicitly deferred.

## Preserved unrelated state

Hardgate remains at `C:\Users\scott\Desktop\Code\hardgate`, HEAD `ba39b23`. Preserve these untracked files:

- `templates/read-nag-hook/README.md`
- `templates/read-nag-hook/read-nag-hook.py`
- `tests/read_nag_hook_test.py`

## Restart procedure for the compacted session

1. Read this file completely.
2. Read `HALO-CURRENT-CONFIGURATION.md` and `DSH-Strix-Halo-Report-v3.3.md` from the Research folder.
3. Check the live machine before relying on any drift-prone state (`lms ps --json`, services, repo status).
4. Resume with the Mission Control memory-graph audit only if Scott asks to fix or diagnose it.
5. Keep evidence and inference separate; runtime evidence wins over config labels.
