# Current Halo configuration recovery snapshot

Updated: 2026-08-30 after Revision 3.2 and parallel-review reconciliation

Start with `HALO-CURRENT-CONFIGURATION.md`. It explains the installed system,
the model lifecycle, tools, permissions, web access, operating procedure,
validation evidence, limitations, and every live/canonical path.

This directory is Scott's readable and recoverable copy of the current Halo
configuration. The executable canonical files remain under:

`C:\Users\scott\Desktop\Code\dsh-halo-research\stack`

## Directory contents

- `dsh\settings.yaml`: curated local model catalog, four Halo aliases, default
  35B-A3B route, local dummy-credential binding, full-access default, and
  removal of DeepSeek API-only catalog entries.
- `dsh\profile-web`: DSH web-profile package/lock and the active host-plane
  configuration for Codex, Claude, and anonymous Exa MCP.
- `dsh\halo-orchestrator`: the installed Halo preset and complete agent-plane
  composition, including the foreground tuned Coder lane.
- `lm-studio\settings.json`: current LM Studio JIT, replacement, TTL, and
  default-context settings.
- `lm-studio\models\halo`: the Halo-owned definitions for the dual-resident
  35B/Q4_K_M daily pair and preserved 27B/Q4_K_S fallbacks. Retired GPT-OSS
  aliases are evidence only under `evidence\model-library-cleanup-20260830`.
- `operations`: launcher and verification/gate scripts.
- `mission-control`: current monitoring service and page.
- `skills\reddit-search`: the DSH-visible Reddit research skill.
- `legacy-gate-worker`: historical dedicated worker DSH_HOME configuration.
  It is retained for recovery/history; current `subagent_coder` does not use
  it and it is not evidence of Code Mode.
- `STAGE-1-RUNTIME-EVIDENCE-2026-08-27.md`: the fresh DSH-native 27B -> Coder
  -> 27B load receipt proving one 32K slot on both routes.
- `STAGE-2-RUNTIME-EVIDENCE-2026-08-27.md`: the fresh DSH-native receipt
  proving the tuned 27B's real provider-default reasoning path is on, ungraded,
  and free of conversion warnings.
- `HALO-96GB-RUNTIME-EVIDENCE-2026-08-29.md`: current dual-residency,
  GPT-OSS load, local-provider, and live verified-worker evidence.
- `HALO-SIMPLIFIED-CODER-EVIDENCE-2026-08-30.md`: real-repository autonomous
  35B-to-30B run, one-call/tool-boundary proof, gate receipt, independent
  17/17 and 133/133 verification, and the documented verifier-contract
  limitation found in the promoted README.
- `HALO-IMPROVEMENT-BASELINE-2026-08-30.md`: strengthened Hardgate contract,
  18/18 and 134/134 verification, candidate-audition failures, recovery
  evidence, and the accepted daily-pair decision.
- `HALO-PARALLEL-SLOT-TEST-2026-08-30.md`: one-, two-, and four-slot runtime
  probe, accuracy and throughput measurements, the four-slot validity
  correction, restored one-slot state, and the resulting memory-split follow-up.
- `HALO-PARALLEL-REVIEW-RECONCILIATION-2026-08-30.md`: outside-review
  reconciliation, checked public sources, corrected claims, and the bounded
  optional two-worker test contract.
- `DSH-Strix-Halo-Report-v3.2.md`: governing current-build specification,
  linked to the preserved full revision history in v3.0.
- `HALO-MODEL-LIBRARY-CLEANUP-2026-08-30.md`: approved permanent removal of
  fourteen model directories, the seven-model retained library, reclaimed
  space, retired aliases, picker synchronization, and post-cleanup smokes.

`MANIFEST-SHA256.txt` records every other file in this snapshot. Restore must
not be performed blindly: compare paths and versions, preserve user work,
install the locked DSH profile dependencies, and validate in a disposable
session before replacing live configuration.

## Maintenance rule

Whenever a material Halo configuration changes, update all three surfaces in
the same task:

1. Live configuration under `C:\Users\scott\.dsh` or LM Studio.
2. Canonical reproducible configuration under the stack repository.
3. This Research-folder document and recovery snapshot.
