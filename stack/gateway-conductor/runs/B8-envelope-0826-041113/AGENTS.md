# Unit B8 — three remaining defects in envelope.py

Implement ONLY: `src\halo_research_gateway\envelope.py`

8 of the 11 frozen tests in `tests\unit\test_envelope.py` already pass. That
file is FROZEN — do not create, edit, or delete any test file. All three
failures come from the cursor and the size measurement. Fix these; change
nothing else.

## Defect 1 — `serialized_chars` does not match the real length

```
assert 2667 == 2799
```
You wrote a value, but writing it changed the length of the JSON (the digits
of the number are themselves part of the document). The test requires
`env["page"]["serialized_chars"] == len(json.dumps(env))` **exactly**.

Fix by iterating to a fixed point before returning:

```python
env["page"]["serialized_chars"] = 0
for _ in range(10):
    actual = len(json.dumps(env))
    if env["page"]["serialized_chars"] == actual:
        break
    env["page"]["serialized_chars"] = actual
```

Do the same fixed-point measurement when deciding how many items fit, so the
final envelope is also within `char_budget`.

## Defect 2 — pagination never terminates

```
AssertionError: pagination did not terminate
```
The test walks pages until `next_cursor` is None. Yours never becomes None, so
the same page is served forever. Two rules:

- The cursor must encode the index of the **next unserved item**, and page 2
  must start from that index — not from 0.
- When the page you just built consumes the **last** item
  (`next_index >= len(items)`), set `next_cursor` to `None` and leave
  `warnings` empty.
- Guarantee forward progress: every page must contain **at least one item**
  even if that single item exceeds `char_budget`; otherwise a large item
  stalls the walk forever.

## Defect 3 — cumulative count does not accumulate

```
assert 6 == (6 + 6)
```
`coverage.returned_cumulative` on page 2 must be page 1's count plus page 2's
count. Carry the running total inside the cursor, for example:

```python
payload = {"i": next_index, "c": cumulative_so_far, "n": page_number}
cursor  = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
```

Then on the next call, decode it: `page.number` = `n + 1`,
`returned_cumulative` = `c + len(this_page_items)`, and start slicing at `i`.
With `cursor=None` you start at index 0, cumulative 0, page number 1.

## Definition of done

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
