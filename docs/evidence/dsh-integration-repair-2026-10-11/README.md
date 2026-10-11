# DSH integration repair evidence — October 11, 2026

This folder contains sanitized, version-controlled evidence summaries for the
October 11 DSH integration repair. It records implementation scope, tests,
historical end-to-end paths, the failed compaction attempts, and the terminal maintenance attempt without publishing raw prompts, provider responses,
conversation bodies, credentials, or private runtime logs.

`integration-summary.json`, `native-provider-summary.json`,
`compaction-attempts.json`, `compaction-input-estimate.json`, and
`compaction-events-summary.json` contain the reviewed facts. The text files in
`test-results/` record exact focused test commands and pass counts. The three bounded local-receipt scripts in `scripts/` extract only bounded lifecycle or status
metadata from locally held raw receipts; the compaction input analyzer also
reports message byte counts and the installed DSH heuristic token estimate.
None prints provider prompt/response content. They accept explicit local input
paths and do not make network or model requests.

The external audit folder remains the detailed local evidence source:
`C:\Users\scott\Documents\Codex\2026-10-11\dsh-integration-audit`. Its raw
session and provider files are intentionally not copied here. The matching
repair chronology and requirement matrix are in
`../../HALO-DSH-TRANSPORT-COMPACTION-REPAIR-2026-10-11.md`.

`SHA256SUMS.txt` hashes every file in this folder except itself. Regenerate it
from this directory with:

```powershell
Get-ChildItem -File -Recurse | Where-Object Name -ne 'SHA256SUMS.txt' | Sort-Object FullName | ForEach-Object { $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant(); '{0}  {1}' -f $hash, $_.FullName.Substring((Get-Location).Path.Length + 1) } | Set-Content -Encoding utf8 SHA256SUMS.txt
```

Current closeout: FULL-REPAIR-CLOSEOUT-2026-10-11.md. The combined accounting snapshot and non-overlapping post-snapshot delta are FULL-CLOSEOUT-ACCOUNTING.json and POST-SNAPSHOT-USAGE.json. The sanitized Desktop Haiku 5.5 receipt is HAIKU55-PICKER-RECEIPT.json.