# Unit B3 — URL security policy (SSRF core, pure logic, no network)

Work ONLY in this repository. Touch only:
`src\halo_research_gateway\security.py`, `tests\unit\test_security.py`.

This unit implements the DECISION logic of the SSRF policy. It performs NO
network I/O and NO real DNS — resolved addresses are passed in by callers.
(The pinned-connection HTTP transport is a later unit.)

## security.py

Define `class UrlPolicyError(Exception)` carrying a stable `code: str`.

- `validate_url(url: str) -> ParsedTarget` (dataclass: scheme, host, port,
  path_query). Rules, each with its code:
  - scheme must be `http` or `https` → `UNSAFE_URL/scheme`;
  - embedded credentials (userinfo) rejected → `UNSAFE_URL/userinfo`;
  - explicit port must be 80 or 443; default ports fill in from scheme →
    `UNSAFE_URL/port`;
  - overlong URLs (> 2000 chars) rejected → `UNSAFE_URL/length`;
  - empty or missing hostname rejected → `UNSAFE_URL/host`;
  - hostnames `localhost`, `*.local`, and single-label names (no dot) rejected
    → `UNSAFE_URL/host`;
  - a hostname that IS an IP literal (v4 or v6, including bracketed) is parsed
    and must pass `classify_ip` below → `UNSAFE_URL/ip`;
  - decimal/octal/hex encoded IPv4 tricks (`http://2130706433/`,
    `http://0x7f000001/`, `http://017700000001/`) must be recognized as IP
    literals and rejected when non-public.
- `classify_ip(ip: str) -> bool` (True = public, allowed): use the stdlib
  `ipaddress` module; reject loopback, private, link-local, multicast,
  unspecified, reserved, site-local, unique-local (IPv6 `fc00::/7`), broadcast,
  and IPv4-mapped IPv6 forms of any of those (`::ffff:10.0.0.1`).
- `validate_resolved(target: ParsedTarget, addresses: list[str]) -> str`:
  given ALL resolved A/AAAA addresses, raise `UrlPolicyError('UNSAFE_URL/dns')`
  if the list is empty OR **any** address is non-public (mixed-answer rule);
  return the first public address as the pin.
- `validate_redirect(current: ParsedTarget, location: str) -> ParsedTarget`:
  resolve relative Locations against the current target, then run
  `validate_url` on the absolute result.
- `is_sensitive_url(url: str) -> bool`: True when userinfo is present or any
  query parameter NAME case-insensitively contains one of `token key secret
  signature sig credential auth code session jwt`.

## tests (goldens, all offline)

- Accept: `https://example.com/a?b=c`, `http://example.com:80/`,
  `https://example.com:443/x`, IPv6 public literal `https://[2606:4700::1]/`.
- Reject with the right code: `ftp://x`, `file:///c/x`, `https://u:p@h/`,
  `https://example.com:8080/`, 2001-char URL, `http://localhost/`,
  `http://foo.local/`, `http://intranet/`, `http://127.0.0.1/`,
  `http://10.1.2.3/`, `http://169.254.1.1/`, `http://[::1]/`,
  `http://[fe80::1]/`, `http://[fc00::1]/`, `http://192.168.0.1/`,
  `http://2130706433/`, `http://0x7f000001/`, `http://[::ffff:10.0.0.1]/`.
- `validate_resolved`: all-public list returns first address; mixed
  public+private list rejects; empty list rejects.
- `validate_redirect`: relative `/next` inherits scheme/host and passes;
  absolute redirect to `http://127.0.0.1/` rejects.
- `is_sensitive_url`: `?api_key=x` True, `?q=x` False, userinfo True,
  `?X-Amz-Signature=x` True.

Run `uv run --frozen python -m pytest -q tests/unit/test_security.py` until
green before stopping.
