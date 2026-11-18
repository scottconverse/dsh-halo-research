# Browse companion for DSH on Halo

Browse is available on the lead in two additional Web and Desktop session presets.

| Preset | Lead | Worker |
| --- | --- | --- |
| **Halo + 5070 Ti + Browse** | Full-memory Halo Strata with Browse tools | Existing 5070 Ti route, using `local-lean` |
| **Halo + 5070 Ti (32K capped) + Browse** | Capped Halo Strata with Browse tools | Existing 5070 Ti route, using `local-lean` |

The ordinary presets, global model default, and the worker tool list retain their existing settings. DSH mounts the native MCP client in each opt-in lead preset. Each of those presets has one child route, which uses native spawn with the separate `local-lean` preset and depth one. This restriction applies to DSH tool exposure. The two DSH agents still run under the same Windows user.

## Start and stop

Start this companion before selecting a Browse preset in a new session. Run `npm start` from this directory. The launcher uses Chrome for Testing in headless mode, with a separate profile at `%LOCALAPPDATA%\DSH-Halo-Browse\chrome`. Chrome's normal profile, sign-in, tabs, extensions, and settings are outside this directory. Both DSH apps use this one companion browser. The relay binds only to `127.0.0.1:19971` and uses its own state directory. It runs the upstream plain MCP tool set. Human handoff interactions that need a visible tab are outside this headless setup.

Use `npm stop` from a second terminal, or press Ctrl+C in the terminal running the launcher. The companion stops the Chrome context and relay it owns. The profile and pairing persist for the next start. Choose an ordinary preset to work without Browse.

## Provision on Windows

The overlay expects the installed Halo paired Strata presets and their `local-lean` worker. Use Node 24 with npm, then run the following commands from a stable, writable copy of this directory. The relative paths are resolved during staging.

```powershell
npm ci --ignore-scripts
.\node_modules\.bin\playwright.cmd install chromium --no-shell
$root = Join-Path $env:LOCALAPPDATA 'DSH-Halo-Browse'
New-Item -ItemType Directory -Force $root | Out-Null
$zip = Join-Path $root 'browse-extension-0.1.5.zip'
Invoke-WebRequest 'https://github.com/anomalyco/browse/releases/download/v0.1.5/browse-extension-0.1.5.zip' -OutFile $zip
if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne '5527B8E2865068EBD4060C6274CE7633BC06E1D2080FD19974A1CF9C7A7FE18D') {
  throw 'Browse extension checksum mismatch'
}
Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $root 'extension-0.1.5')
```

The launcher pairs the extension through its own settings page on the first headless start. The one-use code stays in memory. The upstream global installer is unnecessary. [Browse v0.1.5](https://github.com/anomalyco/browse/releases/tag/v0.1.5)

With the two DSH apps closed, set `$web` and `$desktop` to their profile files, and `$records` to a new private directory under the companion root. Stage, review, and install the overlay.

```powershell
node .\profiles.mjs stage $web $desktop $records
node .\profiles.mjs install $web $desktop $records
```

The overlay appends two variants and a lead-selection hook. The existing bytes remain a prefix of each new profile. Roll back with `node .\profiles.mjs rollback $web $desktop $records`. Install and rollback require the current profile bytes to match the appropriate staged copy.

## Model-free verification

`verify.mjs` boots isolated DSH hosts from the Web and Desktop profile candidates, extracts the actual Browse rows, and mounts the native MCP client. It verifies that both intended lead routes select the correct Strata provider. The verifier executes Browse tab creation, navigation, snapshot, and cleanup against a loopback HTML page via the MCP tool definitions. It checks the global view, ordinary presets, and the worker's `local-lean` preset for the absence of Browse. The browser and relay are real. The DSH session hosts are headless profile fixtures and the verification performs no inference.

### Halo verification record

The November 17 lab run used Browse 0.1.5, Chrome for Testing 159.0.8154.6 and the DSH 0.2.2-rc.1 profile runtime. Both lead variants in the Web and Desktop fixtures navigated to and read the real loopback test page. The normal presets, global view and worker preset had zero Browse tools. The separate Desktop fixture used its headless profile host. Its optional telemetry services emitted a missing service-version diagnostic. The Browse checks passed.

The install and rollback were exercised first on copied profiles. Rollback returned both copies to their original bytes. After deployment, both active profile files matched their staged candidates and each retained the original bytes as a prefix. The isolated relay was listening only on IPv4 loopback port 19971. No models were loaded.
