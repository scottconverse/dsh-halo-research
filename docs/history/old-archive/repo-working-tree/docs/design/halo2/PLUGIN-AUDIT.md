> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../../../README.md).

# Plugin-catalogue audit — what HALO built that the harness already ships

**Date:** 2026-08-23 · **Catalogue:** 224 `@deepseek-ai/*` packages · **Composition checked against:** live `--dump-config` for profile `web`, dsh `0.1.1-rc.2`

## Why this exists

HALO 2.0's founding rule, written in its own spec:

> Build only what the harness verifiably lacks — and the verification is now done (§3).

The verification was **not** done. The catalogue had never been enumerated. This
audit is that enumeration, and the answer is that several HALO components
re-implement shipped, already-mounted capability — in one case to compensate for
a protection HALO itself switches off.

Method: list every `@deepseek-ai` package from the npm registry, then check what
the live profile actually composes. A package existing is not the same as it
being mounted, so every verdict below cites the composed config, not the name.

---

## Finding 1 — Containment: the wall exists, is mounted, and we disable it

**This is the significant finding and it inverts the story I have been telling.**

The harness ships a complete process-sandbox stack, and HALO **already composes
all of it**:

| Composed row | Package | What it does |
|---|---|---|
| `sandbox` | `dsh-sandbox-local` | Local backends — bwrap, landlock-run, macOS Seatbelt, **and the Windows ACL restricted-token runner**. Functionally probed, **fail-closed**. |
| `sandbox-policy` | `dsh-sandbox-policy` | Per-call policy resolver; per-session mode and workspace root |
| `bash-sandbox` | `dsh-bash-sandbox` | **Confines every command** via `ctx.sandbox`, reports denial/enforcement facts |
| `pwsh-sandbox` | `dsh-pwsh-sandbox` | The same for PowerShell |
| `fs-sandbox` | `dsh-fs-sandbox` | Filesystem seam under the sandbox |

It also ships three permission presets, composed and ready:

```yaml
read-only:           { sandbox: read-only,           approval: ask }
workspace-write:     { sandbox: workspace-write,     approval: ask }   # <- harness default
danger-full-access:  { sandbox: danger-full-access,  approval: never }
```

And `dsh/Start-DSH.ps1:186` does this:

```powershell
$env:DSH_PERMISSION_MODE = 'danger-full-access'
```

**So every session — including every Large-Job Protocol child — runs with
confinement set to full access and approvals off.** The harness's own default is
`workspace-write`. HALO opts out of it globally, at launch.

What was then built on top of that choice:

- `dsh/agent-presets/halo-ljp/` — a preset that strips the external-provider
  subagent rows, described in the spec and the build log as "the wall".
- The E5 tripwire in `scripts/halo/Halo-Coverage.ps1` — a substring scan looking
  for evidence that a child escaped to an authenticated CLI.

Both exist to detect and limit escapes past a sandbox **that ships, is mounted,
works on Windows, fails closed, and that we turned off ourselves.** The tripwire
is a smoke detector installed under a sprinkler we shut the valve on.

**Fix (config, not code):** run LJP children under `read-only` or
`workspace-write` instead of inheriting `danger-full-access`. Then containment is
enforced by a fail-closed OS-level mechanism that reports enforcement facts,
instead of inferred from a substring scan of logs nothing writes.

**Verdict: DELETE the tripwire's role as the guarantee. KEEP `halo-ljp` (defence
in depth is fine). CHANGE the permission mode for children.**

---

## Finding 2 — Hermes: mostly shipped, and the missing piece is one line

The plan deferred building "Hermes", a bounded operations plane, because the
harness scheduler was believed to be session-scoped.

| Need | Ships as | Composed today? |
|---|---|---|
| Durable `after` / `at` / fixed-rate reminders over the session event log | `dsh-schedule` | **No** |
| Background job registry: owner isolation, polling, cancellation, completion listeners | `dsh-jobs` | Yes |
| Model-facing job control (`job_output`, `job_list`, `job_kill`) | `dsh-tool-jobs` | Yes |
| Skill provider registry | `dsh-skill` | Yes |
| Goal state and lifecycle | `dsh-goal` | Yes |
| Fresh-agent Ralph loop | `dsh-tool-ralph` | Yes |
| Codex-style hook config bridge | `dsh-hooks-codex` | No |

**Verdict: RETIRE the Hermes plan.** Background jobs, skills, goals and loops are
already mounted. The one genuine gap — durable scheduling — is `dsh-schedule`,
which is a composition row, not a subsystem to build. The claim that the
scheduler is session-scoped needs re-testing against `dsh-schedule`, whose own
description says durable over the session event log.

