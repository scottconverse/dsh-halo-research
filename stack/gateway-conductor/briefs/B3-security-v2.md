# Unit B3 (retry) — URL security policy (SSRF core)

Your previous attempt did real work but FAILED THE GATE THREE TIMES for one
reason only: the required test file was never created at the exact required
path. The external verifier checks EXACTLY these two paths and nothing else:

- `src\halo_research_gateway\security.py`
- `tests\unit\test_security.py`   ← THIS EXACT PATH, from the repo root

**Your first action:** create `tests\unit\test_security.py` containing a
trivial passing test (`def test_placeholder(): assert True`), and run
`uv run --frozen python -m pytest -q tests/unit/test_security.py` to prove the
path collects. THEN build the real content in both files. Before you stop,
list the directory `tests\unit\` and confirm `test_security.py` is present.

The full contract (unchanged from before):

`security.py` defines `UrlPolicyError(Exception)` with a stable `code: str`,
plus:
- `validate_url(url) -> ParsedTarget` (dataclass: scheme, host, port,
  path_query): only http/https (`UNSAFE_URL/scheme`); reject userinfo
  (`/userinfo`); explicit ports other than 80/443 (`/port`); URLs > 2000 chars
  (`/length`); missing host, `localhost`, `*.local`, single-label hostnames
  (`/host`); IP-literal hosts (v4, v6 bracketed, and decimal `2130706433` /
  hex `0x7f000001` / octal `017700000001` encodings) must pass `classify_ip`
  or reject (`/ip`).
- `classify_ip(ip) -> bool` using stdlib `ipaddress`: public only — reject
  loopback, private, link-local, multicast, unspecified, reserved,
  unique-local `fc00::/7`, and IPv4-mapped forms like `::ffff:10.0.0.1`.
- `validate_resolved(target, addresses) -> str`: empty list or ANY non-public
  address rejects (`UNSAFE_URL/dns`); else return the first public address.
- `validate_redirect(current, location) -> ParsedTarget`: resolve relative
  Locations against current, then `validate_url` the absolute result.
- `is_sensitive_url(url) -> bool`: userinfo present, or any query-param NAME
  containing (case-insensitive) `token key secret signature sig credential
  auth code session jwt`.

Tests: accept `https://example.com/a?b=c`, `http://example.com:80/`,
`https://example.com:443/x`, `https://[2606:4700::1]/`. Reject each of:
`ftp://x`, `file:///c/x`, `https://u:p@h/`, `https://example.com:8080/`,
2001-char URL, `http://localhost/`, `http://foo.local/`, `http://intranet/`,
`http://127.0.0.1/`, `http://10.1.2.3/`, `http://169.254.1.1/`, `http://[::1]/`,
`http://[fe80::1]/`, `http://[fc00::1]/`, `http://192.168.0.1/`,
`http://2130706433/`, `http://0x7f000001/`, `http://[::ffff:10.0.0.1]/` —
asserting the right code suffix each time. Plus `validate_resolved` (all-public
pass, mixed reject, empty reject), `validate_redirect` (relative pass,
redirect-to-loopback reject), and the four `is_sensitive_url` cases.

Run the verifier's exact command until green:
`uv run --frozen python -m pytest -q tests/unit/test_security.py`
