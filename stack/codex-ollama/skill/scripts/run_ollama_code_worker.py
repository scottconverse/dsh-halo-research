"""Run a bounded Ollama code worker from the saved code-worker profile."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tomllib
from pathlib import Path
from typing import Any, Sequence


DEFAULT_CODEX = Path(r"C:\Users\scott\AppData\Roaming\npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe")
DEFAULT_PROFILE = Path(r"C:\Users\scott\.codex\ollama-deepseek-code-worker.config.toml")
PROVIDER = "ollama-code-worker"
TOP_LEVEL = ("model", "model_provider", "model_reasoning_effort", "model_catalog_json", "web_search")
PROVIDER_KEYS = ("name", "base_url", "wire_api", "requires_openai_auth", "supports_websockets", "supports_standalone_web_search")
FEATURE_KEYS = ("apps", "memories", "multi_agent", "plugins")


def override(key: str, value: Any) -> str:
    if not isinstance(value, (str, bool)):
        raise ValueError(f"unsupported profile value for {key}: {value!r}")
    return f"{key}={json.dumps(value)}"


def load_profile(path: Path) -> dict[str, Any]:
    try:
        with path.open("rb") as handle:
            profile = tomllib.load(handle)
    except (OSError, tomllib.TOMLDecodeError) as exc:
        raise ValueError(f"could not read profile {path}: {exc}") from exc
    provider = profile.get("model_providers", {}).get(PROVIDER)
    features = profile.get("features")
    missing = [key for key in TOP_LEVEL if key not in profile]
    if not isinstance(provider, dict):
        missing.append(f"model_providers.{PROVIDER}")
    else:
        missing.extend(f"model_providers.{PROVIDER}.{key}" for key in PROVIDER_KEYS if key not in provider)
    if not isinstance(features, dict):
        missing.append("features")
    else:
        missing.extend(f"features.{key}" for key in FEATURE_KEYS if key not in features)
    if missing:
        raise ValueError(f"profile is missing required worker settings: {', '.join(missing)}")
    if profile["model_provider"] != PROVIDER:
        raise ValueError(f"profile model_provider must be {PROVIDER!r}")
    return profile


def build_command(codex: Path, profile: dict[str, Any], workspace: Path, result: Path) -> list[str]:
    provider = profile["model_providers"][PROVIDER]
    features = profile["features"]
    command = [
        str(codex), "exec", "--ignore-user-config", "--strict-config",
        "--model", profile["model"], "--cd", str(workspace),
        "--sandbox", "danger-full-access", "--json",
        "--output-last-message", str(result),
        "-c", override("approval_policy", "never"),
    ]
    for key in TOP_LEVEL:
        command.extend(("-c", override(key, profile[key])))
    for key in PROVIDER_KEYS:
        command.extend(("-c", override(f"model_providers.{PROVIDER}.{key}", provider[key])))
    for key in FEATURE_KEYS:
        command.extend(("-c", override(f"features.{key}", features[key])))
    return command


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cwd", required=True, type=Path, help="Git worktree for the worker")
    parser.add_argument("--prompt-file", type=Path, help="UTF-8 task prompt; otherwise read stdin")
    parser.add_argument("--result-file", required=True, type=Path)
    parser.add_argument("--events-file", required=True, type=Path)
    parser.add_argument("--stderr-file", required=True, type=Path)
    parser.add_argument("--profile", type=Path, default=DEFAULT_PROFILE)
    parser.add_argument("--codex", type=Path, default=DEFAULT_CODEX)
    parser.add_argument("--dry-run", action="store_true", help="validate and print without inference")
    args = parser.parse_args(argv)

    workspace = args.cwd.resolve()
    if not workspace.is_dir():
        raise SystemExit(f"--cwd is not a directory: {workspace}")
    try:
        prompt = args.prompt_file.read_text(encoding="utf-8") if args.prompt_file else sys.stdin.read()
    except OSError as exc:
        raise SystemExit(f"could not read --prompt-file: {exc}") from exc
    if not prompt.strip():
        raise SystemExit("worker prompt is empty")
    try:
        command = build_command(args.codex.resolve(), load_profile(args.profile.resolve()), workspace, args.result_file.resolve())
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    if args.dry_run:
        print(json.dumps({"command": command, "cwd": str(workspace), "prompt_source": str(args.prompt_file) if args.prompt_file else "stdin"}, indent=2))
        return 0

    for path in (args.result_file, args.events_file, args.stderr_file):
        path.parent.mkdir(parents=True, exist_ok=True)
    with args.events_file.open("w", encoding="utf-8", newline="") as events, args.stderr_file.open("w", encoding="utf-8", newline="") as stderr:
        return subprocess.run(command, cwd=workspace, input=prompt, text=True, encoding="utf-8", stdout=events, stderr=stderr, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
