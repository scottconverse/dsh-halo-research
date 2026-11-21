# Complete DSH for Windows 0.1.4

Installer 0.1.4 pins Web and the official Desktop application to **0.2.2-rc.5**. It keeps Web Mission Control, the embedded Desktop Mission Control panel, the full-memory and 32K capped Halo + 5070 Ti presets, and opt-in, lead-only Browse.

The Windows bundle includes the guarded Web runtime repairs from [PR #14](https://github.com/scottconverse/dsh-halo-research/pull/14). Setup derives recovery mirrors from the new installation’s registered Web presets. The normal launcher checks those mirrors and the reviewed runtime patches before starting services. Each installation has its own profiles, data, processes, and recovery files.

Download the installer and checksum and see the [installation guide and verification receipt](https://github.com/scottconverse/dsh-halo-research/releases/tag/v0.3.18) on the release. Install into a new directory under `%LOCALAPPDATA%` when keeping an earlier installation. Two installations using the same loopback ports cannot run concurrently. Keep the earlier directory and use its own shortcuts to roll back.

The setup downloads the official Desktop installer, verifies its pinned digest, and extracts the application into the new directory. It does not run the upstream installer or updater. Model weights and provider sign-in are separate from setup.

On November 20, 2026, the same published ZIP installed on a separate Windows 11
PC with an RTX 5060 Ti. The default Web UI and both Mission Control views passed
headlessly, including all seven tabs on each host. A long destination failed
during the Redlib build. Setup succeeded in a new `%LOCALAPPDATA%\D014` folder.
[Installation guide](../stack/complete-windows/README.md#install-on-the-destination-pc) · [5060 Ti verification evidence](evidence/complete-windows-0.1.4-5060ti-2026-11-20/README.md).
