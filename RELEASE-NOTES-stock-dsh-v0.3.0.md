# Stock DSH v0.3.0

Date: September 14, 2026.

This release makes the restored Mission Control memory area operational on the stock DSH deployment.

## What changed

- Stock DSH now starts the reference memory MCP through its Cordis overlay and stores durable knowledge in `C:\Users\scott\.dsh-stock\memory\memory.json`.
- Mission Control shows the real knowledge graph, memory-writer state, scheduled recovery-task definition, and retained snapshots.
- The `HALO Memory Snapshot` task now uses the stock repository script, the `.dsh-stock` store, hourly and startup triggers, missed-run recovery, overlap protection, and 168-copy retention.
- A stale task definition, including one aimed at the retired `.dsh` tree, makes the Store signal red with the exact mismatch.
- Live acceptance requires the store, active writer, valid task, and current snapshot instead of treating memory as optional.
- Startup waits for the DSH-owned Wigolo MCP child, and shutdown waits for the exact DSH and Mission Control listeners to close before reporting success.

## Verification

- 123 focused contract checks passed across reasoning, data, UI, installer, memory-snapshot, and live-acceptance contracts.
- Mission Control source and installed SHA-256: `079729CF086E6C557EB79300BC076D4BD563D6B9D439BF9F416BC73B1D430437`.
- Install receipt: `C:\Users\scott\.dsh-stock\mission-control\backups\install-20260914-135354-758-13e11178.json`.
- Receipt SHA-256: `6A7B91F29E0C2141DDBF8456DD05ED57D72CF002C5E2458F012B71E8BC11F7B4`.
- Required-memory live acceptance passed 216 checks. Evidence: `stack\stock-dsh\mission-control\live-acceptance-stock-dsh-v0.3.0.json`.
- A DSH session wrote the `Halo DSH Deployment` entity through `reference_memory`; a fresh session retrieved its two observations.
- Mission Control rendered the entity and observations in the Memory area.
- The scheduled task produced `memory-20260914-140256.json`; its SHA-256 matched the live store, and no partial-write file remained.
