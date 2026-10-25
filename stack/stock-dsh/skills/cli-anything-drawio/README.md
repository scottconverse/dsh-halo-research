# draw.io connection

Available to DSH Web and Desktop through their existing native skill/pwsh tools.
Read SKILL.md for commands matching the installed package, including returned
shape IDs and explicit --project auto-save.

## Installed components and recovery

- Official [draw.io Desktop 32.6.1](https://github.com/jgraph/drawio-desktop/releases/tag/v32.6.1), Windows no-installer ZIP.
- SHA256: `41291ad0c06469c183b65793e7604dcb83a6d21d8e339a333790cb1d7576a2ed`.
- Extracted to `%USERPROFILE%\.dsh-stock\tools\drawio-32.6.1`; real application is `draw.io.exe` in that directory.
- [CLI-Anything drawio 1.0.0](https://pypi.org/project/cli-anything-drawio/1.0.0/) installed into `%USERPROFILE%\.dsh-stock\tools\cli-anything-drawio` with isolated Python 3.13.
- Recovery: create that private environment and `pip install cli-anything-drawio==1.0.0`, restore the verified application ZIP and this skill. No global PATH/package changes.

The CLI edits real draw.io XML and invokes the desktop app for rendering. PATH is
set only in the child PowerShell command. The published PyPI CLI lacks upstream
main's --id argument; capture shape-add JSON and pass the returned IDs to connect.
SVG export was verified with the real installed renderer. PDF/PNG are available
commands, but were not additionally tested for this installation.

No background service, login autostart or model configuration is needed. Opening
an existing diagram in the GUI uses the absolute app path and diagram path.
Preserve open windows/user files. Rollback removes only this skill from the
canonical and fallback roots; the isolated app/environment can then be removed
when unused. Keep editable documents. Upstream licenses ship with the app.
