# DSH Web 0.2.2-rc.5 launcher repair

The Windows Web launcher uses the checked-in rc.5 dependency pins and verifies the upstream frontend, adapter, session recovery and Web fetch sources before applying the Halo patches. The first run against pristine packages saves verified originals. A machine that already has patched rc.5 packages also needs its matching original files in `stack/stock-dsh/runtime-patch-backups`.

Repository presets and installed presets have separate recovery mirrors. After installing or intentionally changing the Web profile, run these commands from `stack/stock-dsh` with Node 24:

```powershell
node preset-sync.mjs sync --installed
node preset-sync.mjs check --installed
```

These commands read the installed profile and update or check its ignored recovery copies. The launcher compares those copies at each startup. The normal shortcut still opens Chrome. To run the same launcher without opening a browser, use `Launch-StockDSH.ps1 -NoOpen`.

On Halo, a temporary Windows task ran the launcher against byte-identical copies of the Web profile and shared settings. The authenticated page and script each returned HTTP 200, Mission Control reported the expected build, and the host reported no failed or stuck plugins. The test replaced XERJ with a handshake stub, disabled Strata autostart, and redirected writable data into the test home. The production task, settings and sessions stayed in place. No models were loaded.

The previous output-budget and delegation assertions failed on both rc.1 and rc.5. The revised tests check the pinned SDK default clamp, the scoped 24,576-token output override and the Fast First cloud lead with local Qwen delegation. The request checks use mock responses.
