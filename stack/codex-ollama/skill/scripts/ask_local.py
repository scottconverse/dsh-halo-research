#!/usr/bin/env python3
"""Small stdlib client for the local LM Studio chat endpoint."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Iterable, Sequence
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

MODEL_API_URL = "http://127.0.0.1:1234/api/v1/models"
LOAD_API_URL = "http://127.0.0.1:1234/api/v1/models/load"
CHAT_API_URL = "http://127.0.0.1:1234/v1/chat/completions"

MODEL_KEYS = {
    "brain": "halo/qwen3.6-35b-a3b",
    "coder": "halo/qwen3-coder-30b-a3b-q4km",
}

MODEL_DISCOVERY_TIMEOUT_SECONDS = 10.0
MODEL_LOAD_TIMEOUT_SECONDS = 180.0
CHAT_TIMEOUT_SECONDS = 600.0


class AskLocalError(RuntimeError):
    """A user-facing local-model client error."""


def _call_opener(opener: Any, request: Request, timeout: float) -> Any:
    """Invoke the configured urllib opener and normalize HTTP failures."""
    function = opener if opener is not None else urlopen
    try:
        return function(request, timeout=timeout)
    except HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", "replace").strip()
        except Exception:
            pass
        message = f"HTTP {exc.code} from {request.full_url}"
        if detail:
            message = f"{message}: {detail}"
        raise AskLocalError(message) from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise AskLocalError(f"request failed for {request.full_url}: {exc}") from exc


def _response_bytes(response: Any) -> bytes:
    """Read a response completely, closing it when possible."""
    try:
        data = response.read()
    finally:
        close = getattr(response, "close", None)
        if callable(close):
            close()
    if isinstance(data, str):
        return data.encode("utf-8")
    if not isinstance(data, (bytes, bytearray)):
        raise AskLocalError("HTTP response was not bytes")
    return bytes(data)


def _response_lines(response: Any) -> Iterable[Any]:
    """Yield lines from an SSE response, closing it after iteration."""
    try:
        if isinstance(response, (bytes, bytearray)):
            yield from bytes(response).splitlines()
            return

        readline = getattr(response, "readline", None)
        if callable(readline):
            while True:
                line = readline()
                if line in (b"", ""):
                    break
                yield line
            return

        yield from response
    finally:
        close = getattr(response, "close", None)
        if callable(close):
            close()


def _decode_line(line: Any) -> str:
    if isinstance(line, bytes):
        try:
            return line.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise AskLocalError("SSE stream was not valid UTF-8") from exc
    if isinstance(line, str):
        return line
    raise AskLocalError("SSE stream yielded a non-text line")


def _request_json(
    method: str,
    url: str,
    payload: dict[str, Any] | None = None,
    opener: Any = None,
    timeout: float = MODEL_DISCOVERY_TIMEOUT_SECONDS,
) -> Any:
    """Perform a JSON HTTP request using only the standard library."""
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(url, data=data, headers=headers, method=method)
    response = _call_opener(opener, request, timeout)
    raw = _response_bytes(response)
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise AskLocalError(f"malformed JSON from {url}") from exc


def find_loaded_instance(payload: Any, model_key: str) -> str | None:
    """Return the first loaded instance id for model_key, if present."""
    items: Any = payload
    if isinstance(payload, dict):
        for field in ("data", "models"):
            candidate = payload.get(field)
            if isinstance(candidate, list):
                items = candidate
                break
    if not isinstance(items, list):
        return None

    for item in items:
        if not isinstance(item, dict):
            continue
        if item.get("key") != model_key and item.get("id") != model_key:
            continue
        loaded = item.get("loaded_instances")
        if not isinstance(loaded, list) or not loaded:
            return None
        first = loaded[0]
        if isinstance(first, dict):
            instance_id = first.get("id")
            if isinstance(instance_id, str) and instance_id:
                return instance_id
        elif isinstance(first, str) and first:
            return first
        return None
    return None


def resolve_instance(model_key: str, opener: Any = None) -> tuple[str, str | None]:
    """Reuse or load the requested model and return (instance_id, newly_loaded)."""
    models = _request_json("GET", MODEL_API_URL, opener=opener)
    instance_id = find_loaded_instance(models, model_key)
    if instance_id is not None:
        return instance_id, None

    _request_json(
        "POST",
        LOAD_API_URL,
        {"model": model_key},
        opener=opener,
        timeout=MODEL_LOAD_TIMEOUT_SECONDS,
    )
    models = _request_json("GET", MODEL_API_URL, opener=opener)
    instance_id = find_loaded_instance(models, model_key)
    if instance_id is None:
        raise AskLocalError(
            f"model {model_key!r} did not expose a loaded instance after load"
        )
    return instance_id, instance_id


def read_text_file(path: str | os.PathLike[str]) -> str:
    """Read a UTF-8 file directly and report file/encoding errors cleanly."""
    file_path = Path(path)
    try:
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise AskLocalError(f"{file_path} is not valid UTF-8") from exc
    except OSError as exc:
        raise AskLocalError(f"could not read {file_path}: {exc}") from exc


def build_messages(
    prompt: str, contexts: Sequence[tuple[str, str]]
) -> list[dict[str, str]]:
    """Build one user message with the prompt and labeled context blocks."""
    parts = [prompt]
    for index, (path, text) in enumerate(contexts, start=1):
        parts.append(f"Context {index} ({path}):\n{text}")
    return [{"role": "user", "content": "\n\n".join(parts)}]


def make_chat_payload(
    served_model: str,
    messages: list[dict[str, str]],
    reasoning_effort: str | None,
    max_tokens: int,
) -> dict[str, Any]:
    """Create the streaming chat request; coder passes reasoning_effort=None."""
    payload: dict[str, Any] = {
        "model": served_model,
        "messages": messages,
        "stream": True,
        "stream_options": {"include_usage": True},
        "max_tokens": max_tokens,
    }
    if reasoning_effort is not None:
        payload["reasoning_effort"] = reasoning_effort
    return payload


def parse_sse_stream(response: Any) -> dict[str, Any]:
    """Parse an OpenAI-style SSE stream, keeping reasoning out of output."""
    content_parts: list[str] = []
    reasoning_parts: list[str] = []
    usage: Any = None
    finish_reason: str | None = None
    response_model: str | None = None
    saw_done = False

    for raw_line in _response_lines(response):
        line = _decode_line(raw_line).rstrip("\r\n")
        if not line.strip():
            continue
        if line.startswith("event:") and line[6:].strip().lower() == "error":
            raise AskLocalError("LM Studio emitted an SSE error event")
        if not line.startswith("data:"):
            continue

        data = line[5:].strip()
        if data == "[DONE]":
            saw_done = True
            continue
        if not data:
            continue

        try:
            chunk = json.loads(data)
        except json.JSONDecodeError as exc:
            raise AskLocalError("malformed JSON in SSE stream") from exc
        if not isinstance(chunk, dict):
            raise AskLocalError("SSE data was not a JSON object")

        if chunk.get("error") is not None:
            error = chunk["error"]
            if isinstance(error, dict):
                error = error.get("message", error)
            raise AskLocalError(f"LM Studio returned an error chunk: {error}")

        model = chunk.get("model")
        if isinstance(model, str) and model:
            response_model = model

        if isinstance(chunk.get("usage"), dict):
            usage = chunk["usage"]

        choices = chunk.get("choices", [])
        if not isinstance(choices, list):
            raise AskLocalError("malformed choices in SSE stream")
        if not choices:
            continue

        choice = choices[0]
        if not isinstance(choice, dict):
            raise AskLocalError("malformed choice in SSE stream")
        delta = choice.get("delta", choice.get("message", {}))
        if not isinstance(delta, dict):
            raise AskLocalError("malformed delta in SSE stream")

        content = delta.get("content")
        if content is not None:
            if not isinstance(content, str):
                raise AskLocalError("SSE content was not text")
            content_parts.append(content)

        reasoning = delta.get("reasoning_content")
        if reasoning is not None:
            if not isinstance(reasoning, str):
                raise AskLocalError("SSE reasoning_content was not text")
            reasoning_parts.append(reasoning)

        current_finish = choice.get("finish_reason")
        if current_finish is not None:
            finish_reason = current_finish

    if not saw_done:
        raise AskLocalError("truncated SSE stream: missing [DONE]")
    if finish_reason is None:
        raise AskLocalError("stream ended without a final finish_reason")
    if finish_reason == "length":
        raise AskLocalError("model stopped at the token limit (finish_reason=length)")
    if finish_reason != "stop":
        raise AskLocalError(
            f"unsupported stream finish_reason: {finish_reason!r}; expected 'stop'"
        )

    content = "".join(content_parts)
    if not content.strip():
        raise AskLocalError("model returned empty response content")

    return {
        "content": content,
        "reasoning_content": "".join(reasoning_parts),
        "usage": usage if usage is not None else {},
        "finish_reason": finish_reason,
        "response_model": response_model,
    }


def stream_chat(
    served_model: str,
    messages: list[dict[str, str]],
    reasoning_effort: str | None,
    max_tokens: int,
    opener: Any = None,
) -> dict[str, Any]:
    """Start the streaming chat request and parse its SSE response."""
    payload = make_chat_payload(
        served_model, messages, reasoning_effort, max_tokens
    )
    request = Request(
        CHAT_API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Accept": "text/event-stream",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    response = _call_opener(opener, request, CHAT_TIMEOUT_SECONDS)
    return parse_sse_stream(response)


def _create_temp_file(target: Path, text: str) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_name = tempfile.mkstemp(
        prefix=f"{target.name}.", suffix=".tmp", dir=str(target.parent)
    )
    temp_path = Path(temp_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        try:
            os.close(descriptor)
        except OSError:
            pass
        try:
            temp_path.unlink()
        except OSError:
            pass
        raise
    return temp_path


def atomic_write_text(target: str | os.PathLike[str], text: str) -> None:
    """Atomically replace target with UTF-8 text."""
    target_path = Path(target)
    temp_path = _create_temp_file(target_path, text)
    try:
        os.replace(temp_path, target_path)
    finally:
        try:
            temp_path.unlink()
        except FileNotFoundError:
            pass


def atomic_write_pair(
    first_target: str | os.PathLike[str],
    first_text: str,
    second_target: str | os.PathLike[str],
    second_text: str,
) -> None:
    """Prepare both files before replacing either; roll back on write failures."""
    first_path = Path(first_target)
    second_path = Path(second_target)
    if _canonical_path(first_path) == _canonical_path(second_path):
        raise AskLocalError("output and receipt paths must be different")

    first_temp = _create_temp_file(first_path, first_text)
    try:
        second_temp = _create_temp_file(second_path, second_text)
    except Exception:
        try:
            first_temp.unlink()
        except OSError:
            pass
        raise
    backups: dict[Path, Path | None] = {}
    try:
        for target in (first_path, second_path):
            if target.exists():
                descriptor, backup_name = tempfile.mkstemp(
                    prefix=f"{target.name}.", suffix=".bak", dir=str(target.parent)
                )
                os.close(descriptor)
                backup = Path(backup_name)
                try:
                    shutil.copyfile(target, backup)
                except Exception:
                    try:
                        backup.unlink()
                    except OSError:
                        pass
                    raise
                backups[target] = backup
            else:
                backups[target] = None
    except Exception:
        for backup in backups.values():
            if backup is not None:
                try:
                    backup.unlink()
                except OSError:
                    pass
        for temp_path in (first_temp, second_temp):
            try:
                temp_path.unlink()
            except OSError:
                pass
        raise

    replaced: list[Path] = []
    preserve_backups: set[Path] = set()
    try:
        os.replace(first_temp, first_path)
        replaced.append(first_path)
        os.replace(second_temp, second_path)
        replaced.append(second_path)
    except OSError as exc:
        rollback_errors: list[str] = []
        for target in reversed(replaced):
            backup = backups[target]
            try:
                if backup is None:
                    target.unlink(missing_ok=True)
                else:
                    os.replace(backup, target)
                    backups[target] = None
            except OSError as rollback_exc:
                rollback_errors.append(f"{target}: {rollback_exc}")
                if backup is not None:
                    preserve_backups.add(backup)
        if rollback_errors:
            raise OSError(
                f"could not write output pair ({exc}); rollback also failed: "
                + "; ".join(rollback_errors)
                + "; recovery copies kept at "
                + ", ".join(sorted(str(path) for path in preserve_backups))
            ) from exc
        raise
    finally:
        for temp_path in (first_temp, second_temp, *[b for b in backups.values() if b is not None]):
            if temp_path in preserve_backups:
                continue
            try:
                temp_path.unlink()
            except OSError:
                pass


def _canonical_path(path: str | os.PathLike[str]) -> str:
    """Return a fully resolved normalized path for collision checks."""
    return os.path.normcase(os.path.realpath(os.fspath(path)))


def run(
    role: str,
    prompt_file: str,
    context_files: Sequence[str],
    output_file: str,
    reasoning: str | None = None,
    max_tokens: int = 8192,
    opener: Any = None,
) -> Path:
    """Run one local-model request and return the receipt path."""
    if role not in MODEL_KEYS:
        raise AskLocalError(f"unknown role: {role}")
    if role == "coder" and reasoning is not None:
        raise AskLocalError("--reasoning is available only with --role brain")
    if not isinstance(max_tokens, int) or isinstance(max_tokens, bool) or max_tokens <= 0:
        raise AskLocalError("--max-tokens must be a positive integer")

    output_path = Path(output_file)
    receipt_path = output_path.with_suffix(".receipt.json")
    if _canonical_path(output_path) == _canonical_path(receipt_path):
        raise AskLocalError("output and receipt paths must be different")
    input_paths = [prompt_file, *context_files]
    protected_outputs = {_canonical_path(output_path), _canonical_path(receipt_path)}
    for input_path in input_paths:
        if _canonical_path(input_path) in protected_outputs:
            raise AskLocalError(
                f"output or receipt path conflicts with input file: {input_path}"
            )

    effective_reasoning = reasoning if role == "brain" else None
    if role == "brain" and effective_reasoning is None:
        effective_reasoning = "high"

    prompt = read_text_file(prompt_file)
    contexts = [
        (str(path), read_text_file(path)) for path in context_files
    ]
    messages = build_messages(prompt, contexts)

    requested_model = MODEL_KEYS[role]
    served_model, newly_loaded = resolve_instance(requested_model, opener=opener)

    started = time.monotonic()
    result = stream_chat(
        served_model,
        messages,
        effective_reasoning,
        max_tokens,
        opener=opener,
    )
    elapsed_seconds = time.monotonic() - started

    receipt = {
        "requested_model": requested_model,
        "requested_instance_id": served_model,
        "response_model": result["response_model"],
        "reasoning_effort": effective_reasoning,
        "usage": result["usage"],
        "elapsed_seconds": round(elapsed_seconds, 6),
        "reasoning_character_count": len(result["reasoning_content"]),
        "newly_loaded_instance": newly_loaded,
    }

    atomic_write_pair(
        receipt_path,
        json.dumps(receipt, indent=2, sort_keys=True) + "\n",
        output_path,
        result["content"],
    )
    return receipt_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Send UTF-8 prompt/context files to a local LM Studio model."
    )
    parser.add_argument("--role", choices=tuple(MODEL_KEYS), required=True)
    parser.add_argument("--prompt-file", required=True)
    parser.add_argument("--context-file", action="append", default=[])
    parser.add_argument("--output-file", required=True)
    parser.add_argument("--reasoning", choices=("high", "none"))
    parser.add_argument("--max-tokens", type=int, default=8192)
    return parser


def main(argv: Sequence[str] | None = None, opener: Any = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        receipt_path = run(
            role=args.role,
            prompt_file=args.prompt_file,
            context_files=args.context_file,
            output_file=args.output_file,
            reasoning=args.reasoning,
            max_tokens=args.max_tokens,
            opener=opener,
        )
    except (AskLocalError, OSError) as exc:
        print(f"ask_local: {exc}", file=sys.stderr)
        return 1
    print(str(receipt_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
