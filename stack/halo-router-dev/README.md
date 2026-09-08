# Halo Router DEV — 0.2.0

Status: development-only shadow implementation, September 7, 2026 (America/Denver).
It records what DSH ran and what a deterministic policy recommends. It never changes a model selection. Production is not promoted or reconfigured.

0.2.0 directly imports the pinned DevHarmonics selector and reuses its original
qualification fixtures/checkers. Codex Factory's original selector and tests are
retained for lineage and differential checks. This replaces 0.1.0's simplified
policy: a recommendation now needs exact current role qualification, and coding
also needs the donor benchmark PASS. No qualification means no recommendation,
not a blocked DSH turn. [Full implementation and test record](../HALO-ROUTER-DIRECT-REUSE-2026-09-07.md).

## Open and use

Open **http://127.0.0.1:3085** and choose the **Halo Router DEV** preset. The existing opening/session model picker remains intact. The default is the existing `lmstudio / halo/qwen3.6-35b-a3b` planner. Choosing a model changes DEV's selection through ordinary DSH, not through the router. No model is preloaded by this launcher; existing LM Studio behavior handles inference.

Use a development repository or worktree for your real task. DEV is **not a filesystem sandbox**: models retain the normal full-access capability. Its DSH sessions, gate runs, memory, and native-adapter conversation state have separate DEV paths. Native Claude/Codex still use the signed-in user's account stores. LM Studio and OmniRoute are shared existing providers, not copied runtimes.

The six older sessions named `HALO ROUTER DEV — ... integration check` are deliberately tiny transport tests. They are not autonomous coding tests or qualification evidence. New `halo-acceptance-*` sessions run the documented donor qualification fixtures; their host-verified records are explicitly separate.

## Start and stop

In PowerShell:

```powershell
Set-Location 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\halo-router-dev'
.\Start-RouterDev.ps1
```

The launcher uses the pinned local DSH package and checks the reserved port. It does not replace production packages.

It also runs a read-only module-identity preflight. A copied profile can contain
its own `@deepseek-ai/dsh-tools` package while the agent loop comes from the
pinned DEV installation. DSH's private scheduler key is a module-local Symbol,
so those two physical module instances cannot execute tools together. The
launcher fails with an actionable error if this split returns; it never repairs
the profile silently. Inspect or repair the DEV-only link explicitly:

```powershell
node .\repair-profile-module-identity.mjs --check
node .\repair-profile-module-identity.mjs --repair
```

Repair validates the package name and exact version, moves only the conflicting
DEV profile package to
`home\profiles\web\node_modules\@deepseek-ai\dsh-tools.halo-dev-original`, and
creates a junction to the exact tools package resolved by the installed agent
loop. It checks Symbol identity again in a fresh Node process. It reports other
profile-local packages containing module-local Symbols but does not alter them.
Rollback is explicit and equally scoped:

```powershell
node .\repair-profile-module-identity.mjs --restore
```

Stop DEV before repair or restore; an already-running Node process retains its
loaded module instances. Restart after repair. Restoring the original broken
topology intentionally makes the launcher check fail until repaired again.

Close an active DEV turn normally before stopping:

```powershell
.\Stop-RouterDev.ps1
```

Stop verifies the recorded process path, creation time, profile and port before terminating only DEV. It does not stop LM Studio, production DSH, Ollama, or other projects. There is no automatic reboot/startup registration.

## Read recommendations

```powershell
node .\read-records.mjs 3
```

This prints the last three dispatches, measurements and complete referenced policy evaluations. Machine-readable files:

- `home\halo-routing\records.json`: readable export, updated within about five seconds after queued work finishes.
- `home\halo-routing\candidate-reconciliation.json`: all discoverable provider/model routes, native provider capabilities, unavailable metadata and catalog-only classifications.
- `home\halo-routing\status.json`: freshness, queue drops, observer/policy/storage errors and listener time.
- `home\storages\halo_routing.json`: authoritative DSH JSON storage unit. Do not manually edit while DEV runs.

