> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../README.md).

# GitHub cursor follow-up — read from the saved DSH archive

Read during the September 1, 2026 handoff. No tool request was reissued.

Session: `session-c3eb66db-84a2-4cda-adf4-ea27d11469da`.

The original request `27fb9e0f-a292-47b6-a8e4-9fb6d8a55606` returned public GitHub fallback results and a cursor. Its complete original envelope/cursor is preserved in `native-access-verification.md`.

At sequence 1212, the same DSH tool was called with query `Streamable HTTP`, repository `modelcontextprotocol/python-sdk`, `max_results=2`, `max_chars=2000`, and that exact returned cursor. Sequence 1213 contained:

```json
{
  "schema_version": "1.5",
  "ok": false,
  "request_id": "236e5f9c-efcc-4bbe-b863-bb7319df2cc0",
  "tool": "github_research",
  "provider": "pagination",
  "error": {
    "code": "CURSOR_INVALID",
    "message": "CursorError: operation did not complete"
  }
}
```

This is an excerpt of the actual envelope, not the entire event. All coverage counts were zero and complete was false; next_cursor was null and items empty. The surrounding MCP tool-result wrapper said `isError:false`. Turn 2 ended at seq 1387 with `reason.kind=completed`; that does not turn the rejected cursor into success.

Source diagnosis: `service.py` obtains a `web_search` envelope then relabels it `github_research`; the signed cursor payload still identifies `web_search`. The GitHub continuation validates a different tool identity.

Raw archive: `C:\Users\scott\.dsh\sessions\--C-Users-scott-Documents-Codex-2026-09-01-is-this-tool-plugin-real-https--\session-c3eb66db-84a2-4cda-adf4-ea27d11469da\session.jsonl.zstd`.
