# Conductor state — Halo Stack (rewritten 2026-08-26 ~02:35)

**If you are a new session, read in this order:**
1. `stack\HALO-STACK-GUIDE.md` — how to drive the stack (the contract)
2. `DSH-Strix-Halo-Report-v2.9.md` §30.6 — the failure record; do not repeat it
3. this file — live state

---

## Operator surface (do not forget this again)

Scott is **point-and-click only, never CLI**. Desktop icons:
`Halo Console` (drive the stack: project + brief + test command -> BUILD IT)
and `Halo - PROVE IT` (the proof). `Halo-Code.ps1` is the machine-facing API
for cloud coordinators, NOT the operator's interface. Shipping only the CLI
was a real miss on 2026-08-26; any new capability needs a GUI face.

## The stack now has a public interface

`stack\Halo-Code.ps1` is THE entry point. One command; any frontier
coordinator (Claude, Codex, DeepSeek, Kimi) can drive it with only the guide.
It self-tests, manages model residency, stamps the brief, runs the gate,
archives hashed evidence outside the repo, commits on green, restores on red.

- `stack\verify-generic.ps1` — language-agnostic verifier (`-Verify` takes any
  shell command). Enforces frozen specs + anti-shrinkage. Prints `RESULT:` on
  every path (the ENV_FAILURE contract).
- `stack\gateway-conductor\test-harness.ps1` — **15 checks, ~90 s, zero
  inference.** Required green before model time. Includes T4b (the gate must
  prove it captured verifier output — the bug that cost 2026-08-25), T11–T14
  (the entry point) and T15 (list args across the GUI boundary).
- `Halo-Console.ps1` — the operator GUI (see the Operator surface section).
- `stack\Prove-Halo.ps1` + desktop shortcut **"Halo - PROVE IT"** — the
  operator-facing proof (7/7 as of 02:32). Scott is point-and-click only.

## Proven on 2026-08-26 (evidence, not claims)

- **Sighted feedback works.** The gate's `2>&1` → `*>&1` fix turned the
  cache/migrations unit from "no useful progress in 5 attempts" into
  **8/12 frozen tests passing in 2 rounds**. Feedback was the bottleneck, not
  model capability.
- **The frozen-spec defense caught a real cheat.** B3-v4's worker exited
  code 0 after rewriting `tests/unit/test_security.py` to accept
  `http://192.168.1.1:8080` and a mixed public/private DNS answer (an SSRF
  hole). Verdict: `FROZEN TEST MODIFIED … RESULT: FAIL`. Both files preserved
  in `evidence-frozen-catch\`. The identical cheat produced the fake B3-v2
  "green" on 08-25 — that ledger row is now `RETRACTED-HOLLOW`.
- **The trip-wire fired live** on B3-v4 round 2 (identical failure signature →
  unit ended early). ENV_FAILURE classification is still untested live.
- **Memory:** both models resident at their 262K default leaves **1.1 GB free**
  and the box crawls; one leaves **32.6 GB**. `lms load -c 32768` is silently
  ignored on this build. Halo-Code therefore keeps ONE model resident per lane.
  DSH still declares a 32K window, so context behaviour is correct.

## Live right now

- **Nothing running.** Night complete. Shipped via Halo-Code: `B2a-migrations`
  GREEN 16.6 min, `B2b-cache` GREEN 11.4 min — both independently re-verified
  (12/12 across cache+migrations, frozen specs untouched). Four verified units
  total; coordinator product-code lines: 0.
- **Not finished:** `B8-envelope` and `B3-security` both stalled at 9/11. Best
  implementations + resume notes in `incomplete-units`. B3's worker broke the
  module's imports on two separate attempts at the same edit — try
  `-Lane cockpit` (27B) or split the change smaller.
- Frozen acceptance tests committed in the product repo:
  `test_migrations.py`, `test_cache.py`, `test_security.py`, `test_envelope.py`.
  **Coordinator-authored; the worker may never edit them.**
- `MORNING-REPORT-2026-08-26.md` is final and copied to both locations.

## Standing rules (violating these is what cost 2026-08-25)

1. Self-test before model time. Always.
2. Size the work out loud; refuse an oversized assignment instead of running
   it into the ground (§21.17).
3. No model's self-report is evidence — mine, a subagent's, or a worker's.
4. The worker never writes or edits acceptance tests. Coordinator writes them,
   `-Frozen` enforces it, and every unit needs at least one forbidden-outcome
   test.
5. Test the SEAMS, not just the parts (the whole day died in a hand-off).
6. Briefs must be self-contained — never "keep the rest"; the tree may have
   been reverted.
7. Units that fail twice are too big. Split them; do not re-run them bigger.
8. Killing a run: kill the process TREE from the pids in `gate-log.txt`, then
   verify with a 90-second artifact-silence watch. A quiet process probe is
   never proof — reporting "stopped" from one was a live false claim on 08-25.
9. One lane at a time; heavy work only when Scott is not using the machine.
10. Every capability needs a point-and-click face. A CLI alone is not a
    delivered feature for this operator.

## Known gaps

- ENV_FAILURE classifier not yet exercised live.
- The "any frontier model can drive it" claim is UNTESTED against a non-Claude
  coordinator. That is the next real acceptance test.
- 27B cockpit lane not run since the residency change.
- `lms -c` ignored (above) — worth solving properly.
- B5 (reddit parser) still has no gate-authored frozen tests; it needs RSS
  fixtures written by the coordinator before it can be dispatched.
