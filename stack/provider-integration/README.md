# Halo production provider integration

This is the additive provider/picker integration deployed on 2026-09-02. It retains the tuned local Halo stack and adds native Claude Code and Codex sessions plus a searchable cloud/API catalog. It does not replace LM Studio with llmster, import Bionic credits, or make catalog entries free or authenticated.

## Use it

Open **http://localhost:3080** using the existing Halo cockpit shortcut. The new-conversation picker and the session composer both expose model selection and search. The startup default remains `lmstudio / halo/qwen3.6-35b-a3b`. Existing conversation selections are saved separately; changing one does not delete the other models.

- **LM Studio:** direct local provider, existing tuning and discovery retained.
- **Claude Code / Codex:** native installed CLIs, using the signed-in Windows user's existing authentication. They run their own coding tools with native full-access flags. DSH presents their streamed events and result; it does not secretly translate their native tool loop into the local Halo verifier.

Claude executable discovery supports native `.exe` installations in the normal user locations, Scoop's Node npm directory, npm prefixes and absolute PATH directories, and Claude Desktop's CLI cache. Shell wrappers are never executed by discovery. Web and Desktop declare the same four Claude model IDs; catalog entries are configuration, not proof of account entitlement. Check authentication with the read-only `probeNativeCli` helper; no inference is needed. See `docs/HALO-CLAUDE-REPAIR-2026-11-14.md` for the November repair and verification limits.
- **OmniRoute:** provider catalog through http://127.0.0.1:20130. Connect the relevant upstream account in that dashboard before using a row labeled `connect account`. Catalog presence and a provider's advertised context are not proof of entitlement or live acceptance.
- **Mission Control:** http://localhost:3090. Its source was not modified by this provider promotion.

The independent production router has no copied development upstream accounts. Dashboard credentials and the router API key are in the private local file `C:\Users\scott\.dsh\provider-runtime\credentials.json`. Do not publish this file, place its values in documentation, or copy it into Git. Native CLI login remains native CLI login; it is not the router password.

## Architecture and storage

| Component | Location / behavior |
|---|---|
| Canonical integration | `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\provider-integration` |
| Live DSH profile | `C:\Users\scott\.dsh\profiles\web` |
| Local/provider settings | `.dsh\settings.yaml`, canonical `stack\halo-settings.yaml` |
| Native CLI adapter | `cli-provider.mjs` delegates to `cli-runtime.mjs` |
| Native continuity and checkpoints | `.dsh\native-cli\threads` |
| Native invocation receipts | `.dsh\native-cli\receipts` |
| Per-session model selection | `.dsh\model-selections` |
| Production router runtime | `.dsh\provider-runtime\node.exe` — Node 24.20.0 |
| Production router private state | `.dsh\provider-runtime\state` — OmniRoute 3.8.50, port 20130 |
| Development router | Separate `.runtime` in `dsh-halo-dev`, port 20129; not a production dependency |

`Run-HaloCockpit.ps1` starts/reuses the independently owned production router and supplies its API key only in the DSH process environment. Local/native CLI routes do not require that router to work. Existing research and memory plugins remain in the profile. The router refuses an occupied foreign listener and never stops it. Its launcher validates the saved PID/start-time before reuse.

No Windows service or new logon task was introduced here. Existing desktop startup remains the entry point. After a Codex app restart on this machine, the helpers started from this task were found gone and were relaunched. Automatic persistence across a Codex app shutdown or Windows reboot is **not** claimed by this release. Use the normal shortcuts; do not treat a historical PID as current ownership.

## Continuity, compaction and honest metrics

Subsequent turns resume the exact native thread when the provider, model, working directory and history match. Route changes or incompatible edited history start a new context with the available DSH history. A returned native thread ID that contradicts the requested resume ID fails visibly.

DSH `/compact` stores an exact local archive with a hash and emits a small checkpoint referring to it. The same native thread continues; the archive is a **lossless handoff checkpoint, not a generated semantic summary**. Native Claude/Codex still own their internal context management. This release does not claim a forced near-limit native auto-compaction test. Interrupted mappings do not automatically replay an unfinished coding job.

