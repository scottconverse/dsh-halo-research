> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Halo Old Archive — readable index

Generated 2026-08-23. Every row points at the file in this folder that holds
the full record. Raw JSON is the authority; this page exists so a person can
find things without opening 200 files.

## Where things are

| Looking for | Go to |
|---|---|
| The code, any version, any branch | `repo-mirror.git/` — clone it |
| The files as they last stood | `repo-working-tree/` |
| What a change did and why | `github/pull-patches/pr-N.patch` + the rows below |
| A bug or task that was open | `github/issues.json`, and the issue table below |
| The running stack as deployed | `live-deployment/` |
| CI history | `github/workflow-runs-full.json`, logs in `github/workflow-logs/` |
| The built public website | `github/artifacts/` (zips of the Pages build) |

## Pull requests (37 total, 36 merged)

Each has six JSON files in `github/pulls/` (`pr-N.json`, `-commits`, `-files`,
`-review-comments`, `-comments`, `-reviews`) and a full diff in `github/pull-patches/`.

| # | Title | State | Merged | Diff |
|---|---|---|---|---|
| 47 | HALO 2.0 WP1: deterministic Large-Job Protocol scripts (size/plan/coverage) | merged | 2026-08-22 | `pull-patches/pr-47.patch` |
| 46 | Migrate dsh rc.7 -> 0.1.1-rc.2 via pnpm dlx; GauntletGate-clean | merged | 2026-08-21 | `pull-patches/pr-46.patch` |
| 45 | GauntletGate remediation: RCE Blocker + 9 Criticals, tests proven to fail closed | merged | 2026-08-21 | `pull-patches/pr-45.patch` |
| 44 | Disarm the live defects, correct the false public claims, add a test suite that fails closed | merged | 2026-08-21 | `pull-patches/pr-44.patch` |
| 43 | Fix the three defects that made this repo unusable by anyone who downloaded it | merged | 2026-08-21 | `pull-patches/pr-43.patch` |
| 42 | HALO 2.0 redesign spec (for external audit — DO NOT MERGE yet) | closed | 2026-08-23 | `pull-patches/pr-42.patch` |
| 41 | Retune compaction and stream idle timeout for the 131K window | merged | 2026-08-21 | `pull-patches/pr-41.patch` |
| 38 | 5070ti profile: override contextWindow/maxTokens (master now advertises 131K) | merged | 2026-08-21 | `pull-patches/pr-38.patch` |
| 37 | Release v0.5.0 | merged | 2026-08-20 | `pull-patches/pr-37.patch` |
| 36 | AGENTS.md is a prompt, not a config: scope gate + profile file swaps (#35) | merged | 2026-08-20 | `pull-patches/pr-36.patch` |
| 34 | Publication gate: check stated constraints against what is already public | merged | 2026-08-20 | `pull-patches/pr-34.patch` |
| 33 | reddit-search: bound the back-off | merged | 2026-08-20 | `pull-patches/pr-33.patch` |
| 32 | reddit-search: per-IP concurrency rule + parse trap | merged | 2026-08-20 | `pull-patches/pr-32.patch` |
| 31 | v0.4.0: annotated console screenshots across the documentation | merged | 2026-08-20 | `pull-patches/pr-31.patch` |
| 30 | Finish the design review: no findings parked | merged | 2026-08-20 | `pull-patches/pr-30.patch` |
| 29 | Act on the six-tab design review | merged | 2026-08-20 | `pull-patches/pr-29.patch` |
| 28 | MC: cross-tab fixes (labels, TTL, dates, log noise) | merged | 2026-08-19 | `pull-patches/pr-28.patch` |
| 27 | Overview redesign: the remaining five design-review findings | merged | 2026-08-19 | `pull-patches/pr-27.patch` |
| 26 | Vitals chart: three auto-fitted strips (design-review fix) | merged | 2026-08-19 | `pull-patches/pr-26.patch` |
| 25 | Mission Control: Machine vitals timeline | merged | 2026-08-19 | `pull-patches/pr-25.patch` |
| 24 | Mission Control: context-fill column (the wall, made visible) | merged | 2026-08-19 | `pull-patches/pr-24.patch` |
| 23 | Seal v0.3.0 | merged | 2026-08-19 | `pull-patches/pr-23.patch` |
| 22 | Fleet story on the public surfaces | merged | 2026-08-19 | `pull-patches/pr-22.patch` |
| 21 | Currency audit: all surfaces match the running system | merged | 2026-08-19 | `pull-patches/pr-21.patch` |
| 20 | chore: ignore pipeline __pycache__ | merged | 2026-08-19 | `pull-patches/pr-20.patch` |
| 19 | Pipeline dry-run: machinery validated, four orchestration lessons fixed | merged | 2026-08-19 | `pull-patches/pr-19.patch` |
| 18 | Window doubled: brain at ctx 131072 with KV q8_0 (bench-adopted) | merged | 2026-08-19 | `pull-patches/pr-18.patch` |
| 17 | Budgeted-emit pipeline: implemented, reviewer local per cost-direction rule | merged | 2026-08-19 | `pull-patches/pr-17.patch` |
| 16 | Design: budgeted-emit pipeline - the output wall made structurally unreachable | merged | 2026-08-19 | `pull-patches/pr-16.patch` |
| 13 | Deploy freshness stage: never deploy stale code silently | merged | 2026-08-19 | `pull-patches/pr-13.patch` |
| 12 | System-tab memory card: honest label + link to the real graph | merged | 2026-08-19 | `pull-patches/pr-12.patch` |
| 11 | Memory graph provenance: ships in the repo, reads standard MCP JSONL generically | merged | 2026-08-19 | `pull-patches/pr-11.patch` |
| 10 | Per-machine config profiles: one master serves every box (issue #6) | merged | 2026-08-19 | `pull-patches/pr-10.patch` |
| 9 | Eviction JIT-reload alarm + 16GB-class deploy advisory (issue #5) | merged | 2026-08-19 | `pull-patches/pr-9.patch` |
| 8 | Self-enforcing install: deploy registers + audits machine state; one canonical README checklist | merged | 2026-08-19 | `pull-patches/pr-8.patch` |
| 7 | Mission Control: quick-action labels come from the loader scripts | merged | 2026-08-19 | `pull-patches/pr-7.patch` |
| 1 | Harden Start-DSH.ps1: no silent failures, brain check on every launch | merged | 2026-08-19 | `pull-patches/pr-1.patch` |

## Issues (10)

| # | Title | State | Opened |
|---|---|---|---|
| 40 | 5070ti worker advertises 32768 context but the instance crashes above ~19K | OPEN | 2026-08-21 |
| 39 | Machine profiles inherit master's value changes silently: pin replacement targets like files: d | OPEN | 2026-08-21 |
| 35 | Machine profile misses workspace\AGENTS.md: deploy overwrites the scoped version and injects HA | CLOSED | 2026-08-20 |
| 15 | Fleet origin badges inverted on the 5070ti box: local model labeled FLEET/unknown-origin, remot | OPEN | 2026-08-19 |
| 14 | Machine-profile deploy renders the vendored-SDK loaders; they fail at runtime on port boxes (pu | CLOSED | 2026-08-19 |
| 6 | Parameterize machine-specific config into per-machine profiles (one master serves every box) | CLOSED | 2026-08-19 |
| 5 | Advisory for 16GB-class deploys: worker (Coder MoE Q4_K_S) crashes at ~19.5K+ context; brain ev | CLOSED | 2026-08-19 |
| 4 | Clean-machine rebuild order is broken: Deploy-ToLive needs js-yaml that only exists after dsh h | CLOSED | 2026-08-19 |
| 3 | Mission Control: federated remote models get live Load/Unload buttons, indistinguishable from l | CLOSED | 2026-08-19 |
| 2 | Mission Control: GPU carveout math hardcodes 128 GiB unified memory | CLOSED | 2026-08-19 |

## Releases (7) — deleted from GitHub, recorded here

Note: only tag, title and date were captured before deletion. The note bodies
came from `CHANGELOG.md`, which is in the mirror.

| Tag | Title | Published |
|---|---|---|
| v0.7.0 | v0.7.0 - HALO 2.0: the Large-Job Protocol | 2026-08-22 |
| v0.6.0 | v0.6.0 — dsh 0.1.1-rc.2 migration + gate remediation | 2026-08-21 |
| v0.5.0 | v0.5.0 — AGENTS.md scope gate | 2026-08-20 |
| v0.4.0 | v0.4.0 — Mission Control rebuilt after design review | 2026-08-20 |
| v0.3.0 | v0.3.0 — 131K context window, KV q8_0 | 2026-08-20 |
| v0.2.0 | v0.2.0 — Bench Day 3, per-engine doctrine | 2026-08-20 |
| v0.1.0 | v0.1.0 — First versioned release | 2026-08-20 |

## CI runs (73)

Outcomes: 67 success, 6 cancelled

Logs: `github/workflow-logs/run-<id>.zip` — 73 bundles.

## Surfaces checked and confirmed empty

Recorded so that "nothing there" is evidence, not an assumption.

webhooks 0 - deploy keys 0 - Actions secrets 0 - Actions variables 0 -
Actions caches 0 - milestones 0 - forks 0 - autolinks 0 - commit comments 0 -
invitations 0 - subscribers 0 - stargazers 0 - ProjectsV2 0 - packages 0 (all types) -
wiki repo does not exist - social preview none - Dependabot/secret-scanning/code-scanning
all disabled - branch protection unavailable on this plan.

