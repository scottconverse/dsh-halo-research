# Workflowwright release review — 2026-09-02

**Verdict: the narrow production release claims hold. No rollback or new configuration change is justified by this review. Three operational outcomes remain unproven.**

This review uses the installed `C:\Users\scott\.codex\skills\workflowwright\SKILL.md`, its schema and critique rubric. It does not retroactively claim that Workflowwright drove the earlier development. `spec.json` is the review's source; generated design/diagram/HTML describe its information flow. No new DSH conductor, background job, generated production orchestrator, tool restriction or approval policy was installed.

## Fresh deterministic evidence

`evidence-check.json` at 2026-09-02T22:06:04.820Z contains ten passing checks:

- Recorded 74-test canonical and 105-test development results still match all 25 cited test-source files. These suites overlap; do not sum them into 179 independent cases. Tests were **not rerun** during this review.
- The two-turn production receipts are internally consistent for Claude and Codex: exact native resume IDs and the expected nonce.
- Twelve recorded release hashes still match the canonical files.
- All 275 recovery-manifest entries match. All seven pre-promotion backup hashes also match; destructive live rollback remains untested.
- Production integration commit `bb9fa12a` is an ancestor of current release HEAD `354c86cf`.
- Current DSH, Mission Control and provider-router endpoints return HTTP 200. Health does not prove that every route can perform useful work.

Read-only script: `verify-evidence.mjs`. It writes only a review receipt. It does not invoke models, run tests, start/stop services, reconfigure the stack or inspect credentials.

## Prioritized findings

### 1. Startup/recovery is still an operator outcome, not an unattended guarantee

Workflowwright pattern: missing/externally handled failure path. The app restart left helper processes absent. The retained research plugin then prevented DSH startup until the Gateway-owning task restored its service. Manual recovery worked. Neither a live HTTP 200 nor the provider's startup receipt proves automatic persistence through another app restart or reboot.

Cost here: the stack can appear broken when a required service is absent, requiring another task to restore it. Suggested next check: use the normal desktop launch path while watching service readiness, then verify a reopen does not duplicate processes. Only do a disruptive restart/reboot if Scott chooses it; Scott keeps the reboot button. Do not silently remove the research dependency or change its failure policy.

### 2. Native continuity and true long-conversation compaction must remain separate claims

Workflowwright patterns: implicit handoff and untestable operational boundary. The adapter's checkpoint archives the DSH transcript and resumes a native thread. Two-turn production recall proves continuity, not near-limit behavior, semantic compression, or useful recovery after an interrupted long coding task. Historical development checkpoint testing found and fixed the catalog-reminder/user-message mix-up.

Cost here: a long real session may behave differently from a short nonce test—the exact failure class that previously wasted Scott's time. Suggested next check: a normal sustained development session, record the first actual compaction and next useful turn, and stop promptly if it loops. Do not manufacture an hours-long stress test or add a hidden steering prompt. Portability improvement: the dated development checkpoint evidence should remain easy to find alongside production records.

Documentation correction made during this review: `checkpoint-evidence-index.md` now identifies the exact original, failed and successful development receipts, hashes and checkpoint archive paths. This improves traceability only; it does not extend the tested behavior.

### 3. The cloud catalog is discovery, not connected-account acceptance

Workflowwright pattern: implicit payload/claim handoff. The 2705 catalog entries are model metadata; the fresh production router did not import development upstream accounts. Production smoke evidence exercised Claude Sonnet and Codex `gpt-5.6-terra`, not every native choice or cloud row.

Cost here: Scott may select a listed model and encounter an account/entitlement error. Current `connect account` labels correctly disclose this. Suggested next check: Scott chooses one provider he actually wants, connects its existing account using the supported flow, then one useful task validates the route. No new purchases or credential imports are implied.

## What the workflow gets right

Mechanical checks are code, not model opinions. The independent reviewer is separate from the implementer. Exact files and receipts are named at handoffs. Test failures and setup failures are retained rather than relabeled successes. Dev/production service state is separate, the local tuned default stays primary, and task scope is not confused with stripping native permissions.

The remaining weakness is not a missing giant framework: the earlier development was manually coordinated rather than driven by a durable, spec-enforced runner. For this bounded review, generating and installing another orchestrator would add machinery without improving the current verdict. Future repeated unattended delivery should use the same explicit payloads and enforce retry ceilings in its actual driver—not merely in a diagram.

## Next operator decision

Recommendation: start with the **normal startup/picker walkthrough**, then use the stack on real work. Keep automatic lifecycle, actual long-context behavior and a chosen cloud account as distinct acceptance items. Scott has not yet accepted those outcomes; no decision record is fabricated.

The generated HTML uses the renderer's explicit no-prerender mode: its diagram requires the pinned Mermaid CDN script; the Markdown/spec remain usable offline. No browser or runtime dependency was installed to render this documentation.
