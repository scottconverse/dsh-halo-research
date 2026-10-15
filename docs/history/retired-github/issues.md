# Retired halo-stack issues

Historical GitHub export, not a current open-issue list.

## #40: 5070ti worker advertises 32768 context but the instance crashes above ~19K

State at export: OPEN · Created: None

Noticed while reviewing #38, pre-existing and not introduced there.

`machines/5070ti.yml` states in its own `facts` block:

> workerNote: cap worker requests <19K ctx (instance crashes above; see issue #5)

But the rendered `settings.yaml` for that box advertises the worker at `contextWindow: 32768`. That is the same failure class #38 just fixed one layer up: the config promises sessions more context than the hardware actually delivers, and the ceiling is discovered by crashing into it rather than by being bounded.

#38 bounded the brain (131072 -> 32768) because master's window was bigger than the box. The worker's 32768 came straight from master and was never questioned, because it happened to look small.

Fix is probably one more replacement in the profile, bounding the worker to something under the measured crash point — but the crash threshold needs confirming on the box first, and whether it is a hard limit or a VRAM-pressure symptom that moves with what else is loaded. Do not guess a number from here; measure it there.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


## #39: Machine profiles inherit master's value changes silently: pin replacement targets like files: does

State at export: OPEN · Created: None

Raised by the 5070ti box in #38, and it is the right diagnosis.

Master changed the brain's `contextWindow` to 131072 / `maxTokens` to 49152. The 5070Ti profile's `replacements` only suffixed identities in that file, so a profile deploy rendered a `settings.yaml` advertising a 131K window on a box whose brain holds 32-40K. Nothing failed — every existing guard passed, because the profile's `find` strings still matched. It was caught by a human reading a `DEPLOY_DRYRUN=1` render.

**The gap:** find-must-exist catches a profile that has ROTTED (master moved the string it patches). It cannot catch a profile that is INCOMPLETE (master gained a value this box must bound and the profile never knew). Those are opposite failure modes and only the first is guarded.

#35 solved this for whole-file swaps with `baseSha256` — pin the base file, fail the render when master's copy moves, force a review. The same idea applies to replacement targets:

```yaml
replacements:
  - file: dsh\settings.yaml
    baseSha256: <hash of master's settings.yaml>   # optional, per-file
    find: ...
```

Design notes for whoever takes it:
- Pin per **file**, not per replacement — one hash per profiled file, checked once.
- Must be opt-in, or every existing profile breaks on merge.
- The failure message has to say *what changed*, not just that a hash moved: print the diff of the base file between the pinned blob and current master, so the reviewer sees the new `contextWindow:` line rather than two hex strings.
- This makes every master change to a profiled file require a profile review. That is the point, but it is friction — it should apply to files where a wrong inherited value is dangerous (`settings.yaml`), not necessarily all of them.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


## #35: Machine profile misses workspace\AGENTS.md: deploy overwrites the scoped version and injects HALO instructions into other agents on the box

State at export: CLOSED · Created: None

Severity: high on any multi-agent machine. Found live on the 5070ti box 2026-08-19.

The 5070ti profile's `replacements` cover settings/cordis/launcher/loaders/opencode but NOT `workspace\AGENTS.md`. The v0.2.0 conversion deploy therefore overwrote the box's scope-guarded AGENTS.md with HALO's original — and `Deploy-ToLive` targets `$U\Desktop\Code\AGENTS.md`, a directory where OTHER agents work (this box runs Codex fleet sessions in Desktop\CODE; Codex reads AGENTS.md as operating instructions).

Observed impact: for ~the period after the conversion deploy, a working Codex session's instruction file claimed it was "running inside the HALO stack" on Strix Halo hardware, with wrong model facts, references to MCP tools it doesn't have, and an LM Studio endpoint that wasn't even running. The operator reported "real issues locally"; this was the live contamination path found.

Fixed locally by restoring the scoped file from the deploy backup (live-drift, documented — same class as issue #14's loaders).

Fix upstream, two parts:
1. Add AGENTS.md handling to the profile system. Line-replacements are the wrong tool for a prose file — add a `files:` section to the profile format (src -> per-machine replacement file), and give 5070ti a machine-correct AGENTS.md (the scoped one is on branch `tester/5070ti`, workspace/AGENTS.md). This also fixes issue #14 the same way (loader file swaps).
2. Regardless of machine: the deployed AGENTS.md should ALWAYS open with the scope header ("HALO-stack sessions only; other agents in this directory: ignore this file") — on HALO it's harmless, on any shared box it's the difference between a config file and a prompt injection into unrelated agents.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## #15: Fleet origin badges inverted on the 5070ti box: local model labeled FLEET/unknown-origin, remote labeled local (+ false alarm)

State at export: OPEN · Created: None

Observed on the 5070ti box immediately after deploying current master (2026-08-19 ~00:25), Overview fleet panel:

- `qwen/qwen3.8-27b-5070ti` → labeled **"idle FLEET/unknown-origin"** — this is the box's OWN local brain (`lms ps` shows it with `deviceIdentifier: null`)
- `qwen/qwen3.8-27b` → labeled **"idle local"** — this is HALO's model, resident on the remote peer (`deviceIdentifier` = the Halo device hash)

The labels are exactly inverted, and the alarm strip fires **"MODELS: fleet load resident: qwen/qwen3.8-27b-5070ti"** — a false alarm against the box's own brain. The Fleet panel's device identification itself is right (this device NvideaBlackwell, peer Halo connected), so the inversion is in the per-model origin attribution — likely keyed off a known-identity list (HALO's identities read as "local") rather than `deviceIdentifier`, which is the field that actually says where a model lives. Suggested fix: badge from `deviceIdentifier` (null → local, hash → the named peer), never from identity names.

Everything else in the new fleet/MC work verified good on this box same session: real 15.9 GiB carveout (issue #2 fix confirmed working), Memory tab graph rendering a foreign memory.json unmodified (2 entities, correct types, observations on click).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### Comment 2026-08-21T00:30:51Z

Still present in v0.5.0, now provable from MC's own API on the 5070ti box (2026-08-20): `/api/status` models[] returns `{"identifier": "qwen/qwen3.8-27b-5070ti", ..., "origin": "FLEET/unknown-origin", "originKind": "unknown"}` for the box's OWN local brain (lms ps deviceIdentifier: null) and `{"identifier": "qwen/qwen3.8-27b", ..., "origin": "local", "originKind": "local"}` for HALO's remote model. The fleet.peers[] block in the same payload has the correct per-device data (Halo's deviceIdentifier hash, its loadedModels list) — so the join between pool models and peer devices is where the attribution inverts. Also note: peer R71 now appears; whatever fix lands should handle N peers, not two.

## #14: Machine-profile deploy renders the vendored-SDK loaders; they fail at runtime on port boxes (public SDK 1.5.0)

State at export: CLOSED · Created: None

Validation the 5070ti profile asked for, run on the box 2026-08-19 (~00:24): `MACHINE=5070ti DEPLOY_FORCE=1 Deploy-ToLive.ps1` — every deploy stage green (freshness, render 18 replacements, validate, apply, marker, register, audit all PASS). Then the runtime test failed exactly where predicted:

`node ~\.lmstudio\scripts\Load-OpenCode-Qwen.mjs` →
`Error: Qwen load profile mismatch: [{"name":"gpu.ratio","wanted":"max"},{...every field, actual undefined...}]`

Root cause: the profile's replacements patch the loader's **values**, but the rendered file is still HALO's loader **mechanism** — it imports `./vendor/node_modules/@lmstudio/sdk` and (a) passes config keys the public SDK 1.5.0 drops on the floor (`speculativeDraftMtp`, `contextCheckpoints`, `physicalBatchSize`, `maxParallelPredictions`, …silent, no error), and (b) verifies via `model.getLoadConfig()`, which in 1.5.0 returns a KVConfig shape where every field reads undefined → the assert throws → the loader **unloads the brain it just loaded**. HALO's vendor dir has a newer private SDK; a port box that npm-installs the SDK gets 1.5.0 (current public latest) and hits both problems.

Fix options, in preference order:
1. Commit public-SDK-compatible loader variants to the repo and have the machine profile swap the loader **file** (add a `files:` section to the profile format: src → replacement-src) instead of patching lines inside a mechanism that doesn't port. Working 1.5.0-compatible loaders exist: branch `tester/5070ti`, `lmstudio/Load-OpenCode-Qwen.mjs` / `Load-Worker-Coder.mjs` — they inject the newer wire fields through a `loadConfigToKVConfig` patch and verify via `lms ps --json` (the stack's own truth source) instead of `getLoadConfig()`.
2. Vendor the exact SDK build into the repo so every machine gets the version the loaders assume.

Interim state on the 5070ti box: everything else from the profile deploy is live and working (Memory graph tab renders this box's memory.json — portability proven; real 15.9 GiB carveout; audit stages); the two loaders were restored from the deploy's own backup (1.5.0-compatible versions), with the worker identity hand-aligned to the profile's new `qwen3-coder-30b-a3b-instruct-5070ti`. So the box works, but its loaders are live-drifted from what the profile renders until this is fixed — the profile's own STATUS note ("not yet validated on the box") can now cite this issue.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### Comment 2026-08-20T06:18:18Z

The `files:` mechanism this issue asked for (fix option 1) landed in #36, built for #35.

```yaml
files:
  - file: lmstudio\Load-OpenCode-Qwen.mjs
    from: machines\files\5070ti\Load-OpenCode-Qwen.mjs
    baseSha256: <hash of master's file at authoring time>
```

Rules the deploy enforces: the swap source must exist, the target must be a deployed file, and a file may be swapped **or** line-replaced, never both — so the 14 loader `replacements:` in `machines/5070ti.yml` must be deleted in the same change that adds the loader swaps, otherwise the deploy refuses the profile.

`baseSha256` is the rot guard: a whole-file swap means the port box stops inheriting base improvements to that file, so the deploy fails (naming both hashes) once master's loader moves. That matters more for the loaders than for AGENTS.md — the base loaders are where window/KV/MTP work lands.

Not done here, deliberately: the 1.5.0-compatible loaders on `tester/5070ti` predate the 131,072 + KV q8_0 window adoption, and their runtime failure mode (`getLoadConfig()` returning undefined fields) can only be reproduced on a box with the public SDK. Pulling them in from HALO would prove the swap mechanism and nothing about the loaders. That work belongs on the 5070Ti box:

1. `git pull` (its clone is stale) and re-author both loaders against current master.
2. Copy them to `machines/files/5070ti/`, add the `files:` entries, delete the overlapping loader `replacements:`.
3. `$env:DEPLOY_DRYRUN='1'; $env:MACHINE='5070ti'; .\scripts\Deploy-ToLive.ps1` to see the exact rendered bytes without touching the box.
4. Real deploy, then `node ~\.lmstudio\scripts\Load-OpenCode-Qwen.mjs` — the runtime proof this issue is actually about.

Leaving open for that.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


## #6: Parameterize machine-specific config into per-machine profiles (one master serves every box)

State at export: CLOSED · Created: None

Follow-up to the 5070Ti port (branch `tester/5070ti`): the port required editing seven files because machine-specific values are baked into shared config — model identity, GGUF path/quant, context length, KV cache type, MTP on/off, display names, and hardware facts in AGENTS.md.

Proposal: extract those into a per-machine profile file (e.g. `machines/halo.yml`, `machines/5070ti.yml` — identity, model path, quant, ctx, KV, MTP, engine notes), and have `Deploy-ToLive.ps1` render/select the right values at deploy time (a `MACHINE` env var or a marker file in `~\.dsh`). Then:

- `master` serves every box; no per-machine branches drifting apart
- the launcher/loaders/settings.yaml/cordis.patch.yml/opencode.json become templates or read the profile
- AGENTS.md gets a machine-facts section generated from the profile
- portable fixes (like PR #1) land once and every machine inherits them

The 5070Ti values that would populate the second profile are all measured and recorded in `TESTER-5070ti-bench.md`. Suggested owner: HALO coder session, since Deploy-ToLive and the config layering are its home turf and every change must keep the live HALO deploy working.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### Comment 2026-08-19T06:03:08Z

Implemented in PR #10 as base+overlay rather than templates: master stays HALO-canonical (byte-for-byte deploys, Sync-FromLive symmetric), non-HALO boxes deploy with MACHINE=<name> and the deploy renders machines/<name>.yml literal replacements with fail-loud rot detection. machines/5070ti.yml captures the full port adaptation (18 replacements, render-tested against current master, rendered loaders pass node --check). Remaining validation: the Blackwell box's first MACHINE=5070ti profile-driven deploy - its drift guard will correctly flag the hand-adapted live files; DEPLOY_FORCE=1 is the documented conversion path for that one deploy.

## #5: Advisory for 16GB-class deploys: worker (Coder MoE Q4_K_S) crashes at ~19.5K+ context; brain eviction JIT-reloads with wrong config

State at export: CLOSED · Created: None

Two operational findings from running the stack on a 16 GiB VRAM CUDA box — no HALO change strictly required, but both belong in the stack's documented knowledge and affect any future smaller-box deploy:

1. **Worker long-context instability.** Qwen3-Coder-30B Q4_K_S (16.3 GB weights, ~4.6 GB forced into the GPU shared pool on a 16 GB card) is rock-solid in its fan-out role — three consecutive two-bug repair tasks at 2.5–3.1 s each (vs 41 s on HALO) — but **reliably killed its instance on ~19.5K-token requests** (3 deaths across 3 load configs, sha256-verified file; the repeated crashes eventually took the whole LM Studio engine host down). Recommendation: on 16 GB boxes cap worker requests well below 19K context, or use a Q3-class MoE quant that fits VRAM entirely.

2. **Eviction silently downgrades the brain.** When the brain gets evicted (worker load, memory pressure), the next API call JIT-reloads it with LM Studio's remembered/default settings, not the loader profile — measured 17.5 tok/s vs 49 tok/s on the 5070Ti box. PR #1's launcher re-check covers icon-clicks; anything long-running that talks to the model after an eviction still gets the degraded instance. Worth a note in the USER-MANUAL, and possibly a Mission Control alarm (loaded config != loader profile).

Bonus finding, same session: this LM Studio build **auto-sizes context to leftover VRAM** (requested 32768 → applied 32000 with f16 KV, 40448 with q8_0 KV). HALO's loader asserts contextLength === 65536 exactly; if HALO ever updates LM Studio, that assertion may start failing for this reason rather than a real misconfiguration.

Context and full numbers: `TESTER-5070ti-bench.md` (branch `tester/5070ti`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### Comment 2026-08-19T05:56:49Z

Both halves done in PR #9: the 16GB-class advisory is in the manual Porting section (worker <19K cap with the crash record, JIT-reload trap with the measured numbers, context auto-sizing note incl. the 65536-assertion warning), and Mission Control now alarms MODELS amber when the loaded local brain diverges from the loader profile - expectation parsed from the deployed loader script itself, so ported boxes inherit the correct check with zero config.

## #4: Clean-machine rebuild order is broken: Deploy-ToLive needs js-yaml that only exists after dsh has run

State at export: CLOSED · Created: None

README's rebuild recipe says: install Node/LM Studio/models → run `scripts\Deploy-ToLive.ps1` → launch. On a genuinely clean machine this aborts at pre-validate: the script borrows js-yaml from `~\.dsh\profiles\node_modules\js-yaml` (doesn't exist before first dsh run) or from a **hardcoded npx cache hash path** (`2ede61d9d1d3d32e` — machine-specific, won't exist elsewhere).

Confirmed during the 5070Ti clean install; workaround that worked: run `npx @deepseek-ai/dsh@0.1.0-rc.7 web --dump-config` once (bootstraps `~\.dsh\profiles` incl. js-yaml), then deploy.

Suggested fixes (either): document the bootstrap step in README's rebuild order, or make the script self-sufficient (glob the npx cache instead of a fixed hash, or fall back to bootstrapping the profile itself).

Also worth folding in: two smaller portability traps from the same session — the deploy target `$U\Desktop\Code\AGENTS.md` assumes that folder is HALO-only (on a shared box other agents read AGENTS.md; the 5070Ti port added a scope header), and PS 5.1 misparses BOM-less UTF-8 punctuation in deployed .ps1 files (keep them ASCII or save with BOM).

Context: `TESTER-5070ti-bench.md` (branch `tester/5070ti`), "Findings from the real install."

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### Comment 2026-08-19T05:45:53Z

Follow-up from completing the 5070Ti install: the rebuild spec is currently scattered across three sources — README's rebuild recipe, Deploy-ToLive's printed output (subagent plugin command), and the USER-MANUAL's system-state table (LM Studio 'runs as a service at login', the 'HALO Memory Snapshot' scheduled task). Deploy-ToLive performs none of the last two, and following README+deploy alone leaves them silently missing — exactly what happened on the 5070Ti port (caught by the operator, not the checklist). Suggestion: one canonical install checklist in the README that enumerates every step including the manual ones, or extend Deploy-ToLive to register the scheduled task and print the login-service step.

## #3: Mission Control: federated remote models get live Load/Unload buttons, indistinguishable from local

State at export: CLOSED · Created: None

With LM Studio federation active (a second device linked), Mission Control's Models tab lists the **remote device's models mixed into the local list, with working Unload buttons**. During the 5070Ti port, HALO's own actively-generating brain appeared in the 5070Ti box's Mission Control with an Unload button — one click from a remote operator would have killed a live session on this machine.

`lms ps --json` provides `deviceIdentifier` per model; the Models tab should (a) badge remote models with their device, and (b) either disable destructive actions on them or require an explicit confirm naming the device.

Also cosmetic but related: the "Load Brain (Q5)" button label is hardcoded; after the 5070Ti adaptation the underlying loader loads a Q3 — label should come from the loader/config, not a string.

Context: `TESTER-5070ti-bench.md` (branch `tester/5070ti`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### Comment 2026-08-19T05:50:56Z

Fixed on master: 335ed3e badges every loaded model with its origin (resolved via lms link status --json deviceIdentifier->name mapping, not the identity-suffix hint), removes Load/Unload controls from remote fleet models in the Models tab, and adds a server-side guard - the unload endpoint returns 403 for any model whose deviceIdentifier is non-null. Tested against the live NvideaBlackwell model in the pool: refused, model untouched. PR #7 closes the cosmetic remainder: quick-action labels now derive from the deployed loader scripts' GGUF paths instead of hardcoded quant strings.

## #2: Mission Control: GPU carveout math hardcodes 128 GiB unified memory

State at export: CLOSED · Created: None

On any machine that isn't Strix Halo, Mission Control's memory-pool panel computes nonsense: on a 16 GiB discrete-VRAM box (RTX 5070 Ti, 31.6 GiB system RAM) the Overview tab showed **"GPU dedicated 14.9 / 96.4 GiB carveout"** — the 96.4 comes from `MACHINE_TOTAL_RAM = 128 GiB` minus `os.totalmem()`, a computation that only means something on a unified-memory APU.

The code already refuses to hardcode the VGM *split* ("do NOT hardcode a fixed 64/64 number, it drifts") — the same reasoning applies to the 128 GiB total itself. Suggested fix: detect total from the system, and detect discrete-vs-unified (e.g. nvidia-smi present → use real dedicated VRAM as the denominator; the shared-pool alarm logic already works fine on discrete cards and should be kept as-is — it correctly flagged real spill events during the 5070Ti port).

Everything else in MC worked on foreign hardware: services panel, engine detection, alarm strip, session/plugin tabs. This is the one broken number.

Context: `TESTER-5070ti-bench.md` (branch `tester/5070ti`), section "Findings from the real install."

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### Comment 2026-08-19T05:50:55Z

Fixed on master (335ed3e): carveout no longer assumes 128 GiB — GPU capacity is read from the display driver registry (qwMemorySize; reports true VRAM on discrete cards and the VGM carveout on the APU), with an APU total-minus-visible fallback and an explicit 'carveout unknown' UI state instead of invented numbers. Verified live on HALO (reads 64.2 GiB, matching the VGM split). The shared-pool alarm logic was kept as-is per this issue's note.
