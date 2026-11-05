# Exact retained Desktop rc.5 archive repairs

`patches.json` retains the six installed Halo edits as hash-gated byte changes
against official rc.5. This is recovery source, not another modified upstream binary.
The six repairs cover the already accepted chat/trajectory rendering, SQLite/session
query and session statistics/tool behavior. See the November 3 Desktop report for
the installed acceptance and original upstream/patched identities.

Default: `node recover-archive.mjs --archive <official-rc.5-app.asar>` only reads,
verifies all six source hashes and prints a plan. Add `--output <NEW-app.asar>` to
reconstruct into a separate file. Existing output files and other versions are
refused. Already-patched bytes are recognized. No profile/process is modified.

Installing a reconstructed archive is a separate operator step: preserve the old
archive, wait for Desktop and all its jobs to be idle, exit normally, replace only
the intended archive, then restart normally and verify. Never replace while active.
The complete installer currently extracts official Desktop; it does not silently
apply these machine-specific repairs. Updating upstream can overwrite local archive
edits; retain recovery and re-evaluate source hashes instead of forcing a patch.

The reconstruction guard/plan is checked here; existing installed rc.5 acceptance
is reused. A new full Desktop installation is not claimed by those checks.
