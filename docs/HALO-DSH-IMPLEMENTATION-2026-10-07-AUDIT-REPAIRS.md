# DSH audit repairs — 2026-10-07

## Installed outcome

All nine findings in HALO-DSH-AUDIT-2026-10-07.md have implementation repairs.
DSH Web remains intentionally OFF at Scott's request. The repairs were installed
without starting Web, restarting LM Studio, invoking inference or changing model
residency. The sole resident model is halo-fast-35b-q6 at 65,536 context, parallel
1; the intentionally unloaded 27B remains absent. Stored sessions are retained.

## Implementation

- Web-only SDK opt-out preserves explicit 24,576 output instead of the character
  estimate clamp that previously reduced the allowance to 70. Version/source
  guards and pristine backups make dependency reinstall recovery deterministic.
- All four compaction policies set 4,096 headroom. The installed resolver produces
  a 36,864 threshold and 22,528 retention for 64K context/24K completion; summary
  maximum is 8,192. No historical usage or timestamps were fabricated.
- Supported launch preserves the persisted operator choice and validates only
  the effective selected LM Studio route. It handles selected-model baseURL
  overrides, other adapters/providers, active-profile precedence, large profile
  file paths and Windows PowerShell zero/one/multiple inventory arrays. It never
  loads/unloads a model pair or removes other residents.
- Default delegation uses the resident35B/High/24K route. The allow-list includes
  that default and optional27B. Continuable delegation remains available; this
  change does not demand simultaneous inference on two local models.
- A version-pinned complete-source adapter repair preserves positive finite
  reasoningTokens without subtracting them from inclusive output. Malformed
  or non-object historical arguments fail before dispatch with contextual
  INVALID_TOOL_ARGUMENTS. Valid nested foreign and durable replay survives.
  The raw JSON parse cause is omitted to avoid diagnostics exposing arguments.
- Embedded Web profile presets are the sole editable authority. preset-sync.mjs
  generates/checks four external recovery mirrors using the installed YAML AST
  and registered preset schema. It preserves !!js and makes preset module paths
  relative. Actual registered Config and !!js loader validation covers all four
presets; malformed registrations, duplicate IDs and unsafe directory names fail
before mirror writes. Startup checks canonical and installed embedded composition against
  the mirrors before applying dependency patches or starting Web.
- Retired contract assumptions now match deployed0.2.0-rc.2, current64K Q6 route,
  current selections and retained provider catalog. Research fallback changes
  previously authorized are preserved; their controlled tests pass.

## Verification

All149 Mission Control contracts passed across nine suites. Focused checks:
13 launcher,11 adapter,9 preset generation,5 output budget,2 compaction,
2 startup-selection,1 brain-provider request,8 research fallback. The optional
live Wigolo retrieval check was skipped in this repair. The focused gate passed
51 checks with zero failures and one optional live check skipped. These are actual Windows
PowerShell, installed SDK/adapter and controlled HTTP/SSE tests, not a simulated
claim that the entire reporting task ran. npm run test:audit provides the focused
repair gate; npm test provides the full Mission Control contract gate.

Read-only lms ps inventory validates the actual selected35B. Installed/canonical
profile comparison preserved all unrelated parsed settings, selected route and
live welcome-notice metadata. Four live recovery mirrors match canonical bytes.
Versioned adapter patch readback equals the complete reviewed patch derived
from its checksum-verified original. Source drift/unreviewed versions fail loudly.

Original backups are Git-byte-preserved with scoped .gitattributes. Live profile
and mirror pre-deployment backups are under:
C:\Users\scott\.dsh-stock\audit-repair-backups\2026-10-07-final.

## Reading and recovery

Desktop audit, current configuration, stack guide and this successor are
synchronized under C:\Users\scott\Desktop\Halo Stack Research. Changed source,
profiles, settings, model policy, tests, helpers and both pristine dependency
backups are copied to Current Halo Configuration\stock-dsh and the dated
2026-10-07-audit-repairs bundle. MANIFEST-SHA256.txt records every copied file;
readback validates the copied hashes. Older evidence/recovery bundles are retained.

When Scott resumes, use the supported Start-StockDSH.ps1. To change a preset,
edit web-profile/cordis.patch.yml, run node preset-sync.mjs sync/check, and
synchronize the installed profile. Direct unsupported CLI launches do not
inherit the Web-only output-clamp opt-out. Real LM Studio capacity still applies.

No completed news report, live full-summary compaction, or live delegated turn
was run while Web was off. Prior Reddit429 remains an honest access limitation;
RSS discovery is not complete comments or primary-source news verification.
The earlier output-budget repair is commitf3fe2849b263a07de9066ecd7e0fff25c2ff513a.
The final repair commit is recorded in the Git verification evidence accompanying
this bundle rather than embedded in its own checksum-bearing sources.
