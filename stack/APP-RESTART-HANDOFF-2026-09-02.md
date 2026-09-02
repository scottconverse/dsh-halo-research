# Halo app-restart checkpoint — 2026-09-02

Scope: Halo/DSH only. Scott authorized finishing and merging the development integration into production, then a final check-in. Do not work on the Research Gateway, Ollama, CivicCast, LM Studio configuration, or model tuning. Do not reboot.

## At the pause

Production promotion had passed live acceptance at 2026-09-02T21:32:07.697Z. This was deployment, **not yet a Git commit**. Both repositories still had HEAD `092d29c1ee08ca133b3e58b393844b7ff3063b0c`. All implementation is on disk.

- Canonical: `C:\Users\scott\Desktop\Code\dsh-halo-research`
- Development: `C:\Users\scott\Desktop\Code\dsh-halo-dev`
- Live: `C:\Users\scott\.dsh`
- Operator documents: `C:\Users\scott\Desktop\Halo Stack Research`
- Production acceptance: `stack\provider-integration\evidence\production-acceptance.json` in canonical.
- Development suite: `dev\evidence\acceptance.json` and `acceptance.txt` in development. Latest rerun after resume: 105/105, 0 failures/skips, approximately 4.3 seconds.
- Production: 116 original sessions preserved; two owned smoke sessions added. Claude and Codex both resumed exact native session IDs and recalled `ORBIT-41973`. Default restored to local `halo/qwen3.6-35b-a3b`.
- Catalog: 32 LM Studio entries, 3 Claude CLI, 7 Codex CLI, 2705 OmniRoute catalog entries. Catalog entries are NOT proof of access, entitlement, or model acceptance.

## App restart and recovery

After the Codex app restart, fresh checks found ports 3080, 3090, 20130 closed; LM Studio 1234 remained HTTP 200. Previously recorded owned process IDs were gone. This establishes loss across the restart, not a proven root cause.

Only the Halo services were started again using `stack\provider-integration\Restart-Cockpit.ps1 -Action Start` and `stack\mission-control\Launch-Status.ps1 -NoBrowser`. No model load/unload was requested. Mission Control returned healthy with unchanged hash `45D40A25C0A4EFB06DAA0C549D08E92BD7384508BF5D3B75754B74BD31CEE1EE`. Recheck current ports rather than trusting old PIDs.

## Implementation and evidence boundaries

Canonical `stack\provider-integration` contains native CLI runner/provider, per-session continuity, token accounting and deployment scripts. Exact UI overlays are under `stack\packages`: picker `halo-dev-search.4`, conversation `halo-native-metrics.2`, host selection `halo-selection.3`. Earlier selection .1/.2 archives were defective development packaging and must not be deployed.

Native CLI authentication stays in the normal signed-in user's CLI homes. Full native tools remain available. Local tuned pair, memory/research plugins, and existing sessions are preserved. Production OmniRoute 3.8.50 is independent of development: Node 24.20.0 and private state under `.dsh\provider-runtime`, port 20130; development uses 20129. Never commit credentials.json, state databases, personal native transcripts, or `.runtime`.

DSH `/compact` makes a lossless archive checkpoint and continues the same native CLI thread. It is not a semantic summary or proof of automatic CLI context-limit compaction. A real initial post-checkpoint failure (catalog reminder mistaken for latest human request) was found and fixed using message source identity. Repeat live recall passed. Repeated identical user text and queued messages now have deterministic tests. Interrupted mappings start a fresh native context; no automatic job replay is claimed.

Codex usage on resume is cumulative; per-turn metrics subtract persisted prior totals. Missing/reset counters are unknown, not zero. First complete model message is not TTFT or decode speed. Native thread-ID mismatch fails rather than silently claiming continuity.

## Finish after restart

1. Verify current services, default, catalog, preserved sessions without new model calls.
2. Complete `stack\provider-integration\README.md` and `stack\HALO-PROVIDER-PROMOTION-2026-09-02.md`; current-config and guide already have new top sections. Spec 3.5 already has a historical/superseded notice; do not reinstate its old locked worker policy.
3. Copy final development test change and evidence into canonical; retain build manifests/locks so overlays can be rebuilt. Exclude node_modules and obsolete tarballs.
4. Verify rollback backups at `.dsh\backups\native-provider-promotion-20260902\rollback-manifest.json`. Backups include pre-change settings/profile and launcher, plus canonical config copies. Do not overwrite live sessions/memory/native state. Do not actually roll back healthy production merely for proof.
5. Sync documents and deployable configurations to Research and `Current Halo Configuration`. Update only changed manifest entries; validate all prior entries without silently rebaselining unrelated files.
6. Review and commit scoped groups: prior native-access repair; provider planning/history; Mission Control launcher fix; production integration/current records. Also preserve the development sources in their own local Git history. Do not stage `.pnpm-store` SQLite journals, credentials, personal transcripts or unrelated changes. No GitHub push requested.
7. Final report must distinguish deployed, committed, deterministic-tested, live-smoke-tested, and not-yet-audited. Offer Scott the planned check-in/walkthrough, not another long benchmark.

All three subagents were completed/idle at the pause. No acceptance generation or installation was left running by this task.
