# HALO Mission Control 020 compatibility repair

Date: 2026-10-02

## Outcome

The repair is deployed to Web Mission Control for installed DSH 0.2.0-rc.2.
Only Mission Control was restarted. Web DSH, LM Studio, Desktop DSH, model
residency and the active Web profile were preserved.

## Root causes and repairs

- Version reporting was a hard-coded `0.1.6-alpha.1`. Mission Control now reads
  `@deepseek-ai/dsh/package.json` from the selected stock root and reports
  `unknown` if that package cannot be read.
- Route and Settings surfaces still targeted `settings.yaml` and a retired local
  preset. They now read the live `profiles/web/cordis.patch.yml` plugin schema.
  The current route controls target the exact provider/model selected in the
  live profile. Brain targets `web-fast/halo/qwen3.6-35b-a3b-q6`; Worker targets
  `lmstudio/halo-coder-q4km`; compaction targets the active first registered
  `compaction-basic` row.
- Route residency used a hard-coded provider-name allow-list, so the current
  `lmstudio-library/Orca` route appeared absent even when its exact model was
  resident. Provider locality now comes from the exact profile provider's
  loopback LM Studio transport. A cloud provider with the same model id cannot
  claim that local resident. Nonlocal routes expose local residency as not
  applicable and do not raise the local missing-model warning or MODELS alarm.
- The live and repository profiles intentionally differ in their default route.
  A Settings write pins the live route identity, produces independent candidates
  from both existing byte strings, stages and checks both, compare-and-swaps both
  inputs, backs up changed targets, and rolls back all replacements on failure.
  It preserves unrelated route selections and comments. Absolute offsets within
  the exact provider/model block prevent an identical numeric value elsewhere
  from being changed.
- The Brain role reader/load/recovery contract was stale. It now points to the
  current Q6 definition, `halo/qwen3.6-35b-a3b-q6`, with its verified 65,536-token
  context and one parallel slot. Worker remains the current Q4_K_M alias defined
  by the Web profile.
- `contextPressure.projectedTokens` was presented as current context use. It is
  now labeled as the estimated next provider prompt. The last provider prompt
  (`pressureTokens`) is exposed separately and marked as potentially lagging
  during streaming. Values above 100% remain visible and render as estimated
  overflow rather than negative tokens left.
- Validation records now include the exact installed DSH version and a SHA-256
  fingerprint over that version plus the live Web profile bytes. A stored result
  becomes stale immediately after either changes, in addition to the 24-hour age
  limit. The validation command remains the installed `bin.js web --dump-config`
  path and retains action-token/origin authorization.
- The live-acceptance default route source is the Web profile. Its parser accepts
  the plugin schema; an explicitly supplied legacy fixture remains readable for
  upgrade tests.
- Decode rates remain provenance-bound: live engine samples, recent completed
  model-step measurements, and completed-session aggregates retain distinct UI
  labels. No historical rate is promoted to a current live measurement.

## Validation

The final candidate must pass these exact commands from
`stack/stock-dsh/mission-control` before installation:

```text
node --check mission-control.mjs
node --test test/reasoning-contract.test.mjs
node --test test/data-contract.test.mjs
node --test test/ui-contract.test.mjs
node --test test/installer-contract.test.mjs
node --test test/live-acceptance-contract.test.mjs
git diff --check
```

The focused profile-edit regression uses different live/repository default routes
and duplicate numeric values in several model rows. It verifies that current-route
edits change only the live-pinned provider/model row in both candidate documents.

## Integration instructions

1. Review and selectively stage only the files listed in this report's task diff.
2. Run the four installer-required suites against the canonical candidate.
3. Use `Install-HaloMissionControl.ps1` to promote the tested source and preserve
   its receipt and verified backup.
4. Restart only Mission Control. Do not restart DSH, LM Studio, or the active Web
   session for this source-only repair.
5. Run `Test-HaloMissionControlLive.ps1` with the installed source hash and receipt
   hash. Its authenticated validation POST creates a fresh fingerprint-bound
   verdict for the running candidate.

## Boundaries

The installed candidate passed the authenticated live-acceptance gate. The Settings write transaction is covered by
pure regression and rollback contracts; it was not exercised against the active
profiles because doing so would mutate the user's selected configuration. A
successful post-restart live acceptance is required for deployment evidence.


## Deployment evidence

- Live acceptance: 215/215 checks passed at 2026-10-02T19:33:05.7307840Z.
- Installed source SHA-256: `534BD37476E0B0CF2BA6526A3B729F63E48D865D30E4080D62BA886FE2A56B5A`.
- Installer receipt: `C:\Users\scott\.dsh-stock\mission-control\backups\install-20261002-133212-247-b69f392c.json`.
- Receipt SHA-256: `9D05A3DEE22C7A40C94C7272F7D1FD3B90981D68B871688284E5684B06AEE23F`.
- Web DSH stayed on PID 29132; LM Studio stayed on PID 15308. Live/repository profile hashes stayed at their pre-deployment values.
- Validation returned `ok: true`, installed version `0.2.0-rc.2`, no warnings and current fingerprint-bound freshness.
- Current Orca route matched the local resident model. Settings read the Web profile and had no refusal errors.
- Required installer suites passed; the live check verifies build/receipt identities, session/plugin/job connections, resident-model parity, context and decode provenance, memory and GPU sampling. No live setting was changed to test the write path; focused exact-row, duplicate-value and rollback regression tests cover it.
