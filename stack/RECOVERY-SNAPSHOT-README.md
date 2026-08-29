# Current Halo configuration recovery snapshot

Updated: 2026-08-27 15:00 MDT

Start with `HALO-CURRENT-CONFIGURATION.md`. It explains the installed system,
the model lifecycle, tools, permissions, web access, operating procedure,
validation evidence, limitations, and every live/canonical path.

This directory is Scott's readable and recoverable copy of the current Halo
configuration. The executable canonical files remain under:

`C:\Users\scott\Desktop\Code\dsh-halo-research\stack`

## Directory contents

- `dsh\settings.yaml`: full local model catalog, tuned Halo aliases, default
  27B route, provider-owned boolean reasoning default, full-access default, and removal
  of DeepSeek API-only catalog entries.
- `dsh\profile-web`: DSH web-profile package/lock and the active host-plane
  configuration for Codex, Claude, and anonymous Exa MCP.
- `dsh\halo-orchestrator`: the installed Halo preset and complete agent-plane
  composition, including the foreground tuned Coder lane.
- `lm-studio\settings.json`: current LM Studio JIT, replacement, TTL, and
  default-context settings.
- `lm-studio\models\halo`: the Halo-owned model definitions that bind each
  normal DSH route to its tuned load envelope.
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
