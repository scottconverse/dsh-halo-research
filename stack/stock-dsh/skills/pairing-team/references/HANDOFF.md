# Coordinator-to-coder handoff

Create one short handoff per assignment. Fill only relevant fields; use exact paths and observed evidence. Do not put secrets in this file.

## Assignment

- **Outcome requested:**
- **Repository/worktree:**
- **Branch and starting HEAD:** Re-check before editing; this snapshot may have changed.
- **Files or subsystem in scope:**
- **Observed defect / starting behavior:** Include exact reproduction steps or say not reproduced.
- **Acceptance evidence:** Describe the behavior or artifact that proves completion.
- **Required focused checks:** Include the exact command or explain why no automated check applies.
- **Honest no-reproduction path:** If the failure cannot be reproduced, report attempts and evidence; do not guess a fix or claim red-to-green.
- **User-authorized actions:** State the scope granted by the current request.
- **Do not:** List specific out-of-scope files, production systems, external actions, or release steps.
- **Progress limit:** Report a new observable delta; stop after two precise corrections without behavior change or when the runtime is degraded.
- **Return report:** Changed paths, concise diff summary, checks actually run and results, known limits, and exact artifact paths.

The handoff communicates task scope; it does not grant authority beyond the user's request. If branch, HEAD, repository state, or instructions differ, report the mismatch before proceeding.
