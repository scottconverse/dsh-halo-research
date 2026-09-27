# DSH Desktop: smaller initial tool catalog, 2026-09-27

Scott approved a smaller default Desktop tool load, Wigolo available on demand,
and deferring computer-use installation. This change is Desktop only. Web DSH,
its models, its preset, and its running process were not changed.

## Deployed configuration

Desktop home: `C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval\home`.

- `cordis.patch.yml`: disable the existing `mcp-wigolo`, `memory-mcp-reference`,
  and `chrome-browser` entries; retain their configuration and installed packages.
- `profiles/desktop/cordis.patch.yml`: the `local` preset disables its existing
  delegation and persistent-terminal groups. Retains PowerShell/background jobs,
  file tools, LSP, history/trajectory search, planning/goals, skills, web tools.
- `.agent-presets/local/agent.cordis.yml` and `preset.yml`: matching preset source
  and description. Persona uses basic web tools, then the optional skill for
  Wigolo. The Desktop home skills directory is included for progressive loading.
- `skills/desktop-optional-tools/SKILL.md`: uses the already installed Wigolo CLI
  through PowerShell when needed. No new search bridge or tool filter was built.

The Local + Codex opt-in preset retains delegation and persistent terminal
composition. Chrome and memory MCP entries remain on the Plugins page, disabled.
No model files, reasoning defaults, context windows, compaction settings, model
loads, launcher scripts, or permissions were changed by this patch.

## Live proof

Restarted the native Desktop application with its existing `DSH_HOME`. A fresh
Local models chat retained Scott's selected `ollama / gpt-oss:20b-cloud`.
The startup reopened a different saved chat with that chat's Q4 selection;
the fresh-chat default remained the chosen cloud model. No model was loaded or
unloaded to run this check. Web listener stayed on port 3080, PID 31028.

Read all zstd frames, not just the first frame:

- Before: `session-57ab7bb4-c92f-405b-96a2-52a53704cfd7`, request/header seq 65,
  **92 tools**, **94,981 compact-JSON schema characters**.
- After: `session-3df5e032-c4d8-4c03-bdbe-e3a5ca3a57fd`, request/header seq 11,
  **27 tools**, **19,888 schema characters** (79.1% fewer).
- The planned set was 30. The three MCP resource helpers also disappeared with
  the disabled MCP catalogs; the 27 retained names are in the evidence JSON.
- DSH's new tool-token estimate is **4,976**. The earlier full-catalog estimate
  was about **23,750**. These are harness estimates, not tokenizer measurements.
- First response on this cloud model reported 5,599 input tokens plus 87 cached
  tokens. Different model/tokenizer and prompt: not a controlled Qwen speed test.

Fresh-chat checks:

| Check | Observed result |
|---|---|
| Stock web_search | Failed, seq 43: `WEB_PROVIDER_CREDENTIAL_MISSING`; DeepSeek search needs `DEEPSEEK_API_KEY`. |
| Stock web_fetch | Seq 48: HTTP 200 fetching Node.js assertion documentation. |
| Optional skill | Seq 38: `desktop-optional-tools` loaded through the stock skill tool. |
| Wigolo on-demand CLI | Seq 63: successful execution and two Node.js results; no MCP schemas loaded. Results were generic home/download links, not the requested assertion page. Engine report said thin/degraded pool. This proves execution, not search quality. |
| Existing coding fixture | Seq 68: `npm test`, 7 pass / 0 fail in `C:\Users\scott\Documents\Codex\2026-09-26\dsh-desktop-q6-verification`. No edits. |
| Completion | Seq 73: turn/end, reason completed. |

The model first made two invalid empty-path glob calls, then corrected its path.
It also made two invalid PowerShell argument calls (empty permissions and empty
justification), then corrected them and executed successfully. These were model
argument errors, not missing tools. This was a capability smoke test, not a claim
of flawless agent execution or a new coding benchmark.

## Daily use and limitations

Use the **Local models** preset for the smaller initial catalog, even when choosing
a cloud model. Existing conversations keep their history; a fresh chat best
shows the reduced starting load.

For research, say: **Use desktop-optional-tools and search with Wigolo.** Its
instructions load only when called, and the CLI runs only for that request.
Stock fetch already works. Stock search is present but currently has no DeepSeek
credential; the skill directs the agent to report this and use Wigolo on demand.
No DeepSeek login or new paid API key was added. A successful CLI search can still
return weak results; inspect the links and engine warnings.

Computer-use installation remains deferred. This change does not fix the separate
Q4 reasoning-selector omission or establish that long-session compaction succeeds.

## Reproduction, rollback, recovery

`stack/desktop-tuning/apply_small_catalog.py` is a targeted, one-time deployment
script for this existing Scott Desktop layout. It requires Python and PyYAML,
validates YAML before writes, and makes backups. It intentionally rejects an
already-applied or differently shaped configuration. It is not a general DSH
installer and does not include credentials or model configuration.

```powershell
python stack/desktop-tuning/apply_small_catalog.py --home 'C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval\home' --backup '<new backup directory>'
```

Original backup: `C:\Users\scott\Documents\Codex\2026-09-27\desktop-tool-audit\before`.
It contains the four original config files and an applied-file hash manifest.
To roll back, restore only the affected disabled flags, persona, skill-directory
entry, and preset description. **Do not blindly restore the complete old profile:**
Scott changed his model selection after backup, and restoring it would overwrite
that choice. The optional skill can remain installed without being invoked.

Human-readable copies and current deployable files are under
`C:\Users\scott\Desktop\Halo Stack Research`, with config snapshots under
`Current Halo Configuration\desktop-small-catalog-2026-09-27` and hashes in the
parent `MANIFEST-SHA256.txt`. Secrets are not part of those snapshots.

Machine-readable proof: `stack/desktop-tuning/evidence/verification-2026-09-27.json`.
Live logs are under the Desktop home `sessions` directory. The model's own final
report appears in the visible chat named **Assert Verification for Desktop Tool**.
