# Stage 3 design evidence — 2026-08-27

**Recorded:** 2026-08-27 16:17 MDT  
**Scope:** read/inspect plus design-document creation only  
**Implementation status:** not started

## Outcome

The DSH-native fail-closed gate design was completed for joint Scott/Claude review. No live DSH setting, LM Studio setting, model alias, service, installed package, or Halo orchestration configuration was changed. No model was loaded for this work; `lms ps --json` returned `[]` at 16:17 MDT.

Design document SHA-256 in all three copies:

`CFC5F6AE8908B09AE2E3A952CD985D4C96B956B3C77E8CC1C0D587565653BC13`

Copies:

- working composition copy: `C:\Users\scott\Documents\Codex\2026-08-24\rea\HALO-STAGE-3-DSH-NATIVE-GATE-DESIGN-v1.0.md`
- canonical Halo copy: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-STAGE-3-DSH-NATIVE-GATE-DESIGN-v1.0.md`
- Scott's Research copy: `C:\Users\scott\Desktop\Halo Stack Research\HALO-STAGE-3-DSH-NATIVE-GATE-DESIGN-v1.0.md`

## Evidence sources read

- `C:\Users\scott\Desktop\Halo Stack Research\HALO-TUNING-REPORT-2026-08-27.md`
- `C:\Users\scott\Desktop\Halo Stack Research\AUDIT-STAGE-2-VERDICT-2026-08-27.md`
- `C:\Users\scott\Desktop\Halo Stack Research\ANTHROPIC-INCIDENT-REPORT-2026-08-25-blind-gate.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\gateway-conductor\REPORT-GATEWAY.md`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\verify-generic.ps1`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\gateway-conductor\test-harness.ps1`
- `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-orchestrator\agent.cordis.yml`
- installed Proof Gate skill: `C:\Users\scott\.codex\plugins\cache\claude-cowork\anthropic-skills\1.0.0\skills\proof-gate\SKILL.md`

DSH source inspected at:

- root: `C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness`
- revision: `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
- version: `0.1.1-rc.2`
- tool pipeline: `packages\core\tools\src\index.ts`
- turn lifecycle: `packages\core\agent\src\runtime-types.ts`, `packages\core\agent-loop\src\agent.ts`
- generic delegation tool: `packages\subagent\tool-subagent\src\index.ts`
- child policy inheritance: `packages\subagent\subagent\src\child-agent.ts`
- child startup ordering: `packages\subagent\subagent-in-process-driver\src\index.ts`
- goal authority: `packages\goal\tool-goal\src\authority.ts`, `packages\goal\tool-goal\src\index.ts`
- reference guard implementations: `packages\guard\repeat-tool-reminder\src\index.ts`, `packages\guard\timeout-policy\src\index.ts`

## Source-derived findings

1. `tools/post-execute` is a real awaited waterfall and can block/replace the returned result.
2. It cannot contain filesystem effects that a full-access worker already made.
3. `tools.guard()` is monotonic and is suitable for denying `update_goal complete` without PASS.
4. `agent/turn-stopping` can inject a corrective next step but is not semantic proof that ordinary prose is truthful.
5. The current foreground `subagent_coder` waits for a one-shot child and rejects abnormal child stop reasons.
6. The child currently inherits the parent's explicit sandbox override. There is no race-free per-delegation narrower sandbox option.
7. A `subagent/start` observer is too late to establish that boundary: the child prompt is already submitted by the time the provider returns and the lifecycle wrapper emits start.
8. Therefore the design requires a small DSH extension for a narrower per-delegation child sandbox mode and a gate-owned composite tool that controls staging, verification, and promotion.

## Locked carry-forward

The brain-alias reasoning issue is written into the design as a mandatory pre–Stage 5 gate: determine and prove the real DSH path for Q5_K_XL reasoning `off/on`, including whether the historical no-reasoning speed payoff applies. Stage 3 does not change the alias blindly.

## Working-tree note

The canonical research repository already contained many modified and untracked Stage 1/2, documentation, and gateway files. They were preserved. This design pass added only the two new Stage 3 documentation files after the source inspection; no unrelated change was cleaned, reverted, committed, or overwritten.

## Next authorized action

Joint design review by Scott and Claude. Gate code, DSH source changes, profile registration, and live configuration changes remain blocked until that review accepts or amends the design.
