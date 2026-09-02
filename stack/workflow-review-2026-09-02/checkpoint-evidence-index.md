# Exact historical checkpoint evidence

This closes the review's traceability gap without copying private native transcripts into Git. These are **existing development records**, inspected on 2026-09-02, not a new production compaction test.

Development DSH session: `session-3be073f6-10f1-4f2d-baec-d42fe406924c`.
Native Codex thread throughout: `01a063f2-791a-71e1-b8ee-b021b69cf8d3`.

Base directory: `C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\evidence\cli`

| UTC start | Receipt filename | Observed final result | SHA-256 |
|---|---|---|---|
| 21:07:09.007 | `1788383236625-1d2526ac-8f12-4d5e-8098-2bd0bb42adff.json` | `ACK — LAPIS-68219.`; new native thread | `0C5D08B9450C53367D11BC75722AD711C960A1C183AF0C5B682ECE92A27A74BE` |
| 21:07:17.180 | `1788383242782-123a9c8b-9b72-41fa-9d0a-20baf77c65d4.json` | `LAPIS-68219`; ordinary resumed turn | `E4B04C7C91C78851CC9E8B9389823B8000D124A74DF23F4BBF94805227DD43B1` |
| 21:14:54.750 | `1788383703540-797a8193-f1d0-488a-bb17-1537b6ef5078.json` | `Ready for the next task.`; failed requested recall after checkpoint | `8F1976143B8A474A00634923B02E118A1B3FA9EC1AE54B4A7E07D5F94F4AC8E8` |
| 21:19:09.156 | `1788383955392-c9aed178-664a-472b-bdd9-e8c79d0fea36.json` | `LAPIS-68219`; successful post-fix resumed recall | `FC159A1DB061D851AC0F7AFEAED586BA899244F2B44E87AE1E792413302643D4` |

Both exact checkpoint archive files were verified present:

- `C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\native-threads\checkpoint-5edf2069-1962-4ac7-a534-610acf5482e5.json`
- `C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\native-threads\checkpoint-e15c9ab8-24db-4a33-942c-19825ee71ad3.json`

The chronology and preserved failure support the documented source-aware message-selection fix. They do not establish near-limit native auto-compaction or successful long-running autonomous code generation. Raw archives remain private local state and must be deliberately exported/redacted if an off-machine auditor needs their contents.
