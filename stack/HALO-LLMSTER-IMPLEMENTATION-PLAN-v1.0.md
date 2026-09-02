# Halo llmster implementation plan v1.0

Date: 2026-09-02
Status: Ready for implementation authorization; no migration performed.
Prerequisite: HALO-LLMSTER-SPEC-v1.0.md in the same folder.

## Outcome and boundary

DSH starts standalone llmster and its tuned pair, retains the unrestricted picker and native tools, and no longer needs Bionic/LM Studio Desktop running. Bionic cloud credits can be used on Scott's other machines. Keep those installed apps as fallback; no uninstall, cloud bridge, model retuning, reboot, or unrelated-service work.

Planning estimate for one Codex implementation session: roughly 2–4 elapsed hours including short live checks, documentation and rollback. This is an estimate, not measured work or a promise; installer/runtime incompatibility can extend it. No multi-hour soak. If compatibility investigation exceeds 30 minutes without a concrete path, report the exact issue and keep the working host rather than redesigning the stack.

## 1. Capture baseline and installer footprint (20–30 minutes)

Read applicable AGENTS.md and the latest native-access records. Record current HEAD plus dirty paths/diffs; existing uncommitted work must not be overwritten, reset or swept into a commit.

Check active DSH/Bionic requests and model activity. Plan the short switch at idle; no killing active sessions. Inventory endpoint PID/executable ownership, selected engine, CLI version, models/aliases, API auth/binding, catalog, and startup registrations. Do not launch or manage another project's Sandbox or Ollama.

Download the official Windows installer from https://lmstudio.ai/install.ps1 to an inspected file, capture its hash and review behavior before execution. Identify update/download/version selection and affected paths; preserve affected files. Capture installed build identity, not just installer hash.

Exit evidence: baseline and exact recovery inputs available before mutation. No inference requested yet.

## 2. Install and prove standalone hosting (20–40 minutes)

Gracefully close only the confirmed idle model GUI host during this authorized migration. Install llmster using the reviewed vendor procedure as Scott. Record installation output and exact paths.

Start daemon; require isDaemon=true plus matching process/API identity. Reuse the current model library and aliases. Select/verify the existing Vulkan engine; no automatic runtime experiment. Verify authenticated inventory and inspect effective load configuration without assuming GUI defaults transfer.

Exit evidence: API works without GUI, catalog exists, version/config migration differences listed. If unsupported engine or missing aliases prevent faithful migration, stop and use rollback before proposing substitutions.

## 3. Integrate existing startup and monitoring (40–75 minutes)

Edit the existing helper and launcher, not a second conductor:
- stack\startup\halo-startup.mjs
- stack\startup\test\startup.test.mjs
- stack\Launch-Halo.ps1
- stack\mission-control\mission-control.mjs and its applicable tests/install path

Add daemon owner verification, bounded readiness and timeout reconciliation. Preserve fresh-launch/reopen behavior, catalog merge, full native tools and existing provider IDs. Add visible loading/error status and correct llmster identity in Mission Control.

Do not change stack\halo-orchestrator\agent.cordis.yml or the verified-coder plugin unless an actual hosting incompatibility is demonstrated. Do not reinstate superseded mandatory restrictions.

Exit evidence: focused tests cover spec section 9 and current tests still pass. Live files are installed through existing mechanisms after checking exact canonical-to-live mapping; do not assume editing the repo changes the running app.

## 4. Short live acceptance and rollback (20–40 minutes)

Use normal operator shortcut with GUI hosts closed. Capture raw daemon status, API result, lms ps JSON, engine load lines and Mission Control response before writing conclusions.

Verify tuned pair one load each, 32K/one slot/right weights; perform one ordinary DSH tool request and explicit worker round trip. Save exact prompts without presenting directed integration checks as autonomous coding benchmarks.

Check picker switch/return and one available non-default route with resource awareness, duplicate-launch no-op, and daemon recovery while DSH survives. Verify cancellation/stream termination with a bounded request if not covered by the ordinary turn.

Perform one rollback to the preserved old host and verify API/DSH connectivity; return to llmster and confirm readiness. Do not repeatedly reload models for redundant evidence. Record unavailable LM Link peers separately. Scott's future reboot is a separately labeled check.

Exit evidence: acceptance ledger PASS/FAIL/NOT EXERCISED for every item; no blanket fully tested claim.

## 5. Documentation and handoff (20–35 minutes)

Write a dated implementation/evidence ledger with:
- precise source revision + working diff or scoped commit, daemon/CLI/engine versions;
- installed paths, commands, source hashes, raw-result paths, failures and recovery commands;
- declared versus observed settings;
- exact test prompts and limitations;
- actual timing and memory samples without unsupported speed claims.

Update HALO-CURRENT-CONFIGURATION.md and HALO-STACK-GUIDE.md to explain startup, picker, backend ownership conflict, logs, explicit shutdown and fallback. Keep v3.5 history, and add a deployment pointer rather than rewriting historical evidence.

Sync documents and changed deployables to the Research folder / Current Halo Configuration; recompute and verify the recovery manifest. Stage/commit only if authorized, and then only reviewed migration paths/hunks. Never commit the pre-existing native-access work or transient .pnpm-store database files as part of this task. No GitHub push is implied.

## Full resource map

Canonical root:
C:\Users\scott\Desktop\Code\dsh-halo-research

Existing entry points and records:
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Launch-Halo.ps1
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\Run-HaloCockpit.ps1
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\startup\halo-startup.mjs
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\startup\test\startup.test.mjs
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\mission-control.mjs
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-CURRENT-CONFIGURATION.md
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-STACK-GUIDE.md
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-STARTUP-AND-BIONIC-2026-09-01.md
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\HALO-NATIVE-ACCESS-REPAIR-2026-09-01.md
C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Spec-v3.5.md

Live state (discover subpaths and ownership before writing):
C:\Users\scott\.dsh\settings.yaml
C:\Users\scott\.dsh\logs
C:\Users\scott\.dsh\mission-control
C:\Users\scott\.lmstudio\bin\lms.exe
C:\Users\scott\.lmstudio\models
C:\Users\scott\.lmstudio\hub\models\halo\qwen3.6-35b-a3b\model.yaml
C:\Users\scott\.lmstudio\hub\models\halo\qwen3-coder-30b-a3b-q4km\model.yaml
C:\Program Files\Bionic\Bionic.exe

Required user copies:
C:\Users\scott\Desktop\Halo Stack Research
C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration
C:\Users\scott\Desktop\Halo Stack Research\Current Halo Configuration\MANIFEST-SHA256.txt

Proposed evidence directory (create during implementation):
C:\Users\scott\Desktop\Code\dsh-halo-research\stack\evidence\llmster-migration-2026-09-02
Use actual implementation date if later. Standalone daemon executable/log paths must be discovered and recorded; do not invent them.

## Decisions already settled

- Use llmster, with same local models/configuration.
- Bionic cloud integration and same-machine coexistence are not required.
- Preserve applications/data as fallback.
- Start backend from DSH shortcut under Scott; no new pre-login or always-on service.
- Short integration checks, not model benchmarks or a new autonomy campaign.
- No further product choice is needed before implementing; installation and runtime changes still await Scott's go.

