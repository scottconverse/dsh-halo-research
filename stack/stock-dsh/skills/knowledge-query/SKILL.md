---
name: knowledge-query
description: Answer questions from Scott's shared DSH knowledge library with source citations and explicit gaps. Use when asked to query the library, recall saved research, compare recorded findings or find the sources behind earlier decisions.
user-invocable: true
---

# Query the shared library

Use existing native file/search/PowerShell tools. Both DSH hosts use exactly:
`C:/Users/scott/Documents/DSH Knowledge Library`.
Read `LIBRARY-RULES.md` and `wiki/index.md` first. This workflow is read-only:
do not edit the library, original notes, settings, goals or receipts. Do not launch
agents, automation, models or services. Existing session permissions still apply.

1. Select relevant indexed pages, follow their source links, then adjacent concept/
   entity/synthesis links only where they help answer the question. If the index has
   no useful entry, use bounded native text search over wiki/ with the user's terms.
   Never read every source or scan unrelated user directories by default.
2. Read the relevant source records and, when needed and permitted, the archived text
   or original referenced receipt. Distinguish original evidence from model-authored
   interpretation. For a decisive external file reference, verify its recorded SHA256;
   if missing/changed, say so and treat it as stale, not freshly verified proof.
3. Cite each material factual answer with clickable absolute library-file links and
   relevant headings/lines. Include original source URL/path where useful. Say whether
   the source documents a proposal, test, installed observation or actual release.
4. Retain dates and competing accounts. A newer note is not automatically authoritative.
   Do not mistake a historical failed/incomplete check for the current product state.
5. State missing coverage plainly. If the library has no answer, say so and stop. Outside
   knowledge may be included only when requested and explicitly separated. Do not
   browse the web, refresh live state, or ingest new material just to fill a gap.
6. End with the pages/sources used and important gaps or freshness limits. Do not offer
   automatic recurring maintenance or imply this folder replaces all host memory.

Example bounded search, after reading the index:

```powershell
$kb = 'C:\Users\scott\Documents\DSH Knowledge Library'
Get-Content -LiteralPath "$kb\wiki\index.md"
rg -n -i --fixed-strings -- 'requested phrase' "$kb\wiki"
```

If ripgrep is unavailable, use native file search or Get-ChildItem/Select-String
within wiki/ only. A search match is a lead: read the referenced page before answering.
