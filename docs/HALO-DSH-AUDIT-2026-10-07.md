# DSH Web audit and repair record — 2026-10-07

## Outcome and scope

DSH Web is OFF at Scott's explicit request; port 3080 has no listener.
The installed 0.2.0-rc.2 deployment was audited for output budgeting, replay,
compaction, model policy, preset composition, research routing, launch behavior,
usage telemetry, permissions and recovery consistency. All nine confirmed
findings below have implementation repairs and focused verification. This is
not a certification of every upstream plugin or a completed local news report.
No service restart or model load/unload was used for this repair verification.
Saved sessions are retained. Only the 35B is resident, at 65,536 context.

## Findings and disposition

| Severity | Confirmed finding | Repair |
| --- | --- | --- |
| Critical | SDK overwrote explicit output using a character estimate after replay lost usage metadata | Web-only, version-pinned opt-out preserves the requested budget; original behavior remains without the opt-out |
| High | 35B profile/model policy remained at 16K despite requested 24K | 24,576 output in canonical/live profile, settings and model policy |
| High | Four compaction policies inherited 65,536 headroom, invalidating a 64K route | Explicit 4,096 headroom in every policy; installed resolver checks pass |
| High | Launcher reloaded a fixed 35B/27B pair and removed other resident models | Read-only validation of the selected effective route; no load/unload commands or forced pair; operator selection preserved |
| Medium | Default delegation targeted intentionally unloaded 27B | Resident 35B default; optional 27B selection retained |
| Medium | Adapter discarded separately reported reasoning-token counts | Finite positive reasoningTokens preserved; output totals remain inclusive |
| Medium | Malformed historical tool arguments silently became `{}` | Contextual INVALID_TOOL_ARGUMENTS before dispatch; valid nested and durable replay preserved; raw parse cause omitted |
| Medium | Embedded and external presets were two editable recovery authorities | Embedded Web profile is authoritative; four generated external mirrors, explicit sync/check and startup drift guard |
| Medium | Contract tests asserted retired release/default/context assumptions | Updated to installed 0.2.0-rc.2/current 64K Q6 route; all 149 Mission Control checks pass |

Independent review additionally corrected model-level baseURL overrides,
providers handled outside the pi-ai catalog, active-profile precedence over
legacy settings.yaml, PowerShell one-model JSON serialization, and large profile
transport through file paths instead of command-line configuration text.

## Where the 70-token limit came from

Session `session-5509721d-290e-4cdb-8309-83d019f27f97` recorded 23,482 provider
input tokens, 70 output tokens, provider `length`, and Harness `max-tokens`.
Inside pi-ai 0.87.1, the rebuilt transcript was estimated at 61,370 tokens.
The hidden clamp calculated **65,536 - 61,370 - 4,096 = 70**. The UI's 36%
was based on provider input; the clamp used a different, inflated estimate.

The adapter rebuilds replay with empty usage and zero timestamps. Merely
copying old usage back is unsafe without prefix/timestamp invalidation after
compaction, so the repair disables that convenience clamp for the Web child.
It does not invent historical usage, remove real server capacity, or remove
compaction. Completion limits and context limits remain different quantities.

`output-budget-patch.mjs` verifies SDK version/source, preserves the pristine
backup and adds `HALO_DSH_DISABLE_ESTIMATED_OUTPUT_CLAMP=1` opt-out. The supported
`start-dsh-detached.mjs` applies it only to its Web process. An unreviewed version
or source drift causes a visible failure; reinstalling the reviewed dependencies
is repaired on the next supported launch. Direct unsupported CLI launches do
not inherit this Web-only environment setting automatically.

## Current policy and startup behavior

The main and default delegated route is `web-fast/halo/qwen3.6-35b-a3b-q6`,
High reasoning, 24,576 output, 65,536 context. With 4,096 headroom, the installed
compaction resolver derives a 36,864 pressure threshold and 22,528 retention;
summary maximum remains 8,192. The 70% ratio is a ceiling, not the effective
trigger when completion reservation requires more room.

Startup preserves the saved selection, prefers the active Web profile, and
checks residency only when the effective selected pi-ai URL points to local
LM Studio port 1234. A mismatch is an actionable error requiring an operator
choice; it does not load, unload or replace models. Other providers manage their
own availability. Optional 27B remains selectable, and must be manually loaded
before choosing a local route that needs it. Delegation remains continuable,
not an added parallel inference requirement.

Edit embedded presets in `web-profile/cordis.patch.yml`; run
`node preset-sync.mjs sync`, then `node preset-sync.mjs check`. External
`*-preset/agent.cordis.yml` files are generated recovery mirrors. Their module
paths become preset-relative while `!!js` tags and plugin composition survive.
The supported detached launcher rejects drift before starting Web.

`adapter-integrity-patch.mjs` verifies adapter 0.2.0-rc.2 against the entire
reviewed patch reconstructed from its checksum-verified original. Invalid
historical tool arguments fail explicitly without raw JSON in diagnostics.
Positive reasoning telemetry is separate from inclusive output, not subtracted.
Both originals use byte-preserving Git attributes for Windows recovery.

## Verification and limits

- Mission Control: all 149 contract checks passed across nine suites.
- Launcher: 13 checks passed, including actual Windows PowerShell arrays,
  both-files precedence, large file-bound CLI, effective model URL overrides,
  external providers, absent model/capacity mismatch, and retained other residents.
- Installed adapter: 11 checks passed, covering usage, nested tool arguments,
  malformed/non-object foreign history and durable replay before HTTP dispatch.
- Output budget: five checks passed, including reproducing 70 tokens, opt-out
  24K serialization through actual SDK/adapter, overflow estimates, explicit
  smaller caps, and version/source/idempotence guards.
- Compaction: two checks passed through the installed policy resolver.
- Current brain-provider request and two startup-selection checks passed.
- Research fallback: eight controlled checks passed; optional live retrieval
  skipped in this repair. Prior Wigolo article retrieval was verified; live
  Reddit availability remains unverified after HTTP 429. RSS is discovery,
  not proof of full comments or primary news coverage.
- Preset tests and deployed recovery hashes are recorded in the dated repair
  successor. Actual LM Studio read-only inventory validates the selected 35B;
  Web remains off, 27B remains absent, and saved sessions remain on disk.

No new full news pipeline, live full-summary compaction, or live delegated model
turn was run while Web was deliberately off. Configuration/schema/request tests
prove the repairs at those boundaries; they do not certify model task quality.

## Reading and recovery

See `HALO-DSH-IMPLEMENTATION-2026-10-07-AUDIT-REPAIRS.md` for deployment and
verification. Desktop reading copies are in `C:\Users\scott\Desktop\Halo Stack
Research`. Changed deployable files and original dependency backups are mirrored
under `Current Halo Configuration\stock-dsh` and the dated audit-repair bundle,
with SHA-256 entries in `Current Halo Configuration\MANIFEST-SHA256.txt`.
The earlier output-budget commit is `f3fe2849b263a07de9066ecd7e0fff25c2ff513a`.
