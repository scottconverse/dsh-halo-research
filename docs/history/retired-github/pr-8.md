# Historical PR #8: Self-enforcing install: deploy registers + audits machine state; one canonical README checklist

Source URL: https://github.com/scottconverse/halo-stack/pull/8

Created: 2026-08-19T05:54:32Z · State: closed · Merged: 2026-08-19T05:54:44Z

## Original description

Implements the self-enforcing-install spec from the 5070Ti port session; closes #4.

**Deploy-ToLive gains three things, all AFTER the transactional pipeline succeeds (semantics untouched):**
- **REGISTER stage** - registers the hourly "HALO Memory Snapshot" scheduled task with native `Register-ScheduledTask` (not schtasks quoting), user-level, hidden, idempotent via `-Force`. Deleting the task and re-deploying restores it (verified live).
- **AUDIT stage** - every USER-MANUAL system-state row checked against the machine with per-row PASS/MISSING: LM Studio API at :1234, login-service mechanism (HKCU Run key OR Startup-folder `lms server start` - both accepted), snapshot task Ready, both desktop icons, subagent plugins in web+headless profiles. MISSING goes to the warning stream; only deploy-caused gaps exit nonzero. Cockpit autostart is reported as "manual by preference", never auto-enabled.
- **js-yaml bootstrap fix (the #4 core)** - npx cache is globbed instead of a hardcoded machine hash, and on a clean machine the script self-bootstraps by running `npx dsh --dump-config` once, exactly the workaround the 5070Ti install discovered.

**README** now carries the ONE canonical 8-step rebuild checklist (bootstrap step included, hash-verify-downloads step from the port corruption incident, final "deploy again and confirm all PASS"), and the manual state table cross-references it as the enforced spec. Also folded in from #4: the AGENTS.md scope note and ASCII-only .ps1 discipline are respected (new stages verified 0 non-ASCII bytes).

**Acceptance, run live on HALO:**
- Deleted the scheduled task + renamed the Mission Control icon, ran deploy: task re-registered (PASS, Ready), icon reported as loud MISSING warning, exit 0, transactional pipeline green.
- Restored the icon, ran deploy again: **all rows PASS**, exit 0. Live HALO deploy green throughout.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
