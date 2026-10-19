# Stock DSH v0.3.1 - Cloud selections and Mission Control

This is a source release of the Halo deployment repository, not a new upstream DeepSeek Harness version or a standalone Windows installer. The deployed Web runtime remains DSH 0.2.1-alpha.2.

## Completed October 19 repairs

- Web and Desktop default Ollama cloud route: DeepSeek `deepseek-v4.1-flash:1017-cloud`, effort Off. Other provider and local-model selections were retained.
- Existing retired DeepSeek selections migrated in the installed profiles: four Desktop sessions and five Web sessions. These were installed-state operations; this source release does not provide an automatic migration command for other machines. An archived Web session's original workspace remains missing, although its saved model selection is migrated.
- Mission Control identifies cloud execution from exact Ollama remote-host metadata instead of treating every local Ollama connection as local inference.
- Sessions distinguish **Next request (saved)**, including effort, from the historical **Last used** model.
- Mission Control configuration validation was refreshed against the installed DSH build and passed without warnings.

## Verification and limitations

Mission Control's four required installer contract suites passed all 108 checks for the final candidate. Actual installed dashboard rows and cloud status were verified. Mission Control source/installed SHA-256: `438536B40A0357038FFD606696FABCFD8B4E4FC7504808AA38199C0B547DEAA5`. No benchmark or generation request was run for the Mission Control repair. Historical model checks are described separately in the reports below; they were not rerun for this publication.

Only committed files are included. Older unrelated local modifications, private work files, raw session histories, credentials and local backups are excluded. This release does not certify those unpublished changes.

## Repair records

- [Desktop existing sessions](docs/HALO-DESKTOP-SESSION-MODEL-REPAIR-2026-10-19.md)
- [Web existing sessions](docs/HALO-WEB-SESSION-MODEL-REPAIR-2026-10-19.md)
- [Mission Control repair and validation](docs/HALO-MISSION-CONTROL-CLOUD-MODELS-2026-10-19.md)
- [Default model change and earlier verification limitations](docs/HALO-DEEPSEEK-1017-DEFAULT-2026-10-19.md)