Recommendations use an `evaluationId` to share identical large candidate evaluations. The reader resolves these references; raw JSON consumers must do likewise. Old prototype records remain preserved. A missing observation/measurement is not a success; check status counters. Ledger schemas carry version 1; execution profiles carry version 2 and invalidate ambiguous v1 qualification fingerprints. This is a small append-only experiment, not a long-running retention product.

## Roll back only the router

```powershell
.\Stop-RouterDev.ps1
node .\configure-dev.mjs --disable-router
.\Start-RouterDev.ps1
```

DEV then runs without either observation/policy plugin. Existing sessions and records are retained. To remount:

```powershell
.\Stop-RouterDev.ps1
node .\configure-dev.mjs
.\Start-RouterDev.ps1
```

Never restore all of `.dsh` or replace newer sessions from this development snapshot. To abandon the experiment, stop DEV; no production rollback is required. Do not delete the DEV home until its sessions/evidence have been saved.

## Verification and rebuilding

```powershell
node .\prepare.mjs --verify
node .\configure-dev.mjs --check
node .\repair-profile-module-identity.mjs --check
Set-Location ..\..
node --test test/*.test.mjs stack/halo-routing/test/*.test.mjs stack/halo-policy-deterministic/test/*.test.mjs
```

The existing installed DEV copy is ready; do not rerun installation just to use it. On a fresh DEV reconstruction, `prepare.mjs` takes a new production baseline and copies the existing production profile, `pnpm install --ignore-scripts` installs the exact DEV root dependency, and `configure-dev.mjs` redirects DEV-owned state. The copied `home\profiles\web` dependencies must also be installed with pnpm. This depends on the installed Halo custom packages/file coordinates; it is not a portable stock-DSH installer. The recovery copy preserves the deployed DEV configuration, not provider passwords.

## Reproduce acceptance

`reuse-acceptance.mjs` contains the exact donor prompts. Its opt-in host driver
is `acceptance-driver.mjs`; it is removed from the running composition after
acceptance. For an explicit test run, stop DEV, append this row under the existing
`insert` list in `home/cordis.patch.yml`, and restart DEV:

```yaml
- id: halo-acceptance-driver
  name: file:///C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-router-dev/acceptance-driver.mjs
  config:
    home: C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-router-dev/home
```

Run serially, not alongside another local generation:

```powershell
node .\reuse-acceptance.mjs local
node .\reuse-acceptance.mjs claude
node .\reuse-acceptance.mjs codex
node .\reuse-acceptance.mjs gate
node .\reuse-acceptance.mjs write-claude
node .\reuse-acceptance.mjs write-codex
node .\reuse-acceptance.mjs recommend structured_write
node .\validate-reuse.mjs before
```

The agent performing the work owns these tests; Scott does not need to run them.
Raw receipts and failed attempts are preserved. The driver rejects missing
qualification evidence. Finish with Stop, `node configure-dev.mjs`, Start to
remove the driver and retain the ordinary DEV plugins.

## Boundaries and unchanged authority

- No actual routing, failover, escalation, load/unload, scoring promotion, UI extension, or Research Gateway dependency.
- No tool/model/permission restrictions added by the router.
- Unrun candidates remain `unknown`. Explicit donor fixture runs can produce exact-profile role PASS/FAIL; a transport response alone is not qualification.
- Only independently validated gate outcomes can enter outcome records. A post-terminal profile snapshot is required; it is **not** proof that configuration was unchanged throughout inference.
- The DEV verified-coder bridge is live-proven on the original donor coding fixture: child dispatch, independent gate verdict, promoted diff and exact-profile role qualification are linked. This is fixture acceptance, not an arbitrary-project quality claim. Adaptive learning is not implemented.
- Normal routing records omit raw prompts, outputs and tool arguments. Controlled qualification evidence includes the published fixture, its diff and verifier output; native evidence references its host-written receipt. Normal DSH session storage still follows ordinary DSH behavior.

See [implementation and evidence](../HALO-DSH-IMPLEMENTATION-2026-09-07.md) for measured results, Phase 0 decisions and limitations.
