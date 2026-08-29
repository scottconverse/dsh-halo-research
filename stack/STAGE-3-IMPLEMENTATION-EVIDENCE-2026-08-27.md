# Halo Stage 3 Implementation Evidence — 2026-08-27

SCOPE: Halo stack configuration tasks only.

## Outcome

The Halo-owned `subagent_coder` replacement is installed in the canonical and
live `halo-orchestrator` preset. The plugin is
`stack\halo-verified-coder\index.mjs`; its separately testable engine is
`gate-core.mjs`. DSH core and the published pnpm packages were not patched.

## Observed evidence

- `node --check` accepted both plugin modules.
- The combined gate-core and DSH-wrapper Node suite passed 8/8.
- The honest fake worker changed an editable file, passed the independent
  verifier, promoted the file, reran the verifier live, and returned `PASS`.
- A fake worker changed the implementation and rewrote its protected test;
  the gate returned `FAILED` and the live implementation remained unchanged.
- A nonexistent verifier executable returned `FAILED`, never `PASS`.
- The process runner's forced timeout was detected fail-closed.
- A wrapper-level test exercised `ctx.agents.create`, recorded the synthetic
  parent's staging cwd and `workspace-write` sandbox event, proved that exact
  parent was passed to `ctx.subagents.start`, promoted only after verification,
  and confirmed a PASS permits goal completion.
- Stdout and stderr were captured independently, covering the prior mixed
  PowerShell-stream failure class.
- The first real `session.create` caught an invalid output schema and refused
  the preset. After correction and a cache-busted module URL, a fresh call to
  `POST /api/session.create` returned `ok: true` with
  `agentPreset: halo-orchestrator`. This proves the live DSH loader imported
  the file URL, injected the required services, and registered the replacement
  tool without a name collision.
- DSH remained HTTP 200 throughout. No LM Studio model was loaded.

## Honest boundary

The upstream source checkout has no `node_modules`, and its configured `pnpm`
shim attempted npm access before Vitest could start. Therefore the source-level
synthetic-parent spike is not counted as executed evidence. The live Coder
canary is also not yet run because TownLight explicitly reported `HALO-BUSY`.
It must wait for `HALO-CLEAR`; this is resource coordination, not a claimed
pass.

## Rollback

The exact pre-Stage-3 live and canonical preset files are in:

`C:\Users\scott\.dsh\backups\halo-stage3-20260827-180852`

Restoring `agent.cordis.yml` from that directory re-enables the previous
generic `@deepseek-ai/dsh-tool-subagent` Coder route. The plugin is loaded by
an absolute file URL and added no package-manager dependency or DSH fork.

## Remaining locked item

Before Stage 5, investigate and preserve the high-payoff no-reasoning fast
path: the raw 27B alias exposes `off/on`, while the tuned alias currently
exposes only `on`. Do not change it blindly and do not let this item disappear.
