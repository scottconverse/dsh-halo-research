# Halo Router DEV — 0.3.0

Status: development-only, human-controlled active routing, September 8, 2026
(America/Denver). Fresh installations default to Manual; the delivered DEV profile is set to Auto / Local first. An operator can turn on Auto for
one conversation and allow the router to apply an exact-qualified planner or
worker route before DSH dispatches it. Production is not promoted or
reconfigured.

0.3.0 retains 0.2.0's direct import of the pinned DevHarmonics selector and its original
qualification fixtures/checkers. Codex Factory's original selector and tests are
retained for lineage and differential checks. This replaces 0.1.0's simplified
policy: a recommendation now needs exact current role qualification, and coding
also needs the donor benchmark PASS. No qualification means no recommendation,
not an invented PASS. The older 0.1.0/0.2.0 shadow-only operating status is
superseded by this DEV-only human control; its records remain historical evidence.
[Direct-reuse implementation and test record](../HALO-ROUTER-DIRECT-REUSE-2026-09-07.md).

## Open and use

Open **http://127.0.0.1:3085** and choose the **Halo Router DEV** preset. A
**Router** button is available on the opening screen and in an open conversation.
The existing opening/session model picker remains intact. No model is preloaded
by this launcher; existing LM Studio behavior handles inference.

Use a development repository or worktree for your real task. DEV is **not a filesystem sandbox**: models retain the normal full-access capability. Its DSH sessions, gate runs, memory, and native-adapter conversation state have separate DEV paths. Native Claude/Codex still use the signed-in user's account stores. LM Studio and OmniRoute are shared existing providers, not copied runtimes.

The six older sessions named `HALO ROUTER DEV — ... integration check` are deliberately tiny transport tests. They are not autonomous coding tests or qualification evidence. New `halo-acceptance-*` sessions run the documented donor qualification fixtures; their host-verified records are explicitly separate.

## Router controls

September 8 audit fixes: Auto carries the current DSH message modalities and
available token-meter context estimate into selection. Unknown content keeps the
DSH route; an automatic replacement must have confirmed image support when needed
and sufficient known context (observed loaded context takes precedence over a
larger catalog limit). Explicit human overrides remain explicit choices. DSH owns
compaction and exact provider validation; this is not a new tokenizer.

Session controls now discard stale status/save responses, show controls only after
the current session's snapshot arrives, and save only the field you changed.
Optional decision/link evidence failures no longer change an already-selected
worker route. The original audit and its closure report remain in `stack/`.

- **Manual** is the default. DSH keeps the model and reasoning choice from its
  native picker, and the verified-coder worker remains unchanged.
- **Auto** lets the pinned donor policy choose separately for the planner and
  structured-write worker. Changing the native picker after Auto is enabled
  cancels Auto for that conversation; the native picker wins.
- **Local first** prefers an eligible, exact-qualified local model, then another
  eligible route. **Local only** permits only a confirmed local model route and
  refuses instead of silently using a remote model.
- Provider preference controls the model/network route only. It does not disable
  web research, network-capable tools, native CLI tools, or the model's normal
  permissions.
- Planner and worker overrides are Auto-only human choices. Their searchable
  controls cover all 2,747 discoverable provider/model routes, but a catalog row
  is not proof of account entitlement, credentials, availability, or quality.
  An explicit override is a human route choice; it does not manufacture a
  qualification.

Automatic donor selection is currently available only for the three models with
exact current analysis, benchmark, and structured-write evidence: the local
`lmstudio / halo/qwen3-coder-30b-a3b-q4km`, `claude-cli / sonnet`, and
`codex-cli / gpt-5.6-sol`. Other catalog routes remain selectable manually and
display as unknown or not currently qualified until they complete the same
evidence path.

The active resolver fingerprints the current assembled DSH tool schema before a
planner dispatch. Worker selection is deferred until the actual child exists and
its tools have been assembled, then the selected route is applied to that child's
first request. This is routing, not a new permission system: no tools are removed
or narrowed.

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

## Read actual decisions and recommendations

```powershell
node .\read-records.mjs 3
```

