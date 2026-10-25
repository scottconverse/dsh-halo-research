# DSH Web model-routing skill installation — October 24, 2026

Installed `deepseek-harness-model-routing-1024` into Web's existing custom skill root. Web now discovers it as model-invocable. One offline request-capture check from the installed directory passed all 22 assertions; no model calls or benchmarks were run.

## Installed candidate and operation

- Source: https://github.com/scottconverse/deepseek-harness-model-routing-1024, commit `2900b9c6e29d2f894f47c54cc01df0583f9f0a6d`.
- Installed folder: `C:\Users\scott\Desktop\Code\dsh-halo-research\stack\stock-dsh\skills\deepseek-harness-model-routing-1024`.
- Copied the source repository's 17 tracked files only. All 17 source/installed hashes matched. No `.git`, runtime ledger, credentials or private session data were copied.
- Web already configures this custom skill root in its presets. No profile edits were needed.
- Load `/deepseek-harness-model-routing-1024` in Web, or ask it to load the skill. The request helper is `scripts/route.ps1` inside that folder. Merely loading the skill does not run a batch or change the session model.
- Exact model `deepseek-v4.1-flash:1017-cloud` defaults to `think: "low"` and `options.num_predict: 65536` in individual calls and every batch item. Explicit overrides remain available. Context is recorded as provider-managed, with an advertised 1,048,576-token capacity; no `num_ctx` is sent.
- Other cloud tags remain blocked from batch. Unlisted local models keep their existing provider defaults. Cloud execution and Ollama HTTP transport are recorded separately; API-equivalent cost estimates are not subscription bills.

## Verification performed

Ran `pwsh -NoProfile -File scripts/test_batch_offline.ps1` once from the installed Web folder. Its local HTTP mock captured one exact-ID DeepSeek call, two DeepSeek batch items and one local Qwen item. All three DeepSeek bodies carried Low/65,536. Another cloud tag was blocked without a request; Qwen received no imposed defaults. Ledger assertions covered resolved settings, sources, unique IDs, returned model, tokens, stop reason and cost classification. Result: **22 passed, 0 failed**.

Web was not listening on its configured port 3080. Started its existing `start-dsh-detached.mjs` launcher, which reported PID 43380, and left Web running. Authenticated using the existing local launch flow without publishing its token. Native `session/list` and `skills/list` reads confirmed this skill's installed path and `modelInvocable: true` in an existing session's 13-entry catalog. No prompt was submitted, session selection changed or model loaded by this task.

Root Web configuration, the Web profile and Desktop profile SHA-256 hashes all remained unchanged. Models/defaults and existing integration configuration were preserved; this task did not retest Wigolo, Reddit/Redlib or XERJ. Desktop was not restarted.

An initial port-3000 read reached TownReporter, not DSH; no changes were made there. Two catalog requests used an incomplete RPC envelope and were rejected before dispatch; reading the installed protocol source supplied the correct envelope. The successful catalog reads used port 3080 and `payload.args`. Mission Control port 3090 was not listening and was not started or repaired; that is outside this skill-install scope.

## Evidence and limits

Sanitized evidence: [installation and provenance](evidence/routing-skill-web-2026-10-24/installation.json), [offline capture assertions](evidence/routing-skill-web-2026-10-24/offline-mock.log), [live discovery](evidence/routing-skill-web-2026-10-24/discovery.json), [settings preservation](evidence/routing-skill-web-2026-10-24/settings-preservation.json).

This establishes installed script behavior against a mock plus actual Web discovery. It does not establish live cloud response quality, server-enforced context/output limits or external Claude/Codex CLI operation. No model workload or benchmark tokens were generated; Codex orchestration usage is not available as an exact per-turn receipt. No subagents, package installation, model downloads, release or tag.

Recovery: the exact installed skill and this report are copied under `Halo Stack Research\Current Halo Configuration\routing-skill-web-2026-10-24`, with SHA-256 entries in the existing manifest. Removing only this skill folder would undo the installation; Web profile files need no restoration.

Publication note: git diff --check flagged extra blank lines at EOF in seven files inherited unchanged from source commit2900b9c. These are formatting warnings in the copied upstream files; they were retained to preserve the exact installed candidate. No additional functional tests were run.
