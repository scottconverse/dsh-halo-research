---
name: siftwing
description: Use the installed Siftwing research/evidence service for retained sources, document extraction, OCR workflows, collections and research runs through its native CLI.
---
# Siftwing on Halo
Use the existing pwsh tool with the installed lifecycle-aware CLI. It resolves current.json and reads authentication from the existing private token file; never print/copy that token into chat or the repo.

    & 'C:/Users/scott/AppData/Local/Siftwing/bin/siftwing.ps1' status
    $runs = & 'C:/Users/scott/AppData/Local/Siftwing/bin/siftwing.ps1' jobs '{}' | ConvertFrom-Json
    $runs.data | Select-Object -First 5 id,kind,status

Service URL is http://127.0.0.1:4310. If stopped and a task needs it, run the same script with start and confirm status. Preserve its existing models, connections, evidence and data directory. Do not restart an active run. For operation names/schemas, invoke help; commands accept a single JSON argument string, for example collection_create '{"name":"Reporting evidence"}'. Use native run IDs and collection IDs to inspect/export results. Long research/OCR jobs should run only when requested, with bounded source scope and status checks rather than relaunching them. Models/paid routes are not automatically inherited from DSH. Do not change Siftwing routes or launch benchmarks as connection checks. Wigolo, Reddit/Redlib and XERJ remain available for their existing purposes. Record original-source references and distinguish extracted/OCR text from examined original pages.

IMPORTANT: jobs returns complete retained runs and can be very large. Capture it in a variable or local file, then select only required IDs/status fields. Never dump the full runs response into model context. Use evidence_search with an explicit small limit for targeted offline retrieval.
