# Audit Lite — Halo Router 0.3.0 active routing and human controls
**Date:** 2026-09-08
**Scope:** Implementation commit `8a45357f` and delivery commit `786f4c636c0bf0baf96d3f78e3a05fe9ffa492b0`; active root/worker routing, native UI, DEV composition, related tests and release claims.
**Reviewer:** Codex (audit-lite, single-reviewer self-audit; not an independent external audit)

## TL;DR
**Working DEV happy paths, but not ready for production promotion.** The router and native controls are real, and all existing tests pass. Three additional boundary checks exposed defects in requirement propagation, cross-session UI state, and reporting an applied worker route; fix these before calling the release complete.

No implementation, production configuration, model loading, service restart, live routing-setting changes, commit or push was performed during this audit. Only this report and its Research-folder copy were written. Tests used disposable fixtures or in-memory fakes; no fresh cloud/model generation was requested.

## Severity rollup
- Blocker: 0
- Critical: 0
- Major: 3
- Minor: 0
- Nit: 0

## Findings

### HALO-001 — Major: Automatic routing discards capability requirements
**Dimension:** Correctness / Tests

**Evidence:** [control.mjs:46](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-routing/control.mjs:46) hardcodes `requiredCapabilities: ['text']`. [index.mjs:112](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-routing/index.mjs:112) calls the root resolver with identity, role and tool schemas, but no attachment requirements, context requirement or task-specific tier. The exact tool fingerprint is not a substitute for input modality.

A zero-model reproduction called the actual control module with `requiredCapabilities: ['text','image']` and a recommendation spy. Its output was:

```json
{"requested":["text","image"],"policyReceived":["text"],"selected":"text"}
```

The spy supplied a text-only route, demonstrating that requirements were dropped before the policy could evaluate them. This is a control-boundary reproduction, not a live image-generation test. The existing suite tests tool-schema forwarding, not image-requirement forwarding.

**Why it matters:** Automatic can replace a vision-capable selection with a text-only model for an image-bearing request. The eventual adapter may reject the input or otherwise fail to fulfill the request. Likewise, context fit is not currently supplied by the live root integration, even though the control API has an optional context field. I did not reproduce a context-overflow failure and am not claiming one occurred.

**Fix path:** Derive actual request requirements at the DSH integration point, pass them unchanged to the reused policy, and verify the selected route supports them. Preserve DSH's existing route when a requirement cannot be evaluated rather than silently treating every request as text-only. Add a regression for text+image and a caller-level test that context requirements reach the policy. Do not replace the donor selector or build a new classifier to fix this wiring defect.

### HALO-002 — Major: A late UI response can copy another session's overrides
**Dimension:** UX / Correctness / Tests

**Evidence:** [client.js:334](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-routing/ui/client.js:334) accepts each asynchronous status result without checking its session/request generation. The effect cleanup at [client.js:351](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-routing/ui/client.js:351) clears the interval but does not invalidate an in-flight call. [client.js:387](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-routing/ui/client.js:387) then merges the entire displayed settings snapshot into a save using the currently selected session ID.

A Node VM loaded the actual client module with a small React hook harness and controlled promises:
1. Request session A's status.
2. Change current session to B and request B's status.
3. Resolve B first, then A.
4. Change only the routing mode in B.

The resulting configure call was:

```json
{"sessionId":"B","settings":{"mode":"manual","scope":"local-first","planner":"cloud/old","worker":null}}
```

`cloud/old` belonged to A; B's returned status had no planner override. All state was in memory. No real session was altered. Existing UI tests replace `useEffect` with a no-op ([test:37](C:/Users/scott/Desktop/Code/dsh-halo-research/test/halo-router-ui.test.mjs:37)), so they cannot catch this lifecycle race.

**Why it matters:** A quick conversation switch or slow status response can display the wrong settings and then persist them to another conversation. This defeats the UI's per-session control promise and can later select a cloud or local override the user did not choose for that conversation.

**Fix path:** Bind each response to the requested session plus a monotonically increasing request generation; ignore obsolete responses after session changes or saves. Disable editing until the snapshot belongs to the current session. Prefer saving only the changed fields. Add a delayed-response regression using real effects or an equivalent controlled async harness.

### HALO-003 — Major: Worker evidence failure can report a selection that was not applied
**Dimension:** Correctness / Runtime / Docs / Tests

