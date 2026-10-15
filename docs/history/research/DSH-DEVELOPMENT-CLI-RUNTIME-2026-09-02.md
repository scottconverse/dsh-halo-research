> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# Native subscription CLI runner — development only

Metrics update (2026-09-02): normalized events additionally carry monotonic `elapsedMs`, and launched runs return `durationMs`. `dev/cli-metrics.mjs` maps terminal counters; the adapter persists raw and mapped receipts. See [CLI-METRICS-2026-09-02.md](CLI-METRICS-2026-09-02.md). Aggregate usage is deliberately not emitted as DSH context-occupancy usage. Codex already supports its own automatic compaction; persistent native-thread integration remains separate work.

SCOPE: `C:\Users\scott\Desktop\Code\dsh-halo-dev`. Prepared 2026-09-02. Production DSH configuration is untouched.

Scott approved using the existing official CLI accounts, as TownReporter already does. `dev/cli-runtime.mjs` calls native Claude Code/Codex executables directly, without a shell, package installation, credential copying or an automatic login flow. This is equivalent provider-owned coding execution, not a claim that DSH executes each native tool call itself.

## Integration API

```js
import { findNativeCli, probeNativeCli, runNativeCli } from './cli-runtime.mjs';
const common = { provider: 'claude', userHome: 'C:\\Users\\scott', cwd: fixturePath };
const executable = findNativeCli(common.provider, common);
// Optional read-only status command; does not invoke model inference or start a login:
const status = await probeNativeCli({ ...common, executable });
// Actual coding: only call when that task is authorized.
const result = await runNativeCli({
  ...common, executable, model: 'sonnet', prompt: originalPrompt,
  timeoutMs: 600000, signal: abortController.signal,
  onEvent(event) { /* event = {type, text, raw}; store/stream evidence, not tool execution */ }
});
```

`runNativeCli` returns `ok`, `status`, `provider`, requested `model`, `pid`, `exitCode`, `final` (also `text`), normalized `events`, `errors`, `stderr` and `processExited`. Status is `completed`, `auth-required`, `timeout`, `cancelled`, `refused` or `failed`. Unsupported purposes and invalid arguments are explicit failed results. The returned `model` identifies what was requested; corroborate the actual provider model from raw initialization events rather than treating it as attestation.

The native CLI consumes the original prompt on stdin. The runner does not append a test brief, newsroom role, tools denylist, output-format instruction or implementation steering. `onEvent` receives raw tool-execution records for evidence; DSH must **not execute those calls a second time**. Keep these records in ignored development evidence; native tool output may contain sensitive task data.

`probeNativeCli` returns only a whitelisted status and authentication method plus executable identity, never raw status output, email or key fragments. Its maximum timeout is 10 seconds. Authentication is not inference proof, and inference is not coding acceptance.

## Native arguments, verified from installed CLI help

Claude coding uses `-p --model MODEL --output-format stream-json --verbose --no-session-persistence --dangerously-skip-permissions`. No restricted newsroom `--allowed-tools` option is passed. Optional `reasoningEffort` maps to `--effort` (`low`, `medium`, `high`, `xhigh`, `max`); model/account support still has to be observed.

Codex coding uses `exec --model MODEL --json --ephemeral --color never --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox -`. Optional effort maps to the supported generic config override `-c model_reasoning_effort="LEVEL"`. The generic override mechanism is verified; acceptance of any particular effort by a model remains provider-dependent.

Both preserve native full-user coding capability and normal user settings. The work request still limits where/what the model is authorized to change. This runner is not a security isolation boundary.

### Auxiliary requests

Explicit `purpose: 'title'`, `'session-title'` or `'compaction'` uses Claude with `--tools '' --strict-mcp-config --mcp-config '{"mcpServers":{}}' --disable-slash-commands`, without bypass-permissions. This disables model-selectable built-in tools, MCP tools and slash commands for synthesis requests only. Normal configured startup hooks may still run as part of the native CLI environment; do not represent it as a zero-side-effect operating-system sandbox.

Codex auxiliary requests currently return an explicit unsupported error without spawning. Read-only mode still allows command execution; it is not a verified tool-free completion endpoint. The DSH integration must handle this transparently, not secretly run a new full-access coding task to produce a title/summary.

## Account reuse and ownership

The runner forces normal `HOME`/`USERPROFILE`, `CODEX_HOME=C:\Users\scott\.codex` and `CLAUDE_CONFIG_DIR=C:\Users\scott\.claude`, overriding the earlier empty development homes. It removes inherited provider API-key/token/base-URL overrides, Claude Bedrock/Vertex/Foundry selectors, and the nested Claude marker, case-insensitively and only in this child's environment. That keeps an official subscription route from silently becoming an environment-directed API route. It does not alter persisted user config or the parent's environment; normal tool capabilities and unrelated environment variables remain. User configuration can itself select a backend, so verify actual auth/provider events. No tokens, browser profiles or credential files are opened by this module.

Native CLIs can update their own account caches/logs or refresh tokens. Ephemeral/no-session-persistence flags do not promise zero writes anywhere in the user profile. This is the explicitly approved exception to development-only state; it does not authorize production DSH edits or arbitrary test work outside the development fixture.

Timeout/cancellation addresses only the PID returned by this spawn, using Windows `taskkill.exe /PID <owned pid> /T /F`. It never kills by process name or stops unrelated CLIs. Failed tree termination attempts fall back to killing the owned child. The normal runner waits up to `terminationGraceMs` (default 3000) for exit; `processExited:false` means cleanup was not confirmed and must be reported before another overlapping run. The lightweight status probe reports `processExitUnconfirmed:true` on timeout instead of claiming cleanup completed.

## Evidence and known boundaries

Baseline before new files: `node --test dev/*.test.mjs`, 26 tests, 26 pass, 0 fail.

Runner test first RED: 11 tests, 3 pass, 8 assertion failures (not import failures); first GREEN 11/11. Probe addition RED: 15 tests, 13 pass, 2 assertion failures; GREEN 15/15. Auxiliary MCP/skill omission independently failed an assertion before correction. The inherited provider-redirect regression then failed specifically on `ANTHROPIC_AUTH_TOKEN`; final runner GREEN was 16/16. Tests mock the process boundary and exercise argv/env/stdin, native events, split UTF-8, auth failure, refusal, nonzero exit, malformed output, cancellation, timeout, discovery and status redaction. They do **not** establish live subscription access or real coding success.

Full concurrent development suite checkpoint: `node --test dev/*.test.mjs` → 52 tests, 52 pass, 0 fail, 0 cancelled, 0 skipped, 2381.3988 ms. That includes the parent implementer's adapter tests; it is a dated checkpoint, not a guarantee that later edits remain green.

Read-only implementation reference: `C:\Users\scott\Desktop\Code\townreporter-dev\src\lib\news\ai-codex.server.ts` and `ai-claude-code.server.ts`. Only their native executable/account/process pattern was reused; the newsroom prompt and restricted tools were deliberately not transferred.

This module does not install CLIs, grant subscription entitlements, turn API-only providers into subscription routes, or guarantee completion after provider/network failure. It has no persistent session-resume implementation; the DSH adapter must deliberately supply needed history/context on each native invocation and disclose that boundary.
