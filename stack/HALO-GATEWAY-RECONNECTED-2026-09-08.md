# DSH Gateway reconnection — 2026-09-08

Enabled the existing production `mcp-halo-research` plugin in
`C:\Users\scott\.dsh\profiles\web\cordis.patch.yml`, pointing to
`http://127.0.0.1:8765/mcp`. Set `failOnStartupError: false` to avoid repeating
the whole-cockpit startup failure when this optional service is unavailable.
DSH hot-reloaded the connection; no restart, unload or model reconfiguration was
needed. This change supersedes the disabled connection recorded in today's
Gateway installation and Router promotion reports.

## Live DSH proof

The existing acceptance driver was temporarily mounted, then removed. The exact
prompt is in `halo-router-production/gateway-smoke.mjs`. This was an explicitly
directed connection test, not an unassisted benchmark or new model qualification.
Local model: `lmstudio/halo/qwen3.6-35b-a3b`, manual in this test session only.
Session: `halo-acceptance-8421af6c-295e-4185-bb97-ee669ab6db3d-909659c6-e237-42c2-8090-b74c2c38fc67`.
Elapsed: 54.821 seconds.

- `mcp__halo_research__web_search`: call seq 43 / result seq 44, `ok: true`,
  exa-anonymous, fresh search. Two results on this page with a continuation;
  this test requested only one useful search URL, not exhaustive coverage.
- `mcp__halo_research__web_fetch`: call seq 45 / result seq 46, `ok: true`,
  direct-http cached evidence, title `Example Domain`.
- Final answer contained the title and an official MCP specification URL.
- No shell/browser substitute was used. Full transcript is saved in
  `halo-router-production/gateway-evidence/dsh-live.json`.

## Preservation and recovery

Model settings and verified-coder preset hashes remained identical; router defaults
and existing session controls were preserved. Only the disposable diagnostic
session acquired a Manual override. No provider credentials were changed.

Before-files: `C:\Users\scott\.dsh\backups\gateway-reconnect-2026-09-08`.
To undo only this connection change, restore its `web-cordis.patch.yml` to the
production web profile after checking for later edits. Do not restore all `.dsh`.
The Router promotion manifest receives an explicit amended current hash while its
prior manifest is retained in this reconnection backup. Router rollback continues
to preserve this independent Gateway connection setting.

Current configuration, this record and deployable config are copied into Scott's
Halo Stack Research folder and its Current Halo Configuration recovery bundle.