---

## Finding 3 — The Large-Job Protocol partially re-implements shipped context control

| HALO component | What it does | Shipped equivalent | Composed? |
|---|---|---|---|
| `Halo-Size.ps1` | Estimates tokens as bytes / 3.5 | `dsh-token-meter` — replay-aware **measurement** service | **Yes** |
| `Halo-Plan.ps1` | Packs units carrying file *references*, never bodies, to keep the window small | `dsh-spill` + `dsh-spill-policy` — replaces oversized tool results with a preview plus a retrieval locator | **Yes** |
| Manual compaction budgets | Tuned `settings.yaml` values | `dsh-compaction-basic`, `dsh-compaction-tool-result-pruner` | Yes |

HALO estimates what a mounted service measures. The bytes/3.5 heuristic is the
weakest number in the whole protocol and there is an exact one available.

**Verdict: KEEP the decomposition and the coverage gate** — deciding "done"
mechanically from artifacts on disk is not in the catalogue and looks genuinely
novel. **REPLACE the token estimate with `ctx.tokenMeter`.** **RE-EXAMINE** whether
unit packing is still needed once spill is doing its job, or whether it is
duplicated effort.

---

## Finding 4 — Mission Control: the architecture is justified, several parts are not

The spec's defence of MC is sound and stands:

> MC stays an external watchdog, never a cockpit plugin: the 4h41m stall was
> diagnosed *only* because MC lived outside the wedged harness.

That argument justifies MC's **existence and location**. It does not justify
hand-rolling everything inside it.

| MC does | Shipped equivalent | Composed? |
|---|---|---|
| Polls and derives session statistics | `dsh-session-stats` | **Yes** |
| Reads/parses session state for display | `dsh-session-log-export` | **Yes** |
| Would need transcript capture for containment evidence | `dsh-session-log-export`, `dsh-session-telemetry` (+ OTel backend) | export yes, telemetry **no** |
| Model list, load/unload with a context box | `dsh-client-ui-model-selection`, `dsh-client-ui-settings-models` | **Yes, in the cockpit** |

**Verdict: KEEP MC as the external watchdog. STOP hand-rolling its data layer** —
consume `dsh-session-stats` and `dsh-session-log-export` rather than re-deriving.
Note that the "add a model switcher" item from the spec is **already delivered by
the cockpit** via `dsh-client-ui-model-selection`; MC's own switcher is a second
implementation of it.

---

## Finding 5 — Session log export is mounted, so containment evidence was always available

`Halo-Coverage.ps1` scans `runs/<id>/logs/*` and reports
`unverified-no-evidence` because nothing writes those logs.

`dsh-session-log-export` **is composed right now**. dsh also already persists
transcripts to `~/.dsh/sessions/<cwd>/session-<id>/session.jsonl.zstd`.

The evidence the containment check needs has existed on disk the whole time. The
missing piece was never a writer — it was knowing the exporter existed.

**Verdict: HARVEST via the shipped exporter.** Do not write a bespoke logger.

---

## What is genuinely HALO's own

Not everything is duplication. These have no catalogue equivalent and should stay:

- **The coverage gate** — deciding completion mechanically from artifacts rather
  than from a model's claim.
- **The mutation harness** — 44 historical defects, each required to turn its own
  test red.
- **Machine profiles and the transactional deploy** — hardware-specific rendering,
  the clean-clone first-run gate.
- **Model lifecycle pinning and verification** — loader profiles, quant/context
  assertions (currently defective, see F-1/F-4, but the concept is HALO's).
- **The bench and measurement record.**

---

## Corrections this audit forces on published claims

1. **"The restricted preset is the wall."** It is not, and never was. The wall is
   the sandbox stack, which HALO disables at launch. Says so in the spec, the
   build log, `G1-EVIDENCE.md`, and `SKILL.md`.
2. **"Closing the shell path is still open work / needs a design job."** It needs
   a permission mode, not a design.
3. **"Hermes is deferred because nothing provides it."** Most of it is mounted.
4. **"Build only what the harness verifiably lacks — the verification is now
   done."** The verification had not been done. It is done now, here.

---

## Order of work this implies

1. Run LJP children under a confined permission mode; re-run G1 and record a real
   containment verdict from enforcement facts.
2. Correct every published claim listed above.
3. Compose `dsh-schedule`; retire the Hermes plan.
4. Replace the bytes/3.5 estimate with `ctx.tokenMeter`.
5. Harvest containment evidence through `dsh-session-log-export`.
6. Re-examine unit packing against `dsh-spill`.
7. Point MC at `dsh-session-stats` / `dsh-session-log-export` instead of re-deriving.
