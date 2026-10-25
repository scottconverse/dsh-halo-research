# OpenRefine connection

Available to DSH Web and Desktop through their existing native skill/pwsh tools.
Read SKILL.md for actual commands. No new plugin or provider configuration.

## Installed components and recovery

- Official Windows archive: [OpenRefine 3.10.1](https://github.com/OpenRefine/OpenRefine/releases/tag/3.10.1), `openrefine-win-with-java-3.10.1.zip`.
- SHA256: `6155b20a8103244a26a8f21d41698ee52251538a838e3d5f2d5af507c8b6f3c8`.
- Extracted to `%USERPROFILE%\.dsh-stock\tools\openrefine-3.10.1`; the archive contains its own `openrefine-3.10.1` directory.
- Bundled Java 11 reused privately; existing system Java 21 unchanged.
- CLI 1.0.1 built from [HKUDS/CLI-Anything commit 34f5195](https://github.com/HKUDS/CLI-Anything/tree/34f519533bc175d2fe287ab8316b0dd99bb9cc43/openrefine/agent-harness), installed into `%USERPROFILE%\.dsh-stock\tools\cli-anything-openrefine`.
- No PyPI package existed at installation time. Recover using an isolated Python 3.13 environment and `pip install <pinned-source>/openrefine/agent-harness`. Do not install globally.

The small startup script uses the distribution's Java classpath and documented
refine.* properties. Headless startup suppresses browser auto-open; the browser
UI remains available on loopback port 3333. Java heap is 256M minimum/1400M maximum.
Data and logs remain in `.dsh-stock/tools/openrefine-service`; preserve this folder
for recovery. There is no login autostart. Install bundles/venvs are local only.

Version caveat: although the official archive hash matches release 3.10.1, its
running get-version endpoint reports `3.10-SNAPSHOT [TRUNK]`. That label was not
patched or represented as runtime proof of 3.10.1. Actual import, GREL operation
and CSV export succeeded; see the dated installation report and receipts.

Rollback: remove only this skill from the canonical/fallback roots to disconnect
DSH. Keep projects/data. Before removing the isolated installation, shut down its
owned server safely, checking executable/start time against owner.json. Do not
terminate unrelated Java processes or remove user data. Upstream application
licenses remain in the downloaded distribution.
