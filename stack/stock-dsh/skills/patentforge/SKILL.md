---
name: patentforge
description: Use the installed PatentForge application's project, invention, prior-art and drafting APIs from DSH; retain DSH model selection for work done directly in the conversation.
---
# PatentForge on Halo
Installed release: PatentForge Lean 0.5.0, no bundled Ollama or additional model. Use existing pwsh. Start only when requested work needs it:

    & '<skill-resource-base>/scripts/start.ps1'
    & '<skill-resource-base>/scripts/request.ps1' -Path 'projects'
    & '<skill-resource-base>/scripts/request.ps1' -Method POST -Path 'projects' -Body '{"title":"My invention"}'

Local backend/frontend is http://127.0.0.1:4320; internal services are 4321-4324. This separate launch avoids the existing app on port 3000 and starts no tray, browser, Ollama runtime or model. Private authentication stays in the install's config/dsh-connection.private.json; never display it. The request helper reads it without exposing it.

Use projects/{id}/invention for intake, projects/{id} to inspect a project, and the application's documented API for its pipelines. Read GET settings before launching analysis. IMPORTANT: PatentForge's internal LLM workflows use its own provider configuration, not DSH's Low/64K settings. The Lean app requires separately configured cloud credentials for those workflows; installation does not supply them. Do not silently add credentials, choose models, change DSH defaults, download Gemma or trigger paid analysis. DSH can do research/drafting itself with its current model, Wigolo, retained evidence and the project's saved intake, then create documents with LibreOffice. That is DSH-assisted work, not a completed PatentForge internal pipeline.

Only call create/update/delete or inference endpoints when needed by the user's task. No automatic model calls, benchmarks, broad test suites or deletions. Preserve project/data files. See README for installation, service ownership, recovery and limitations.
