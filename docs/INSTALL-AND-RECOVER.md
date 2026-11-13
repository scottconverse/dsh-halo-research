# Install, update and recover DSH

Current source synchronization: November 13, 2026. Halo Web/Desktop are rc.1; see the [final upgrade and recovery record](HALO-UPGRADE-AND-INSTALL-FINAL-2026-11-13.md). Installer pins below describe separate artifacts. This repository has both portable
installation sources and snapshots of Scott's installed Halo configuration. They
serve different purposes. A clone does not copy accounts, model weights or history.

## Choose the right installation

| Need | Source | Scope |
|---|---|---|
| New Windows x64 machine, full setup | `stack/complete-windows` | Web, extracted official Desktop, Mission Control, private Ollama, Wigolo, Reddit/Redlib, XERJ, optional signed-in Claude/Codex, triad and shared-library skills |
| Web with DeepSeek cloud only | `stack/portable-cloud` | Node24+/npm, separately signed-in Ollama Cloud; no local model weights or Halo paths |
| Understand/recover this Halo installation | Profile mirrors and deployment references below | Exact machine references; relocate paths and supply your own accounts, never blindly overwrite another home |

The current complete installer is **0.1.2**, pinned to Web/Desktop **DSH0.2.2-rc.1**, with embedded Desktop Mission Control. [Download](../stack/packages/DSH-Complete-Windows-0.1.2.zip), [checksum](../stack/packages/DSH-Complete-Windows-0.1.2.zip.sha256), [verification](DSH-COMPLETE-WINDOWS-0.1.2-2026-11-13.md). Published
v0.3.12/v0.3.13 installer ZIPs remain the original 0.1.0/rc.3 artifacts. They have
not been silently replaced, rebuilt, re-signed or given new acceptance claims.

Build from a clean checkout using Node24+ (choose NEW output paths):

```powershell
node stack/complete-windows/build.mjs --output C:/DSH-bundles/complete-0.1.2
# On the destination Windows machine, in the generated bundle:
# .\Install-DSH.cmd
# Or PowerShell7: .\Install-DSH.ps1 -Destination "$env:LOCALAPPDATA\DSH-Complete-New"
```

For the smaller cloud-only source bundle:

```powershell
node stack/portable-cloud/build.mjs --output C:/DSH-bundles/cloud-0.1.1
# In that generated bundle, with standard Node24+/npm installed:
# node install.mjs --dest C:/DSH-Cloud-New
# node C:/DSH-Cloud-New/start.mjs
```

Read each installer's README for download prerequisites, ownership, resume behavior,
ports, account sign-in, native build dependencies and start/stop controls. This is
an online dependency installer, not a model-weight-inclusive offline image. Full
Windows is x64; other operating systems are not claimed for that installer.

The source creates an empty private `knowledge-library` plus two native ingest/query
skills under the NEW installation. Web/Desktop in the complete setup share it.
If you later move an installation directory, update the library path in your two
copied skills as well; moving profiles alone does not rewrite Markdown skill paths.
No original notes, private receipts or seed corpus are bundled. Existing library/skill
folders are refused. No new agents, scheduled tasks or automatic ingestion are added.
The two skills read selected material through the chosen chat model; cloud use sends
that selected context to its provider. Keep secrets out of ingested sources.

## Installed Halo reference map

| Installed surface | Repository reference |
|---|---|
| Web root overlay | `stack/stock-dsh/cordis.patch.yml` |
| Web native profile and dependencies | `stack/stock-dsh/web-profile/` |
| Desktop root overlay | `stack/desktop-tuning/home.cordis.patch.yml` |
| Desktop profile/empty root/dependencies | `stack/desktop-tuning/cordis.patch.yml`, `desktop-profile.cordis.yml`, `desktop-profile.package.json`, `desktop-profile.pnpm-*` |
| Desktop launcher | `stack/desktop-tuning/Launch-DeepSeek-Harness-Evaluation.vbs` |
| Shared triad | `stack/three-role/` (existing live bounded-run evidence retained) |
| CLI adapters / research hook | `stack/provider-integration/`, `stack/desktop-tuning/research-tool-hook.mjs` |
| Model routing, native skills | `stack/stock-dsh/skills/` |
| Six installed rc.5 archive fixes | `stack/desktop-tuning/rc5-halo-patches/` with mandatory per-file hashes and plan-only recovery command |
| Exact deployed Mission Control variant | `stack/deployment-reference/halo-2026-11-05/mission-control/` |
| Optional Qwen sampling hook | `stack/deployment-reference/halo-2026-11-05/{web,desktop}/plugins/` |
| Saved Strata arguments and DSH route | `stack/deployment-reference/halo-2026-11-05/strata-reference.json` (relocated path variables, no key) |

Profile mirrors retain actual machine paths so the configuration is understandable;
the generic installers generate paths beneath their own NEW root. `settings.yaml`
and older dated configuration sections are historical references, not the current
Cordis deployment or instructions to replace current settings.

Canonical Mission Control source contains portability changes beyond the installed
variant. Both are retained deliberately: use canonical source for new installations;
do not mistake its hash for proof of deployed behavior. The one-off owner goal-limit
command is archived as an inert reference with the old goal identity removed. It is
not installed by either installer and does not authorize resuming/resetting a goal.

## Models and hardware

This Halo's saved Local Qwen route is Medium, context131072, output32768 through
Strata on127.0.0.1:8081. **Strata remains intentionally off** after a Windows commit
pressure incident. A configured route is not an available server. Do not autostart
this large model merely by restoring the profile. Physical free RAM is not commit
headroom; evaluate the whole workload/pagefile and protect production services.
The saved launch arguments are a reference, not proof the model fits every Halo PC.

The generic full installer retains its bounded Ollama model choices (16K context,
4K output) rather than silently forcing this Strata workload onto another machine.
DeepSeek1017 remains Low/1M context/64K output/70% compaction. Strata, LM Studio,
Factory and other external harness accounts are separate from the DSH installer.
No macOS signing or universal hardware compatibility is claimed.

## Updates and recovery

1. Preserve the current home/profile, dependency locks, application archive, private
   library and receipts locally. Do not upload credentials, raw sessions or goal data.
2. Review the dated implementation/evidence for the intended version. Stage a NEW
   install to compare configurations; neither installer is an in-place migration.
3. Only move a running host to new source at genuine host/job idle. Do not kill jobs,
   rewrite live profiles, auto-resume goals or replace an active Desktop archive.
4. Keep custom paths, accounts and native user edits explicit. Restore only the
   affected files from your own known-good recovery if needed.
5. Desktop's official updater can overwrite bundled repairs. The rc.5 recovery tool
   validates original file hashes and writes a separate output only; it refuses a
   mismatched version. Installing that output needs an ordinary idle restart and
   applicable verification. The complete installer extracts official Desktop and
   does not silently patch it with Halo-only archive edits.

Excluded from public Git: credentials/environment secrets, account sessions, raw
conversations, live goals/inboxes, Mission Control history/state, private library,
model weights, caches and unrelated personal/global skills. Install optional skills
and accounts from their maintained sources; a private home is not a public template.

## Evidence limits

[Source synchronization report](HALO-DSH-IMPLEMENTATION-2026-11-05-CONFIG-SYNC.md)
and its sanitized receipts separate source checks from installed acceptance. Existing
rc.5 Desktop/Web and triad acceptance are reused, not rerun. Current source packaging,
lock alignment, path rendering, refusal behavior and exact archive transformations
were checked locally without starting hosts or calling models. A clean-PC end-to-end
0.1.1 install and every external account connection remain unverified; these are
coverage limits, not invented blockers on keeping this reference repository current.