**Evidence:** [control.mjs:57](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-routing/control.mjs:57) puts the chosen route in the panel's decision history before dispatch. [worker-route.mjs:40](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-routing/worker-route.mjs:40) resolves that route, then line 43 awaits an evidence link write before returning it. If that append returns false or throws, [index.mjs:115](C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-routing/index.mjs:115) falls back to the original resolved route for Local first, without correcting the displayed decision.

A zero-model probe of the actual control and worker-route modules used a ledger that accepted the staging plan but returned false for `worker-route-link`:

```json
{
  "error":"worker route evidence was not appended: worker-route-link",
  "panelDecision":{"provider":"local","model":"text"},
  "callerFallback":"cloud/vision from resolved original route"
}
```

The first two fields were reproduced in memory; the fallback is established by the catch branch in the live integration source. The real ledger can return false at its queue limit or reject a storage write. I did not induce a live disk or queue failure. Local-only's separate refusal remains in place; this is not a demonstrated Local-only bypass.

**Why it matters:** The UI/runbook describe the history as actual applied selections. Under this reachable error condition, the worker uses a different model and potentially a different billing/network route while the panel says the chosen route ran. Evidence storage also changes dispatch behavior despite the intended separation.

**Fix path:** Make a nonessential evidence-link failure non-authoritative once a valid route has been selected, or explicitly record and display the final fallback route. Distinguish a proposed decision from confirmed dispatch and reconcile against `llm/stream`. Add a worker link-write-failure regression that asserts both the returned route and displayed final identity.

## Verification performed in this audit
- Fresh routing/reuse suite: **115 passed, 0 failed**, including both pinned donor lineages and current UI/control tests.
- Fresh production+DEV gate integration suites: **19 passed, 0 failed**.
- Fresh acceptance protocol self-test: **5 passed**.
- Three additional diagnostic reproductions above succeeded in exposing the gaps; they are not yet installed as regression tests.
- Fresh production integrity check: **117 checked, 0 changed**.
- Opened a separate browser tab at **http://127.0.0.1:3085/**. Router Auto, native model picker, Session log and the routing panel render. Panel reports 2,747 catalog rows and persisted Automatic / Local first. No live settings were saved.
- The existing ROUTER-UI-OK response was visible; this is historical acceptance evidence, not a generation performed during this audit.
- Read current runtime status: zero queue drops/storage errors/observer errors in the current process. Listener latency was zero because this process had no fresh observed requests; that is not a performance pass.
- A browser console entry said “Could not establish connection. Receiving end does not exist.” The panel still loaded; the emitting component was not established. Not promoted to an application defect without attribution.
- Reviewed active dispatch/control/UI sources, worker integration, DEV configuration, test coverage and changed documentation. This was a scoped lite pass, not a re-audit of the entire stock DSH codebase or every historical transcript.

## What's working
- Actual model-routing hooks and the UI exist; this is no longer a files-only shadow feature.
- The deterministic policy is reused from pinned DevHarmonics; Factory differential tests still pass. These findings are in Halo's integration, not evidence that the donor selector needs replacement.
- Exact current worker tool schemas are bound before selection.
- Native picker precedence and Local-only refusal have passing direct tests.
- The independent verifier's tampering, crash and timeout tests remain green.
- DEV isolation is intact. Production's protected files are unchanged.
- The release report preserves failed attempts and distinguishes small live coding fixtures from arbitrary-project capability.

## Watch items
- The previous release already disclosed a roughly 574 ms maximum observation delay. This audit did not rerun performance or establish the earlier 200 ms budget.
- Root calls currently use a fixed analysis/economy classification. Do not describe this as demonstrated task-aware optimization for difficult versus easy requests.
- Existing fixture/live-model results were reviewed as prior evidence, not independently rerun against accounts in this audit. No new provider authentication or account-entitlement claim is made.

## Escalation recommendation
**No audit-team escalation is required for these three localized defects.** Fix the integration and UI races, add the reproducing regression cases, and rerun this scoped audit. Keep production promotion pending those fixes; a new architecture or generalized benchmark program is not the remedy.

## Report locations
Canonical: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\audit-lite-halo-router-2026-09-08.md`
Research copy: `C:\Users\scott\Desktop\Halo Stack Research\audit-lite-halo-router-2026-09-08.md`

