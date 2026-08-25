# Unit B1 — validated configuration + redacting JSONL logging

Work ONLY in this repository. The scaffold exists; extend it. Touch only:
`src\halo_research_gateway\config.py`, `src\halo_research_gateway\logging_config.py`,
`tests\unit\test_config.py`, `tests\unit\test_redaction.py`.

## config.py

- `GatewayConfig` built on `pydantic-settings`, loaded from a TOML file path
  passed explicitly (`GatewayConfig.load(path)`); no environment magic.
- Sections and defaults (all overridable from TOML):
  - `server`: `port=8765` (1024..65535), `mcp_path="/mcp"`, `health_path="/health"`,
    `log_level="INFO"` (one of DEBUG/INFO/WARNING/ERROR).
  - `storage`: `database` (path string), `cache_max_bytes=1073741824`,
    `entry_max_bytes=5242880`, `inline_payload_max_bytes=262144`.
  - `reddit`: `min_interval_seconds=8.0` (>=8.0 enforced), `rate_limit_backoff_seconds=60`,
    `max_consecutive_429=3`, `circuit_cooldown_seconds=1800`.
  - `exa`: `min_interval_seconds=1.0` (>=1.0), `daily_soft_limit=45` (1..500).
- **Fail closed**: any unknown key at any level raises `ConfigError` naming the key.
- **Security invariants** (the service's network policy lives in code, never
  config): if any of these keys appear anywhere in the TOML, raise `ConfigError`
  telling the operator the key is not honored: `host`, `bind`, `allow_private_networks`,
  `allowed_schemes`, `allowed_ports`, `require_dns_pinning`,
  `trust_environment_proxies`, `cache_sensitive_urls`, `respect_robots`.
- A missing file loads pure defaults; a malformed TOML raises `ConfigError`.

## logging_config.py

- `redact_url(url: str) -> str`: strip userinfo (`user:pass@` becomes nothing);
  replace the VALUE of any query parameter whose NAME case-insensitively contains
  any of `token key secret signature sig credential auth code session jwt` with
  `[REDACTED]`; drop URL fragments. Non-URLs return unchanged.
- `redact_text(text: str) -> str`: apply `redact_url` to every http(s) URL found
  in the text.
- `setup_logging(log_path, error_log_path, level)`: two JSONL file handlers
  (all-events and errors-only). Each record is one JSON line with `ts` (UTC
  RFC3339), `level`, `logger`, `msg`, plus any `extra` fields. **Redaction runs
  inside the formatter** so no caller can bypass it.

## tests (write real ones)

- `test_config.py`: defaults load; TOML overrides apply; unknown key rejected
  with the key named; each banned security key rejected; port 80 rejected;
  reddit interval 7.9 rejected; malformed TOML raises `ConfigError`.
- `test_redaction.py`: golden cases — `https://u:p@h/x?api_key=AAA&q=ok#f`
  keeps `q=ok`, loses userinfo/fragment, shows `api_key=[REDACTED]`; an AWS-style
  `X-Amz-Signature` value is redacted; a signed `sig=` param is redacted; a log
  record emitted through `setup_logging` containing a tokened URL lands in the
  file already redacted (read the file back and assert).

Run `uv run --frozen python -m pytest -q tests/unit/test_config.py tests/unit/test_redaction.py`
yourself and make it pass before stopping. Do not modify other files.
