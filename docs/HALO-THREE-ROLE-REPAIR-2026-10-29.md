# Three-role recovery repair — October 29, 2026

Canonical source now contains the tracked activation/readback, active-disarmed
explicit-resume, no-progress scheduling, checkpoint and review-readiness fixes.
Repeated read-only status calls count as no progress, as do tool-free automatic
rounds. The guard holds before turn end and another native goal admission; input,
worker termination, goal change, cancellation and disposal release it. It neither
resets the goal budget nor claims that a blocked project is complete.

Shell and job-output inspection no longer invalidate review merely because the
tool ran. Git content/index identity, including untracked nonignored source,
detects actual changes; a retained baseline also detects background changes
between polls. Unknown/failed snapshots conservatively invalidate review.
Coder progress can be recorded while findings remain open. Automatic review can
inspect ready changes without waiting for unrelated findings; independent closure
and complete-contract acceptance remain required. Bounded Auditor Git views now
expose HEAD and its committed diff with external diff/text conversion disabled.

## Execution and evidence

- Seven no-progress lifecycle tests passed, including read-only tool churn.
- The installed Cordis/DSH agent dispatcher fixture passed input wakeup and
  disposal with the same goal/inbox intact. No host or model was started.
- The affected adapter regression passed in 31.59 seconds: role restrictions,
  goal activation/resume, open-finding progress, review readiness, closure gates,
  actual versus unchanged polling, and asynchronous source changes.
- The focused fingerprint case passed: ignored output is stable, actual tracked,
  newly created and staged source changes are observed.
- Earlier unaffected scope/state/closure checks were reused. No Verdict checker,
  desk, release lane or external model call was repeated for this work.

Two preliminary idle checks failed because JavaScript and PowerShell represented
the same Windows timestamp with different submillisecond precision. No deployment
occurred on those attempts. The preflight was corrected to compare complete
journal byte hashes, a stronger check, rather than weakening idle admission.

At deployment, both host process trees had no provider/acceptance children;
Web's current stream had no active jobs or queued input. All 80 Desktop journals
were parsed across every concatenated zstd frame and rehashed before copying.
Two unclosed historical journals predate the current host; native cold attachment
would append interrupted-turn closure before publishing a running agent. Those
histories remained untouched. No process was classified or killed as an orphan.
The canonical source baseline matched before copying; original files and a
manifest were retained privately for rollback. Web profile and project-state
hashes remained identical. No models, defaults, skills, authentication or goals
were edited. Source deployment was at idle; no forced pause/reload/restart occurred.

## Loaded runtime verification

Both hosts were restarted at verified idle using their existing installation and
profiles on October 29. Web's normal scheduled task produced a new host; Desktop
was relaunched through its installed application after explicit owner approval.
No active provider, acceptance job, or project was interrupted. The first Web
scheduled-task stop left its detached host running; startup was refused until
that exact idle process and its captured service children were handled. No
unrelated model service or Wigolo process was stopped.

The new Web host's native plugin inventory reports the canonical three-role
module active. Its live Coder preset includes both the open-finding checkpoint
instruction and the external-process ownership instruction added by this repair.
Desktop's existing Coder role header independently shows the same new guidance.
The owner authorized brief computer use with a 60-second warning; that warning
elapsed before inspection. No message, model job, goal mutation or settings edit
was submitted during Desktop verification. Computer control was reset afterward.

The Web and Desktop profile hashes and original project-state hash remain
byte-identical. The original Verdict goal remains revision 6, blocked/disarmed
at 512/512; it was not rearmed, replaced, reset or increased. Private restart and
loaded-readback receipts retain process identities and preservation hashes.
Existing focused tests and dispatcher-fixture results above are reused. This
loaded-module check does not claim a new autonomous goal trial or model run.

The Verdict effort remains assisted. These fixes do not establish an autonomous
triad trial, guarantee correct judgments, or turn historical worker claims into
acceptance evidence. Evidence tiers and actual receipt ownership still matter.

Implementation/coordination used the current OpenAI Sol 6.1 session; no coding
subagents or additional providers were launched. The prior expensive session's
heartbeat remains paused. No bill or unobserved served-model identity is inferred.

## Bounded live status-wait verification

One owner-authorized, headless live triad run on the existing Web host verified
the repeated status-only automatic-round guard on October 29. Both workers
finished their read-only checkpoints. The Coordinator then used only
`triad_status` in automatic rounds 1 and 2 (native sequences 58 and 75).
Its assistant response completed, but the turn-stopping guard held the native
journal at sequence 80 for 36,327 milliseconds with no additional goal rounds.
The test goal remained active/armed at 2/6 throughout that observation; this was
waiting below the cap, not exhaustion or an unfinished model response.

The owner then paused only this new test goal (sequence 81). The waiting turn
ended at sequence 82, recorded natively as user-aborted following that pause.
The test goal retained its identity and used count, ending paused/disarmed at
2/6, revision 3. All three test sessions were independently read back as idle.
There was one trial and no retry, second live run, UI operation or host restart.

The original Verdict goal remained revision 6, blocked/disarmed at 512/512.
Protected profiles and existing projects were unchanged. The full receipt,
exact prompt/observer and native event extracts remain in the owner's private
`Documents/Codex/2026-10-29/triad-status-wait-live` directory. `RECEIPT.json`
SHA-256 is `634cb944f271916b3852285fa7d72df89cb62f3255908e1d3d050f628783ba6c`.
A sanitized result is retained in
[the repair evidence summary](../evidence/three-role/repair-2026-10-29.json).

This verifies the specific live Web status-wait behavior. Both hosts had already
loaded the repaired canonical plugin, but this was not a Desktop live trial or
a full autonomous product-completion trial. Unknown/action tools still count as
progress, and a waiting turn remains visibly running. No general guarantee of
agent judgment or autonomous completion follows from this bounded observation.
This documentation update reused the completed receipt; no tests were rerun.
