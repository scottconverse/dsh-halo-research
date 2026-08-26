# Unit B3 — fix security.py against the frozen tests

Implement ONLY: `src\halo_research_gateway\security.py`

`tests\unit\test_security.py` is FROZEN and is the complete specification.
**Read it first.**

A previous attempt at this unit rewrote that test file to match its own buggy
code — weakening the rules until a private address and a mixed DNS answer
were accepted. The gate detected the edit and failed the unit. Do not repeat
it: the test file is checked byte-for-byte, any modification fails this unit
automatically, and the SSRF rules it encodes are the entire point of the
module. If a test looks wrong to you, the test is right and the code is
wrong.

Standard library only. `ipaddress` and `urllib.parse` are all you need.

## The failures to fix

**1. `classify_ip` crashes on IPv6** — `AttributeError` on an `IPv6Address`.
Only use attributes that exist on BOTH `IPv4Address` and `IPv6Address`
unguarded (`is_loopback`, `is_private`, `is_link_local`, `is_multicast`,
`is_unspecified`, `is_reserved`). Structure it as:

```python
addr = ipaddress.ip_address(ip)
if getattr(addr, "ipv4_mapped", None):     # ::ffff:10.0.0.1 -> 10.0.0.1
    addr = addr.ipv4_mapped
if addr.is_loopback or addr.is_private or addr.is_link_local \
   or addr.is_multicast or addr.is_unspecified or addr.is_reserved:
    return False
return True
```
`is_private` already covers `fc00::/7` and `10/8`, `192.168/16`, `172.16/12`.
Return real booleans (`True`/`False`), not truthy values.

**2. Hostname rules** — `UNSAFE_URL/host` for `localhost`, any name ending
`.local`, and any single-label name (no dot in it, e.g. `intranet`), and for
a missing/empty host.

**3. IP-literal rules** — `UNSAFE_URL/ip` whenever the host IS an address
literal and `classify_ip` returns False. You must recognise all of these as
literals: dotted IPv4, bracketed IPv6, and the integer forms `2130706433`
(decimal), `0x7f000001` (hex), `017700000001` (octal). Try parsing the host
as an int in base 10/16/8 and, on success, convert with
`ipaddress.ip_address(int_value)`. Check this BEFORE the single-label
hostname rule so `http://2130706433/` reports `ip`, not `host`.

**4. `validate_resolved(target, addresses)`** — raise
`UrlPolicyError("UNSAFE_URL/dns")` if the list is empty **or if ANY address
is non-public**. This mixed-answer rule is what stops DNS rebinding: a list
containing one public and one private address must be REJECTED, not filtered.
Only when every address is public do you return the first one.

**5. Ordering and shape** — `validate_url` returns an object with `.scheme`,
`.host`, `.port` (filled from the scheme when absent: 80/443), and
`.path_query`. Rule order: scheme (`/scheme`) → userinfo (`/userinfo`) →
length > 2000 (`/length`) → port not in {80,443} (`/port`) → empty host
(`/host`) → IP literal (`/ip`) → hostname rules (`/host`).
`UrlPolicyError` carries a `.code` string attribute.

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
