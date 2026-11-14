# Installer0.1.2 instructions on the landing page — November13,2026

Scott authorized adding the checksum verification command and installation instructions to the landing page, publishing and verifying headlessly while preserving his working installation and keeping models unloaded.

## Implemented

The installation section now shows a directly copyable PowerShell `Get-FileHash` command for the installer0.1.2 ZIP in Downloads, the full expected SHA-256, and instructions to compare against the downloaded checksum file before continuing. It explains how to adjust the download path, extract to a new folder, run Install-DSH.cmd, preserve the existing installation and select a new installation destination. It describes online setup, normal Windows elevation/restart requirements, separate accounts/models, and XERJ embedding startup behavior. The full guide now links the INSTALLATION.md asset from releasev0.3.14.

The existing command-copy behavior now supports both commands with per-command status and a manual-copy fallback when clipboard permission is unavailable. Commands remain plain selectable text without JavaScript. CSS wraps commands and the hash within narrow screens. No installer, release asset, app, profile or model setting changed.

## Executed checks

- Build and affected deployment checks passed: exact release assets, expected checksum from the accepted .sha256 file, an exact single-line PowerShell command, guide URL, versions, anchors and assets under root/project hosting.
- Actual headless built-site checks passed at1440×1050,820×1100,390×844, with both command buttons copying exact expected strings, keyboard/mobile/skip navigation, no-JavaScript instructions and menu, clipboard-denied fallback,154text contrast checks, ten public links, and no pageerrors/HTTPfailures/overflow.
- Installation-section captures visually inspected. Section captures temporarily hide fixed navigation during capture to avoid screenshot-only overlap; the site itself is not changed by this capture styling.
- One initial test found formatter-introduced whitespace in the command. Kept the command as one raw source line and added an exact-copy regression check; final checks above passed. Screenshot focus/scroll preparation was adjusted to keep captures useful after keyboard checks. Browser/server closed after acceptance.

[Built-site receipt](evidence/landing-installer-instructions-2026-11-13/built-site-verification.json). Existing installer/app/signature/model acceptance is reused; no installation or inference is needed for this website change.

## Publication and preservation

Use the existing normal PR/CI and explicit master Pages deployment, then compare all live assets with the tested build and verify the actual live instructions, copy buttons, release guide and installer/checksum through headless Chromium. Final run identity and live receipt are retained in STATE.md and Halo Stack Research reading/recovery records. Live site: https://scottconverse.github.io/dsh-halo-research/#install.

Current Codex/OpenAI session, serial execution; no subagents, model jobs, app hosts, native desktop input or working-installation changes. Source changes stay in the isolated publication checkout. The accepted installer ZIP/release assets and original recovery material remain untouched.
