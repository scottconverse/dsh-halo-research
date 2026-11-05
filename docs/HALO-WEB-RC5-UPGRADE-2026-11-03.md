# DSH Web rc.5 upgrade and Desktop update check — November 3, 2026

DSH Web was upgraded from 0.2.1-rc.3 to the official npm latest release, 0.2.1-rc.5. The separate alpha channel was not selected. Upstream source: b830ec950faba0a46dda564be3e2d854afed94f1. Official release notes: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.5 (reasoning display improvement), following rc.4's ACP diagnostic-output fix. This remains an upstream release candidate, not a stable-version claim.

## Scope and preservation

Only Web's official DSH dependencies, lockfile/release-specific guards and its runtime were updated. All 41 direct official pins moved together. The existing pi-ai 1.0.2 override, non-DSH direct pins, provider selections, effort levels, output caps, integrations, skills, sessions and goals were preserved. No existing goal was resumed, replaced or reset. Desktop and Factory configuration were not changed. Local Qwen/Strata remains deliberately stopped after the separately documented commit-pressure incident; startup did not load local models.

The complete prior rc.3 node_modules tree and old deployment files are retained privately at C:\Users\scott\Documents\Codex\2026-11-03\dsh-web-upgrade-rc5\rollback. Settings/skills/three-role storage/Desktop archive snapshots before and after match for all 1,583 captured files. No raw conversations, credentials or authenticated launch URLs are published.

## Compatibility and actual verification

The incoming model adapter, session recovery, web-fetch tool, session stats, trajectory UI and frontend HTML were compared with preserved pristine rc.3 sources. All except the chat UI were byte-identical; the chat UI's reviewed changes implement the upstream reasoning-display change. Exact pristine-source checks remain enforced. Existing output-cap, adapter integrity, retrieval provenance, interrupted-command, Web disconnect, truthful text-speed and Windows workspace fixes were retained. No guard was relaxed.

The model-SDK locator now follows the adapter's standard dependency search paths rather than assuming a pnpm physical layout. Its exact SDK version guard remains 1.0.2. A staged 1.5.0 resolution was rejected in favor of the existing override before deployment. The original 70-token clamp reproduction and explicit output-budget serialization checks pass with the final 1.0.2 SDK.

Existing affected checks: 26 checks passed on the initial staged run. Three initial failures were diagnosed: a missing copied profile fixture, the VM flag required by the old Desktop-focused workspace test, and an SDK-specific baseline caused by staging's initially newer SDK. The corrected Web workspace/profile checks passed (8 checks), and all five output-budget checks passed after preserving the original SDK. Unaffected passes were reused. Native koffi loaded, and an isolated PowerShell PTY printed its expected marker and exited zero; its lingering test wrapper was identity-checked and stopped. No real provider/model calls, broad test suite, or repeated triad run was performed.

The idle-only switch stopped Web/Mission Control, retained rc.3, and promoted rc.5. Startup's integrity guard rejected an absolute staging import path; the exact one-line path difference was verified, rebased to canonical source, and the complete integrity check passed. The startup error logger was corrected to work even before its local logs variable is initialized. These unsuccessful intermediate attempts remain in the private logs and are not counted as readiness passes.

Actual installed result at 21:23 Mountain: CLI 0.2.1-rc.5; independent limited-user task running Web PID10196 and Mission Control PID43996; authenticated HTML and main application module both HTTP200; Mission Control event stream connected. All preservation hashes match. No browser window was opened and no inference was submitted. Rendering and live model output were not exercised; existing unaffected inference evidence is not mislabeled as an rc.5 run.

## Desktop check

Scott reported pressing Desktop's update button. Inspection found a correctly signed DeepSeek rc.5 installer in the updater's pending folder, but the archive behind DSH Halo Desktop is still rc.3. No Desktop process was running during inspection. Its profile matches the earlier same-day snapshot; all eight optional official profile dependencies remain consistently rc.3, and the application archive is unchanged across the Web upgrade. The update is downloaded/pending on this installation, not verified installed. No Desktop installer, restart or configuration migration was performed by this task. Running Desktop behavior and a completed rc.5 Desktop update cannot be claimed from these checks.

## Recovery and records

Private operational receipts: dsh-web-upgrade-rc5/CUTOVER-STATE.json, DESKTOP-CHECK.json, PRISTINE-REVIEW.json, PRESERVATION-before.json and PRESERVATION-after.json, install logs and affected-check logs. The rc.3 runtime tree must be restored only after Web is idle and stopped, together with rollback's package/lock/guard files; do not overwrite active sessions or profile data. The earlier desktop-shortcut originals remain in dsh-launcher-repair/before. This upgrade used one accountable Codex agent, no subagents or external model calls.

Rollback layout note: the retained pnpm runtime contains links targeting its original canonical location. A read-only SDK lookup while the tree was relocated failed, as those original paths are absent from the new flat runtime. Do not execute the rollback tree in place or count that probe as a pass; restore it to the original node_modules path under idle shutdown before using it. The live runtime's SDK lookup and output-budget checks passed.
