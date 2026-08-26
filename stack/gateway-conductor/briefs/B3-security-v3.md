# Unit B3 (v3, test-first) — fix security.py against the frozen tests

`src\halo_research_gateway\security.py` exists and currently passes only 2 of
11 FROZEN acceptance tests at `tests\unit\test_security.py`.

**Do not create, edit, or delete any test file. Any change to
`tests\unit\test_security.py` fails the gate automatically.** Read it first —
it is the complete executable spec. Touch ONLY
`src\halo_research_gateway\security.py`.

Known failures you must fix (from the gate's audit):
- Single-label hostnames (`http://intranet/`), `localhost`, and `*.local`
  must raise `UrlPolicyError` with `code == "UNSAFE_URL/host"`.
- Every non-public IP-literal URL (v4, bracketed v6, decimal `2130706433`,
  hex `0x7f000001`, and `[::ffff:10.0.0.1]`) must raise with
  `code == "UNSAFE_URL/ip"`.
- `classify_ip` crashes with AttributeError on IPv6 input. Use the stdlib
  `ipaddress` module: parse with `ipaddress.ip_address`, unwrap IPv4-mapped
  IPv6 (`.ipv4_mapped`) before classifying, and return False for loopback,
  private, link-local, multicast, unspecified, reserved, and unique-local
  (`fc00::/7`) addresses. Only attributes that exist on BOTH IPv4Address and
  IPv6Address may be used unguarded.
- `validate_resolved(target, addresses)` must raise
  `UrlPolicyError("UNSAFE_URL/dns")` when the list is empty OR any address is
  non-public; otherwise return the first public address.
- `validate_url` return object needs `.scheme`, `.host`, `.port` (default
  ports filled from scheme), `.path_query`.

Run the verifier's exact command until green before stopping:
`uv run --frozen python -m pytest -q tests/unit/test_security.py`
