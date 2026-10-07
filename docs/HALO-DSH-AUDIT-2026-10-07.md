# DSH Web deployment audit and output-budget repair — 2026-10-07

## Outcome

The character-estimate output clamp is disabled for the Halo DSH Web process.
The active 35B route has 24,576 maximum output tokens, High reasoning, and its
real 65,536-token context window. Compaction headroom is explicitly 4,096;
the installed DSH 0.2 default of 65,536 made the previous policy invalid.
Web was restarted only after the session API confirmed no running sessions.
The stopped news session remains available. LM Studio was not restarted;
35B remains the only loaded model and 27B remains unloaded.

## Scope and evidence

Reviewed the deployed Web profile, preset composition, SDK/adapter request and
replay paths, usage and stop-reason mapping, compaction policy implementation,
model policy and startup/recovery scripts, research fallback, permissions,
authentication, canonical/live parity, and Mission Control contract suites.
Two independent reviewers audited configuration and adapter behavior. This is
a deployment audit of the installed 0.2.0-rc.2 system, not a certification of
every upstream plugin, every model, or every provider protocol.

## Confirmed findings

| Severity | Finding | Status |
| --- | --- | --- |
| Critical | SDK silently overwrites requested output using its context estimate; replayed messages lose usage, forcing a four-characters-per-token estimate | Disabled for this Web process |
| High | 35B route and model policy still specified 16K despite Scott's 24K request | Restored to 24K in live profile, canonical profile/settings, and model policy |
| High | All four registered Web compaction policies omitted headroom; installed engine defaults to 65,536, leaving no pressure budget for a 64K route | Fixed with explicit 4,096 headroom; mirrored external preset copies updated |
| High | Supported launcher loads both approved models and insists both are resident, reversing the intentional 27B unload | Audit finding; launcher residency behavior not changed |
| Medium | Preset delegation still targets the unloaded 27B route | Audit finding; call can fail or cause LM Studio to load it depending on server behavior; no fresh fallback call tested |
| Medium | DSH adapter drops the separately reported reasoning-token count | Audit finding; total output counts remain inclusive and are not proven wrong |
| Medium | Adapter converts malformed historical tool arguments to an empty object without a diagnostic | Audit finding; no claim of observed data corruption in this news session |
| Medium | Embedded 0.2 preset declarations and old external preset files create two recovery/editing surfaces | Mirrors synchronized for this repair; structural ambiguity remains |
| Medium | Four contract tests still assert retired release/model/default-context assumptions | Recorded failures; tests were not rewritten to hide them |

The broader tests failed because they expect DSH 0.1.6-alpha.1, the old cloud
default and model aliases, and 131,072 context where the active role now uses
65,536. Those failures demonstrate stale validation, not proof that those old
settings should be restored.

## Root cause reproduction

Session `session-5509721d-290e-4cdb-8309-83d019f27f97` ended with provider usage
23,482 input / 70 output and stop reason `length`, then Harness `max-tokens`.
The SDK's normalized transcript estimate was 61,370, including system prompt
and tools. Its calculation was `65,536 - 61,370 - 4,096 = 70`.
The SDK estimator and provider measurement disagree; the UI's 36% reflects
provider input, while the hidden clamp used the SDK estimate.

The adapter rebuilds assistant history with empty usage and zero timestamps.
Simply copying old usage into replay is not a safe complete repair: it also
requires timestamp/prefix invalidation after compaction. This repair instead
disables the SDK convenience clamp at the Web deployment boundary.

## Repair and recovery

`stack/stock-dsh/output-budget-patch.mjs` checks SDK 0.87.1 and the exact expected
function shape, backs up the original source before writing, and installs an
idempotent opt-out. `HALO_DSH_DISABLE_ESTIMATED_OUTPUT_CLAMP=1` makes the SDK
preserve the requested output ceiling. Without that environment variable the
original SDK behavior remains unchanged for other consumers.

`start-dsh-detached.mjs` verifies/applies the version-pinned repair before launch
and sets the variable only in the spawned Web process. An unreviewed SDK version
or changed implementation causes a visible startup error rather than a blind
rewrite. A dependency reinstall is repaired on the next supported launch.
This does not remove LM Studio's real context capacity or DSH's compaction.

With 64K context, 24K completion reservation and 4K compaction headroom, the
engine derives a 36,864-token pressure threshold and retains 22,528 tokens;
the summarizer output cap stays 8,192. The configured 70% ratio is a ceiling,
not the effective trigger when the response reservation requires more room.

Runtime backups: `.dsh-stock/output-budget-backups/` and
`stack/stock-dsh/runtime-patch-backups/pi-ai-0.87.1-simple-options.js.original`.
Recovery copies and checksums are in Scott's Desktop Halo Stack Research folder.

## Checks executed

- Five output-budget checks pass: original 70-token behavior; opted-out 24K,
  including an overestimated overflow; smaller explicit caps preserved;
  pristine patch/idempotence; actual SDK request serialization; installed
  DSH adapter dispatch with actual 64K metadata and 24K default. Request tests
  use a controlled HTTP/SSE endpoint, not a long live inference benchmark.
- Two compaction checks pass using the installed pure policy resolver: old
  default reproduces no-pressure-budget failure; all four repaired Web
  policies reserve a full 24K response and have valid retention.
- Research adapter: eight controlled checks pass; the optional live retrieval
  check was skipped in this audit. Prior turn verified actual Wigolo article
  retrieval. Live Reddit coverage remains unverified after its rate limit.
- Mission Control: nine suites, 149 tests; 145 pass and four fail against stale
  release/default/context assumptions. Full individual logs are retained under
  `work/dsh-audit-contracts/`.
- Auxiliary startup-default and local-lean catalog checks pass. The historical
  brain-provider test fails against obsolete model-alias expectations before
  reaching its dispatch checks; the new installed-adapter budget test covers
  current High reasoning and the 35B route separately.
- Fresh Web authentication returned HTTP 200; authenticated session/list RPC
  succeeded and showed the stopped news session preserved with no running
  sessions. LM Studio inventory showed only the idle 35B at 64K context.
- Canonical/live output and compaction settings match. Web rewrote only its
  welcome-notice version during startup; that UI metadata difference is not
  a model-policy drift.

No new full news pipeline or real full-summary compaction was run as part of
this repair. The next user-started reporting turn is the remaining practical
end-to-end observation; this audit does not claim a completed report.
