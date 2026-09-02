# Mission Control shortcut repair — 2026-09-02

Scope: Scott explicitly authorized fixing production Mission Control after a
read-only diagnosis. Only its launcher implementation changed. No production
DSH configuration, server source, model configuration, Gateway, Ollama, or
development deployment was changed. No commit or push was made; unrelated
dirty files were preserved.

## Causes and correction

1. The September 1 launcher rewrite in commit `87ddc839` always started Node.
   When Mission Control was already serving port 3090, that duplicate could
   exit before the browser-opening step. A hidden shortcut made this silent.
2. Live verification also found that Windows PowerShell 5.1 `-File` evaluated
   the `CanonicalSource` parameter default with an empty `PSScriptRoot`.
   Existing tests passed explicit paths and did not exercise this invocation.

The launcher now checks and reuses a matching live build, performs two health
observations, opens the browser unless `-NoBrowser`, and resolves its default
canonical path in the script body. Existing build-identity checks remain; no
new permissions or model restrictions were introduced.

Canonical executable:
`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Launch-Status.ps1`.
The unchanged `C:\Users\scott\Desktop\Halo Status.lnk` invokes that exact file.

## Test evidence

Working directory for Node commands:
`C:\Users\scott\Desktop\Code\dsh-halo-research`.

Baseline command: `node --test stack/mission-control/test/*.test.mjs`

```text
ℹ tests 118
ℹ suites 0
ℹ pass 118
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 47634.388
```

Regression command: `node --test stack/mission-control/test/reopen-contract.test.mjs`

The valid initial RED run had 4 tests, 0 pass, 4 fail, duration_ms 2468.4184.
The first three assertions expected successful reopen but received exactly:
`Installed Mission Control exited before becoming healthy (exit code 1).`
The fourth expected an identity refusal but received that same premature-exit
error. Earlier test-harness setup failures (Get-FileHash unavailable because of
inherited PowerShell 7 module paths, then mock script-variable scope) were
corrected before this run; those were not counted as bug reproduction.

Separate default-path RED command:
`node --test --test-name-pattern='Windows PowerShell -File' stack/mission-control/test/reopen-contract.test.mjs`

```text
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 552.1966
```

It expected the missing-installed-copy check but instead received:

```text
Join-Path : Cannot bind argument to parameter 'Path' because it is an empty string.
At C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Launch-Status.ps1:3 char:44
+     [string] $CanonicalSource = (Join-Path $PSScriptRoot 'mission-con ...
+                                            ~~~~~~~~~~~~~
    + CategoryInfo          : InvalidData: (:) [Join-Path], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : ParameterArgumentValidationErrorEmptyStringNotAllowed,Microsoft.PowerShell.Commands.Join
   PathCommand
```

Final command: `node --test stack/mission-control/test/*.test.mjs`

```text
ℹ tests 124
ℹ suites 0
ℹ pass 124
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 50317.8273
```

Six added regressions cover reopen, repeated invocations, NoBrowser, wrong
existing build, default canonical path, and the exact Windows PowerShell
`-File` default evaluation. Existing cold-start, wrong-build, missing-copy,
installer, data, UI, memory, reasoning and acceptance tests remain green.
Tests execute real launcher code with process/network boundaries substituted;
the pre-existing cold-start fixture launches its own disposable server, never
the production service.

## Live evidence and unsuccessful intermediate attempt

Both final checks used this executable and argument prefix:

```text
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\scott\Desktop\Code\dsh-halo-research\stack\mission-control\Launch-Status.ps1
```

The first appended `-NoBrowser`; the second did not. The verification shell
temporarily supplied Windows PowerShell's own module search path to avoid
inheriting PowerShell 7's test environment, then restored it. Both final calls
returned `Started: False`, `Healthy: True`; `BrowserOpened` was respectively
False and True. The original listener remained PID **38916**, created
**2026-09-01T20:09:05.028351-06:00**. No restart occurred.

An intermediate two-second health timeout was too short: the first live
verification unnecessarily spawned duplicate PID 19624 and reported Started
True, while the original listener remained 38916. The duplicate exited and was
confirmed absent. The final patch uses the operator's full health timeout;
both repeat checks reused the original process. Do not describe the entire
repair as having started no processes or every intermediate attempt succeeding.

The unchanged installed and canonical server SHA-256 is:
`45D40A25C0A4EFB06DAA0C549D08E92BD7384508BF5D3B75754B74BD31CEE1EE`.
Browser launch was acknowledged by the OS; this repair does not claim a new
full dashboard UI/telemetry audit. No cold restart of production was attempted.

## Recovery, boundaries, and documentation

Preserved original launcher:
`stack\evidence\mission-control-reopen-2026-09-02\Launch-Status.before.ps1`.
Its SHA-256 is
`0DDB73D7C01D270B7726A46A8D8152AEA7820FF39093F4B33C7084B4E5F47CB5`.
Restoring those bytes would restore the old bugs, so do so only deliberately,
after preserving any later edits. No server-file restoration is needed.

The current-configuration record, operator guide, installation guide, repaired
launcher, regression test, this report, and old launcher are mirrored into
`C:\Users\scott\Desktop\Halo Stack Research` and its recovery snapshot.
The snapshot manifest is updated only for these changed/copied files, not by
silently blessing unrelated drift.

Security review: existing loopback/path/hash checks retained; no new endpoint,
credential, dependency, eval, or unsafe deserializer. JSON health parsing uses
the existing PowerShell parser and expected build identity. Wrong-build reuse
fails without stopping the service. No policy narrowing was added. Concurrent
cold-start double-click serialization and unrelated monitoring features were
not redesigned in this bounded repair.
