# Audit Lite — Halo Router fix and recheck
**Date:** 2026-09-08
**Scope:** Three findings from `audit-lite-halo-router-2026-09-08.md`, their implementation, regression tests and DEV runtime integration. Not a whole-product or all-provider certification.
**Reviewer:** Codex using audit-lite; separate subagent review of backend changes. The UI author did not independently audit their own UI.

## TL;DR
The three original Major findings are fixed. The scoped recheck has **0/0/0/0/0** remaining findings. Keep using the DEV cockpit on port 3085; this is not a production promotion. The original adverse audit and failed smoke receipt are preserved.

## Severity rollup
- Blocker: 0
- Critical: 0
- Major: 0
- Minor: 0
- Nit: 0

## Findings closed

### HALO-001 — Request requirements were discarded
`stack/halo-routing/request-route.mjs` now derives modalities from DSH's current message projection, including images nested in tool results. Root and worker call sites in `index.mjs` pass the requirements to `control.mjs` and the donor policy. Unknown content preserves the DSH route instead of guessing text-only. An automatic replacement needs confirmed image support when required and known sufficient context; observed loaded context cannot be inflated by a larger catalog declaration. DSH's existing token-meter estimate supplies context, with a requested output reserve when available. Explicit human overrides remain choices, not qualifications. Decision evidence includes requirement labels, not message contents.

Tests: `test/halo-request-requirements.test.mjs`, requirement/capacity cases in `test/halo-control.test.mjs`, and actual worker requirement forwarding in `test/halo-worker-route.test.mjs`.

### HALO-002 — Stale UI responses crossed sessions
`stack/halo-routing/ui/client.js` binds reads and saves to a session-generation object and request sequence. Previous session controls are unavailable until the new snapshot arrives. Obsolete successes/errors are ignored, polling cannot race a save, duplicate queued edits are suppressed, and configure sends only the edited field. The actual Remote codec accepts partial patches.

Tests: eight cases in `test/halo-router-ui.test.mjs`, including lifecycle-driven A→B→A, late save/error and poll/save races. These execute the exported component in a hook-lifecycle harness, not a simulated claim of real browser scheduling. Browser verification separately opened the real native panel, changed a test conversation Auto→Manual→Auto, and observed successful single-field saves, labels, catalog and native picker preservation.

### HALO-003 — Optional evidence failure changed the worker route
`worker-route.mjs` no longer awaits the diagnostic link after successful selection. Both a rejected append and a thrown append leave the selected route intact. `control.mjs` also defers invoking the decision writer, so a synchronous writer exception cannot escape after updating the in-memory decision. Required staging plans and the independent verifier have not been weakened.

Tests: false/throw worker-link regression cases and synchronous decision-writer failure. A real local verified-coder run completed with independent PASS.

## Verification

Preserved RED output: `stack/halo-router-dev/evidence/audit-fix-backend-red.txt` (20 tests, 14 pass, six assertion failures) and `audit-fix-requirements-red.txt` (four assertion failures). The UI implementer additionally reproduced three substantive assertion failures before fixing its race tests. That UI RED transcript is reported by the implementer; the final suite is independently rerun here.

Commands:
```powershell
node --test test/*.test.mjs stack/halo-routing/test/*.test.mjs stack/halo-policy-deterministic/test/*.test.mjs stack/halo-policy-deterministic/vendor/devharmonics/test/fleet.test.mjs stack/halo-policy-deterministic/vendor/codex-factory/test/factory-fleet.test.mjs
node --test stack/halo-verified-coder-dev/test/*.test.mjs stack/halo-verified-coder/test/*.test.mjs
node stack/halo-router-dev/acceptance-client.mjs --self-test
node stack/halo-router-dev/prepare.mjs --verify
```

Results: **133/133**, **19/19**, and **5/5** respectively, zero failed/skipped/cancelled. Production baseline verification: **117 checked, zero changed**. Full outputs are captured in `stack/halo-router-dev/evidence/focused-tests.txt`, `gate-integration-tests.txt`, `acceptance-protocol-tests.txt` and `production-final.json`.

Live receipts in `stack/halo-router-dev/evidence/active/`:
- `root-auto-1788877342636.json`: Auto actually dispatched the local Q4_K_M route; 30.731 seconds.
- `gate-1788877418449.json`: actual local worker tool loop and independent gate PASS; 25.125 seconds.
- `root-manual-1788877551461.json`: Manual actually retained Claude Sonnet; 13.742 seconds.
- `root-auto-1788877606859.json`: final-code Auto repeat dispatched the local Q4_K_M route; 33.911 seconds.
- `root-auto-1788877225357.json`: preserved initial **failed smoke assertion**, because it expected local and got Claude. The turn itself completed. Its actual tool-schema digest differs from the qualified local digest; a later settled run selected local. Exact early resolver inputs were not captured, so the precise startup cause is not claimed as proven. Requirement labels are now recorded. Do not count this receipt as a successful local-routing test.

## What's working
- Human controls are native additive DSH UI contributions, not a separate model picker replacement.
- Manual/picker authority, explicit role overrides and the existing full tool access are preserved.
- Exact donor qualification and the independent verifier still govern their respective decisions.
- The real DEV browser accepts partial configuration, and automatic root/worker and manual dispatch are live-proven for the bounded cases above.
- No production source/configuration changes, production restart, model unload, machine-memory change, Sandbox or Ollama action was part of this fix.

Final state: the temporary acceptance driver is unmounted. Normal DEV was
restarted as owned PID 48244 on port 3085. The configuration check passed all six
checks. Recovery capture verified 144 copied files and the unchanged 117-file
production baseline. Research-folder and canonical report copies are included in
that capture; DEV is running, not promoted.

## Limits and watch items
- Image/context rejection and injected storage/race failures are deterministic tests; no fresh live vision-model qualification or all-provider benchmark is claimed.
- Token-meter values are estimates; DSH/provider context validation and compaction remain authoritative. The native provider's privately resolved model is still not independently observed.
- Initial startup can expose a changed or not-yet-qualified tool profile. Preserve the original route when qualification is absent; investigate repeated fallback using the recorded request requirements and exact profile rather than loosening qualification.

## Escalation recommendation
No escalation needed for these three repairs. This zero count is scoped to the audited fixes, not a promise of zero undiscovered bugs in DSH, every provider or the full stack.
