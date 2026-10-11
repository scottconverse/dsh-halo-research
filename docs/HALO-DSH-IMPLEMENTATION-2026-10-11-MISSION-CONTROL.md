# Mission Control repair — October 11, 2026

Mission Control now reads Ollama's loopback `/api/ps` inventory in addition to LM Studio. The Models tab identifies each resident's provider, context and size. Exact route matching keeps the two providers separate. Ollama residency does not establish whether it is currently generating; that status remains unknown. LM Studio load/unload controls remain LM Studio controls; the global unload button now says so explicitly.

GPU telemetry first uses Get-Counter and falls back to Windows CIM GPUAdapterMemory. Missing counters remain unavailable, never invented zeroes. The API records which source succeeded. These are adapter-wide allocations across processes, not proof that a particular app owns shared memory or has a leak.

The dashboard status poll has a 20-second timeout, rejects HTTP errors and backend timestamps older than 30 seconds, avoids overlapping polls, and displays a prominent stale/unavailable alert. A successful fresh refresh clears the alert. This detects failed refreshes while the page JavaScript is executing; it cannot repaint a browser renderer that is completely frozen.

Configuration validation was rerun through the dashboard against the installed DSH 0.2.1-alpha.2 configuration: current, successful, no warnings. Validation freshness remains explicit and becomes stale when configuration/version changes or after 24 hours. Validation is an operator check, not an inference job.

Verification: nine focused behavioral tests passed, including provider isolation, counter parsing, unavailable Ollama inventory, stale backend data, HTTP failure, and recovery. Existing shared data contracts yielded 25 passes and two failures; both failures were reproduced against the preserved pre-edit source (an old safeExecFile mock mismatch and a freshness expected-object mismatch). JavaScript syntax passed. Live API and Chrome UI verified Ollama Qwen 27B Q6_K resident with 131072 context, GPU CIM readings around 30.2 GiB dedicated and 4 GiB shared, and current validation. Values vary with workload.

Only Mission Control was restarted using its exact-process, port-3090 stop script. DSH's node process retained its original October 10 start time. No new reporting job, benchmark, model load/unload, or DSH profile change was performed.

Canonical source: stack/stock-dsh/mission-control/mission-control.mjs. Live copy: C:\Users\scott\.dsh-stock\mission-control\mission-control.mjs. Evidence and pre-edit backups: C:\Users\scott\Documents\Codex\2026-10-11\mission-control-repair.
