# Unit B3 — two remaining defects in security.py

Implement ONLY: `src\halo_research_gateway\security.py`

9 of the 11 frozen tests in `tests\unit\test_security.py` already pass. That
file is FROZEN — do not create, edit, or delete any test file. Fix exactly the
two failures below and change nothing else.

Both failures are in ONE place: **the host is being classified before it is
checked for being an IP literal.**

## Defect 1 — `test_accepts_public_urls` wrongly raises `UNSAFE_URL/host`

```
halo_research_gateway.security.UrlPolicyError: ... UNSAFE_URL/host
```
The failing input is `https://[2606:4700::1]/` — a **public IPv6 literal**.
Your code sees a host with no dot in it and applies the "single-label
hostname" rule. An address literal is not a hostname.

## Defect 2 — `test_rejects_nonpublic_ip_literals` does not raise

```
Failed: DID NOT RAISE UrlPolicyError
```
At least one of these obfuscated loopback forms is not being recognised as an
IP literal: `http://2130706433/` (decimal), `http://0x7f000001/` (hex),
`http://017700000001/` (octal), `http://[::ffff:10.0.0.1]/` (IPv4-mapped).

## The fix — resolve the host to an address FIRST, then branch

Write one helper and call it before any hostname rule:

```python
def _as_ip(host: str):
    """Return an ip_address if host is any IP literal form, else None."""
    h = host.strip()
    if h.startswith("[") and h.endswith("]"):          # bracketed IPv6
        h = h[1:-1]
    try:
        return ipaddress.ip_address(h)                  # dotted v4, plain v6
    except ValueError:
        pass
    for base in (16, 8, 10):                            # 0x7f000001, 017700000001, 2130706433
        try:
            value = int(h, base)
        except ValueError:
            continue
        if 0 <= value <= 0xFFFFFFFF:
            return ipaddress.ip_address(value)
    return None
```

Notes that matter:
- Try base 16 and base 8 **before** base 10. Python's `int("0x7f000001", 16)`
  accepts the `0x` prefix and `int("017700000001", 8)` accepts the leading
  zero; `int(h, 10)` would reject the first and silently misread the second.
- `int("2130706433", 16)` would also succeed and give the wrong address, so
  only accept a base-16 read when the string actually starts with `0x`/`0X`,
  and a base-8 read when it starts with `0o`/`0O` or a leading `0` followed by
  more digits. A plain decimal string must be read as base 10.

Then order `validate_url` exactly like this:

```python
ip = _as_ip(host)
if ip is not None:
    if not classify_ip(str(ip)):
        raise UrlPolicyError("UNSAFE_URL/ip")
    # a public IP literal is ACCEPTED - skip every hostname rule below
else:
    if host == "localhost" or host.endswith(".local") or "." not in host:
        raise UrlPolicyError("UNSAFE_URL/host")
```

The public IPv6 literal `2606:4700::1` must reach the accept path. The
loopback forms must all raise `UNSAFE_URL/ip`.

## Definition of done

```
uv run --frozen python -m pytest -q tests/unit/test_security.py
```


## Frozen files (gate-enforced)

These files are the specification. Do NOT create, edit, or delete them; any modification fails the gate automatically:
- `tests/unit/test_security.py`


## Definition of done

Run EXACTLY this command to check your work:

```
uv run --frozen python -m pytest -q tests/unit/test_security.py
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
