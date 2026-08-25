# Unit B1 (retry) — validated configuration + redacting JSONL logging

Work ONLY in this repository. Touch only:
`src\halo_research_gateway\config.py`, `src\halo_research_gateway\logging_config.py`,
`tests\unit\test_config.py`, `tests\unit\test_redaction.py`.

A previous attempt failed on three specific mistakes. These constraints are
mandatory:

1. **TOML parsing uses ONLY the standard library `tomllib`** (`import tomllib`,
   read the file in binary mode). Do NOT import `toml`, `tomlkit`, or any
   package not already installed. Allowed imports: Python stdlib,
   `pydantic`, `pydantic_settings`. Nothing else.
2. **Redaction must be built on `urllib.parse`**, not regex over whole URLs:
   `urlsplit` the URL; drop `username:password`; `parse_qsl` the query;
   for each (name, value) pair, if the LOWERCASED name CONTAINS any of
   `token`, `key`, `secret`, `signature`, `sig`, `credential`, `auth`,
   `code`, `session`, `jwt`, replace the value with `[REDACTED]`;
   rebuild with `urlencode` and `urlunsplit`; drop the fragment entirely.
   `https://u:p@h/x?api_key=AAA&q=ok#f` must become exactly
   `https://h/x?api_key=%5BREDACTED%5D&q=ok` OR `https://h/x?api_key=[REDACTED]&q=ok`
   — pick one form and make your tests assert that same form.
3. **Windows file locking:** in the logging integration test, call
   `logging.shutdown()` (or close and remove your handlers) BEFORE reading the
   log file back, and write logs into pytest's `tmp_path`. Never leave a
   handler open on a file you then open again.

## config.py

- `GatewayConfig.load(path)` on `pydantic-settings`/`pydantic`; explicit path,
  no environment magic. Missing file = pure defaults. Malformed TOML or
  validation failure raises `ConfigError` (define it here).
- Sections/defaults/bounds:
  - `server`: `port=8765` (1024..65535), `mcp_path="/mcp"`,
    `health_path="/health"`, `log_level="INFO"` in {DEBUG,INFO,WARNING,ERROR}.
  - `storage`: `database` (str), `cache_max_bytes=1073741824`,
    `entry_max_bytes=5242880`, `inline_payload_max_bytes=262144`.
  - `reddit`: `min_interval_seconds=8.0` (must be >= 8.0),
    `rate_limit_backoff_seconds=60`, `max_consecutive_429=3`,
    `circuit_cooldown_seconds=1800`.
  - `exa`: `min_interval_seconds=1.0` (>= 1.0), `daily_soft_limit=45` (1..500).
- Fail closed on ANY unknown key at any level; `ConfigError` names the key.
- Banned keys anywhere in the document raise `ConfigError` stating the key is
  not honored: `host`, `bind`, `allow_private_networks`, `allowed_schemes`,
  `allowed_ports`, `require_dns_pinning`, `trust_environment_proxies`,
  `cache_sensitive_urls`, `respect_robots`.

## logging_config.py

- `redact_url(url)` per constraint 2. Non-http(s) or unparseable input returns
  the input unchanged.
- `redact_text(text)`: find http(s) URLs with a simple regex, apply
  `redact_url` to each match.
- `setup_logging(log_path, error_log_path, level)`: two JSONL handlers (all,
  errors-only); each record one JSON line: `ts` UTC RFC3339, `level`, `logger`,
  `msg`. Redaction runs inside the formatter. Return the configured logger.

## tests

`test_config.py`: defaults; TOML override; unknown key named in error; every
banned key rejected; port 80 rejected; reddit 7.9 rejected; malformed TOML.
`test_redaction.py`: the golden case above byte-exact in your chosen form; an
`X-Amz-Signature` value redacted; `sig=` redacted; plain `q=ok` untouched;
`redact_text` on a sentence with two URLs; the logging integration test writes
a tokened URL, calls `logging.shutdown()`, reads the file, asserts redacted.

Run `uv run --frozen python -m pytest -q tests/unit/test_config.py tests/unit/test_redaction.py`
and make it pass before stopping. Verify your own goldens match your
implementation before writing both.
