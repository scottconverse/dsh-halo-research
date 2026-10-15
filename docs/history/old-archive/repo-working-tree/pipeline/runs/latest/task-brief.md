> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../../../README.md).

# Task: halo-notify.mjs — a notification + retry utility for stack watchdogs

Generate a single self-contained ESM module `halo-notify.mjs` (target roughly
350-500 lines, plain JavaScript, zero npm dependencies, Node 22+, Windows-first)
that the stack's watchdog scripts can import. JSDoc on every export.

Required exports:

1. `notify(title, message, opts?)` — fire a Windows toast notification via a
   spawned PowerShell one-liner (BurntToast NOT assumed; use the WinRT
   `Windows.UI.Notifications` API through PowerShell), falling back to a
   console beep + stderr line if the spawn fails. Returns a Promise resolving
   `{ok, method}`.
2. `withRetry(fn, opts?)` — run an async fn with exponential backoff:
   configurable attempts (default 3), baseMs (default 500), factor (default 2),
   jitter, and an `onRetry(err, attempt)` hook. Rethrows the last error.
3. `JsonlLogger` — a class appending one JSON record per line to a target
   file: constructor(path), `log(obj)` (adds ts ISO timestamp), `tail(n)`
   returning the last n parsed records, and safe creation of missing parent
   directories. Must always write a trailing newline (a missing trailing
   newline once corrupted this stack's memory graph — never repeat that).
4. `heartbeat(path, intervalMs)` — starts a timer writing `{ts, pid}` JSONL
   heartbeats via JsonlLogger; returns a `stop()` function.

Style: small pure helpers over classes where reasonable, no external state,
every export usable independently. No emoji anywhere.
