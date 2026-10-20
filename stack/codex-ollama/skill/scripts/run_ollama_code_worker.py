"""Run a bounded Ollama code worker from the saved code-worker profile."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tomllib
import uuid
from pathlib import Path
from typing import Any, Callable, Sequence


DEFAULT_CODEX = Path(r"C:\Users\scott\AppData\Roaming\npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe")
DEFAULT_PROFILE = Path(r"C:\Users\scott\.codex\ollama-deepseek-code-worker.config.toml")
PROVIDER = "ollama-code-worker"
TOP_LEVEL = ("model", "model_provider", "model_reasoning_effort", "model_catalog_json", "web_search")
PROVIDER_KEYS = ("name", "base_url", "wire_api", "requires_openai_auth", "supports_websockets", "supports_standalone_web_search")
FEATURE_KEYS = ("apps", "memories", "multi_agent", "plugins")

Runner = Callable[..., subprocess.CompletedProcess[str]]


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


def build_command(
    codex: Path,
    profile: dict[str, Any],
    workspace: Path,
    result: Path,
    resume_id: str | None = None,
) -> list[str]:
    provider = profile["model_providers"][PROVIDER]
    features = profile["features"]
    command = [str(codex), "exec"]
    if resume_id is not None:
        command.extend(("resume", resume_id))
    command.extend((
        "--ignore-user-config", "--strict-config",
        "--model", profile["model"],
    ))
    if resume_id is None:
        command.extend(("--cd", str(workspace), "--sandbox", "danger-full-access"))
    else:
        command.append("--dangerously-bypass-approvals-and-sandbox")
    command.extend((
        "--json", "--output-last-message", str(result),
        "-c", override("approval_policy", "never"),
    ))
    for key in TOP_LEVEL:
        command.extend(("-c", override(key, profile[key])))
    for key in PROVIDER_KEYS:
        command.extend(("-c", override(f"model_providers.{PROVIDER}.{key}", provider[key])))
    for key in FEATURE_KEYS:
        command.extend(("-c", override(f"features.{key}", features[key])))
    if resume_id is not None:
        command.append("-")
    return command


def _canonical_path(path: Path) -> str:
    return os.path.normcase(os.path.realpath(os.fspath(path)))


def validate_paths(
    prompt_path: Path | None,
    result_path: Path,
    events_path: Path,
    stderr_path: Path,
    receipt_path: Path,
) -> None:
    outputs = (
        ("result", result_path),
        ("events", events_path),
        ("stderr", stderr_path),
        ("receipt", receipt_path),
    )
    seen: dict[str, str] = {}
    for label, path in outputs:
        canonical = _canonical_path(path)
        if canonical in seen:
            raise ValueError(f"output paths collide: {seen[canonical]} and {label}: {path}")
        seen[canonical] = label
    if prompt_path is not None:
        prompt = _canonical_path(prompt_path)
        if prompt in seen:
            raise ValueError(f"prompt path collides with {seen[prompt]} output: {prompt_path}")


def _event_text(item: dict[str, Any]) -> str:
    text = item.get("text")
    if isinstance(text, str):
        return text
    content = item.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block["text"]
            for block in content
            if isinstance(block, dict) and isinstance(block.get("text"), str)
        )
    return ""


def _event_error(event: dict[str, Any]) -> str | None:
    for key in ("message", "error"):
        value = event.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict):
            for nested_key in ("message", "error"):
                nested = value.get(nested_key)
                if isinstance(nested, str) and nested.strip():
                    return nested.strip()
    return None


def parse_events(stdout: str) -> dict[str, Any]:
    parsed: dict[str, Any] = {
        "thread_id": None,
        "session_id": None,
        "completed": False,
        "usage": None,
        "agent_message_found": False,
        "final_text": None,
        "errors": [],
        "malformed_count": 0,
    }
    for line in stdout.splitlines():
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except (json.JSONDecodeError, TypeError):
            parsed["malformed_count"] += 1
            continue
        if not isinstance(event, dict):
            parsed["malformed_count"] += 1
            continue
        event_type = event.get("type")
        if event_type == "thread.started":
            for key in ("thread_id", "session_id"):
                value = event.get(key)
                if isinstance(value, str) and value:
                    parsed[key] = value
        elif event_type == "turn.completed":
            parsed["completed"] = True
            usage = event.get("usage")
            parsed["usage"] = usage if isinstance(usage, dict) else None
        elif event_type in ("turn.failed", "error"):
            message = _event_error(event)
            if message:
                parsed["errors"].append(message)
        elif event_type == "item.completed":
            item = event.get("item")
            if isinstance(item, dict) and item.get("type") == "agent_message":
                parsed["agent_message_found"] = True
                parsed["final_text"] = _event_text(item)
    return parsed


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def _read_text(path: Path) -> tuple[str | None, str | None]:
    try:
        return path.read_text(encoding="utf-8", errors="replace"), None
    except OSError as exc:
        return None, str(exc)


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        handle.write(text)


def _prepare_outputs(paths: Sequence[Path]) -> None:
    for path in paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8", newline=""):
            pass


def _shorten(value: str, limit: int = 500) -> str:
    concise = " ".join(value.split())
    if len(concise) <= limit:
        return concise
    return concise[: limit - 3] + "..."


def _failure_reason(
    exit_code: int | None,
    parsed: dict[str, Any],
    final_text: str | None,
    launch_error: str | None,
    output_error: str | None,
    stderr: str,
) -> str | None:
    event_errors = parsed["errors"]
    detail = event_errors[-1] if event_errors else None
    if detail is None:
        for line in reversed(stderr.splitlines()):
            if line.strip():
                detail = line.strip()
                break
    if launch_error is not None:
        return _shorten(f"could not run child: {launch_error}")
    if exit_code != 0:
        reason = f"child exited with code {exit_code}"
        if detail:
            reason += f": {detail}"
        return _shorten(reason)
    if not parsed["completed"]:
        reason = "child exited without a turn.completed event"
        if detail:
            reason += f": {detail}"
        return _shorten(reason)
    if not isinstance(final_text, str) or not final_text.strip():
        reason = "child completed without nonempty final text"
        if output_error:
            reason += f": {output_error}"
        return _shorten(reason)
    return None


def _run(
    *,
    prompt_path: Path | None,
    prompt: str,
    result_path: Path,
    events_path: Path,
    stderr_path: Path,
    receipt_path: Path,
    workspace: Path,
    profile: dict[str, Any],
    command: Sequence[str],
    resume_id: str | None,
    runner: Runner,
) -> int:
    validate_paths(prompt_path, result_path, events_path, stderr_path, receipt_path)
    _prepare_outputs((result_path, events_path, stderr_path, receipt_path))

    launch_error: str | None = None
    exit_code: int | None
    try:
        completed = runner(
            list(command),
            cwd=workspace,
            input=prompt,
            text=True,
            encoding="utf-8",
            errors="replace",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        exit_code = completed.returncode
        stdout = _as_text(completed.stdout)
        stderr = _as_text(completed.stderr)
    except Exception as exc:
        exit_code = None
        stdout = ""
        stderr = f"launcher could not run child: {exc}\n"
        launch_error = str(exc)

    _write_text(events_path, stdout)
    _write_text(stderr_path, stderr)
    parsed = parse_events(stdout)
    output_text, output_error = _read_text(result_path)

    event_text = parsed["final_text"] if isinstance(parsed["final_text"], str) else ""
    output_text_is_nonempty = (
        isinstance(output_text, str) and bool(output_text.strip())
    )
    agent_message_is_nonempty = (
        parsed["agent_message_found"] and bool(event_text.strip())
    )

    if output_text_is_nonempty:
        final_text = output_text
        final_text_source = "output-last-message"
        final_text_path = result_path
    else:
        final_text = None
        final_text_source = None
        final_text_path = result_path

    final_text_consistent: bool | None = None
    if output_text_is_nonempty and agent_message_is_nonempty:
        final_text_consistent = (
            event_text.rstrip("\r\n") == output_text.rstrip("\r\n")
        )

    thread_id = parsed["thread_id"] or parsed["session_id"]
    session_id = parsed["session_id"] or parsed["thread_id"]
    resume_mismatch = (
        resume_id is not None
        and session_id is not None
        and resume_id.casefold() != session_id.casefold()
    )

    failure_reason = _failure_reason(
        exit_code,
        parsed,
        final_text,
        launch_error,
        output_error,
        stderr,
    )
    if failure_reason is None and resume_mismatch:
        failure_reason = "resume returned a different session id; continuity is not proven"
    if failure_reason is None and final_text_consistent is False:
        failure_reason = "output-last-message does not match agent_message; final-answer continuity is not proven"
    success = (
        exit_code == 0
        and parsed["completed"]
        and output_text_is_nonempty
        and isinstance(final_text, str)
        and bool(final_text.strip())
        and final_text_consistent is not False
        and not resume_mismatch
    )
    receipt = {
        "invocation_id": uuid.uuid4().hex,
        "mode": "resume" if resume_id is not None else "fresh",
        "success": success,
        "exit_code": exit_code,
        "completed": parsed["completed"],
        "final_text": isinstance(final_text, str) and bool(final_text.strip()),
        "final_text_path": str(final_text_path),
        "final_text_length": len(final_text) if isinstance(final_text, str) else 0,
        "final_text_source": final_text_source,
        "final_text_consistent": final_text_consistent,
        "thread_id": thread_id,
        "session_id": session_id,
        "attempted_session_id": resume_id,
        "resumed_session_id": session_id if resume_id is not None else None,
        "model": profile["model"],
        "provider": profile["model_provider"],
        "usage": parsed["usage"],
        "malformed_event_count": parsed["malformed_count"],
        "error": failure_reason if not success else None,
    }
    _write_text(receipt_path, json.dumps(receipt, indent=2, sort_keys=True) + "\n")

    if success:
        return 0
    if isinstance(exit_code, int) and 0 < exit_code < 256:
        return exit_code
    return 1


def main(argv: Sequence[str] | None = None, *, runner: Runner | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cwd", required=True, type=Path, help="Git worktree for the worker")
    parser.add_argument("--prompt-file", type=Path, help="UTF-8 task prompt; otherwise read stdin")
    parser.add_argument("--result-file", required=True, type=Path)
    parser.add_argument("--events-file", required=True, type=Path)
    parser.add_argument("--stderr-file", required=True, type=Path)
    parser.add_argument("--receipt-file", required=True, type=Path)
    parser.add_argument("--profile", type=Path, default=DEFAULT_PROFILE)
    parser.add_argument("--codex", type=Path, default=DEFAULT_CODEX)
    parser.add_argument("--resume", metavar="SESSION_ID", help="Resume an existing Codex session")
    parser.add_argument("--dry-run", action="store_true", help="validate and print without inference")
    args = parser.parse_args(argv)

    workspace = args.cwd.resolve()
    if not workspace.is_dir():
        raise SystemExit(f"--cwd is not a directory: {workspace}")
    if args.resume is not None and not args.resume.strip():
        raise SystemExit("--resume requires a nonempty session id")

    prompt_path = args.prompt_file.resolve() if args.prompt_file else None
    result_path = args.result_file.resolve()
    events_path = args.events_file.resolve()
    stderr_path = args.stderr_file.resolve()
    receipt_path = args.receipt_file.resolve()
    try:
        validate_paths(prompt_path, result_path, events_path, stderr_path, receipt_path)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    try:
        prompt = prompt_path.read_text(encoding="utf-8") if prompt_path else sys.stdin.read()
    except OSError as exc:
        raise SystemExit(f"could not read --prompt-file: {exc}") from exc
    if not prompt.strip():
        raise SystemExit("worker prompt is empty")
    try:
        profile = load_profile(args.profile.resolve())
        command = build_command(
            args.codex.resolve(),
            profile,
            workspace,
            result_path,
            args.resume.strip() if args.resume else None,
        )
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    if args.dry_run:
        print(json.dumps({
            "mode": "resume" if args.resume else "fresh",
            "command": command,
            "cwd": str(workspace),
            "prompt_source": str(prompt_path) if prompt_path else "stdin",
        }, indent=2))
        return 0

    return _run(
        prompt_path=prompt_path,
        prompt=prompt,
        result_path=result_path,
        events_path=events_path,
        stderr_path=stderr_path,
        receipt_path=receipt_path,
        workspace=workspace,
        profile=profile,
        command=command,
        resume_id=args.resume.strip() if args.resume else None,
        runner=runner or subprocess.run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
