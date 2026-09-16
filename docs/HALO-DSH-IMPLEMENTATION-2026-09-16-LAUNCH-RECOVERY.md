# Desktop launcher stale-build recovery — September 16, 2026

The brain-provider update installed a new Mission Control file without restarting the existing process. At the next desktop launch, the installer saw matching canonical and installed files and correctly made no copy. However, the launcher only considered a file copied during that launch or an older process creation time as reasons to refresh Mission Control. The running old build therefore reached Launch-Status's hash check and failed before Chrome opened.

`stack/stock-dsh/Start-StockDSH.ps1` now also compares Mission Control's reported startup build hash with the installed file. If the source path matches the installed path and the hash differs, it invokes the existing identity-checked Mission Control stop/start path. Unknown source paths are not treated as stale known builds. Matching builds are reused, and `KeepMissionControl` is respected. No identity checks were removed.

## Live verification

- Reproduced the failure: running Mission Control PID 48032 reported hash `D9D2DBC21CB5FF079B66BA9305C4333A1C00843C9D6D8CEBA77E6B519B8D4E26`, while the installed file was `B9337233F36BB98B9EA6D69475678A5135FEB14D6BB7CDFF459FB556DCC039F6`.
- Ran the corrected start script against that real state. It detected the old build and replaced Mission Control with PID 20192, reporting the installed hash.
- DSH PID 10816 and its Wigolo child PID 48144 were reused.
- Ran the actual unified Chrome launcher again. It exited successfully and reused the corrected Mission Control process.
- The authenticated DSH launch URL returned HTTP 200 with HTML. The unauthenticated root correctly requires authentication.
- PowerShell syntax parsing and Git whitespace checks passed. No new inference benchmark was needed for this lifecycle repair.

The desktop shortcut already points into this repository, so the repaired start script is the active launch path. Human-readable records and recovery copies were synchronized.
