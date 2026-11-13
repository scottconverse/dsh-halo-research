# DSH Complete Windows installer 0.1.2

Web and official Desktop **0.2.2-rc.1**, with the full seven-tab **Mission Control embedded inside Desktop**. Web retains its browser dashboard. This is repository release **v0.3.14**; the installer version is **0.1.2** and the upstream app version is **0.2.2-rc.1**.

## Download and install

Download `DSH-Complete-Windows-0.1.2.zip` and its `.sha256` file from this release. Verify the checksum, extract the ZIP, then run `Install-DSH.cmd`. Use a **new destination** and retain your existing installation and rollback material.

ZIP SHA-256: `41c395a0507cd36a22994a87398324946818e9f75789fc3c92362b7ee5bca4dd`.

`INSTALLATION.md` covers prerequisites, separate account/model setup, ports, shortcuts and recovery. `VERIFICATION.json` records the accepted payload's verification. Applications download during setup; internet access is required. Missing shared build prerequisites may request Windows elevation or a restart. No model weights, credentials or private corpus are bundled. The installer does not pull or invoke models; normal XERJ startup can load an embedding model.

## Included updates

- Web and official Desktop pinned to 0.2.2-rc.1, with a freshly resolved locked runtime.
- Embedded Desktop Mission Control: Overview, Models, Sessions, Plugins, System, Memory and Settings, using Desktop's own authenticated connection and separate state.
- Separate profiles, private ports and installation-owned process checks preserve coexistence with an existing installation.
- Existing Qwen/local and DeepSeek 1017 cloud choices, Low effort policy, companion integrations, triad/shared-library features and optional account-backed tools retained. Companion component pins are unchanged in this installer update.

## Verification and limits

This publishes the **unchanged, already accepted installer ZIP**. Its checksum and all 45 manifest entries were verified again for publication. The accepted payload passed isolated headless Web/Desktop-host checks, all seven embedded tabs, 11 installer/panel tests and 81 affected dashboard contracts. Official Desktop artifact/executable signatures were independently verified during acceptance. No model or account-backed requests were used for that acceptance; test-only profiles prevented companion model startup.

This is not a fresh-PC prerequisite, provider sign-in, model-quality or GPU certification. The payload remains upstream release-candidate software. Detailed evidence and recovery limits: [installer verification](https://github.com/scottconverse/dsh-halo-research/blob/ab3b2b32cf8ba6ef357dbc0cd73c11b3279ce07f/docs/DSH-COMPLETE-WINDOWS-0.1.2-2026-11-13.md).

The ZIP contains public setup scripts/locks, not a newly built user-owned executable. Existing upstream signatures remain intact. Older releases and their assets are preserved. No working installation, settings, model defaults, sessions or goals are changed by this publication.

[Project website](https://scottconverse.github.io/dsh-halo-research/) · [Source](https://github.com/scottconverse/dsh-halo-research)
