# Unit A — repository scaffold for halo-research-gateway

You are building one unit of a larger service. Work ONLY in this directory.
Do not read or modify anything outside it.

## Deliverables

1. `.python-version` containing exactly `3.12`. If uv lacks Python 3.12, run
   `uv python install 3.12` first.
2. `pyproject.toml`:
   - `[project]` name `halo-research-gateway`, version `0.1.0`,
     `requires-python = ">=3.12,<3.13"`.
   - dependencies: `mcp[cli]`, `httpx[http2]`, `aiosqlite`, `defusedxml`,
     `platformdirs`, `tldextract`, `pydantic-settings`.
   - `[dependency-groups]` dev: `pytest`, `pytest-asyncio`, `respx`, `ruff`.
   - hatchling build backend with `src` layout (`packages = ["src/halo_research_gateway"]`).
3. Run `uv lock` then `uv sync --frozen` so `uv.lock` and `.venv` exist and
   `uv run --frozen python -c "import halo_research_gateway"` works.
4. Source skeleton under `src\halo_research_gateway\`:
   - `__init__.py` defining `__version__ = "0.1.0"`.
   - `__main__.py`: running `python -m halo_research_gateway` prints one JSON
     line `{"service": "halo-research-gateway", "version": "0.1.0", "status": "scaffold"}`
     and exits 0.
   - empty-but-importable modules: `app.py`, `config.py`, `models.py`,
     `coordinator.py`, `clock.py`, `cache.py`, `security.py`,
     `logging_config.py`, and packages `providers\` and `tools\` (each with
     `__init__.py`), plus `migrations\__init__.py`.
5. Directories: `tests\unit\`, `tests\integration\`, `tests\fixtures\reddit\`,
   `tests\fixtures\web\`, `tests\acceptance\`, `docs\adr\`, `evidence\`,
   `scripts\`, `config\`.
6. `config\config.example.toml` with a `[server]` section: `port = 8765`,
   `mcp_path = "/mcp"`, `health_path = "/health"`, `log_level = "INFO"`.
7. `tests\unit\test_scaffold.py` with real assertions: the package imports,
   `__version__` equals the pyproject version, and `python -m halo_research_gateway`
   (run via `subprocess` with `sys.executable`) exits 0 and prints valid JSON
   with `service == "halo-research-gateway"`.
8. `BUILD-MANIFEST.json`: `{"created": "<UTC ISO timestamp>", "python": "3.12",
   "builder": "dsh-worker-coder30b", "spec": "HALO-RESEARCH-GATEWAY-SPEC-v1.3"}`.
9. `README.md`: five lines stating what the service will be (localhost-only MCP
   research gateway; four core tools; built unit-by-unit behind an external gate).

## Rules

- Run `uv run --frozen python -m pytest -q tests` yourself and make it pass
  before you stop.
- Do not create a git commit. Do not install crawl4ai or anything not listed.
- If a command fails, read the error and fix the cause; do not retry blindly.
