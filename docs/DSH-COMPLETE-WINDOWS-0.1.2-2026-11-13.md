# Complete Windows installer0.1.2 — rc.1 and embedded Desktop Mission Control

November13,2026. This updates the existing complete Windows installer to Web and official Desktop0.2.2-rc.1 and embeds full Desktop Mission Control. It preserves the existing installer model choices, DeepSeek1017 Low, triad/shared-library features, separate provider account onboarding and owned-process recovery. Companion component pins are unchanged; this is not an unrelated companion-upgrade release.

## What changed

- All official DSH runtime dependencies and the Desktop download now pin0.2.2-rc.1; npm lock resolved from a fresh peer graph. Installer/bundle version0.1.2.
- The exact official Desktop artifact is checksum-pinned. Existing cached official installer and newly extracted executable independently have Valid Authenticode from Hangzhou DeepSeek Artificial Intelligence Co., Ltd. Official artifact URL returnedHTTP200/293425336bytes. No NSIS installer, Desktop main window, protocol registration or updater was executed during verification.
- Bundler includes all five runtime files of embedded Mission Control and binds its iframe to private3191. Desktop profile supplies its own authenticated host connection, deployment root, separate settings mirror, version and private Ollama endpoint.
- Defaults now use Web3180/browser dashboard3190/embedded Desktop dashboard3191/Ollama11435/XERJ9202/Redlib18082. Web dashboard resolves its configured host/port, including mux sockets, rather than Halo3080/3090. Existing Halo defaults stay unchanged when no override is supplied.
- Desktop dashboard state is separate from Web. Ollama-only installations do not run automatic LM Studio recovery. Live and recovery Desktop profiles are separate so transactional settings edits do not target one file twice.

## Verification and evidence

[Headless acceptance](evidence/complete-windows-0.1.2-2026-11-13/headless-acceptance.json) used a NEW owned payload root, a clean963-package npm ci using the lockfile and normal build allowlist, the newly extracted official Desktop, generated Web/Desktop profiles, and headless Chromium. Both hosts reportedrc.1. Authenticated Web app and browser dashboard passed. Desktop embedded all seven tabs on3191, with214plugins/179active/35disabled/zero failed, stuck, waiting or transitioning. No page errors, inference/model requests or configuration mutations. Monitored working installation profiles/executable remained byte-identical. All owned hosts became terminal and3180/3190/3191 listeners closed; Desktop host exited0.

To honor no-model verification, the test-only profiles disabled XERJ/Wigolo MCP startup and session title inference, and used an owned metadata-only Ollama stub. Production generated profiles retain the intended companion integrations. No account-backed calls, model downloads or inference were attempted. Full fresh-PC prerequisite/Redlib provisioning and model/GPU quality were not repeated or claimed; prior unchanged-stage evidence remains historical. This was changed-payload/headless acceptance on the existing Halo PC, not a fresh-PC install.

Five installer tests and six embedded-dashboard tests pass, including private host/profile binding and the generated availability probe. Eighty-one affected Web dashboard UI/data contracts pass; PowerShell ownership regression/parsing retained. Native Web and Desktop host acceptance adds behavior evidence beyond syntax/unit checks. npm reported only two blocked upstream preinstall echo/no-op scripts; native host functionality passed without widening the script allowlist.

## Failures corrected

The reused rc.5 lock caused a Cordis peer mismatch; a clean rc.1 resolution fixed it without --force or --legacy-peer-deps. The first headless locator used incorrect label capitalization. The portable dashboard generator then exposed a self-recursive availability probe; its replacement was corrected and a behavioral regression test added. One attempted recheck started before the fixed payload was copied; final acceptance used the verified corrected file. Recovery test mocks were updated with the new explicit origin/Ollama-only constants. All failures are superseded by the terminal passing checks, not counted as passes.

## Delivery and recovery

The online installer ZIP/checksum are under stack/packages. It contains public source/locks/manifests/scripts only; applications download from checksum-pinned upstream URLs. Existing v0.3.12/v0.3.13 releases/assets/tags remain immutable; no new GitHub release was created, and no user-owned executable was built or re-signed. Existing official Desktop signatures were independently verified.

Install to a NEW destination. Existing destinations are refused; resume verifies the same bundle hash. Keep the old installation and its data/shortcuts until the new one is accepted. Do not copy a different bundle over an interrupted installation. Stop only processes whose executable, command and creation time match that installation's receipt. The three shortcuts and their separate actions remain part of the new installer. Normal host startup may start XERJ's embedding service; no such startup was used for this no-model verification.

Source was changed in an isolated checkout. Working Halo source/runtime/profile files and existing isolated installation were not updated, stopped or restarted. Current Codex/OpenAI session worked serially, no subagents or local models. Local raw receipts/logs and test-only profile backups remain outside public Git. Research reading records/recovery snapshots and STATE.md are synchronized for delivery.