Native metrics use CLI terminal events. Codex's cumulative resumed counters are converted into invocation deltas; Claude's terminal categories are combined without counting overlapping helper fields twice. Missing or reset counters remain unknown. First complete model-message latency is not first-token latency; wall time is not decode tokens/second. The UI reads the same-origin structured endpoint `/halo-dev/cli-metrics` (historical route name retained); raw prompts/results are not exposed there.

The adapter visibly rejects image attachments it cannot forward; a native CLI can still work with an explicitly supplied local image path where its own capabilities support it. No silent image loss is claimed as success.

## Pinned overlays and rebuild

Live `package.json` uses three exact local artifacts in `stack\packages`:

- `deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2-halo-dev-search.4.tgz`
- `deepseek-ai-dsh-client-ui-conversation-0.1.1-rc.2-halo-native-metrics.2.tgz`
- `deepseek-ai-dsh-host-apiproxy-0.1.1-rc.2-halo-selection.3.tgz`

Sources/tests/build scripts are in `picker`, `conversation-metrics`, and `session-selection`. The upstream host bundle is hash-pinned. Install the adjacent `dsh-tools` lockfile with pnpm before rebuilding overlays. The picker script expects its unchanged server/package template: first extract the released picker .4 tarball into the `picker` directory (`tar -xf <absolute-tarball-path> -C <absolute-picker-directory>`), which creates `picker/package`. Then run each directory's `build.mjs`, followed by `npm pack` in its generated `package` directory. The other two build scripts create their templates from the pinned upstream tree. Do not substitute old selection .1/.2 artifacts: their development packaging omitted the persistence helper. Do not run the older single-picker installer over this three-package installation.

`tools\package-lock.json` pins the production provider dependencies. A rebuild requires Node 24.20.0 and the normal Windows C++ build tools for `better-sqlite3`. Use `npm ci --ignore-scripts`, build `better-sqlite3` with **explicit `node-gyp rebuild --target=24.20.0`**, then run OmniRoute's `scripts\build\postinstall.mjs` using Node 24. Merely prepending Node 24 to PATH is insufficient when npm itself resolves Node 25. The ABI mismatch was encountered and repaired during deployment. Normal operation needs no compilation and does not use the development runtime.

`prepare-production.mjs` is a **one-time migration record**, not an everyday launcher. It expects the original backup and unchanged pre-promotion live state, and intentionally refuses an already-promoted installation. Do not rerun it to repair a healthy setup. `reconcile-catalog-labels.mjs` was the one-time correction for copied development connection labels; don't run it after adding genuine production connections without reviewing that change.

## Safe service recovery

First check for active DSH sessions and foreign listeners. For an absent cockpit only:

```powershell
& 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\provider-integration\Restart-Cockpit.ps1' -Action Start
& 'C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Launch-Status.ps1' -NoBrowser
```

This path does not warm or unload LM Studio models. A normal user Halo launcher may warm the tuned pair as previously configured. `Restart-Cockpit.ps1 -Action Stop` refuses active/unknown sessions and validates the owned supervisor/child before stopping the exact tree. Never kill all Node or PowerShell processes.

## Rollback

Pre-promotion backups are at `C:\Users\scott\.dsh\backups\native-provider-promotion-20260902`. `rollback-manifest.json` records exact original targets, backup paths and hashes; `stack` also contains pre-promotion canonical config copies. Verify these hashes before restoring anything.

With explicit operator approval and no active DSH work: stop only the owned cockpit, restore the backed-up settings and web profile package/lock/workspace/patch files to their recorded targets, restore the canonical launcher/config copies, reinstall that restored profile with its pinned package manager/lockfile, then launch and check the prior configuration. The unchanged Mission Control launcher does not need replacing. The new provider process, if no longer needed, must be stopped only after verifying its launcher receipt and owned tree. Keep its private state for recoverability.

**Never restore the entire `.dsh` directory.** Keep all newer sessions, memory, native thread archives, model-selection files and evidence. No destructive live rollback was performed as a release test; backup hashes and a copy-to-scratch rehearsal are the available recovery evidence.

## Verification and limits

See `..\HALO-PROVIDER-PROMOTION-2026-09-02.md` and `evidence`. The 105-test development suite is source/deterministic evidence. The production two-turn Claude/Codex checks prove routing, native continuity and accounting on those tested routes—not all catalog models, subscription entitlement, a new coding benchmark, or a full security audit. Scott's final walkthrough remains the operator acceptance step.
