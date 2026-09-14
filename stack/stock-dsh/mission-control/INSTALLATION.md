# Mission Control installation contract

`Install-HaloMissionControl.ps1` is the only supported promotion path from the
canonical Mission Control source to an installed copy. Running the script does
not restart Mission Control; a changed install reports `RestartRequired: true`
and leaves that operator decision separate.

## Current stock deployment

This copy targets stock DSH `0.1.5-rc.2` under `%USERPROFILE%\.dsh-stock`.
Candidate hashes, test counts, install receipts, and live observations belong in
the release evidence produced for that exact candidate. Historical 2026-09-01
hashes and counts from the retired `.dsh` deployment are not valid evidence for
this port. `FEATURE-PARITY.md` records the preserved feature and API contract.

## Pre-install gate

Before it creates or changes anything under the destination, the installer:

1. requires the selected source and every named contract suite to exist;
2. records the SHA-256 of the exact `-Source` file;
3. runs `node --check` on that file;
4. runs the reasoning, data, UI, and installer contract suites separately;
5. makes those suites read the exact selected source through the temporary
   `HALO_MC_SOURCE_UNDER_TEST` process environment value; and
6. rechecks the source and suite hashes before installation and receipt output.

Any missing suite, syntax error, nonzero test result, or changed source/test hash
stops the operation before the destination is mutated. `-SkipTests` is retained
only for verification of a destination whose hash already equals the source; it
cannot install a changed or missing destination.

## Installation and receipt

For a changed destination, the installer preserves the existing sequence:

- copy the prior installed file into the destination's `backups` directory;
- verify that backup against the prior destination hash;
- copy the candidate to a nonce-named `.installing-*` path;
- verify the staged hash;
- move the staged file over the destination; and
- verify the final installed hash.

Every successful invocation, including a same-hash no-op, atomically writes an
`install-*.json` receipt with `SchemaVersion: 1` and
`ReceiptType: HaloMissionControlInstall`. It records the action, exact source/destination paths,
source, prior, installed, and backup hashes, syntax-check evidence, and one entry
per contract suite with its path, SHA-256, command, and result. The returned
PowerShell object also includes the receipt path and its SHA-256.

The destination transaction uses a lock and rechecks the prior destination
identity before replacement. A failed changed installation attempts to restore
the hash-verified previous bytes (or the originally absent destination), rather
than treating a partial copy as success. Keep the receipt and the associated
backup together; a hash alone cannot restore bytes. A deliberate rollback must
use the matching prior source and test set and produce fresh installation and
live verification evidence.

This document describes the canonical installer. Editing or testing it is not
deployment evidence: the live `%USERPROFILE%\.dsh-stock\mission-control` copy
remains unchanged until the installer is explicitly run against that destination
and its receipt is verified.

## Launch and live acceptance

`Launch-Status.ps1` uses the installed copy, not a convenient copy in another
folder. It requires the canonical and installed hashes to agree. If that build
is already serving, it verifies two health observations and opens its browser
page without starting a duplicate. Otherwise it starts the installed process
hidden and verifies its health. Existing-service checks use the configured
health timeout (30 seconds by default), not a two-second startup assumption.
`-NoBrowser` suppresses opening a browser; it does not suppress health verification.
On reuse, `Started` is false and `ProcessId` is null because the HTTP health
identity does not report a PID. The default canonical path is resolved in the
script body for compatibility with the desktop shortcut's Windows PowerShell
5.1 `-File` invocation. Browser launch is explicit Google Chrome; it never falls
back to Edge or the Windows default browser. This launcher does not restart DSH,
LM Studio, or Ollama.

The ordinary stock lifecycle is the parent directory's
`Launch-StockDSH.ps1`, `Start-StockDSH.ps1`, and `Stop-StockDSH.ps1`. They pass
the current stock root, `.dsh-stock` home, and DSH launch authority into Mission
Control. Stopping the stack does not unload LM Studio models.

After launch, use `Test-HaloMissionControlLive.ps1` under PowerShell 7 with
these explicitly supplied inputs:

- `-ExpectedSourceSha256`: the independently recorded candidate hash.
- `-ExpectedReceiptSha256`: the independently recorded install-receipt hash.
- `-InstalledCopy`: the exact installed `mission-control.mjs` path.
- `-InstallReceipt`: the exact receipt returned by installation.

The default service origin is `http://127.0.0.1:3090`. The script accepts only
an origin-only loopback HTTP address; it never follows redirects. It verifies
the receipt's version/type, exact four-suite list, source/suite identities,
successful test results, and strict JSON types before trusting live evidence.

The script obtains the per-boot action token from the page without writing it
to logs. Missing-token, invalid-token, and lookalike-origin validation requests
must be rejected; then a correctly authenticated `/api/validate-config` request
must succeed with fresh, warning-free evidence. A response body or diagnostic
cannot reflect the token into the evidence output.

Live checks compare model inventory to `lms ps --json`, require catalog origin
and resident-key parity, verify plugin freshness/counts, parse the actual memory
and snapshot files, corroborate snapshot time, and require healthy GPU data.
An honestly unavailable/degraded source fails healthy acceptance; it is not
silently replaced with zero and does not restrict any model's capabilities.
The installed source and receipt are hashed again before one structured JSON
success result is emitted. Any failed check exits nonzero.

Task/writer activity is checked through Mission Control/DSH metadata. Keep the
independent task-definition readback from deployment alongside the receipt.
Fixture tests of this script do not replace a run against the real deployed
service or a browser walkthrough.

## Persistent-memory snapshots

`Install-HaloMemorySnapshotTask.ps1` is the canonical installer for the
`HALO Memory Snapshot` scheduled task. It invokes `Snapshot-HaloMemory.ps1`
hourly with an additional Windows-startup trigger. Its Interactive principal requires the user session;
this is not proof of unattended pre-login operation. Missed-run handling is
enabled. Overlapping runs are ignored and failed runs are retried
three times. Retention is bounded to the newest 168 canonical snapshots.

**Checkpoint, 2026-09-01 20:49 MDT:** after the earlier non-elevated attempt was
denied, Scott approved UAC and the replacement was registered successfully.
Independent read-back confirmed Scott's SID, Interactive/Limited principal,
exact action, enabled hourly/startup triggers, missed-run handling, IgnoreNew,
ten-minute limit, and three retries at five-minute intervals. A real
Task Scheduler run returned result 0 and produced a snapshot matching the
unchanged source hash. No partial-write files remained; 57 snapshots were
present, below retention. Startup and retries are definition-verified only;
no reboot or induced failure was performed.

The snapshot script reads `%USERPROFILE%\.dsh-stock\memory\memory.json` and writes to
`%USERPROFILE%\.dsh-stock\memory\snapshots`. If `memory.json` does not exist, the run
is an honest no-op: it does not create or seed the memory store.

Preview the exact task definition without importing ScheduledTasks or changing
the live task, from
`C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\mission-control`:

```powershell
pwsh -NoProfile -File .\Install-HaloMemorySnapshotTask.ps1 -PlanOnly
```

The preview prints JSON containing the task name, executable, arguments,
working directory, source, destination, triggers, and retention. The contract
test uses this path and never registers a task.

Registration is an explicit operator action:

```powershell
pwsh -NoProfile -File .\Install-HaloMemorySnapshotTask.ps1
```

Registration replaces only the exact `HALO Memory Snapshot` task definition.
It does not run the task immediately, restart Mission Control, or reboot
Windows. No reboot is required.
