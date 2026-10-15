> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Reboot state — 2026-08-27 ~19:00 MDT

Written immediately before a planned reboot, so the next session does not have
to reconstruct this.

## Safe to reboot

- No model resident (`lms ps --json` -> `[]`). Nothing to lose.
- DSH :3080 = 200, LM Studio :1234 = 200, Mission Control :3090 = 200.
- No background job of mine is running.
- Codex is **blocked waiting on TownLight `HALO-CLEAR`**, not mid-write. Its
  live Coder canary has not run.

## What changed on this box today, and where the undo lives

| Change | Rollback |
|:--|:--|
| Stage 1+2: tuned model aliases + honest reasoning route | `C:\Users\scott\.dsh\backups\halo-stage2-20260827-144812` (includes the LM Studio alias tree) |
| Stage 3: Halo-owned `subagent_coder` gate plugin | `C:\Users\scott\.dsh\backups\halo-stage3-20260827-180852` — restore `agent.cordis.yml` to get the old generic Coder back |
| Claude's citation gate (Stop hook) | delete the first entry in `hooks.Stop[0].hooks` in `C:\Users\scott\.claude\settings.json` |

## Pre-reboot checks I ran

Live preset now loads a new plugin by absolute file URL
(`file:///C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-verified-coder/index.mjs?v=2`).
A reboot means DSH cold-imports it, so I checked the references resolve:

- both `index.mjs` and `gate-core.mjs` pass `node --check`;
- the `?v=2` URL resolves to a real file on disk;
- live `agent.cordis.yml` is byte-identical to the canonical copy;
- the Stage 3 rollback copy contains **zero** references to the new plugin,
  i.e. it is a genuine pre-change backup, not a copy of the new file.

**What I did NOT check:** that DSH actually loads and registers the plugin from
a cold start. `node --check` proves syntax only. Codex's evidence records a
successful live `session.create` — but on the already-running process, not a
cold import.

## If the cockpit does not come up after reboot

Restore one file and restart:

```
Copy-Item 'C:\Users\scott\.dsh\backups\halo-stage3-20260827-180852\agent.cordis.yml' `
          'C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\agent.cordis.yml' -Force
```

Then relaunch from the `Halo Cockpit` desktop shortcut. That reverts to the
previous generic Coder route and touches nothing else.

## Claude's citation gate — survives reboot

Lives in `~/.claude/settings.json` + `~/.claude/hooks/`, both on disk. The
regression battery moved out of session temp (which the reboot would have
erased) to `C:\Users\scott\.claude\hooks\audit-citation-gate.tests.ps1` and
re-ran 15/15 from its new home.

## Verification ledger

VERIFIED: the live preset loads the plugin by absolute file URL | C:\Users\scott\.dsh\.agent-presets\halo-orchestrator\agent.cordis.yml:233
VERIFIED: the citation gate is registered first among Stop hooks | C:\Users\scott\.claude\settings.json:12
VERIFIED: the Stage 3 rollback copy predates the plugin | C:\Users\scott\.dsh\backups\halo-stage3-20260827-180852\agent.cordis.yml:1
UNVERIFIED: that DSH loads and registers the new plugin from a cold start - node --check proves syntax only; not tested across a restart
UNVERIFIED: Codex's Stage 3 implementation claims - not audited; Scott assigned Stage 3 to Codex independently
