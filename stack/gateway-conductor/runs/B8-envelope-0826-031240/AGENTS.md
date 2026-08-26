# Unit B8 — result envelope and character-budget pagination

Implement ONLY this file: `src\halo_research_gateway\envelope.py`

The frozen tests at `tests\unit\test_envelope.py` are the complete
specification. **Read them first** — they pin every function signature, key
name, and behaviour. Do not create, edit, or delete any test file.

Use only the Python standard library (`json`, `base64`, `dataclasses`,
`typing` are enough). No third-party imports.

## What to build

`SCHEMA_VERSION: str` — the string `"1.2"`.

`build_envelope(tool, provider, request_id, requested_at, completed_at,
items, requested, available, char_budget, cache_hit=False,
cache_age_seconds=0, cache_key="", cursor=None, warnings=None) -> dict`

Returns a dict with exactly these top-level keys: `schema_version`, `ok`
(True), `request_id`, `tool`, `provider`, `requested_at`, `completed_at`,
`cache` (`hit`, `age_seconds`, `key`), `coverage` (`requested`, `available`,
`returned_this_page`, `returned_cumulative`, `complete`), `page` (`number`,
`serialized_chars`, `next_cursor`, `snapshot_expires_at`), `items`,
`warnings`, `retry_after_seconds`.

Pagination rules:
- `cursor=None` means page 1. A cursor encodes the index to resume from —
  make it an opaque string (e.g. base64 of a small JSON blob holding the next
  item index and the cumulative count). It must round-trip through
  `build_envelope`.
- Fill the page with items **in order** while the COMPLETE serialized
  envelope stays within `char_budget`. `page.serialized_chars` must equal
  `len(json.dumps(envelope))` for the envelope you return, and must not
  exceed `char_budget`. Achieve this by measuring, not estimating: add items
  one at a time and re-serialize; stop before the first item that would
  exceed the budget. Setting `serialized_chars` last requires care — the
  number's own digits change the length, so re-measure until it is stable.
- If items remain, set `page.next_cursor` to the resume cursor and append
  the string `"RESULT_TRUNCATED"` to `warnings`. If none remain,
  `next_cursor` is `None` and `warnings` stays empty.
- Pages must cover every item exactly once, in order, with no gaps and no
  duplicates. `page.number` counts from 1 and increments per page.
- `coverage.returned_this_page` is this page's item count;
  `coverage.returned_cumulative` is the running total including this page.
- `coverage.complete` is True (the upstream operation succeeded); it does
  NOT mean everything fit on this page.
- `snapshot_expires_at` may be `None`.

`error_envelope(tool, provider, request_id, code, message,
partial_items=None, retry_after_seconds=None) -> dict`

Same envelope, but `ok: False`, an `error` sub-dict with `code` and
`message`, `items` = `partial_items or []`, and `coverage.complete` False.
**Never include exception tracebacks, file paths, or internal detail** — only
the caller-supplied code and message.

Everything must be JSON-serializable.

## Definition of done

Run this exact command until it passes, then stop:

```
uv run --frozen python -m pytest -q tests/unit/test_envelope.py
```


## Frozen files (gate-enforced)

These files are the specification. Do NOT create, edit, or delete them; any modification fails the gate automatically:
- `tests/unit/test_envelope.py`


## Definition of done

Run EXACTLY this command to check your work:

```
uv run --frozen python -m pytest -q tests/unit/test_envelope.py
```

Working rules (these decide whether you finish in time):
- This command is the ONLY check that counts. Do NOT write extra scripts,
  debug files, validation harnesses, or scratch test runners - they waste the
  clock and are deleted. Edit the source file, run the command, read the
  error, edit again.
- Change the smallest thing that fixes the reported error, then re-run.
- When the command passes, STOP immediately and say you are done.
- You have 15 minutes. If time is short, make the most failing test pass
  first rather than refactoring.
