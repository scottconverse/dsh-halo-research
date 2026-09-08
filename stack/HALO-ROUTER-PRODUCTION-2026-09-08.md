# Halo Router 0.3.0 — production deployment and rollback

Later same-day update: the Gateway is now running and its DSH connection has
been re-enabled with nonfatal startup behavior, at Scott's request. See
[the reconnection evidence](HALO-GATEWAY-RECONNECTED-2026-09-08.md). The disabled
Gateway references below describe the earlier promotion. Router rollback retains
the current independent Gateway setting; the original manifest was backed up
before amending that target's expected hash.

Date: 2026-09-08. Scope: Scott's approved items 1 and 2 only: production promotion,
short acceptance, configuration/Git/Research recovery records. No new qualification
campaign, Gateway work, runtime tuning, model installation or architecture work.

## Result and operation

Production DSH is at **http://127.0.0.1:3080**. DEV remains separate at 3085.
Use the existing Halo desktop launcher (`stack/Launch-Halo.ps1`). It refreshes
the full picker and warms the tuned 35B brain and Q4_K_M coder; both were observed
ready at 32K / parallel=1 through the normal launch path. The router itself does
not load/unload models. Both the native picker and Router controls are present.

Defaults: Automatic / Local first, no role overrides. Auto uses existing exact
qualifications; it can select the Q4_K_M coder for a root turn. Manual retains the
native picker. Native picker selection cancels Auto for that conversation.
Searchable planner/worker overrides remain available. The UI showed 2,747 catalog
entries, including local models, Claude Code, Codex and OmniRoute; this is not
2,747 independently tested or authenticated routes.

## What changed

- Frozen production copy at `stack/halo-router-production/release-0.3.0` of
  halo-routing, halo-policy-deterministic and halo-verified-coder-dev. Internal
  DEV package/file names are retained, but production mounts this frozen copy.
- `.dsh/cordis.patch.yml`: routing, deterministic policy and native UI mounted.
- `.dsh/profiles/web/package.json`: UI link dependency; native providers retained.
- `.dsh/.agent-presets/halo-orchestrator/agent.cordis.yml`: frozen verified worker
  with routing enabled; existing protected verifier and run root retained.
- `stack/Run-HaloCockpit.ps1`: sets DSH_HOME explicitly to the production home.
- UI host module resolves dependencies from the real running DSH entry point,
  not from a DEV-parent directory assumption. Regression test failed first and
  passed after correction. This source correction also supports DEV.
- `.dsh/profiles/web/cordis.patch.yml`: disabled the absent required Gateway
  connection. Initial launch failed with ECONNREFUSED on 8765; nothing listening
  there was started. Keeping this dead dependency would prevent DSH startup.

The existing DEV routing ledger was imported once, with its SHA and source saved
in `.dsh/halo-routing/import-provenance.json`. It is historical qualification
evidence, not fresh qualification. No sessions, credentials or other app state
were copied over. Private pre-change files stay outside Git.

## Short live acceptance

All tests used newly created diagnostic sessions, not user conversations. The
existing acceptance driver was mounted temporarily and then removed. Its prompts
and protected fixture are in `halo-router-production/smoke.mjs`. These are scoped
deployment tests, not an unassisted general-software benchmark.

| Check | Evidence | Result |
|---|---|---|
| Normal launch | `.dsh/logs/halo-cockpit-20260908-093943.*.log`; launcher output | Healthy; tuned pair ready; 32 local catalog choices preserved |
| Native UI | Browser at 3080: Router panel and native picker inspected | Auto/Manual, overrides, Claude/Codex/local and cloud catalog present |
| Root Auto | request `69fc30be-cc1d-435e-b681-598bbec1675d` | local Q4_K_M; expected answer; 19.194 seconds |
| Root Manual | request `9e133d23-1109-4149-8f97-4853961bffa0` | Claude Sonnet retained; expected answer; 13.470 seconds |
| Verified worker | request `50bd497e-74d0-4df5-8ee3-58443c352f71` | local Q4_K_M; independent gate PASS; 29.488 seconds |

Full receipts and deterministic test output: `stack/halo-router-production/evidence`.
The complete scoped suite passed **134 routing/policy/profile tests**, **19 gate
integration tests**, and **5 acceptance-protocol checks**. The final `lms-ps.json`
records both tuned models idle at 32K, parallel=1. This is a deployment smoke and
regression result, not a new broad audit or a claim that all models are qualified.
The startup failures at 09:38 remain in the evidence, not hidden. The temporary
acceptance composition is absent from the final configuration. Deployment `check`
validates all five changed file hashes and original backup hashes plus the UI link.

## Paths and recovery

- Canonical Git: `C:\Users\scott\Desktop\Code\dsh-halo-research`
- Production home: `C:\Users\scott\.dsh`
- Private before-images: `C:\Users\scott\.dsh\backups\halo-router-2026-09-08`
- Research recovery: `C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration\halo-router-production-0.3.0`
- User-readable configuration: `C:\Users\scott\Desktop\Halo Stack Research\HALO-CURRENT-CONFIGURATION.md`

For an immediate routing-only fallback, choose **Manual** in the Router panel.
That does not alter other sessions or unload anything.

For file rollback, first stop only the production cockpit and its owned supervisor
(verify `.dsh/logs/halo-cockpit.pid.json` and process command lines). Do not stop all
Node processes; DEV and unrelated applications may be running. Then, from canonical:

```powershell
node stack/halo-router-production/promote.mjs check
node stack/halo-router-production/promote.mjs rollback
.\stack\Launch-Halo.ps1
```

Rollback refuses if any deployed target has changed since promotion: reconcile
that file rather than overwrite later work. It restores the router composition,
package file, verified worker preset and launcher. It intentionally retains the
independent fix disabling the dead Gateway, so the restored cockpit can start.
It leaves inert release/link/evidence/routing state and **all sessions** intact.
Never restore the whole `.dsh` tree. `apply` is deliberately one-shot and will not
overwrite its backup; re-promotion must use the recorded after-files after review.

Backup byte integrity was checked; a destructive full live rollback was not run.
The recovery bundle includes exact after-files and hashes but no credentials.
Canonical after-files are also in `halo-router-production/installed-configuration`.
No machine reboot, Ollama, Sandbox or other-project changes were made.