This prints the last three dispatches, measurements and complete referenced
policy evaluations. The Router panel shows recent actual decisions first,
including the original route, applied route, status, timestamp, and explanation.
Machine-readable files:

- `home\halo-routing\records.json`: readable export, updated within about five seconds after queued work finishes.
- `home\halo-routing\candidate-reconciliation.json`: all discoverable provider/model routes, native provider capabilities, unavailable metadata and catalog-only classifications.
- `home\halo-routing\status.json`: freshness, queue drops, observer/policy/storage errors and listener time.
- `home\storages\halo_routing.json`: authoritative DSH JSON storage unit. Do not manually edit while DEV runs.

Recommendations use an `evaluationId` to share identical large candidate evaluations. The reader resolves these references; raw JSON consumers must do likewise. Route decisions and worker reservation/link records identify what active control applied. Old prototype records remain preserved. A missing observation/measurement is not a success; check status counters. Ledger schemas carry version 1; execution profiles carry version 2 and invalidate ambiguous v1 qualification fingerprints. This is a small append-only experiment, not a long-running retention product.

## Active-routing acceptance

The September 8 bounded acceptance established these distinct outcomes in the
separate DEV instance:

- Root Auto changed an initially selected Claude route to the exact-qualified
  local model, with the selected fingerprint matching the post-terminal profile.
- Root Manual preserved the native Claude selection.
- A planner override executed the selected Codex route.
- The verified-coder path applied the qualified local worker to the actual child
  request and produced an independent gate PASS.
- A worker override applied Codex to the actual child request and produced an
  independent gate PASS in 42.3 seconds.

An early local qualification script reported a false failure because it read the
human-readable export before the queued observer had settled. The bounded settle
check was corrected and the durable receipt was preserved. Do not cite that first
script result as an all-green receipt set or erase it from the evidence history.

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

The same temporary driver can reproduce the active routing paths:

```powershell
node .\active-acceptance.mjs root-auto
node .\active-acceptance.mjs root-manual
node .\active-acceptance.mjs root-codex
node .\active-acceptance.mjs gate
node .\active-acceptance.mjs gate-codex
```

The agent performing the work owns these tests; Scott does not need to run them.
Raw receipts and failed attempts are preserved. The driver rejects missing
qualification evidence. Finish with Stop, `node configure-dev.mjs`, Start to
remove the driver and retain the ordinary DEV plugins.

## Boundaries and unchanged authority

- Active model routing happens only when a human enables Auto or chooses an
  Auto-only role override in Router DEV. Manual remains ordinary DSH selection.
- The router does not load, unload, retain, evict, or otherwise control model
  processes or residency. It does not alter LM Studio, native CLI, or OmniRoute
  account configuration.
- There is no adaptive scoring, learned promotion, automatic retry, or new
  failover system. The reused donor policy is deterministic and evidence-gated.
- Local first/Local only affect the provider/model route, not web or network tool
  permission. There is no Research Gateway dependency.
- No tool/model/permission restrictions added by the router.
- Unrun candidates remain `unknown`. Explicit donor fixture runs can produce exact-profile role PASS/FAIL; a transport response alone is not qualification.
- Only independently validated gate outcomes can enter outcome records. A post-terminal profile snapshot is required; it is **not** proof that configuration was unchanged throughout inference.
- The DEV verified-coder bridge is live-proven on the original donor coding fixture: exact-current-tools child routing, independent gate verdict, promoted diff and exact-profile role qualification are linked. This is fixture acceptance, not an arbitrary-project quality claim.
- Normal routing records omit raw prompts, outputs and tool arguments. Controlled qualification evidence includes the published fixture, its diff and verifier output; native evidence references its host-written receipt. Normal DSH session storage still follows ordinary DSH behavior.
- The native Router UI is a linked package installed only into the separate DEV
  web profile by `configure-dev.mjs`. Production does not load that link, host
  remote, UI, control state, or routing plugin.

See [implementation and evidence](../HALO-DSH-IMPLEMENTATION-2026-09-07.md) for measured results, Phase 0 decisions and limitations.
